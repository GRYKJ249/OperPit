import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, ArrowUpRight } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "../../contexts/LanguageContext";
import { getSearchIndex, rankSearch } from "../../lib/search";
import { setCouncilSession } from "../council/session";

export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { locale, t } = useLanguage();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [portalStatus, setPortalStatus] = useState<"idle" | "checking" | "rejected" | "unavailable">("idle");
  const [, setLocation] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const portalQuery = /^(?:!shura|@council)(?:\s|$)/i.test(query.trim());
  const results = useMemo(() => portalQuery ? [] : rankSearch(query, getSearchIndex(locale), 8), [query, locale, portalQuery]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setPortalStatus("idle");
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.clearTimeout(timer); document.body.style.overflow = previous; };
  }, [open]);

  useEffect(() => { setActiveIndex(0); }, [query, locale]);

  if (!open) return null;
  const trapFocus = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
    if (event.key !== "Tab") return;
    const focusable = modalRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), a[href]');
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  const choose = (href: string) => { setLocation(href); onClose(); };
  const enterCouncil = async (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" || !portalQuery) return;
    event.preventDefault();
    const code = query.trim().replace(/^(?:!shura|@council)\s*/i, "").trim();
    if (!code || code.length > 128 || portalStatus === "checking") { setPortalStatus("rejected"); return; }
    setPortalStatus("checking");
    try {
      const response = await fetch("/api/council/unlock", {
        method: "POST", headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        credentials: "same-origin", body: JSON.stringify({ code }),
      });
      const payload = await response.json().catch(() => null) as { token?: unknown; expiresAt?: unknown } | null;
      setQuery("");
      if (response.ok && typeof payload?.token === "string") {
        setCouncilSession(payload.token, typeof payload.expiresAt === "string" ? payload.expiresAt : undefined);
        setPortalStatus("idle"); setLocation("/council"); onClose(); return;
      }
      setPortalStatus(response.status === 503 ? "unavailable" : "rejected");
    } catch {
      setQuery(""); setPortalStatus("unavailable");
    }
  };
  const navigateResults = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && portalQuery) { void enterCouncil(event); return; }
    if ((event.key === "ArrowDown" || event.key === "ArrowUp") && results.length) {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex(index => (index + step + results.length) % results.length);
    } else if (event.key === "Enter" && results[activeIndex]) {
      event.preventDefault();
      choose(results[activeIndex].href);
    }
  };

  return <div className="overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="search-dialog" role="dialog" aria-modal="true" aria-labelledby="search-title" onKeyDown={trapFocus} ref={modalRef}>
      <h2 id="search-title" className="sr-only">{t("search")}</h2>
      <div className="search-dialog__input-wrap"><Search size={19} aria-hidden="true" /><input ref={inputRef} type={portalQuery ? "password" : "search"} autoComplete="off" spellCheck={false} maxLength={220} value={query} onChange={event => { setQuery(event.target.value); setPortalStatus("idle"); }} onKeyDown={navigateResults} aria-activedescendant={results[activeIndex] ? `search-result-${activeIndex}` : undefined} placeholder={portalQuery ? (locale === "ar" ? "أدخل الشفرة السرية ثم Enter" : "Enter the secret code, then press Enter") : t("searchHint")} aria-label={portalQuery ? (locale === "ar" ? "الشفرة السرية لغرفة الشورى" : "Secret council access code") : t("search")} /><kbd>ESC</kbd><button className="icon-button" onClick={onClose} aria-label={t("close")}><X size={19} /></button></div>
      {portalQuery && <p className="council-portal-status" aria-live="polite">{portalStatus === "checking" ? (locale === "ar" ? "جارٍ التحقق…" : "Checking…") : portalStatus === "rejected" ? (locale === "ar" ? "لم تُقبل الشفرة." : "The code was not accepted.") : portalStatus === "unavailable" ? (locale === "ar" ? "البوابة غير مهيأة أو غير متاحة." : "The portal is not configured or is unavailable.") : (locale === "ar" ? "البوابة خاصة؛ لا تُدرج الشفرة في رابط أو رسالة عامة." : "Private portal. Never put the code in a URL or public message.")}</p>}
      <div className="search-dialog__results" role="listbox" aria-label={t("search")}>
        {results.length ? results.map((item, index) => <Link id={`search-result-${index}`} href={item.href} className={`search-result ${index === activeIndex ? "is-active" : ""}`} key={`${item.href}-${index}`} onClick={() => choose(item.href)} role="option" aria-selected={index === activeIndex}>
          {item.image ? <img src={item.image} alt="" loading="lazy" /> : <span className="search-result__fallback">↗</span>}
          <span className="search-result__copy"><small>{item.kind}</small><strong>{item.title}</strong><span>{item.description}</span></span><ArrowUpRight size={17} aria-hidden="true" />
        </Link>) : <p className="search-dialog__empty">{t("searchEmpty")}</p>}
      </div>
      <p className="search-dialog__foot"><span>{locale === "ar" ? "للتنقل" : "Navigate"} <kbd>↑</kbd><kbd>↓</kbd></span><span>{locale === "ar" ? "للاختيار" : "Open"} <kbd>↵</kbd></span><span>{locale === "ar" ? "للإغلاق" : "Close"} <kbd>ESC</kbd></span></p>
    </section>
  </div>;
}
