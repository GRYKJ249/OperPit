import { Router, type NextFunction, type Request, type Response } from "express";
import * as fs from "node:fs";
import { promises as fsp } from "node:fs";
import path from "node:path";
import git from "isomorphic-git";
import http from "isomorphic-git/http/node";
import { and, desc, eq } from "drizzle-orm";
import { managedGitProjects } from "../drizzle/schema";
import { getDb } from "./db";
import { verifyCouncilSession } from "./council-security";

export const managedGitRouter = Router();
const root = path.resolve(process.env.MANAGED_GIT_ROOT || path.join(process.cwd(), "data", "managed-git"));
const maxFileBytes = 220_000;
const maxEntries = 300;
let syncRunning = false;

function adminToken(req: Request) {
  const match = /^Bearer ([A-Za-z0-9._-]{20,1024})$/.exec(req.get("authorization") ?? "");
  return match?.[1] ?? "";
}
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!verifyCouncilSession(adminToken(req))) return res.status(401).json({ error: "managed_git_admin_required" });
  res.setHeader("Cache-Control", "no-store");
  next();
}
function safePart(value: string) { return value.replace(/[^A-Za-z0-9_.-]/g, "-").slice(0, 100) || "repo"; }
function localDir(provider: "github" | "gitlab", owner: string, name: string) { return path.join(root, provider, safePart(owner), safePart(name)); }
function safeRelative(value: unknown) {
  if (typeof value !== "string" || value.length > 600 || value.startsWith("/") || value.split("/").some(part => !part || part === "." || part === "..")) return null;
  return value;
}
function inside(dir: string, relative: string) {
  const base = path.resolve(dir);
  const target = path.resolve(base, relative);
  return target === base || target.startsWith(`${base}${path.sep}`) ? target : null;
}
function providerToken(provider: "github" | "gitlab") { return provider === "github" ? process.env.GITHUB_TOKEN?.trim() : process.env.GITLAB_TOKEN?.trim(); }
function authFor(provider: "github" | "gitlab") {
  const token = providerToken(provider);
  if (!token) return undefined;
  return provider === "github" ? { username: token, password: "x-oauth-basic" } : { username: "oauth2", password: token };
}
function providerHeaders(provider: "github" | "gitlab") {
  const token = providerToken(provider);
  return token ? { Authorization: provider === "github" ? `Bearer ${token}` : undefined, "PRIVATE-TOKEN": provider === "gitlab" ? token : undefined } : {};
}
async function jsonApi(provider: "github" | "gitlab", url: string) {
  const headers: Record<string, string> = { Accept: "application/json", "User-Agent": "folio100-managed-git" };
  const auth = providerHeaders(provider);
  for (const [key, value] of Object.entries(auth)) if (value) headers[key] = value;
  const response = await fetch(url, { headers, redirect: "error", signal: AbortSignal.timeout(20_000) });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${provider}_api_${response.status}`);
  return body as unknown;
}
function projectFromGithub(item: Record<string, unknown>) {
  return { provider: "github" as const, externalId: String(item.id), owner: String((item.owner as Record<string, unknown>)?.login || "owner"), name: String(item.name || "repo"), fullName: String(item.full_name || item.name || "repo"), description: typeof item.description === "string" ? item.description.slice(0, 500) : "", cloneUrl: String(item.clone_url || ""), webUrl: String(item.html_url || ""), defaultBranch: String(item.default_branch || "main"), visibility: item.private ? "private" as const : "public" as const, sourceUpdatedAt: typeof item.pushed_at === "string" ? new Date(item.pushed_at) : null };
}
function projectFromGitlab(item: Record<string, unknown>) {
  const visibility = item.visibility === "internal" ? "internal" as const : item.visibility === "private" ? "private" as const : "public" as const;
  return { provider: "gitlab" as const, externalId: String(item.id), owner: String(item.path_with_namespace || item.path || "owner").split("/").slice(0, -1).join("/"), name: String(item.path || item.name || "repo"), fullName: String(item.path_with_namespace || item.name || "repo"), description: typeof item.description === "string" ? item.description.slice(0, 500) : "", cloneUrl: String(item.http_url_to_repo || ""), webUrl: String(item.web_url || ""), defaultBranch: String(item.default_branch || "main"), visibility, sourceUpdatedAt: typeof item.last_activity_at === "string" ? new Date(item.last_activity_at) : null };
}
async function listOwned(provider: "github" | "gitlab") {
  const token = providerToken(provider);
  if (!token) return { projects: [], configured: false };
  if (provider === "github") {
    const result: Record<string, unknown>[] = [];
    for (let page = 1; page <= 5; page += 1) {
      const body = await jsonApi(provider, `https://api.github.com/user/repos?visibility=all&affiliation=owner&sort=updated&per_page=100&page=${page}`);
      if (!Array.isArray(body)) break;
      result.push(...body.filter(item => item && typeof item === "object").map(item => projectFromGithub(item as Record<string, unknown>)) as never[]);
      if (body.length < 100) break;
    }
    return { projects: result, configured: true };
  }
  const result: Record<string, unknown>[] = [];
  for (let page = 1; page <= 5; page += 1) {
    const body = await jsonApi(provider, `https://gitlab.com/api/v4/projects?owned=true&membership=false&order_by=last_activity_at&sort=desc&per_page=100&page=${page}`);
    if (!Array.isArray(body)) break;
    result.push(...body.filter(item => item && typeof item === "object").map(item => projectFromGitlab(item as Record<string, unknown>)) as never[]);
    if (body.length < 100) break;
  }
  return { projects: result, configured: true };
}
async function mirrorProject(item: ReturnType<typeof projectFromGithub>) {
  const db = await getDb();
  if (!db || !item.cloneUrl || !item.webUrl) throw new Error("managed_git_database_or_url_unavailable");
  const dir = localDir(item.provider, item.owner, item.name);
  await fsp.mkdir(path.dirname(dir), { recursive: true });
  const [existing] = await db.select().from(managedGitProjects).where(and(eq(managedGitProjects.provider, item.provider), eq(managedGitProjects.externalId, item.externalId))).limit(1);
  const metadata = { ...item, localPath: dir, syncStatus: "syncing" as const, syncError: null };
  if (existing) await db.update(managedGitProjects).set(metadata).where(eq(managedGitProjects.id, existing.id));
  else await db.insert(managedGitProjects).values({ ...metadata, exposure: "private", published: 0 });
  try {
    const exists = fs.existsSync(path.join(dir, ".git"));
    if (!exists) await git.clone({ fs, http, dir, url: item.cloneUrl, ref: item.defaultBranch, singleBranch: true, depth: 1, onAuth: () => authFor(item.provider) });
    else {
      await git.fetch({ fs, http, dir, remote: "origin", ref: item.defaultBranch, depth: 1, singleBranch: true, onAuth: () => authFor(item.provider) });
      await git.checkout({ fs, dir, ref: item.defaultBranch, force: true });
    }
    const [saved] = await db.select().from(managedGitProjects).where(and(eq(managedGitProjects.provider, item.provider), eq(managedGitProjects.externalId, item.externalId))).limit(1);
    if (saved) await db.update(managedGitProjects).set({ syncStatus: "synced", syncError: null, lastSyncedAt: new Date(), localPath: dir }).where(eq(managedGitProjects.id, saved.id));
    return { provider: item.provider, fullName: item.fullName, status: "synced" };
  } catch (error) {
    const [saved] = await db.select().from(managedGitProjects).where(and(eq(managedGitProjects.provider, item.provider), eq(managedGitProjects.externalId, item.externalId))).limit(1);
    if (saved) await db.update(managedGitProjects).set({ syncStatus: "error", syncError: error instanceof Error ? error.message.slice(0, 220) : "sync_failed" }).where(eq(managedGitProjects.id, saved.id));
    return { provider: item.provider, fullName: item.fullName, status: "error" };
  }
}
export async function syncManagedGit() {
  if (syncRunning) return { status: "already_running", results: [] };
  syncRunning = true;
  try {
    const all = [] as { provider: string; fullName: string; status: string }[];
    for (const provider of ["github", "gitlab"] as const) {
      try {
        const listed = await listOwned(provider);
        for (const item of listed.projects as ReturnType<typeof projectFromGithub>[]) all.push(await mirrorProject(item));
      } catch (error) { all.push({ provider, fullName: "*", status: error instanceof Error ? error.message.slice(0, 120) : "provider_failed" }); }
    }
    return { status: "completed", results: all };
  } finally { syncRunning = false; }
}
function publicProject(row: typeof managedGitProjects.$inferSelect) { return { id: row.id, provider: row.provider, owner: row.owner, name: row.name, fullName: row.fullName, description: row.description, webUrl: row.webUrl, defaultBranch: row.defaultBranch, exposure: row.exposure, visibility: row.visibility, syncStatus: row.syncStatus, lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null }; }
managedGitRouter.get("/projects", async (_req, res) => { const db = await getDb(); if (!db) return res.status(503).json({ error: "managed_git_database_unavailable" }); const rows = await db.select().from(managedGitProjects).where(eq(managedGitProjects.published, 1)).orderBy(desc(managedGitProjects.updatedAt)); return res.json({ projects: rows.map(publicProject) }); });
managedGitRouter.get("/projects/:id/tree", async (req, res) => { const relative = safeRelative(req.query.path || ""); if (relative === null) return res.status(400).json({ error: "invalid_repository_path" }); const db = await getDb(); if (!db) return res.status(503).json({ error: "managed_git_database_unavailable" }); const [row] = await db.select().from(managedGitProjects).where(and(eq(managedGitProjects.id, Number(req.params.id)), eq(managedGitProjects.published, 1))).limit(1); if (!row) return res.status(404).json({ error: "managed_project_not_found" }); const dir = inside(row.localPath, relative); if (!dir) return res.status(400).json({ error: "invalid_repository_path" }); try { const names = (await fsp.readdir(dir, { withFileTypes: true })).slice(0, maxEntries).filter(entry => entry.name !== ".git").map(entry => ({ name: entry.name, path: path.posix.join(relative, entry.name), type: entry.isDirectory() ? "dir" : "file" })).sort((a, b) => Number(b.type === "dir") - Number(a.type === "dir") || a.name.localeCompare(b.name)); return res.json({ project: publicProject(row), entries: names, truncated: names.length >= maxEntries }); } catch { return res.status(404).json({ error: "managed_project_files_unavailable" }); } });
managedGitRouter.get("/projects/:id/file", async (req, res) => { const relative = safeRelative(req.query.path); if (!relative) return res.status(400).json({ error: "invalid_repository_path" }); const db = await getDb(); if (!db) return res.status(503).json({ error: "managed_git_database_unavailable" }); const [row] = await db.select().from(managedGitProjects).where(and(eq(managedGitProjects.id, Number(req.params.id)), eq(managedGitProjects.published, 1))).limit(1); if (!row) return res.status(404).json({ error: "managed_project_not_found" }); const file = inside(row.localPath, relative); if (!file) return res.status(400).json({ error: "invalid_repository_path" }); try { const stat = await fsp.stat(file); if (!stat.isFile() || stat.size > maxFileBytes || relative.toLowerCase().includes(".env") || relative.toLowerCase().endsWith(".lock")) return res.status(415).json({ error: "managed_text_file_not_supported" }); const content = await fsp.readFile(file, "utf8"); if (content.includes("\u0000")) return res.status(415).json({ error: "managed_binary_file_not_supported" }); return res.json({ project: publicProject(row), path: relative, content, size: stat.size, language: path.extname(relative).slice(1) || "text" }); } catch { return res.status(404).json({ error: "managed_file_unavailable" }); } });
managedGitRouter.get("/admin/status", requireAdmin, async (_req, res) => { const db = await getDb(); if (!db) return res.status(503).json({ error: "managed_git_database_unavailable" }); const rows = await db.select().from(managedGitProjects).orderBy(desc(managedGitProjects.updatedAt)); return res.json({ configured: { github: Boolean(providerToken("github")), gitlab: Boolean(providerToken("gitlab")) }, syncing: syncRunning, projects: rows.map(row => ({ ...publicProject(row), published: row.published, syncError: row.syncError })) }); });
managedGitRouter.post("/admin/sync", requireAdmin, async (_req, res) => { return res.json(await syncManagedGit()); });
managedGitRouter.patch("/admin/projects/:id", requireAdmin, async (req, res) => { const id = Number(req.params.id); const exposure = req.body?.exposure; const published = req.body?.published; if (!Number.isSafeInteger(id) || !["private", "open_source", "for_sale"].includes(exposure) || ![0, 1].includes(published)) return res.status(400).json({ error: "invalid_project_settings" }); const db = await getDb(); if (!db) return res.status(503).json({ error: "managed_git_database_unavailable" }); await db.update(managedGitProjects).set({ exposure, published }).where(eq(managedGitProjects.id, id)); return res.json({ success: true }); });

export function startManagedGitSync() { const interval = Number(process.env.GIT_SYNC_INTERVAL_MS || 15 * 60_000); if (!Number.isFinite(interval) || interval < 60_000) return; setTimeout(() => { void syncManagedGit(); setInterval(() => { void syncManagedGit(); }, interval); }, 10_000); }
