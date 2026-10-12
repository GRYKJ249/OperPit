import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { CalendarDays, Check, ChevronLeft, Clock3, LockKeyhole, MessageCircle, Pin, RefreshCw, Send, ShieldCheck, Sparkles, Star, Users, Vote, X, Zap } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { clearCouncilSession, getCouncilSession } from "./session";

type Member = { id: string; label: string; status: string; configuredKeyCount: number; lastSuccessAt: string | null; lastSafeError: string | null; frozenUntil: string | null };
type CouncilMessage = { id: number | string; sequence: number; providerId: string; role: string; ideaId: string | null; body: string | null; createdAt: string };
type CouncilPoll = { id: number; question: string | null; options: string | null; result: string | null; status: "open" | "closed"; closesAt: string | null };
type CouncilState = {
  run: { id: number; date: string; topic: string; status: string; groupName: string; theme: string; facilitator: string | null; winner: string | null; summary: string | null; dissent: string | null } | null;
  messages: CouncilMessage[];
  pins: { id: number; body: string | null; pinnedBy: string; createdAt: string }[];
  polls: CouncilPoll[];
  providers: Member[];
};

const names: Record<string, string> = { manus: "Manus AI", openai: "ChatGPT", gemini: "Gemini", deepseek: "DeepSeek", groq: "Llama · Groq", "human-admin": "أنت · الإدارة" };
const initialState: CouncilState = { run: null, messages: [], pins: [], polls: [], providers: [] };
const safeErrorText = (locale: string, code: string) => {
  if (code === "council_database_unavailable" || code === "council_state_unavailable") return locale === "ar" ? "قاعدة البيانات غير متاحة حالياً. بقيت بقية صفحات الموقع تعمل." : "The council database is unavailable. The rest of the site remains available.";
  if (code === "no_ai_members_configured" || code === "needs_two_configured_members") return locale === "ar" ? "لا توجد حالياً نماذج كافية مهيأة بمفاتيح فعلية للجلسة." : "There are not enough AI providers configured with real keys for a meeting.";
  if (code === "council_session_required") return locale === "ar" ? "انتهت الجلسة؛ افتح البحث وأدخل الشفرة السرية مجدداً." : "Your session expired. Reopen search and enter the secret code again.";
  if (code === "too_many_attempts") return locale === "ar" ? "محاولات كثيرة. انتظر قليلاً قبل إعادة الدخول." : "Too many attempts. Wait before trying again.";
  return locale === "ar" ? "تعذر إكمال الطلب الآن. حاول مرة أخرى لاحقاً." : "That action is temporarily unavailable. Try again later.";
};

function readJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}
function timeLabel(value: string, locale: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "" : new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", { hour: "2-digit", minute: "2-digit" }).format(date);
}

