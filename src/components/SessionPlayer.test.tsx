/**
 * SessionPlayer tests: advance from prep to first track and "Tap play" uses first track.
 */
jest.mock("nosleep.js", () => ({
  __esModule: true,
  default: class {
    enable = jest.fn().mockResolvedValue(undefined);
    disable = jest.fn();
  }
}));

import "@testing-library/jest-dom";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SessionPlayer from "./SessionPlayer";

const PREP = { title: "Intro relaxation music", url: "/api/stream/audio?prep=1" };
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
    jest.useRealTimers();
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

  it("after intro ends, tap play loads the main track (not intro relaxation music again)", async () => {
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

    const audio = document.querySelector("audio") as HTMLAudioElement;
    Object.defineProperty(audio, "ended", { value: true, configurable: true });
    Object.defineProperty(audio, "duration", { value: 60, configurable: true });
    Object.defineProperty(audio, "currentTime", { value: 60, configurable: true });

    await act(async () => {
      audio.dispatchEvent(new Event("ended"));
    });

    await waitFor(() => {
      expect(screen.getByText(/Now Playing:/)).toHaveTextContent(FIRST_TRACK.title);
    });

    mockAudio.src = PREP.url;
    mockAudio.play.mockClear();
    const playButton = screen.getByRole("button", { name: /^Play$/i });
    await userEvent.click(playButton);

    await waitFor(() => {
      expect(mockAudio.src).toBe(FIRST_TRACK.url);
    });
  });

  it("when first track loads after advance, play() is called (autoplay path)", async () => {
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
    await act(async () => {
      audio?.dispatchEvent(new Event("canplaythrough"));
    });

    expect(mockAudio.play).toHaveBeenCalled();
  });

  it("when first track is cued, Start Session restarts the session from intro relaxation music (beginning of session)", async () => {
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
    mockAudio.src = "";
    const startButton = screen.getByRole("button", { name: /Start Session/i });
    await userEvent.click(startButton);

    expect(mockAudio.src).toBe(PREP.url);
    expect(mockAudio.play).toHaveBeenCalled();
    expect(screen.getByText(/Now Playing:/)).toHaveTextContent(PREP.title);
  });

  it("hides Pause/Play/Restart after first segment ends (gap before second)", async () => {
    jest.useFakeTimers();
    const SECOND = { title: "Second Recording", url: "/api/stream/audio?id=second-456" };
    render(
      <SessionPlayer
        firstTrack={FIRST_TRACK}
        secondTrack={SECOND}
        gapHours={2.5}
        playsPerNight={2}
        autoStart={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Now Playing:/)).toHaveTextContent(FIRST_TRACK.title);
    });

    const audio = document.querySelector("audio");
    await act(async () => {
      audio?.dispatchEvent(new Event("ended"));
    });

    await waitFor(() => {
      expect(screen.getByText(/First session complete/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /^Pause$/i })).not.toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(2.5 * 60 * 60 * 1000);
    });

    await waitFor(() => {
      expect(screen.getByText(/Now Playing:/)).toHaveTextContent(SECOND.title);
    });

    await act(async () => {
      document.querySelector("audio")?.dispatchEvent(new Event("ended"));
    });

    await waitFor(() => {
      expect(screen.queryByText(/Now Playing:/)).not.toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /^Pause$/i })).not.toBeInTheDocument();

    jest.useRealTimers();
  });

  it("after gap, second segment starts with prep when prepAudio is set", async () => {
    jest.useFakeTimers();
    const SECOND = { title: "Second Recording", url: "/api/stream/audio?id=second-456" };
    render(
      <SessionPlayer
        prepAudio={PREP}
        firstTrack={FIRST_TRACK}
        secondTrack={SECOND}
        gapHours={2.5}
        playsPerNight={2}
        autoStart={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Now Playing:/)).toHaveTextContent(PREP.title);
    });

    let audio = document.querySelector("audio");
    await act(async () => {
      audio?.dispatchEvent(new Event("ended"));
    });

    await waitFor(() => {
      expect(screen.getByText(/Now Playing:/)).toHaveTextContent(FIRST_TRACK.title);
    });

    audio = document.querySelector("audio");
    await act(async () => {
      audio?.dispatchEvent(new Event("ended"));
    });

    await waitFor(() => {
      expect(screen.getByText(/First session complete/i)).toBeInTheDocument();
    });

    await act(async () => {
      jest.advanceTimersByTime(2.5 * 60 * 60 * 1000);
    });

    await waitFor(() => {
      expect(screen.getByText(/Now Playing:/)).toHaveTextContent(PREP.title);
    });

    audio = document.querySelector("audio");
    await act(async () => {
      audio?.dispatchEvent(new Event("ended"));
    });

    await waitFor(() => {
      expect(screen.getByText(/Now Playing:/)).toHaveTextContent(SECOND.title);
    });

    jest.useRealTimers();
  });

  it("Play second during gap starts the second half (silent gap bridge keeps <audio> mounted)", async () => {
    const SECOND = { title: "Second Recording", url: "/api/stream/audio?id=second-456" };
    render(
      <SessionPlayer
        prepAudio={PREP}
        firstTrack={FIRST_TRACK}
        secondTrack={SECOND}
        gapHours={2.5}
        playsPerNight={2}
        autoStart={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Now Playing:/)).toHaveTextContent(PREP.title);
    });

    let audio = document.querySelector("audio");
    await act(async () => {
      audio?.dispatchEvent(new Event("ended"));
    });
    await waitFor(() => {
      expect(screen.getByText(/Now Playing:/)).toHaveTextContent(FIRST_TRACK.title);
    });

    audio = document.querySelector("audio");
    await act(async () => {
      audio?.dispatchEvent(new Event("ended"));
    });
    await waitFor(() => {
      expect(screen.getByText(/First session complete/i)).toBeInTheDocument();
    });
    expect(document.querySelector("audio")).toBeInTheDocument();

    mockAudio.play.mockClear();
    const playSecondBtn = screen.getByRole("button", { name: /Play Second Audio/i });
    await userEvent.click(playSecondBtn);

    await waitFor(() => {
      expect(screen.getByText(/Now Playing:/)).toHaveTextContent(PREP.title);
    });
    const audioAfter = document.querySelector("audio");
    expect(audioAfter).toBeInTheDocument();
    await act(async () => {
      audioAfter?.dispatchEvent(new Event("canplay"));
    });
    expect(mockAudio.play).toHaveBeenCalled();
  });

  it("Start Session during gap starts second half instead of replaying first", async () => {
    const SECOND = { title: "Second Recording", url: "/api/stream/audio?id=second-456" };
    render(
      <SessionPlayer
        prepAudio={PREP}
        firstTrack={FIRST_TRACK}
        secondTrack={SECOND}
        gapHours={2.5}
        playsPerNight={2}
        autoStart={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Now Playing:/)).toHaveTextContent(PREP.title);
    });

    let audio = document.querySelector("audio");
    await act(async () => {
      audio?.dispatchEvent(new Event("ended"));
    });
    await waitFor(() => {
      expect(screen.getByText(/Now Playing:/)).toHaveTextContent(FIRST_TRACK.title);
    });

    audio = document.querySelector("audio");
    await act(async () => {
      audio?.dispatchEvent(new Event("ended"));
    });
    await waitFor(() => {
      expect(screen.getByText(/First session complete/i)).toBeInTheDocument();
    });

    mockAudio.src = "";
    mockAudio.play.mockClear();
    const startSecondBtn = screen.getByRole("button", { name: /Start second audio now/i });
    await userEvent.click(startSecondBtn);

    await waitFor(() => {
      expect(screen.getByText(/Now Playing:/)).toHaveTextContent(PREP.title);
    });
    expect(mockAudio.src).toBe(PREP.url);
    expect(mockAudio.src).not.toBe(FIRST_TRACK.url);
  });

  it("hides transport after only nightly audio completes (1 per night)", async () => {
    render(
      <SessionPlayer
        prepAudio={PREP}
        firstTrack={FIRST_TRACK}
        gapHours={2.5}
        playsPerNight={1}
        autoStart={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Now Playing:/)).toHaveTextContent(PREP.title);
    });

    let audio = document.querySelector("audio");
    await act(async () => {
      audio?.dispatchEvent(new Event("ended"));
    });

    await waitFor(() => {
      expect(screen.getByText(/Now Playing:/)).toHaveTextContent(FIRST_TRACK.title);
    });

    audio = document.querySelector("audio");
    await act(async () => {
      audio?.dispatchEvent(new Event("ended"));
    });

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /^Pause$/i })).not.toBeInTheDocument();
    });
    expect(screen.getByText(/Session complete/i)).toBeInTheDocument();

    const startAgain = screen.getByRole("button", { name: /Start Session/i });
    await userEvent.click(startAgain);

    await waitFor(() => {
      expect(screen.getByText(/Now Playing:/)).toHaveTextContent(PREP.title);
    });
    expect(screen.getByRole("button", { name: /^Pause$/i })).toBeInTheDocument();
  });

  it("Android auto second-half after gap skips intro and plays goal audio", async () => {
    const SECOND = { title: "Second Recording", url: "/api/stream/audio?id=second-456" };
    const uaSpy = jest.spyOn(window.navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36"
    );
    render(
      <SessionPlayer
        prepAudio={PREP}
        firstTrack={FIRST_TRACK}
        secondTrack={SECOND}
        gapHours={1 / 3600}
        playsPerNight={2}
        autoStart={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Now Playing:/)).toHaveTextContent(PREP.title);
    });
    let audio = document.querySelector("audio");
    await act(async () => {
      audio?.dispatchEvent(new Event("ended"));
    });
    await waitFor(() => {
      expect(screen.getByText(/Now Playing:/)).toHaveTextContent(FIRST_TRACK.title);
    });
    audio = document.querySelector("audio");
    await act(async () => {
      audio?.dispatchEvent(new Event("ended"));
    });
    await waitFor(() => {
      expect(screen.getByText(/First session complete/i)).toBeInTheDocument();
    });

    await waitFor(
      () => {
        expect(screen.getByText(/Now Playing:/)).toHaveTextContent(SECOND.title);
      },
      { timeout: 5000 }
    );
    expect(screen.getByText(/Now Playing:/)).not.toHaveTextContent(PREP.title);
    uaSpy.mockRestore();
  });

  it("End session during gap cancels second recording", async () => {
    const SECOND = { title: "Second Recording", url: "/api/stream/audio?id=second-456" };
    render(
      <SessionPlayer
        firstTrack={FIRST_TRACK}
        secondTrack={SECOND}
        gapHours={1 / 3600}
        playsPerNight={2}
        autoStart={true}
      />
    );

    await waitFor(
      () => {
        expect(screen.getByText(/Now Playing:/)).toHaveTextContent(FIRST_TRACK.title);
      },
      { timeout: 10000 }
    );

    const audio = document.querySelector("audio");
    await act(async () => {
      audio?.dispatchEvent(new Event("ended"));
    });

    await waitFor(() => {
      expect(screen.getByText(/First session complete/i)).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: /End session — cancel second recording/i }));

    await waitFor(() => {
      expect(screen.queryByText(/First session complete/i)).not.toBeInTheDocument();
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 2000));
    });

    expect(screen.queryByText(/Now Playing:/)).not.toBeInTheDocument();
  });

  it("End session during playback clears Now Playing", async () => {
    render(
      <SessionPlayer
        prepAudio={PREP}
        firstTrack={FIRST_TRACK}
        gapHours={2.5}
        playsPerNight={2}
        autoStart={true}
      />
    );

    await waitFor(
      () => {
        expect(screen.getByText(/Now Playing:/)).toBeInTheDocument();
      },
      { timeout: 10000 }
    );

    await userEvent.click(screen.getByRole("button", { name: /^End session$/i }));

    await waitFor(() => {
      expect(screen.queryByText(/Now Playing:/)).not.toBeInTheDocument();
    });
    expect(screen.getByText(/Session ended/i)).toBeInTheDocument();
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
