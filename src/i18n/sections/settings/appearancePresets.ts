export type SettingsAppearancePresetsText = {
  title: string;
  hint: string;
  empty: string;
  apply: string;
  delete: string;
  nameLabel: string;
  namePlaceholder: string;
  save: string;
  full: (max: number) => string;
};


export const en: SettingsAppearancePresetsText = {
  title: "Appearance presets",
  hint: "Save every appearance setting (material, colours, sizes, font, corners and so on) as one preset, apply it in a click, then keep adjusting.",
  empty: "No appearance presets saved yet.",
  apply: "Apply",
  delete: "Delete",
  nameLabel: "Preset name",
  namePlaceholder: "For example: Dark glass",
  save: "Save",
  full: (max) => `You can save up to ${max} appearance presets. Delete one first.`,
};
