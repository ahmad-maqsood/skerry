import { useSyncExternalStore } from "react";
import { ExternalLink } from "lucide-react";
import { SettingsGroup } from "../../components/settings/SettingsGroup";
import { SettingsLinkButton } from "../../components/settings/SettingsLinkButton";
import { SettingsRow } from "../../components/settings/SettingsRow";
import { ReleaseNotesList } from "../../features/changelog/ReleaseNotesList";
import { useReleaseNotes } from "../../features/changelog/useReleaseNotes";
import { ProjectLink } from "../../features/updater/ProjectLink";
import { PROJECT_RELEASES_URL } from "../../features/updater/projectLinks";
import { getUpdateState, subscribeToUpdate } from "../../features/updater/updaterController";
import { useTranslation } from "../../i18n";

/**
 * Changelog: what changed in every published version, from the project's GitHub releases. An update
 * installs without a page to read, so the notes live here; the saved list shows while GitHub loads,
 * and when it cannot be reached.
 */
export function ChangelogSettingsPage() {
  const t = useTranslation();
  const text = t.settings.changelog;
  const { releases, loading, error, fetchedAt, refresh } = useReleaseNotes();
  const { version } = useSyncExternalStore(subscribeToUpdate, getUpdateState);
  const failedWithoutList = error !== null && releases.length === 0;

  const status = loading && releases.length === 0
    ? text.loading
    : failedWithoutList ? text.failed
      : error !== null ? text.showingSaved
        : releases.length === 0 ? text.empty
          : text.loaded(releases.length);

  const lastUpdated = fetchedAt > 0 && releases.length > 0 ? text.lastUpdated(new Date(fetchedAt).toLocaleString()) : null;
  const description = [error, lastUpdated].filter(Boolean).join(" ") || undefined;

  return (
    <>
      <SettingsGroup>
        <SettingsRow
          title={<span role="status">{status}</span>}
          description={description}
          control={<SettingsLinkButton disabled={loading} onClick={refresh}>{text.refresh}</SettingsLinkButton>}
        />
      </SettingsGroup>
      <ReleaseNotesList releases={releases} installedVersion={version} />
      <SettingsGroup>
        <ProjectLink
          href={PROJECT_RELEASES_URL}
          title={text.allReleases}
          hint={text.allReleasesHint}
          icon={<ExternalLink className="project-link__icon" size={18} strokeWidth={1.5} absoluteStrokeWidth aria-hidden="true" />}
        />
      </SettingsGroup>
    </>
  );
}
