import { ArrowUpLeft, ArrowUpRight, Compass } from "lucide-react";
import { Link } from "wouter";
import { useLanguage } from "../contexts/LanguageContext";

export default function NotFound() {
  const { locale, t } = useLanguage();
  const Arrow = locale === "ar" ? ArrowUpLeft : ArrowUpRight;
  return <section className="not-found page-width">
    <div className="not-found__index">404 <span>— {locale === "ar" ? "خارج الفهرس" : "OFF INDEX"}</span></div>
    <div className="not-found__mark"><Compass size={56} strokeWidth={1.2} /><span>?</span></div>
    <p className="eyebrow">{locale === "ar" ? "الرابط يحتاج مراجعة" : "THE ROUTE NEEDS A SECOND LOOK"}</p>
    <h1>{t("notFound")}</h1><p className="page-intro__lead">{t("notFoundBody")}</p>
    <Link className="button button--primary" href="/">{t("backHome")}<Arrow size={17} /></Link>
  </section>;
}
