import { useState } from "react";
import { Clock, FileText, FolderOpen, History, Maximize2, Minimize2 } from "lucide-react";
import { useTranslation } from "../../i18n";
import type { TodoMarkdownFileEntry } from "./api";
import { DailyNoteHistory } from "./DailyNoteHistory";
import { DailyNoteImages } from "./DailyNoteImages";
import { formatNoteTime } from "./noteText";
import { useNoteImagePaste } from "./useNoteImagePaste";
import { useNoteInsert } from "./useNoteInsert";
import "./DailyNoteEditor.css";

/** The daily note: the text on the left, a rail of icon actions on the right. */
export function DailyNoteEditor({
  value,
  today,
  expanded,
  onChange,
  onToggleExpanded,
  onOpenDayFile,
  onListDayFiles,
  onOpenPastDayFile,
  onOpenFolder,
  onSaveImage,
  onReadImage,
}: {
  value: string;
  /** The list's own day, YYYY-MM-DD. */
  today: string;
  /** The island is shown taller for writing (the expand button). */
  expanded: boolean;
  onChange: (value: string) => void;
  onToggleExpanded: () => void;
  onOpenDayFile: () => void;
  onListDayFiles: () => Promise<TodoMarkdownFileEntry[] | null>;
  onOpenPastDayFile: (date: string) => void;
  onOpenFolder: () => void;
  onSaveImage: (image: Blob) => Promise<string | null>;
  onReadImage: (relativePath: string) => Promise<string | null>;
}) {
  const t = useTranslation();
  const { textareaRef, onPaste } = useNoteImagePaste(value, onChange, onSaveImage);
  const insertText = useNoteInsert(textareaRef, onChange);
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
            ref={textareaRef}
            className="daily-note"
            value={value}
            placeholder={t.notebook.dailyPlaceholder}
            aria-label={t.notebook.dailyNoteLabel}
            spellCheck={false}
            onChange={(event) => onChange(event.currentTarget.value)}
            onPaste={onPaste}
          />
          <DailyNoteImages note={value} onRead={onReadImage} />
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
          className="daily-note-editor__action"
          type="button"
          aria-label={t.notebook.openDayFile}
          title={t.notebook.openDayFile}
          onClick={onOpenDayFile}
        >
          <FileText size={14} strokeWidth={2.2} />
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
          disabled={showingHistory}
          aria-label={t.notebook.insertTime}
          title={t.notebook.insertTime}
          onClick={() => insertText(formatNoteTime(new Date(), t.localeTag))}
        >
          <Clock size={14} strokeWidth={2.2} />
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
