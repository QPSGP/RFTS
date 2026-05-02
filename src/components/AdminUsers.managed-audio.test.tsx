/**
 * Platinum Managed: clicking an audio title appends rotation slots (duplicates allowed).
 */
jest.mock("@vercel/blob/client", () => ({
  put: jest.fn()
}));

import "@testing-library/jest-dom";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminUsers from "./AdminUsers";

const MANAGED_USER = {
  id: "u-managed",
  email: "managed.member@test.local",
  firstName: "Managed",
  lastName: "Tester",
  goalIds: [] as string[],
  subscriptionStatus: "active" as const,
  subscriptionTier: "platinum_managed" as const,
  playsPerNight: 2
};

const LIB_ALPHA = {
  id: "audio-alpha",
  title: "Alpha Track",
  description: "",
  skuCode: "SKU-A",
  coverUrl: "",
  audioUrl: "https://example.com/a.mp3",
  interestIds: [] as string[],
  allowedUserEmails: [] as string[],
  createdAt: "2024-01-01T00:00:00.000Z",
  order: 0
};

const LIB_BETA = {
  id: "audio-beta",
  title: "Beta Track",
  description: "",
  skuCode: "SKU-B",
  coverUrl: "",
  audioUrl: "https://example.com/b.mp3",
  interestIds: [] as string[],
  allowedUserEmails: [] as string[],
  createdAt: "2024-01-01T00:00:00.000Z",
  order: 1
};

function setupFetchMock() {
  global.fetch = jest.fn((input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();

    if (url.includes("/api/admin/users") && url.split("?")[0].endsWith("/api/admin/users")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ users: [MANAGED_USER] })
      } as Response);
    }
    if (url.includes("/api/interests")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ interests: [] })
      } as Response);
    }
    if (url.includes("/api/library")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ library: [LIB_ALPHA, LIB_BETA] })
      } as Response);
    }
    if (url.includes("/api/playback-settings")) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            settings: { fallbackTrackId: "T-18", cgmrTrackId: "" }
          })
      } as Response);
    }
    if (url.includes("/api/admin/member-profile")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ profile: {} })
      } as Response);
    }
    if (url.includes("/api/admin/member-activity")) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            activityLog: [],
            scheduleProgress: null,
            serverTime: new Date().toISOString(),
            newestActivityAt: null
          })
      } as Response);
    }
    if (url.includes("/api/admin/member-audio-order") && url.includes("email=")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ order: [] })
      } as Response);
    }

    return Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: "unmocked " + url })
    } as Response);
  });
}

describe("AdminUsers Platinum Managed rotation", () => {
  beforeEach(() => {
    setupFetchMock();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("appends duplicate slots when the audio title button is clicked repeatedly", async () => {
    const user = userEvent.setup();
    render(<AdminUsers />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /View \/ Edit member/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /View \/ Edit member/i }));

    await screen.findByText(/Check audios designed for them/i);

    await waitFor(() => {
      expect(
        screen.queryByRole("status", { name: /loading saved rotation from server/i })
      ).not.toBeInTheDocument();
    });

    /** Row label is `skuCode || title` — LIB_ALPHA uses SKU-A. */
    const alphaBtn = await screen.findByRole("button", { name: /^SKU-A$/i });
    await user.click(alphaBtn);
    await user.click(alphaBtn);

    const rotationHeading = await screen.findByText(/Rotation order \(live schedule\)/i);
    const rotationCard = rotationHeading.closest(".card");
    expect(rotationCard).toBeTruthy();

    await waitFor(() => {
      const items = within(rotationCard as HTMLElement).getAllByRole("listitem");
      expect(items).toHaveLength(2);
      expect(items[0]).toHaveTextContent(/SKU-A/);
      expect(items[1]).toHaveTextContent(/SKU-A/);
    });

    expect(screen.getByText(/#1 · #2/)).toBeInTheDocument();
  });

  it("disables append controls until delayed saved rotation finishes loading", async () => {
    let finishAudioFetch!: () => void;
    const audioFetchDone = new Promise<void>((resolve) => {
      finishAudioFetch = resolve;
    });

    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes("/api/admin/member-audio-order") && url.includes("email=")) {
        return audioFetchDone.then(
          () =>
            Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ order: [] })
            } as Response)
        );
      }

      if (url.includes("/api/admin/users") && url.split("?")[0].endsWith("/api/admin/users")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ users: [MANAGED_USER] })
        } as Response);
      }
      if (url.includes("/api/interests")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ interests: [] })
        } as Response);
      }
      if (url.includes("/api/library")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ library: [LIB_ALPHA, LIB_BETA] })
        } as Response);
      }
      if (url.includes("/api/playback-settings")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              settings: { fallbackTrackId: "T-18", cgmrTrackId: "" }
            })
        } as Response);
      }
      if (url.includes("/api/admin/member-profile")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ profile: {} })
        } as Response);
      }
      if (url.includes("/api/admin/member-activity")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              activityLog: [],
              scheduleProgress: null,
              serverTime: new Date().toISOString(),
              newestActivityAt: null
            })
        } as Response);
      }

      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: "unmocked " + url })
      } as Response);
    });

    const user = userEvent.setup();
    render(<AdminUsers />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /View \/ Edit member/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /View \/ Edit member/i }));

    await screen.findByRole("status", { name: /loading saved rotation from server/i });

    const alphaBtn = await screen.findByRole("button", { name: /^SKU-A$/i });
    expect(alphaBtn).toBeDisabled();

    finishAudioFetch();

    await waitFor(() => {
      expect(
        screen.queryByRole("status", { name: /loading saved rotation from server/i })
      ).not.toBeInTheDocument();
    });

    expect(alphaBtn).not.toBeDisabled();

    await user.click(alphaBtn);
    await user.click(alphaBtn);

    const rotationHeading = await screen.findByText(/Rotation order \(live schedule\)/i);
    const rotationCard = rotationHeading.closest(".card");
    await waitFor(() => {
      expect(within(rotationCard as HTMLElement).getAllByRole("listitem")).toHaveLength(2);
    });
  });
});