export default function CouncilRoom() {
  const { locale } = useLanguage();
  const ar = locale === "ar";
  const [token, setToken] = useState<string | null>(() => getCouncilSession());
  const [state, setState] = useState<CouncilState>(initialState);
  const [loading, setLoading] = useState(Boolean(token));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState("");
  const [topic, setTopic] = useState("");
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState("");
  const [showPollForm, setShowPollForm] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [optimistic, setOptimistic] = useState<CouncilMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const displayMessages = useMemo(() => [...state.messages, ...optimistic], [state.messages, optimistic]);

  const loadState = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch("/api/council/state", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", credentials: "same-origin" });
      if (response.status === 401) {
        clearCouncilSession(); setToken(null); setError(safeErrorText(locale, "council_session_required")); return;
      }
      const payload = await response.json().catch(() => null) as (CouncilState & { error?: string }) | null;
      if (!response.ok || !payload) { setError(safeErrorText(locale, payload?.error ?? "council_state_unavailable")); return; }
      setState(payload); setError(""); setOptimistic([]);
    } catch { setError(safeErrorText(locale, "council_state_unavailable")); }
    finally { setLoading(false); }
  }, [locale, token]);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    void loadState();
    const timer = window.setInterval(() => { void loadState(); }, 30_000);
    return () => window.clearInterval(timer);
  }, [loadState, token]);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [displayMessages.length]);

  const sendAction = useCallback(async (path: string, body: Record<string, unknown> = {}) => {
    if (!token) throw new Error("council_session_required");
    const response = await fetch(`/api/council/${path}`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      credentials: "same-origin", cache: "no-store", body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => null) as { error?: string; success?: boolean; status?: string; replies?: { provider: string; label: string; content: string; status: string }[]; winner?: string; tools?: string[] } | null;
    if (response.status === 401) { clearCouncilSession(); setToken(null); throw new Error("council_session_required"); }
    if (!response.ok || !payload) throw new Error(payload?.error ?? "council_action_unavailable");
    return payload;
  }, [token]);

  const sendChat = async (event: FormEvent) => {
    event.preventDefault();
    const prompt = draft.trim();
    if (!prompt || busy || !token) return;
    const messageId = Date.now();
    setDraft(""); setBusy(true); setError(""); setNotice("");
    setOptimistic([{ id: messageId, sequence: displayMessages.length + 1, providerId: "human-admin", role: "admin", ideaId: null, body: prompt, createdAt: new Date().toISOString() }]);
    try {
      const history = displayMessages.slice(-6).flatMap(message => message.body ? [{ role: message.role === "admin" ? "user" : "assistant", content: message.body }] : []);
      const result = await sendAction("chat", { prompt, history });
      const replies = result.replies ?? [];
      setOptimistic(current => [...current, ...replies.map((reply, index) => ({ id: `${messageId}-${index}`, sequence: current.length + index + 2, providerId: reply.provider, role: "reply", ideaId: null, body: reply.content, createdAt: new Date().toISOString() }))]);
      const toolNames = (result.tools ?? []).map(id => ({
        site_capabilities: ar ? "قدرات الموقع" : "site capabilities",
        ai_provider_status: ar ? "حالة النماذج" : "provider status",
        daily_public_feed: ar ? "الموجز العام" : "public feed",
        privacy_safe_analytics: ar ? "إحصاءات مجهلة" : "anonymous analytics",
      }[id] ?? id));
      setNotice(ar ? `${replies.length} ردّ · أدوات قراءة: ${toolNames.join("، ")}` : `${replies.length} replies · read tools: ${toolNames.join(", ")}`);
      await loadState();
    } catch (cause) { setError(safeErrorText(locale, cause instanceof Error ? cause.message : "council_chat_unavailable")); }
    finally { setBusy(false); }
  };

  const runMeeting = async () => {
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await sendAction("meeting", topic.trim() ? { topic: topic.trim() } : {});
      setNotice(result.status === "completed" ? (ar ? "اكتمل اجتماع اليوم." : "Today's meeting is complete.") : (ar ? `حالة الجلسة: ${result.status}` : `Meeting status: ${result.status}`));
      setTopic(""); await loadState();
    } catch (cause) { setError(safeErrorText(locale, cause instanceof Error ? cause.message : "council_meeting_unavailable")); }
    finally { setBusy(false); }
  };

  const createPoll = async (event: FormEvent) => {
    event.preventDefault();
    const options = pollOptions.split("\n").map(item => item.trim()).filter(Boolean).slice(0, 6);
    setBusy(true); setError("");
    try {
      await sendAction("polls", { question: pollQuestion.trim(), options });
      setNotice(ar ? "أُنشئ الاستطلاع الخاص." : "Private poll created.");
      setPollQuestion(""); setPollOptions(""); setShowPollForm(false); await loadState();
    } catch (cause) { setError(safeErrorText(locale, cause instanceof Error ? cause.message : "poll_create_failed")); }
    finally { setBusy(false); }
  };

  const runPoll = async (pollId: number) => {
    setBusy(true); setError("");
    try { await sendAction(`polls/${pollId}/run`); setNotice(ar ? "أُغلِق الاستطلاع وحُفظت النتيجة." : "Poll closed and result saved."); await loadState(); }
    catch (cause) { setError(safeErrorText(locale, cause instanceof Error ? cause.message : "poll_run_failed")); }
    finally { setBusy(false); }
  };

  const memberAction = async (member: Member) => {
    setBusy(true); setError("");
    try {
      await sendAction(`providers/${member.id}/${member.status === "frozen" ? "resume" : "freeze"}`);
      setNotice(member.status === "frozen" ? (ar ? "أُعيد النموذج إلى المجموعة." : "Provider returned to the group.") : (ar ? "جُمّد النموذج 24 ساعة." : "Provider frozen for 24 hours."));
      await loadState();
    } catch (cause) { setError(safeErrorText(locale, cause instanceof Error ? cause.message : "provider_update_failed")); }
    finally { setBusy(false); }
  };

  const pinMessage = async (message: CouncilMessage) => {
    if (typeof message.id !== "number") return;
    setBusy(true); setError("");
    try { await sendAction("pins", { messageId: message.id }); setNotice(ar ? "ثُبّتت الرسالة في أعلى المجموعة." : "Message pinned to the group."); await loadState(); }
    catch (cause) { setError(safeErrorText(locale, cause instanceof Error ? cause.message : "pin_failed")); }
    finally { setBusy(false); }
  };

  const override = async (message: CouncilMessage) => {
    if (!state.run || !message.ideaId) return;
    setBusy(true); setError("");
    try { await sendAction("override", { runId: state.run.id, ideaId: message.ideaId }); setNotice(ar ? "اعتمدت الإدارة هذا المقترح بقرارٍ مباشر." : "Administrator override recorded."); await loadState(); }
    catch (cause) { setError(safeErrorText(locale, cause instanceof Error ? cause.message : "override_failed")); }
    finally { setBusy(false); }
  };

  if (!token) return <section className="council-page page-width" dir={ar ? "rtl" : "ltr"}><div className="council-locked"><span className="council-lock-icon"><LockKeyhole size={25} /></span><p className="eyebrow">{ar ? "بوابة خاصة · لا تسجيل دخول تقليدي" : "PRIVATE PORTAL · NO PUBLIC LOGIN"}</p><h1>{ar ? "هذه المساحة ليست جزءاً من الأرشيف العام." : "This room is outside the public archive."}</h1><p>{ar ? "افتح البحث واكتب الأمر السري متبوعاً بالشفرة. لا تضع الشفرة في رابط أو رسالة عامة." : "Open search and enter the secret command followed by your code. Never put the code in a URL or public message."}</p><button className="button button--primary" onClick={() => window.dispatchEvent(new CustomEvent("folio:open-search"))}>{ar ? "فتح بوابة البحث" : "Open search portal"}<ChevronLeft size={16} /></button></div></section>;

  const theme = state.run?.theme ?? "cobalt";
  return <section className="council-page page-width" dir={ar ? "rtl" : "ltr"}>
    <div className={`council-room council-room--${theme}`}>
      <aside className="council-sidebar">
        <div className="council-sidebar__top"><span className="council-emblem"><Sparkles size={17} /></span><div><strong>{ar ? "مجلس الفكرة" : "The Idea Council"}</strong><small>{ar ? "نظام داخلي · وصول خاص" : "PRIVATE OPERATIONS"}</small></div></div>
        <div className="council-sidebar__section"><span className="council-side-label">{ar ? "مساحة العمل" : "WORKSPACE"}</span><button className="council-thread is-active"><span className="council-thread__icon"><MessageCircle size={16} /></span><span><strong>{state.run?.groupName ?? (ar ? "مجلس الفكرة" : "Idea Council")}</strong><small>{state.run?.topic ?? (ar ? "لا يوجد اجتماع محفوظ بعد" : "No saved meeting yet")}</small></span><i /></button></div>
        <div className="council-sidebar__section council-sidebar__status"><span className="council-side-label">{ar ? "الأعضاء المتصلون" : "MODEL ROSTER"}<span>{state.providers.length}</span></span>{state.providers.map(member => <div className="council-mini-member" key={member.id}><span className={`council-presence council-presence--${member.status}`} /><span>{member.label || names[member.id] || member.id}</span><small>{member.status === "active" ? (ar ? "نشط" : "ACTIVE") : member.status === "configured_unchecked" ? (ar ? "مُهيأ" : "READY") : member.status === "frozen" ? (ar ? "مجمّد" : "FROZEN") : (ar ? "يحتاج مفتاحاً" : "NEEDS KEY")}</small></div>)}</div>
        <div className="council-sidebar__bottom"><ShieldCheck size={15} /><span>{ar ? "المحادثات مشفرة خادمياً. لا تُعرض سلسلة التفكير." : "Server-encrypted messages. Private reasoning stays hidden."}</span></div>
      </aside>

      <div className="council-main">
        <header className="council-chat-header">
          <button className="council-group-trigger" onClick={() => setShowGroupInfo(true)} aria-label={ar ? "معلومات المجموعة" : "Group information"}><span className="council-avatar-stack"><i>G</i><i>D</i><i>M</i></span><span><strong>{state.run?.groupName ?? (ar ? "مجلس الفكرة" : "Idea Council")}</strong><small>{state.providers.length} {ar ? "أعضاء · اضغط لعرض التفاصيل" : "members · click for details"}</small></span></button>
          <div className="council-chat-actions"><span className="council-live-label"><i />{ar ? "قناة خاصة" : "PRIVATE CHANNEL"}</span><button className="icon-button" onClick={() => void loadState()} title={ar ? "تحديث" : "Refresh"} aria-label={ar ? "تحديث" : "Refresh"}><RefreshCw size={16} /></button><button className="icon-button" onClick={() => { clearCouncilSession(); setToken(null); }} title={ar ? "إنهاء الجلسة" : "Lock room"} aria-label={ar ? "إنهاء الجلسة" : "Lock room"}><LockKeyhole size={16} /></button></div>
        </header>

        <aside className="council-tool-access"><div className="council-tool-access__lead"><ShieldCheck size={15} /><p>{ar ? "أعضاء المجلس يطّلعون على قدرات الموقع وحالة النماذج؛ وتُستدعى العناوين العامة أو التحليلات المجهلة عند الحاجة." : "Council members receive the site capability index and provider status; public headlines or anonymous analytics are added when relevant."}</p></div><details><summary>{ar ? "حدود الوصول" : "Access boundaries"}</summary><p>{ar ? "القراءة فقط: لا أسرار أو هويات زوار أو تعليقات أو مستودعات خاصة. إجراءات الإدارة والتغييرات لا تنفذ إلا عبر أدوات المسؤول." : "Read-only: no secrets, visitor identities, comments, or private repositories. Admin actions and site changes stay behind owner controls."}</p></details></aside>

        <div className="council-chat-scroll" ref={scrollRef}>
          <div className="council-date-divider"><span>{ar ? "غرفة الشورى · محاضر مشفرة" : "COUNCIL ROOM · ENCRYPTED MINUTES"}</span></div>
          {state.pins[0]?.body && <div className="council-pinned"><Pin size={15} /><div><small>{ar ? "رسالة مثبتة" : "PINNED MESSAGE"}</small><p>{state.pins[0].body}</p></div></div>}
          {state.run && <div className="council-session-card"><div className="council-session-card__top"><span><CalendarDays size={14} />{state.run.date}</span><span className={`council-run-status council-run-status--${state.run.status}`}>{state.run.status === "completed" ? (ar ? "مكتمل" : "COMPLETED") : state.run.status === "running" ? (ar ? "جارٍ" : "RUNNING") : (ar ? "متعثر" : "FAILED")}</span></div><p>{state.run.topic}</p>{state.run.summary && <small>{state.run.summary}</small>}{state.run.dissent && <details><summary>{ar ? "سجل الأفكار الأخرى" : "Dissent log"}</summary><p>{state.run.dissent}</p></details>}</div>}
          {loading && <div className="council-room-empty"><RefreshCw size={20} className="council-spin" /><p>{ar ? "جارٍ فتح المحاضر المشفرة…" : "Opening encrypted minutes…"}</p></div>}
          {!loading && displayMessages.length === 0 && <div className="council-room-empty"><Users size={22} /><p>{ar ? "المجموعة جاهزة. ابدأ محادثة أو اعقد اجتماع اليوم." : "The room is ready. Start a conversation or convene today's meeting."}</p></div>}
          {displayMessages.map((message, index) => {
            const isAdmin = message.role === "admin";
            const isSystem = message.role === "system";
            const providerName = names[message.providerId] ?? state.providers.find(member => member.id === message.providerId)?.label ?? message.providerId;
            return <article key={`${message.id}-${index}`} className={`council-message ${isAdmin ? "council-message--admin" : isSystem ? "council-message--system" : "council-message--member"}`}>
              {!isAdmin && <span className={`council-message-avatar council-message-avatar--${message.providerId}`}>{providerName.slice(0, 1)}</span>}
              <div className="council-bubble"><div className="council-bubble__meta"><strong>{providerName}</strong><time>{timeLabel(message.createdAt, locale)}</time></div><p>{message.body ?? (ar ? "تعذر فك هذه الرسالة." : "This message could not be decrypted.")}</p>
                {message.role === "proposal" && <span className="council-proposal-tag"><Star size={12} />{ar ? "مقترح مجهول الهوية قبل التصويت" : "ANONYMOUS PROPOSAL"}</span>}
                {isAdmin && <span className="council-read-receipt"><Check size={12} /><Check size={12} />{ar ? "وصلت إلى أعضاء المجلس" : "DELIVERED TO THE COUNCIL"}</span>}
                {message.role === "proposal" && message.ideaId && <div className="council-message-controls"><button disabled={busy} onClick={() => void override(message)}><Zap size={12} />{ar ? "اعتماد بقرار إداري" : "Admin override"}</button><button disabled={busy || typeof message.id !== "number"} onClick={() => void pinMessage(message)}><Pin size={12} />{ar ? "تثبيت" : "Pin"}</button></div>}
              </div>
            </article>;
          })}
          {state.polls.map(poll => {
            const options = readJson<string[]>(poll.options, []);
            const result = readJson<{ counts?: number[]; votes?: number } | null>(poll.result, null);
            return <div className="council-poll" key={poll.id}><div><Vote size={16} /><strong>{poll.question ?? (ar ? "استطلاع شورى" : "Council poll")}</strong></div>{options.map((option, index) => <div className="council-poll-option" key={`${poll.id}-${option}`}><span>{option}</span><span>{result?.counts?.[index] ?? "—"}{result ? (ar ? " صوت" : " votes") : ""}</span></div>)}<small>{poll.status === "open" ? (ar ? "مفتوح" : "OPEN") : (ar ? "أُغلق" : "CLOSED")}{poll.closesAt ? ` · ${new Date(poll.closesAt).toLocaleDateString(ar ? "ar" : "en")}` : ""}</small>{poll.status === "open" && <button disabled={busy} onClick={() => void runPoll(poll.id)}>{ar ? "إغلاق وتصويت النماذج" : "Close and collect model votes"}</button>}</div>;
          })}
        </div>

        {(error || notice) && <p className={`council-feedback ${error ? "is-error" : "is-success"}`} role="status">{error || notice}</p>}
        <form className="council-composer" onSubmit={sendChat}><textarea value={draft} onChange={event => setDraft(event.target.value)} maxLength={1200} rows={2} placeholder={ar ? "اكتب رسالة للمجلس… (حد 50 كلمة لكل نموذج)" : "Message the council… (50-word cap per model)"} aria-label={ar ? "رسالة للمجلس" : "Message the council"} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} /><span className="council-composer__hint"><ShieldCheck size={13} />{ar ? "لا بيانات حساسة · لا تنفيذ كود" : "No secrets · no code execution"}</span><button className="council-send" type="submit" disabled={busy || !draft.trim()} aria-label={busy ? (ar ? "جارٍ الإرسال" : "Sending") : (ar ? "إرسال" : "Send")}>{busy ? <RefreshCw size={17} className="council-spin" /> : <Send size={17} />}</button></form>

        <section className="council-admin-tools"><div className="council-admin-tools__title"><div><p className="eyebrow"><ShieldCheck size={13} />{ar ? "أدوات المسؤول" : "ADMINISTRATOR TOOLS"}</p><h2>{ar ? "اجتماع اليوم والاستطلاعات" : "Today's meeting & polls"}</h2></div><button className="button button--quiet" onClick={() => setShowPollForm(open => !open)}><Vote size={15} />{showPollForm ? (ar ? "إلغاء" : "Close") : (ar ? "استطلاع" : "New poll")}</button></div>
          <div className="council-meeting-controls"><label><span>{ar ? "موضوع الاجتماع (اختياري)" : "Meeting topic (optional)"}</span><input value={topic} maxLength={160} onChange={event => setTopic(event.target.value)} placeholder={ar ? "دع المجلس يختار موضوع اليوم…" : "Let the council choose today's topic…"} /></label><button className="button button--primary" disabled={busy} onClick={() => void runMeeting()}><CalendarDays size={15} />{ar ? "عقد اجتماع اليوم" : "Convene today's meeting"}</button></div>
          {showPollForm && <form className="council-poll-form" onSubmit={createPoll}><label>{ar ? "سؤال الاستطلاع" : "Poll question"}<input value={pollQuestion} onChange={event => setPollQuestion(event.target.value)} maxLength={180} required minLength={4} /></label><label>{ar ? "الخيارات — كل خيار في سطر (2–6)" : "Options — one per line (2–6)"}<textarea value={pollOptions} onChange={event => setPollOptions(event.target.value)} rows={4} required placeholder={ar ? "الخيار الأول\nالخيار الثاني" : "First option\nSecond option"} /></label><button className="button button--primary" disabled={busy}><Check size={15} />{ar ? "إنشاء الاستطلاع" : "Create poll"}</button></form>}
          <p className="council-admin-note"><Clock3 size={13} />{ar ? "التشغيل اليومي المجدول يحتاج قاعدة بيانات ومزودين مهيئين وجدولة منشورة. الرسائل لا تكشف سلسلة التفكير." : "Scheduled meetings require a database, configured providers, and a published scheduler. Internal reasoning is never shown."}</p>
        </section>
      </div>
    </div>

    {showGroupInfo && <div className="council-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setShowGroupInfo(false); }}><section className="council-group-info" role="dialog" aria-modal="true" aria-labelledby="council-group-info-title"><header><button className="icon-button" onClick={() => setShowGroupInfo(false)} aria-label={ar ? "إغلاق" : "Close"}><X size={18} /></button><h2 id="council-group-info-title">{ar ? "معلومات المجموعة" : "Group information"}</h2><span /></header><div className="council-group-info__identity"><span className="council-group-info__emblem"><Users size={25} /></span><h3>{state.run?.groupName ?? (ar ? "مجلس الفكرة" : "Idea Council")}</h3><p>{state.providers.length} {ar ? "أعضاء · يتغير الاسم بحسب تصويت الشورى" : "members · name follows the council vote"}</p></div><div className="council-group-info__section"><p className="eyebrow">{ar ? "الأعضاء وحالة الإعداد" : "MEMBERS & PROVIDER STATUS"}</p>{state.providers.map(member => <article className="council-member-card" key={member.id}><span className={`council-member-avatar council-member-avatar--${member.id}`}>{(member.label || names[member.id] || member.id).slice(0, 1)}</span><div><strong>{member.label || names[member.id] || member.id}</strong><small>{member.status === "active" ? (ar ? "نشط — استجاب مؤخراً" : "Active — recently responded") : member.status === "configured_unchecked" ? (ar ? "مهيأ — لم يُفحص بعد" : "Configured — not checked yet") : member.status === "cooldown" ? (ar ? "خامل مؤقتاً — حصة/اتصال" : "Temporarily idle — quota/connectivity") : member.status === "frozen" ? (ar ? "مجمّد إدارياً" : "Administratively frozen") : (ar ? "بحاجة إلى مفتاح" : "Needs an API key")}</small>{member.frozenUntil && <small>{ar ? "ينتهي التجميد: " : "Frozen until: "}{new Date(member.frozenUntil).toLocaleString(ar ? "ar" : "en")}</small>}</div><span className={`council-member-status council-member-status--${member.status}`}>{member.status === "active" ? (ar ? "نشط" : "ACTIVE") : member.status === "configured_unchecked" ? (ar ? "مهيأ" : "READY") : member.status === "frozen" ? (ar ? "مجمّد" : "FROZEN") : member.status === "cooldown" ? (ar ? "خامل" : "IDLE") : (ar ? "مفتاح" : "KEY")}</span><button disabled={busy || member.status === "needs_key"} onClick={() => void memberAction(member)}>{member.status === "frozen" ? (ar ? "استئناف" : "Resume") : (ar ? "تجميد 24س" : "Freeze 24h")}</button></article>)}</div><footer><ShieldCheck size={14} />{ar ? "حالة المفتاح فقط — لا تُعرض قيم المفاتيح أو تفاصيلها." : "Key status only — key values and secrets are never displayed."}</footer></section></div>}
  </section>;
}
