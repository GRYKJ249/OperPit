import { ArrowUpLeft, ArrowUpRight, Check } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "../contexts/LanguageContext";
import { infoPages, localize } from "../data/portfolio";
import { Breadcrumbs, DemoNote, PageIntro } from "../components/site/ContentComponents";

export default function InfoPage() {
  const { locale, t } = useLanguage();
  const [path] = useLocation();
  const page = infoPages[path];
  const Arrow = locale === "ar" ? ArrowUpLeft : ArrowUpRight;
  if (!page) return <div className="page-width section-space"><h1>{t("notFound")}</h1><Link href="/">{t("backHome")}</Link></div>;
  return <div className="page-width section-space info-page">
    <Breadcrumbs locale={locale} items={[{ label: t("home"), href: "/" }, { label: localize(page.eyebrow, locale) }]} />
    <PageIntro eyebrow={localize(page.eyebrow, locale)} title={localize(page.title, locale)} description={localize(page.lead, locale)} locale={locale} />
    <div className="info-page__layout"><aside className="info-page__side"><span className="index-number">INDEX / {path.slice(1).toUpperCase()}</span><p>{locale === "ar" ? "ملاحظة تحريرية" : "EDITORIAL NOTE"}</p><span className="side-line" /></aside>
      <div className="info-page__body">{page.paragraphs.map((paragraph, index) => <p className="prose-lead" key={index}>{localize(paragraph, locale)}</p>)}
        <ul className="principle-list">{page.points.map((point, index) => <li key={index}><span className="principle-list__number">0{index + 1}</span><span>{localize(point, locale)}</span><Check size={16} /></li>)}</ul>
        {path === "/journey" && <div className="timeline-placeholder">{["01", "02", "03"].map((step, index) => <div className="timeline-placeholder__item" key={step}><span>{step}</span><div><h2>{locale === "ar" ? `محطة قابلة للإضافة ${index + 1}` : `Editable milestone ${index + 1}`}</h2><p>{locale === "ar" ? "أضف السنة والسياق والتعلم الذي خرجت به." : "Add the year, context, and what you learned."}</p></div><small>{locale === "ar" ? "أضف تاريخاً حقيقياً" : "ADD A REAL DATE"}</small></div>)}</div>}
        {path === "/skills" && <div className="skill-cloud">{["Research", "Identity", "Editorial", "Digital", "Systems", "Collaboration", "Accessibility", "Prototyping"].map(skill => <span key={skill}>{skill}</span>)}</div>}
        {path === "/toolkit" && <div className="toolkit-grid">{(locale === "ar" ? ["استكشاف", "تصميم", "النماذج", "التوثيق"] : ["Discovery", "Design", "Prototyping", "Documentation"]).map((item, index) => <div className="toolkit-card" key={item}><span>0{index + 1}</span><h2>{item}</h2><p>{locale === "ar" ? "أضف الأدوات التي تستخدمها فعلياً." : "Add the tools you actually use."}</p></div>)}</div>}
        <div className="info-page__end"><Link className="button button--primary" href={path === "/about" ? "/work" : "/contact"}>{path === "/about" ? t("explore") : t("sayHello")}<Arrow size={17} /></Link><DemoNote>{locale === "ar" ? "نص توضيحي — حدّثه بتفاصيلك الحقيقية قبل النشر." : "Sample copy — replace it with your real details before publishing."}</DemoNote></div>
      </div>
    </div>
  </div>;
}
