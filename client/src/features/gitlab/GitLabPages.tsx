import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowUpLeft, ArrowUpRight, BookOpen, Code2, ExternalLink, Folder, GitFork, Gitlab, LoaderCircle, Search, Sparkles, Star } from "lucide-react";
import { Link, useLocation, useRoute } from "wouter";
import { useLanguage } from "../../contexts/LanguageContext";

type GitLabProject = {
  id: number; name: string; path: string; namespace: string; description: string; url: string | null;
  defaultBranch: string; stars: number; forks: number; issues: number; updatedAt: string | null;
  topics: string[]; publicOnly: boolean; languages?: Record<string, number>;
};
type GitLabEntry = { name: string; path: string; type: "file" | "dir"; id: string };

async function gitlabFetch<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
  const payload = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "gitlab_unavailable");
  return payload;
}

function gitlabError(error: unknown, ar: boolean) {
  const code = error instanceof Error ? error.message : "";
  if (code === "public_project_not_found") return ar ? "لم نعثر على مشروع عام بهذا المسار." : "No public project was found at this path.";
  if (code === "gitlab_rate_limited" || code === "local_rate_limited") return ar ? "وصلنا إلى حد طلبات GitLab مؤقتاً. حاول بعد قليل." : "GitLab's request limit was reached. Try again shortly.";
  if (code === "gitlab_text_only") return ar ? "يعرض المتصفح الملفات النصية الصغيرة فقط." : "Only small text files can be viewed here.";
  if (code === "gitlab_file_too_large") return ar ? "هذا الملف أكبر من الحد المسموح للمعاينة." : "This file is too large to preview.";
  return ar ? "تعذّر جلب بيانات GitLab الآن." : "GitLab could not be reached right now.";
}

function savedOwner() {
  try { return localStorage.getItem("folio-gitlab-owner") ?? ""; } catch { return ""; }
}

