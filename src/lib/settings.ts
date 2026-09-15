import { invoke } from "@tauri-apps/api/core";

export type CaptureSettings = {
  captureKeyboard: boolean;
  captureMouse: boolean;
};

export async function getCaptureSettings(): Promise<CaptureSettings> {
  return invoke<CaptureSettings>("get_capture_settings");
}

export async function setCaptureSettings(
  settings: CaptureSettings,
): Promise<CaptureSettings> {
  return invoke<CaptureSettings>("set_capture_settings", { settings });
}
