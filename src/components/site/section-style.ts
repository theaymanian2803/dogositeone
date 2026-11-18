import type { CSSProperties } from "react";

import { sectionStyleFromConfig, type PageSection, type SectionStyle } from "@/lib/cms";

const TITLE_SIZE: Record<string, string> = {
  sm: "clamp(26px, 3.2vw, 34px)",
  md: "clamp(34px, 4.8vw, 50px)",
  lg: "clamp(44px, 6.2vw, 66px)",
  xl: "clamp(52px, 7.6vw, 84px)",
};

const SUBTITLE_SIZE: Record<string, string> = {
  sm: "12px",
  md: "14px",
  lg: "17px",
};

export type ResolvedSectionStyle = {
  style: SectionStyle;
  hasImage: boolean;
  /** Image is painted behind the content instead of beside it. */
  backgroundLayout: boolean;
  overlay: number;
  imageSide: "left" | "right";
  wrapper: CSSProperties;
  title: CSSProperties;
  subtitle: CSSProperties;
  eyebrow: CSSProperties;
  /** Applied to the text column so alignment also affects the CTA row. */
  content: CSSProperties;
  /** Applied to the image element in split layouts. */
  imageOrder: CSSProperties;
};

/**
 * Turns a section's stored design overrides into inline styles. Unset values
 * stay undefined so the existing template classes keep doing their job, which
 * is what makes every current section render exactly as before.
 */
export function resolveSectionStyle(section: PageSection): ResolvedSectionStyle {
  const style = sectionStyleFromConfig(section.config);
  const hasImage = Boolean(section.imageUrl);
  const backgroundLayout = hasImage && style.layout === "background";

  const wrapper: CSSProperties = {};
  if (style.background) wrapper.backgroundColor = style.background;

  const content: CSSProperties = {};
  if (style.align) content.textAlign = style.align;

  const title: CSSProperties = {};
  if (style.titleColor) title.color = style.titleColor;
  if (style.titleFont) title.fontFamily = `"${style.titleFont}", sans-serif`;
  if (style.titleSize) title.fontSize = TITLE_SIZE[style.titleSize];
  if (style.uppercase !== undefined) title.textTransform = style.uppercase ? "uppercase" : "none";
  if (style.align) title.textAlign = style.align;

  const subtitle: CSSProperties = {};
  if (style.subtitleColor) subtitle.color = style.subtitleColor;
  if (style.bodyFont) subtitle.fontFamily = `"${style.bodyFont}", sans-serif`;
  if (style.subtitleSize) subtitle.fontSize = SUBTITLE_SIZE[style.subtitleSize];
  if (style.align) subtitle.textAlign = style.align;

  const eyebrow: CSSProperties = {};
  if (style.eyebrowColor) eyebrow.color = style.eyebrowColor;

  // Text over a photo needs a readable default; explicit colours still win.
  if (backgroundLayout) {
    if (!title.color) title.color = "#ffffff";
    if (!subtitle.color) subtitle.color = "rgba(255,255,255,0.85)";
    if (!eyebrow.color) eyebrow.color = "#ffffff";
  }

  const imageOrder: CSSProperties = style.imageSide === "left" ? { order: -1 } : {};

  return {
    style,
    hasImage,
    backgroundLayout,
    overlay: style.overlay ?? 45,
    imageSide: style.imageSide ?? "right",
    wrapper,
    title,
    subtitle,
    eyebrow,
    content,
    imageOrder,
  };
}
