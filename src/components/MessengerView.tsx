import { useMemo } from 'react';
import { parseScript, splitEmphasis } from '../lib/parse';
import type { Settings } from '../types';

function initial(name: string): string {
  return name.trim().slice(0, 1) || '·';
}

export function MessengerView({ plainText, settings }: { plainText: string; settings: Settings }) {
  const blocks = useMemo(() => parseScript(plainText), [plainText]);
  const { messenger, characters, roles, typography } = settings;

  return (
    <div className="messenger" style={{ gap: `${messenger.gap}px` }}>
      {blocks.map((block, index) => {
        if (block.kind === 'narration') {
          if (messenger.narrationStyle === 'hidden') return null;
          return (
            <p
              key={index}
              className={`msg-narration ${messenger.narrationStyle === 'muted' ? 'is-muted' : ''}`}
              style={{
                color: roles.enabled ? roles.narration : undefined,
                fontSize: `${typography.fontSize}px`,
                lineHeight: typography.lineHeight,
                letterSpacing: `${typography.letterSpacing}px`,
              }}
            >
              {splitEmphasis(block.text).map((part, partIndex) => (
                part.emph
                  ? <em key={partIndex} className="msg-emph">{part.text}</em>
                  : <span key={partIndex}>{part.text}</span>
              ))}
            </p>
          );
        }

        const character = characters[block.name];
        const isMe = character?.isMe ?? false;
        const nameColor = character?.color ?? roles.name;

        return (
          <div key={index} className={`msg-line ${isMe ? 'is-me' : ''}`}>
            {messenger.showProfile && !isMe ? (
              <div
                className="msg-avatar"
                style={{
                  width: `${messenger.profileSize}px`,
                  height: `${messenger.profileSize}px`,
                  background: character?.avatar ? `center/cover no-repeat url(${character.avatar})` : nameColor,
                  fontSize: `${Math.round(messenger.profileSize * 0.44)}px`,
                }}
              >
                {character?.avatar ? '' : initial(block.name)}
              </div>
            ) : null}

            <div className="msg-body" style={{ maxWidth: `${messenger.bubbleMaxWidth}%` }}>
              {messenger.showName && block.name && !isMe ? (
                <div className="msg-name" style={{ color: nameColor, fontSize: `${messenger.nameSize}px` }}>
                  {block.name}
                </div>
              ) : null}
              <div
                className="msg-bubble"
                style={{
                  borderRadius: `${messenger.bubbleRadius}px`,
                  background: character?.bubbleColor
                    || (isMe ? messenger.myBubbleColor : messenger.bubbleColor),
                  color: character?.bubbleTextColor
                    || (isMe ? messenger.myBubbleTextColor : messenger.bubbleTextColor),
                  fontSize: `${typography.fontSize}px`,
                  lineHeight: typography.lineHeight,
                  letterSpacing: `${typography.letterSpacing}px`,
                  fontStyle: roles.dialogueItalic ? 'italic' : undefined,
                  wordBreak: typography.wordBreak,
                }}
              >
                {block.text}
              </div>
            </div>
          </div>
        );
      })}

      {blocks.length === 0 ? (
        <p className="msg-empty" data-export-ignore="true">
          본문을 입력하면 대사가 말풍선으로 바뀝니다.
        </p>
      ) : null}
    </div>
  );
}
