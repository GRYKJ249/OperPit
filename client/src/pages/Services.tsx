import { ArrowUpLeft, ArrowUpRight, Check, Clock3, MessageSquareText } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "../contexts/LanguageContext";
import { localize, services, serviceBySlug } from "../data/portfolio";
import { Breadcrumbs, DemoNote, PageIntro } from "../components/site/ContentComponents";

export default function ServicesPage() {
  const { locale, t } = useLanguage();
  const [path] = useLocation();
  const slug = path.split("/").filter(Boolean)[1];
  const service = slug ? serviceBySlug(slug) : undefined;
  const Arrow = locale === "ar" ? ArrowUpLeft : ArrowUpRight;
  if (slug && !service) return <div className="page-width section-space"><h1>{t("notFound")}</h1><Link href="/services">{t("services")}</Link></div>;
  if (service) return <div className="page-width section-space service-detail">
    <Breadcrumbs locale={locale} items={[{ label: t("home"), href: "/" }, { label: t("services"), href: "/services" }, { label: localize(service.title, locale) }]} />
    <PageIntro eyebrow={t("serviceDetail")} title={localize(service.title, locale)} description={localize(service.short, locale)} locale={locale} />
    <div className="service-detail__grid"><section className="service-detail__main"><h2>{locale === "ar" ? "ما الذي يمكن أن يشمله العمل؟" : "What could the work include?"}</h2><p className="prose-lead">{localize(service.deliverables, locale)}</p><div className="service-deliverables">{service.tags.map((tag, index) => <div key={tag}><span>0{index + 1}</span><Check size={16} /><strong>{tag}</strong></div>)}</div><DemoNote>{locale === "ar" ? "أمثلة تحريرية للخدمة؛ حدّد المخرجات بعد الاتفاق على نطاق المشروع." : "Sample service framing; define deliverables after agreeing on project scope."}</DemoNote></section>
      <aside className="service-detail__aside"><div className="service-aside-card"><MessageSquareText size={20} /><h2>{locale === "ar" ? "طريقة التعاون" : "How collaboration works"}</h2><ol><li>{locale === "ar" ? "نبدأ بمحادثة عن الهدف والسياق." : "Start with a conversation about goal and context."}</li><li>{locale === "ar" ? "نحدد نطاقاً ومخرجات واضحة." : "Agree on scope and clear deliverables."}</li><li>{locale === "ar" ? "نبني ونراجع على مراحل." : "Make and review in stages."}</li></ol><p className="service-price-note">{locale === "ar" ? "التسعير: يحدد حسب نطاق المشروع." : "Pricing: set according to project scope."}</p><Link className="button button--primary button--full" href="/contact">{t("sayHello")}<Arrow size={16} /></Link></div></aside>
    </div>
    <section className="service-related"><h2>{locale === "ar" ? "خدمات أخرى في الأرشيف" : "More in the services archive"}</h2><div>{services.filter(item => item.slug !== service.slug).slice(0, 3).map(item => <Link href={`/services/${item.slug}`} key={item.slug}><span>{item.title[locale]}</span><Arrow size={16} /></Link>)}</div></section>
  </div>;

  return <div className="page-width section-space service-index">
    <Breadcrumbs locale={locale} items={[{ label: t("home"), href: "/" }, { label: t("services") }]} />
    <PageIntro eyebrow={locale === "ar" ? "فهرس الخدمات · 06" : "SERVICE INDEX · 06"} title={locale === "ar" ? "ست طرق لتحويل الفكرة إلى تجربة." : "Six ways to shape an idea into an experience."} description={locale === "ar" ? "مسارات مرنة؛ كل مشروع يحدد ما يحتاجه فعلاً." : "Flexible paths; each project defines what it actually needs."} locale={locale} />
    <div className="service-index__note"><Clock3 size={17} /><p>{locale === "ar" ? "النطاق والوقت والتكلفة تُحدد بعد فهم الفكرة؛ لا توجد أسعار أو وعود زمنية مختلقة." : "Scope, timing, and cost are set after understanding the idea; no invented prices or timelines."}</p></div>
    <div className="service-cards">{services.map((item, index) => <article className="service-card" key={item.slug}><span className="service-card__index">0{index + 1}</span><h2>{localize(item.title, locale)}</h2><p>{localize(item.short, locale)}</p><div className="service-card__tags">{item.tags.map(tag => <span key={tag}>{tag}</span>)}</div><Link className="text-link" href={`/services/${item.slug}`}>{locale === "ar" ? "افتح تفاصيل الخدمة" : "Explore this service"}<Arrow size={15} /></Link></article>)}</div>
  </div>;
}
