export function isUiDemoMode(): boolean {
  const raw = process.env.UI_DEMO_MODE;

  if (raw === "true") return true;
  if (raw === "false") return false;

  return process.env.NODE_ENV === "development";
}
