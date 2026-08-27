import { useEffect } from "react";

/**
 * Marks the current route as non-indexable for crawlers that execute JS.
 * Use on private/operational pages that don't render the <SEO> component
 * (which handles robots meta automatically). Mirrors public/robots.txt.
 */
export function useNoIndex(content = "noindex, nofollow") {
  useEffect(() => {
    const tag = document.createElement("meta");
    tag.setAttribute("name", "robots");
    tag.setAttribute("content", content);
    tag.setAttribute("data-noindex-hook", "true");
    document.head.appendChild(tag);
    return () => {
      tag.remove();
    };
  }, [content]);
}

export default useNoIndex;
