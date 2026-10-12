import { asc, desc, eq } from "drizzle-orm";
import { dailyBatches, dailyPosts } from "../drizzle/schema";
import { getDb } from "./db";
import { getSitePulseSnapshot } from "./analytics";
import { redactPotentialSecrets } from "./council-security";

export type CouncilSiteToolId = "site_capabilities" | "ai_provider_status" | "daily_public_feed" | "privacy_safe_analytics";
type ProviderSnapshot = { id: string; label: string; status: string }[];

export const councilToolLabels: Record<CouncilSiteToolId, { ar: string; en: string }> = {
  site_capabilities: { ar: "قدرات الموقع", en: "Site capabilities" },
  ai_provider_status: { ar: "حالة مزودي الذكاء", en: "AI provider status" },
  daily_public_feed: { ar: "عناوين الموجز العام", en: "Public daily headlines" },
  privacy_safe_analytics: { ar: "إحصاءات مجهلة", en: "Anonymous analytics" },
};

const siteCapabilities = [
  { id: "portfolio", status: "available", detail: "فهرس البورتفوليو، الأعمال المفاهيمية، الخدمات، المجلة، البحث والتواصل." },
  { id: "languages_and_themes", status: "available", detail: "12 لغة للواجهة مع اتجاه RTL/LTR، و100 لوحة ألوان محلية قابلة للاختيار." },
  { id: "ai_assistant_and_studio", status: "provider_dependent", detail: "مساعد الأرشيف واستوديو المسودات وشرح مقتطفات الكود؛ لا ينفذ كوداً ولا يحفظ محادثات الزوار." },
  { id: "daily_feed", status: "scheduler_dependent", detail: "موجز تعليمي عام بخمس موضوعات مستهدفة لكل إصدار؛ التشغيل اليومي يعتمد على إعداد الجدولة والمزودين." },
  { id: "community", status: "available", detail: "تفاعلات وتعليقات عامة مع مراجعة آلية؛ لا تُعرض التعليقات المخفية للنشر العام." },
  { id: "public_repositories", status: "available", detail: "تصفح عام للقراءة فقط عبر GitHub وGitLab؛ لا وصول لمستودعات خاصة ولا تشغيل للكود." },
  { id: "privacy_pulse", status: "available", detail: "تحليلات مجمعة مع إخفاء المجموعات الصغيرة؛ لا تعرض هوية زائر أو نصوصه." },
  { id: "secret_council", status: "admin_only", detail: "غرفة خاصة للاجتماعات والاستطلاعات وتثبيت المقترحات وتجميد النماذج والفيتو البشري." },
];

export function selectCouncilSiteTools(prompt: string): CouncilSiteToolId[] {
  const normalized = prompt.toLocaleLowerCase();
  const selected: CouncilSiteToolId[] = ["site_capabilities", "ai_provider_status"];
  if (/\b(daily|feed|post|posts|article|today|content)\b|موجز|منشور|منشورات|مقال|المحتوى|اليوم/u.test(normalized)) selected.push("daily_public_feed");
  if (/\b(analytics|traffic|visitors|visitor|views|activity|pulse|metrics)\b|تحليلات|زيارات|زائر|زوار|مشاهدات|نشاط|نبض|إحصاء|احصاء/u.test(normalized)) selected.push("privacy_safe_analytics");
  return selected;
}

function safePublicText(value: string, max: number) {
  const plain = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return redactPotentialSecrets(plain).slice(0, max);
}

async function latestPublishedFeed() {
  try {
    const db = await getDb();
    if (!db) return { status: "unavailable", posts: [] };
    const [batch] = await db.select({ batchDate: dailyBatches.batchDate, themeKey: dailyBatches.themeKey })
      .from(dailyBatches).where(eq(dailyBatches.status, "published")).orderBy(desc(dailyBatches.batchDate)).limit(1);
    if (!batch) return { status: "empty", posts: [] };
    const posts = await db.select({ category: dailyPosts.category, titleAr: dailyPosts.titleAr, titleEn: dailyPosts.titleEn })
      .from(dailyPosts).where(eq(dailyPosts.batchDate, batch.batchDate)).orderBy(asc(dailyPosts.position)).limit(5);
    return { status: "published", date: batch.batchDate, theme: batch.themeKey, posts: posts.map(post => ({ category: post.category, titleAr: safePublicText(post.titleAr, 180), titleEn: safePublicText(post.titleEn, 180) })) };
  } catch {
    return { status: "unavailable", posts: [] };
  }
}

/** Executes only the fixed read-only tools requested by an authenticated council prompt. */
export async function collectCouncilToolContext(prompt: string, providers: ProviderSnapshot) {
  const tools = selectCouncilSiteTools(prompt);
  const data: Record<string, unknown> = {
    generatedAt: new Date().toISOString(),
    privacy: "Read-only site data only. No secret values, raw visitor data, public comments, private chats, private repositories, or source files.",
  };
  if (tools.includes("site_capabilities")) data.siteCapabilities = siteCapabilities;
  if (tools.includes("ai_provider_status")) {
    data.aiProviders = providers.map(({ id, label, status }) => ({ id, label, status }));
  }
  if (tools.includes("daily_public_feed")) data.latestPublicFeed = await latestPublishedFeed();
  if (tools.includes("privacy_safe_analytics")) {
    data.publicActivity = { ...await getSitePulseSnapshot(), privacy: "Small cohorts are hidden; counts are aggregate only." };
  }
  return { tools, context: JSON.stringify(data) };
}
