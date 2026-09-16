/**
 * 선택 영역 서식 적용.
 * contenteditable 의 블록 경계를 안전하게 다루기 위해 execCommand 를 쓴다.
 * (표준에서 deprecated 지만 모든 주요 브라우저가 여전히 지원하며,
 *  직접 Range 를 조작하는 것보다 중첩이 깨지는 경우가 훨씬 적다.)
 */

export type InlineCommand = 'bold' | 'italic' | 'underline' | 'strikeThrough';

const FONT_SIZE_SENTINEL = '7';

function enableCssStyling() {
  try {
    document.execCommand('styleWithCSS', false, 'true');
  } catch {
    /* 일부 브라우저에서 미지원 */
  }
}

export function hasSelectionInside(root: HTMLElement | null): boolean {
  if (!root) return false;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;
  const range = sel.getRangeAt(0);
  return root.contains(range.commonAncestorContainer);
}

export function toggleInline(command: InlineCommand): void {
  enableCssStyling();
  document.execCommand(command);
}

export function queryInline(command: InlineCommand): boolean {
  try {
    return document.queryCommandState(command);
  } catch {
    return false;
  }
}

export function applyTextColor(color: string): void {
  enableCssStyling();
  document.execCommand('foreColor', false, color);
}

export function applyHighlight(color: string): void {
  enableCssStyling();
  // hiliteChange 미지원 브라우저 대비로 backColor 를 함께 시도한다.
  if (!document.execCommand('hiliteColor', false, color)) {
    document.execCommand('backColor', false, color);
  }
}

export function clearHighlight(root: HTMLElement): void {
  applyHighlight('transparent');
  root.querySelectorAll<HTMLElement>('[style*="background-color: transparent"]').forEach((el) => {
    el.style.backgroundColor = '';
    if (!el.getAttribute('style')) el.removeAttribute('style');
  });
}

/**
 * 선택 영역에만 px 단위 글자 크기를 적용한다.
 * execCommand('fontSize') 로 <font size="7"> 를 만든 뒤 span 으로 바꿔치기한다.
 */
export function applyFontSize(root: HTMLElement, px: number): void {
  document.execCommand('fontSize', false, FONT_SIZE_SENTINEL);
  root.querySelectorAll<HTMLFontElement>(`font[size="${FONT_SIZE_SENTINEL}"]`).forEach((fontEl) => {
    const span = document.createElement('span');
    span.style.fontSize = `${px}px`;
    while (fontEl.firstChild) span.appendChild(fontEl.firstChild);
    fontEl.parentNode?.replaceChild(span, fontEl);
  });
}

export function removeFormatting(): void {
  document.execCommand('removeFormat');
}

/** 붙여넣기를 평문으로 강제한다 — 외부 서식이 따라 들어오는 것을 막는다. */
export function insertPlainText(text: string): void {
  const normalized = text.replace(/\r\n?/g, '\n');
  if (!document.execCommand('insertText', false, normalized)) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(normalized));
    range.collapse(false);
  }
}
