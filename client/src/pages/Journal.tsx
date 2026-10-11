import { useMemo, useState } from "react";
import { ArrowUpLeft, ArrowUpRight, Search } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "../contexts/LanguageContext";
import { articles, journalTopics, localize, topicBySlug } from "../data/portfolio";
import { ArticleCard, Breadcrumbs, EmptyState, PageIntro, TagPill } from "../components/site/ContentComponents";

export default function JournalPage() {
  const { locale, t } = useLanguage();
  const [path] = useLocation();
  const topicSlug = path.includes("/topics/") ? path.split("/").filter(Boolean).pop() ?? "" : "";
  const topic = topicSlug ? topicBySlug(topicSlug) : undefined;
  const [query, setQuery] = useState("");
  const list = useMemo(() => articles.filter(article => (!topic || article.topic === topic.slug) && `${localize(article.title, locale)} ${localize(article.excerpt, locale)}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())), [locale, query, topic]);
  const Arrow = locale === "ar" ? ArrowUpLeft : ArrowUpRight;
  if (topicSlug && !topic) return <div className="page-width section-space"><EmptyState title={t("notFound")} /><Link className="text-link" href="/journal">{t("journal")}<Arrow size={15} /></Link></div>;
  return <div className="page-width section-space journal-index">
    <Breadcrumbs locale={locale} items={[{ label: t("home"), href: "/" }, { label: t("journal"), href: "/journal" }, ...(topic ? [{ label: localize(topic.title, locale) }] : [])]} />
    <PageIntro eyebrow={topic ? localize(topic.title, locale) : (locale === "ar" ? "دفتر مفتوح · 12 مقالة" : "OPEN NOTEBOOK · 12 ARTICLES")} title={topic ? localize(topic.title, locale) : (locale === "ar" ? "ملاحظات عن التصميم وما وراءه." : "Notes on design and what surrounds it.")} description={topic ? (locale === "ar" ? "مقالات تجريبية قابلة للاستبدال من هذا المحور." : "Replaceable sample articles from this topic.") : (locale === "ar" ? "أربعة محاور، اثنتا عشرة قراءة قصيرة، وأسئلة تفتح طرقاً جديدة للتفكير." : "Four themes, twelve short reads, and questions that open new ways to think.")} locale={locale} />
    <div className="topic-grid">{journalTopics.map((item, index) => <Link className={`topic-card topic-card--${index + 1}`} href={`/journal/topics/${item.slug}`} key={item.slug}><img src={item.image} alt={localize(item.title, locale)} loading="lazy" /><span className="topic-card__index">0{index + 1}</span><strong>{localize(item.title, locale)}</strong><span className="topic-card__arrow"><Arrow size={16} /></span></Link>)}</div>
    <div className="journal-toolbar"><div><span className="eyebrow">{topic ? (locale === "ar" ? "قراءات المحور" : "READING IN THIS TOPIC") : t("articlesTitle")}</span><h2>{locale === "ar" ? "ما الذي نقرأه الآن؟" : "What are we reading now?"}</h2></div><label className="archive-search"><Search size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={locale === "ar" ? "ابحث في المقالات" : "Search articles"} aria-label={locale === "ar" ? "ابحث في المقالات" : "Search articles"} /></label></div>
    <div className="article-topic-chips"><Link href="/journal" className={!topic ? "is-active" : ""}>{t("filterAll")}</Link>{journalTopics.map(item => <Link key={item.slug} href={`/journal/topics/${item.slug}`} className={topic?.slug === item.slug ? "is-active" : ""}>{item.title[locale]}</Link>)}{query && <TagPill>{query}</TagPill>}</div>
    {list.length ? <div className="article-grid article-grid--archive">{list.map((article, index) => <ArticleCard key={article.slug} article={article} locale={locale} index={index} />)}</div> : <EmptyState title={t("noResults")} description={locale === "ar" ? "غيّر البحث أو أزل تحديد المحور." : "Try a different search or clear the selected topic."} />}
    <div className="journal-disclaimer"><p>{t("articleExample")}</p><Link href="/about">{locale === "ar" ? "عن الأرشيف" : "About this archive"}<Arrow size={15} /></Link></div>
  </div>;
}
