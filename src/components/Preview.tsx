import { useMemo, type CSSProperties, type ReactNode } from 'react';
import type { Settings } from '../types';

function escapeAttr(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/** 캐릭터별 이름/대사 색상을 동적 CSS 규칙으로 만든다. */
function characterCss(settings: Settings): string {
  const { characters, roles } = settings;
  if (!roles.enabled) return '';
  return Object.values(characters)
    .map((character) => {
      const name = escapeAttr(character.name);
      const rules = [`.te-capture [data-te-role="name"][data-te-speaker="${name}"]{color:${character.color};}`];
      if (roles.perCharacterDialogue) {
        rules.push(`.te-capture [data-te-role="dialogue"][data-te-speaker="${name}"]{color:${character.color};}`);
      }
      return rules.join('');
    })
    .join('');
}

function backgroundLayer(settings: Settings): ReactNode {
  const bg = settings.background;
  const spread = bg.blur > 0 ? -(bg.blur * 2 + 8) : 0;
  const base: CSSProperties = {
    position: 'absolute',
    inset: `${spread}px`,
    filter: bg.blur > 0 ? `blur(${bg.blur}px)` : undefined,
  };

  switch (bg.type) {
    case 'gradient':
      return (
        <div
          className="bg-layer"
          style={{ ...base, background: `linear-gradient(${bg.gradientAngle}deg, ${bg.gradientFrom}, ${bg.gradientTo})` }}
        />
      );
    case 'image':
      if (!bg.imageUrl) return <div className="bg-layer" style={{ ...base, background: bg.color }} />;
      return (
        <div
          className="bg-layer"
          style={{
            ...base,
            backgroundColor: bg.color,
            backgroundImage: `url("${bg.imageUrl}")`,
            backgroundSize: bg.imageFit === 'repeat' ? 'auto' : bg.imageFit,
            backgroundRepeat: bg.imageFit === 'repeat' ? 'repeat' : 'no-repeat',
            backgroundPosition: 'center',
          }}
        />
      );
    case 'video':
      if (!bg.videoUrl) return <div className="bg-layer" style={{ ...base, background: bg.color }} />;
      return (
        <div className="bg-layer" style={{ ...base, backgroundColor: bg.color, overflow: 'hidden' }}>
          <video
            src={bg.videoUrl}
            autoPlay
            loop
            muted
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      );
    default:
      return <div className="bg-layer" style={{ ...base, background: bg.color }} />;
  }
}

function MetaBlock({ settings }: { settings: Settings }) {
  const { meta } = settings;
  const visible = (meta.showTitle && meta.title) || (meta.showSubtitle && meta.subtitle) || (meta.showAuthor && meta.author);
  if (!visible) return null;

  return (
    <div className={`meta-block meta-${meta.position}`} style={{ textAlign: meta.align, gap: `${Math.round(meta.gap / 4)}px` }}>
      {meta.showTitle && meta.title ? (
        <div className="meta-title" style={{ fontSize: `${meta.titleSize}px`, color: meta.titleColor }}>{meta.title}</div>
      ) : null}
      {meta.showSubtitle && meta.subtitle ? (
        <div className="meta-subtitle" style={{ fontSize: `${meta.subtitleSize}px`, color: meta.subtitleColor }}>{meta.subtitle}</div>
      ) : null}
      {meta.showAuthor && meta.author ? (
        <div className="meta-author" style={{ fontSize: `${meta.authorSize}px`, color: meta.authorColor }}>{meta.author}</div>
      ) : null}
      {meta.divider ? <div className="meta-divider" style={{ background: meta.subtitleColor, opacity: 0.35 }} /> : null}
    </div>
  );
}

interface PreviewProps {
  settings: Settings;
  captureRef: (node: HTMLDivElement | null) => void;
  children: ReactNode;
}

export function Preview({ settings, captureRef, children }: PreviewProps) {
  const { layout, typography, roles, background, meta } = settings;
  const scale = typography.horizontalScale;

  const css = useMemo(() => characterCss(settings), [settings]);

  const frameStyle: CSSProperties = {
    width: `${layout.width}px`,
    minHeight: layout.ratioMode === 'fixed'
      ? `${Math.round((layout.width * layout.ratioH) / layout.ratioW)}px`
      : undefined,
    borderRadius: `${layout.radius}px`,
    // 역할 색상은 CSS 변수로 넘겨 다시 파싱하지 않고도 즉시 반영되게 한다.
    ['--te-narration' as string]: roles.narration,
    ['--te-dialogue' as string]: roles.dialogue,
    ['--te-name' as string]: roles.name,
    ['--te-emph' as string]: roles.emphasis,
    ['--te-emph-style' as string]: roles.emphasisItalic ? 'italic' : 'normal',
    ['--te-dialogue-style' as string]: roles.dialogueItalic ? 'italic' : 'normal',
    ['--te-paragraph-gap' as string]: `${typography.paragraphGap}px`,
  };

  const contentStyle: CSSProperties = {
    paddingTop: `${layout.padTop}px`,
    paddingRight: `${layout.padRight}px`,
    paddingBottom: `${layout.padBottom}px`,
    paddingLeft: `${layout.padLeft}px`,
    justifyContent: layout.alignY === 'top' ? 'flex-start' : layout.alignY === 'center' ? 'center' : 'flex-end',
  };

  const typeStyle: CSSProperties = {
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight,
    fontSize: `${typography.fontSize}px`,
    lineHeight: typography.lineHeight,
    letterSpacing: `${typography.letterSpacing}px`,
    textAlign: typography.textAlign,
    wordBreak: typography.wordBreak,
    overflowWrap: typography.wordBreak === 'break-all' ? 'anywhere' : 'break-word',
    textIndent: `${typography.indent}px`,
    color: roles.enabled ? roles.narration : '#2b2b33',
  };

  // 장평: 넓은 폭으로 줄바꿈을 계산한 뒤 가로로 눌러 실제 폭에 맞춘다.
  const scaleStyle: CSSProperties = scale === 1
    ? {}
    : { width: `${100 / scale}%`, transform: `scaleX(${scale})`, transformOrigin: '0 0' };

  return (
    <div
      ref={captureRef}
      className={`te-capture ${roles.enabled ? '' : 'roles-off'}`}
      style={frameStyle}
    >
      {css ? <style>{css}</style> : null}
      {backgroundLayer(settings)}
      {background.overlayOpacity > 0 ? (
        <div
          className="bg-overlay"
          style={{ background: background.overlayColor, opacity: background.overlayOpacity }}
        />
      ) : null}

      <div className="te-content" style={contentStyle}>
        {meta.position === 'top' ? <MetaBlock settings={settings} /> : null}
        <div className="te-scale" style={scaleStyle}>
          <div className="te-type" style={typeStyle}>{children}</div>
        </div>
        {meta.position === 'bottom' ? <MetaBlock settings={settings} /> : null}
      </div>
    </div>
  );
}
