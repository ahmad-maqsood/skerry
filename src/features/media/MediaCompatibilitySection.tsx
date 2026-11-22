import { SettingsGroup } from "../../components/settings/SettingsGroup";
import { SettingsRow } from "../../components/settings/SettingsRow";
import { useTranslation } from "../../i18n";
import { diagnosticMessageKey } from "./diagnosticStatus";
import { useMediaDiagnostics } from "./useMediaDiagnostics";
import "./MediaCompatibilitySection.css";

export function MediaCompatibilitySection() {
  const t = useTranslation();
  const { diagnostics, error } = useMediaDiagnostics();
  const text = t.music.diagnostics;
  const footer = error ? <p>{error}</p> : diagnostics.players.length === 0 ? <p>{text.empty}</p> : null;

  return (
    <SettingsGroup title={text.title} footer={footer}>
      {diagnostics.players.map((player) => {
        const key = diagnosticMessageKey(player.status);
        const message = key ? text[key] : undefined;
        return (
          <SettingsRow
            key={player.sourceAppId}
            title={player.label || player.sourceAppId}
            description={message}
          />
        );
      })}
    </SettingsGroup>
  );
}
