import { useEffect, useState } from "react";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { useLanguage } from "../../contexts/LanguageContext";

export type DailyPostSummary = {
  slug: string; batchDate: string; position: number; category: string;
  titleAr: string; titleEn: string; summaryAr: string; summaryEn: string;
  imagePath: string; imageAltAr: string; imageAltEn: string;
};

const categoryNames: Record<string, { ar: string; en: string }> = {
  programming: { ar: "برمجة", en: "Programming" },
  psychology: { ar: "علم النفس العام", en: "Everyday psychology" },
  trading: { ar: "ثقافة مالية", en: "Trading literacy" },
  design: { ar: "تصميم", en: "Design" },
  learning: { ar: "تعلّم", en: "Learning" },
};

export function DailyFeed({ limit = 5, compact = false }: { limit?: number; compact?: boolean }) {
  const { locale } = useLanguage();
  const [posts, setPosts] = useState<DailyPostSummary[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "unavailable">("loading");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/daily/posts?limit=${limit}`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("daily_unavailable");
        return response.json() as Promise<{ posts?: DailyPostSummary[] }>;
      })
      .then(payload => { setPosts(Array.isArray(payload.posts) ? payload.posts.slice(0, limit) : []); setState("ready"); })
      .catch(error => { if (error instanceof Error && error.name === "AbortError") return; setState("unavailable"); });
    return () => controller.abort();
  }, [limit]);

  if (state === "loading") return <div className="daily-loading" aria-live="polite">{locale === "ar" ? "يجري تحميل عدد اليوم…" : "Loading today's issue…"}</div>;
  if (state === "unavailable") return <div className="daily-empty" role="status"><Sparkles size={19} /><p>{locale === "ar" ? "موجز اليوم غير متاح مؤقتاً. تصفّح الأرشيف أو جرّب لاحقاً." : "Today's issue is temporarily unavailable. Explore the archive or try again later."}</p></div>;
  if (!posts.length) return <div className="daily-empty" role="status"><Sparkles size={19} /><p>{locale === "ar" ? "العدد الأول سيظهر هنا عند تشغيل خدمة المحتوى اليومية." : "The first issue will appear here when the daily content service is active."}</p></div>;

  return <div className={`daily-card-grid ${compact ? "daily-card-grid--compact" : ""}`}>
    {posts.map(post => <article className="daily-card" key={post.slug}>
      <Link className="daily-card__image" href={`/daily/${post.slug}`} aria-label={`${locale === "ar" ? "اقرأ" : "Read"}: ${locale === "ar" ? post.titleAr : post.titleEn}`}>
        <img src={post.imagePath} alt={locale === "ar" ? post.imageAltAr : post.imageAltEn} loading="lazy" />
      </Link>
      <div className="daily-card__body">
        <div className="daily-card__meta"><span>{categoryNames[post.category]?.[locale === "ar" ? "ar" : "en"] ?? post.category}</span><time dateTime={post.batchDate}>{post.batchDate}</time><span>0{post.position + 1}</span></div>
        <h3><Link href={`/daily/${post.slug}`}>{locale === "ar" ? post.titleAr : post.titleEn}</Link></h3>
        <p>{locale === "ar" ? post.summaryAr : post.summaryEn}</p>
        <Link className="text-link" href={`/daily/${post.slug}`}>{locale === "ar" ? "اقرأ الفكرة" : "Read the idea"}<ArrowUpRight size={15} /></Link>
      </div>
    </article>)}
  </div>;
}

export { categoryNames as dailyCategoryNames };
