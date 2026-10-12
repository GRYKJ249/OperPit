import { ArrowDown, ArrowUpLeft, ArrowUpRight, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { useLanguage } from "../contexts/LanguageContext";
import { articles, localize, portfolioImages, profile, projects, services } from "../data/portfolio";
import { ArticleCard, DemoNote, ProjectCard, SectionHeading } from "../components/site/ContentComponents";
import { DailyFeed } from "../features/daily/DailyFeed";
import { LivingPulse } from "../features/analytics/LivingPulse";

export default function Home() {
  const { locale, t } = useLanguage();
  const Arrow = locale === "ar" ? ArrowUpLeft : ArrowUpRight;
  const intro = locale === "ar" ? "الفكرة أولاً. ثم تجربة تستحق أن تُرى." : "First the idea. Then an experience worth seeing.";
  return <div className="home-page">
    <section className="hero-section page-width">
      <div className="hero-copy">
        <p className="eyebrow"><span className="eyebrow-dot" />{localize(profile.role, locale)}</p>
        <h1>{intro}</h1>
        <p className="hero-lead">{localize(profile.intro, locale)}</p>
        <div className="hero-actions"><Link className="button button--primary" href="/work">{t("explore")}<Arrow size={17} /></Link><Link className="button button--quiet" href="/contact">{t("sayHello")}<Arrow size={17} /></Link></div>
        <div className="hero-index"><span>01 — 53</span><span>{locale === "ar" ? "أرشيف شخصي قابل للنمو" : "A personal archive, built to grow"}</span><ArrowDown size={15} aria-hidden="true" /></div>
      </div>
      <div className="hero-art-wrap">
        <img className="hero-art" src={portfolioImages.hero} alt={locale === "ar" ? "تكوين تجريدي من إطارات ورقية زرقاء وعاجية ومرجانية" : "Abstract composition of cobalt, ivory, and coral paper frames"} fetchPriority="high" />
        <div className="hero-art-caption"><span className="caption-number">A—01</span><span>{locale === "ar" ? "أفكار في حركة" : "Ideas in motion"}</span></div>
        <div className="hero-art-stamp"><Sparkles size={16} /><span>{locale === "ar" ? "من الفكرة" : "From idea"}<br />{locale === "ar" ? "إلى الأثر" : "to impact"}</span></div>
      </div>
      <div className="hero-footnote"><span>{locale === "ar" ? "مساحة مرنة للتصميم والتجريب" : "A flexible space for design and exploration"}</span><span>{locale === "ar" ? "الأساس · المعنى · التجربة" : "Meaning · craft · experience"}</span></div>
    </section>

    <section className="intro-band page-width">
      <div className="intro-band__label"><span className="index-number">A/01</span><span>{locale === "ar" ? "عن الأرشيف" : "ABOUT THE INDEX"}</span></div>
      <p>{locale === "ar" ? <>هذا الموقع يتسع <em>للفكرة وهي تكبر</em> — من تعريف شخصي وممارسات إبداعية، إلى مكتبة مشاريع وملاحظات قابلة للاستكشاف.</> : <>A space for <em>ideas as they grow</em> — from a personal profile and creative practice to an archive of work and notes.</>}</p>
      <Link className="round-link" href="/about" aria-label={t("about")}><Arrow size={18} /></Link>
    </section>

    <section className="home-pulse page-width" aria-labelledby="home-pulse-title">
      <div className="home-pulse__head"><div><p className="eyebrow"><span className="eyebrow-dot" />{locale === "ar" ? "ذكاء يعمل داخل الأرشيف" : "INTELLIGENCE, BUILT INTO THE ARCHIVE"}</p><h2 id="home-pulse-title">{locale === "ar" ? "خمسة أضواء جديدة. كل يوم." : "Five new signals. Every day."}</h2><p>{locale === "ar" ? "موجز تعليمي بصور أصلية، ومساعد يشرح الفكرة ويربطها بما في الأرشيف." : "An original, illustrated learning feed with an assistant that connects each idea to the archive."}</p></div><Link className="text-link" href="/daily">{locale === "ar" ? "افتح موجز اليوم" : "Open today's issue"}<Arrow size={15} /></Link></div>
      <div className="home-pulse__layout"><div className="home-pulse__feed"><div className="home-pulse__subhead"><span>{locale === "ar" ? "العدد الحي" : "THE LIVE ISSUE"}</span><span>01 — 05</span></div><DailyFeed limit={3} compact /></div>
        <div className="home-pulse__systems"><Link className="home-system-card home-system-card--ai" href="/ai-studio"><span className="home-system-card__number">01 / THINK</span><strong>{locale === "ar" ? "استوديو الذكاء" : "AI Studio"}</strong><span>{locale === "ar" ? "اكتب مسودة، اشرح كوداً، وابدأ من فكرة." : "Draft, explain code, and build from an idea."}</span><Arrow size={16} /></Link><Link className="home-system-card home-system-card--ai" href="/council"><span className="home-system-card__number">02 / COUNCIL</span><strong>{locale === "ar" ? "غرفة الشورى" : "AI Council"}</strong><span>{locale === "ar" ? "اجمع نماذج الذكاء في جلسة واحدة للتفكير والتصويت." : "Bring the AI members together to discuss and vote."}</span><Arrow size={16} /></Link><Link className="home-system-card" href="/github"><span className="home-system-card__number">03 / EXPLORE</span><strong>GitHub</strong><span>{locale === "ar" ? "افتح المستودعات العامة وتصفّح ملفاتها." : "Open public repositories and browse their files."}</span><Arrow size={16} /></Link><Link className="home-system-card" href="/gitlab"><span className="home-system-card__number">04 / EXPLORE</span><strong>GitLab</strong><span>{locale === "ar" ? "استكشف المشاريع العامة وشجرة ملفاتها." : "Explore public projects and their file trees."}</span><Arrow size={16} /></Link><Link className="home-system-card" href="/daily"><span className="home-system-card__number">05 / LEARN</span><strong>{locale === "ar" ? "دفتر اليوم" : "Daily notes"}</strong><span>{locale === "ar" ? "برمجة، تصميم، تعلّم وثقافة مالية عامة." : "Programming, design, learning, and general financial literacy."}</span><Arrow size={16} /></Link></div>
      </div>
      <p className="home-pulse__note">{locale === "ar" ? "المحتوى التجريبي مولّد بمساعدة الذكاء الاصطناعي؛ لا ينفّذ شيفرات الزوار ولا يقدّم توصيات مالية أو تشخيصاً نفسياً." : "Sample AI-assisted content; visitor code is never executed, and no financial recommendations or psychological diagnoses are provided."}</p>
    </section>

    <LivingPulse />

    <section className="home-section page-width">
      <SectionHeading index="01" eyebrow={t("selected")} title={t("featuredWork")} description={t("demoNote")} action={<Link className="text-link" href="/work">{t("allWork")}<Arrow size={15} /></Link>} />
      <div className="project-grid project-grid--featured">{projects.slice(0, 4).map((project, index) => <ProjectCard key={project.slug} project={project} locale={locale} index={index} />)}</div>
      <div className="archive-index-link"><span>{locale === "ar" ? "التصنيفات الستة" : "SIX CATEGORIES"}</span><Link href="/work">{locale === "ar" ? "افتح فهرس الأعمال" : "Open the work index"}<Arrow size={16} /></Link></div>
    </section>

    <section className="service-band"><div className="page-width service-band__inner"><div className="service-band__intro"><p className="eyebrow"><span className="index-number">02</span>{t("services")}</p><h2>{locale === "ar" ? "حلول تبدأ من سؤالٍ جيد." : "Good work starts with a good question."}</h2><p>{locale === "ar" ? "ستة مسارات إبداعية توضح ما يمكن تشكيله معاً — والنطاق يحدد التفاصيل." : "Six creative paths show what we could shape together; scope sets the details."}</p><Link className="text-link" href="/services">{t("viewAll")}<Arrow size={15} /></Link></div>
        <div className="service-list">{services.slice(0, 4).map((service, index) => <Link className="service-list__item" href={`/services/${service.slug}`} key={service.slug}><span className="service-list__number">0{index + 1}</span><span className="service-list__name">{localize(service.title, locale)}</span><span className="service-list__desc">{localize(service.short, locale)}</span><Arrow size={17} /></Link>)}</div>
      </div></section>

    <section className="home-section page-width"><SectionHeading index="03" eyebrow={t("editorial")} title={t("articlesTitle")} description={locale === "ar" ? "كتابة تجريبية حول التصميم والعملية والثقافة البصرية." : "Sample writing on design, practice, and visual culture."} action={<Link className="text-link" href="/journal">{t("viewAll")}<Arrow size={15} /></Link>} />
      <div className="article-grid">{[articles[0], articles[3], articles[6]].map((article, index) => <ArticleCard key={article.slug} article={article} locale={locale} index={index} />)}</div>
    </section>

    <section className="assistant-callout page-width"><div className="assistant-callout__symbol"><Sparkles size={23} /></div><div><p className="eyebrow">{locale === "ar" ? "رفيق الأرشيف" : "ARCHIVE GUIDE"}</p><h2>{locale === "ar" ? "تبحث عن شيء بعينه؟ اسأل الدليل." : "Looking for something specific? Ask the guide."}</h2><p>{locale === "ar" ? "مساعد ذكي يربط سؤالك بالمشاريع والخدمات والمقالات الموجودة — من دون تخمين معلومات غير موجودة." : "An AI guide connects your question to available projects, services, and articles without making up missing facts."}</p></div><button className="round-link" onClick={() => window.dispatchEvent(new CustomEvent("folio:open-assistant"))} aria-label={t("openAssistant")}><Arrow size={18} /></button></section>

    <section className="home-cta page-width"><div><p className="eyebrow">04 — {locale === "ar" ? "الفصل التالي" : "NEXT CHAPTER"}</p><h2>{locale === "ar" ? "خلّينا نحكي عن مشروعك الجاي." : "Let's talk about what comes next."}</h2></div><Link className="button button--primary" href="/contact">{t("contact")}<Arrow size={17} /></Link><span className="home-cta__outline" aria-hidden="true">04</span></section>
    <div className="page-width home-demo"><DemoNote>{t("demoNote")}</DemoNote></div>
  </div>;
}
