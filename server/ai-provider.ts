import { createHash } from "node:crypto";
import { recordAiUsage, type AiUsageMode } from "./ai-usage";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
export type AiProviderId = "manus" | "openai" | "gemini" | "deepseek" | "groq";
export type GeneratedImage = { bytes: Uint8Array; mimeType: "image/png" | "image/jpeg" | "image/webp" };
type CompleteOptions = { maxTokens: number; timeoutMs?: number; usageMode?: AiUsageMode; metricDate?: string };
type ProviderSpec = { id: AiProviderId; label: string; keys: () => string[]; model: () => string; family: "managed" | "openai" | "gemini" | "deepseek" };

class ProviderFailure extends Error {
  constructor(readonly status: number | null, readonly provider: AiProviderId) {
    super(`${provider}_unavailable`);
  }
}

const keyCooldowns = new Map<string, number>();
const providerSuccess = new Map<AiProviderId, number>();
const providerError = new Map<AiProviderId, { code: string; at: number }>();
const secretFingerprint = (provider: AiProviderId, key: string) => createHash("sha256").update(provider).update("\0").update(key).digest("hex").slice(0, 24);
const splitKeys = (value?: string) => (value ?? "").split(/[\n,;]+/).map(key => key.trim()).filter(Boolean).slice(0, 8);

const specs: Record<AiProviderId, ProviderSpec> = {
  manus: { id: "manus", label: "Manus AI", family: "managed", keys: () => splitKeys(process.env.MANUS_API_KEY), model: () => "" },
  openai: { id: "openai", label: "ChatGPT / OpenAI", family: "openai", keys: () => splitKeys(process.env.PORTFOLIO_OPENAI_API_KEYS ?? process.env.PORTFOLIO_OPENAI_API_KEY), model: () => process.env.PORTFOLIO_OPENAI_MODEL?.trim() || "gpt-4.1-mini" },
  gemini: { id: "gemini", label: "Gemini", family: "gemini", keys: () => splitKeys(process.env.PORTFOLIO_GEMINI_API_KEYS), model: () => process.env.PORTFOLIO_GEMINI_MODEL?.trim() || "gemini-3.8-flash" },
  deepseek: { id: "deepseek", label: "DeepSeek", family: "deepseek", keys: () => splitKeys(process.env.PORTFOLIO_DEEPSEEK_API_KEYS), model: () => process.env.PORTFOLIO_DEEPSEEK_MODEL?.trim() || "deepseek-chat" },
  groq: { id: "groq", label: "Llama / Groq", family: "openai", keys: () => splitKeys(process.env.PORTFOLIO_GROQ_API_KEYS), model: () => process.env.PORTFOLIO_GROQ_MODEL?.trim() || "llama-3.3-70b-versatile" },
};

function validModel(model: string) {
  return /^[a-zA-Z0-9][a-zA-Z0-9._/-]{0,119}$/.test(model);
}

function wordLimit(value: string, maxWords: number) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  return words.length <= maxWords ? value.trim() : `${words.slice(0, maxWords).join(" ")}…`;
}

function chatContent(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as { error?: unknown; choices?: { message?: { content?: unknown } }[] };
  if (data.error) return null;
  const content = data.choices?.[0]?.message?.content;
  return typeof content === "string" && content.trim() ? content.trim() : null;
}

async function postJson(url: string, headers: Record<string, string>, body: unknown, timeoutMs: number) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const payload = await response.json().catch(() => null);
    return { response, payload };
  } catch {
    throw new ProviderFailure(null, "manus");
  }
}

async function requestWithKey(spec: ProviderSpec, key: string, messages: ChatMessage[], maxTokens: number, timeoutMs: number) {
  const model = spec.model();
  if (!validModel(model) && spec.family !== "managed") throw new ProviderFailure(400, spec.id);
  let url = "";
  let headers: Record<string, string>;
  let body: Record<string, unknown>;
  if (spec.family === "managed") {
    const base = process.env.MANUS_API_URL?.replace(/\/+$/, "");
    if (!base) throw new ProviderFailure(null, spec.id);
    url = `${base}/v1/chat/completions`;
    headers = { Authorization: `Bearer ${key}` };
    body = { messages, max_tokens: maxTokens };
  } else if (spec.id === "openai" || spec.id === "groq") {
    const openAiBase = (process.env.PORTFOLIO_OPENAI_API_BASE?.trim() || "https://api.openai.com/v1").replace(/\/+$/, "");
    url = spec.id === "openai" ? `${openAiBase}/chat/completions` : "https://api.groq.com/openai/v1/chat/completions";
    headers = { Authorization: `Bearer ${key}` };
    body = { model, messages, ...(spec.id === "groq" ? { max_tokens: maxTokens } : { max_completion_tokens: maxTokens }) };
  } else if (spec.id === "deepseek") {
    url = "https://api.deepseek.com/chat/completions";
    headers = { Authorization: `Bearer ${key}` };
    body = { model, messages, max_tokens: maxTokens, thinking: { type: "disabled" } };
  } else {
    url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    headers = { "x-goog-api-key": key };
    const system = messages.filter(message => message.role === "system").map(message => message.content).join("\n\n");
    const contents = messages.filter(message => message.role !== "system").map(message => ({ role: message.role === "assistant" ? "model" : "user", parts: [{ text: message.content }] }));
    body = { contents, ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}), generationConfig: { maxOutputTokens: maxTokens, temperature: 0.25 } };
  }

  const { response, payload } = await postJson(url, headers, body, timeoutMs).catch(error => {
    if (error instanceof ProviderFailure) throw new ProviderFailure(error.status, spec.id);
    throw new ProviderFailure(null, spec.id);
  });
  if (!response.ok) throw new ProviderFailure(response.status, spec.id);
  let text = chatContent(payload);
  if (spec.id === "gemini" && payload && typeof payload === "object") {
    const gemini = payload as { candidates?: { content?: { parts?: { text?: unknown }[] } }[] };
    const parts = gemini.candidates?.[0]?.content?.parts ?? [];
    text = parts.map(part => typeof part.text === "string" ? part.text : "").join("\n").trim() || null;
  }
  if (!text) throw new ProviderFailure(response.status, spec.id);
  return text;
}

