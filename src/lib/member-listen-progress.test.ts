import {
  buildListenProgressReport,
  isCompletedFullListenOutcome,
  parseMemberListenTitle
} from "./member-listen-progress";

describe("member-listen-progress", () => {
  it("parses Play Options and Library titles and skips intro music", () => {
    expect(
      parseMemberListenTitle("played_audio", "Play Options - First: T12 – Sleep Deep")
    ).toEqual({ title: "T12 – Sleep Deep", source: "session" });
    expect(
      parseMemberListenTitle("played_audio", "Library - T08 – Calm Focus")
    ).toEqual({ title: "T08 – Calm Focus", source: "library" });
    expect(
      parseMemberListenTitle("played_audio", "Play Options - Intro relaxation music")
    ).toBeNull();
  });

  it("detects completed full listen outcomes", () => {
    expect(
      isCompletedFullListenOutcome("Play Options - First: T1 – Title | completed full listen")
    ).toBe(true);
    expect(
      isCompletedFullListenOutcome("Library - T1 – Title | stopped before end (did not complete)")
    ).toBe(false);
  });

  it("aggregates starts and completions per audio", () => {
    const report = buildListenProgressReport(
      [
        {
          action: "audio_playback_outcome",
          details: "Play Options - First: T1 – Alpha | completed full listen",
          createdAt: "2026-07-14T12:00:00.000Z"
        },
        {
          action: "played_audio",
          details: "Play Options - First: T1 – Alpha",
          createdAt: "2026-07-14T11:00:00.000Z"
        },
        {
          action: "played_audio",
          details: "Library - T1 – Alpha",
          createdAt: "2026-07-13T11:00:00.000Z"
        },
        {
          action: "audio_playback_outcome",
          details: "Play Options - Intro relaxation music | completed full listen",
          createdAt: "2026-07-14T10:00:00.000Z"
        }
      ],
      7
    );
    expect(report.scheduleStepsCompleted).toBe(7);
    expect(report.totalCompletions).toBe(1);
    expect(report.totalStarts).toBe(2);
    expect(report.tracks).toHaveLength(1);
    expect(report.tracks[0]).toMatchObject({
      title: "T1 – Alpha",
      source: "both",
      timesStarted: 2,
      timesCompleted: 1
    });
  });
});
