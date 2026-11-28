export type SettingsFileShelfText = {
  showCount: string;
  showCountDescription: string;
  autoCleanup: string;
  cleanupNever: string;
  cleanupDays: (days: number) => string;
  cleanupHint: string;
};


export const en: SettingsFileShelfText = {
  showCount: "Show the file count",
  showCountDescription: "The collapsed island shows the shelf icon and how many files are on it",
  autoCleanup: "Auto clean up",
  cleanupNever: "Never",
  cleanupDays: (days) => (days === 1 ? "After 1 day" : `After ${days} days`),
  cleanupHint: "Cleaning up only changes the list; your files are never deleted.",
};
