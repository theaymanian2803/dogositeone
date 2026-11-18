// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  cleanSectionStyle,
  isSectionStyleEmpty,
  sectionStyleFromConfig,
  withSectionStyle,
  type PageSection,
} from "@/lib/cms";
import { resolveSectionStyle } from "@/components/site/section-style";

describe("cleanSectionStyle", () => {
  it("keeps recognised tokens", () => {
    expect(
      cleanSectionStyle({
        background: "#111111",
        titleColor: "#FFF",
        titleFont: "Syne",
        titleSize: "lg",
        align: "center",
        uppercase: true,
        imageSide: "left",
        layout: "background",
        overlay: 60,
      }),
    ).toEqual({
      background: "#111111",
      titleColor: "#fff",
      titleFont: "Syne",
      titleSize: "lg",
      align: "center",
      uppercase: true,
      imageSide: "left",
      layout: "background",
      overlay: 60,
    });
  });

  it("drops anything that could inject CSS or is unknown", () => {
    expect(
      cleanSectionStyle({
        titleColor: "red; background:url(javascript:alert(1))",
        background: "url(evil.png)",
        titleFont: 'Syne"; color:red;',
        titleSize: "huge",
        align: "justify",
        overlay: 500,
        unknownKey: "x",
      }),
    ).toEqual({});
  });

  it("ignores non-objects", () => {
    expect(cleanSectionStyle(null)).toEqual({});
    expect(cleanSectionStyle("x")).toEqual({});
    expect(cleanSectionStyle([])).toEqual({});
  });
});

describe("section style config helpers", () => {
  it("reads style out of a section config", () => {
    expect(sectionStyleFromConfig({ style: { titleColor: "#123456" } })).toEqual({
      titleColor: "#123456",
    });
    expect(sectionStyleFromConfig({})).toEqual({});
  });

  it("writes style into config and clears it when empty", () => {
    expect(withSectionStyle({ eyebrow: "Hi" }, { titleColor: "#123456" })).toEqual({
      eyebrow: "Hi",
      style: { titleColor: "#123456" },
    });
    expect(withSectionStyle({ eyebrow: "Hi", style: { titleColor: "#123456" } }, {})).toEqual({
      eyebrow: "Hi",
    });
    expect(isSectionStyleEmpty({})).toBe(true);
    expect(isSectionStyleEmpty({ align: "center" })).toBe(false);
  });
});

function section(config: Record<string, unknown> = {}, imageUrl = ""): PageSection {
  return {
    id: "sec-test",
    key: "test_section",
    type: "promo",
    title: "Title",
    subtitle: "Subtitle",
    imageUrl,
    visible: true,
    sortOrder: 0,
    config: config as PageSection["config"],
  };
}

describe("resolveSectionStyle", () => {
  it("leaves everything inherited when no style is set", () => {
    const resolved = resolveSectionStyle(section());

    expect(resolved.wrapper).toEqual({});
    expect(resolved.title).toEqual({});
    expect(resolved.subtitle).toEqual({});
    expect(resolved.backgroundLayout).toBe(false);
    expect(resolved.imageSide).toBe("right");
  });

  it("maps size tokens to responsive type scales", () => {
    const resolved = resolveSectionStyle(
      section({ style: { titleSize: "xl", subtitleSize: "lg" } }),
    );

    expect(resolved.title.fontSize).toContain("clamp(");
    expect(resolved.subtitle.fontSize).toBe("17px");
  });

  it("defaults to readable text over a background image", () => {
    const resolved = resolveSectionStyle(
      section({ style: { layout: "background" } }, "/api/media/abc123"),
    );

    expect(resolved.backgroundLayout).toBe(true);
    expect(resolved.title.color).toBe("#ffffff");
    expect(resolved.subtitle.color).toContain("255,255,255");
  });

  it("keeps explicit colours over a background image", () => {
    const resolved = resolveSectionStyle(
      section({ style: { layout: "background", titleColor: "#101010" } }, "/api/media/abc123"),
    );

    expect(resolved.title.color).toBe("#101010");
  });
});
