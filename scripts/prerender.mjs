import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const outputRoot = path.join(projectRoot, "dist", "public");
const escapeHtml = value => String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const vite = await createServer({
  configFile: path.join(projectRoot, "vite.config.ts"),
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
  logLevel: "error",
});

try {
  const { renderPage, staticContentPaths } = await vite.ssrLoadModule("/src/entry-server.tsx");
  const template = await fs.readFile(path.join(outputRoot, "index.html"), "utf8");
  const paths = [...new Set(staticContentPaths)];
  for (const route of paths) {
    if (typeof route !== "string" || !route.startsWith("/") || route.includes("..") || route.includes("\\")) throw new Error(`Invalid prerender route: ${route}`);
    const { html, metadata } = renderPage(route);
    const direction = metadata.locale === "ar" ? "rtl" : "ltr";
    const routeHtml = template
      .replace('<html lang="ar" dir="rtl">', `<html lang="${metadata.locale}" dir="${direction}">`)
      .replace(/<title>.*?<\/title>/s, `<title>${escapeHtml(metadata.title)}</title>`)
      .replace(/(<meta name="description" content=")[^"]*("\s*\/?>)/, `$1${escapeHtml(metadata.description)}$2`)
      .replace(/(<meta property="og:title" content=")[^"]*("\s*\/?>)/, `$1${escapeHtml(metadata.title)}$2`)
      .replace(/(<meta property="og:description" content=")[^"]*("\s*\/?>)/, `$1${escapeHtml(metadata.description)}$2`)
      .replace(/(<meta property="og:image" content=")[^"]*("\s*\/?>)/, `$1${escapeHtml(metadata.image ?? "")}$2`)
      .replace("</head>", `${metadata.noIndex ? '<meta name="robots" content="noindex,nofollow,noarchive" />' : ""}</head>`)
      .replace('<div id="root"></div>', `<div id="root">${html}</div>`);
    const destination = route === "/" ? path.join(outputRoot, "index.html") : path.join(outputRoot, route.slice(1), "index.html");
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, routeHtml, "utf8");
  }
  const { html: notFoundHtml, metadata: notFoundMetadata } = renderPage("/404");
  const notFoundDoc = template
    .replace('<html lang="ar" dir="rtl">', `<html lang="${notFoundMetadata.locale}" dir="${notFoundMetadata.locale === "ar" ? "rtl" : "ltr"}">`)
    .replace(/<title>.*?<\/title>/s, `<title>${escapeHtml(notFoundMetadata.title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*("\s*\/?>)/, `$1${escapeHtml(notFoundMetadata.description)}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*("\s*\/?>)/, `$1${escapeHtml(notFoundMetadata.title)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*("\s*\/?>)/, `$1${escapeHtml(notFoundMetadata.description)}$2`)
    .replace(/(<meta property="og:image" content=")[^"]*("\s*\/?>)/, `$1${escapeHtml(notFoundMetadata.image ?? "")}$2`)
    .replace('<div id="root"></div>', `<div id="root">${notFoundHtml}</div>`);
  await fs.writeFile(path.join(outputRoot, "404.html"), notFoundDoc, "utf8");
  console.log(`Prerendered ${paths.length} content paths and the 404 document.`);
} finally {
  await vite.close();
}
