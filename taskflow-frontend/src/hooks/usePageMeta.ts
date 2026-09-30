import { useEffect } from "react";

/** Sets the document title and meta description for the current marketing page. */
export function usePageMeta(title: string, description: string) {
  useEffect(() => {
    document.title = title === "Home" ? "TaskFlow AI | AI task management for teams" : `${title} | TaskFlow AI`;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = description;
  }, [title, description]);
}