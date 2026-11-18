import { describe, it, expect } from "vitest";
import { parseDataUrl } from "@/server/image-data";

const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

describe("parseDataUrl", () => {
  it("accepts a PNG data URL", () => {
    const parsed = parseDataUrl(PNG);
    expect(parsed.mime).toBe("image/png");
    expect(parsed.bytes.byteLength).toBeGreaterThan(0);
  });

  it("rejects a non-image payload", () => {
    expect(() => parseDataUrl("data:text/plain;base64,aGk=")).toThrow(/JPEG/);
  });

  it("rejects a malformed payload", () => {
    expect(() => parseDataUrl("not-a-data-url")).toThrow(/base64/);
  });
});
