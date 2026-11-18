import { describe, it, expect } from "vitest";
import { isR2ObjectId, mimeForKey, resolveMediaStorage } from "@/lib/media-storage";

describe("resolveMediaStorage", () => {
  it("uses R2 when it is available in automatic mode", () => {
    expect(resolveMediaStorage("auto", true)).toBe("r2");
  });

  it("falls back to the database in automatic mode without R2", () => {
    expect(resolveMediaStorage("auto", false)).toBe("database");
  });

  it("honours database mode even when R2 is available", () => {
    expect(resolveMediaStorage("database", true)).toBe("database");
  });

  it("reports unavailable when R2 is forced but not configured", () => {
    expect(resolveMediaStorage("r2", false)).toBe("unavailable");
  });
});

describe("R2 object ids", () => {
  it("detects R2 keys by their path separator", () => {
    expect(isR2ObjectId("tracksuitsites/2026/abc.png")).toBe(true);
    expect(isR2ObjectId("f944e389315b40ffbfd7d0e2598d2a79")).toBe(false);
  });

  it("maps common extensions to mime types", () => {
    expect(mimeForKey("a/b.png")).toBe("image/png");
    expect(mimeForKey("a/b.jpg")).toBe("image/jpeg");
    expect(mimeForKey("a/b.webp")).toBe("image/webp");
    expect(mimeForKey("a/b.unknown")).toBe("image/*");
  });
});
