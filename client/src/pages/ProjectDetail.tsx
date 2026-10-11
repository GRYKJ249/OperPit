import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpLeft, ArrowUpRight, Copy, Maximize2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "../contexts/LanguageContext";
import { localize, projectBySlug, projects } from "../data/portfolio";
import { BackLink, Breadcrumbs, DemoNote, EmptyState, PageIntro, ProjectCard, TagPill } from "../components/site/ContentComponents";
import { ShareButton } from "../components/site/ShareButton";

export default function ProjectDetail() {
  const { locale, t } = useLanguage();
  const [path] = useLocation();
  const slug = path.split("/").filter(Boolean).pop() ?? "";
  const project = projectBySlug(slug);
  const [lightbox, setLightbox] = useState(false);
  const index = projects.findIndex(item => item.slug === slug);
  const previous = projects[(index + projects.length - 1) % projects.length];
  const next = projects[(index + 1) % projects.length];
  const related = useMemo(() => (project?.related ?? []).map(projectBySlug).filter(Boolean), [project]);
  const Arrow = locale === "ar" ? ArrowUpLeft : ArrowUpRight;
  if (!project) return <div className="page-width section-space"><EmptyState title={t("notFound")} /><BackLink href="/work" locale={locale}>{t("work")}</BackLink></div>;

  return <article className="page-width section-space project-detail">
    <Breadcrumbs locale={locale} items={[{ label: t("home"), href: "/" }, { label: t("work"), href: "/work" }, { label: localize(project.categoryTitle, locale), href: `/work/${project.category}` }, { label: localize(project.title, locale) }]} />
    <div className="project-detail__mast"><p className="eyebrow"><span className="eyebrow-dot" />{localize(project.categoryTitle, locale)} · {t("concept")}</p><h1>{localize(project.title, locale)}</h1><p>{localize(project.subtitle, locale)}</p><div className="project-detail__pills"><TagPill>{locale === "ar" ? "مثال توضيحي" : "Illustrative example"}</TagPill><TagPill>{locale === "ar" ? "مفهوم تجريبي" : "Concept study"}</TagPill><ShareButton /></div></div>
    <div className="project-detail__hero"><button className="lightbox-trigger" onClick={() => setLightbox(true)} aria-label={locale === "ar" ? "تكبير صورة المشروع" : "Enlarge project image"}><img src={project.cover} alt={localize(project.alt, locale)} fetchPriority="high" /><span><Maximize2 size={16} />{locale === "ar" ? "عرض الصورة" : "View image"}</span></button><div className="project-detail__caption"><span>{String(index + 1).padStart(2, "0")} / {String(projects.length).padStart(2, "0")}</span><span>{localize(project.alt, locale)}</span></div></div>
    <div className="project-detail__grid"><aside className="project-facts"><div><span>{locale === "ar" ? "التصنيف" : "CATEGORY"}</span><Link href={`/work/${project.category}`}>{localize(project.categoryTitle, locale)}<Arrow size={13} /></Link></div><div><span>{locale === "ar" ? "نوع الصفحة" : "PAGE TYPE"}</span><strong>{locale === "ar" ? "دراسة حالة مفاهيمية" : "Concept case study"}</strong></div><div><span>{locale === "ar" ? "النطاق" : "SCOPE"}</span><strong>{locale === "ar" ? "مادة توضيحية" : "Illustrative material"}</strong></div></aside>
      <div className="project-story"><DemoNote>{t("detailExample")}</DemoNote><section><span className="index-number">01 / {t("summary")}</span><h2>{localize(project.summary, locale)}</h2></section><section><span className="index-number">02 / {t("challenge")}</span><p className="prose-lead">{localize(project.challenge, locale)}</p></section><section><span className="index-number">03 / {t("approach")}</span><p className="prose-lead">{localize(project.approach, locale)}</p></section><section><span className="index-number">04 / {t("process")}</span><ol className="case-steps">{project.process.map((item, step) => <li key={step}><span>0{step + 1}</span><p>{localize(item, locale)}</p></li>)}</ol></section><section><span className="index-number">05 / {t("outputs")}</span><div className="case-output-list">{project.outputs.map((item, step) => <div key={step}><span>0{step + 1}</span><strong>{localize(item, locale)}</strong></div>)}</div></section><section><span className="index-number">06 / {t("toolkit")}</span><div className="case-tags">{project.kit.map((item, step) => <TagPill key={step}>{localize(item, locale)}</TagPill>)}</div><p className="fine-print">{locale === "ar" ? "عناصر العمل المقترحة للمفهوم، وليست إثباتاً لأدوات أو خبرة شخصية." : "Suggested elements for this concept, not proof of personal tools or experience."}</p></section></div>
    </div>
    <nav className="project-pagination" aria-label={locale === "ar" ? "تنقل المشاريع" : "Project navigation"}><Link href={`/work/${previous.slug}`}><span>{locale === "ar" ? "السابق" : "PREVIOUS"}</span><strong><ArrowLeft size={15} />{localize(previous.title, locale)}</strong></Link><Link href="/work" className="project-pagination__all"><Copy size={16} /><span>{t("allWork")}</span></Link><Link href={`/work/${next.slug}`}><span>{locale === "ar" ? "التالي" : "NEXT"}</span><strong>{localize(next.title, locale)}<ArrowRight size={15} /></strong></Link></nav>
    {related.length > 0 && <section className="home-section related-projects"><div className="section-heading"><div><p className="eyebrow">{t("related")}</p><h2>{locale === "ar" ? "تابع استكشاف الأرشيف." : "Keep exploring the archive."}</h2></div></div><div className="project-grid">{related.slice(0, 2).map((item, itemIndex) => item && <ProjectCard key={item.slug} project={item} locale={locale} index={itemIndex} />)}</div></section>}
    {lightbox && <div className="lightbox" role="dialog" aria-modal="true" aria-label={localize(project.title, locale)} onClick={() => setLightbox(false)} onKeyDown={event => { if (event.key === "Escape") setLightbox(false); }}><button className="lightbox__close" onClick={() => setLightbox(false)} aria-label={t("close")}>×</button><img src={project.cover} alt={localize(project.alt, locale)} /></div>}
  </article>;
}
