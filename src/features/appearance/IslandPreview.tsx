import { useTranslation } from "../../i18n";
import type { IslandSettings } from "./types";
import { islandPreviewStyle } from "./islandPreviewStyle";
import { useResolvedScheme } from "./useDocumentTheme";
import "./IslandPreview.css";

/**
 * Appearance, first: the island drawn from the current settings, collapsed and expanded, on a
 * colourful wallpaper so opacity and glass show. Both show a sample todo: collapsed, the bar with
 * its title; expanded, a short list of sample rows. A drawing with sample content, not the island
 * itself; the variables mirror windows/island/stageStyle.ts, which features cannot import.
 */
export function IslandPreview({ settings }: { settings: IslandSettings }) {
  const text = useTranslation().settings.appearance.preview;
  const { style, islandClass, tone } = islandPreviewStyle(settings, useResolvedScheme(settings.colorScheme));

  return (
    <figure
      className={`island-preview island-preview--font-${settings.fontFamily}`}
      data-tone={tone}
      style={style}
      aria-label={text.label}
    >
      <div className="island-preview__desktop">
        <div className={`${islandClass} island-preview__island--collapsed`}>
          <span className="island-preview__pulse" />
          {settings.showCollapsedText && <span className="island-preview__task">{text.samples.first}</span>}
        </div>
        <figcaption className="island-preview__caption">{text.collapsed}</figcaption>
      </div>
      <div className="island-preview__desktop">
        <div className={`${islandClass} island-preview__island--expanded`}>
          <ul className="island-preview__rows">
            {[text.samples.first, text.samples.second, text.samples.third].map((title, index) => (
              <li key={title} className={`island-preview__row${index === 2 ? " island-preview__row--done" : ""}`}>
                <span className="island-preview__check" />
                <span className="island-preview__task">{title}</span>
              </li>
            ))}
          </ul>
        </div>
        <figcaption className="island-preview__caption">{text.expanded}</figcaption>
      </div>
    </figure>
  );
}
