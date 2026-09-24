import "@testing-library/jest-dom";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WhyItWorksVideoButton from "./WhyItWorksVideoButton";
import { TERRY_LONG_VIDEO_SRC, TERRY_LONG_VIDEO_TITLE, WHY_IT_WORKS_VIDEO_TITLE } from "@/lib/video-play-log";

jest.mock("@vercel/analytics", () => ({
  track: jest.fn()
}));

describe("WhyItWorksVideoButton", () => {
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: async () => ""
  });

  beforeEach(() => {
    fetchMock.mockClear();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it("logs when the explainer video starts playing", async () => {
    const user = userEvent.setup();
    render(<WhyItWorksVideoButton />);
    await user.click(screen.getByRole("button", { name: "Why it works" }));
    const video = document.querySelector("video");
    expect(video).toBeTruthy();
    act(() => {
      video?.dispatchEvent(new Event("playing"));
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/user/activity",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining(`"action":"played_video"`)
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/user/activity",
      expect.objectContaining({
        body: expect.stringContaining(WHY_IT_WORKS_VIDEO_TITLE)
      })
    );
  });

  it("Learn more plays the long Terry video while the short one is running", async () => {
    const user = userEvent.setup();
    render(<WhyItWorksVideoButton />);
    await user.click(screen.getByRole("button", { name: "Why it works" }));
    const video = document.querySelector("video");
    expect(video?.querySelector("source")?.getAttribute("src")).toBe(
      "/Images/Terry-RFTS-short-for-web-T3.mp4"
    );
    act(() => {
      video?.dispatchEvent(new Event("playing"));
    });
    await user.click(await screen.findByRole("button", { name: "Learn more" }));
    const longVideo = document.querySelector("video");
    expect(longVideo?.querySelector("source")?.getAttribute("src")).toBe(TERRY_LONG_VIDEO_SRC);
    act(() => {
      longVideo?.dispatchEvent(new Event("playing"));
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/user/activity",
      expect.objectContaining({
        body: expect.stringContaining(TERRY_LONG_VIDEO_TITLE)
      })
    );
  });
});
