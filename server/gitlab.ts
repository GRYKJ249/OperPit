import { Router, type Request, type Response as ExpressResponse } from "express";

export const gitlabRouter = Router();
const API = "https://gitlab.com/api/v4";
const MAX_JSON_BYTES = 1_000_000;
const MAX_TEXT_BYTES = 180_000;
const cache = new Map<string, { expires: number; body: unknown }>();
const windows = new Map<string, { start: number; count: number }>();
const textExtensions = new Set(["md", "txt", "ts", "tsx", "js", "jsx", "mjs", "cjs", "json", "css", "scss", "html", "xml", "py", "go", "rs", "java", "kt", "swift", "sh", "yml", "yaml", "sql", "toml", "ini", "vue", "svelte", "php", "rb", "c", "h", "cpp", "hpp", "cs"]);

function validNamespace(value: unknown): value is string {
  return typeof value === "string" && value.length <= 160 && value.split("/").length <= 8 && value.split("/").every(part => /^[A-Za-z0-9_.-]{1,64}$/.test(part) && part !== "." && part !== "..");
}
function validProjectId(value: unknown): value is string {
  return typeof value === "string" && /^\d{1,12}$/.test(value);
}
function validRepoPath(value: unknown): value is string {
  return typeof value === "string" && value.length <= 600 && value.split("/").length <= 20 && value.split("/").every(part => /^[A-Za-z0-9_.@+-]{1,120}$/.test(part) && part !== "." && part !== "..");
}
function validRef(value: unknown): value is string {
  return typeof value === "string" && value.length <= 120 && /^[A-Za-z0-9_.\/-]+$/.test(value) && !value.includes("..") && !value.startsWith("/");
}

function allowRequest(req: Request, res: ExpressResponse) {
  res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=240");
  const key = (req.ip || req.socket.remoteAddress || "visitor").slice(0, 100);
  const now = Date.now();
  const current = windows.get(key);
  if (!current || now - current.start >= 60_000) {
    windows.set(key, { start: now, count: 1 });
    if (windows.size > 8_000) for (const [candidate, value] of windows) if (now - value.start > 10 * 60_000) windows.delete(candidate);
    return true;
  }
  current.count += 1;
  if (current.count <= 45) return true;
  res.setHeader("Cache-Control", "no-store");
  res.status(429).json({ error: "gitlab_rate_limited" });
  return false;
}

