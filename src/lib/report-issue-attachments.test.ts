import {
  mergeReportIssueAttachmentUrls,
  REPORT_ISSUE_MAX_ATTACHMENTS,
  resolveReportIssueAttachmentUrls
} from "./report-issue-attachments";

describe("mergeReportIssueAttachmentUrls", () => {
  it("merges and dedupes up to max attachments", () => {
    const urls = mergeReportIssueAttachmentUrls(
      ["https://a.example/1.png", "https://a.example/2.mp4"],
      "https://a.example/1.png"
    );
    expect(urls).toEqual(["https://a.example/1.png", "https://a.example/2.mp4"]);
  });

  it("caps at max attachments", () => {
    const urls = mergeReportIssueAttachmentUrls(
      ["https://a.example/1.png", "https://a.example/2.png", "https://a.example/3.png"],
      "https://a.example/4.png"
    );
    expect(urls).toHaveLength(REPORT_ISSUE_MAX_ATTACHMENTS);
  });
});

describe("resolveReportIssueAttachmentUrls", () => {
  it("prefers attachment_urls column", () => {
    expect(
      resolveReportIssueAttachmentUrls(
        ["https://a.example/1.png", "https://a.example/2.mp4"],
        "https://a.example/legacy.png"
      )
    ).toEqual(["https://a.example/1.png", "https://a.example/2.mp4"]);
  });

  it("falls back to screenshot_url", () => {
    expect(resolveReportIssueAttachmentUrls(null, "https://a.example/legacy.png")).toEqual([
      "https://a.example/legacy.png"
    ]);
  });
});