async function requestInternalModel(model: string, messages: ChatMessage[], maxTokens: number, timeoutMs: number) {
  const key = process.env.OPENAI_API_KEY?.trim();
  const base = process.env.OPENAI_API_BASE?.trim().replace(/\/+$/, "");
  if (!key || !base) throw new ProviderFailure(null, "gemini");
  const { response, payload } = await postJson(`${base}/chat/completions`, { Authorization: `Bearer ${key}` }, { model, messages, max_completion_tokens: maxTokens }, timeoutMs);
  if (!response.ok) throw new ProviderFailure(response.status, "gemini");
  const text = chatContent(payload);
  if (!text) throw new ProviderFailure(response.status, "gemini");
  return text;
}

function keysNotCoolingDown(spec: ProviderSpec) {
  const now = Date.now();
  return spec.keys().filter(key => (keyCooldowns.get(secretFingerprint(spec.id, key)) ?? 0) <= now);
}

export function getAiProviderStatuses() {
  const now = Date.now();
  return (Object.values(specs) as ProviderSpec[]).map(spec => {
    const keys = spec.keys();
    const cooling = keys.length > 0 && keysNotCoolingDown(spec).length === 0;
    const successAt = providerSuccess.get(spec.id);
    const error = providerError.get(spec.id);
    const status = keys.length === 0 ? "needs_key" : cooling ? "cooldown" : successAt && now - successAt < 24 * 60 * 60_000 ? "active" : "configured_unchecked";
    return { id: spec.id, label: spec.label, status, configuredKeyCount: keys.length, lastSuccessAt: status === "active" ? new Date(successAt!).toISOString() : null, lastSafeError: error && now - error.at < 24 * 60 * 60_000 ? error.code : null };
  });
}

async function invoke(spec: ProviderSpec, messages: ChatMessage[], options: CompleteOptions): Promise<string> {
  const keys = keysNotCoolingDown(spec);
  if (!keys.length) throw new ProviderFailure(null, spec.id);
  const maxTokens = Math.max(64, Math.min(Math.trunc(options.maxTokens), 4096));
  const timeoutMs = Math.max(5_000, Math.min(options.timeoutMs ?? 25_000, 90_000));
  let lastFailure: ProviderFailure | null = null;
  for (const key of keys) {
    try {
      const result = await requestWithKey(spec, key, messages, maxTokens, timeoutMs);
      providerSuccess.set(spec.id, Date.now());
      providerError.delete(spec.id);
      await recordAiUsage(options.usageMode ?? "guide", options.metricDate);
      return result;
    } catch (error) {
      const failure = error instanceof ProviderFailure ? error : new ProviderFailure(null, spec.id);
      lastFailure = failure;
      providerError.set(spec.id, { code: failure.status === 429 ? "rate_limited" : failure.status === 401 || failure.status === 403 ? "key_rejected" : failure.status !== null && failure.status < 500 ? "request_rejected" : "temporarily_unavailable", at: Date.now() });
      if (failure.status === 400) throw new Error("ai_request_invalid");
      const coolingMs = failure.status === 401 || failure.status === 403 || failure.status === 429 ? 24 * 60 * 60_000 : 2 * 60_000;
      keyCooldowns.set(secretFingerprint(spec.id, key), Date.now() + coolingMs);
    }
  }
  if (spec.id === "gemini" && process.env.OPENAI_API_KEY && process.env.OPENAI_API_BASE) {
    try {
      const result = await requestInternalModel("gemini-3-flash-preview", messages, maxTokens, timeoutMs);
      providerSuccess.set(spec.id, Date.now());
      providerError.delete(spec.id);
      await recordAiUsage(options.usageMode ?? "guide", options.metricDate);
      return result;
    } catch (error) {
      const failure = error instanceof ProviderFailure ? error : new ProviderFailure(null, spec.id);
      providerError.set(spec.id, { code: failure.status === 429 ? "rate_limited" : failure.status === 401 || failure.status === 403 ? "key_rejected" : "temporarily_unavailable", at: Date.now() });
    }
  }
  throw lastFailure ?? new ProviderFailure(null, spec.id);
}

