export function scrollToHash(
  hash: string,
  options?: {
    root?: ParentNode;
    reduceMotion?: boolean;
    scrollIntoView?: (el: Element, init?: ScrollIntoViewOptions) => void;
  },
) {
  const id = hash.replace(/^#/, "");
  if (!id) return false;

  const root = options?.root ?? document;
  const el = root.querySelector(`#${CSS.escape(id)}`);
  if (!el) return false;

  const reduceMotion =
    options?.reduceMotion ??
    (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  const scroll = options?.scrollIntoView ?? ((node, init) => node.scrollIntoView(init));
  scroll(el, {
    behavior: reduceMotion ? "auto" : "smooth",
    block: "start",
  });
  return true;
}
