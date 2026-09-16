import { toBlob, toPng } from 'html-to-image';
import type { ExportOptions } from '../types';

/** 내보내기에서 제외할 요소 (플레이스홀더, 안내 배지 등) */
function exportFilter(node: HTMLElement): boolean {
  return !(node.dataset && node.dataset.exportIgnore === 'true');
}

/**
 * 배경 영상은 정적 이미지로 캡처할 수 없다.
 * 내보내기 직전에 현재 프레임을 캔버스로 떠서 임시 이미지로 덮어둔다.
 */
function freezeVideos(root: HTMLElement): () => void {
  const undos: Array<() => void> = [];
  root.querySelectorAll('video').forEach((video) => {
    if (!video.videoWidth || !video.videoHeight) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    try {
      ctx.drawImage(video, 0, 0);
    } catch {
      return; // 교차 출처 영상 — 캡처 불가
    }
    const frame = document.createElement('img');
    frame.src = canvas.toDataURL('image/png');
    frame.style.cssText = video.style.cssText;
    frame.className = video.className;
    video.parentNode?.insertBefore(frame, video);
    const previousDisplay = video.style.display;
    video.style.display = 'none';
    undos.push(() => {
      frame.remove();
      video.style.display = previousDisplay;
    });
  });
  return () => undos.forEach((undo) => undo());
}

async function withPreparedNode<T>(node: HTMLElement, run: () => Promise<T>): Promise<T> {
  const restore = freezeVideos(node);
  try {
    // 웹폰트가 준비되기 전에 캡처하면 글꼴이 바뀐 채로 저장된다.
    if (document.fonts?.ready) await document.fonts.ready;
    return await run();
  } finally {
    restore();
  }
}

function triggerDownload(url: string, fileName: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function safeName(name: string): string {
  const cleaned = name.trim().replace(/[\\/:*?"<>|]/g, '_');
  return cleaned || '발췌';
}

export async function exportNode(node: HTMLElement, options: ExportOptions): Promise<void> {
  const { format, scale, quality, fileName } = options;
  const base = safeName(fileName);

  await withPreparedNode(node, async () => {
    const shared = {
      pixelRatio: scale,
      cacheBust: true,
      filter: exportFilter,
      width: node.offsetWidth,
      height: node.offsetHeight,
    };

    if (format === 'pdf') {
      // jsPDF 는 무거우므로 PDF 를 실제로 저장할 때만 불러온다.
      const { default: jsPDF } = await import('jspdf');
      const dataUrl = await toPng(node, shared);
      const width = node.offsetWidth;
      const height = node.offsetHeight;
      const pdf = new jsPDF({
        orientation: width >= height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [width, height],
        compress: true,
      });
      pdf.addImage(dataUrl, 'PNG', 0, 0, width, height);
      pdf.save(`${base}.pdf`);
      return;
    }

    const blob = await toBlob(node, {
      ...shared,
      type: format === 'jpeg' ? 'image/jpeg' : 'image/png',
      quality: format === 'jpeg' ? quality : undefined,
      backgroundColor: format === 'jpeg' ? '#ffffff' : undefined,
    });
    if (!blob) throw new Error('이미지를 생성하지 못했습니다.');

    const url = URL.createObjectURL(blob);
    triggerDownload(url, `${base}.${format === 'jpeg' ? 'jpg' : 'png'}`);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}

/** 클립보드 복사 (PNG). 지원하지 않는 브라우저에서는 false 를 돌려준다. */
export async function copyNodeToClipboard(node: HTMLElement, scale: number): Promise<boolean> {
  if (!navigator.clipboard || typeof ClipboardItem === 'undefined') return false;
  return withPreparedNode(node, async () => {
    const blob = await toBlob(node, { pixelRatio: scale, cacheBust: true, filter: exportFilter });
    if (!blob) return false;
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return true;
  });
}

/** 파일을 data: URL 로 읽는다 (배경 이미지·프로필 업로드용) */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
