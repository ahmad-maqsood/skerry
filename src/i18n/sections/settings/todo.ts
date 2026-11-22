export type SettingsTodoText = {
  collapsedTitle: string;
  rotateTodos: string;
  rotationMode: string;
  switchMode: string;
  scrollMode: string;
  rotationSeconds: string;
  scrollSpeed: string;
  scrollSpeedValue: (value: number) => string;
  timerTitle: string;
  focusTimer: string;
  focusTimerDescription: string;
  timerReminder: string;
  timerReminderDescription: string;
  timerReminderSound: string;
  dragToReorder: string;
  dragToReorderDescription: string;
  title: string;
  carryOverIncomplete: string;
  visibleRows: string;
};


export const en: SettingsTodoText = {
  collapsedTitle: "Collapsed island",
  rotateTodos: "Rotate todos",
  rotationMode: "Rotation mode",
  switchMode: "Switch",
  scrollMode: "Scroll",
  rotationSeconds: "Time per todo",
  scrollSpeed: "Scroll speed",
  scrollSpeedValue: (value) => `${value} px/s`,
  timerTitle: "Focus timer",
  focusTimer: "Use the focus timer",
  focusTimerDescription: "Start counts down and reminds you when time is up; the watch beside it changes the time",
  timerReminder: "Remind before the end",
  timerReminderDescription: "When starting a timer, choose how many minutes before the end to be reminded: the collapsed island shows a notice, the todo flashes and its time turns red.",
  timerReminderSound: "Play a sound with the reminder",
  dragToReorder: "Drag to reorder",
  dragToReorderDescription: "Hold the handle on the right of a todo and drag it up or down",
  title: "Tasks",
  carryOverIncomplete: "Carry unfinished tasks to next day",
  visibleRows: "Visible rows",
};
