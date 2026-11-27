import type { CommonText } from "./sections/common";
import type { MessagesText } from "./sections/messages";
import type { TranslatorText } from "./sections/translator";
import type { IslandText } from "./sections/island";
import type { NotebookText } from "./sections/notebook";
import type { ArchiveText } from "./sections/archive";
import type { MusicText } from "./sections/music";
import type { TodoText } from "./sections/todo";
import type { ClipboardText } from "./sections/clipboard";
import type { FileShelfText } from "./sections/fileShelf";
import type { SystemMonitorText } from "./sections/systemMonitor";
import type { PrivacyText } from "./sections/privacy";
import type { PixelCatText } from "./sections/pixelCat";
import type { SettingsText } from "./sections/settings/index";

export type LocaleCode = "en";

export type Translations = {
  /** Native language name shown in the interface. */
  localeLabel: string;
  /** BCP-47 tag handed to Intl for dates and numbers. */
  localeTag: string;

  common: CommonText;
  messages: MessagesText;
  translator: TranslatorText;

  island: IslandText;


  notebook: NotebookText;

  archive: ArchiveText;

  music: MusicText;

  todo: TodoText;

  clipboard: ClipboardText;

  fileShelf: FileShelfText;

  systemMonitor: SystemMonitorText;

  privacy: PrivacyText;

  pixelCat: PixelCatText;

  settings: SettingsText;
};
