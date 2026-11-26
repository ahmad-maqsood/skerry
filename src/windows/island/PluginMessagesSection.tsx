import { useMemo } from "react";
import { useTranslation } from "../../i18n";
import { MessageCard } from "../../features/messages/MessageCard";
import { MessageSourceIcon } from "../../features/messages/MessageSourceIcon";
import { SelectControl } from "../../components/controls/SelectControl";
import { formatMessageCardTime } from "../../features/messages/messageCardText";
import type { FeedNotification, FeedSession, PluginFilterController } from "../../features/plugins";
import "./PluginMessagesSection.css";

/** The newest tasks shown for each plugin. */
const MAX_SESSIONS_PER_PLUGIN = 8;
/** The filter's choice for every plugin; a plugin id can never be empty. */
const ALL = "";

function groupBy<T>(items: readonly T[], key: (item: T) => string): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const item of items) groups.set(key(item), [...(groups.get(key(item)) ?? []), item]);
  return [...groups.entries()];
}

function SessionRow({ session, onOpen }: { session: FeedSession; onOpen: () => void }) {
  const t = useTranslation().messages;
  const status = t.sessionStatus[session.status];
  const content = (
    <>
      <span className={`plugin-feed__dot plugin-feed__dot--${session.status}`} aria-hidden="true" />
      <span className="plugin-feed__session-text">
        <span className="plugin-feed__session-title">{session.title}</span>
        {session.cwd && <span className="plugin-feed__session-sub">{session.cwd}</span>}
      </span>
      <span className="plugin-feed__session-meta">
        <span>{status}</span>
        <time>{formatMessageCardTime(session.updatedAt, Date.now(), t.yesterday)}</time>
      </span>
    </>
  );
  return session.action
    ? <button type="button" className="plugin-feed__session" role="listitem" onClick={onOpen}>{content}</button>
    : <div className="plugin-feed__session" role="listitem">{content}</div>;
}

/** What plugins report, inside the Messages page: their notifications as cards, their tasks as a short list. */
export function PluginMessagesSection({ filter }: { filter: PluginFilterController }) {
  const t = useTranslation().messages;
  const { feed } = filter;
  const notificationGroups = useMemo(
    () => groupBy<FeedNotification>(feed.notifications, (item) => `${item.pluginId}/${item.appName}`),
    [feed.notifications],
  );
  const sessionGroups = useMemo(() => groupBy<FeedSession>(feed.sessions, (item) => item.pluginId), [feed.sessions]);

  return (
    <>
      {filter.offered && (
        <div className="plugin-feed__filter">
          <SelectControl
            ariaLabel={t.pluginFilter}
            value={filter.selected ?? ALL}
            options={[{ value: ALL, label: t.allPlugins }, ...filter.plugins.map((plugin) => ({ value: plugin.id, label: plugin.name }))]}
            onChange={(value) => filter.select(value === ALL ? null : value)}
          />
        </div>
      )}
      {notificationGroups.map(([groupKey, items]) => (
        <div className="messages-app-group" key={groupKey}>
          <div className="messages-app-header">
            <MessageSourceIcon name={items[0].appName} size={14} />
            <span className="messages-app-header__name">{items[0].appName}</span>
            <span className="messages-app-header__count">{items.length}</span>
            <button className="messages-app-header__dismiss" type="button" aria-label={t.clearOne} onClick={() => feed.dismissAll(items)}>
              {t.clearOne}
            </button>
          </div>
          {items.map((item) => (
            <MessageCard
              key={`${item.pluginId}/${item.id}`}
              id={item.id}
              appId={item.sourceId}
              appDisplayName={item.appName}
              title={item.title}
              body={item.body}
              timestamp={item.receivedAt}
              onOpen={item.action ? () => feed.open(item) : undefined}
              onDismiss={() => feed.dismiss(item)}
            />
          ))}
        </div>
      ))}
      {sessionGroups.map(([pluginId, sessions]) => (
        <div className="messages-app-group" key={`activity-${pluginId}`}>
          <div className="messages-app-header">
            <span className="messages-app-header__name">{t.pluginActivity(sessions[0].pluginName)}</span>
          </div>
          <div className="plugin-feed__sessions" role="list">
            {sessions.slice(0, MAX_SESSIONS_PER_PLUGIN).map((session) => (
              <SessionRow key={session.id} session={session} onOpen={() => feed.open(session)} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
