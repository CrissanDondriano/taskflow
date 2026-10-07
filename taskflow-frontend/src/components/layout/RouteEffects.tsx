import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Shared per-navigation effects for the whole SPA (mounted once in App):
 * scroll back to the top when the route changes and move focus to the new
 * page's heading once it has mounted, so keyboard and screen-reader users
 * aren't left parked on the previous page's content.
 */
export function RouteEffects() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);

    // The heading may mount a moment later (lazy chunk or the dashboard's
    // page-exit animation), so retry briefly. Never steal focus the user
    // has already moved themselves — e.g. they just activated a sidebar link.
    let tries = 0;
    const timer = window.setInterval(() => {
      const heading = document.querySelector<HTMLHeadingElement>("h1");
      if (heading) {
        window.clearInterval(timer);
        if (document.activeElement !== document.body) return;
        heading.setAttribute("tabindex", "-1");
        heading.focus({ preventScroll: true });
      } else if (++tries > 50) {
        window.clearInterval(timer);
      }
    }, 50);
    return () => window.clearInterval(timer);
  }, [pathname]);

  return null;
}
