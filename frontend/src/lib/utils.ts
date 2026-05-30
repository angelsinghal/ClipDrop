import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export function formatExpiry(expiresAt: number | null): string | null {
  if (!expiresAt) return null;
  const remaining = expiresAt - Date.now();
  if (remaining <= 0) return "Expired";
  const min = Math.floor(remaining / 60000);
  if (min < 60) return `${min}m left`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h left`;
  return `${Math.floor(hr / 24)}d left`;
}

export function detectSnippetType(content: string): import("@/types").SnippetType {
  const trimmed = content.trim();
  if (/^https?:\/\//i.test(trimmed)) return "link";
  if (trimmed.includes("\n") && /[{();}]/.test(trimmed)) return "code";
  return "text";
}

export function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return `${str.slice(0, max)}…`;
}
