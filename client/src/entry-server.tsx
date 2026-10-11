import React from "react";
import { renderToString } from "react-dom/server";
import App from "./App";
import { getPageMetadata } from "./lib/metadata";
import { routeManifest, staticContentPaths } from "./data/portfolio";

export { routeManifest, staticContentPaths };

export function renderPage(path: string) {
  const html = renderToString(<App ssrPath={path} />);
  const metadata = getPageMetadata(path, "ar");
  return { html, metadata };
}
