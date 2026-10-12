import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowUpLeft, ArrowUpRight, BookOpen, Code2, ExternalLink, Folder, GitFork, Github, LoaderCircle, Search, Sparkles, Star } from "lucide-react";
import { Link, useLocation, useRoute } from "wouter";
import { useLanguage } from "../../contexts/LanguageContext";

type Repo = { name: string; fullName: string; description: string; url: string | null; language: string | null; stars: number; forks: number; updatedAt: string | null; defaultBranch: string; topics: string[] };
type Entry = { name: string; path: string; type: "file" | "dir"; size: number };
type RepoDetails = { name: string; fullName: string; description: string; url: string | null; defaultBranch: string; stars: number; forks: number; openIssues: number; updatedAt: string | null; topics: string[]; languages: Record<string, number>; publicOnly: boolean };

async function jsonFetch<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  const payload = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "github_unavailable");
  return payload;
}

function errorText(error: unknown, ar: boolean) {
  const code = error instanceof Error ? error.message : "";
  if (code === "public_repository_not_found") return ar ? "لم نعثر على حساب أو مستودع عام. تأكد من الاسم." : "No public account or repository was found. Check the name.";
  if (code === "github_rate_limited" || code === "local_rate_limited") return ar ? "وصلنا حد طلبات GitHub مؤقتاً. حاول بعد قليل." : "GitHub's request limit was reached. Try again shortly.";
  return ar ? "تعذّر جلب بيانات GitHub الآن." : "GitHub could not be reached right now.";
}

function ownerSaved() {
  try { return localStorage.getItem("folio-github-owner") ?? ""; } catch { return ""; }
}

