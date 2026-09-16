import { useState } from 'react';
import { readFileAsDataUrl } from '../../lib/exporters';
import { useStore } from '../../store';
import { ColorField, FileButton, Hint, Toggle } from '../ui';

export function ColorPanel({ detectedNames }: { detectedNames: string[] }) {
  const { settings, patch, upsertCharacter, setSettings } = useStore();
  const roles = settings.roles;
  const [newName, setNewName] = useState('');

  const known = new Set(Object.keys(settings.characters));
  const missing = detectedNames.filter((name) => !known.has(name));

  const registerAll = () => {
    setSettings((prev) => {
      const next = { ...prev.characters };
      for (const name of missing) {
        next[name] = { name, color: prev.roles.name, dialogueColor: '', avatar: '', isMe: false };
      }
      return { ...prev, characters: next };
    });
  };

  const removeCharacter = (name: string) => {
    setSettings((prev) => {
      const next = { ...prev.characters };
      delete next[name];
      return { ...prev, characters: next };
    });
  };

  return (
    <>
      <Toggle
        label="대사 / 서술 자동 구분"
        checked={roles.enabled}
        onChange={(enabled) => patch('roles', { enabled })}
        hint='따옴표 안은 대사, *…* 는 강조 서술'
      />
      <ColorField label="서술 색" value={roles.narration} onChange={(narration) => patch('roles', { narration })} />
      <ColorField label="대사 색" value={roles.dialogue} onChange={(dialogue) => patch('roles', { dialogue })} />
      <ColorField label="캐릭터 이름 색" value={roles.name} onChange={(name) => patch('roles', { name })} />
      <ColorField label="강조 서술 색" value={roles.emphasis} onChange={(emphasis) => patch('roles', { emphasis })} />
      <Toggle label="대사 기울임" checked={roles.dialogueItalic}
        onChange={(dialogueItalic) => patch('roles', { dialogueItalic })} />
      <Toggle label="강조 서술 기울임" checked={roles.emphasisItalic}
        onChange={(emphasisItalic) => patch('roles', { emphasisItalic })} />
      <hr className="divider" />

      <div className="panel-head">
        <span>캐릭터</span>
        {missing.length > 0 ? (
          <button type="button" className="mini-button" onClick={registerAll}>
            본문에서 {missing.length}명 추가
          </button>
        ) : null}
      </div>

      <div className="button-row">
        <input
          type="text"
          value={newName}
          placeholder="캐릭터 이름 직접 추가"
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || !newName.trim()) return;
            e.preventDefault();
            upsertCharacter(newName.trim(), { color: roles.name });
            setNewName('');
          }}
        />
        <button
          type="button"
          className="mini-button"
          disabled={!newName.trim()}
          onClick={() => {
            upsertCharacter(newName.trim(), { color: roles.name });
            setNewName('');
          }}
        >
          추가
        </button>
      </div>

      {Object.values(settings.characters).length === 0 ? (
        <Hint>
          본문에서 이름을 드래그해 팝업의 <strong>캐릭터</strong> 버튼으로 추가하거나, 위 칸에 직접 입력하세요.
          본문에 <code>이름: "대사"</code> 형태로 쓰면 자동으로도 찾아냅니다.
          캐릭터마다 이름 색과 대사 색을 따로 정할 수 있고, 대사 색을 비워 두면 공통 대사 색을 씁니다.
        </Hint>
      ) : null}

      <div className="character-list">
        {Object.values(settings.characters).map((character) => (
          <div className="character-row" key={character.name}>
            <div
              className="character-avatar"
              style={{
                background: character.avatar
                  ? `center/cover no-repeat url(${character.avatar})`
                  : character.color,
              }}
            >
              {character.avatar ? '' : character.name.slice(0, 1)}
            </div>
            <div className="character-main">
              <div className="character-name">{character.name}</div>
              <div className="character-controls">
                <label className="mini-color" title="이름 색">
                  <span>이름</span>
                  <input
                    type="color"
                    value={/^#[0-9a-f]{6}$/i.test(character.color) ? character.color : '#000000'}
                    onChange={(e) => upsertCharacter(character.name, { color: e.target.value })}
                  />
                </label>
                <label className="mini-color" title="이 캐릭터의 대사 색">
                  <span>대사</span>
                  <input
                    type="color"
                    value={/^#[0-9a-f]{6}$/i.test(character.dialogueColor)
                      ? character.dialogueColor
                      : roles.dialogue}
                    onChange={(e) => upsertCharacter(character.name, { dialogueColor: e.target.value })}
                  />
                </label>
                {character.dialogueColor ? (
                  <button type="button" className="mini-button"
                    onClick={() => upsertCharacter(character.name, { dialogueColor: '' })}>
                    대사색 해제
                  </button>
                ) : null}
                <FileButton
                  label="프로필"
                  accept="image/*"
                  onPick={async (file) => {
                    upsertCharacter(character.name, { avatar: await readFileAsDataUrl(file) });
                  }}
                />
                {character.avatar ? (
                  <button type="button" className="mini-button"
                    onClick={() => upsertCharacter(character.name, { avatar: '' })}>
                    이미지 해제
                  </button>
                ) : null}
                <label className="mini-check">
                  <input
                    type="checkbox"
                    checked={character.isMe}
                    onChange={(e) => upsertCharacter(character.name, { isMe: e.target.checked })}
                  />
                  내 쪽
                </label>
                <button type="button" className="mini-button danger"
                  onClick={() => removeCharacter(character.name)}>
                  삭제
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
