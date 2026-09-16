export type SidebarSide = 'left' | 'right';
export type ThemeId = 'plain' | 'messenger';
export type AlignX = 'left' | 'center' | 'right' | 'justify';
export type AlignY = 'top' | 'center' | 'bottom';

export interface Typography {
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  paragraphGap: number;
  /** 장평: 가로 폭 배율 (scaleX) */
  horizontalScale: number;
  textAlign: AlignX;
  /** keep-all = 단어 단위 줄바꿈, break-all = 글자 단위 줄바꿈 */
  wordBreak: 'keep-all' | 'break-all';
  indent: number;
}

export interface RoleColors {
  enabled: boolean;
  narration: string;
  dialogue: string;
  name: string;
  /** *…* 로 감싼 강조 서술 */
  emphasis: string;
  emphasisItalic: boolean;
  /** 대사 기울임 */
  dialogueItalic: boolean;
  /** 캐릭터별 색을 대사에도 적용 */
  perCharacterDialogue: boolean;
}

export type BackgroundType = 'solid' | 'gradient' | 'image' | 'video';

export interface Background {
  type: BackgroundType;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  gradientAngle: number;
  /** data: URL 또는 외부 주소 (gif 포함) */
  imageUrl: string;
  imageFit: 'cover' | 'contain' | 'repeat';
  videoUrl: string;
  overlayColor: string;
  overlayOpacity: number;
  blur: number;
}

export type RatioMode = 'auto' | 'fixed';

export interface Layout {
  width: number;
  padTop: number;
  padRight: number;
  padBottom: number;
  padLeft: number;
  ratioMode: RatioMode;
  ratioW: number;
  ratioH: number;
  alignY: AlignY;
  radius: number;
}

export interface Meta {
  showTitle: boolean;
  title: string;
  titleSize: number;
  titleColor: string;
  showSubtitle: boolean;
  subtitle: string;
  subtitleSize: number;
  subtitleColor: string;
  showAuthor: boolean;
  author: string;
  authorSize: number;
  authorColor: string;
  align: Exclude<AlignX, 'justify'>;
  position: 'top' | 'bottom';
  gap: number;
  divider: boolean;
}

export interface Messenger {
  bubbleRadius: number;
  bubbleColor: string;
  bubbleTextColor: string;
  myBubbleColor: string;
  myBubbleTextColor: string;
  showProfile: boolean;
  profileSize: number;
  showName: boolean;
  nameSize: number;
  bubbleMaxWidth: number;
  gap: number;
  narrationStyle: 'plain' | 'muted' | 'hidden';
}

export interface CharacterStyle {
  name: string;
  color: string;
  /** data: URL 프로필 이미지. 비어 있으면 이름 색상의 원형으로 대체 */
  avatar: string;
  isMe: boolean;
}

export interface ExportOptions {
  format: 'png' | 'jpeg' | 'pdf';
  scale: number;
  quality: number;
  fileName: string;
}

export interface Settings {
  sidebarSide: SidebarSide;
  theme: ThemeId;
  autoParse: boolean;
  /** 붙여넣을 때 빈 줄을 정리해 문단 간격만으로 띄우기 */
  tidyBlankLines: boolean;
  typography: Typography;
  roles: RoleColors;
  background: Background;
  layout: Layout;
  meta: Meta;
  messenger: Messenger;
  characters: Record<string, CharacterStyle>;
  exportOptions: ExportOptions;
}

/** 내보내기/불러오기용 서식 파일 포맷 */
export interface PresetFile {
  kind: 'text-extract-preset';
  version: 1;
  savedAt: string;
  name: string;
  settings: Settings;
}
