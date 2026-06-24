import { fireEvent, render, screen } from "@testing-library/react";
import AdminAudioPreview from "./AdminAudioPreview";

describe("AdminAudioPreview", () => {
  it("rewinds 10 seconds and resumes playback", () => {
    render(<AdminAudioPreview src="/test-audio.mp3" />);

    const audio = document.querySelector("audio") as HTMLAudioElement;
    const button = screen.getByRole("button", { name: /repeat last 10 seconds/i });

    Object.defineProperty(audio, "currentTime", {
      writable: true,
      value: 45
    });
    audio.play = jest.fn().mockResolvedValue(undefined);

    fireEvent.click(button);

    expect(audio.currentTime).toBe(35);
    expect(audio.play).toHaveBeenCalled();
  });

  it("does not rewind below zero", () => {
    render(<AdminAudioPreview src="/test-audio.mp3" />);

    const audio = document.querySelector("audio") as HTMLAudioElement;
    const button = screen.getByRole("button", { name: /repeat last 10 seconds/i });

    Object.defineProperty(audio, "currentTime", {
      writable: true,
      value: 5
    });
    audio.play = jest.fn().mockResolvedValue(undefined);

    fireEvent.click(button);

    expect(audio.currentTime).toBe(0);
  });
});
