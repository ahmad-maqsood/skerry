import { useState } from "react";
import { SettingsGroup } from "../../components/settings/SettingsGroup";
import { SettingsInput } from "../../components/settings/SettingsInput";
import { SettingsRow } from "../../components/settings/SettingsRow";
import { useTranslation } from "../../i18n";
import { diagnosticMessageKey } from "./diagnosticStatus";
import { MAX_SOURCE_NAME_LENGTH, sourceDisplayName } from "./sourceNames";
import { useMediaDiagnostics } from "./useMediaDiagnostics";
import { useSourceNames } from "./useSourceNames";
import "./MediaCompatibilitySection.css";

/** The player's own name, kept as typed until Enter or leaving the field saves it; empty clears it. */
function SourceNameInput({ saved, placeholder, ariaLabel, onCommit }: {
  saved: string; placeholder: string; ariaLabel: string; onCommit: (name: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const finish = () => {
    if (draft !== null) onCommit(draft);
    setDraft(null);
  };
  return (
    <SettingsInput
      value={draft ?? saved}
      placeholder={placeholder}
      aria-label={ariaLabel}
      maxLength={MAX_SOURCE_NAME_LENGTH}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={finish}
      onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
    />
  );
}

export function MediaCompatibilitySection() {
  const t = useTranslation();
  const { diagnostics, error } = useMediaDiagnostics();
  const { names, rename } = useSourceNames();
  const text = t.music.diagnostics;
  const footer = error ? <p>{error}</p> : diagnostics.players.length === 0 ? <p>{text.empty}</p> : <p>{t.music.sourceRenameHint}</p>;

  return (
    <SettingsGroup title={text.title} footer={footer}>
      {diagnostics.players.map((player) => {
        const key = diagnosticMessageKey(player.status);
        const message = key ? text[key] : undefined;
        const builtIn = player.label || player.sourceAppId;
        return (
          <SettingsRow
            key={player.sourceAppId}
            title={sourceDisplayName(names, player.sourceAppId, player.label)}
            description={message}
          >
            <SourceNameInput
              saved={names[player.sourceAppId] ?? ""}
              placeholder={builtIn}
              ariaLabel={t.music.sourceRenameLabel(builtIn)}
              onCommit={(name) => rename(player.sourceAppId, name)}
            />
          </SettingsRow>
        );
      })}
    </SettingsGroup>
  );
}
