import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { installAllFonts } from '../lib/fonts';
import { History } from '../lib/history';
import { collectCharacters } from '../lib/parse';
import { useStore } from '../store';
import { Editor, readPlainText } from './Editor';
import { MessengerView } from './MessengerView';
import { Preview } from './Preview';
import { SelectionPopup } from './SelectionPopup';
import { Sidebar } from './Sidebar';
import { Stickers } from './Stickers';

const MIN_SIDEBAR = 280;
const MAX_SIDEBAR = 640;
const ZOOM_STEPS = [0.25, 0.4, 0.5, 0.65, 0.8, 1, 1.25, 1.5, 2, 3];

export function App() {
  const { settings, set, setSettings, initialContent, saveContent, setSelectedSticker } = useStore();
  const [editorRoot, setEditorRoot] = useState<HTMLDivElement | null>(null);
  const [captureNode, setCaptureNode] = useState<HTMLDivElement | null>(null);
  const [stageNode, setStageNode] = useState<HTMLElement | null>(null);
  const [plainText, setPlainText] = useState('');
  /** 확대한 미리보기가 차지할 자리를 잡으려면 실제 높이를 알아야 한다. */
  const [previewHeight, setPreviewHeight] = useState(0);
  const saveTimer = useRef<number | undefined>(undefined);

  /**
   * 에디터는 테마를 바꿀 때 언마운트된다. 가장 최근 내용을 여기에 담아 두고
   * 다시 마운트될 때 그대로 돌려줘야 편집한 본문과 서식이 살아남는다.
   */
  const liveHtml = useRef(initialContent);

  /* 되돌리기 — 본문과 설정을 한 덩어리로 묶어 함께 되돌린다 */
  const history = useRef(new History()).current;
  const [historyState, setHistoryState] = useState({ undo: false, redo: false });
  const pushTimer = useRef<number | undefined>(undefined);
  const editorRootRef = useRef<HTMLDivElement | null>(null);

  const refreshHistoryButtons = useCallback(() => {
    setHistoryState({ undo: history.canUndo, redo: history.canRedo });
  }, [history]);

  const recordHistory = useCallback(() => {
    window.clearTimeout(pushTimer.current);
    pushTimer.current = window.setTimeout(() => {
      if (history.push({ html: liveHtml.current, settings })) refreshHistoryButtons();
    }, 450);
  }, [history, settings, refreshHistoryButtons]);

  const applySnapshot = useCallback((snapshot: ReturnType<History['undo']>) => {
    if (!snapshot) return;
    history.restoring = true;
    liveHtml.current = snapshot.html;
    const root = editorRootRef.current;
    if (root) {
      root.innerHTML = snapshot.html;
      setPlainText(readPlainText(root));
    }
    setSettings(() => snapshot.settings);
    saveContent(snapshot.html);
    refreshHistoryButtons();
    window.setTimeout(() => { history.restoring = false; }, 120);
  }, [history, setSettings, saveContent, refreshHistoryButtons]);

  const undo = useCallback(() => applySnapshot(history.undo()), [applySnapshot, history]);
  const redo = useCallback(() => applySnapshot(history.redo()), [applySnapshot, history]);

  // 설정이 바뀌어도 기록을 남긴다 (사이드바 서식까지 되돌리기 위함)
  useEffect(() => { recordHistory(); }, [settings, recordHistory]);
  useEffect(() => () => window.clearTimeout(pushTimer.current), []);

  const detectedNames = useMemo(() => collectCharacters(plainText), [plainText]);

  const handleHtmlChange = useCallback((html: string) => {
    liveHtml.current = html;
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => saveContent(html), 600);
    recordHistory();
  }, [saveContent, recordHistory]);

  useEffect(() => () => window.clearTimeout(saveTimer.current), []);

  // 저장해 둔 사용자 글꼴을 문서에 다시 심는다.
  useEffect(() => { void installAllFonts(settings.customFonts); }, [settings.customFonts]);

  /**
   * transform: scale 은 레이아웃 크기를 바꾸지 않는다.
   * 확대한 만큼 자리를 잡아 주지 않으면 미리보기가 아래 도구 막대를 덮어버린다.
   */
  useEffect(() => {
    if (!captureNode) return;
    const observer = new ResizeObserver(() => setPreviewHeight(captureNode.offsetHeight));
    observer.observe(captureNode);
    setPreviewHeight(captureNode.offsetHeight);
    return () => observer.disconnect();
  }, [captureNode]);

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

  /* 미리보기 확대·축소 */
  const zoom = settings.previewZoom;
  const stepZoom = (direction: 1 | -1) => {
    const index = ZOOM_STEPS.findIndex((value) => Math.abs(value - zoom) < 0.001);
    const base = index >= 0 ? index : ZOOM_STEPS.indexOf(1);
    const next = ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, Math.max(0, base + direction))];
    set('previewZoom', next);
  };
  /** 작업 영역 폭에 맞춰 배율을 정한다 */
  const zoomToFit = () => {
    if (!stageNode) return;
    const available = stageNode.clientWidth - 64;
    set('previewZoom', Math.min(1, Math.max(0.1, available / settings.layout.width)));
  };

  const isMessenger = settings.theme === 'messenger';
  const isEmpty = plainText.trim().length === 0;

  return (
    <div
      className={`app layout-${settings.sidebarSide}`}
      data-app-theme={settings.appTheme}
      style={{ ['--sidebar-width' as string]: `${settings.sidebarWidth}px` }}
    >
      <Sidebar
        editorRoot={editorRoot}
        captureNode={captureNode}
        detectedNames={detectedNames}
        onUndo={undo}
        onRedo={redo}
        canUndo={historyState.undo}
        canRedo={historyState.redo}
      />

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
          {/* 확대해도 스크롤 범위가 맞도록 배율만큼 자리를 잡아 둔다 */}
          <div
            className="zoom-frame"
            style={{
              width: settings.layout.width * zoom,
              height: previewHeight > 0 ? previewHeight * zoom : undefined,
              ['--preview-zoom' as string]: String(zoom),
            }}
            onPointerDown={(event) => {
              if (!(event.target as HTMLElement).closest('.sticker')) setSelectedSticker(null);
            }}
          >
            <div className="zoom-inner" style={{ transform: `scale(${zoom})` }}>
              <Preview settings={settings} captureRef={setCaptureNode}>
                {isMessenger ? (
                  <MessengerView plainText={plainText} settings={settings} />
                ) : (
                  <div className="editor-wrap">
                    <Editor
                      initialContent={liveHtml.current}
                      autoParse={settings.autoParse}
                      tidyBlankLines={settings.tidyBlankLines}
                      onRootChange={(node) => { editorRootRef.current = node; setEditorRoot(node); }}
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
                <Stickers zoom={zoom} />
              </Preview>
            </div>
          </div>

          <div className="zoom-bar" data-export-ignore="true">
            <button type="button" onClick={() => stepZoom(-1)} title="축소" disabled={zoom <= ZOOM_STEPS[0]}>−</button>
            <span className="zoom-value">{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => stepZoom(1)} title="확대" disabled={zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]}>+</button>
            <span className="zoom-sep" />
            <button type="button" onClick={() => set('previewZoom', 1)}>100%</button>
            <button type="button" onClick={zoomToFit}>화면 맞춤</button>
          </div>

          <p className="stage-caption" data-export-ignore="true">
            {isMessenger
              ? '메신저 테마 — 본문 수정은 기본 테마에서 합니다.'
              : '미리보기 영역에 직접 입력·붙여넣기 하고, 텍스트를 드래그하면 편집 팝업이 열립니다.'}
          </p>
        </div>

        {!isMessenger ? (
          <SelectionPopup editorRoot={editorRoot} boundary={stageNode} zoom={zoom} />
        ) : null}
      </main>
    </div>
  );
}