export function GitLabIndexPage() {
  const { locale } = useLanguage();
  const ar = locale === "ar";
  const [owner, setOwner] = useState("");
  const [input, setInput] = useState("");
  const [projects, setProjects] = useState<GitLabProject[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [didSearch, setDidSearch] = useState(false);
  useEffect(() => { const value = savedOwner(); if (value) { setInput(value); setOwner(value); } }, []);
  useEffect(() => {
    if (!owner) return;
    const controller = new AbortController();
    setPending(true); setError("");
    gitlabFetch<{ projects: GitLabProject[] }>(`/api/gitlab/projects?owner=${encodeURIComponent(owner)}`, controller.signal)
      .then(payload => { setProjects(Array.isArray(payload.projects) ? payload.projects : []); setDidSearch(true); })
      .catch(reason => { if (reason instanceof Error && reason.name === "AbortError") return; setProjects([]); setError(gitlabError(reason, ar)); })
      .finally(() => setPending(false));
    return () => controller.abort();
  }, [owner, ar]);
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = input.trim().replace(/^\/+|\/+$/g, "");
    if (!/^[A-Za-z0-9_.-]{1,64}(?:\/[A-Za-z0-9_.-]{1,64}){0,7}$/.test(value)) {
      setError(ar ? "أدخل اسم مستخدم أو مسار مجموعة صالحاً." : "Enter a valid username or group path.");
      return;
    }
    try { localStorage.setItem("folio-gitlab-owner", value); } catch { /* Search still works for this session. */ }
    setOwner(value); setDidSearch(true);
  };
  return <div className="page-width section-space gitlab-page" dir={ar ? "rtl" : "ltr"}>
    <div className="page-intro"><p className="eyebrow"><Gitlab size={16} />{ar ? "أرشيف GitLab المفتوح" : "THE OPEN GITLAB ARCHIVE"}</p><h1>{ar ? "استكشف المشاريع والملفات." : "Explore projects and files."}</h1><p className="page-intro__lead">{ar ? "تصفّح المشاريع العامة للمستخدم أو المجموعة؛ قراءة الملفات النصية فقط، بلا استنساخ أو تشغيل للكود." : "Browse public projects for a user or group. Text-only file viewing; repositories are never cloned and code is never executed."}</p></div>
    <div className="github-safety-note"><Code2 size={18} /><p>{ar ? "يستخدم الموقع واجهة GitLab العامة دون رمز دخول. لا تدخل أسراراً هنا؛ لا يمكن الوصول إلى المشاريع الخاصة." : "This browser uses GitLab's public API without an access token. Never enter secrets here; private projects cannot be accessed."}</p></div>
    <form className="github-search" onSubmit={submit}><label htmlFor="gitlab-owner">{ar ? "اسم المستخدم أو المجموعة" : "Username or group"}</label><div><span>@</span><input id="gitlab-owner" value={input} onChange={event => setInput(event.target.value)} placeholder={ar ? "مثال: gitlab-org أو group/subgroup" : "e.g. gitlab-org or group/subgroup"} maxLength={160} autoComplete="off" /><button className="button button--primary" disabled={pending || !input.trim()}><Search size={16} />{pending ? (ar ? "يجري البحث…" : "Loading…") : (ar ? "استعرض المشاريع" : "Browse projects")}</button></div></form>
    {error && <p className="github-error" role="alert">{error}</p>}
    {pending && <p className="muted-copy github-loading"><LoaderCircle className="spin" size={16} />{ar ? "يجري جلب المشاريع العامة…" : "Fetching public projects…"}</p>}
    {didSearch && !pending && !error && projects.length === 0 && <p className="github-empty">{ar ? "لم نجد مشاريع عامة مرئية لهذا المستخدم أو المجموعة." : "No public projects were found for this user or group."}</p>}
    {projects.length > 0 && <><div className="github-results-heading"><h2>{ar ? `مشاريع ${owner}` : `Projects for ${owner}`}</h2><span>{projects.length} {ar ? "مشروع" : "projects"}</span></div><div className="github-repo-grid">{projects.map(project => <article className="github-repo-card" key={project.id}><div className="github-repo-card__top"><Code2 size={20} /><span>{project.namespace || "GitLab"}</span></div><h3><Link href={`/gitlab/project/${project.id}`}>{project.name}</Link></h3><p>{project.description || (ar ? "لا يوجد وصف للمشروع." : "No project description.")}</p><div className="github-repo-card__stats"><span><Star size={14} />{project.stars}</span><span><GitFork size={14} />{project.forks}</span><span>{project.updatedAt ? new Date(project.updatedAt).toLocaleDateString(locale) : ""}</span></div><div className="github-repo-card__actions"><Link className="text-link" href={`/gitlab/project/${project.id}`}>{ar ? "استكشف الملفات" : "Explore files"}<ArrowUpRight size={14} /></Link>{project.url && <a href={project.url} target="_blank" rel="noreferrer" aria-label={ar ? "افتح المشروع في GitLab" : "Open the project in GitLab"}><ExternalLink size={15} /></a>}</div></article>)}</div></>}
    <div className="github-footer-note"><BookOpen size={17} /><span>{ar ? "تستخدم المعاينة واجهة GitLab العامة. لا تنفّذ ملفات المشروع ولا تنقلها إلى الخادم." : "This view uses GitLab's public API. Project files are not executed or cloned onto the server."}</span></div>
  </div>;
}

