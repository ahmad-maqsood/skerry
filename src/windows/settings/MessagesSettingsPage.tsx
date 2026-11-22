import { SettingsGroup } from "../../components/settings/SettingsGroup";
import { SettingsLinkButton } from "../../components/settings/SettingsLinkButton";
import { SettingsToggleRow } from "../../components/settings/SettingsToggleRow";
import { SettingsSliderRow } from "../../components/settings/SettingsSliderRow";
import {
  MESSAGE_EXPAND_MAX_HEIGHT,
  MESSAGE_EXPAND_MAX_WIDTH,
  MESSAGE_EXPAND_SECONDS,
  MESSAGE_PREVIEW_SECONDS,
} from "../../features/appearance/settingsLimits";
import type { IslandSettings } from "../../features/appearance/types";
import { MessageSourceIcon } from "../../features/messages/MessageSourceIcon";
import type { SystemNotificationsController } from "../../features/messages/system-notifications/useSystemNotifications";
import { useTranslation } from "../../i18n";
import "./MessagesSettingsPage.css";

export function MessagesSettingsPage({
  settings,
  systemNotifications,
  onSettingsChange,
}: {
  settings: IslandSettings;
  systemNotifications: SystemNotificationsController;
  onSettingsChange: (settings: IslandSettings) => void;
}) {
  const t = useTranslation();
  const labels = t.settings.messageSources;
  const { snapshot, setEnabled, toggleHideText, toggleAppMuted, openSettings } =
    systemNotifications;
  const { enabled, status, knownApps, mutedApps, hideText, error } = snapshot;

  const accessStatusText =
    status === "listening"
      ? labels.accessAllowed
      : status === "permissionDenied"
        ? labels.accessDenied
        : labels.accessRequired;

  const isReady = status === "listening";

  return (
    <>
      <SettingsGroup title={t.messages.title}>
        <SettingsToggleRow
          title={labels.masterToggle}
          description={labels.masterToggleHint}
          checked={enabled}
          onChange={(next) => void setEnabled(next)}
        />
        {enabled && (
          <>
            <div className="messages-settings__access-row">
              <div className="messages-settings__access-info">
                <span className="messages-settings__access-title">
                  {labels.accessStatus}
                </span>
                <span
                  className={`messages-settings__access-status ${
                    isReady
                      ? "messages-settings__access-status--ready"
                      : "messages-settings__access-status--warn"
                  }`}
                >
                  {error || accessStatusText}
                </span>
              </div>
              <SettingsLinkButton
                onClick={() => void openSettings(true)}
              >
                {labels.openWindowsSettings}
              </SettingsLinkButton>
            </div>

            <SettingsToggleRow
              title={labels.hideMessageText}
              description={labels.hideMessageTextHint}
              checked={hideText}
              onChange={(next) => void toggleHideText(next)}
            />
          </>
        )}
      </SettingsGroup>

      <SettingsGroup title={labels.previewTitle}>
        <SettingsSliderRow
          title={labels.previewSeconds}
          value={settings.messagePreviewSeconds}
          min={MESSAGE_PREVIEW_SECONDS.min}
          max={MESSAGE_PREVIEW_SECONDS.max}
          step={MESSAGE_PREVIEW_SECONDS.step}
          format={(value) => `${value} ${t.settings.expand.secondsUnit}`}
          defaultValue={MESSAGE_PREVIEW_SECONDS.default}
          resetLabel={t.settings.layout.resetToDefault}
          onChange={(messagePreviewSeconds) =>
            onSettingsChange({ ...settings, messagePreviewSeconds })
          }
        />
        <NoticeRows settings={settings} onSettingsChange={onSettingsChange} />
        <SettingsToggleRow
          title={labels.popupClipboard}
          description={labels.popupClipboardHint}
          checked={settings.clipboardPopup}
          onChange={(clipboardPopup) => onSettingsChange({ ...settings, clipboardPopup })}
        />
        <SettingsToggleRow
          title={labels.popupMusic}
          description={labels.popupMusicHint}
          checked={settings.musicPopup}
          onChange={(musicPopup) => onSettingsChange({ ...settings, musicPopup })}
        />
      </SettingsGroup>

      {enabled && (
        <SettingsGroup
          title={labels.appMuteList}
          footer={<p>{labels.appMuteListHint}</p>}
        >
          {knownApps.length === 0 ? (
            <div className="messages-settings__empty">{labels.noAppsSeen}</div>
          ) : (
            knownApps.map((app) => {
              const isMuted = mutedApps.some(
                (m) => m.toLowerCase() === app.appId.toLowerCase(),
              );
              return (
                <SettingsToggleRow
                  key={app.appId}
                  title={
                    <span>
                      <span className="messages-settings__app-icon">
                        <MessageSourceIcon
                          logo={app.appLogo}
                          name={app.appDisplayName}
                          size={16}
                        />
                      </span>
                      {app.appDisplayName || app.appId}
                    </span>
                  }
                  description={isMuted ? labels.mute : labels.unmute}
                  checked={!isMuted}
                  onChange={() => void toggleAppMuted(app.appId)}
                />
              );
            })
          )}
        </SettingsGroup>
      )}
    </>
  );
}

