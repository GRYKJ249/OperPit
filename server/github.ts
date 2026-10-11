import { Router, type Request } from "express";

export const githubRouter = Router();
type GithubError = Error & { status?: number };
const cache = new Map<string, { expires: number; body: unknown }>();
const windows = new Map<string, { start: number; count: number }>();
const API = "https://api.github.com";
const MAX_RESPONSE_BYTES = 1_000_000;

function validOwner(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37})$/.test(value);
}
function validRepo(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_.-]{1,100}$/.test(value) && value !== "." && value !== "..";
}
function validRepoPath(value: unknown): value is string {
  return typeof value === "string" && value.length <= 800 && value.split("/").length <= 20 && value.split("/").every(part => /^[A-Za-z0-9_.-]{1,120}$/.test(part) && part !== "." && part !== "..");
}
function rateLimit(req: Request) {
  const key = req.ip || req.socket.remoteAddress || "visitor";
  const now = Date.now();
  const current = windows.get(key);
  if (!current || now - current.start >= 60_000) {
    windows.set(key, { start: now, count: 1 });
    if (windows.size > 8_000) for (const [k, v] of windows) if (now - v.start > 10 * 60_000) windows.delete(k);
    return false;
  }
  current.count += 1;
  return current.count > 60;
}

async function readBounded(response: Response, maxBytes: number) {
  const length = Number(response.headers.get("content-length") || "0");
  if (length > maxBytes) throw Object.assign(new Error("github_response_too_large"), { status: 413 });
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw Object.assign(new Error("github_response_too_large"), { status: 413 });
    }
    chunks.push(value);
  }
  const output = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(output);
}

async function githubJson(path: string): Promise<unknown> {
  const cached = cache.get(path);
  if (cached && cached.expires > Date.now()) return cached.body;
  const response = await fetch(`${API}${path}`, {
    headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "folio100-public-repository-viewer" },
    redirect: "error",
    signal: AbortSignal.timeout(12_000),
  });
  const raw = await readBounded(response, MAX_RESPONSE_BYTES);
  let body: unknown;
  try { body = raw ? JSON.parse(raw) as unknown : null; } catch { throw Object.assign(new Error("github_invalid_response"), { status: 502 }); }
  if (!response.ok) throw Object.assign(new Error("github_request_failed"), { status: response.status === 404 ? 404 : response.status === 403 ? 429 : 502 });
  cache.set(path, { expires: Date.now() + 5 * 60_000, body });
  if (cache.size > 250) {
    for (const [key, entry] of cache) if (entry.expires < Date.now()) cache.delete(key);
    while (cache.size > 250) cache.delete(cache.keys().next().value as string);
  }
  return body;
}

function safeError(error: unknown, res: import("express").Response) {
  const status = Number((error as GithubError)?.status) || 502;
  if (status === 404) return res.status(404).json({ error: "public_repository_not_found" });
  if (status === 413) return res.status(413).json({ error: "github_file_too_large" });
  if (status === 429) return res.status(429).json({ error: "github_rate_limited" });
  return res.status(502).json({ error: "github_unavailable" });
}

