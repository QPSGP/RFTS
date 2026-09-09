import {
  isSafeEventLeadScanRelativePath,
  leadScanContentType,
  resolveEventLeadScanFile
} from "./event-lead-scan";

describe("event-lead-scan", () => {
  it("accepts repo-relative jpeg paths under docs/lead-card-scans", () => {
    expect(
      isSafeEventLeadScanRelativePath(
        "docs/lead-card-scans/long-beach-2026-08/jpg/20260803_124059.jpg"
      )
    ).toBe(true);
    expect(isSafeEventLeadScanRelativePath("docs/lead-card-scans/20260803_124059-1.jpg")).toBe(
      true
    );
  });

  it("rejects traversal, absolute, and non-scan paths", () => {
    expect(isSafeEventLeadScanRelativePath("docs/lead-card-scans/../.env.local")).toBe(false);
    expect(isSafeEventLeadScanRelativePath("C:/secret.jpg")).toBe(false);
    expect(isSafeEventLeadScanRelativePath("/etc/passwd")).toBe(false);
    expect(isSafeEventLeadScanRelativePath("docs/secret.jpg")).toBe(false);
    expect(isSafeEventLeadScanRelativePath("docs/lead-card-scans/foo.exe")).toBe(false);
    expect(isSafeEventLeadScanRelativePath("docs/lead-card-scans/extracts.json")).toBe(false);
    expect(isSafeEventLeadScanRelativePath("")).toBe(false);
    expect(isSafeEventLeadScanRelativePath(null)).toBe(false);
  });

  it("maps image extensions to content types", () => {
    expect(leadScanContentType("card.jpg")).toBe("image/jpeg");
    expect(leadScanContentType("card.PNG")).toBe("image/png");
    expect(leadScanContentType("card.pdf")).toBe("application/pdf");
  });

  it("returns null when the scan file is missing", () => {
    expect(resolveEventLeadScanFile("docs/lead-card-scans/missing-no-such-file.jpg")).toBeNull();
  });
});
