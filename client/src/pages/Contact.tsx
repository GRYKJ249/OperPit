import React, { useState } from "react";
import { Check, Copy, Mail, Send } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import { profile } from "../data/portfolio";
import { Breadcrumbs, DemoNote, PageIntro } from "../components/site/ContentComponents";

type FormValues = { name: string; email: string; message: string };
type FormErrors = Partial<Record<keyof FormValues, string>>;

export default function ContactPage() {
  const { locale, t } = useLanguage();
  const [values, setValues] = useState<FormValues>({ name: "", email: "", message: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState(false);

  const update = (field: keyof FormValues, value: string) => {
    setValues(current => ({ ...current, [field]: value }));
    setErrors(current => ({ ...current, [field]: undefined }));
    setStatus("");
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next: FormErrors = {};
    if (!values.name.trim()) next.name = t("required");
    if (!values.email.trim()) next.email = t("required");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) next.email = t("invalidEmail");
    if (!values.message.trim()) next.message = t("required");
    setErrors(next);
    if (Object.keys(next).length) return;
    const recipient = profile.email.endsWith("@example.com") ? "" : profile.email;
    const subject = encodeURIComponent(`${locale === "ar" ? "رسالة من" : "Message from"} ${values.name.trim()}`);
    const body = encodeURIComponent(`${locale === "ar" ? "الاسم" : "Name"}: ${values.name.trim()}\n${locale === "ar" ? "البريد" : "Email"}: ${values.email.trim()}\n\n${values.message.trim()}`);
    window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
    setStatus(locale === "ar" ? "فتحنا مسودة البريد على جهازك؛ أضف عنوان المستلم إذا لم يكن محدداً." : "Your email draft opened; add a recipient if one is not set.");
  };

  const copyEmail = async () => {
    try { await navigator.clipboard.writeText(profile.email); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
    catch { setCopied(false); }
  };

  return <div className="page-width section-space contact-page">
    <Breadcrumbs locale={locale} items={[{ label: t("home"), href: "/" }, { label: t("contact") }]} />
    <PageIntro eyebrow={locale === "ar" ? "الفصل الأخير · تواصل" : "THE NEXT CHAPTER · CONTACT"} title={locale === "ar" ? "كل مشروع يبدأ بحوار." : "Every project starts with a conversation."} description={t("contactLead")} locale={locale} />
    <div className="contact-layout"><aside className="contact-sidebar"><div className="contact-sidebar__block"><span className="eyebrow">{locale === "ar" ? "البريد الحالي" : "CURRENT EMAIL"}</span><p className="contact-address">{profile.email}</p><p className="fine-print">{locale === "ar" ? "عنوان تجريبي — استبدله ببريدك الحقيقي داخل بيانات الموقع." : "Sample address — replace it with your real email in the site data."}</p><button className="text-link" onClick={copyEmail}><Copy size={14} />{copied ? t("emailCopied") : t("copyEmailAddress")}</button></div><div className="contact-sidebar__block"><span className="eyebrow">{locale === "ar" ? "الخطوة القادمة" : "NEXT STEP"}</span><p>{locale === "ar" ? "أرسل الفكرة، حتى لو كانت ما زالت في بدايتها." : "Send the idea, even if it is still taking shape."}</p><div className="contact-response"><span className="site-ribbon__dot" />{t("availability")}</div></div></aside>
      <form className="contact-form" onSubmit={submit} noValidate><div className="contact-form__head"><span className="eyebrow">01 — {locale === "ar" ? "رسالة جديدة" : "NEW MESSAGE"}</span><Mail size={18} /></div>
        <label>{t("name")}<input autoComplete="name" value={values.name} onChange={event => update("name", event.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "name-error" : undefined} />{errors.name && <span className="field-error" id="name-error">{errors.name}</span>}</label>
        <label>{t("email")}<input type="email" autoComplete="email" value={values.email} onChange={event => update("email", event.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} />{errors.email && <span className="field-error" id="email-error">{errors.email}</span>}</label>
        <label>{t("message")}<textarea rows={5} value={values.message} onChange={event => update("message", event.target.value)} aria-invalid={Boolean(errors.message)} aria-describedby={errors.message ? "message-error" : undefined} />{errors.message && <span className="field-error" id="message-error">{errors.message}</span>}</label>
        <p className="form-privacy">{locale === "ar" ? "لا يتم إرسال بياناتك إلى خادم أو تخزينها؛ سيُنشأ بريد إلكتروني على جهازك." : "Your details are not sent to or stored by a server; an email draft is created on your device."}</p>
        <button className="button button--primary" type="submit">{t("send")}<Send size={16} /></button>
        {status && <p className="form-status" role="status"><Check size={15} />{status}</p>}
      </form>
    </div>
    <DemoNote>{locale === "ar" ? "للتواصل الفعلي، بدّل العنوان التجريبي في `client/src/data/portfolio.ts`." : "For real contact, replace the sample address in `client/src/data/portfolio.ts`."}</DemoNote>
  </div>;
}
