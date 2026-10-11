import { articleBySlug, copy, localize, portfolioImages, projectBySlug, resolveStaticTitle, serviceBySlug, type Copy, type Locale } from "../data/portfolio";

export type PageMetadata = { title: string; description: string; image?: string; locale: Locale; noIndex?: boolean };

export function getPageMetadata(pathname: string, locale: Locale): PageMetadata {
  const cleanPath = pathname.split("?")[0].replace(/\/$/, "") || "/";
  const project = projectBySlug(cleanPath.split("/").pop() ?? "");
  const article = articleBySlug(cleanPath.split("/").pop() ?? "");
  const service = serviceBySlug(cleanPath.split("/").pop() ?? "");
  let descriptionCopy: Copy = copy(
    "بورتفوليو تحريري متعدد المسارات؛ تصفح مفاهيم الأعمال والخدمات والمقالات. المحتوى الحالي تجريبي وقابل للاستبدال.",
    "An editorial portfolio archive of work, services, and articles. Current sample content is conceptual and replaceable."
  );
  if (project && cleanPath.startsWith("/work/")) descriptionCopy = project.summary;
  else if (article && cleanPath.startsWith("/journal/")) descriptionCopy = article.excerpt;
  else if (service && cleanPath.startsWith("/services/")) descriptionCopy = service.short;
  else if (cleanPath.startsWith("/work/")) descriptionCopy = copy("تصفح هذا التصنيف من مفاهيم الأعمال التجريبية.", "Explore this category of conceptual work examples.");
  else if (cleanPath.startsWith("/journal/topics/")) descriptionCopy = copy("اقرأ ملاحظات ومقالات تجريبية حول التصميم والعمل الإبداعي.", "Read sample notes and articles on design and creative practice.");
  else if (cleanPath === "/daily") descriptionCopy = copy("خمسة أفكار تعليمية يومية في البرمجة وعلم النفس العام والثقافة المالية والتصميم والتعلّم.", "Five daily learning notes on programming, everyday psychology, financial literacy, design, and learning.");
  else if (cleanPath.startsWith("/daily/")) descriptionCopy = copy("فكرة تعليمية قصيرة من موجز الأرشيف اليومي.", "A short learning note from the daily archive.");
  else if (cleanPath === "/github" || cleanPath.startsWith("/github/")) descriptionCopy = copy("استكشف مستودعات GitHub العامة واقرأ اللغات والملفات دون تشغيل الكود.", "Explore public GitHub repositories, languages, and files without running code.");
  else if (cleanPath === "/ai-studio") descriptionCopy = copy("أنشئ مسودات أصلية قابلة للتحرير بمساعدة الذكاء الاصطناعي.", "Create editable original drafts with AI assistance.");
  else if (cleanPath === "/council") descriptionCopy = copy("واجهة خاصة تتطلب جلسة مسؤول صالحة.", "A private interface requiring a valid administrator session.");
  else if (cleanPath === "/contact") descriptionCopy = copy("تواصل لمناقشة فكرة أو مشروع. يفتح النموذج تطبيق البريد على جهازك.", "Get in touch about an idea or project. The form opens your email app.");
  else if (cleanPath === "/404") descriptionCopy = copy("هذه الصفحة غير موجودة. ارجع إلى الفهرس لاستكشاف محتوى الموقع.", "This page could not be found. Return to the index to explore the site.");
  const titleCopy = cleanPath === "/404" ? copy("الصفحة غير موجودة", "Page not found") : cleanPath === "/council" ? copy("مساحة خاصة", "Private room") : cleanPath.startsWith("/daily/") ? copy("فكرة اليوم", "Daily learning note") : cleanPath.startsWith("/github/") ? copy("مستودع GitHub عام", "Public GitHub repository") : resolveStaticTitle(cleanPath, locale);
  const brand = locale === "ar" ? "أرشيف الأفكار" : "Idea Archive";
  return { title: `${localize(titleCopy, locale)} — ${brand}`, description: localize(descriptionCopy, locale), image: project?.cover ?? article?.cover ?? portfolioImages.hero, locale, noIndex: cleanPath === "/council" };
}
