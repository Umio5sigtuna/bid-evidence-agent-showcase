import { useSyncExternalStore } from "react";
type Theme = "light" | "dark";
const KEY = "bid2-appearance",
  EVENT = "bid2-themechange";
function read(): Theme {
  try {
    const cookie = document.cookie
      .split(";")
      .map((v) => v.trim())
      .find((v) => v.startsWith(KEY + "="))
      ?.split("=")[1];
    if (cookie === "light" || cookie === "dark") return cookie;
    return localStorage.getItem(KEY) === "dark" ? "dark" : "light";
  } catch {
    return snapshot();
  }
}
function apply(theme: Theme) {
  document.documentElement.dataset.bid2Theme = theme;
  document.documentElement.style.colorScheme = theme;
}
export function initializeTheme() {
  apply(read());
}
function subscribe(update: () => void) {
  const sync = (event: Event) => {
    if (event.type !== EVENT) apply(read());
    update();
  };
  for (const name of [EVENT, "storage", "focus", "pageshow"])
    window.addEventListener(name, sync);
  return () => {
    for (const name of [EVENT, "storage", "focus", "pageshow"])
      window.removeEventListener(name, sync);
  };
}
function snapshot(): Theme {
  return document.documentElement.dataset.bid2Theme === "dark"
    ? "dark"
    : "light";
}
export function ThemeToggle() {
  const theme = useSyncExternalStore(
    subscribe,
    snapshot,
    () => "light" as Theme,
  );
  return (
    <button
      className="theme-toggle"
      aria-label={theme === "dark" ? "切换浅色模式" : "切换深色模式"}
      onClick={() => {
        const next = theme === "dark" ? "light" : "dark";
        apply(next);
        try {
          localStorage.setItem(KEY, next);
          document.cookie =
            KEY + "=" + next + "; Path=/; Max-Age=31536000; SameSite=Lax";
        } catch {
          /* Theme still works when persistence is unavailable. */
        }
        window.dispatchEvent(new Event(EVENT));
      }}
    >
      {theme === "dark" ? "☀ 浅色" : "◐ 深色"}
    </button>
  );
}