/** Call one named, actually configured provider; used when each council member must retain its identity. */
export async function completeWithProvider(providerId: AiProviderId, messages: ChatMessage[], options: CompleteOptions): Promise<string> {
  const spec = specs[providerId];
  if (providerId === "manus" && !process.env.MANUS_API_URL) throw new Error("provider_not_configured");
  try {
    return await invoke(spec, messages, options);
  } catch (error) {
    if (error instanceof ProviderFailure && spec.keys().length === 0) throw new Error("provider_not_configured");
    if (error instanceof ProviderFailure && error.status !== null && error.status < 500 && error.status !== 429) throw new Error("provider_request_rejected");
    throw new Error("provider_unavailable");
  }
}

/** Primary Manus AI; then only configured customer-provided fallbacks. Never reads Sandbox-only OPENAI_API_KEY. */
export async function completeChat(messages: ChatMessage[], options: CompleteOptions): Promise<{ content: string; provider: AiProviderId }> {
  const ordered: AiProviderId[] = ["manus", "openai", "gemini", "deepseek", "groq"];
  for (const id of ordered) {
    const spec = specs[id];
    if (spec.keys().length === 0 || (id === "manus" && !process.env.MANUS_API_URL)) continue;
    try {
      const content = await invoke(spec, messages, options);
      return { content, provider: id };
    } catch (error) {
      if (error instanceof Error && error.message === "ai_request_invalid") throw error;
    }
  }
  throw new Error("ai_unavailable");
}

export function councilProviderRegistry() {
  return getAiProviderStatuses();
}

export function truncateWords(value: string, maxWords: number) {
  return wordLimit(value.replace(/\u0000/g, " "), maxWords);
}

/** Generate a post illustration through the site's configured OpenAI-compatible image provider. */
export async function generateImageWithProvider(prompt: string, timeoutMs = 120_000): Promise<GeneratedImage> {
  const geminiKeys = splitKeys(process.env.PORTFOLIO_GEMINI_API_KEYS);
  const geminiModel = process.env.PORTFOLIO_GEMINI_IMAGE_MODEL?.trim() || "gemini-3.1-flash-image";
  for (const key of geminiKeys) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent`, {
        method: "POST",
        headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseModalities: ["IMAGE"] } }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      const payload = await response.json().catch(() => null) as { candidates?: { content?: { parts?: { inlineData?: { data?: unknown; mimeType?: unknown } }[] } }[] } | null;
      const part = payload?.candidates?.[0]?.content?.parts?.find(item => typeof item.inlineData?.data === "string");
      if (response.ok && part?.inlineData?.data && typeof part.inlineData.data === "string") {
        const mime = part.inlineData.mimeType === "image/jpeg" ? "image/jpeg" : part.inlineData.mimeType === "image/webp" ? "image/webp" : "image/png";
        return { bytes: new Uint8Array(Buffer.from(part.inlineData.data, "base64")), mimeType: mime };
      }
    } catch { /* Try the next configured image provider. */ }
  }
  const keys = splitKeys(process.env.PORTFOLIO_OPENAI_API_KEYS ?? process.env.PORTFOLIO_OPENAI_API_KEY);
  const base = (process.env.PORTFOLIO_IMAGE_API_BASE?.trim() || "https://api.openai.com/v1").replace(/\/+$/, "");
  const model = process.env.PORTFOLIO_IMAGE_MODEL?.trim() || "gpt-image-1";
  if (!keys.length) throw new Error("image_provider_not_configured");
  let lastStatus: number | null = null;
  for (const key of keys) {
    try {
      const response = await fetch(`${base}/images/generations`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, prompt, size: "1024x1024", quality: "medium", response_format: "b64_json" }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      lastStatus = response.status;
      const payload = await response.json().catch(() => null) as { data?: { b64_json?: unknown; url?: unknown }[] } | null;
      if (!response.ok || !payload?.data?.[0]) continue;
      const first = payload.data[0];
      if (typeof first.b64_json === "string" && first.b64_json.length > 0) {
        return { bytes: new Uint8Array(Buffer.from(first.b64_json, "base64")), mimeType: "image/png" };
      }
      if (typeof first.url === "string" && first.url.startsWith("https://")) {
        const image = await fetch(first.url, { signal: AbortSignal.timeout(60_000) });
        if (image.ok) return { bytes: new Uint8Array(await image.arrayBuffer()), mimeType: "image/png" };
      }
    } catch { /* Try the next configured key. */ }
  }
  throw new Error(lastStatus === 401 || lastStatus === 403 ? "image_provider_key_rejected" : "image_provider_unavailable");
}
