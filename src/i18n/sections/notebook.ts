export type NotebookText = {
  sectionLabel: string;
  backToToday: string;
  saveTodayMarkdown: string;
  reviewSaved: string;
  tasksTab: string;
  dailyTab: string;
  openDailyNote: string;
  backToTasks: string;
  progress: string;
  addTaskFor: (date: string) => string;
  addTaskHint: string;
  dailyPlaceholder: string;
  dailyNoteLabel: string;
  notesActions: string;
  expandNotes: string;
  collapseNotes: string;
  showPastNotes: string;
  hidePastNotes: string;
  noPastNotes: string;
  pastNotesNeedFolder: string;
  pastNotesFailed: string;
  openPastNote: (date: string) => string;
  openNotesFolder: string;
  pickDate: string;
  clearDate: string;
  dateToday: string;
  dateTomorrow: string;
  upcomingTab: string;
  showUpcoming: (count: number) => string;
  scheduledCount: (count: number) => string;
  noScheduled: string;
  deleteScheduled: (title: string) => string;
  dayToday: string;
  dayYesterday: string;
  dayTomorrow: string;
  /** A day as a short heading: Mon, Nov 9. */
  formatDay: (date: Date) => string;
  moveToToday: string;
  addTodo: string;
  doneOf: (done: number, total: number) => string;
  restoreTodo: (title: string) => string;
  alreadyToday: string;
  calendarTab: string;
  previousMonth: string;
  nextMonth: string;
  calendarGoToToday: string;
  dayTodos: (date: string, count: number) => string;
  noTodosOnDay: string;
};

const enTaskCount = (count: number) => `${count} ${count === 1 ? "task" : "tasks"}`;


export const en: NotebookText = {
  sectionLabel: "Tasks",
  backToToday: "Back to today's todo list",
  saveTodayMarkdown: "Save today's todo list as markdown",
  reviewSaved: "Review saved todo lists",
  tasksTab: "Tasks",
  dailyTab: "Notes",
  openDailyNote: "Open daily note",
  backToTasks: "Back to tasks",
  progress: "Task progress",
  addTaskFor: (date) => `Add a task for ${date}`,
  addTaskHint: "Add a task, press Enter to save",
  dailyPlaceholder: "Write today's notes...",
  dailyNoteLabel: "Daily note",
  notesActions: "Note actions",
  expandNotes: "Make the notes taller",
  collapseNotes: "Make the notes smaller",
  showPastNotes: "Show saved days",
  hidePastNotes: "Back to today's note",
  noPastNotes: "No earlier days saved yet",
  pastNotesNeedFolder: "Choose a save folder in settings to see saved days",
  pastNotesFailed: "Could not read the save folder",
  openPastNote: (date) => `Open the markdown file for ${date}`,
  openNotesFolder: "Open the notes folder",
  pickDate: "Pick a date",
  clearDate: "Clear date",
  dateToday: "Today",
  dateTomorrow: "Tomorrow",
  upcomingTab: "Upcoming",
  showUpcoming: (count) => `Show ${count} scheduled ${count === 1 ? "task" : "tasks"}`,
  scheduledCount: (count) => `${count} scheduled`,
  noScheduled: "Nothing scheduled for later",
  deleteScheduled: (title) => `Delete scheduled task: ${title}`,
  dayToday: "Today",
  dayYesterday: "Yesterday",
  dayTomorrow: "Tomorrow",
  formatDay: (date) => new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(date),
  moveToToday: "Move to today",
  addTodo: "Add todo",
  doneOf: (done, total) => `${done}/${total} done`,
  restoreTodo: (title) => `Add "${title}" to today`,
  alreadyToday: "Already on today's list",
  calendarTab: "Calendar",
  previousMonth: "Previous month",
  nextMonth: "Next month",
  calendarGoToToday: "Back to today",
  dayTodos: (date, count) => (count > 0 ? `${date}, ${enTaskCount(count)}` : date),
  noTodosOnDay: "No tasks on this day",
};
