import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const rateBuckets = new Map<string, { startedAt: number; count: number }>();
const sessionLifetimeMs = 6 * 60 * 60_000;
const base64url = (value: Buffer) => value.toString("base64url");

function adminCode() {
  const value = process.env.COUNCIL_ACCESS_CODE?.trim();
  return value && value.length >= 16 && value.length <= 128 ? value : null;
}

function sessionKey() {
  const code = adminCode();
  const platformSecret = process.env.MANUS_JWT_SECRET;
  if (!code || !platformSecret) return null;
  return createHmac("sha256", platformSecret).update("folio100-council-session-v1\0").update(code).digest();
}

function encryptionKey() {
  const master = process.env.COUNCIL_ENCRYPTION_KEY?.trim() || process.env.MANUS_JWT_SECRET;
  if (!master) return null;
  return createHmac("sha256", master).update("folio100-council-storage-aes-256-gcm-v1").digest();
}

export function councilReady() {
  return Boolean(adminCode() && sessionKey() && encryptionKey());
}

export function checkCouncilCode(candidate: unknown) {
  const expected = adminCode();
  if (!expected || typeof candidate !== "string" || candidate.length < 16 || candidate.length > 128) return false;
  const expectedDigest = createHash("sha256").update(expected).digest();
  const candidateDigest = createHash("sha256").update(candidate).digest();
  return timingSafeEqual(expectedDigest, candidateDigest);
}

export function issueCouncilSession() {
  const key = sessionKey();
  if (!key) throw new Error("council_not_configured");
  const issuedAt = Date.now();
  const payload = base64url(Buffer.from(JSON.stringify({ exp: issuedAt + sessionLifetimeMs, nonce: randomBytes(12).toString("hex") })));
  const signature = base64url(createHmac("sha256", key).update(payload).digest());
  return { token: `${payload}.${signature}`, expiresAt: new Date(issuedAt + sessionLifetimeMs).toISOString() };
}

export function verifyCouncilSession(value: unknown) {
  if (typeof value !== "string" || value.length > 1024) return false;
  const parts = value.split(".");
  const key = sessionKey();
  if (!key || parts.length !== 2 || !parts[0] || !parts[1]) return false;
  try {
    const expected = createHmac("sha256", key).update(parts[0]).digest();
    const got = Buffer.from(parts[1], "base64url");
    if (expected.length !== got.length || !timingSafeEqual(expected, got)) return false;
    const payload = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")) as { exp?: unknown; nonce?: unknown };
    return typeof payload.exp === "number" && payload.exp > Date.now() && typeof payload.nonce === "string" && /^[a-f0-9]{24}$/.test(payload.nonce);
  } catch {
    return false;
  }
}

export function encryptCouncilText(value: string) {
  const key = encryptionKey();
  if (!key) throw new Error("council_storage_unavailable");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${base64url(iv)}.${base64url(tag)}.${base64url(ciphertext)}`;
}

export function decryptCouncilText(value: string) {
  const key = encryptionKey();
  if (!key) throw new Error("council_storage_unavailable");
  const [ivText, tagText, ciphertextText, extra] = value.split(".");
  if (!ivText || !tagText || !ciphertextText || extra !== undefined) throw new Error("council_ciphertext_invalid");
  const iv = Buffer.from(ivText, "base64url");
  const tag = Buffer.from(tagText, "base64url");
  const ciphertext = Buffer.from(ciphertextText, "base64url");
  if (iv.length !== 12 || tag.length !== 16 || ciphertext.length > 24_000) throw new Error("council_ciphertext_invalid");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export function councilVoterHash(runId: number, providerId: string) {
  const key = encryptionKey();
  if (!key) throw new Error("council_storage_unavailable");
  return createHmac("sha256", key).update(`run:${runId}:provider:${providerId}`).digest("hex");
}

/** In-memory per-process throttle. Keys must not be persisted or logged. */
export function rateLimit(key: string, maxRequests: number, windowMs: number) {
  const now = Date.now();
  if (rateBuckets.size > 5_000) {
    for (const [bucketKey, bucket] of rateBuckets) if (now - bucket.startedAt > windowMs * 2) rateBuckets.delete(bucketKey);
  }
  const bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.startedAt >= windowMs) {
    rateBuckets.set(key, { startedAt: now, count: 1 });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= maxRequests;
}

export function redactPotentialSecrets(value: string) {
  return value
    .replace(/\b(?:sk-[A-Za-z0-9_-]{16,}|AIza[A-Za-z0-9_-]{20,}|gsk_[A-Za-z0-9_-]{16,})\b/g, "[مفتاح محذوف]")
    .replace(/\bBearer\s+[^\s,;]{12,}/gi, "Bearer [محذوف]");
}
