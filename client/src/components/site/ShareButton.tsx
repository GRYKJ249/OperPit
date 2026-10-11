import { useState } from "react";
import { Share2 } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

export function ShareButton() {
  const { locale, t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: document.title, url: window.location.href });
      else { await navigator.clipboard.writeText(window.location.href); setCopied(true); window.setTimeout(() => setCopied(false), 1600); }
    } catch { /* The visitor may cancel the native share sheet. */ }
  };
  return <button className="text-link share-button" onClick={share}><Share2 size={15} />{copied ? t("copied") : (locale === "ar" ? "شارك الصفحة" : "Share this page")}</button>;
}
