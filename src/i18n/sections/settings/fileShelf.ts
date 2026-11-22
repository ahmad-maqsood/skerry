export type SettingsFileShelfText = {
  autoCleanup: string;
  cleanupNever: string;
  cleanupDays: (days: number) => string;
  cleanupHint: string;
};


export const en: SettingsFileShelfText = {
  autoCleanup: "Auto clean up",
  cleanupNever: "Never",
  cleanupDays: (days) => (days === 1 ? "After 1 day" : `After ${days} days`),
  cleanupHint: "Cleaning up only changes the list; your files are never deleted.",
};
