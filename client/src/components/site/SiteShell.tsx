import React, { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpRight, Command, Menu, Moon, Search, Sun, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useTheme } from "../../contexts/ThemeContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { profile, projects, articles, services, workCategories, journalTopics } from "../../data/portfolio";
import { SearchDialog } from "../../features/search/SearchDialog";
import { AssistantWidget } from "../../features/assistant/AssistantWidget";
import { SiteAmbient } from "./SiteAmbient";

function BrandMark() {
  return <span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 36 36" fill="none"><path d="M8 7.5h17.5v21H8z" stroke="currentColor" strokeWidth="1.5"/><path d="M12.5 4.5H29v21h-3.5" stroke="currentColor" strokeWidth="1.5"/><path d="M12.5 14h8M12.5 18h8M12.5 22h5" stroke="currentColor" strokeWidth="1.5"/><circle cx="26.8" cy="28" r="3.2" fill="var(--brand)"/></svg></span>;
}

function BackToTop() {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);
  useEffect(() => { const update = () => setVisible(window.scrollY > 700); update(); window.addEventListener("scroll", update, { passive: true }); return () => window.removeEventListener("scroll", update); }, []);
  if (!visible) return null;
  return <button className="back-top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label={t("backTop")}><ArrowUp size={17} /></button>;
}

export function SiteShell({ children }: { children: React.ReactNode }) {
  const { locale, toggleLocale, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [path] = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const count = projects.length + articles.length + services.length;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSearchOpen(true); }
    };
    const onSearchRequest = () => setSearchOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("folio:open-search", onSearchRequest);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("folio:open-search", onSearchRequest); };
  }, []);

  useEffect(() => { setMobileOpen(false); }, [path]);

  const nav = [
    { href: "/work", key: "work" as const },
    { href: "/services", key: "services" as const },
    { href: "/daily", key: "daily" as const },
    { href: "/github", key: "github" as const },
    { href: "/journal", key: "journal" as const },
    { href: "/about", key: "about" as const },
  ];

  return <>
    <a className="skip-link" href="#main-content">{t("skip")}</a>
    <div className="site-ribbon"><span className="site-ribbon__dot" /><span>{t("demoBadge")}</span><span className="site-ribbon__divider" />{locale === "ar" ? `${projects.length} مفهوم · ${articles.length} مقال · ${services.length} خدمة` : `${projects.length} concepts · ${articles.length} notes · ${services.length} services`}</div>
    <header className="site-header">
      <div className="site-header__inner page-width">
        <Link href="/" className="brand-lockup" aria-label={t("home")}><BrandMark /><span className="brand-lockup__name">{profile.name[locale]}<small>{locale === "ar" ? "فهرس شخصي" : "PERSONAL INDEX"}</small></span></Link>
        <nav className="desktop-nav" aria-label={locale === "ar" ? "التنقل الرئيسي" : "Main navigation"}>
          {nav.map(item => <Link key={item.href} href={item.href} className={path === item.href || (item.href !== "/" && path.startsWith(`${item.href}/`)) ? "is-active" : ""}>{t(item.key)}</Link>)}
        </nav>
        <div className="site-controls">
          <button className="header-search" onClick={() => setSearchOpen(true)} aria-label={t("searchOpen")}><Search size={17} /><span>{locale === "ar" ? "بحث" : "Search"}</span><kbd><Command size={10} /> K</kbd></button>
          <button className="icon-button language-toggle" onClick={toggleLocale} aria-label={t("language")} title={t("language")}>{locale === "ar" ? "EN" : "ع"}</button>
          <button className="icon-button theme-toggle" onClick={toggleTheme} aria-label={t("switchTheme")} title={t("switchTheme")}>{theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}</button>
          <button className="mobile-menu-button" onClick={() => setMobileOpen(open => !open)} aria-expanded={mobileOpen} aria-controls="mobile-navigation" aria-label={mobileOpen ? t("close") : t("menu")}>{mobileOpen ? <X size={22} /> : <Menu size={22} />}</button>
        </div>
      </div>
      {mobileOpen && <nav id="mobile-navigation" className="mobile-nav page-width" aria-label={locale === "ar" ? "التنقل" : "Navigation"}>{nav.map(item => <Link key={item.href} href={item.href}>{t(item.key)}<ArrowUpRight size={15} /></Link>)}<button onClick={() => { setSearchOpen(true); setMobileOpen(false); }}><Search size={16} />{t("search")}</button></nav>}
    </header>

    <main id="main-content" className="site-main">{children}</main>

    <footer className="site-footer">
      <div className="page-width">
        <div className="footer-top"><div className="footer-about"><Link href="/" className="brand-lockup"><BrandMark /><span className="brand-lockup__name">{profile.name[locale]}<small>{locale === "ar" ? "فهرس شخصي" : "PERSONAL INDEX"}</small></span></Link><p>{t("footerLine")}</p><span className="footer-status"><span className="site-ribbon__dot" />{t("availability")}</span></div>
          <div className="footer-column"><h2>{t("workArchive")}</h2><Link href="/work">{t("allWork")} <span>{projects.length}</span></Link>{workCategories.map(category => <Link key={category.slug} href={`/work/${category.slug}`}>{category.title[locale]}</Link>)}</div>
          <div className="footer-column"><h2>{t("journalArchive")}</h2><Link href="/journal">{t("viewAll")} <span>{articles.length}</span></Link>{journalTopics.map(topic => <Link key={topic.slug} href={`/journal/topics/${topic.slug}`}>{topic.title[locale]}</Link>)}</div>
          <div className="footer-column"><h2>{t("services")}</h2><Link href="/services">{t("viewAll")}</Link>{services.slice(0, 4).map(service => <Link key={service.slug} href={`/services/${service.slug}`}>{service.title[locale]}</Link>)}</div>
          <div className="footer-column"><h2>{locale === "ar" ? "مختبر الذكاء" : "AI workspace"}</h2><Link href="/ai-studio">{t("aiStudio")} <ArrowUpRight size={13} /></Link><Link href="/daily">{t("daily")}</Link><Link href="/github">{t("github")}</Link><Link href="/contact">{t("contact")}</Link></div>
        </div>
        <div className="footer-bottom"><span>© {new Date().getFullYear()} {locale === "ar" ? "مساحة شخصية قابلة للتخصيص" : "A customizable personal space"}</span><span>{locale === "ar" ? `${count} مادة تجريبية منظمة` : `${count} organized sample pieces`}</span><Link href="/faq">{t("faq")} <ArrowUpRight size={13} /></Link><Link href="/privacy">{locale === "ar" ? "الخصوصية" : "Privacy"}</Link><Link href="/community">{locale === "ar" ? "إرشادات المجتمع" : "Community"}</Link></div>
      </div>
    </footer>
    <AssistantWidget />
    <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    <SiteAmbient path={path} />
    <BackToTop />
  </>;
}
