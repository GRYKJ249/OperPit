import { completeChat } from "./ai-provider";

const token = () => process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "";
const api = (method: string) => `https://api.telegram.org/bot${token()}/${method}`;
let running = false;
let offset = 0;
let reconnectScheduled = false;

async function telegram<T>(method: string, body: Record<string, unknown>, timeoutMs = 40_000): Promise<T | null> {
  const response = await fetch(api(method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const payload = await response.json().catch(() => null) as { ok?: boolean; result?: T } | null;
  if (!response.ok || !payload?.ok) throw new Error(`telegram_${method}_failed`);
  return payload.result ?? null;
}

type Update = { update_id: number; message?: { chat?: { id?: number }; text?: string; from?: { first_name?: string } } };
type BotInfo = { id: number; username?: string; first_name?: string };

function cleanText(value: string) {
  return value.replace(/\u0000/g, " ").trim().slice(0, 4_000);
}

async function sendMessage(chatId: number, text: string) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await telegram("sendMessage", { chat_id: chatId, text: cleanText(text) }, 25_000);
      return;
    } catch (error) {
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, 1_000 * (attempt + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("telegram_send_failed");
}

async function answer(update: Update) {
  const chatId = update.message?.chat?.id;
  const text = cleanText(update.message?.text ?? "");
  if (!chatId || !text) return;
  if (text === "/start") {
    await sendMessage(chatId, "أهلاً. بوت GRY KJ متصل بالموقع ومستعد. أرسل رسالتك، وسأرد من خلال ذكاء الموقع.");
    return;
  }
  if (text === "/help") {
    await sendMessage(chatId, "أرسل أي رسالة نصية. وظيفة البوت قابلة للتخصيص لاحقًا من داخل الموقع.");
    return;
  }
  try {
    const result = await completeChat([
      { role: "system", content: "أنت مساعد Telegram تابع لموقع GRY KJ. أجب بالعربية إذا كتب المستخدم بالعربية، وباختصار ووضوح. لا تدّعي تنفيذ إجراءات خارجية، ولا تطلب مفاتيح أو كلمات مرور. وظيفة البوت مؤقتة وقابلة للتخصيص لاحقًا." },
      { role: "user", content: text },
    ], { maxTokens: 700, timeoutMs: 30_000, usageMode: "guide" });
    await sendMessage(chatId, result.content);
  } catch {
    await sendMessage(chatId, "تعذر الوصول إلى ذكاء الموقع الآن. حاول بعد قليل.").catch(() => undefined);
  }
}

async function poll() {
  while (running) {
    try {
      const updates = await telegram<Update[]>("getUpdates", { offset, limit: 100, timeout: 20, allowed_updates: ["message"] }, 30_000) ?? [];
      for (const update of updates) {
        offset = Math.max(offset, update.update_id + 1);
        try { await answer(update); } catch (error) { console.error("[Telegram] message handling failed:", error instanceof Error ? error.message : "unknown_error"); }
      }
    } catch (error) {
      console.error("[Telegram] polling temporarily unavailable:", error instanceof Error ? error.message : "unknown_error");
      await new Promise(resolve => setTimeout(resolve, 5_000));
    }
  }
}

export async function startTelegramBot() {
  if (running || !token()) return { enabled: false, reason: "token_missing_or_already_running" };
  try {
    const info = await telegram<BotInfo>("getMe", {});
    if (!info) return { enabled: false, reason: "telegram_unavailable" };
    running = true;
    reconnectScheduled = false;
    void poll();
    console.log(`[Telegram] bot connected as @${info.username ?? info.first_name ?? info.id}`);
    return { enabled: true, username: info.username ?? null };
  } catch (error) {
    console.error("[Telegram] bot connection failed:", error instanceof Error ? error.message : "unknown_error");
    if (!reconnectScheduled) {
      reconnectScheduled = true;
      setTimeout(() => { reconnectScheduled = false; void startTelegramBot(); }, 15_000);
    }
    return { enabled: false, reason: "telegram_unavailable" };
  }
}
