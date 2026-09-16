import { useCallback, useEffect, useRef } from 'react';
import { collapseBlankLines, markupRoles } from '../lib/parse';
import { restoreCaret, saveCaret } from '../lib/caret';
import { insertPlainText } from '../lib/format';

export function plainToHtml(text: string): string {
  const escape = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => `<div>${line ? escape(line) : '<br>'}</div>`)
    .join('');
}

interface EditorProps {
  initialContent: string;
  autoParse: boolean;
  tidyBlankLines: boolean;
  onRootChange: (node: HTMLDivElement | null) => void;
  onTextChange: (plainText: string) => void;
  onHtmlChange: (html: string) => void;
}

export function Editor({
  initialContent, autoParse, tidyBlankLines, onRootChange, onTextChange, onHtmlChange,
}: EditorProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const composingRef = useRef(false);
  const timerRef = useRef<number | undefined>(undefined);

  /** 역할 마크업을 다시 씌운다. 결과가 같으면 DOM 을 건드리지 않아 커서·되돌리기가 보존된다. */
  const remark = useCallback(() => {
    const root = rootRef.current;
    if (!root || composingRef.current) return;

    const probe = root.cloneNode(true) as HTMLDivElement;
    markupRoles(probe);
    if (probe.innerHTML !== root.innerHTML) {
      const caret = saveCaret(root);
      markupRoles(root);
      restoreCaret(root, caret);
    }
  }, []);

  const publish = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    onTextChange(root.innerText);
    onHtmlChange(root.innerHTML);
  }, [onTextChange, onHtmlChange]);

  const scheduleWork = useCallback(() => {
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      if (autoParse) remark();
      publish();
    }, 400);
  }, [autoParse, remark, publish]);

  // 최초 1회만 내용을 주입한다. 이후로는 DOM 이 원본이다.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.innerHTML = initialContent.includes('<')
      ? initialContent
      : plainToHtml(tidyBlankLines ? collapseBlankLines(initialContent) : initialContent);
    markupRoles(root);
    publish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // autoParse 를 켜면 즉시 한 번 적용하고, 끄면 마크업을 그대로 둔다.
  useEffect(() => {
    if (autoParse) remark();
  }, [autoParse, remark]);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  return (
    <div
      ref={(node) => {
        rootRef.current = node;
        onRootChange(node);
      }}
      className="editor"
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      role="textbox"
      aria-multiline="true"
      aria-label="본문"
      onInput={scheduleWork}
      onCompositionStart={() => { composingRef.current = true; }}
      onCompositionEnd={() => { composingRef.current = false; scheduleWork(); }}
      onBlur={() => {
        window.clearTimeout(timerRef.current);
        if (autoParse) remark();
        publish();
      }}
      onPaste={(event) => {
        event.preventDefault();
        const pasted = event.clipboardData.getData('text/plain');
        insertPlainText(tidyBlankLines ? collapseBlankLines(pasted) : pasted);
        window.clearTimeout(timerRef.current);
        if (autoParse) remark();
        publish();
      }}
    />
  );
}
