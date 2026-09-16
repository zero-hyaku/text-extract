import { useEffect, useState } from 'react';
import { HIGHLIGHT_SWATCHES } from '../defaults';
import {
  applyFontSize, applyHighlight, applyTextColor, clearHighlight,
  hasSelectionInside, queryInline, removeFormatting, selectionRole, selectionText,
  toggleInline, type InlineCommand,
} from '../lib/format';
import type { Role } from '../lib/parse';
import { useStore } from '../store';

interface Position { top: number; left: number; }

const INLINE_BUTTONS: Array<{ command: InlineCommand; label: string; title: string }> = [
  { command: 'bold', label: 'B', title: '볼드' },
  { command: 'italic', label: 'I', title: '이탤릭' },
  { command: 'underline', label: 'U', title: '밑줄' },
  { command: 'strikeThrough', label: 'S', title: '취소선' },
];

const ROLE_LABEL: Record<Role, string> = {
  dialogue: '대사',
  narration: '서술',
  name: '이름',
  emph: '강조 서술',
  mark: '강조 서술',
};

const TEXT_SWATCHES = ['#2b2b33', '#8b1e1e', '#1f4f8b', '#1e6b4a', '#7a4fa8', '#8b5a2b', '#8a8a95'];

type Panel = 'none' | 'color' | 'highlight' | 'size' | 'character';
/** 색을 '이 선택 영역만' 바꿀지, '같은 역할 전체'에 적용할지 */
type ColorScope = 'role' | 'selection';

export function SelectionPopup({
  editorRoot, boundary,
}: { editorRoot: HTMLElement | null; boundary: HTMLElement | null }) {
  const { settings, patch, upsertCharacter } = useStore();
  const [position, setPosition] = useState<Position | null>(null);
  const [active, setActive] = useState<Record<string, boolean>>({});
  const [panel, setPanel] = useState<Panel>('none');
  const [role, setRole] = useState<Role>('narration');
  const [scope, setScope] = useState<ColorScope>('role');
  const [picked, setPicked] = useState('');

  useEffect(() => {
    const update = () => {
      if (!editorRoot || !boundary) return;
      if (!hasSelectionInside(editorRoot)) {
        setPosition(null);
        setPanel('none');
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
      setRole(selectionRole(editorRoot));
      setPicked(selectionText());
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

  const refreshActive = () =>
    setActive(Object.fromEntries(INLINE_BUTTONS.map((b) => [b.command, queryInline(b.command)])));

  /** 역할 전체에 적용하면 사이드바 색상과 그대로 연동된다. */
  const setColor = (color: string) => {
    if (scope === 'selection') {
      applyTextColor(editorRoot, color);
      return;
    }
    if (role === 'dialogue') patch('roles', { dialogue: color });
    else if (role === 'name') patch('roles', { name: color });
    else if (role === 'emph' || role === 'mark') patch('roles', { emphasis: color });
    else patch('roles', { narration: color });
  };

  const baseSize = role === 'dialogue' ? settings.typography.dialogueFontSize : settings.typography.fontSize;
  const isCharacter = Boolean(settings.characters[picked]);

  return (
    <div
      className="selection-popup"
      style={{ top: position.top, left: position.left }}
      // 버튼을 누를 때 선택이 풀리지 않도록 mousedown 을 막는다.
      onMouseDown={(event) => event.preventDefault()}
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
          className={`popup-btn ${panel === 'color' ? 'is-active' : ''}`}
          onClick={() => setPanel((v) => (v === 'color' ? 'none' : 'color'))}
        >
          색
        </button>
        <button
          type="button"
          title="하이라이트"
          className={`popup-btn ${panel === 'highlight' ? 'is-active' : ''}`}
          onClick={() => setPanel((v) => (v === 'highlight' ? 'none' : 'highlight'))}
        >
          형광
        </button>
        <button
          type="button"
          title="글자 크기"
          className={`popup-btn ${panel === 'size' ? 'is-active' : ''}`}
          onClick={() => setPanel((v) => (v === 'size' ? 'none' : 'size'))}
        >
          크기
        </button>
        <button
          type="button"
          title="선택한 글자를 캐릭터로 지정"
          className={`popup-btn ${panel === 'character' ? 'is-active' : ''}`}
          onClick={() => setPanel((v) => (v === 'character' ? 'none' : 'character'))}
        >
          캐릭터
        </button>
        <span className="popup-divider" />
        <button type="button" title="서식 지우기" className="popup-btn"
          onClick={() => { removeFormatting(editorRoot); refreshActive(); }}>
          지우기
        </button>
      </div>

      {panel === 'color' ? (
        <div className="popup-sub popup-sub-column">
          <div className="popup-scope">
            <button
              type="button"
              className={scope === 'role' ? 'is-active' : ''}
              onClick={() => setScope('role')}
            >
              {ROLE_LABEL[role]} 전체
            </button>
            <button
              type="button"
              className={scope === 'selection' ? 'is-active' : ''}
              onClick={() => setScope('selection')}
            >
              선택 영역만
            </button>
          </div>
          <div className="popup-row">
            {TEXT_SWATCHES.map((color) => (
              <button
                key={color}
                type="button"
                className="swatch"
                style={{ background: color }}
                onClick={() => setColor(color)}
                title={color}
              />
            ))}
            <input type="color" className="swatch-picker" onChange={(e) => setColor(e.target.value)} />
          </div>
          <p className="popup-note">
            {scope === 'role'
              ? '사이드바의 색상 설정과 함께 바뀝니다.'
              : '이 영역에만 적용되며, 사이드바 색상보다 우선합니다.'}
          </p>
        </div>
      ) : null}

      {panel === 'highlight' ? (
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

      {panel === 'size' ? (
        <div className="popup-sub">
          {[-6, -3, -1, 1, 3, 6, 12].map((delta) => (
            <button
              key={delta}
              type="button"
              className="popup-btn slim"
              onClick={() => applyFontSize(editorRoot, Math.max(8, baseSize + delta))}
            >
              {baseSize + delta}
            </button>
          ))}
          <button type="button" className="popup-btn slim"
            onClick={() => applyFontSize(editorRoot, baseSize)}>
            기본 {baseSize}
          </button>
        </div>
      ) : null}

      {panel === 'character' ? (
        <div className="popup-sub popup-sub-column">
          <p className="popup-note">
            선택한 글자: <strong>{picked || '(없음)'}</strong>
          </p>
          <div className="popup-row">
            <button
              type="button"
              className="popup-btn slim"
              disabled={!picked || isCharacter}
              onClick={() => {
                upsertCharacter(picked, { color: settings.roles.name });
                setPanel('none');
              }}
            >
              {isCharacter ? '이미 등록됨' : '캐릭터로 추가'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
