import { SettingsGroup } from "../../components/settings/SettingsGroup";
import { useTranslation } from "../../i18n";
import { ReleaseNoteBody } from "./ReleaseNoteBody";
import { isInstalledTag, releaseHighlights } from "./releaseText";
import type { ReleaseNote } from "./types";
import "./ReleaseNotesList.css";

/** The release's date in the app's language; empty when it has none or it cannot be read. */
function releaseDate(iso: string, localeTag: string) {
  const date = new Date(iso);
  return iso === "" || Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat(localeTag, { dateStyle: "medium" }).format(date);
}

/** One card per release, newest first: its title, the date and what changed. */
export function ReleaseNotesList({ releases, installedVersion }: { releases: readonly ReleaseNote[]; installedVersion: string }) {
  const t = useTranslation();
  const text = t.settings.changelog;

  return (
    <>
      {releases.map((release) => {
        const date = releaseDate(release.publishedAt, t.localeTag);
        const highlights = releaseHighlights(release.body);
        return (
          <SettingsGroup
            key={release.tag}
            title={release.name}
            action={
              <span className="changelog-meta">
                {isInstalledTag(release.tag, installedVersion) && <span className="changelog-chip changelog-chip--installed">{text.installed}</span>}
                {release.prerelease && <span className="changelog-chip">{text.preRelease}</span>}
                {date && <span className="changelog-meta__date">{text.releasedOn(date)}</span>}
              </span>
            }
          >
            {highlights === ""
              ? <p className="changelog-note__empty">{text.noDetails}</p>
              : <ReleaseNoteBody markdown={highlights} openFailed={t.settings.project.openFailed} />}
          </SettingsGroup>
        );
      })}
    </>
  );
}
