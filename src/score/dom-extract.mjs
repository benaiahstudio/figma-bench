// Runs inside the rendered page. Returns the text blocks (box, text, colour, clipped?, scroller?) and the page width.
// A block is the text of one non-inline element, including text inside inline children such as <b> or <a>.
export function extractDom() {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  // A canvas turns any CSS colour (oklch, color-mix, names) into plain sRGB bytes.
  const toRgb = (css) => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#000";
    ctx.fillStyle = css;
    ctx.fillRect(0, 0, 1, 1);

    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;

    return { rgb: [r, g, b], alpha: a / 255 };
  };
  const isInline = (el) => getComputedStyle(el).display === "inline";
  const collect = (el, nodes) => {
    for (const child of el.childNodes) {
      if (child.nodeType === 3 && child.textContent.trim()) nodes.push(child);
      else if (child.nodeType === 1 && isInline(child) && !["SCRIPT", "STYLE", "SVG", "svg"].includes(child.nodeName)) collect(child, nodes);
    }

    return nodes;
  };
  const clipRoot = (el) => {
    for (let parent = el.parentElement; parent; parent = parent.parentElement) {
      if (/(hidden|clip|auto|scroll)/.test(getComputedStyle(parent).overflow)) return parent;
    }

    return null;
  };
  // Text inside a horizontal scroller (overflow-x auto/scroll) is meant to run past the edge.
  const inScroller = (el) => {
    for (let node = el; node && node !== document.body && node !== document.documentElement; node = node.parentElement) {
      if (/^(auto|scroll)$/.test(getComputedStyle(node).overflowX)) return true;
    }

    return false;
  };
  const blocks = [];

  for (const el of document.body.querySelectorAll("*")) {
    if (isInline(el)) continue;

    const style = getComputedStyle(el);

    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) continue;

    const nodes = collect(el, []);

    if (nodes.length === 0) continue;

    const rects = nodes.flatMap((node) => {
      const range = document.createRange();

      range.selectNodeContents(node);

      return [...range.getClientRects()].filter((rect) => rect.width > 0 && rect.height > 0);
    });

    if (rects.length === 0) continue;

    const left = Math.min(...rects.map((rect) => rect.left));
    const top = Math.min(...rects.map((rect) => rect.top));
    const right = Math.max(...rects.map((rect) => rect.right));
    const bottom = Math.max(...rects.map((rect) => rect.bottom));
    const colour = toRgb(getComputedStyle(nodes[0].parentElement).color);
    const root = clipRoot(el) ?? (style.overflow !== "visible" ? el : null);
    const bounds = root ? root.getBoundingClientRect() : null;
    const clipped = (bounds !== null && (left < bounds.left - 1 || right > bounds.right + 1 || top < bounds.top - 1 || bottom > bounds.bottom + 1)) || left < -1;
    const text = nodes.map((node) => node.textContent).join(" ").replace(/\s+/g, " ").trim();

    blocks.push({ text, box: { x: left + scrollX, y: top + scrollY, w: right - left, h: bottom - top }, rgb: colour.rgb, alpha: colour.alpha, clipped, scroller: inScroller(el) });
  }

  const offenders = [...document.body.querySelectorAll("*")].filter((el) => el.getBoundingClientRect().right > innerWidth + 1).length;

  return { viewportWidth: innerWidth, scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth), pageHeight: document.documentElement.scrollHeight, widerThanViewport: offenders, page: { href: location.href, title: document.title, text: document.body.innerText.slice(0, 600) }, blocks };
}
