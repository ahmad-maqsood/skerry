export type TodoText = {
  empty: string;
  /** The one todo a new user finds on the island, so it does not look empty on first launch. */
  welcome: string;
  complete: string;
  markIncomplete: string;
  /** Screen-reader label pairing an action with the task it targets. */
  actionOnTask: (action: string, taskTitle: string) => string;
  editTitle: string;
  start: string;
  stop: string;
  chooseDuration: string;
  countdown: string;
  minutes: (count: number) => string;
  minutesUnit: string;
  remindBefore: string;
  remindHint: string;
  remindUnit: string;
  remindOff: string;
  changeDuration: (minutes: number) => string;
  startFor: (minutes: number) => string;
  remainingTime: (time: string) => string;
  timeUp: string;
  repeatTimer: string;
  delete: string;
  deleteTask: (taskTitle: string) => string;
  reorderTask: (taskTitle: string) => string;
};


export const en: TodoText = {
  empty: "A light day so far",
  welcome: "Hi there, write something down here",
  complete: "Complete",
  markIncomplete: "Mark incomplete",
  actionOnTask: (action, taskTitle) => `${action}: ${taskTitle}`,
  editTitle: "Edit task name",
  start: "Start",
  stop: "Stop",
  chooseDuration: "Choose task duration",
  countdown: "Task countdown",
  minutes: (count) => `${count} min`,
  minutesUnit: "min",
  remindBefore: "Minutes before the end to remind, 0 for none",
  remindHint: "Reminder before the end: when this many minutes are left",
  remindUnit: "min before",
  remindOff: "No reminder",
  changeDuration: (minutes) => `Countdown ${minutes} min: click to set and start`,
  startFor: (minutes) => `Start ${minutes} min`,
  remainingTime: (time) => `${time} remaining`,
  timeUp: "Time’s up",
  repeatTimer: "Another round",
  delete: "Delete",
  deleteTask: (taskTitle) => `Delete: ${taskTitle}`,
  reorderTask: (taskTitle) => `Reorder: ${taskTitle}`,
};
