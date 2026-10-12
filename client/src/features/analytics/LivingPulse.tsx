import { useEffect, useState } from "react";
import { Activity, ArrowUpRight, ShieldCheck } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

type Pulse = { status: "active" | "quiet" | "warming"; visitors: number | null; views: number | null; activeDays: number; topRoutes: { route: string; sessions: number }[]; asOf: string };

export function LivingPulse() {
  const { locale } = useLanguage();
  const ar = locale === "ar";
  const [pulse, setPulse] = useState<Pulse | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/analytics/pulse", { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("pulse_unavailable");
        return await response.json() as Pulse;
      })
      .then(setPulse)
      .catch(error => { if (!(error instanceof Error && error.name === "AbortError")) setPulse(null); });
    return () => controller.abort();
  }, []);

  const value = (count: number | null | undefined) => count === null || count === undefined ? "—" : count.toLocaleString(locale);
  const status = pulse?.status === "active" ? (ar ? "يتنفس" : "IN MOTION") : pulse?.status === "quiet" ? (ar ? "ينمو بهدوء" : "GROWING QUIETLY") : (ar ? "ينبض" : "WARMING UP");
  return <section className="organism-pulse page-width" aria-labelledby="organism-pulse-title">
    <div className="organism-pulse__intro"><p className="eyebrow"><Activity size={15} />{ar ? "الإشارات الحية · خصوصية أولاً" : "LIVE SIGNALS · PRIVACY FIRST"}</p><h2 id="organism-pulse-title">{ar ? "الموقع يتكيّف، لا يتطفّل." : "The site adapts, not intrudes."}</h2><p>{ar ? "يعرض الموقع عدّادات مجمّعة فقط؛ لا يحفظ نص الأسئلة أو هويات الزوار." : "Only aggregated counts are shown. Visitor identities and question text are not stored in this view."}</p><span className={`organism-pulse__state ${pulse?.status === "active" ? "is-active" : ""}`}><i />{status}</span></div>
    <div className="organism-pulse__metrics"><div><span>{ar ? "زيارات مجمّعة" : "AGGREGATE VISITS"}</span><strong>{value(pulse?.views)}</strong></div><div><span>{ar ? "جلسات مجهولة" : "ANONYMOUS SESSIONS"}</span><strong>{value(pulse?.visitors)}</strong></div><div><span>{ar ? "أيام نشطة · 7 أيام" : "ACTIVE DAYS · 7D"}</span><strong>{value(pulse?.activeDays)}</strong></div></div>
    <div className="organism-pulse__foot"><span><ShieldCheck size={14} />{ar ? "إخفاء الأرقام الصغيرة يحمي الخصوصية" : "Small cohorts are hidden to protect privacy"}</span><a href="/privacy">{ar ? "سياسة الخصوصية" : "Privacy policy"}<ArrowUpRight size={13} /></a></div>
  </section>;
}
