import { useEffect } from "react";

const SITE = "https://taskflow-frontend-liard-eight.vercel.app"; // production domain

function upsert(selector: string, make: () => HTMLElement, set: (el: HTMLElement) => void) {
  let el = document.head.querySelector<HTMLElement>(selector);
  if (!el) { el = make(); document.head.appendChild(el); }
  set(el);
}
const meta = (attr: "name" | "property", key: string, content: string) =>
  upsert(`meta[${attr}="${key}"]`, () => { const m = document.createElement("meta"); m.setAttribute(attr, key); return m; }, (m) => m.setAttribute("content", content));

/** Per-page title, description, canonical URL and Open Graph tags. */
export function usePageMeta(title: string, description: string) {
  useEffect(() => {
    const full = title === "Home" ? "TaskFlow AI" : `${title} | TaskFlow AI`;
    const url = SITE + window.location.pathname;
    document.title = full;
    meta("name", "description", description);
    meta("property", "og:title", full);
    meta("property", "og:description", description);
    meta("property", "og:url", url);
    upsert('link[rel="canonical"]', () => { const l = document.createElement("link"); l.rel = "canonical"; return l; }, (l) => l.setAttribute("href", url));
  }, [title, description]);
}