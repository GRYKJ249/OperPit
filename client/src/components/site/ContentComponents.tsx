import React from "react";
import { ArrowLeft, ArrowRight, ArrowUpLeft, ArrowUpRight } from "lucide-react";
import { Link } from "wouter";
import { localize, type Article, type Locale, type Project } from "../../data/portfolio";

export function PageIntro({ eyebrow, title, description, locale, compact = false }: { eyebrow: string; title: string; description?: string; locale: Locale; compact?: boolean }) {
  return <header className={`page-intro ${compact ? "page-intro--compact" : ""}`}>
    <p className="eyebrow"><span className="eyebrow-dot" />{eyebrow}</p>
    <h1>{title}</h1>
    {description && <p className="page-intro__lead">{description}</p>}
  </header>;
}

export function Breadcrumbs({ items, locale }: { items: { label: string; href?: string }[]; locale: Locale }) {
  const Separator = locale === "ar" ? ArrowLeft : ArrowRight;
  return <nav className="breadcrumbs" aria-label={locale === "ar" ? "مسار الصفحة" : "Breadcrumbs"}>
    {items.map((item, index) => <React.Fragment key={`${item.label}-${index}`}>
      {index > 0 && <Separator size={13} aria-hidden="true" />}
      {item.href ? <Link href={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
    </React.Fragment>)}
  </nav>;
}

export function SectionHeading({ index, eyebrow, title, description, action }: { index?: string; eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="section-heading">
    <div className="section-heading__copy">
      <p className="eyebrow">{index && <span className="index-number">{index}</span>}{eyebrow}</p>
      <h2>{title}</h2>
      {description && <p className="muted-copy">{description}</p>}
    </div>
    {action && <div className="section-heading__action">{action}</div>}
  </div>;
}

export function ProjectCard({ project, locale, index }: { project: Project; locale: Locale; index?: number }) {
  const title = localize(project.title, locale);
  const Arrow = locale === "ar" ? ArrowUpLeft : ArrowUpRight;
  return <article className="project-card">
    <Link className="project-card__image-link" href={`/work/${project.slug}`} aria-label={`${locale === "ar" ? "افتح دراسة حالة" : "Open case study"}: ${title}`}>
      <img className="project-card__image" src={project.cover} alt={localize(project.alt, locale)} loading="lazy" />
      <span className="project-card__number">{String((index ?? 0) + 1).padStart(2, "0")}</span>
      <span className="project-card__arrow"><Arrow size={17} aria-hidden="true" /></span>
    </Link>
    <div className="project-card__meta"><span>{localize(project.categoryTitle, locale)}</span><span>{locale === "ar" ? "دراسة مفاهيمية" : "Concept study"}</span></div>
    <h3><Link href={`/work/${project.slug}`}>{title}</Link></h3>
    <p>{localize(project.subtitle, locale)}</p>
  </article>;
}

export function ArticleCard({ article, locale, index }: { article: Article; locale: Locale; index?: number }) {
  const Arrow = locale === "ar" ? ArrowUpLeft : ArrowUpRight;
  return <article className="article-card">
    <Link href={`/journal/${article.slug}`} className="article-card__image-link" aria-label={`${locale === "ar" ? "اقرأ" : "Read"}: ${localize(article.title, locale)}`}>
      <img src={article.cover} alt={localize(article.alt, locale)} loading="lazy" />
      <span className="article-card__number">{String((index ?? 0) + 1).padStart(2, "0")}</span>
    </Link>
    <div className="article-card__body">
      <div className="article-card__meta"><span>{locale === "ar" ? "مقال تجريبي" : "Sample article"}</span><span>{article.readMinutes} {locale === "ar" ? "دقائق" : "min"}</span></div>
      <h3><Link href={`/journal/${article.slug}`}>{localize(article.title, locale)}</Link></h3>
      <p>{localize(article.excerpt, locale)}</p>
      <Link className="text-link" href={`/journal/${article.slug}`}>{locale === "ar" ? "تابع القراءة" : "Continue reading"}<Arrow size={15} aria-hidden="true" /></Link>
    </div>
  </article>;
}

export function TagPill({ children }: { children: React.ReactNode }) { return <span className="tag-pill">{children}</span>; }

export function DemoNote({ children }: { children: React.ReactNode }) { return <aside className="demo-note"><span className="demo-note__mark" aria-hidden="true">i</span><p>{children}</p></aside>; }

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return <div className="empty-state"><span className="empty-state__mark" aria-hidden="true">/</span><h3>{title}</h3>{description && <p>{description}</p>}</div>;
}

export function BackLink({ href, children, locale }: { href: string; children: React.ReactNode; locale: Locale }) {
  const Arrow = locale === "ar" ? ArrowRight : ArrowLeft;
  return <Link className="back-link" href={href}><Arrow size={16} aria-hidden="true" />{children}</Link>;
}
