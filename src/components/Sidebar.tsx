import { useStore } from '../store';
import { Section, Toggle } from './ui';
import { TextPanel } from './panels/TextPanel';
import { ColorPanel } from './panels/ColorPanel';
import { BackgroundPanel } from './panels/BackgroundPanel';
import { LayoutPanel } from './panels/LayoutPanel';
import { MetaPanel } from './panels/MetaPanel';
import { ThemePanel } from './panels/ThemePanel';
import { ExportPanel } from './panels/ExportPanel';

interface SidebarProps {
  editorRoot: HTMLElement | null;
  captureNode: HTMLElement | null;
  detectedNames: string[];
}

export function Sidebar({ editorRoot, captureNode, detectedNames }: SidebarProps) {
  const { settings, set } = useStore();

  return (
    <aside className={`sidebar side-${settings.sidebarSide}`}>
      <header className="sidebar-head">
        <div className="sidebar-title">
          <h1>텍스트 발췌기</h1>
          <button
            type="button"
            className="icon-button"
            title={settings.appTheme === 'dark' ? '라이트 모드로' : '다크 모드로'}
            onClick={() => set('appTheme', settings.appTheme === 'dark' ? 'light' : 'dark')}
          >
            {settings.appTheme === 'dark' ? '☀' : '☾'}
          </button>
        </div>
        <button
          type="button"
          className="side-switch"
          title="사이드바 위치 바꾸기"
          onClick={() => set('sidebarSide', settings.sidebarSide === 'left' ? 'right' : 'left')}
        >
          {settings.sidebarSide === 'left' ? '사이드바 → 오른쪽' : '사이드바 → 왼쪽'}
        </button>
      </header>

      <div className="sidebar-scroll">
        <div className="sidebar-top">
          <Toggle
            label="입력하는 동안 대사 자동 인식"
            checked={settings.autoParse}
            onChange={(autoParse) => set('autoParse', autoParse)}
          />
          <Toggle
            label="결과물에서 * 기호 감추기"
            checked={settings.hideEmphasisMarks}
            onChange={(hideEmphasisMarks) => set('hideEmphasisMarks', hideEmphasisMarks)}
            hint="강조 서식은 그대로 두고 별표만 숨깁니다"
          />
          <Toggle
            label="붙여넣을 때 빈 줄 정리"
            checked={settings.tidyBlankLines}
            onChange={(tidyBlankLines) => set('tidyBlankLines', tidyBlankLines)}
            hint="문단 사이는 '문단 간격' 값으로 띄웁니다"
          />
        </div>

        <Section title="본문 (텍스트)" defaultOpen>
          <TextPanel editorRoot={editorRoot} />
        </Section>
        <Section title="색상 / 캐릭터" badge={detectedNames.length ? `${detectedNames.length}명` : undefined}>
          <ColorPanel detectedNames={detectedNames} />
        </Section>
        <Section title="배경">
          <BackgroundPanel />
        </Section>
        <Section title="이미지 영역">
          <LayoutPanel />
        </Section>
        <Section title="제목 / 제작자">
          <MetaPanel />
        </Section>
        <Section title="테마">
          <ThemePanel />
        </Section>
        <Section title="저장 / 내보내기" defaultOpen>
          <ExportPanel captureNode={captureNode} editorRoot={editorRoot} />
        </Section>
      </div>
    </aside>
  );
}
