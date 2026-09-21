/**
 * Measure textarea caret coordinates via a style-mirrored overlay.
 * Returns position relative to the textarea's padding box (matches an absolute
 * caret sibling when the textarea is `inset: 0` in the same containing block).
 */

export type CaretPoint = {
  left: number;
  top: number;
  height: number;
};

export function getTextareaCaretPoint(
  textarea: HTMLTextAreaElement,
  position = textarea.selectionEnd,
): CaretPoint {
  const style = getComputedStyle(textarea);
  const taRect = textarea.getBoundingClientRect();
  const borderLeft = Number.parseFloat(style.borderLeftWidth) || 0;
  const borderTop = Number.parseFloat(style.borderTopWidth) || 0;

  const mirror = document.createElement("div");
  mirror.setAttribute("aria-hidden", "true");

  mirror.style.boxSizing = "border-box";
  mirror.style.position = "fixed";
  mirror.style.left = `${taRect.left + borderLeft}px`;
  mirror.style.top = `${taRect.top + borderTop}px`;
  mirror.style.width = `${textarea.clientWidth}px`;
  mirror.style.height = `${textarea.clientHeight}px`;
  mirror.style.overflow = "hidden";
  mirror.style.visibility = "hidden";
  mirror.style.pointerEvents = "none";
  mirror.style.zIndex = "-1";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.overflowWrap = "break-word";
  mirror.style.wordWrap = "break-word";
  mirror.style.font = style.font;
  mirror.style.letterSpacing = style.letterSpacing;
  mirror.style.lineHeight = style.lineHeight;
  mirror.style.textAlign = style.textAlign;
  mirror.style.textIndent = style.textIndent;
  mirror.style.padding = style.padding;
  mirror.style.border = "0";
  mirror.style.direction = style.direction;

  const value = textarea.value;
  mirror.textContent = value.substring(0, position);
  const marker = document.createElement("span");
  // Zero-width mark keeps the current line box without shifting wrap.
  marker.textContent = "\u200b";
  mirror.appendChild(marker);
  document.body.appendChild(mirror);

  mirror.scrollTop = textarea.scrollTop;
  mirror.scrollLeft = textarea.scrollLeft;

  const fontSize = Number.parseFloat(style.fontSize) || 16;
  let lineHeight = Number.parseFloat(style.lineHeight);
  if (!Number.isFinite(lineHeight)) lineHeight = fontSize * 1.35;

  const mr = marker.getBoundingClientRect();
  // Marker line-box height (falls back to computed line-height).
  const lineBox = mr.height > 0 ? mr.height : lineHeight;
  // Caret ≈ em-square; sit vertically centered in the line box (CSS half-leading).
  const height = fontSize;
  const padLeft = Number.parseFloat(style.paddingLeft) || 0;
  const padTop = Number.parseFloat(style.paddingTop) || 0;

  // Coordinates relative to textarea border box (padding-edge origin for content
  // matches absolute children of the same inset:0 parent as the textarea).
  const left = mr.left - (taRect.left + borderLeft);
  const top =
    mr.top - (taRect.top + borderTop) + Math.max(0, (lineBox - height) / 2);

  document.body.removeChild(mirror);

  // Clamp into the visible client area so scroll edges do not spit the caret out.
  return {
    left: Math.min(Math.max(left, padLeft), textarea.clientWidth - 2),
    top: Math.min(Math.max(top, 0), textarea.clientHeight - height),
    height,
  };
}
