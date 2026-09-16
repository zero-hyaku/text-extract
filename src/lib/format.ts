/**
 * 선택 영역 서식 적용.
 * contenteditable 의 블록 경계를 안전하게 다루기 위해 execCommand 를 쓴다.
 * (표준에서 deprecated 지만 모든 주요 브라우저가 여전히 지원하며,
 *  직접 Range 를 조작하는 것보다 중첩이 깨지는 경우가 훨씬 적다.)
 */
import type { Role } from './parse';

export type InlineCommand = 'bold' | 'italic' | 'underline' | 'strikeThrough';

const FONT_SIZE_SENTINEL = '7';

function setCssStyling(enabled: boolean) {
  try {
    document.execCommand('styleWithCSS', false, enabled ? 'true' : 'false');
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

/**
 * 사용자가 직접 준 색·크기를 CSS 변수로도 복제한다.
 *
 * 역할(대사/서술/이름) 색은 `color: var(--te-ink, <역할색>)` 으로 읽으므로,
 * 바깥쪽 span 이 --te-ink 를 물려주면 안쪽 역할 span 까지 그 색을 따른다.
 * 덕분에 드래그로 준 서식이 항상 사이드바 역할 서식을 이긴다.
 */
export function syncInlineVars(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('span[style]').forEach((el) => {
    if (el.dataset.teRole) return; // 역할 span 자체는 건드리지 않는다

    const color = el.style.color;
    if (color) el.style.setProperty('--te-ink', color);
    else el.style.removeProperty('--te-ink');

    const size = el.style.fontSize;
    if (size) el.style.setProperty('--te-size', size);
    else el.style.removeProperty('--te-size');

    if (!el.getAttribute('style')) el.removeAttribute('style');
  });
}

export function toggleInline(command: InlineCommand): void {
  setCssStyling(true);
  document.execCommand(command);
}

export function queryInline(command: InlineCommand): boolean {
  try {
    return document.queryCommandState(command);
  } catch {
    return false;
  }
}

export function applyTextColor(root: HTMLElement, color: string): void {
  setCssStyling(true);
  document.execCommand('foreColor', false, color);
  syncInlineVars(root);
}

export function applyHighlight(color: string): void {
  setCssStyling(true);
  // hiliteColor 미지원 브라우저 대비로 backColor 를 함께 시도한다.
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
 *
 * styleWithCSS 가 켜져 있으면 execCommand('fontSize') 가 `font-size: xxx-large`
 * 같은 키워드 값을 넣어버려 이후 크기 조절이 먹지 않는다. 그래서 반드시 끄고
 * <font size="7"> 를 만든 뒤 px 단위 span 으로 바꿔친다.
 */
export function applyFontSize(root: HTMLElement, px: number): void {
  setCssStyling(false);
  document.execCommand('fontSize', false, FONT_SIZE_SENTINEL);

  root.querySelectorAll<HTMLElement>(`font[size="${FONT_SIZE_SENTINEL}"]`).forEach((fontEl) => {
    const span = document.createElement('span');
    span.style.fontSize = `${px}px`;
    while (fontEl.firstChild) span.appendChild(fontEl.firstChild);
    fontEl.parentNode?.replaceChild(span, fontEl);
  });

  // styleWithCSS 를 끄지 못하는 브라우저가 남긴 키워드 크기를 px 로 정리한다.
  root.querySelectorAll<HTMLElement>('span[style*="large"], span[style*="small"]').forEach((el) => {
    if (/^(xx-|x-|xxx-)?(large|small)$/.test(el.style.fontSize)) {
      el.style.fontSize = `${px}px`;
    }
  });

  syncInlineVars(root);
}

export function removeFormatting(root: HTMLElement): void {
  document.execCommand('removeFormat');
  root.querySelectorAll<HTMLElement>('span[style]').forEach((el) => {
    if (el.dataset.teRole) return;
    el.style.removeProperty('--te-ink');
    el.style.removeProperty('--te-size');
    if (!el.getAttribute('style')) el.removeAttribute('style');
  });
}

/**
 * 선택한 글 왼쪽에 색 있는 세로선을 붙인다.
 * 색은 --te-bar-color 로 들고 있어 나중에 색만 바꿀 수도 있다.
 */
export function applyBar(root: HTMLElement, color: string): void {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;

  // 이미 세로선 안이라면 색만 갈아 끼운다.
  const existing = barAtSelection(root);
  if (existing) {
    existing.style.setProperty('--te-bar-color', color);
    return;
  }

  const range = sel.getRangeAt(0);
  const span = document.createElement('span');
  span.className = 'te-bar';
  span.style.setProperty('--te-bar-color', color);
  try {
    span.appendChild(range.extractContents());
    range.insertNode(span);
  } catch {
    return;
  }
  sel.removeAllRanges();
  const next = document.createRange();
  next.selectNodeContents(span);
  sel.addRange(next);
}

/** 선택 영역이 속한 세로선 span */
export function barAtSelection(root: HTMLElement | null): HTMLElement | null {
  if (!root) return null;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  let node: Node | null = sel.getRangeAt(0).commonAncestorContainer;
  while (node && node !== root) {
    if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).classList.contains('te-bar')) {
      return node as HTMLElement;
    }
    node = node.parentNode;
  }
  return null;
}

export function removeBar(root: HTMLElement): void {
  const bar = barAtSelection(root);
  if (!bar) return;
  const parent = bar.parentNode;
  if (!parent) return;
  while (bar.firstChild) parent.insertBefore(bar.firstChild, bar);
  parent.removeChild(bar);
  root.normalize();
}

/** 커서 자리에 페이지 나눔선을 넣는다. 저장할 때 이 선을 기준으로 쪼갠다. */
export function insertPageBreak(root: HTMLElement): void {
  const sel = window.getSelection();
  const breakEl = document.createElement('div');
  breakEl.className = 'te-pagebreak';
  breakEl.dataset.tePageBreak = 'true';
  breakEl.dataset.exportIgnore = 'true';
  breakEl.contentEditable = 'false';

  let line: Node | null = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).startContainer : null;
  while (line && line.parentNode !== root) line = line.parentNode;

  if (line) root.insertBefore(breakEl, line.nextSibling);
  else root.appendChild(breakEl);

  // 나눔선 뒤에 바로 쓸 수 있도록 빈 줄을 하나 붙여 둔다.
  const line2 = document.createElement('div');
  line2.appendChild(document.createElement('br'));
  root.insertBefore(line2, breakEl.nextSibling);
}

export function pageBreakCount(root: HTMLElement | null): number {
  return root ? root.querySelectorAll('[data-te-page-break]').length : 0;
}

/** 본문에 적용된 모든 인라인 서식을 벗겨낸다 (역할 span 은 유지). */
export function stripAllFormatting(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('b, strong, i, em, u, s, strike, font, span.te-bar').forEach((el) => {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
  });
  root.querySelectorAll<HTMLElement>('span[style]').forEach((el) => {
    if (el.dataset.teRole) return;
    el.removeAttribute('style');
  });
  root.normalize();
}

/** 선택 영역이 속한 역할을 알아낸다. 역할 span 밖이면 서술로 본다. */
export function selectionRole(root: HTMLElement | null): Role {
  if (!hasSelectionInside(root)) return 'narration';
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return 'narration';

  let node: Node | null = sel.getRangeAt(0).commonAncestorContainer;
  while (node && node !== root) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const role = (node as HTMLElement).dataset.teRole;
      if (role) return role as Role;
    }
    node = node.parentNode;
  }
  return 'narration';
}

/** 선택된 텍스트 (캐릭터 이름 지정 등에 사용) */
export function selectionText(): string {
  return window.getSelection()?.toString().trim() ?? '';
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
