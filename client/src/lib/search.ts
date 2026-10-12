import { articles, infoPages, localize, projects, services } from "../data/portfolio";
import type { SiteLocale } from "../data/languages";

export type SearchItem = { title: string; description: string; href: string; kind: string; image?: string; keywords?: string };

export function normalizeSearch(value: string) {
  return value.toLocaleLowerCase().normalize("NFKD").replace(/[\u064b-\u065f\u0670]/g, "").replace(/\s+/g, " ").trim();
}

export function getSearchIndex(locale: SiteLocale): SearchItem[] {
  const staticPages = Object.entries(infoPages).map(([href, page]) => ({ title: localize(page.title, locale), description: localize(page.lead, locale), href, kind: locale === "ar" ? "صفحة" : "Page", keywords: localize(page.eyebrow, locale) }));
  return [
    ...projects.map(item => ({ title: localize(item.title, locale), description: localize(item.summary, locale), href: `/work/${item.slug}`, kind: locale === "ar" ? "مشروع تجريبي" : "Concept project", image: item.cover, keywords: `${localize(item.subtitle, locale)} ${item.category} ${item.kit.map(tag => localize(tag, locale)).join(" ")}` })),
    ...articles.map(item => ({ title: localize(item.title, locale), description: localize(item.excerpt, locale), href: `/journal/${item.slug}`, kind: locale === "ar" ? "مقال تجريبي" : "Sample article", image: item.cover, keywords: `${item.topic} ${item.sections.map(section => localize(section.heading, locale)).join(" ")}` })),
    ...services.map(item => ({ title: localize(item.title, locale), description: localize(item.short, locale), href: `/services/${item.slug}`, kind: locale === "ar" ? "خدمة" : "Service", keywords: item.tags.join(" ") })),
    ...staticPages,
    { title: locale === "ar" ? "موجز اليوم" : "Daily ideas", description: locale === "ar" ? "خمس أفكار تعليمية مولّدة بالذكاء الاصطناعي يومياً." : "Five AI-generated learning notes each day.", href: "/daily", kind: locale === "ar" ? "موجز" : "Daily issue", keywords: "AI programming psychology financial literacy design learning" },
    { title: locale === "ar" ? "متصفح GitHub" : "GitHub explorer", description: locale === "ar" ? "استكشف المستودعات العامة والملفات واللغات." : "Explore public repositories, source files, and languages.", href: "/github", kind: locale === "ar" ? "أداة" : "Tool", keywords: "github repository source code languages" },
    { title: locale === "ar" ? "متصفح GitLab" : "GitLab explorer", description: locale === "ar" ? "استكشف المشاريع العامة وشجرة الملفات واللغات." : "Browse public projects, repository files, and languages.", href: "/gitlab", kind: locale === "ar" ? "أداة" : "Tool", keywords: "gitlab repository source code projects" },
    { title: locale === "ar" ? "مشاريعي البرمجية" : "My code projects", description: locale === "ar" ? "مستودعاتك الشخصية المزامنة من GitHub وGitLab." : "Your personal repositories synced from GitHub and GitLab.", href: "/projects", kind: locale === "ar" ? "خدمة" : "Service", keywords: "personal git github gitlab projects source sale open source" },
    { title: locale === "ar" ? "استوديو الذكاء الاصطناعي" : "AI writing studio", description: locale === "ar" ? "اكتب مسودات ومخططات قابلة للتعديل." : "Draft editable text and page outlines.", href: "/ai-studio", kind: locale === "ar" ? "أداة" : "Tool", keywords: "assistant AI writing drafts page" },
  ];
}

export function rankSearch(query: string, items: SearchItem[], limit = 12): SearchItem[] {
  const needle = normalizeSearch(query);
  if (!needle) return items.slice(0, limit);
  const words = needle.split(" ").filter(Boolean);
  return items.map((item, order) => {
    const title = normalizeSearch(item.title);
    const body = normalizeSearch(`${item.description} ${item.keywords ?? ""} ${item.kind}`);
    let score = 0;
    if (title === needle) score += 20;
    if (title.includes(needle)) score += 9;
    for (const word of words) {
      if (title.includes(word)) score += 4;
      if (body.includes(word)) score += 2;
    }
    return { item, score, order };
  }).filter(result => result.score > 0).sort((a, b) => b.score - a.score || a.order - b.order).slice(0, limit).map(result => result.item);
}
