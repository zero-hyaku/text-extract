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

/** 본문에 적용된 모든 인라인 서식을 벗겨낸다 (역할 span 은 유지). */
export function stripAllFormatting(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('b, strong, i, em, u, s, strike, font').forEach((el) => {
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