/** Adaptive previews: their size limits and duration. */
function NoticeRows({
  settings,
  onSettingsChange,
}: {
  settings: IslandSettings;
  onSettingsChange: (settings: IslandSettings) => void;
}) {
  const t = useTranslation();
  const labels = t.settings.messageSources;
  const reset = t.settings.layout.resetToDefault;
  const seconds = (value: number) => `${value} ${t.settings.expand.secondsUnit}`;
  const pixels = (value: number) => `${value} px`;

  return (
    <>
      <SettingsToggleRow
        title={labels.autoExpand}
        description={labels.autoExpandHint}
        checked={settings.messageAutoExpand}
        onChange={(messageAutoExpand) =>
          onSettingsChange({ ...settings, messageAutoExpand })
        }
      />
      {settings.messageAutoExpand && (
        <>
          <SettingsSliderRow
            indent
            title={labels.expandMaxWidth}
            value={settings.messageExpandMaxWidth}
            min={MESSAGE_EXPAND_MAX_WIDTH.min}
            max={MESSAGE_EXPAND_MAX_WIDTH.max}
            step={MESSAGE_EXPAND_MAX_WIDTH.step}
            format={pixels}
            defaultValue={MESSAGE_EXPAND_MAX_WIDTH.default}
            resetLabel={reset}
            onChange={(messageExpandMaxWidth) =>
              onSettingsChange({ ...settings, messageExpandMaxWidth })
            }
          />
          <SettingsSliderRow
            indent
            title={labels.expandMaxHeight}
            value={settings.messageExpandMaxHeight}
            min={MESSAGE_EXPAND_MAX_HEIGHT.min}
            max={MESSAGE_EXPAND_MAX_HEIGHT.max}
            step={MESSAGE_EXPAND_MAX_HEIGHT.step}
            format={pixels}
            defaultValue={MESSAGE_EXPAND_MAX_HEIGHT.default}
            resetLabel={reset}
            onChange={(messageExpandMaxHeight) =>
              onSettingsChange({ ...settings, messageExpandMaxHeight })
            }
          />
          <SettingsSliderRow
            indent
            title={labels.expandSeconds}
            value={settings.messageExpandSeconds}
            min={MESSAGE_EXPAND_SECONDS.min}
            max={MESSAGE_EXPAND_SECONDS.max}
            step={MESSAGE_EXPAND_SECONDS.step}
            format={seconds}
            defaultValue={MESSAGE_EXPAND_SECONDS.default}
            resetLabel={reset}
            onChange={(messageExpandSeconds) =>
              onSettingsChange({ ...settings, messageExpandSeconds })
            }
          />
        </>
      )}
    </>
  );
}
