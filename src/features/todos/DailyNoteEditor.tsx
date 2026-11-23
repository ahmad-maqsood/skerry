import { FileText, Maximize2, Minimize2 } from "lucide-react";
import { useTranslation } from "../../i18n";
import "./DailyNoteEditor.css";

/** The daily note: the text on the left, a rail of icon actions on the right. */
export function DailyNoteEditor({
  value,
  expanded,
  onChange,
  onToggleExpanded,
  onOpenDayFile,
}: {
  value: string;
  /** The island is shown taller for writing (the expand button). */
  expanded: boolean;
  onChange: (value: string) => void;
  onToggleExpanded: () => void;
  onOpenDayFile: () => void;
}) {
  const t = useTranslation();
  const expandLabel = expanded ? t.notebook.collapseNotes : t.notebook.expandNotes;

  return (
    <div className="daily-note-editor">
      <textarea
        className="daily-note"
        value={value}
        placeholder={t.notebook.dailyPlaceholder}
        aria-label={t.notebook.dailyNoteLabel}
        spellCheck={false}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
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
      </div>
    </div>
  );
}
