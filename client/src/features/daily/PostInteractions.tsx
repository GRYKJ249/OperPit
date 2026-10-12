import { useEffect, useState } from "react";
import { Eye, Heart, Lightbulb, MessageCircle, Send, Share2, Sparkles } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

export function getVisitorId() {
  try {
    const existing = window.localStorage.getItem("folio-visitor-id");
    if (existing && /^[A-Za-z0-9_-]{16,80}$/.test(existing)) return existing;
    const value = window.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem("folio-visitor-id", value);
    return value;
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  }
}

type Comment = { id: number; displayName: string; body: string; locale: "ar" | "en"; aiReaction?: "heart" | "thoughtful" | "thanks" | null; aiReplyAr?: string | null; aiReplyEn?: string | null; createdAt: string };
type Snapshot = { views: number; shares: number; reactions: { like: number; insightful: number; inspiring: number }; myReaction: string | null; comments: Comment[] };
const emptySnapshot: Snapshot = { views: 0, shares: 0, reactions: { like: 0, insightful: 0, inspiring: 0 }, myReaction: null, comments: [] };

export function PostInteractions({ slug }: { slug: string }) {
  const { locale } = useLanguage();
  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot);
  const [displayName, setDisplayName] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [visitorId, setVisitorId] = useState("");
  const copy = locale === "ar";

  useEffect(() => {
    const id = getVisitorId();
    setVisitorId(id);
    const load = async () => {
      try {
        await fetch(`/api/social/${encodeURIComponent(slug)}/metric`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitorId: id, kind: "view" }) });
        const response = await fetch(`/api/social/${encodeURIComponent(slug)}?visitorId=${encodeURIComponent(id)}`);
        if (response.ok) setSnapshot({ ...emptySnapshot, ...await response.json() as Snapshot });
      } catch { /* Engagement is optional; keep the post readable if the service is unavailable. */ }
    };
    void load();
  }, [slug]);

  const react = async (reaction: "like" | "insightful" | "inspiring") => {
    if (!visitorId || busy) return;
    setBusy(true); setNotice("");
    try {
      const response = await fetch(`/api/social/${encodeURIComponent(slug)}/reaction`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitorId, reaction: snapshot.myReaction === reaction ? null : reaction }) });
      if (!response.ok) throw new Error("reaction_failed");
      setSnapshot({ ...emptySnapshot, ...await response.json() as Snapshot });
    } catch { setNotice(copy ? "ما قدرت أحفظ تفاعلك الآن." : "Your reaction could not be saved right now."); }
    finally { setBusy(false); }
  };

  const share = async () => {
    const shareUrl = window.location.href;
    let shared = false;
    try {
      if (navigator.share) { await navigator.share({ title: document.title, url: shareUrl }); shared = true; }
      else if (navigator.clipboard) { await navigator.clipboard.writeText(shareUrl); shared = true; setNotice(copy ? "نُسخ رابط المنشور." : "Post link copied."); }
      else setNotice(copy ? "انسخ الرابط من شريط العنوان." : "Copy the link from your address bar.");
    } catch { /* The visitor may cancel the native share sheet. */ }
    if (shared && visitorId) {
      try { await fetch(`/api/social/${encodeURIComponent(slug)}/metric`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitorId, kind: "share" }) }); setSnapshot(current => ({ ...current, shares: current.shares + 1 })); }
      catch { /* Sharing itself succeeded; metric storage is best effort. */ }
    }
  };

  const submitComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!visitorId || busy) return;
    setBusy(true); setNotice("");
    try {
      const response = await fetch(`/api/social/${encodeURIComponent(slug)}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitorId, displayName, body, locale }) });
      const payload = await response.json() as { comment?: Comment; error?: string };
      if (!response.ok || !payload.comment) throw new Error(payload.error || "comment_failed");
      setSnapshot(current => ({ ...current, comments: [payload.comment!, ...current.comments] }));
      setDisplayName(""); setBody("");
      setNotice(copy ? "نُشر تعليقك." : "Your comment is now visible.");
    } catch (error) {
      const reason = error instanceof Error ? error.message : "";
      const messages: Record<string, { ar: string; en: string }> = {
        comment_personal_data_or_links: { ar: "احذف الروابط وأي بريد أو رقم هاتف قبل النشر.", en: "Remove links, email addresses, and phone numbers before posting." },
        comment_rate_limited: { ar: "وصلت لحد التعليقات مؤقتاً. حاول لاحقاً.", en: "You have reached the comment limit. Try again later." },
        comment_needs_revision: { ar: "عدّل التعليق ليركّز على الفكرة من دون محتوى مؤذٍ أو ترويج تداول.", en: "Please revise the comment to focus on the post without harmful content or trading promotion." },
        comment_hidden: { ar: "أخفى الإشراف الآلي التعليق لأنه خالف إرشادات المجتمع؛ لم يُعرض للزوار.", en: "The AI moderator hid this comment because it did not meet the community guidelines." },
        comment_moderation_unavailable: { ar: "الإشراف الذكي غير متاح مؤقتاً؛ لم نحفظ التعليق. جرّب لاحقاً.", en: "AI moderation is temporarily unavailable; the comment was not stored. Please try later." },
      };
      setNotice(messages[reason]?.[copy ? "ar" : "en"] ?? (copy ? "تعذّر نشر التعليق. حاول مرة أخرى." : "The comment could not be posted. Please try again."));
    } finally { setBusy(false); }
  };

  return <section className="post-interactions" aria-labelledby="discussion-title">
    <div className="post-interactions__bar">
      <div className="post-stats"><span><Eye size={15} />{snapshot.views}</span><span><Share2 size={15} />{snapshot.shares}</span><span><MessageCircle size={15} />{snapshot.comments.length}</span></div>
      <button className="button button--quiet" onClick={share}><Share2 size={16} />{copy ? "مشاركة" : "Share"}</button>
    </div>
    <div className="reaction-row" aria-label={copy ? "التفاعلات" : "Reactions"}>
      <button aria-pressed={snapshot.myReaction === "like"} disabled={busy} onClick={() => void react("like")}><Heart size={16} />{copy ? "أعجبني" : "Like"}<b>{snapshot.reactions.like}</b></button>
      <button aria-pressed={snapshot.myReaction === "insightful"} disabled={busy} onClick={() => void react("insightful")}><Lightbulb size={16} />{copy ? "مفيد" : "Useful"}<b>{snapshot.reactions.insightful}</b></button>
      <button aria-pressed={snapshot.myReaction === "inspiring"} disabled={busy} onClick={() => void react("inspiring")}><Sparkles size={16} />{copy ? "ملهم" : "Inspiring"}<b>{snapshot.reactions.inspiring}</b></button>
    </div>

    <div className="comment-section">
      <h2 id="discussion-title">{copy ? "مساحة النقاش" : "Join the conversation"}</h2>
      <p className="fine-print">{copy ? "التعليقات ظاهرة للزوار. لا تكتب بريدك أو رقم هاتفك أو معلومات خاصة؛ الاسم المعروض غير موثّق." : "Comments are public. Do not share email, phone numbers, or private information; display names are unverified."}</p>
      <form className="comment-form" onSubmit={submitComment}>
        <label><span>{copy ? "اسم العرض" : "Display name"}</span><input value={displayName} onChange={event => setDisplayName(event.target.value)} minLength={2} maxLength={48} required autoComplete="nickname" /></label>
        <label><span>{copy ? "تعليقك" : "Your comment"}</span><textarea value={body} onChange={event => setBody(event.target.value)} minLength={2} maxLength={320} required rows={3} /></label>
        <div className="comment-form__foot"><small>{copy ? `${body.length}/320 — بلا روابط أو بيانات اتصال.` : `${body.length}/320 — no links or contact details.`}</small><button className="button button--primary" type="submit" disabled={busy || !displayName.trim() || !body.trim()}><Send size={15} />{copy ? "انشر التعليق" : "Post comment"}</button></div>
      </form>
      {notice && <p className="social-notice" role="status">{notice}</p>}
      <div className="comment-list">
        {snapshot.comments.length === 0 ? <p className="fine-print">{copy ? "كن أول من يشارك فكرة مرتبطة بالمنشور." : "Be the first to leave a thoughtful comment."}</p> : snapshot.comments.map(comment => <article className="comment-item" key={comment.id}>
          <div className="comment-item__avatar" aria-hidden="true">{comment.displayName.slice(0, 1).toUpperCase()}</div>
          <div><div className="comment-item__meta"><strong>{comment.displayName}</strong><time dateTime={comment.createdAt}>{new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", { dateStyle: "medium" }).format(new Date(comment.createdAt))}</time></div><p>{comment.body}</p>
            {comment.aiReaction && <span className="comment-ai-reaction"><Sparkles size={13} />{copy ? (comment.aiReaction === "heart" ? "تفاعل القلب" : comment.aiReaction === "thoughtful" ? "فكرة لافتة" : "شكراً لمشاركتك") : (comment.aiReaction === "heart" ? "AI heart" : comment.aiReaction === "thoughtful" ? "Thoughtful" : "AI thanks")}</span>}
            {(comment.aiReplyAr || comment.aiReplyEn) && <div className="comment-ai-reply"><strong><Sparkles size={13} />{copy ? "ردّ المساعد" : "Assistant reply"}</strong><p>{locale === "ar" ? comment.aiReplyAr : comment.aiReplyEn}</p></div>}
          </div>
        </article>)}
      </div>
    </div>
  </section>;
}