export function GitHubIndexPage() {
  const { locale } = useLanguage();
  const ar = locale === "ar";
  const [owner, setOwner] = useState("");
  const [input, setInput] = useState("");
  const [repos, setRepos] = useState<Repo[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [didSearch, setDidSearch] = useState(false);
  useEffect(() => { const saved = ownerSaved(); if (saved) { setOwner(saved); setInput(saved); } }, []);
  useEffect(() => {
    if (!owner) return;
    const controller = new AbortController(); setPending(true); setError("");
    jsonFetch<{ repos: Repo[] }>(`/api/github/repos?owner=${encodeURIComponent(owner)}`, controller.signal)
      .then(payload => { setRepos(Array.isArray(payload.repos) ? payload.repos : []); setDidSearch(true); })
      .catch(err => { if (err instanceof Error && err.name === "AbortError") return; setError(errorText(err, ar)); setRepos([]); })
      .finally(() => setPending(false));
    return () => controller.abort();
  }, [owner, ar]);
  const submit = (event: React.FormEvent) => { event.preventDefault(); const value = input.trim().replace(/^@/, ""); if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37})$/.test(value)) { setError(ar ? "أدخل اسم مستخدم GitHub صالحاً." : "Enter a valid GitHub username."); return; } try { localStorage.setItem("folio-github-owner", value); } catch { /* Search still works for this session. */ } setOwner(value); setDidSearch(true); };
  return <div className="page-width section-space github-page" dir={ar ? "rtl" : "ltr"}>
    <div className="page-intro"><p className="eyebrow"><Github size={15} />{ar ? "أرشيف GitHub العام" : "PUBLIC GITHUB ARCHIVE"}</p><h1>{ar ? "هذه صفحة الاستكشاف العام." : "This is the public explorer."}</h1><p className="page-intro__lead">{ar ? "لرؤية مستودعاتك الخاصة المحفوظة داخل الموقع افتح مشاريعي؛ هذه الصفحة مخصصة للبحث العام فقط." : "To view your private repositories mirrored inside the site, open My projects; this page is for public search only."}</p><p><Link className="button button--primary" href="/projects">{ar ? "افتح مشاريعي الخاصة" : "Open my projects"}<ArrowUpRight size={15} /></Link></p></div>
    <div className="github-safety-note"><Code2 size={18} /><p>{ar ? "هذه الصفحة تقرأ المحتوى العام فقط. مشاريع حسابك الخاصة تتم مزامنتها من الخادم وتظهر في خدمة مشاريعي بعد فتح جلسة الإدارة." : "This page reads public content only. Your account projects are mirrored server-side and appear in My projects after opening the admin session."}</p></div>
    <form className="github-search" onSubmit={submit}><label htmlFor="github-owner">{ar ? "اسم مستخدم GitHub" : "GitHub username"}</label><div><span>@</span><input id="github-owner" value={input} onChange={event => setInput(event.target.value)} placeholder={ar ? "مثال: octocat" : "e.g. octocat"} maxLength={39} autoComplete="off" /><button className="button button--primary" disabled={pending || !input.trim()}><Search size={16} />{pending ? (ar ? "يجري البحث…" : "Loading…") : (ar ? "استعرض المستودعات" : "Browse repositories")}</button></div></form>
    {error && <p className="github-error" role="alert">{error}</p>}
    {pending && <p className="muted-copy github-loading"><LoaderCircle className="spin" size={16} />{ar ? "يجري جلب المستودعات العامة…" : "Fetching public repositories…"}</p>}
    {didSearch && !pending && !error && repos.length === 0 && <p className="github-empty">{ar ? "لا توجد مستودعات عامة ظاهرة لهذا الحساب." : "No public repositories were found for this account."}</p>}
    {repos.length > 0 && <><div className="github-results-heading"><h2>{ar ? `مستودعات @${owner}` : `@${owner}'s repositories`}</h2><span>{repos.length} {ar ? "مستودعاً" : "repositories"}</span></div><div className="github-repo-grid">{repos.map(repo => <article className="github-repo-card" key={repo.fullName}><div className="github-repo-card__top"><Code2 size={20} /><span>{repo.language || (ar ? "متعدد اللغات" : "Multi-language")}</span></div><h3><Link href={`/github/${encodeURIComponent(owner)}/${encodeURIComponent(repo.name)}`}>{repo.name}</Link></h3><p>{repo.description || (ar ? "لا يوجد وصف للمستودع." : "No repository description.")}</p><div className="github-repo-card__stats"><span><Star size={14} />{repo.stars}</span><span><GitFork size={14} />{repo.forks}</span><span>{repo.updatedAt ? new Date(repo.updatedAt).toLocaleDateString(locale) : ""}</span></div><div className="github-repo-card__actions"><Link className="text-link" href={`/github/${encodeURIComponent(owner)}/${encodeURIComponent(repo.name)}`}>{ar ? "استكشف الملفات" : "Explore files"}<ArrowUpRight size={14} /></Link>{repo.url && <a href={repo.url} target="_blank" rel="noreferrer" aria-label={ar ? "افتح GitHub في تبويب جديد" : "Open on GitHub in a new tab"}><ExternalLink size={15} /></a>}</div></article>)}</div></>}
    <div className="github-footer-note"><BookOpen size={17} /><span>{ar ? "المتصفح يقرأ README والملفات النصية الصغيرة فقط؛ يمكنك طلب شرح كود من مساعد الذكاء الاصطناعي." : "The browser reads README and small text files only; ask the AI assistant to explain a code excerpt."}</span></div>
  </div>;
}

