export type SettingsLiveWallpaperText = {
  title: string;
  enable: string;
  enableHint: string;
  video: string;
  noVideo: string;
  choose: string;
  pickerTitle: string;
  scaling: string;
  scalingHint: string;
  fill: string;
  fit: string;
  pauseOnBattery: string;
  pauseOnBatteryHint: string;
  formats: string;
  status: Record<"off" | "noVideo" | "starting" | "playing" | "paused" | "pausedPower", string>;
};

export const en: SettingsLiveWallpaperText = {
  title: "Live wallpaper",
  enable: "Enable live wallpaper",
  enableHint: "Plays a muted, looping video behind your desktop icons. It pauses while a maximized or full-screen window hides the desktop, then carries on from the same point. Playing video uses extra power; switched off, it uses none.",
  video: "Wallpaper video",
  noVideo: "No video chosen",
  choose: "Choose video",
  pickerTitle: "Choose a wallpaper video",
  scaling: "Scaling",
  scalingHint: "Fill covers the screen and may crop the edges. Fit shows the whole picture.",
  fill: "Fill",
  fit: "Fit",
  pauseOnBattery: "Pause on battery or Battery Saver",
  pauseOnBatteryHint: "Stops the video while your laptop runs on its battery or Windows Battery Saver is on, and carries on when it is plugged in again.",
  formats: "MP4, MOV, M4V, MKV, WebM, AVI, WMV and more, played from your original file without re-encoding. Windows does the decoding: HEVC (common in iPhone videos), AV1 and VP9 may need Microsoft's video extensions. ProRes is not supported.",
  status: {
    off: "Off",
    noVideo: "Choose a video to start.",
    starting: "Starting",
    playing: "Playing",
    paused: "Paused while the desktop is hidden",
    pausedPower: "Paused to save battery",
  },
};
