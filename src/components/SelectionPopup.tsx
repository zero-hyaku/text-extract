import { useEffect, useRef, useState } from 'react';
import { HIGHLIGHT_SWATCHES } from '../defaults';
import {
  applyFontSize, applyHighlight, applyTextColor, clearHighlight,
  hasSelectionInside, queryInline, removeFormatting, toggleInline,
  type InlineCommand,
} from '../lib/format';

interface Position { top: number; left: number; }

const INLINE_BUTTONS: Array<{ command: InlineCommand; label: string; title: string }> = [
  { command: 'bold', label: 'B', title: '볼드' },
  { command: 'italic', label: 'I', title: '이탤릭' },
  { command: 'underline', label: 'U', title: '밑줄' },
  { command: 'strikeThrough', label: 'S', title: '취소선' },
];

/** 드래그로 선택한 텍스트 위에 뜨는 편집 팝업 */
export function SelectionPopup({
  editorRoot, boundary, fontSize,
}: { editorRoot: HTMLElement | null; boundary: HTMLElement | null; fontSize: number }) {
  const popupRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [active, setActive] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<'none' | 'color' | 'highlight' | 'size'>('none');

  useEffect(() => {
    const update = () => {
      if (!editorRoot || !boundary) return;
      if (!hasSelectionInside(editorRoot)) {
        setPosition(null);
        setExpanded('none');
        return;
      }
      const sel = window.getSelection();
      const rect = sel?.getRangeAt(0).getBoundingClientRect();
      if (!rect || (rect.width === 0 && rect.height === 0)) {
        setPosition(null);
        return;
      }
      const host = boundary.getBoundingClientRect();
      setPosition({
        top: rect.top - host.top - 12,
        left: rect.left - host.left + rect.width / 2,
      });
      setActive(Object.fromEntries(INLINE_BUTTONS.map((b) => [b.command, queryInline(b.command)])));
    };

    document.addEventListener('selectionchange', update);
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      document.removeEventListener('selectionchange', update);
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [editorRoot, boundary]);

  if (!position || !editorRoot) return null;

  // 버튼을 누를 때 선택이 풀리지 않도록 mousedown 을 막는다.
  const keepSelection = (event: React.MouseEvent) => event.preventDefault();

  const refreshActive = () =>
    setActive(Object.fromEntries(INLINE_BUTTONS.map((b) => [b.command, queryInline(b.command)])));

  return (
    <div
      ref={popupRef}
      className="selection-popup"
      style={{ top: position.top, left: position.left }}
      onMouseDown={keepSelection}
      data-export-ignore="true"
    >
      <div className="popup-main">
        {INLINE_BUTTONS.map((button) => (
          <button
            key={button.command}
            type="button"
            title={button.title}
            className={`popup-btn cmd-${button.command} ${active[button.command] ? 'is-active' : ''}`}
            onClick={() => { toggleInline(button.command); refreshActive(); }}
          >
            {button.label}
          </button>
        ))}
        <span className="popup-divider" />
        <button
          type="button"
          title="글자 색"
          className={`popup-btn ${expanded === 'color' ? 'is-active' : ''}`}
          onClick={() => setExpanded((v) => (v === 'color' ? 'none' : 'color'))}
        >
          색
        </button>
        <button
          type="button"
          title="하이라이트"
          className={`popup-btn ${expanded === 'highlight' ? 'is-active' : ''}`}
          onClick={() => setExpanded((v) => (v === 'highlight' ? 'none' : 'highlight'))}
        >
          형광
        </button>
        <button
          type="button"
          title="글자 크기"
          className={`popup-btn ${expanded === 'size' ? 'is-active' : ''}`}
          onClick={() => setExpanded((v) => (v === 'size' ? 'none' : 'size'))}
        >
          크기
        </button>
        <span className="popup-divider" />
        <button type="button" title="서식 지우기" className="popup-btn" onClick={() => { removeFormatting(); refreshActive(); }}>
          지우기
        </button>
      </div>

      {expanded === 'color' ? (
        <div className="popup-sub">
          {['#2b2b33', '#8b1e1e', '#1f4f8b', '#1e6b4a', '#7a4fa8', '#8b5a2b', '#8a8a95'].map((color) => (
            <button
              key={color}
              type="button"
              className="swatch"
              style={{ background: color }}
              onClick={() => applyTextColor(color)}
              title={color}
            />
          ))}
          <input type="color" className="swatch-picker" onChange={(e) => applyTextColor(e.target.value)} />
        </div>
      ) : null}

      {expanded === 'highlight' ? (
        <div className="popup-sub">
          {HIGHLIGHT_SWATCHES.map((color) => (
            <button
              key={color}
              type="button"
              className="swatch"
              style={{ background: color }}
              onClick={() => applyHighlight(color)}
              title={color}
            />
          ))}
          <input type="color" className="swatch-picker" onChange={(e) => applyHighlight(e.target.value)} />
          <button type="button" className="popup-btn slim" onClick={() => clearHighlight(editorRoot)}>없음</button>
        </div>
      ) : null}

      {expanded === 'size' ? (
        <div className="popup-sub">
          {[-6, -3, -1, 0, 1, 3, 6, 12].map((delta) => (
            <button
              key={delta}
              type="button"
              className="popup-btn slim"
              onClick={() => applyFontSize(editorRoot, Math.max(8, fontSize + delta))}
            >
              {delta === 0 ? '기본' : `${fontSize + delta}`}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
