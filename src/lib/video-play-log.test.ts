import {
  WHY_IT_WORKS_VIDEO_TITLE,
  logWhyItWorksVideoStarted,
  whyItWorksVideoLogDetails
} from "./video-play-log";

jest.mock("@vercel/analytics", () => ({
  track: jest.fn()
}));

describe("video-play-log", () => {
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: async () => ""
  });

  beforeEach(() => {
    fetchMock.mockClear();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it("builds activity details with page path", () => {
    expect(whyItWorksVideoLogDetails("/health")).toBe(
      `${WHY_IT_WORKS_VIDEO_TITLE} | /health`
    );
  });

  it("posts played_video when the video starts", () => {
    logWhyItWorksVideoStarted("/how-it-works");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/user/activity",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          action: "played_video",
          details: `${WHY_IT_WORKS_VIDEO_TITLE} | /how-it-works`
        })
      })
    );
  });
});
