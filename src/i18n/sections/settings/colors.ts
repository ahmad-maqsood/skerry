export type SettingsColorsText = {
  title: string;
  taskText: string;
  pulse: string;
  islandBackground: string;
  /** The text on the expanded pages, and its reset to following the background. */
  pageText: string;
  pageTextAuto: string;
  restore: string;
  presets: string;
  savePreset: string;
  applyPreset: string;
  deletePreset: string;
  confirmDeletePreset: string;
  paletteLabel: (background: string, task: string, pulse: string, page?: string) => string;
};


export const en: SettingsColorsText = {
  title: "Colors",
  taskText: "Collapsed text",
  pulse: "Status light",
  islandBackground: "Island background",
  pageText: "Open page text",
  pageTextAuto: "Follow background",
  restore: "Restore previous colors",
  presets: "Presets",
  savePreset: "Save current colors as a preset",
  applyPreset: "Apply color preset",
  deletePreset: "Delete color preset",
  confirmDeletePreset: "Click again to delete",
  paletteLabel: (background, task, pulse, page) => `background ${background}, collapsed text ${task}, status light ${pulse}${page === undefined ? "" : `, open page text ${page || "Follow background"}`}`,
};
