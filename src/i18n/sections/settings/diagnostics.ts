export type SettingsDiagnosticsText = {
  title: string;
  enable: string;
  enableHint: string;
  file: string;
  fileHint: (size: string) => string;
  open: string;
  clear: string;
};


export const en: SettingsDiagnosticsText = {
  title: "Troubleshooting",
  enable: "Record a log",
  enableHint: "Turn on when something goes wrong, do it again, then send the log file to the group. It stays on this computer",
  file: "Log file",
  fileHint: (size) => `${size} now, about 10 MB at most`,
  open: "Open folder",
  clear: "Clear",
};
