import { Quote } from "lucide-react";
import { Link } from "wouter";
import { useLanguage } from "../contexts/LanguageContext";
import { localize } from "../data/portfolio";
import { Breadcrumbs, DemoNote, PageIntro } from "../components/site/ContentComponents";

export default function TestimonialsPage() {
  const { locale, t } = useLanguage();
  return <div className="page-width section-space testimonials-page">
    <Breadcrumbs locale={locale} items={[{ label: t("home"), href: "/" }, { label: t("testimonials") }]} />
    <PageIntro eyebrow={locale === "ar" ? "مساحة الثقة" : "TRUST & FEEDBACK"} title={locale === "ar" ? "الكلام عن التجربة يأتي من أصحابها." : "The people behind an experience should speak for it."} description={locale === "ar" ? "لا توجد شهادات منشورة في النموذج الحالي؛ أضف فقط آراء حقيقية بإذن أصحابها." : "No testimonials are published in this sample. Add real feedback only with its author's permission."} locale={locale} />
    <div className="testimonial-empty"><div className="testimonial-empty__icon"><Quote size={28} /></div><div><p className="eyebrow">{locale === "ar" ? "بانتظار المحتوى الحقيقي" : "WAITING FOR VERIFIED CONTENT"}</p><h2>{localize({ ar: "مكان مخصص لصوت عميل حقيقي.", en: "A place reserved for a real client's voice." }, locale)}</h2><p>{t("emptyQuotes")}</p><Link className="text-link" href="/contact">{t("sayHello")}<span aria-hidden="true">↗</span></Link></div><span className="testimonial-empty__index">— / 00</span></div>
    <div className="testimonial-slots" aria-label={locale === "ar" ? "أماكن لإضافة شهادات حقيقية" : "Slots for verified testimonials"}>{[1, 2, 3].map(slot => <div className="testimonial-slot" key={slot}><span>0{slot}</span><span>{locale === "ar" ? "تُضاف شهادة موثقة هنا" : "Add a verified testimonial here"}</span><span className="slot-line" /></div>)}</div>
    <DemoNote>{locale === "ar" ? "لم تُنشأ أسماء أو اقتباسات أو شعارات عملاء تخيلية." : "No fictional names, quotes, or client logos have been created."}</DemoNote>
  </div>;
}
