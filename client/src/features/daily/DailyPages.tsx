import { useEffect, useState } from "react";
import { ArrowUpLeft, ArrowUpRight, Clock3, Sparkles } from "lucide-react";
import { Link, useRoute } from "wouter";
import { useLanguage } from "../../contexts/LanguageContext";
import { DailyFeed, dailyCategoryNames, type DailyPostSummary } from "./DailyFeed";
import { PostInteractions } from "./PostInteractions";

type FullDailyPost = DailyPostSummary & { bodyAr: string; bodyEn: string; takeawayAr: string; takeawayEn: string };

export function DailyArchivePage() {
  const { locale } = useLanguage();
  const ar = locale === "ar";
  const [dailyChange, setDailyChange] = useState<{ themeKey: string; evolutionAr: string; evolutionEn: string; date: string } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/daily/latest", { signal: controller.signal }).then(response => response.ok ? response.json() as Promise<{ batch?: { themeKey?: string; evolutionAr?: string; evolutionEn?: string; batchDate?: string } | null }> : null)
      .then(payload => { const batch = payload?.batch; if (batch?.evolutionAr && batch.evolutionEn) setDailyChange({ themeKey: batch.themeKey ?? "cobalt", evolutionAr: batch.evolutionAr, evolutionEn: batch.evolutionEn, date: batch.batchDate ?? "" }); })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);
  return <div className="page-width section-space daily-archive">
    <div className="page-intro"><p className="eyebrow"><Sparkles size={14} />{ar ? "دفتر يتجدد كل يوم" : "A notebook that grows daily"}</p><h1>{ar ? "فكرة اليوم، كل يوم." : "One useful idea, every day."}</h1><p className="page-intro__lead">{ar ? "خمس ومضات تعليمية قصيرة: برمجة، علم نفس عام، ثقافة مالية، تصميم، وتعلّم. المحتوى مولّد بالذكاء الاصطناعي ومحدود بمعايير واضحة." : "Five concise learning notes across programming, everyday psychology, financial literacy, design, and learning. AI-generated with clear guardrails."}</p></div>
    <div className="daily-safety-note"><strong>{ar ? "حدود المحتوى" : "Content boundaries"}</strong><p>{ar ? "المواد النفسية تثقيف عام وليست تشخيصاً أو علاجاً. التداول موضوع تعليمي عام بلا إشارات أو توصيات أصول أو أسعار. راجع مصادرك المهنية قبل اتخاذ قرار." : "Psychology notes are general education, not diagnosis or treatment. Trading notes are general education, with no signals, asset recommendations, or prices. Check qualified sources before making decisions."}</p></div>
    {dailyChange && <aside className="daily-evolution-card"><div><p className="eyebrow"><Sparkles size={14} />{ar ? "تطوّر اليوم · معاينة آمنة" : "Daily evolution · safe preview"}</p><h2>{ar ? "فكرة للتحسين، لا تعديل تلقائي للملفات" : "A refinement idea — no automatic file edits"}</h2><p>{ar ? dailyChange.evolutionAr : dailyChange.evolutionEn}</p><small>{ar ? `لوحة اللون: ${dailyChange.themeKey} · ${dailyChange.date} UTC` : `Color preset: ${dailyChange.themeKey} · ${dailyChange.date} UTC`}</small></div></aside>}
    <DailyFeed limit={30} />
  </div>;
}

