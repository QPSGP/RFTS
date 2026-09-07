import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import AdminSiteCopy from "./AdminSiteCopy";

const blogPath = "/blog/pain-louder-at-night-guided-meditation-comfort-sleep";

const pageRow = {
  kind: "blog",
  kindLabel: "Blog articles",
  path: blogPath,
  slug: "pain-louder-at-night-guided-meditation-comfort-sleep",
  label: "When pain is louder at night",
  customized: false
};

const editorPayload = {
  path: blogPath,
  kind: "blog",
  slug: pageRow.slug,
  label: pageRow.label,
  defaults: {
    title: pageRow.label,
    metaTitle: "Meta",
    metaDescription: "Desc",
    excerpt: "Excerpt",
    readMinutes: 6,
    sections: [{ heading: "One", paragraphs: ["Body"] }],
    transcriptExcerpt: { sessionTitle: "Session", quote: "Quote" }
  },
  current: {
    title: pageRow.label,
    metaTitle: "Meta",
    metaDescription: "Desc",
    excerpt: "Excerpt",
    readMinutes: 6,
    sections: [{ heading: "One", paragraphs: ["Body"] }],
    transcriptExcerpt: { sessionTitle: "Session", quote: "Quote" }
  },
  customized: false
};

function mockCopyApi() {
  global.fetch = jest.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("path=")) {
      return Promise.resolve({
        ok: true,
        json: async () => editorPayload
      } as Response);
    }
    return Promise.resolve({
      ok: true,
      json: async () => ({ pages: [pageRow] })
    } as Response);
  }) as unknown as typeof fetch;
}

describe("AdminSiteCopy preview", () => {
  const originalOpen = window.open;

  beforeEach(() => {
    mockCopyApi();
    window.open = jest.fn(() => ({ close: jest.fn() }) as unknown as Window);
    window.history.replaceState(null, "", "/admin/copy");
  });

  afterEach(() => {
    window.open = originalOpen;
    jest.restoreAllMocks();
  });

  it("opens the live page in a new tab and keeps the editor", async () => {
    render(<AdminSiteCopy />);

    fireEvent.click(await screen.findByRole("option", { name: /when pain is louder at night/i }));

    const preview = await screen.findByRole("link", { name: /preview live page/i });
    expect(preview).toHaveAttribute("href", blogPath);
    expect(preview).toHaveAttribute("target", "_blank");
    expect(preview).toHaveAttribute("rel", "noopener noreferrer");

    fireEvent.click(preview);

    expect(window.open).toHaveBeenCalledWith(blogPath, "_blank", "noopener,noreferrer");
    expect(screen.getByRole("heading", { name: /when pain is louder at night/i })).toBeInTheDocument();
    expect(window.location.pathname + window.location.search).toBe(
      `/admin/copy?path=${encodeURIComponent(blogPath)}`
    );
  });
});