export function GitLabProjectPage() {
  const { locale } = useLanguage();
  const ar = locale === "ar";
  const [, params] = useRoute("/gitlab/project/:id");
  const id = params?.id ?? "";
  const [project, setProject] = useState<GitLabProject | null>(null);
  const [entries, setEntries] = useState<GitLabEntry[]>([]);
  const [path, setPath] = useState("");
  const [file, setFile] = useState<{ path: string; content: string; language: string } | null>(null);
  const [pending, setPending] = useState(true);
  const [filePending, setFilePending] = useState(false);
  const [explanation, setExplanation] = useState("");
  const [explaining, setExplaining] = useState(false);
  const [explainError, setExplainError] = useState("");
  const [error, setError] = useState("");
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!/^\d{1,12}$/.test(id)) { setError(ar ? "معرّف المشروع غير صالح." : "Invalid project ID."); setPending(false); return; }
    const controller = new AbortController(); setPending(true); setError("");
    Promise.all([
      gitlabFetch<GitLabProject>(`/api/gitlab/projects/${encodeURIComponent(id)}`, controller.signal),
      gitlabFetch<{ entries: GitLabEntry[] }>(`/api/gitlab/projects/${encodeURIComponent(id)}/tree`, controller.signal),
    ]).then(async ([info, tree]) => {
      setProject(info); setEntries(tree.entries ?? []);
      const readme = (tree.entries ?? []).find(entry => entry.type === "file" && /^readme(?:\.md|\.txt)?$/i.test(entry.name));
      if (readme) {
        try {
          const data = await gitlabFetch<{ path: string; content: string; language: string }>(`/api/gitlab/projects/${encodeURIComponent(id)}/file?path=${encodeURIComponent(readme.path)}&ref=${encodeURIComponent(info.defaultBranch)}`, controller.signal);
          setFile(data);
        } catch { /* A missing or non-text README should not block browsing. */ }
      }
    }).catch(reason => { if (reason instanceof Error && reason.name === "AbortError") return; setError(gitlabError(reason, ar)); })
      .finally(() => setPending(false));
    return () => controller.abort();
  }, [id, ar]);

  const languageEntries = useMemo(() => Object.entries(project?.languages ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 8), [project]);
  const languageTotal = languageEntries.reduce((sum, item) => sum + item[1], 0) || 1;
  const loadDirectory = async (nextPath: string) => {
    if (!project) return;
    setFilePending(true); setFile(null); setError(""); setPath(nextPath); setExplanation(""); setExplainError("");
    try {
      const data = await gitlabFetch<{ entries: GitLabEntry[] }>(`/api/gitlab/projects/${project.id}/tree?path=${encodeURIComponent(nextPath)}&ref=${encodeURIComponent(project.defaultBranch)}`);
      setEntries(data.entries ?? []);
    } catch (reason) { setError(gitlabError(reason, ar)); }
    finally { setFilePending(false); }
  };
  const loadFile = async (filePath: string) => {
    if (!project) return;
    setFilePending(true); setError("");
    try {
      const data = await gitlabFetch<{ path: string; content: string; language: string }>(`/api/gitlab/projects/${project.id}/file?path=${encodeURIComponent(filePath)}&ref=${encodeURIComponent(project.defaultBranch)}`);
      setFile(data); setExplanation(""); setExplainError("");
    } catch (reason) { setError(gitlabError(reason, ar)); setFile(null); }
    finally { setFilePending(false); }
  };

  const explainFile = async () => {
    if (!file || explaining) return;
    setExplaining(true); setExplanation(""); setExplainError("");
    try {
      const response = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "explain_code", message: ar ? "اشرح وظيفة هذا الملف وبنيته بأمان" : "Explain this file's purpose and structure safely", code: file.content.slice(0, 8_000), codePath: file.path, codeLanguage: file.language, locale: ar ? "ar" : "en" }), signal: AbortSignal.timeout(25_000) });
      const payload = await response.json() as { reply?: string };
      if (!response.ok || typeof payload.reply !== "string") throw new Error("assistant_unavailable");
      setExplanation(payload.reply.slice(0, 3_500));
    } catch {
      setExplainError(ar ? "تعذّر إنشاء الشرح الآن. يمكنك متابعة قراءة الملف." : "The explanation is unavailable right now. You can still read the file.");
    } finally { setExplaining(false); }
  };

  if (pending) return <div className="page-width section-space"><p className="muted-copy"><LoaderCircle className="spin" size={16} />{ar ? "يجري تحميل المشروع…" : "Loading project…"}</p></div>;
  if (error && !project) return <div className="page-width section-space"><div className="page-intro"><p className="eyebrow"><Gitlab size={16} />GitLab</p><h1>{ar ? "المشروع غير متاح" : "Project unavailable"}</h1><p className="page-intro__lead">{error}</p><Link className="text-link" href="/gitlab">{ar ? "العودة إلى المشاريع" : "Back to projects"}</Link></div></div>;
  if (!project) return null;

  return <div className="page-width section-space github-repo-page gitlab-project-page" dir={locale === "ar" || locale === "ur" ? "rtl" : "ltr"}>
    <button className="text-link github-back" onClick={() => setLocation("/gitlab")}>{ar ? <ArrowUpRight size={15} /> : <ArrowUpLeft size={15} />}{ar ? "كل مشاريع GitLab" : "All GitLab projects"}</button>
    <header className="github-repo-heading"><p className="eyebrow"><Gitlab size={16} />{ar ? "مشروع عام · قراءة فقط" : "PUBLIC PROJECT · READ ONLY"}</p><h1>{project.path || project.name}</h1><p>{project.description || (ar ? "لا يوجد وصف." : "No description.")}</p><div className="github-repo-heading__stats"><span><Star size={15} />{project.stars} {ar ? "نجمة" : "stars"}</span><span><GitFork size={15} />{project.forks} {ar ? "تفرّع" : "forks"}</span><span>{project.issues} {ar ? "مسألة" : "issues"}</span>{project.url && <a className="text-link" href={project.url} target="_blank" rel="noreferrer">GitLab <ExternalLink size={14} /></a>}</div>{project.topics.length > 0 && <div className="github-topics">{project.topics.map(topic => <span key={topic}>{topic}</span>)}</div>}</header>
    {languageEntries.length > 0 && <section className="github-languages"><h2>{ar ? "اللغات في المشروع" : "Languages in this project"}</h2><div className="github-language-bars">{languageEntries.map(([name, bytes]) => <div className="github-language" key={name}><div><strong>{name}</strong><span>{(bytes / languageTotal * 100).toFixed(1)}%</span></div><span className="github-language__track"><i style={{ width: `${Math.max(2, bytes / languageTotal * 100)}%` }} /></span></div>)}</div></section>}
    <div className="github-workbench"><section className="github-files"><header><h2><Folder size={17} />{ar ? "ملفات المشروع" : "Project files"}</h2><span>{path || project.defaultBranch}</span></header><div className="github-breadcrumb"><button onClick={() => void loadDirectory("")}>{project.name}</button>{path.split("/").filter(Boolean).map((part, index, all) => <button key={`${part}-${index}`} onClick={() => void loadDirectory(all.slice(0, index + 1).join("/"))}>/ {part}</button>)}</div>{filePending && <p className="fine-print"><LoaderCircle className="spin" size={13} />{ar ? "يجري تحميل الملف…" : "Loading file…"}</p>}<ul>{entries.map(entry => <li key={entry.path}><button onClick={() => entry.type === "dir" ? void loadDirectory(entry.path) : void loadFile(entry.path)}><span>{entry.type === "dir" ? <Folder size={15} /> : <Code2 size={15} />}{entry.name}</span><small>{entry.type === "dir" ? (ar ? "مجلد" : "Folder") : (ar ? "ملف نصي" : "Text file")}</small></button></li>)}</ul>{error && <p className="github-error" role="alert">{error}</p>}</section>
      <section className="github-reader"><header><h2><BookOpen size={17} />{file ? file.path : "README"}</h2>{file && <button className="button button--quiet" disabled={explaining} onClick={() => void explainFile()}>{explaining ? <LoaderCircle size={15} className="spin" /> : <Sparkles size={15} />}{explaining ? (ar ? "يحلل الملف…" : "Explaining…") : (ar ? "اشرح الملف بالذكاء" : "Explain with AI")}</button>}</header>{explainError && <p className="github-error" role="alert">{explainError}</p>}{explanation && <aside className="gitlab-ai-explanation"><strong>{ar ? "شرح مساعد الأرشيف" : "Archive assistant"}</strong><p>{explanation}</p></aside>}{file ? <pre className="github-code"><code>{file.content.slice(0, 50_000)}</code></pre> : <div className="github-reader__empty"><BookOpen size={23} /><p>{ar ? "اختر ملفاً نصياً لقراءته. لن يتم تشغيل الشيفرات." : "Choose a text file to read. Code will not be executed."}</p></div>}</section></div>
    <p className="fine-print"><ArrowLeft size={13} />{ar ? "الاستكشاف عام للقراءة فقط؛ الملفات محدودة الحجم والنوع." : "Public, read-only browsing; file size and type are limited."}</p>
  </div>;
}
