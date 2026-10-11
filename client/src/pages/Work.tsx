import { useEffect, useMemo, useState } from "react";
import { ArrowUpLeft, ArrowUpRight, Filter, Search, SlidersHorizontal, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "../contexts/LanguageContext";
import { articles, localize, projects, workCategories, categoryBySlug, type ProjectCategory } from "../data/portfolio";
import { Breadcrumbs, EmptyState, PageIntro, ProjectCard, TagPill } from "../components/site/ContentComponents";

export default function WorkPage() {
  const { locale, t } = useLanguage();
  const [path] = useLocation();
  const requestedCategory = path.split("/").filter(Boolean)[1] ?? "";
  const fixedCategory = categoryBySlug(requestedCategory)?.slug ?? "";
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("");
  const [sort, setSort] = useState("featured");
  const [queryReady, setQueryReady] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const Arrow = locale === "ar" ? ArrowUpLeft : ArrowUpRight;
  const category = fixedCategory ? categoryBySlug(fixedCategory) : undefined;
  const allTags = Array.from(new Set(projects.flatMap(project => project.kit.map(item => localize(item, locale))))).sort((a, b) => a.localeCompare(b, locale));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setQuery(params.get("q") ?? "");
    setTag(params.get("tag") ?? "");
    setSort(params.get("sort") ?? "featured");
    setQueryReady(true);
  }, [path]);
  useEffect(() => {
    if (!queryReady) return;
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (tag) params.set("tag", tag);
    if (sort !== "featured") params.set("sort", sort);
    const next = params.toString();
    window.history.replaceState({}, "", `${path}${next ? `?${next}` : ""}`);
  }, [path, query, queryReady, sort, tag]);

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    const list = projects.filter(project => {
      if (fixedCategory && project.category !== fixedCategory) return false;
      if (tag && !project.kit.some(item => localize(item, locale) === tag)) return false;
      if (!needle) return true;
      const haystack = [localize(project.title, locale), localize(project.subtitle, locale), localize(project.summary, locale), ...project.kit.map(item => localize(item, locale)), project.category].join(" ").toLocaleLowerCase();
      return haystack.includes(needle);
    });
    if (sort === "name") list.sort((a, b) => localize(a.title, locale).localeCompare(localize(b.title, locale), locale));
    return list;
  }, [fixedCategory, locale, query, sort, tag]);

  const title = category ? `${t("workArchive")} / ${localize(category.title, locale)}` : (locale === "ar" ? "كل مشروع يفتح باباً لفكرة مختلفة." : "Every project opens a different idea.");
  const description = category ? localize(category.description, locale) : (locale === "ar" ? "اثنتا عشرة دراسة مفاهيمية موزعة على ستة تصنيفات. كل بطاقة مثال بصري لا ادعاء بعمل منفذ." : "Twelve concept case studies across six categories. Every card is a visual example, not a claim of completed client work.");

  return <div className="page-width section-space work-index">
    <Breadcrumbs locale={locale} items={[{ label: t("home"), href: "/" }, { label: t("work"), href: "/work" }, ...(category ? [{ label: localize(category.title, locale) }] : [])]} />
    <PageIntro eyebrow={category ? localize(category.title, locale) : (locale === "ar" ? "فهرس الأعمال · 12 مفهوماً" : "WORK INDEX · 12 CONCEPTS")} title={title} description={description} locale={locale} />
    <div className="archive-toolbar"><label className="archive-search"><Search size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={t("workSearch")} aria-label={t("workSearch")} />{query && <button onClick={() => setQuery("")} aria-label={t("clearFilters")}><X size={15} /></button>}</label><button className={`filter-toggle ${filtersOpen ? "is-active" : ""}`} onClick={() => setFiltersOpen(open => !open)} aria-expanded={filtersOpen}><SlidersHorizontal size={16} />{locale === "ar" ? "الفلاتر والترتيب" : "Filters & sort"}</button><span className="result-count"><strong>{visible.length.toString().padStart(2, "0")}</strong> {t("results")}</span></div>
    <div className="category-tabs" aria-label={t("filterCategory")}><Link href="/work" className={!fixedCategory ? "is-active" : ""}>{t("filterAll")} <span>{projects.length}</span></Link>{workCategories.map(item => <Link key={item.slug} href={`/work/${item.slug}`} className={fixedCategory === item.slug ? "is-active" : ""}>{localize(item.title, locale)} <span>{projects.filter(project => project.category === item.slug).length}</span></Link>)}</div>
    {filtersOpen && <div className="filter-panel"><label><span>{t("filterTags")}</span><select value={tag} onChange={event => setTag(event.target.value)}><option value="">{locale === "ar" ? "كل الوسوم" : "All tags"}</option>{allTags.map(item => <option key={item} value={item}>{item}</option>)}</select><Filter size={15} /></label><label><span>{locale === "ar" ? "الترتيب" : "Sort"}</span><select value={sort} onChange={event => setSort(event.target.value)}><option value="featured">{t("sortFeatured")}</option><option value="name">{t("sortName")}</option></select></label><button className="text-link" onClick={() => { setQuery(""); setTag(""); setSort("featured"); }}>{t("clearFilters")}</button></div>}
    {(query || tag) && <div className="active-filters">{query && <TagPill>{locale === "ar" ? `بحث: ${query}` : `Search: ${query}`}</TagPill>}{tag && <TagPill>{tag}</TagPill>}</div>}
    {visible.length ? <div className="project-grid project-grid--archive">{visible.map((project, index) => <ProjectCard key={project.slug} project={project} locale={locale} index={index} />)}</div> : <EmptyState title={t("noResults")} description={locale === "ar" ? "حاول إزالة أحد الفلاتر أو استكشف كل التصنيفات." : "Clear one filter or explore all categories."} />}
    <section className="archive-related"><div><span className="index-number">NEXT</span><h2>{locale === "ar" ? "ثم اقرأ طريقة التفكير وراء التفاصيل." : "Then read the thinking behind the details."}</h2></div><Link className="button button--quiet" href="/journal">{t("journal")}<Arrow size={16} /></Link></section>
  </div>;
}
