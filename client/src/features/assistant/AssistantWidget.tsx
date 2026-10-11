import React, { useEffect, useRef, useState } from "react";
import { Bot, LoaderCircle, MessageCircle, Send, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "../../contexts/LanguageContext";

type ChatMessage = { role: "user" | "assistant"; content: string };
type Suggestion = { title: string; href: string; kind: string };

export function AssistantWidget() {
  const { locale, t } = useLanguage();
  const [path] = useLocation();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 60);
  }, [open]);
  useEffect(() => { if (transcriptRef.current) transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight; }, [messages, pending]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && open) setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    const openAssistant = () => setOpen(true);
    window.addEventListener("folio:open-assistant", openAssistant);
    return () => window.removeEventListener("folio:open-assistant", openAssistant);
  }, []);

  const send = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const message = input.trim();
    if (!message || pending) return;
    if (message.length > 1200) { setError(true); return; }
    const next: ChatMessage[] = [...messages, { role: "user", content: message }];
    setMessages(next);
    setInput("");
    setPending(true);
    setError(false);
    let timeout: number | undefined;
    try {
      const controller = new AbortController();
      timeout = window.setTimeout(() => controller.abort(), 25000);
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history: messages.slice(-6), locale, path }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("assistant_unavailable");
      const payload = await response.json() as { reply?: string; suggestions?: Suggestion[] };
      if (typeof payload.reply !== "string" || !payload.reply.trim()) throw new Error("empty_reply");
      setMessages(current => [...current, { role: "assistant", content: payload.reply!.slice(0, 3500) }]);
      setSuggestions(Array.isArray(payload.suggestions) ? payload.suggestions.slice(0, 3) : []);
    } catch {
      setError(true);
    } finally {
      if (timeout !== undefined) window.clearTimeout(timeout);
      setPending(false);
    }
  };

  const clear = () => { setMessages([]); setSuggestions([]); setError(false); };
  return <>
    <button className={`assistant-fab ${open ? "assistant-fab--open" : ""}`} onClick={() => setOpen(value => !value)} aria-label={open ? t("close") : t("openAssistant")} aria-expanded={open} aria-controls="archive-assistant">
      {open ? <X size={21} /> : <><MessageCircle size={19} /><span>{t("assistant")}</span></>}
    </button>
    {open && <section className="assistant-panel" id="archive-assistant" role="dialog" aria-modal="false" aria-labelledby="assistant-title" dir={locale === "ar" ? "rtl" : "ltr"}>
      <header className="assistant-panel__header"><div className="assistant-avatar"><Bot size={20} /></div><div><h2 id="assistant-title">{t("assistant")}</h2><p>{t("assistantIntro")}</p></div><button className="icon-button" onClick={() => setOpen(false)} aria-label={t("close")}><X size={18} /></button></header>
      <div className="assistant-panel__transcript" ref={transcriptRef} aria-live="polite" aria-relevant="additions text">
        {messages.length === 0 && <div className="assistant-welcome"><span className="assistant-welcome__spark">✳</span><p>{locale === "ar" ? "أقدر أساعدك تختار من 12 مشروعاً مفاهيمياً، 12 مقالاً و6 خدمات. شنو حاب تكتشف؟" : "I can help you explore 12 concept projects, 12 articles, and 6 services. What would you like to find?"}</p><div className="assistant-prompt-chips"><button onClick={() => setInput(locale === "ar" ? "أريد استكشاف مشاريع الهوية" : "Show me identity projects")}>{locale === "ar" ? "مشاريع الهوية" : "Identity work"}</button><button onClick={() => setInput(locale === "ar" ? "ما هي الخدمات المتاحة؟" : "What services are available?")}>{locale === "ar" ? "الخدمات" : "Services"}</button></div></div>}
        {messages.map((message, index) => <div className={`chat-message chat-message--${message.role}`} key={`${message.role}-${index}`}><span>{message.content}</span></div>)}
        {pending && <div className="chat-message chat-message--assistant chat-message--loading"><LoaderCircle size={15} className="spin" /><span>{t("assistantThinking")}</span></div>}
        {error && <div className="assistant-error" role="alert"><p>{t("assistantError")}</p><Link href="/work" onClick={() => setOpen(false)}>{t("aiLink")}</Link><button onClick={() => { setError(false); const last = [...messages].reverse().find(item => item.role === "user"); if (last) { setInput(last.content); } }}>{t("assistantRetry")}</button></div>}
        {suggestions.length > 0 && <div className="assistant-suggestions"><h3>{t("assistantSuggestions")}</h3>{suggestions.map(item => <Link key={item.href} href={item.href} onClick={() => setOpen(false)}><small>{item.kind}</small><strong>{item.title}</strong><span aria-hidden="true">↗</span></Link>)}</div>}
      </div>
      <form className="assistant-panel__form" onSubmit={send}><label className="sr-only" htmlFor="assistant-input">{t("assistantPlaceholder")}</label><input id="assistant-input" ref={inputRef} value={input} onChange={event => { setInput(event.target.value); if (event.target.value.length <= 1200) setError(false); }} maxLength={1200} placeholder={t("assistantPlaceholder")} disabled={pending} /><button type="submit" disabled={pending || !input.trim()} aria-label={t("assistantSend")}><Send size={17} /></button></form>
      <footer className="assistant-panel__foot"><span>{t("assistantDisclaimer")}</span>{messages.length > 0 && <button onClick={clear}>{locale === "ar" ? "محادثة جديدة" : "New chat"}</button>}</footer>
    </section>}
  </>;
}
