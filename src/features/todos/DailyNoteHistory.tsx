import { ExternalLink } from "lucide-react";
import { useTranslation } from "../../i18n";
import type { TodoMarkdownFileEntry } from "./api";
import { useDayFileList } from "./useDayFileList";
import "./DailyNoteHistory.css";

/** The earlier days saved as markdown, newest first; a click opens that day's file. */
export function DailyNoteHistory({
  today,
  onLoad,
  onOpen,
}: {
  /** Today's list has its own button, so it is left out here. */
  today: string;
  onLoad: () => Promise<TodoMarkdownFileEntry[] | null>;
  onOpen: (date: string) => void;
}) {
  const t = useTranslation();
  const list = useDayFileList(onLoad);

  if (list.status === "loading") return <div className="daily-history" aria-busy="true" />;
  if (list.status === "no-folder") return <div className="daily-history todo-empty">{t.notebook.pastNotesNeedFolder}</div>;
  if (list.status === "error") return <div className="daily-history todo-empty">{t.notebook.pastNotesFailed}</div>;

  const files = list.files.filter((file) => file.date !== today);
  if (files.length === 0) return <div className="daily-history todo-empty">{t.notebook.noPastNotes}</div>;

  const format = new Intl.DateTimeFormat(t.localeTag, { month: "long", day: "numeric", weekday: "short", year: "numeric" });

  return (
    <div className="daily-history todo-list" role="list">
      {files.map((file) => {
        const label = format.format(new Date(`${file.date}T00:00:00`));
        return (
          <button
            key={file.date}
            className="daily-history__item"
            type="button"
            role="listitem"
            aria-label={t.notebook.openPastNote(label)}
            title={file.filePath}
            onClick={() => onOpen(file.date)}
          >
            <span className="daily-history__date">{label}</span>
            <span className="daily-history__file">{file.date}.md</span>
            <ExternalLink size={13} strokeWidth={2.2} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
