import { useMemo } from "react";
import { ArrowUpLeft, ArrowUpRight, Clock3 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "../contexts/LanguageContext";
import { articleBySlug, articles, journalTopics, localize } from "../data/portfolio";
import { Breadcrumbs, DemoNote, EmptyState, PageIntro, TagPill } from "../components/site/ContentComponents";
import { ReadingProgress } from "../components/site/ReadingProgress";
import { ShareButton } from "../components/site/ShareButton";

export default function ArticleDetail() {
  const { locale, t } = useLanguage();
  const [path] = useLocation();
  const slug = path.split("/").filter(Boolean).pop() ?? "";
  const article = articleBySlug(slug);
  const topic = journalTopics.find(item => item.slug === article?.topic);
  const index = articles.findIndex(item => item.slug === slug);
  const related = useMemo(() => article ? [articles[(index + 1) % articles.length], articles[(index + 4) % articles.length]] : [], [article, index]);
  const Arrow = locale === "ar" ? ArrowUpLeft : ArrowUpRight;
  if (!article) return <div className="page-width section-space"><EmptyState title={t("notFound")} /><Link className="text-link" href="/journal">{t("journal")}</Link></div>;
  const ids = article.sections.map((_, sectionIndex) => `section-${sectionIndex + 1}`);
  return <article className="article-detail">
    <ReadingProgress />
    <div className="page-width section-space article-detail__wrap"><Breadcrumbs locale={locale} items={[{ label: t("home"), href: "/" }, { label: t("journal"), href: "/journal" }, ...(topic ? [{ label: topic.title[locale], href: `/journal/topics/${topic.slug}` }] : []), { label: localize(article.title, locale) }]} />
      <header className="article-detail__header"><p className="eyebrow"><span className="eyebrow-dot" />{topic?.title[locale]}</p><h1>{localize(article.title, locale)}</h1><p className="article-detail__dek">{localize(article.excerpt, locale)}</p><div className="article-detail__meta"><span><Clock3 size={15} />{article.readMinutes} {t("readTime")}</span><TagPill>{t("articleExample")}</TagPill><ShareButton /></div></header>
      <figure className="article-cover"><img src={article.cover} alt={localize(article.alt, locale)} fetchPriority="high" /><figcaption>{localize(article.alt, locale)}</figcaption></figure>
      <div className="article-layout"><aside className="article-toc"><span className="eyebrow">{t("contents")}</span><nav>{article.sections.map((section, index) => <a href={`#${ids[index]}`} key={ids[index]}><span>0{index + 1}</span>{localize(section.heading, locale)}</a>)}</nav><DemoNote>{t("articleExample")}</DemoNote></aside>
        <div className="article-prose"><p className="article-prose__intro">{localize(article.excerpt, locale)}</p>{article.sections.map((section, index) => <section id={ids[index]} key={ids[index]}><span className="index-number">0{index + 1}</span><h2>{localize(section.heading, locale)}</h2><p>{localize(section.body, locale)}</p></section>)}<div className="article-summary"><span>{t("summary")}</span><p>{locale === "ar" ? "الفكرة العملية: ابدأ بسؤال واضح، واجعل كل قرار بصري قابلاً للشرح والمراجعة." : "Practical takeaway: start with a clear question and make each visual decision explainable and reviewable."}</p></div></div>
      </div>
      <section className="related-articles"><div className="section-heading"><div><p className="eyebrow">{t("related")}</p><h2>{t("continueReading")}</h2></div><Link className="text-link" href="/journal">{t("journal")}<Arrow size={15} /></Link></div><div className="article-grid">{related.map((item, relatedIndex) => <article className="related-article" key={item.slug}><span>0{relatedIndex + 1} / {item.readMinutes} {locale === "ar" ? "دقائق" : "min"}</span><h3><Link href={`/journal/${item.slug}`}>{localize(item.title, locale)}</Link></h3><p>{localize(item.excerpt, locale)}</p><Link className="text-link" href={`/journal/${item.slug}`}>{t("readArticle")}<Arrow size={14} /></Link></article>)}</div></section>
    </div>
  </article>;
}
