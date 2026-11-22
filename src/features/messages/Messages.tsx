import { useMemo } from "react";
import { useTranslation } from "../../i18n";
import { MessageCard } from "./MessageCard";
import { MessageSourceIcon } from "./MessageSourceIcon";
import type { SystemNotification } from "./system-notifications/types";
import type { SystemNotificationsController } from "./system-notifications/useSystemNotifications";
import "./Messages.css";

export type MessagesPanelProps = {
  controller: SystemNotificationsController;
};

export function messagePanelHeight(_reading = false): number {
  return 360;
}

type AppGroup = {
  appId: string;
  appDisplayName: string;
  appLogo?: string | null;
  items: SystemNotification[];
};

export function MessagesPanel({ controller }: MessagesPanelProps) {
  const t = useTranslation();
  const { snapshot, clearAll, dismissOne, dismissApp, openApp } = controller;
  const { items } = snapshot;

  // Group notifications by app, newest first
  const groups = useMemo(() => {
    const map = new Map<string, AppGroup>();
    for (const item of items) {
      let group = map.get(item.appId);
      if (!group) {
        group = {
          appId: item.appId,
          appDisplayName: item.appDisplayName || item.appId,
          appLogo: item.appLogo,
          items: [],
        };
        map.set(item.appId, group);
      }
      group.items.push(item);
    }
    return Array.from(map.values());
  }, [items]);

  return (
    <div className="messages-panel" role="region" aria-label={t.messages.title}>
      <div className="messages-toolbar">
        <span className="messages-toolbar__title">
          {t.messages.title}
          {items.length > 0 && ` (${items.length})`}
        </span>
        {items.length > 0 && (
          <button
            className="messages-toolbar__action"
            type="button"
            onClick={() => void clearAll()}
          >
            {t.messages.clearAll}
          </button>
        )}
      </div>

      {groups.length === 0 ? (
        <div className="messages-empty">
          <p>{t.messages.noNotifications}</p>
        </div>
      ) : (
        <div className="messages-list" role="list">
          {groups.map((group) => (
            <div className="messages-app-group" key={group.appId}>
              <div className="messages-app-header">
                <MessageSourceIcon
                  logo={group.appLogo}
                  name={group.appDisplayName}
                  size={14}
                />
                <span className="messages-app-header__name">
                  {group.appDisplayName}
                </span>
                <span className="messages-app-header__count">
                  {group.items.length}
                </span>
                <button
                  className="messages-app-header__dismiss"
                  type="button"
                  aria-label={t.messages.clearOne}
                  onClick={() => void dismissApp(group.appId)}
                >
                  {t.messages.clearOne}
                </button>
              </div>

              {group.items.map((item) => (
                <MessageCard
                  key={item.id}
                  id={item.id}
                  appId={item.appId}
                  appDisplayName={group.appDisplayName}
                  logo={item.appLogo ?? group.appLogo}
                  title={item.title}
                  body={item.body}
                  timestamp={item.timestamp}
                  onOpen={() => void openApp(item.appId)}
                  onDismiss={() => void dismissOne(item.id)}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
