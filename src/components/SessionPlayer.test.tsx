/**
 * SessionPlayer tests: advance from prep to first track and "Tap play" uses first track.
 */
import "@testing-library/jest-dom";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SessionPlayer from "./SessionPlayer";

const PREP = { title: "Preparation", url: "/api/stream/audio?prep=1" };
const FIRST_TRACK = { title: "First Goal Recording", url: "/api/stream/audio?id=first-123" };

function mockAudioElement() {
  const listeners: Record<string, (() => void)[]> = {};
  const mock = {
    src: "",
    load: jest.fn(),
    play: jest.fn().mockResolvedValue(undefined),
    pause: jest.fn(),
    addEventListener: jest.fn((event: string, fn: () => void) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(fn);
    }),
    removeEventListener: jest.fn(),
    removeAttribute: jest.fn(),
    dispatchEvent: jest.fn(),
    _emit: (event: string) => {
      (listeners[event] || []).forEach((fn) => fn());
    },
  };
  return mock;
}

describe("SessionPlayer", () => {
  let mockAudio: ReturnType<typeof mockAudioElement>;

  beforeEach(() => {
    mockAudio = mockAudioElement();
    jest.spyOn(window.HTMLMediaElement.prototype, "play").mockImplementation(function (this: HTMLAudioElement) {
      return (mockAudio.play as jest.Mock)();
    });
    jest.spyOn(window.HTMLMediaElement.prototype, "load").mockImplementation(function (this: HTMLAudioElement) {
      (mockAudio.load as jest.Mock)();
    });
    jest.spyOn(window.HTMLMediaElement.prototype, "pause").mockImplementation(function (this: HTMLAudioElement) {
      (mockAudio.pause as jest.Mock)();
    });
    Object.defineProperty(window.HTMLMediaElement.prototype, "src", {
      set(value: string) {
        mockAudio.src = value;
      },
      get() {
        return mockAudio.src;
      },
      configurable: true,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("advances from prep to first track when prep ends", async () => {
    render(
      <SessionPlayer
        prepAudio={PREP}
        firstTrack={FIRST_TRACK}
        gapHours={2.5}
        playsPerNight={2}
        autoStart={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Now Playing:/)).toBeInTheDocument();
    });

    const nowPlaying = screen.getByText(/Now Playing:/);
    expect(nowPlaying).toHaveTextContent(PREP.title);

    const audio = document.querySelector("audio");
    expect(audio).toBeInTheDocument();

    await act(async () => {
      audio?.dispatchEvent(new Event("ended"));
    });

    await waitFor(() => {
      expect(screen.getByText(/Now Playing:/)).toHaveTextContent(FIRST_TRACK.title);
    });

    expect(screen.getByText(/Now Playing:/)).toHaveTextContent(FIRST_TRACK.title);
  });

  it("when user taps Play after advance, plays first track (not prep)", async () => {
    render(
      <SessionPlayer
        prepAudio={PREP}
        firstTrack={FIRST_TRACK}
        gapHours={2.5}
        playsPerNight={2}
        autoStart={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Now Playing:/)).toHaveTextContent(PREP.title);
    });

    const audio = document.querySelector("audio");
    await act(async () => {
      audio?.dispatchEvent(new Event("ended"));
    });

    await waitFor(() => {
      expect(screen.getByText(/Now Playing:/)).toHaveTextContent(FIRST_TRACK.title);
    });

    mockAudio.play.mockClear();
    const playButton = screen.getByRole("button", { name: /^Play$/i });
    await userEvent.click(playButton);

    await waitFor(() => {
      expect(mockAudio.src).toBe(FIRST_TRACK.url);
    });
  });

  it("shows message when Start Session is clicked with no firstTrack", async () => {
    render(
      <SessionPlayer
        prepAudio={PREP}
        firstTrack={null}
        gapHours={2.5}
        playsPerNight={1}
        autoStart={false}
      />
    );

    const startButton = screen.getByRole("button", { name: /Start Session/i });
    await userEvent.click(startButton);

    expect(screen.getByText(/Select goals to build your session lineup/i)).toBeInTheDocument();
  });
});