export function DailyPostPage() {
  const { locale } = useLanguage();
  const ar = locale === "ar";
  const [, params] = useRoute("/daily/:slug");
  const slug = params?.slug ?? "";
  const [post, setPost] = useState<FullDailyPost | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "unavailable">("loading");
  useEffect(() => {
    if (!slug) return;
    const controller = new AbortController();
    fetch(`/api/daily/posts/${encodeURIComponent(slug)}`, { signal: controller.signal })
      .then(async response => {
        if (response.status === 404) { setStatus("missing"); return null; }
        if (!response.ok) throw new Error("daily_unavailable");
        return response.json() as Promise<{ post: FullDailyPost }>;
      })
      .then(payload => {
        if (!payload) return;
        setPost(payload.post); setStatus("ready");
        const title = ar ? payload.post.titleAr : payload.post.titleEn;
        const description = ar ? payload.post.summaryAr : payload.post.summaryEn;
        document.title = `${title} — ${ar ? "موجز الأرشيف" : "Archive Daily"}`;
        const descriptionNode = document.querySelector('meta[name="description"]');
        if (descriptionNode) descriptionNode.setAttribute("content", description);
        const imageNode = document.querySelector('meta[property="og:image"]');
        if (imageNode) imageNode.setAttribute("content", payload.post.imagePath);
      })
      .catch(error => { if (error instanceof Error && error.name === "AbortError") return; setStatus("unavailable"); });
    return () => controller.abort();
  }, [slug, ar]);

  if (status === "loading") return <div className="page-width section-space"><p className="muted-copy">{ar ? "يجري تحميل المقال…" : "Loading the post…"}</p></div>;
  if (status !== "ready" || !post) return <div className="page-width section-space"><div className="page-intro"><p className="eyebrow">{status === "missing" ? "404" : "AI DAILY"}</p><h1>{status === "missing" ? (ar ? "المنشور غير موجود" : "Post not found") : (ar ? "المحتوى غير متاح الآن" : "Content is temporarily unavailable")}</h1><Link className="text-link" href="/daily">{ar ? "افتح الأرشيف اليومي" : "Open the daily archive"}{ar ? <ArrowUpRight size={15} /> : <ArrowUpLeft size={15} />}</Link></div></div>;

  const title = ar ? post.titleAr : post.titleEn;
  const body = ar ? post.bodyAr : post.bodyEn;
  const takeaway = ar ? post.takeawayAr : post.takeawayEn;
  const name = dailyCategoryNames[post.category]?.[locale] ?? post.category;
  return <article className="page-width section-space daily-post" dir={ar ? "rtl" : "ltr"}>
    <Link className="text-link daily-back" href="/daily">{ar ? <ArrowUpRight size={15} /> : <ArrowUpLeft size={15} />}{ar ? "كل أفكار اليوم" : "All daily ideas"}</Link>
    <header className="daily-post__header"><p className="eyebrow"><span className="eyebrow-dot" />{name}<span className="daily-post__date">{post.batchDate}</span></p><h1>{title}</h1><p className="daily-post__dek">{ar ? post.summaryAr : post.summaryEn}</p></header>
    <figure className="daily-post__cover"><img src={post.imagePath} alt={ar ? post.imageAltAr : post.imageAltEn} /><figcaption>{ar ? "رسم تحريري مولّد بالذكاء الاصطناعي لهذا الموضوع." : "An AI-generated editorial illustration for this topic."}</figcaption></figure>
    <div className="daily-post__layout"><div className="daily-post__prose"><p className="eyebrow"><Clock3 size={13} />{ar ? "ملاحظة تعليمية · قراءة قصيرة" : "Learning note · quick read"}</p>{body.split(/\n\n+/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}<aside className="daily-takeaway"><Sparkles size={18} /><div><strong>{ar ? "الخلاصة" : "Takeaway"}</strong><p>{takeaway}</p></div></aside><p className="fine-print">{ar ? "محتوى مولّد بالذكاء الاصطناعي. البرمجة للتعلم، والملاحظات النفسية تثقيف عام، والتداول ليس نصيحة مالية أو توصية استثمارية." : "AI-generated content. Programming notes are educational, psychology notes are general, and trading content is not financial or investment advice."}</p></div><aside className="daily-post__side"><span className="daily-post__side-index">0{post.position + 1} / 05</span><p>{ar ? "كل يوم يحمل خمس زوايا جديدة للتعلّم." : "Every issue offers five angles for learning."}</p><Link href="/ai-studio" className="button button--quiet">{ar ? "اصنع مسودتك" : "Create a draft"}</Link></aside></div>
    <PostInteractions slug={post.slug} />
  </article>;
}