export function GitHubRepoPage() {
  const { locale } = useLanguage();
  const ar = locale === "ar";
  const [, params] = useRoute("/github/:owner/:repo");
  const owner = params?.owner ?? "";
  const repo = params?.repo ?? "";
  const [details, setDetails] = useState<RepoDetails | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [readme, setReadme] = useState("");
  const [currentPath, setCurrentPath] = useState("");
  const [file, setFile] = useState<{ path: string; content: string; language: string } | null>(null);
  const [explanation, setExplanation] = useState("");
  const [pending, setPending] = useState(true);
  const [filePending, setFilePending] = useState(false);
  const [explainPending, setExplainPending] = useState(false);
  const [error, setError] = useState("");
  const [, setLocation] = useLocation();

  useEffect(() => {
    const controller = new AbortController(); setPending(true); setError("");
    Promise.all([
      jsonFetch<RepoDetails>(`/api/github/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, controller.signal),
      jsonFetch<{ entries: Entry[] }>(`/api/github/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents`, controller.signal),
      jsonFetch<{ content: string }>(`/api/github/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/readme`, controller.signal).catch(() => ({ content: "" })),
    ]).then(([repoInfo, content, readmeData]) => { setDetails(repoInfo); setEntries(content.entries); setReadme(readmeData.content); })
      .catch(err => { if (err instanceof Error && err.name === "AbortError") return; setError(errorText(err, ar)); })
      .finally(() => setPending(false));
    return () => controller.abort();
  }, [owner, repo, ar]);

  const loadDirectory = async (path: string) => {
    setCurrentPath(path); setFile(null); setExplanation(""); setFilePending(true); setError("");
    try {
      const data = await jsonFetch<{ entries: Entry[] }>(`/api/github/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents?path=${encodeURIComponent(path)}`);
      setEntries(data.entries);
    } catch (err) { setError(errorText(err, ar)); }
    finally { setFilePending(false); }
  };
  const loadFile = async (path: string) => {
    setFilePending(true); setError(""); setExplanation("");
    try {
      const data = await jsonFetch<{ path: string; content: string; language: string }>(`/api/github/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/file?path=${encodeURIComponent(path)}`);
      setFile(data);
    } catch (err) { setError(errorText(err, ar)); }
    finally { setFilePending(false); }
  };
  const explain = async () => {
    if (!file || explainPending) return;
    setExplainPending(true); setExplanation("");
    try {
      const response = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "explain_code", message: ar ? "اشرح وظيفة الملف وبنيته" : "Explain what this file does and how it is structured", code: file.content.slice(0, 8_000), codePath: file.path, codeLanguage: file.language, locale: ar ? "ar" : "en" }), signal: AbortSignal.timeout(25_000) });
      const payload = await response.json() as { reply?: string };
      if (!response.ok || !payload.reply) throw new Error("assistant_unavailable");
      setExplanation(payload.reply.slice(0, 5000));
    } catch { setExplanation(ar ? "تعذّر شرح الملف الآن. حاول بعد قليل." : "This file could not be explained right now. Try again shortly."); }
    finally { setExplainPending(false); }
  };
  const languageEntries = useMemo(() => Object.entries(details?.languages ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 8), [details]);
  const languageTotal = languageEntries.reduce((sum, entry) => sum + entry[1], 0) || 1;

  if (pending) return <div className="page-width section-space"><p className="muted-copy"><LoaderCircle className="spin" size={16} />{ar ? "يجري تحميل المستودع…" : "Loading repository…"}</p></div>;
  if (error && !details) return <div className="page-width section-space"><div className="page-intro"><p className="eyebrow">GitHub</p><h1>{ar ? "المستودع غير متاح" : "Repository unavailable"}</h1><p className="page-intro__lead">{error}</p><Link className="text-link" href="/github">{ar ? "العودة إلى المستودعات" : "Back to repositories"}</Link></div></div>;
  if (!details) return null;
  return <div className="page-width section-space github-repo-page" dir={ar ? "rtl" : "ltr"}>
    <button className="text-link github-back" onClick={() => setLocation("/github")}>{ar ? <ArrowUpRight size={15} /> : <ArrowUpLeft size={15} />}{ar ? "كل المستودعات" : "All repositories"}</button>
    <header className="github-repo-heading"><p className="eyebrow"><Github size={15} />{ar ? "مستودع عام · قراءة فقط" : "PUBLIC REPOSITORY · READ ONLY"}</p><h1>{details.fullName}</h1><p>{details.description || (ar ? "لا يوجد وصف." : "No description.")}</p><div className="github-repo-heading__stats"><span><Star size={15} />{details.stars} {ar ? "نجمة" : "stars"}</span><span><GitFork size={15} />{details.forks} {ar ? "تفرّع" : "forks"}</span><span>{details.openIssues} {ar ? "مسألة مفتوحة" : "open issues"}</span>{details.url && <a className="text-link" href={details.url} target="_blank" rel="noreferrer">GitHub <ExternalLink size={14} /></a>}</div>
      {details.topics.length > 0 && <div className="github-topics">{details.topics.map(item => <span key={item}>{item}</span>)}</div>}
    </header>
    <section className="github-languages"><h2>{ar ? "اللغات في المستودع" : "Languages in this repository"}</h2><div className="github-language-bars">{languageEntries.map(([name, bytes]) => <div className="github-language" key={name}><div><strong>{name}</strong><span>{(bytes / languageTotal * 100).toFixed(1)}%</span></div><span className="github-language__track"><i style={{ width: `${Math.max(2, bytes / languageTotal * 100)}%` }} /></span></div>)}</div></section>
    <div className="github-workbench"><section className="github-files"><header><h2><Folder size={17} />{ar ? "ملفات المستودع" : "Repository files"}</h2><span>{currentPath || details.defaultBranch}</span></header><div className="github-breadcrumb"><button onClick={() => void loadDirectory("")}>{details.name}</button>{currentPath.split("/").filter(Boolean).map((part, index, all) => <button key={`${part}-${index}`} onClick={() => void loadDirectory(all.slice(0, index + 1).join("/"))}>/ {part}</button>)}</div>{filePending && <p className="fine-print"><LoaderCircle className="spin" size={13} />{ar ? "يجري تحميل الملف…" : "Loading file…"}</p>}<ul>{entries.map(entry => <li key={entry.path}><button onClick={() => entry.type === "dir" ? void loadDirectory(entry.path) : void loadFile(entry.path)}><span>{entry.type === "dir" ? <Folder size={15} /> : <Code2 size={15} />}{entry.name}</span><small>{entry.type === "file" ? `${Math.max(1, Math.ceil(entry.size / 1024))} KB` : (ar ? "مجلد" : "Folder")}</small></button></li>)}</ul>{error && <p className="github-error" role="alert">{error}</p>}</section>
      <section className="github-reader"><header><h2><BookOpen size={17} />{file ? file.path : "README"}</h2>{file && <button className="button button--quiet" onClick={() => void explain()} disabled={explainPending}><Sparkles size={15} />{explainPending ? (ar ? "يجري التحليل…" : "Explaining…") : (ar ? "اشرح الكود بالذكاء" : "Explain with AI")}</button>}</header>{file ? <><pre className="github-code"><code>{file.content.slice(0, 50_000)}</code></pre>{explanation && <aside className="github-explanation"><strong>{ar ? "شرح المساعد" : "AI explanation"}</strong><p>{explanation}</p><small>{ar ? "الشرح آلي؛ الكود لم يُنفّذ." : "AI-generated explanation; the code was not executed."}</small></aside>}</> : readme ? <pre className="github-readme">{readme.slice(0, 20_000)}</pre> : <div className="github-reader__empty"><BookOpen size={23} /><p>{ar ? "اختر ملفاً نصياً أو افتح المستودع على GitHub." : "Choose a text file or open the repository on GitHub."}</p></div>}</section></div>
    <p className="fine-print github-private-note">{ar ? "يُعرض جزء محدود من النصوص فقط. لا نحمّل الملفات الثنائية أو الحزم الضخمة، ولا ننفّذ التعليمات أو نكتب إلى GitHub." : "Only a limited amount of text is shown. Binary and large files are excluded; code is never executed and GitHub is never modified."}</p>
  </div>;
}
