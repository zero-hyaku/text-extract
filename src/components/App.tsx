import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { installAllFonts } from '../lib/fonts';
import { collectCharacters } from '../lib/parse';
import { useStore } from '../store';
import { Editor } from './Editor';
import { MessengerView } from './MessengerView';
import { Preview } from './Preview';
import { SelectionPopup } from './SelectionPopup';
import { Sidebar } from './Sidebar';

const MIN_SIDEBAR = 280;
const MAX_SIDEBAR = 640;

export function App() {
  const { settings, set, initialContent, saveContent } = useStore();
  const [editorRoot, setEditorRoot] = useState<HTMLDivElement | null>(null);
  const [captureNode, setCaptureNode] = useState<HTMLDivElement | null>(null);
  const [stageNode, setStageNode] = useState<HTMLElement | null>(null);
  const [plainText, setPlainText] = useState('');
  const saveTimer = useRef<number | undefined>(undefined);

  /**
   * 에디터는 테마를 바꿀 때 언마운트된다. 가장 최근 내용을 여기에 담아 두고
   * 다시 마운트될 때 그대로 돌려줘야 편집한 본문과 서식이 살아남는다.
   */
  const liveHtml = useRef(initialContent);

  const detectedNames = useMemo(() => collectCharacters(plainText), [plainText]);

  const handleHtmlChange = useCallback((html: string) => {
    liveHtml.current = html;
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => saveContent(html), 600);
  }, [saveContent]);

  useEffect(() => () => window.clearTimeout(saveTimer.current), []);

  // 저장해 둔 사용자 글꼴을 문서에 다시 심는다.
  useEffect(() => { void installAllFonts(settings.customFonts); }, [settings.customFonts]);

  /* 사이드바 폭 드래그 */
  const dragging = useRef(false);
  const startResize = (event: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onResize = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const next = settings.sidebarSide === 'left'
      ? event.clientX
      : window.innerWidth - event.clientX;
    set('sidebarWidth', Math.round(Math.min(MAX_SIDEBAR, Math.max(MIN_SIDEBAR, next))));
  };
  const endResize = (event: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const isMessenger = settings.theme === 'messenger';
  const isEmpty = plainText.trim().length === 0;

  return (
    <div
      className={`app layout-${settings.sidebarSide}`}
      data-app-theme={settings.appTheme}
      style={{ ['--sidebar-width' as string]: `${settings.sidebarWidth}px` }}
    >
      <Sidebar editorRoot={editorRoot} captureNode={captureNode} detectedNames={detectedNames} />

      <div
        className="sidebar-resizer"
        role="separator"
        aria-orientation="vertical"
        aria-label="사이드바 너비 조절"
        onPointerDown={startResize}
        onPointerMove={onResize}
        onPointerUp={endResize}
        onPointerCancel={endResize}
        onDoubleClick={() => set('sidebarWidth', 336)}
      />

      <main className="stage" ref={setStageNode}>
        <div className="stage-inner">
          <Preview settings={settings} captureRef={setCaptureNode}>
            {isMessenger ? (
              <MessengerView plainText={plainText} settings={settings} />
            ) : (
              <div className="editor-wrap">
                <Editor
                  initialContent={liveHtml.current}
                  autoParse={settings.autoParse}
                  tidyBlankLines={settings.tidyBlankLines}
                  onRootChange={setEditorRoot}
                  onTextChange={setPlainText}
                  onHtmlChange={handleHtmlChange}
                />
                {isEmpty ? (
                  <p className="editor-placeholder" data-export-ignore="true">
                    여기에 본문을 붙여넣거나 바로 입력하세요.
                  </p>
                ) : null}
              </div>
            )}
          </Preview>

          <p className="stage-caption" data-export-ignore="true">
            {isMessenger
              ? '메신저 테마 — 본문 수정은 기본 테마에서 합니다.'
              : '미리보기 영역에 직접 입력·붙여넣기 하고, 텍스트를 드래그하면 편집 팝업이 열립니다.'}
          </p>
        </div>

        {!isMessenger ? (
          <SelectionPopup editorRoot={editorRoot} boundary={stageNode} />
        ) : null}
      </main>
    </div>
  );
}
