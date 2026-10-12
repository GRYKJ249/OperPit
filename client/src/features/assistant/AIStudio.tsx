import { useEffect, useState } from "react";
import { ArrowUpLeft, ArrowUpRight, Copy, LoaderCircle, Sparkles } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "../../contexts/LanguageContext";

type Interest = "programming" | "design" | "psychology" | "financial-literacy" | "learning";
const interests: Interest[] = ["programming", "design", "psychology", "financial-literacy", "learning"];

export function AIStudioPage() {
  const { locale } = useLanguage();
  const ar = locale === "ar";
  const [path] = useLocation();
  const [selected, setSelected] = useState<Interest[]>([]);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [type, setType] = useState("article");
  const [topic, setTopic] = useState("");
  const [result, setResult] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("folio-ai-interests") || "[]") as unknown;
      if (Array.isArray(saved)) setSelected(saved.filter((item): item is Interest => interests.includes(item as Interest)));
    } catch { /* Local personalization is optional. */ }
    setPreferencesLoaded(true);
  }, []);
  useEffect(() => {
    if (!preferencesLoaded) return;
    try { localStorage.setItem("folio-ai-interests", JSON.stringify(selected)); } catch { /* Keep preferences for this session only. */ }
  }, [selected, preferencesLoaded]);

  const toggleInterest = (value: Interest) => setSelected(current => current.includes(value) ? current.filter(item => item !== value) : [...current, value].slice(0, 5));
  const generate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!topic.trim() || pending) return;
    setPending(true); setError(""); setResult(""); setCopied(false);
    try {
      const request = `${type}: ${topic.trim()}`;
      const response = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "draft", message: request, locale: ar ? "ar" : "en", path, interests: selected }), signal: AbortSignal.timeout(25_000) });
      const payload = await response.json() as { reply?: string; error?: string };
      if (!response.ok || typeof payload.reply !== "string") throw new Error(payload.error || "assistant_unavailable");
      setResult(payload.reply.slice(0, 5000));
    } catch { setError(ar ? "تعذّر إنشاء المسودة. جرّب بعد قليل." : "The draft could not be created. Please try again shortly."); }
    finally { setPending(false); }
  };

  const labels: Record<Interest, { ar: string; en: string }> = {
    programming: { ar: "البرمجة", en: "Programming" }, design: { ar: "التصميم", en: "Design" },
    psychology: { ar: "علم النفس العام", en: "Everyday psychology" }, "financial-literacy": { ar: "الثقافة المالية", en: "Financial literacy" }, learning: { ar: "التعلّم", en: "Learning" },
  };
  const Arrow = ar ? ArrowUpLeft : ArrowUpRight;
  return <div className="page-width section-space ai-studio" dir={locale === "ar" || locale === "ur" ? "rtl" : "ltr"}>
    <div className="page-intro"><p className="eyebrow"><Sparkles size={14} />{ar ? "مختبر الأرشيف الذكي" : "THE ARCHIVE AI STUDIO"}</p><h1>{ar ? "من سؤال صغير إلى مسودة قابلة للبناء." : "Turn a small question into a useful draft."}</h1><p className="page-intro__lead">{ar ? "اكتب مخطط مقال أو صفحة أو فكرة مشروع، ثم عدّل الناتج وانقله بنفسك. المساعد لا ينشر ولا يغيّر ملفات الموقع ولا يشغّل أي كود." : "Draft an article, page outline, or project idea, then edit and export it yourself. The assistant does not publish, change site files, or run code."}</p></div>
    <div className="ai-studio__layout">
      <form className="ai-studio__form" onSubmit={generate}>
        <label><span>{ar ? "نوع المسودة" : "Draft type"}</span><select value={type} onChange={event => setType(event.target.value)}><option value="article">{ar ? "مقال" : "Article"}</option><option value="page">{ar ? "صفحة موقع" : "Website page"}</option><option value="project">{ar ? "فكرة مشروع" : "Project concept"}</option><option value="outline">{ar ? "مخطط وعناوين" : "Outline"}</option><option value="summary">{ar ? "تلخيص" : "Summary"}</option></select></label>
        <label><span>{ar ? "عن ماذا؟" : "What should it cover?"}</span><textarea value={topic} onChange={event => setTopic(event.target.value.slice(0, 1200))} maxLength={1200} rows={6} placeholder={ar ? "مثال: مقال مبسّط عن كيف تساعد تسمية المتغيرات الواضحة على قراءة الكود…" : "Example: A clear introduction to how good variable names make code easier to read…"} required /></label>
        <div className="ai-interest-panel"><strong>{ar ? "مواضيع تهمني (محلياً)" : "My interests (stored locally)"}</strong><p>{ar ? "تُحفظ في هذا المتصفح فقط لتخصيص الاقتراحات. لا تُستخدم لتدريب نموذج ويمكن مسحها بتبديلها." : "Saved only in this browser to personalize suggestions. Not used to train a model; clear by deselecting."}</p><div className="interest-chips">{interests.map(item => <button key={item} type="button" aria-pressed={selected.includes(item)} onClick={() => toggleInterest(item)}>{labels[item][ar ? "ar" : "en"]}</button>)}</div></div>
        {error && <p className="ai-error" role="alert">{error}</p>}
        <button className="button button--primary" type="submit" disabled={pending || !topic.trim()}>{pending ? <LoaderCircle className="spin" size={16} /> : <Sparkles size={16} />}{pending ? (ar ? "يكتب المسودة…" : "Drafting…") : (ar ? "أنشئ مسودة" : "Create a draft")}</button>
        <p className="fine-print">{ar ? "مسودات الذكاء الاصطناعي قد تخطئ. تحقق من الحقائق قبل استخدامها." : "AI drafts can be wrong. Verify facts before using them."}</p>
      </form>
      <section className="ai-studio__output" aria-live="polite"><div className="ai-studio__output-head"><div><p className="eyebrow">{ar ? "مساحة العمل" : "WORKSPACE"}</p><h2>{result ? (ar ? "مسودتك" : "Your draft") : (ar ? "الناتج سيظهر هنا" : "Your draft will appear here")}</h2></div>{result && <button className="button button--quiet" onClick={async () => { try { await navigator.clipboard.writeText(result); setCopied(true); } catch { setError(ar ? "تعذر النسخ من هذا المتصفح." : "Clipboard access is unavailable in this browser."); } }}><Copy size={15} />{copied ? (ar ? "نُسخت" : "Copied") : (ar ? "انسخ النص" : "Copy text")}</button>}</div>
        {result ? <pre className="ai-studio__draft">{result}</pre> : <div className="ai-studio__placeholder"><Sparkles size={30} /><p>{ar ? "اختر نوعاً واكتب فكرة. هذه المساحة محلية في الجلسة ولا تنشر شيئاً." : "Choose a format and describe an idea. This workspace is session-only and never publishes anything."}</p><Link href="/daily" className="text-link">{ar ? "تصفّح موجز اليوم" : "Explore today's issue"}<Arrow size={14} /></Link></div>}
      </section>
    </div>
  </div>;
}
