import { readFileAsDataUrl } from '../../lib/exporters';
import { useStore } from '../../store';
import { ColorField, FileButton, Hint, Toggle } from '../ui';

export function ColorPanel({ detectedNames }: { detectedNames: string[] }) {
  const { settings, patch, upsertCharacter, setSettings } = useStore();
  const roles = settings.roles;

  const known = new Set(Object.keys(settings.characters));
  const missing = detectedNames.filter((name) => !known.has(name));

  const registerAll = () => {
    setSettings((prev) => {
      const next = { ...prev.characters };
      for (const name of missing) {
        next[name] = { name, color: prev.roles.name, avatar: '', isMe: false };
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
      <Toggle label="캐릭터 색을 대사에도 적용" checked={roles.perCharacterDialogue}
        onChange={(perCharacterDialogue) => patch('roles', { perCharacterDialogue })} />

      <hr className="divider" />

      <div className="panel-head">
        <span>캐릭터</span>
        {missing.length > 0 ? (
          <button type="button" className="mini-button" onClick={registerAll}>
            본문에서 {missing.length}명 추가
          </button>
        ) : null}
      </div>

      {Object.values(settings.characters).length === 0 ? (
        <Hint>
          본문에 <code>이름: "대사"</code> 형태로 쓰면 캐릭터를 자동으로 찾아냅니다.
          여기서 색과 프로필 이미지를 지정하면 메신저 테마에도 함께 반영됩니다.
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
                <input
                  type="color"
                  value={/^#[0-9a-f]{6}$/i.test(character.color) ? character.color : '#000000'}
                  onChange={(e) => upsertCharacter(character.name, { color: e.target.value })}
                />
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
