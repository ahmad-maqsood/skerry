import { useMemo } from "react";
import { useTranslation } from "../../i18n";
import { collectCalendarTodos } from "./calendar";
import type { TodoMarkdownFileEntry } from "./api";
import { DailyNoteEditor } from "./DailyNoteEditor";
import { TodoCalendar } from "./TodoCalendar";
import { ScheduledTodoList } from "./ScheduledTodoList";
import { TodoNotebookTasks } from "./TodoNotebookTasks";
import { TodoNotebookTopline } from "./TodoNotebookTopline";
import type { ScheduledTodo, TodoArchive, TodoItem, TodoPageMode } from "./types";
import type { TodoDuration, TodoDurations, TodoTimer } from "./timer";
import { withoutUpdateTodo } from "./updateTodo";
import "./TodoNotebook.css";

// A stable stand-in, so the saved days are not read again on every render.
const listNoDayFiles = async () => null;
const keepNoNoteImage = async () => null;

export function TodoNotebook({
  todos,
  dailyNote,
  draft,
  activeTodoId,
  activeTodoIds,
  timer,
  timers,
  durations,
  onDurationChange,
  todoTimerEnabled = false,
  timerReminder = false,
  onListHeightChange,
  currentDate,
  pageMode,
  archives,
  enableTodoReorder,
  scrollStartRows,
  draftDate,
  scheduledTodos,
  onDraftChange,
  onDraftDateChange,
  onAddTodo,
  onShowUpcoming,
  onShowCalendar,
  onAddTodoForDay,
  onDeleteScheduledTodo,
  onToggleTodo,
  onUpdateTodo,
  onStartTodo,
  onDeleteTodo,
  onReorderTodo,
  onShowDaily,
  onShowToday,
  onDailyNoteChange,
  notesExpanded = false,
  onToggleNotesExpanded = () => {},
  onListDayFiles = listNoDayFiles,
  onOpenPastDayFile = () => {},
  onOpenNotesFolder = () => {},
  onSaveNoteImage = keepNoNoteImage,
  onReadNoteImage = keepNoNoteImage,
}: {
  todos: TodoItem[];
  dailyNote: string;
  draft: string;
  activeTodoId: string | null;
  activeTodoIds?: string[];
  timer?: TodoTimer | null;
  timers?: TodoTimer[];
  durations?: TodoDurations;
  onDurationChange?: (id: string, minutes: number) => void;
  todoTimerEnabled?: boolean;
  /** The setter also asks how long before the end to remind (todoTimerReminder). */
  timerReminder?: boolean;
  onListHeightChange?: (height: number) => void;
  currentDate: string;
  pageMode: TodoPageMode;
  archives: TodoArchive[];
  enableTodoReorder: boolean;
  /** Rows shown before the list scrolls; the island grows to fit this many. */
  scrollStartRows: number;
  /** Day the next todo is for, or null for the list's own day. */
  draftDate: string | null;
  scheduledTodos: ScheduledTodo[];
  onDraftChange: (value: string) => void;
  onDraftDateChange: (date: string | null) => void;
  onAddTodo: () => void;
  onShowUpcoming: () => void;
  onShowCalendar: () => void;
  /** Adds to today's list, or schedules for a later day. */
  onAddTodoForDay: (title: string, date: string) => void;
  onDeleteScheduledTodo: (id: string) => void;
  onToggleTodo: (id: string) => void;
  onUpdateTodo: (id: string, title: string) => void;
  onStartTodo: (id: string, duration?: TodoDuration, remindMinutes?: number) => void;
  onDeleteTodo: (id: string) => void;
  onReorderTodo: (sourceId: string, index: number) => void;
  onShowDaily: () => void;
  onShowToday: () => void;
  onDailyNoteChange: (value: string) => void;
  /** The Notes tab is shown taller; the island grows with it (expandedHeight.ts). */
  notesExpanded?: boolean;
  onToggleNotesExpanded?: () => void;
  /** The days saved as markdown in the save folder, newest first; null while no folder is chosen. */
  onListDayFiles?: () => Promise<TodoMarkdownFileEntry[] | null>;
  /** Opens a saved day's markdown file. */
  onOpenPastDayFile?: (date: string) => void;
  /** Opens the folder the days are saved in. */
  onOpenNotesFolder?: () => void;
  /** Saves an image pasted into the note; resolves to the path the note refers to, or null. */
  onSaveNoteImage?: (image: Blob) => Promise<string | null>;
  /** A saved note image as a data URL, for its thumbnail. */
  onReadNoteImage?: (relativePath: string) => Promise<string | null>;
}) {
  const t = useTranslation();
  const calendarTodos = useMemo(
    () => pageMode === "calendar" ? collectCalendarTodos({ archives, todos, currentDate, scheduledTodos }) : null,
    [archives, currentDate, pageMode, scheduledTodos, todos],
  );
  const tasks = withoutUpdateTodo(todos);
  const completed = tasks.filter((todo) => todo.completed).length;

  return (
    <section className={`todo-notebook todo-notebook--${pageMode}`} aria-label={t.notebook.sectionLabel}>
      <TodoNotebookTopline
        pageMode={pageMode}
        scheduledCount={scheduledTodos.length}
        completed={completed}
        total={tasks.length}
        onSelectView={(view) => ({ today: onShowToday, daily: onShowDaily, calendar: onShowCalendar })[view]()}
        onShowToday={onShowToday}
        onShowUpcoming={onShowUpcoming}
      />

      {pageMode === "today" && (
        <TodoNotebookTasks
          displayedTodos={todos}
          draft={draft}
          draftDate={draftDate}
          currentDate={currentDate}
          activeTodoId={activeTodoId}
          activeTodoIds={activeTodoIds}
          timer={timer}
          timers={timers}
          durations={durations}
          onDurationChange={onDurationChange}
          todoTimerEnabled={todoTimerEnabled}
          timerReminder={timerReminder}
          onListHeightChange={onListHeightChange}
          enableTodoReorder={enableTodoReorder}
          scrollStartRows={scrollStartRows}
          onDraftChange={onDraftChange}
          onDraftDateChange={onDraftDateChange}
          onAddTodo={onAddTodo}
          onToggleTodo={onToggleTodo}
          onUpdateTodo={onUpdateTodo}
          onStartTodo={onStartTodo}
          onDeleteTodo={onDeleteTodo}
          onReorderTodo={onReorderTodo}
        />
      )}

      {pageMode === "daily" ? (
        <DailyNoteEditor
          value={dailyNote}
          today={currentDate}
          expanded={notesExpanded}
          onChange={onDailyNoteChange}
          onToggleExpanded={onToggleNotesExpanded}
          onListDayFiles={onListDayFiles}
          onOpenPastDayFile={onOpenPastDayFile}
          onOpenFolder={onOpenNotesFolder}
          onSaveImage={onSaveNoteImage}
          onReadImage={onReadNoteImage}
        />
      ) : pageMode === "upcoming" ? (
        <ScheduledTodoList todos={scheduledTodos} onDelete={onDeleteScheduledTodo} />
      ) : calendarTodos ? (
        <TodoCalendar
          today={currentDate}
          dayTodos={calendarTodos}
          onAddTodoForDay={onAddTodoForDay}
          onDeleteScheduled={onDeleteScheduledTodo}
        />
      ) : null}
    </section>
  );
}