async function readBounded(response: globalThis.Response, maxBytes: number) {
  const length = Number(response.headers.get("content-length") || "0");
  if (length > maxBytes) throw Object.assign(new Error("gitlab_response_too_large"), { status: 413 });
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw Object.assign(new Error("gitlab_response_too_large"), { status: 413 });
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

async function api(path: string): Promise<unknown> {
  const cached = cache.get(path);
  if (cached && cached.expires > Date.now()) return cached.body;
  const response = await fetch(`${API}${path}`, {
    headers: { Accept: "application/json", "User-Agent": "folio100-public-project-browser" },
    redirect: "error",
    signal: AbortSignal.timeout(12_000),
  });
  const bytes = await readBounded(response, MAX_JSON_BYTES);
  if (!response.ok) throw Object.assign(new Error("gitlab_request_failed"), { status: response.status });
  let body: unknown;
  try { body = JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw Object.assign(new Error("gitlab_invalid_response"), { status: 502 }); }
  cache.set(path, { expires: Date.now() + 5 * 60_000, body });
  if (cache.size > 240) {
    for (const [key, entry] of cache) if (entry.expires < Date.now()) cache.delete(key);
    while (cache.size > 240) cache.delete(cache.keys().next().value as string);
  }
  return body;
}

async function rawFile(projectId: string, path: string, ref: string) {
  const endpoint = `/projects/${encodeURIComponent(projectId)}/repository/files/${encodeURIComponent(path)}/raw?ref=${encodeURIComponent(ref)}`;
  const cached = cache.get(endpoint);
  if (cached && cached.expires > Date.now()) return cached.body as string;
  const response = await fetch(`${API}${endpoint}`, {
    headers: { Accept: "text/plain, application/octet-stream", "User-Agent": "folio100-public-project-browser" },
    redirect: "error",
    signal: AbortSignal.timeout(12_000),
  });
  const bytes = await readBounded(response, MAX_TEXT_BYTES);
  if (!response.ok) throw Object.assign(new Error("gitlab_file_unavailable"), { status: response.status });
  const content = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  if (content.includes("\u0000")) throw Object.assign(new Error("gitlab_binary_not_supported"), { status: 415 });
  cache.set(endpoint, { expires: Date.now() + 5 * 60_000, body: content });
  return content;
}

function safeGitLabUrl(value: unknown) {
  return typeof value === "string" && /^https:\/\/gitlab\.com\/[A-Za-z0-9_.%/-]+$/.test(value) ? value : null;
}
function safeProject(item: Record<string, unknown>) {
  const namespace = item.namespace && typeof item.namespace === "object" ? item.namespace as Record<string, unknown> : {};
  const fullPath = typeof item.path_with_namespace === "string" ? item.path_with_namespace : "";
  return {
    id: Number(item.id) || 0,
    name: typeof item.name === "string" ? item.name.slice(0, 120) : "",
    path: fullPath.slice(0, 180),
    namespace: typeof namespace.full_path === "string" ? namespace.full_path.slice(0, 160) : "",
    description: typeof item.description === "string" ? item.description.slice(0, 280) : "",
    url: safeGitLabUrl(item.web_url),
    defaultBranch: typeof item.default_branch === "string" && validRef(item.default_branch) ? item.default_branch : "main",
    stars: Number(item.star_count) || 0,
    forks: Number(item.forks_count) || 0,
    issues: Number(item.open_issues_count) || 0,
    updatedAt: typeof item.last_activity_at === "string" ? item.last_activity_at : null,
    topics: Array.isArray(item.topics) ? item.topics.filter((topic): topic is string => typeof topic === "string").slice(0, 10) : [],
    publicOnly: item.visibility === "public",
  };
}

function sendError(error: unknown, res: ExpressResponse) {
  const status = Number((error as { status?: number })?.status) || 502;
  if (status === 404) return res.status(404).json({ error: "public_project_not_found" });
  if (status === 413) return res.status(413).json({ error: "gitlab_file_too_large" });
  if (status === 415) return res.status(415).json({ error: "gitlab_text_only" });
  if (status === 429) return res.status(429).json({ error: "gitlab_rate_limited" });
  return res.status(502).json({ error: "gitlab_unavailable" });
}

const projectPath = (id: string, suffix = "") => `/projects/${encodeURIComponent(id)}${suffix}`;

/** List the public personal projects for a GitLab username, or public projects for an exact group path. */
gitlabRouter.get("/projects", async (req, res) => {
  if (!allowRequest(req, res)) return;
  const owner = typeof req.query.owner === "string" ? req.query.owner.trim() : "";
  if (!validNamespace(owner)) return res.status(400).json({ error: "valid_public_namespace_required" });
  try {
    const users = await api(`/users?username=${encodeURIComponent(owner)}`) as unknown;
    let projects: unknown;
    let matched = "user";
    if (Array.isArray(users)) {
      const user = users.find(candidate => candidate && typeof candidate === "object" && String((candidate as Record<string, unknown>).username).toLowerCase() === owner.toLowerCase()) as Record<string, unknown> | undefined;
      if (user && (typeof user.id === "number" || typeof user.id === "string")) {
        projects = await api(`/users/${encodeURIComponent(String(user.id))}/projects?visibility=public&order_by=last_activity_at&sort=desc&per_page=30`);
      }
    }
    if (!Array.isArray(projects)) {
      const groups = await api(`/groups?search=${encodeURIComponent(owner)}&per_page=20`) as unknown;
      if (Array.isArray(groups)) {
        const group = groups.find(candidate => {
          if (!candidate || typeof candidate !== "object") return false;
          const item = candidate as Record<string, unknown>;
          return item.visibility === "public" && (item.full_path === owner || item.path === owner);
        }) as Record<string, unknown> | undefined;
        if (group && (typeof group.id === "number" || typeof group.id === "string")) {
          matched = "group";
          projects = await api(`/groups/${encodeURIComponent(String(group.id))}/projects?visibility=public&with_shared=false&include_subgroups=true&order_by=last_activity_at&sort=desc&per_page=30`);
        }
      }
    }
    if (!Array.isArray(projects)) return res.json({ owner, ownerType: matched, projects: [], publicOnly: true });
    const result = projects.map(project => safeProject(project as Record<string, unknown>)).filter(project => project.id && project.publicOnly).slice(0, 30);
    return res.json({ owner, ownerType: matched, projects: result, publicOnly: true });
  } catch (error) { return sendError(error, res); }
});

gitlabRouter.get("/projects/:id", async (req, res) => {
  if (!allowRequest(req, res)) return;
  const { id } = req.params;
  if (!validProjectId(id)) return res.status(400).json({ error: "invalid_project_id" });
  try {
    const project = await api(projectPath(id)) as Record<string, unknown>;
    if (!project || project.visibility !== "public") return res.status(404).json({ error: "public_project_not_found" });
    let languages: Record<string, number> = {};
    try {
      const rawLanguages = await api(projectPath(id, "/languages"));
      if (rawLanguages && typeof rawLanguages === "object" && !Array.isArray(rawLanguages)) languages = rawLanguages as Record<string, number>;
    } catch { /* Languages are optional metadata; keep repository browsing available. */ }
    return res.json({ ...safeProject(project), languages });
  } catch (error) { return sendError(error, res); }
});

gitlabRouter.get("/projects/:id/tree", async (req, res) => {
  if (!allowRequest(req, res)) return;
  const { id } = req.params;
  const path = typeof req.query.path === "string" && req.query.path ? req.query.path : "";
  const ref = typeof req.query.ref === "string" ? req.query.ref : "HEAD";
  if (!validProjectId(id) || (path && !validRepoPath(path)) || !validRef(ref)) return res.status(400).json({ error: "invalid_project_path" });
  try {
    const query = new URLSearchParams({ per_page: "100", ref });
    if (path) query.set("path", path);
    const body = await api(`${projectPath(id, "/repository/tree")}?${query.toString()}`);
    if (!Array.isArray(body)) return res.status(502).json({ error: "gitlab_invalid_response" });
    const entries = body.slice(0, 100).map(candidate => {
      const item = candidate as Record<string, unknown>;
      return {
        name: typeof item.name === "string" ? item.name.slice(0, 140) : "",
        path: typeof item.path === "string" && validRepoPath(item.path) ? item.path : "",
        type: item.type === "tree" ? "dir" : "file",
        id: typeof item.id === "string" ? item.id : "",
      };
    }).filter(item => item.name && item.path).sort((a, b) => Number(b.type === "dir") - Number(a.type === "dir") || a.name.localeCompare(b.name));
    return res.json({ entries, truncated: body.length > 100 });
  } catch (error) { return sendError(error, res); }
});

gitlabRouter.get("/projects/:id/file", async (req, res) => {
  if (!allowRequest(req, res)) return;
  const { id } = req.params;
  const path = req.query.path;
  const ref = typeof req.query.ref === "string" ? req.query.ref : "HEAD";
  if (!validProjectId(id) || !validRepoPath(path) || !validRef(ref)) return res.status(400).json({ error: "invalid_project_path" });
  const extension = path.split("/").at(-1)?.split(".").pop()?.toLowerCase() ?? "";
  if (!textExtensions.has(extension) || path.toLowerCase().endsWith(".lock")) return res.status(415).json({ error: "gitlab_text_only" });
  try {
    const content = await rawFile(id, path, ref);
    return res.json({ path, content, language: extension, size: Buffer.byteLength(content, "utf8"), publicOnly: true });
  } catch (error) { return sendError(error, res); }
});
