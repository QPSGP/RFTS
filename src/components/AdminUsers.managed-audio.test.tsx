/**
 * Platinum Managed: rotation adds at end; duplicate plays via second "Add at end" + manual reorder.
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

/** Valid UUIDs — API route validates POST bodies with z.string().uuid(). */
const LIB_ALPHA = {
  id: "11111111-1111-4111-8111-111111111111",
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
  id: "22222222-2222-4222-8222-222222222222",
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
            settings: { fallbackTrackId: "T18", cgmrTrackId: "" }
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

async function openManagedRotationSection(user: ReturnType<typeof userEvent.setup>) {
  await waitFor(() => {
    expect(screen.getByRole("button", { name: /View \/ Edit member/i })).toBeInTheDocument();
  });
  await user.click(screen.getByRole("button", { name: /View \/ Edit member/i }));
  await waitFor(() => {
    expect(screen.getByRole("button", { name: /Rotation Order/i })).toBeInTheDocument();
  });
  await user.click(screen.getByRole("button", { name: /Rotation Order/i }));
}

async function openManagedProfileAndWaitForHydration(user: ReturnType<typeof userEvent.setup>) {
  await openManagedRotationSection(user);
  await waitFor(() => {
    expect(
      screen.queryByRole("status", { name: /loading saved rotation from server/i })
    ).not.toBeInTheDocument();
  });
  await screen.findByText(/Rotation order \(live schedule\)/i);
}

describe("AdminUsers Platinum Managed rotation", () => {
  beforeEach(() => {
    setupFetchMock();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("adds at end twice for same recording (reorder manually)", async () => {
    const user = userEvent.setup();
    render(<AdminUsers />);
    await openManagedProfileAndWaitForHydration(user);

    const combo = screen.getByRole("combobox", { name: /choose audio to add at end of rotation/i });
    await user.selectOptions(combo, LIB_ALPHA.id);
    await user.click(screen.getByRole("button", { name: /^Add at end$/i }));
    await waitFor(() => {
      expect(combo).toHaveValue("");
    });
    await user.selectOptions(combo, LIB_ALPHA.id);
    await user.click(screen.getByRole("button", { name: /^Add at end$/i }));

    const rotationHeading = await screen.findByText(/Rotation order \(live schedule\)/i);
    const rotationCard = rotationHeading.closest(".card");
    expect(rotationCard).toBeTruthy();

    await waitFor(() => {
      const items = within(rotationCard as HTMLElement).getAllByRole("listitem");
      expect(items).toHaveLength(2);
      expect(items[0]).toHaveTextContent(/SKU-A/);
      expect(items[1]).toHaveTextContent(/SKU-A/);
      expect(within(rotationCard as HTMLElement).getByLabelText(/step 1/i)).toBeInTheDocument();
      expect(within(rotationCard as HTMLElement).getByLabelText(/step 2/i)).toBeInTheDocument();
    });
  });

  it("disables rotation controls until delayed saved rotation finishes loading", async () => {
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
              settings: { fallbackTrackId: "T18", cgmrTrackId: "" }
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
    await user.click(screen.getByRole("button", { name: /Rotation Order/i }));

    await screen.findByRole("status", { name: /loading saved rotation from server/i });

    expect(
      screen.getByRole("combobox", { name: /choose audio to add at end of rotation/i })
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: /^Add at end$/i })).toBeDisabled();

    finishAudioFetch();

    await waitFor(() => {
      expect(
        screen.queryByRole("status", { name: /loading saved rotation from server/i })
      ).not.toBeInTheDocument();
    });

    expect(
      screen.getByRole("combobox", { name: /choose audio to add at end of rotation/i })
    ).not.toBeDisabled();

    const combo = screen.getByRole("combobox", { name: /choose audio to add at end of rotation/i });
    await user.selectOptions(combo, LIB_ALPHA.id);
    await user.click(screen.getByRole("button", { name: /^Add at end$/i }));
    await waitFor(() => {
      expect(combo).toHaveValue("");
    });
    await user.selectOptions(combo, LIB_ALPHA.id);
    await user.click(screen.getByRole("button", { name: /^Add at end$/i }));

    const rotationHeading = await screen.findByText(/Rotation order \(live schedule\)/i);
    const rotationCard = rotationHeading.closest(".card");
    await waitFor(() => {
      expect(within(rotationCard as HTMLElement).getAllByRole("listitem")).toHaveLength(2);
    });
  });

  it("Add at end stays available after loading 16 saved slots (real accounts exceeded old 10-slot cap)", async () => {
    const yahooUser = {
      ...MANAGED_USER,
      id: "u-yahoo",
      email: "KimDeBraux@yahoo.com",
      firstName: "Kim",
      lastName: "Test"
    };
    const savedOrder = Array.from({ length: 16 }, () => LIB_ALPHA.id);

    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes("/api/admin/users") && url.split("?")[0].endsWith("/api/admin/users")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ users: [yahooUser] })
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
              settings: { fallbackTrackId: "T18", cgmrTrackId: "" }
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
          json: () => Promise.resolve({ order: savedOrder })
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
    await user.click(screen.getByRole("button", { name: /Rotation Order/i }));
    await waitFor(() => {
      expect(
        screen.queryByRole("status", { name: /loading saved rotation from server/i })
      ).not.toBeInTheDocument();
    });

    const rotationHeading = await screen.findByText(/Rotation order \(live schedule\)/i);
    const rotationCard = rotationHeading.closest(".card");
    expect(rotationCard).toBeTruthy();

    await waitFor(() => {
      expect(within(rotationCard as HTMLElement).getAllByRole("listitem")).toHaveLength(16);
    });

    const addBtn = screen.getByRole("button", { name: /^Add at end$/i });
    const combo = screen.getByRole("combobox", { name: /choose audio to add at end of rotation/i });
    await user.selectOptions(combo, LIB_BETA.id);
    expect(addBtn).not.toBeDisabled();

    await user.click(addBtn);
    await waitFor(() => {
      expect(within(rotationCard as HTMLElement).getAllByRole("listitem")).toHaveLength(17);
    });
    expect(within(rotationCard as HTMLElement).getByLabelText(/step 17/i)).toBeInTheDocument();
  });
});
