import { ChevronDown } from "lucide-react";
import { Link } from "wouter";
import { useLanguage } from "../contexts/LanguageContext";
import { faqs, localize } from "../data/portfolio";
import { Breadcrumbs, PageIntro } from "../components/site/ContentComponents";

export default function FAQPage() {
  const { locale, t } = useLanguage();
  return <div className="page-width section-space faq-page">
    <Breadcrumbs locale={locale} items={[{ label: t("home"), href: "/" }, { label: t("faq") }]} />
    <PageIntro eyebrow={locale === "ar" ? "إجابات مختصرة · 08" : "QUICK ANSWERS · 08"} title={t("faqTitle")} description={locale === "ar" ? "تفاصيل عملية حول طريقة العمل والمحتوى التجريبي ووسائل التواصل." : "Practical notes on working together, sample content, and getting in touch."} locale={locale} />
    <div className="faq-layout"><aside><span className="index-number">FAQ / 08</span><p>{locale === "ar" ? "ما زال لديك سؤال؟" : "Still have a question?"}</p><Link className="text-link" href="/contact">{t("contact")}<span aria-hidden="true">↗</span></Link></aside><div className="faq-list">{faqs.map((item, index) => <details className="faq-item" key={index} open={index === 0}><summary><span className="faq-item__index">0{index + 1}</span><span>{localize(item.question, locale)}</span><ChevronDown size={18} /></summary><div className="faq-item__answer"><p>{localize(item.answer, locale)}</p></div></details>)}</div></div>
  </div>;
}
