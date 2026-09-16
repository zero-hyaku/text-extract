import { useEffect, useMemo, useRef, useState } from 'react';
import { collectCharacters } from '../lib/parse';
import { useStore } from '../store';
import { Editor } from './Editor';
import { MessengerView } from './MessengerView';
import { Preview } from './Preview';
import { SelectionPopup } from './SelectionPopup';
import { Sidebar } from './Sidebar';

export function App() {
  const { settings, initialContent, saveContent } = useStore();
  const [editorRoot, setEditorRoot] = useState<HTMLDivElement | null>(null);
  const [captureNode, setCaptureNode] = useState<HTMLDivElement | null>(null);
  const [stageNode, setStageNode] = useState<HTMLElement | null>(null);
  const [plainText, setPlainText] = useState('');
  const saveTimer = useRef<number | undefined>(undefined);

  const detectedNames = useMemo(() => collectCharacters(plainText), [plainText]);

  const handleHtmlChange = (html: string) => {
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => saveContent(html), 600);
  };

  useEffect(() => () => window.clearTimeout(saveTimer.current), []);

  const isMessenger = settings.theme === 'messenger';
  const isEmpty = plainText.trim().length === 0;

  return (
    <div className={`app layout-${settings.sidebarSide}`}>
      <Sidebar editorRoot={editorRoot} captureNode={captureNode} detectedNames={detectedNames} />

      <main className="stage" ref={setStageNode}>
        <div className="stage-inner">
          <Preview settings={settings} captureRef={setCaptureNode}>
            {isMessenger ? (
              <MessengerView plainText={plainText} settings={settings} />
            ) : (
              <div className="editor-wrap">
                <Editor
                  initialContent={initialContent}
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