function pathFor(owner: string, repo: string, suffix = "") {
  return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}${suffix}`;
}
function safeExternalUrl(value: unknown) {
  return typeof value === "string" && /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+/.test(value) ? value : null;
}

function applyRate(req: Request, res: import("express").Response) {
  if (rateLimit(req)) { res.setHeader("Cache-Control", "no-store"); res.status(429).json({ error: "local_rate_limited" }); return false; }
  res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  return true;
}

githubRouter.get("/repos", async (req, res) => {
  if (!applyRate(req, res)) return;
  const owner = req.query.owner;
  if (!validOwner(owner)) return res.status(400).json({ error: "valid_public_owner_required" });
  try {
    const body = await githubJson(`/users/${encodeURIComponent(owner)}/repos?sort=updated&per_page=30&type=public`);
    if (!Array.isArray(body)) return res.status(502).json({ error: "github_invalid_response" });
    const repos = body.slice(0, 30).map(item => {
      const repo = item as Record<string, unknown>;
      return {
        name: typeof repo.name === "string" ? repo.name : "",
        fullName: typeof repo.full_name === "string" ? repo.full_name : "",
        description: typeof repo.description === "string" ? repo.description.slice(0, 280) : "",
        url: safeExternalUrl(repo.html_url),
        language: typeof repo.language === "string" ? repo.language : null,
        stars: Number(repo.stargazers_count) || 0,
        forks: Number(repo.forks_count) || 0,
        updatedAt: typeof repo.updated_at === "string" ? repo.updated_at : null,
        defaultBranch: typeof repo.default_branch === "string" ? repo.default_branch : "main",
        topics: Array.isArray(repo.topics) ? repo.topics.filter((topic): topic is string => typeof topic === "string").slice(0, 10) : [],
      };
    });
    return res.json({ owner, repos, publicOnly: true });
  } catch (error) { return safeError(error, res); }
});

githubRouter.get("/repos/:owner/:repo", async (req, res) => {
  if (!applyRate(req, res)) return;
  const { owner, repo } = req.params;
  if (!validOwner(owner) || !validRepo(repo)) return res.status(400).json({ error: "invalid_repository" });
  try {
    const [details, languages] = await Promise.all([
      githubJson(pathFor(owner, repo)),
      githubJson(pathFor(owner, repo, "/languages")),
    ]);
    const item = details as Record<string, unknown>;
    return res.json({
      name: item.name, fullName: item.full_name,
      description: typeof item.description === "string" ? item.description.slice(0, 280) : "",
      url: safeExternalUrl(item.html_url),
      defaultBranch: typeof item.default_branch === "string" ? item.default_branch : "main",
      stars: Number(item.stargazers_count) || 0, forks: Number(item.forks_count) || 0,
      openIssues: Number(item.open_issues_count) || 0,
      updatedAt: typeof item.updated_at === "string" ? item.updated_at : null,
      topics: Array.isArray(item.topics) ? item.topics.filter((topic): topic is string => typeof topic === "string").slice(0, 10) : [],
      languages: languages && typeof languages === "object" && !Array.isArray(languages) ? languages : {},
      publicOnly: true,
    });
  } catch (error) { return safeError(error, res); }
});

githubRouter.get("/repos/:owner/:repo/contents", async (req, res) => {
  if (!applyRate(req, res)) return;
  const { owner, repo } = req.params;
  const path = typeof req.query.path === "string" && req.query.path ? req.query.path : "";
  if (!validOwner(owner) || !validRepo(repo) || (path && !validRepoPath(path))) return res.status(400).json({ error: "invalid_repository_path" });
  try {
    const suffix = `/contents${path ? `/${path.split("/").map(encodeURIComponent).join("/")}` : ""}`;
    const body = await githubJson(pathFor(owner, repo, suffix));
    if (!Array.isArray(body)) return res.status(400).json({ error: "not_a_directory" });
    const entries = body.slice(0, 150).map(item => {
      const entry = item as Record<string, unknown>;
      return {
        name: typeof entry.name === "string" ? entry.name : "",
        path: typeof entry.path === "string" && validRepoPath(entry.path) ? entry.path : "",
        type: entry.type === "dir" ? "dir" : "file",
        size: Number(entry.size) || 0,
      };
    }).filter(item => item.name && item.path).sort((a, b) => Number(b.type === "dir") - Number(a.type === "dir") || a.name.localeCompare(b.name));
    return res.json({ entries, truncated: body.length > 150 });
  } catch (error) { return safeError(error, res); }
});

githubRouter.get("/repos/:owner/:repo/readme", async (req, res) => {
  if (!applyRate(req, res)) return;
  const { owner, repo } = req.params;
  if (!validOwner(owner) || !validRepo(repo)) return res.status(400).json({ error: "invalid_repository" });
  try {
    const item = await githubJson(pathFor(owner, repo, "/readme")) as Record<string, unknown>;
    if (item.encoding !== "base64" || typeof item.content !== "string" || item.content.length > 1_400_000) return res.status(413).json({ error: "github_file_too_large" });
    const content = Buffer.from(item.content.replace(/\s/g, ""), "base64").toString("utf8");
    if (content.includes("\u0000")) return res.status(415).json({ error: "binary_file_not_supported" });
    return res.json({ name: typeof item.name === "string" ? item.name : "README", content: content.slice(0, 1_000_000) });
  } catch (error) { return safeError(error, res); }
});

githubRouter.get("/repos/:owner/:repo/file", async (req, res) => {
  if (!applyRate(req, res)) return;
  const { owner, repo } = req.params;
  const path = req.query.path;
  if (!validOwner(owner) || !validRepo(repo) || !validRepoPath(path)) return res.status(400).json({ error: "invalid_repository_path" });
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  const supported = new Set(["md", "txt", "ts", "tsx", "js", "jsx", "mjs", "cjs", "json", "css", "scss", "html", "xml", "py", "go", "rs", "java", "kt", "swift", "sh", "yml", "yaml", "sql", "toml", "ini", "env.example"]);
  if (!supported.has(extension) || path.toLowerCase().endsWith(".lock")) return res.status(415).json({ error: "file_type_not_supported" });
  try {
    const suffix = `/contents/${path.split("/").map(encodeURIComponent).join("/")}`;
    const item = await githubJson(pathFor(owner, repo, suffix)) as Record<string, unknown>;
    if (item.type !== "file" || item.encoding !== "base64" || typeof item.content !== "string" || Number(item.size) > 180_000 || item.content.length > 260_000) return res.status(413).json({ error: "github_file_too_large" });
    const content = Buffer.from(item.content.replace(/\s/g, ""), "base64").toString("utf8");
    if (content.includes("\u0000")) return res.status(415).json({ error: "binary_file_not_supported" });
    return res.json({ path, content, size: content.length, language: typeof item.name === "string" ? item.name.split(".").pop() : extension });
  } catch (error) { return safeError(error, res); }
});
