import { useSyncExternalStore } from "react";
import { Download } from "lucide-react";
import { SettingsGroup } from "../../components/settings/SettingsGroup";
import { SettingsLinkButton } from "../../components/settings/SettingsLinkButton";
import { SettingsRow } from "../../components/settings/SettingsRow";
import { SettingsToggleRow } from "../../components/settings/SettingsToggleRow";
import { useTranslation } from "../../i18n";
import {
  checkForUpdate,
  getUpdateState,
  installUpdate,
  setAutoUpdate,
  subscribeToUpdate,
  type UpdateState,
} from "./updaterController";
import { ProjectLink } from "./ProjectLink";
import { PROJECT_LATEST_RELEASE_URL } from "./projectLinks";
import "./ProjectSettingsSection.css";

type AutoUpdateText = ReturnType<typeof useTranslation>["settings"]["project"]["autoUpdate"];

function statusText(state: UpdateState, text: AutoUpdateText) {
  const { stage, nextVersion, downloaded, total, detail } = state;
  switch (stage) {
    case "checking": return text.checking;
    case "latest": return text.latest;
    case "available": return text.available(nextVersion);
    case "downloading": return text.downloading(nextVersion, total > 0 ? Math.min(100, Math.round(downloaded / total * 100)) : null);
    case "ready": return text.ready(nextVersion);
    case "installing": return text.installing;
    case "done": return text.done;
    case "error": return text.error(detail);
    case "disabled": return text.disabled;
    default: return text.idle;
  }
}

/**
 * Settings → About → updates: the automatic-update switch, then the current status
 * with a manual check, which stays here whether or not automatic updates are on; it
 * is the way in for anyone who turned the todo list off. A found update adds a row
 * to install it now. The Microsoft Store version shows why it can't update itself,
 * with a link to the GitHub download.
 */
export function UpdateSettingsSection() {
  const project = useTranslation().settings.project;
  const text = project.autoUpdate;
  const state = useSyncExternalStore(subscribeToUpdate, getUpdateState);
  const { stage, autoUpdate, nextVersion, storeBuild } = state;
  const working = stage === "checking" || stage === "downloading" || stage === "installing";
  const installable = stage === "ready" || stage === "available";
  const report = (error: unknown) => console.error("Failed to reach the updater", error);

  if (storeBuild) {
    const store = project.storeUpdate;
    return (
      <SettingsGroup>
        <SettingsRow title={store.title} description={store.reason} />
        <ProjectLink
          href={PROJECT_LATEST_RELEASE_URL}
          title={store.linkTitle}
          hint={store.linkHint}
          icon={<Download className="project-link__icon" size={16} aria-hidden="true" />}
        />
      </SettingsGroup>
    );
  }

  return (
    <SettingsGroup>
      <SettingsToggleRow
        title={text.title}
        description={text.hint}
        checked={autoUpdate}
        onChange={setAutoUpdate}
      />
      <SettingsRow
        title={text.status}
        description={<span role="status">{statusText(state, text)}</span>}
        control={
          <SettingsLinkButton disabled={working || stage === "disabled" || stage === "done"} onClick={() => void checkForUpdate().catch(report)}>
            {text.check}
          </SettingsLinkButton>
        }
      />
      {installable && (
        <SettingsRow
          title={text.readyTitle(nextVersion)}
          description={text.readyHint}
          control={<SettingsLinkButton onClick={() => void installUpdate().catch(report)}>{text.installNow}</SettingsLinkButton>}
        />
      )}
    </SettingsGroup>
  );
}
