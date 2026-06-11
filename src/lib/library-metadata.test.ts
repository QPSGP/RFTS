import {
  extractSkuFromName,
  lookupRecordingDescription,
  titleFromFileName
} from "./library-metadata";

describe("library-metadata", () => {
  it("extracts SKU codes from file names", () => {
    expect(extractSkuFromName("T-18-abundance.mp3")).toBe("T-18");
    expect(extractSkuFromName("RFTS T 04 health.mp3")).toBe("T-04");
  });

  it("builds titles from file names", () => {
    expect(titleFromFileName("T-18-abundance-for-success.mp3")).toBe("abundance for success");
  });

  it("looks up known recording descriptions", () => {
    const desc = lookupRecordingDescription("T-18");
    expect(desc.length).toBeGreaterThan(10);
    expect(desc.toLowerCase()).toContain("abundance");
  });
});
