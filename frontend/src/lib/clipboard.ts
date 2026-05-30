export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export async function readClipboardText(): Promise<string | null> {
  try {
    if (!navigator.clipboard?.readText) return null;
    return await navigator.clipboard.readText();
  } catch {
    return null;
  }
}

export function getDevicePlatform(): string {
  if (typeof navigator === "undefined") return "web";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "web";
}

export function getDefaultDeviceName(): string {
  if (typeof navigator === "undefined") return "Browser";
  const platform = getDevicePlatform();
  const browser = /Chrome/i.test(navigator.userAgent)
    ? "Chrome"
    : /Safari/i.test(navigator.userAgent)
      ? "Safari"
      : /Firefox/i.test(navigator.userAgent)
        ? "Firefox"
        : "Browser";
  return `${browser} on ${platform}`;
}
