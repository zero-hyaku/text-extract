import { FONT_OPTIONS, HIGHLIGHT_SWATCHES } from '../../defaults';
import {
  applyFontSize, applyHighlight, applyTextColor, clearHighlight,
  removeFormatting, toggleInline,
} from '../../lib/format';
import { useStore } from '../../store';
import { ButtonGroup, Field, Hint, NumberSlider, Select } from '../ui';

export function TextPanel({ editorRoot }: { editorRoot: HTMLElement | null }) {
  const { settings, patch } = useStore();
  const t = settings.typography;
  const guard = (run: () => void) => () => {
    if (!editorRoot) return;
    run();
  };

  return (
    <>
      <Field label="선택 영역 서식" hint="드래그한 뒤 적용">
        <div className="inline-toolbar" onMouseDown={(e) => e.preventDefault()}>
          <button type="button" className="cmd-bold" title="볼드" onClick={guard(() => toggleInline('bold'))}>B</button>
          <button type="button" className="cmd-italic" title="이탤릭" onClick={guard(() => toggleInline('italic'))}>I</button>
          <button type="button" className="cmd-underline" title="밑줄" onClick={guard(() => toggleInline('underline'))}>U</button>
          <button type="button" className="cmd-strikeThrough" title="취소선" onClick={guard(() => toggleInline('strikeThrough'))}>S</button>
          <button type="button" title="서식 지우기" onClick={guard(removeFormatting)}>지우기</button>
        </div>
      </Field>

      <Field label="하이라이트">
        <div className="swatch-row" onMouseDown={(e) => e.preventDefault()}>
          {HIGHLIGHT_SWATCHES.map((color) => (
            <button
              key={color}
              type="button"
              className="swatch"
              style={{ background: color }}
              title={color}
              onClick={guard(() => applyHighlight(color))}
            />
          ))}
          <input type="color" className="swatch-picker" onChange={(e) => applyHighlight(e.target.value)} />
          <button
            type="button"
            className="swatch-clear"
            onClick={guard(() => editorRoot && clearHighlight(editorRoot))}
          >
            없음
          </button>
        </div>
      </Field>

      <Field label="선택 영역 글자 색">
        <div className="swatch-row" onMouseDown={(e) => e.preventDefault()}>
          {['#2b2b33', '#8b1e1e', '#1f4f8b', '#1e6b4a', '#7a4fa8', '#8b5a2b', '#8a8a95'].map((color) => (
            <button
              key={color}
              type="button"
              className="swatch"
              style={{ background: color }}
              title={color}
              onClick={guard(() => applyTextColor(color))}
            />
          ))}
          <input type="color" className="swatch-picker" onChange={(e) => applyTextColor(e.target.value)} />
        </div>
      </Field>

      <Field label="선택 영역 글자 크기">
        <div className="inline-toolbar" onMouseDown={(e) => e.preventDefault()}>
          {[-4, -2, 2, 4, 8].map((delta) => (
            <button
              key={delta}
              type="button"
              onClick={guard(() => editorRoot && applyFontSize(editorRoot, Math.max(8, t.fontSize + delta)))}
            >
              {delta > 0 ? `+${delta}` : delta}
            </button>
          ))}
        </div>
      </Field>

      <hr className="divider" />

      <Select
        label="글꼴"
        value={t.fontFamily}
        options={FONT_OPTIONS}
        onChange={(fontFamily) => patch('typography', { fontFamily })}
      />
      <Select
        label="굵기"
        value={t.fontWeight}
        options={[
          { label: '가늘게 (300)', value: 300 },
          { label: '보통 (400)', value: 400 },
          { label: '중간 (500)', value: 500 },
          { label: '굵게 (700)', value: 700 },
        ]}
        onChange={(fontWeight) => patch('typography', { fontWeight })}
      />
      <NumberSlider label="텍스트 크기" value={t.fontSize} min={10} max={64}
        onChange={(fontSize) => patch('typography', { fontSize })} />
      <NumberSlider label="행간" value={t.lineHeight} min={1} max={4} step={0.05} unit="배"
        onChange={(lineHeight) => patch('typography', { lineHeight })} />
      <NumberSlider label="자간" value={t.letterSpacing} min={-3} max={12} step={0.1}
        onChange={(letterSpacing) => patch('typography', { letterSpacing })} />
      <NumberSlider label="장평" value={t.horizontalScale} min={0.6} max={1.6} step={0.01} unit="배"
        hint="가로 폭 배율" onChange={(horizontalScale) => patch('typography', { horizontalScale })} />
      <NumberSlider label="문단 간격" value={t.paragraphGap} min={0} max={80}
        onChange={(paragraphGap) => patch('typography', { paragraphGap })} />
      <NumberSlider label="첫 줄 들여쓰기" value={t.indent} min={0} max={80}
        onChange={(indent) => patch('typography', { indent })} />

      <ButtonGroup
        label="정렬"
        value={t.textAlign}
        options={[
          { label: '왼쪽', value: 'left' as const },
          { label: '가운데', value: 'center' as const },
          { label: '오른쪽', value: 'right' as const },
          { label: '양쪽', value: 'justify' as const },
        ]}
        onChange={(textAlign) => patch('typography', { textAlign })}
      />
      <ButtonGroup
        label="줄바꿈"
        value={t.wordBreak}
        options={[
          { label: '단어 단위', value: 'keep-all' as const },
          { label: '글자 단위', value: 'break-all' as const },
        ]}
        onChange={(wordBreak) => patch('typography', { wordBreak })}
      />
      <Hint>장평은 넓은 폭으로 줄바꿈을 계산한 뒤 가로로 눌러 맞추므로, 값을 바꾸면 줄바꿈 위치도 함께 바뀝니다.</Hint>
    </>
  );
}
