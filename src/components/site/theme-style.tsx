import type { StoreTheme } from "@/lib/store-settings";

export function ThemeStyle({ theme }: { theme: StoreTheme }) {
  const css = `:root{--hot-pink:${theme.accent};--app-font-display:"${theme.displayFont}",sans-serif;--app-font-sans:"${theme.bodyFont}",sans-serif;}`;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
