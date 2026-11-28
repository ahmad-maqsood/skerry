import { useCallback, useEffect, useState } from "react";
import { AppearanceSettingsPage } from "./AppearanceSettingsPage";
import { DEFAULT_SETTINGS_CATEGORY, type SettingsCategory } from "./categories";
import type { SettingsSearchTarget } from "./searchSettings";
import { findSettingsTarget, revealSettingsTarget } from "./settingsJump";
import { GeneralSettingsPage } from "./GeneralSettingsPage";
import { ClipboardSettingsPage } from "./ClipboardSettingsPage";
import { LayoutEditor } from "./LayoutEditor";
import { MusicSettingsPage } from "./MusicSettingsPage";
import { MessagesSettingsPage } from "./MessagesSettingsPage";
import { PluginsSettingsPage } from "./PluginsSettingsPage";
import { SETTINGS_FOCUS_STORAGE_KEY, takeFocusRequest, requestPanelPreview } from "./storage";
import { TodosSettingsPage } from "./TodosSettingsPage";
import { TranslationSettingsPage } from "./TranslationSettingsPage";
import { AdvancedSettingsPage } from "./AdvancedSettingsPage";
import { AboutSettingsPage } from "./AboutSettingsPage";
import { ChangelogSettingsPage } from "./ChangelogSettingsPage";
import { SettingsErrorBoundary } from "./SettingsErrorBoundary";
import { SystemSettingsPage } from "../../features/system-monitor/SystemSettingsPage.tsx";
import { DEFAULT_SETTINGS, withAppearanceFrom } from "../../features/appearance/settings";
import { ResetAppearanceButton } from "../../features/appearance/ResetAppearanceButton";
import { withColorBackup } from "../../features/appearance/storage";
import type { IslandSettings } from "../../features/appearance/types";
import type { SystemNotificationsController } from "../../features/messages/system-notifications/useSystemNotifications";
import { useSaveDirectorySetting } from "../../features/todos/useSaveDirectorySetting";
import { useLocale } from "../../i18n";

/**
 * Every settings page with its sidebar. Shown as a page of the island or in the
 * standalone settings window; the host owns the settings and where they are saved.
 */
export function SettingsPanel({
  settings,
  onSettingsChange,
  systemNotifications,
  detached,
  onDetachedChange,
  onContentHeight,
}: {
  settings: IslandSettings;
  onSettingsChange: (settings: IslandSettings | ((current: IslandSettings) => IslandSettings)) => void;
  systemNotifications: SystemNotificationsController;
  /** Whether settings open in their own window (General → Separate settings window). */
  detached: boolean;
  onDetachedChange: (detached: boolean) => void;
  /** As a page of the island: told the height the open page needs, to size the island to it. */
  onContentHeight?: (height: number) => void;
}) {
  const { locale, setLocale } = useLocale();
  const setSettings = onSettingsChange;
  const saveDirectory = useSaveDirectorySetting();
  const [category, setCategory] = useState<SettingsCategory>(DEFAULT_SETTINGS_CATEGORY);
  const highlightSaveDirectory = saveDirectory.highlight;
  // A picked search result: opens its page, then scrolls to the group or row and marks it for a moment.
  const [searchJump, setSearchJump] = useState<{ target: SettingsSearchTarget; id: number } | null>(null);
  const jumpToSearchResult = useCallback((target: SettingsSearchTarget) => {
    setCategory(target.page);
    setSearchJump((previous) => ({ target, id: (previous?.id ?? 0) + 1 }));
  }, []);
  useEffect(() => {
    if (!searchJump || searchJump.target.page !== category) return;
    let undo: (() => void) | undefined;
    // After the page has rendered (it is keyed by page, so a new page mounts first).
    const frame = window.requestAnimationFrame(() => {
      const panel = document.querySelector<HTMLElement>(".editor-panel");
      const found = panel ? findSettingsTarget(panel, searchJump.target) : null;
      if (found) undo = revealSettingsTarget(found);
    });
    return () => { window.cancelAnimationFrame(frame); undo?.(); };
  }, [searchJump, category]);

  // The island asks for the save path when an export has nowhere to go; it lives on the todos page.
  const focusSavePath = useCallback(() => {
    setCategory("todos");
    highlightSaveDirectory();
  }, [highlightSaveDirectory]);
  // A part of the island (or the translation window) asked for one of the pages.
  const focusRequestedSection = useCallback(() => {
    const section = takeFocusRequest();
    if (section === "savePath") focusSavePath();
    if (section === "translation") setCategory("translation");
    if (section === "music") setCategory("music");
    if (section === "mail") setCategory("messages");
    if (section === "updates") setCategory("about");
  }, [focusSavePath]);

  useEffect(() => {
    focusRequestedSection();
    const onRequest = (event: StorageEvent) => {
      if (event.key === SETTINGS_FOCUS_STORAGE_KEY && event.newValue !== null) focusRequestedSection();
    };
    window.addEventListener("storage", onRequest);
    return () => window.removeEventListener("storage", onRequest);
  }, [focusRequestedSection]);

  const resetAppearance = useCallback(() => {
    const next = withColorBackup(settings, withAppearanceFrom(settings, DEFAULT_SETTINGS));
    setSettings(next);
    if (next !== settings) requestPanelPreview("collapsed");
  }, [settings, setSettings]);

  return (
    <LayoutEditor
      category={category}
      onCategoryChange={setCategory}
      onSearchJump={jumpToSearchResult}
      onContentHeight={onContentHeight}
      titleAction={category === "appearance" && <ResetAppearanceButton onReset={resetAppearance} />}
    >
      <SettingsErrorBoundary key={category}>
        {category === "general" && (
          <GeneralSettingsPage
            locale={locale}
            settings={settings}
            detachedSettings={detached}
            systemNotifications={systemNotifications}
            onLocaleChange={setLocale}
            onSettingsChange={setSettings}
            onDetachedSettingsChange={onDetachedChange}
          />
        )}
        {category === "appearance" && (
          <AppearanceSettingsPage settings={settings} onSettingsChange={setSettings} />
        )}
        {category === "todos" && (
          <TodosSettingsPage
            settings={settings}
            saveDirectory={saveDirectory}
            onSettingsChange={setSettings}
          />
        )}
        {category === "messages" && (
          <MessagesSettingsPage settings={settings} systemNotifications={systemNotifications} onSettingsChange={setSettings} />
        )}
        {category === "translation" && <TranslationSettingsPage settings={settings} onSettingsChange={setSettings} />}
        {category === "clipboard" && <ClipboardSettingsPage settings={settings} onSettingsChange={setSettings} />}
        {category === "music" && <MusicSettingsPage settings={settings} onSettingsChange={setSettings} />}
        {category === "system" && <SystemSettingsPage islandSettings={settings} onIslandSettingsChange={setSettings} />}
        {category === "advanced" && <AdvancedSettingsPage />}
        {category === "plugins" && <PluginsSettingsPage />}
        {category === "changelog" && <ChangelogSettingsPage />}
        {category === "about" && <AboutSettingsPage />}
      </SettingsErrorBoundary>
    </LayoutEditor>
  );
}
