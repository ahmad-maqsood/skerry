import { useState } from "react";
import { FolderOpen, History, Maximize2, Minimize2 } from "lucide-react";
import { useTranslation } from "../../i18n";
import type { TodoMarkdownFileEntry } from "./api";
import { DailyNoteHistory } from "./DailyNoteHistory";
import "./DailyNoteEditor.css";

/** The daily note: the text on the left, a rail of icon actions on the right. */
export function DailyNoteEditor({
  value,
  today,
  expanded,
  onChange,
  onToggleExpanded,
  onListDayFiles,
  onOpenPastDayFile,
  onOpenFolder,
}: {
  value: string;
  /** The list's own day, YYYY-MM-DD. */
  today: string;
  /** The island is shown taller for writing (the expand button). */
  expanded: boolean;
  onChange: (value: string) => void;
  onToggleExpanded: () => void;
  onListDayFiles: () => Promise<TodoMarkdownFileEntry[] | null>;
  onOpenPastDayFile: (date: string) => void;
  onOpenFolder: () => void;
}) {
  const t = useTranslation();
  // Which of the two the text area's place shows: today's note, or the saved days.
  const [showingHistory, setShowingHistory] = useState(false);
  const expandLabel = expanded ? t.notebook.collapseNotes : t.notebook.expandNotes;
  const historyLabel = showingHistory ? t.notebook.hidePastNotes : t.notebook.showPastNotes;

  return (
    <div className="daily-note-editor">
      {showingHistory ? (
        <DailyNoteHistory today={today} onLoad={onListDayFiles} onOpen={onOpenPastDayFile} />
      ) : (
        <div className="daily-note-editor__main">
          <textarea
            className="daily-note"
            value={value}
            placeholder={t.notebook.dailyPlaceholder}
            aria-label={t.notebook.dailyNoteLabel}
            spellCheck={false}
            onChange={(event) => onChange(event.currentTarget.value)}
          />
        </div>
      )}
      <div className="daily-note-editor__rail" role="toolbar" aria-orientation="vertical" aria-label={t.notebook.notesActions}>
        <button
          className={`daily-note-editor__action${expanded ? " daily-note-editor__action--active" : ""}`}
          type="button"
          aria-label={expandLabel}
          aria-pressed={expanded}
          title={expandLabel}
          onClick={onToggleExpanded}
        >
          {expanded ? <Minimize2 size={14} strokeWidth={2.2} /> : <Maximize2 size={14} strokeWidth={2.2} />}
        </button>
        <button
          className={`daily-note-editor__action${showingHistory ? " daily-note-editor__action--active" : ""}`}
          type="button"
          aria-label={historyLabel}
          aria-pressed={showingHistory}
          title={historyLabel}
          onClick={() => setShowingHistory((showing) => !showing)}
        >
          <History size={14} strokeWidth={2.2} />
        </button>
        <button
          className="daily-note-editor__action"
          type="button"
          aria-label={t.notebook.openNotesFolder}
          title={t.notebook.openNotesFolder}
          onClick={onOpenFolder}
        >
          <FolderOpen size={14} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}
