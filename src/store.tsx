import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from 'react';
import { DEFAULT_SETTINGS, SAMPLE_CONTENT } from './defaults';
import type { CharacterStyle, Settings } from './types';

const SETTINGS_KEY = 'text-extract:settings:v1';
const CONTENT_KEY = 'text-extract:content:v1';

type Plain = Record<string, unknown>;
const isPlainObject = (v: unknown): v is Plain =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * 저장된 설정을 기본값 위에 덮어쓴다. 기능이 추가되어 키가 늘어나도
 * 예전에 저장된 서식을 그대로 불러올 수 있게 하기 위함이다.
 */
export function mergeSettings(base: Settings, incoming: unknown): Settings {
  const merge = (a: unknown, b: unknown): unknown => {
    if (!isPlainObject(a) || !isPlainObject(b)) return b === undefined ? a : b;
    const out: Plain = { ...a };
    for (const [key, value] of Object.entries(b)) {
      if (value === undefined) continue;
      out[key] = key in a ? merge(a[key], value) : value;
    }
    return out;
  };
  // characters 는 사용자가 정의한 자유 키라 병합이 아니라 통째로 교체한다.
  const result = merge(base, incoming) as Settings;
  if (isPlainObject(incoming) && isPlainObject((incoming as Plain).characters)) {
    result.characters = (incoming as unknown as Settings).characters;
  }
  return result;
}

function readStoredSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return mergeSettings(DEFAULT_SETTINGS, JSON.parse(raw));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function readStoredContent(): string {
  try {
    return localStorage.getItem(CONTENT_KEY) ?? SAMPLE_CONTENT;
  } catch {
    return SAMPLE_CONTENT;
  }
}

interface StoreValue {
  settings: Settings;
  setSettings: (updater: (prev: Settings) => Settings) => void;
  /** settings 의 한 섹션만 부분 수정한다. */
  patch: <K extends keyof Settings>(section: K, value: Partial<Settings[K]>) => void;
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  replaceSettings: (next: Settings) => void;
  resetSettings: () => void;
  upsertCharacter: (name: string, value: Partial<CharacterStyle>) => void;
  /** 에디터 초기 내용 (마운트 시 1회 주입) */
  initialContent: string;
  saveContent: (html: string) => void;
  /** 배경 이미지 위치를 드래그로 조절하는 중인지 (저장하지 않음) */
  adjustingImage: boolean;
  setAdjustingImage: (value: boolean) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<Settings>(readStoredSettings);
  const [adjustingImage, setAdjustingImage] = useState(false);
  const initialContent = useRef(readStoredContent()).current;

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      } catch {
        /* 저장 공간이 없거나 차단된 환경 — 미리보기는 그대로 동작한다 */
      }
    }, 250);
    return () => window.clearTimeout(id);
  }, [settings]);

  const setSettings = useCallback((updater: (prev: Settings) => Settings) => {
    setSettingsState(updater);
  }, []);

  const patch = useCallback<StoreValue['patch']>((section, value) => {
    setSettingsState((prev) => ({
      ...prev,
      [section]: { ...(prev[section] as object), ...(value as object) },
    }));
  }, []);

  const set = useCallback<StoreValue['set']>((key, value) => {
    setSettingsState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const replaceSettings = useCallback((next: Settings) => {
    setSettingsState(mergeSettings(DEFAULT_SETTINGS, next));
  }, []);

  const resetSettings = useCallback(() => setSettingsState(DEFAULT_SETTINGS), []);

  const upsertCharacter = useCallback((name: string, value: Partial<CharacterStyle>) => {
    setSettingsState((prev) => {
      const existing = prev.characters[name] ?? {
        name, color: prev.roles.name, dialogueColor: '', avatar: '', isMe: false,
      };
      return {
        ...prev,
        characters: { ...prev.characters, [name]: { ...existing, ...value, name } },
      };
    });
  }, []);

  const saveContent = useCallback((html: string) => {
    try {
      localStorage.setItem(CONTENT_KEY, html);
    } catch {
      /* 무시 */
    }
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      settings, setSettings, patch, set, replaceSettings, resetSettings,
      upsertCharacter, initialContent, saveContent, adjustingImage, setAdjustingImage,
    }),
    [settings, setSettings, patch, set, replaceSettings, resetSettings,
     upsertCharacter, initialContent, saveContent, adjustingImage],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore 는 StoreProvider 안에서만 사용할 수 있습니다.');
  return ctx;
}
