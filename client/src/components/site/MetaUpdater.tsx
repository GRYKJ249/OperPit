import { useEffect } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "../../contexts/LanguageContext";
import { getPageMetadata } from "../../lib/metadata";

export function MetaUpdater() {
  const [path] = useLocation();
  const { locale } = useLanguage();
  useEffect(() => {
    const meta = getPageMetadata(path, locale === "ar" ? "ar" : "en");
    document.title = meta.title;
    let description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!description) { description = document.createElement("meta"); description.name = "description"; document.head.appendChild(description); }
    description.content = meta.description;
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (meta.noIndex) {
      if (!robots) { robots = document.createElement("meta"); robots.name = "robots"; document.head.appendChild(robots); }
      robots.content = "noindex,nofollow,noarchive";
    } else if (robots) robots.remove();
    const ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    if (ogTitle) ogTitle.content = meta.title;
    const ogDescription = document.querySelector<HTMLMetaElement>('meta[property="og:description"]');
    if (ogDescription) ogDescription.content = meta.description;
    const ogImage = document.querySelector<HTMLMetaElement>('meta[property="og:image"]');
    if (ogImage && meta.image) ogImage.content = meta.image;
  }, [path, locale]);
  return null;
}
