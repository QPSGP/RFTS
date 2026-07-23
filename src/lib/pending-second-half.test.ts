import {
  PENDING_SECOND_HALF_MAX_AGE_MS,
  PENDING_SECOND_HALF_STORAGE_KEY,
  clearPendingSecondHalfSession,
  isPendingSecondHalfDue,
  readPendingSecondHalfSession,
  savePendingSecondHalfSession
} from "./pending-second-half";

describe("pending-second-half", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("saves and reads a pending session", () => {
    const secondStartAt = Date.now() + 60_000;
    savePendingSecondHalfSession({
      secondStartAt,
      gapHours: 2.5,
      firstTrack: { title: "First", url: "/a", skuCode: "S01A" },
      secondTrack: { title: "Second", url: "/b", skuCode: "S01B" },
      prepAudio: { title: "Intro", url: "/prep" },
      scheduleNightNumber: 3
    });
    const read = readPendingSecondHalfSession();
    expect(read?.secondTrack.url).toBe("/b");
    expect(read?.scheduleNightNumber).toBe(3);
    expect(isPendingSecondHalfDue(read!)).toBe(false);
  });

  it("treats past secondStartAt as due", () => {
    savePendingSecondHalfSession({
      secondStartAt: Date.now() - 1000,
      gapHours: 2.5,
      firstTrack: { title: "First", url: "/a" },
      secondTrack: { title: "Second", url: "/b" }
    });
    const read = readPendingSecondHalfSession();
    expect(isPendingSecondHalfDue(read!)).toBe(true);
  });

  it("expires stale sessions", () => {
    savePendingSecondHalfSession({
      secondStartAt: Date.now() - 1000,
      gapHours: 2.5,
      firstTrack: { title: "First", url: "/a" },
      secondTrack: { title: "Second", url: "/b" },
      savedAt: Date.now() - PENDING_SECOND_HALF_MAX_AGE_MS - 1
    });
    expect(readPendingSecondHalfSession()).toBeNull();
    expect(window.localStorage.getItem(PENDING_SECOND_HALF_STORAGE_KEY)).toBeNull();
  });

  it("clears storage", () => {
    savePendingSecondHalfSession({
      secondStartAt: Date.now() + 1000,
      gapHours: 2.5,
      firstTrack: { title: "First", url: "/a" },
      secondTrack: { title: "Second", url: "/b" }
    });
    clearPendingSecondHalfSession();
    expect(readPendingSecondHalfSession()).toBeNull();
  });
});
