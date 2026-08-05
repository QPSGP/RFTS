export type ClientDiagnosticContext = {
  pageUrl: string;
  userAgent: string;
  platform: string;
  language: string;
  timeZone: string;
  screen: string;
  viewport: string;
  deviceMemoryGb: number | null;
  hardwareConcurrency: number | null;
  touchPoints: number;
  standalonePwa: boolean;
  collectedAt: string;
};

/** Collect browser/device context on the client for support reports. */
export function collectClientDiagnosticContext(): ClientDiagnosticContext {
  if (typeof window === "undefined") {
    return {
      pageUrl: "",
      userAgent: "",
      platform: "",
      language: "",
      timeZone: "",
      screen: "",
      viewport: "",
      deviceMemoryGb: null,
      hardwareConcurrency: null,
      touchPoints: 0,
      standalonePwa: false,
      collectedAt: new Date().toISOString()
    };
  }

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    standalone?: boolean;
  };

  return {
    pageUrl: window.location.href,
    userAgent: navigator.userAgent || "",
    platform: navigator.platform || "",
    language: navigator.language || "",
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    screen: `${window.screen.width}×${window.screen.height} @${window.devicePixelRatio || 1}x`,
    viewport: `${window.innerWidth}×${window.innerHeight}`,
    deviceMemoryGb: typeof nav.deviceMemory === "number" ? nav.deviceMemory : null,
    hardwareConcurrency:
      typeof navigator.hardwareConcurrency === "number"
        ? navigator.hardwareConcurrency
        : null,
    touchPoints: navigator.maxTouchPoints ?? 0,
    standalonePwa: Boolean(nav.standalone),
    collectedAt: new Date().toISOString()
  };
}

export type MemberReportServerContext = {
  memberEmail: string;
  memberId: string;
  subscriptionTier: string | null;
  subscriptionStatus: string | null;
  playsPerNight: number;
  goalCount: number;
  firstName: string | null;
  lastName: string | null;
};

export function formatReportIssueContextBlock(
  server: MemberReportServerContext,
  client?: ClientDiagnosticContext | null
): string {
  const lines = [
    "--- Automatic diagnostic context ---",
    `Account: ${server.memberEmail}`,
    `Member ID: ${server.memberId}`,
    `Name: ${[server.firstName, server.lastName].filter(Boolean).join(" ") || "-"}`,
    `Membership: ${server.subscriptionTier ?? "-"} (${server.subscriptionStatus ?? "-"})`,
    `Plays per night: ${server.playsPerNight}`,
    `Goals selected: ${server.goalCount}`
  ];

  if (client) {
    lines.push(
      `Page: ${client.pageUrl || "-"}`,
      `User-Agent: ${client.userAgent || "-"}`,
      `Platform: ${client.platform || "-"}`,
      `Language: ${client.language || "-"}`,
      `Time zone: ${client.timeZone || "-"}`,
      `Screen: ${client.screen || "-"}`,
      `Viewport: ${client.viewport || "-"}`,
      `Touch points: ${client.touchPoints}`,
      `Device memory (GB): ${client.deviceMemoryGb ?? "-"}`,
      `CPU cores: ${client.hardwareConcurrency ?? "-"}`,
      `Installed PWA: ${client.standalonePwa ? "yes" : "no"}`,
      `Collected at: ${client.collectedAt || "-"}`
    );
  }

  return lines.join("\n");
}

export function appendReportIssueContext(
  memberMessage: string,
  server: MemberReportServerContext,
  client?: ClientDiagnosticContext | null
): string {
  const block = formatReportIssueContextBlock(server, client);
  const trimmed = memberMessage.trimEnd();
  return trimmed ? `${trimmed}\n\n${block}` : block;
}

export function formatAdminReportIssueContextBlock(
  adminEmail: string,
  client?: ClientDiagnosticContext | null
): string {
  const lines = [
    "--- Automatic diagnostic context ---",
    `Reporter: admin (${adminEmail})`,
    "Source: Internal admin issue report"
  ];
  if (client) {
    lines.push(
      `Page: ${client.pageUrl || "-"}`,
      `User-Agent: ${client.userAgent || "-"}`,
      `Platform: ${client.platform || "-"}`,
      `Language: ${client.language || "-"}`,
      `Time zone: ${client.timeZone || "-"}`,
      `Screen: ${client.screen || "-"}`,
      `Viewport: ${client.viewport || "-"}`,
      `Collected at: ${client.collectedAt || "-"}`
    );
  }
  return lines.join("\n");
}

export function appendAdminReportIssueContext(
  message: string,
  adminEmail: string,
  client?: ClientDiagnosticContext | null
): string {
  const block = formatAdminReportIssueContextBlock(adminEmail, client);
  const trimmed = message.trimEnd();
  return trimmed ? `${trimmed}\n\n${block}` : block;
}
