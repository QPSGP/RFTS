"use client";

import { useEffect, useState } from "react";

function isAndroidDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent || "");
}

type PlayOptionsAndroidTipsProps = {
  gapHours?: number;
  playsPerNight?: 1 | 2;
};

export default function PlayOptionsAndroidTips({
  gapHours = 2.5,
  playsPerNight = 2
}: PlayOptionsAndroidTipsProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(isAndroidDevice());
  }, []);

  if (!show) return null;

  return (
    <section
      className="card"
      style={{ marginBottom: 16, background: "#fffbeb", borderColor: "#fcd34d" }}
    >
      <h3 style={{ marginTop: 0 }}>Android tips for nightly sessions</h3>
      <p style={{ color: "#78350f", marginTop: 0, lineHeight: 1.55 }}>
        Android can pause Chrome when your screen locks or battery saver runs. These steps help both
        audios play reliably overnight.
      </p>
      <ul style={{ margin: "12px 0 0", paddingLeft: 20, color: "#92400e", lineHeight: 1.55 }}>
        <li>Use <strong>Chrome</strong> (not an in-app browser from email or social apps).</li>
        <li>Tap <strong>Start Session</strong> on this page and let the first audio finish completely.</li>
        <li>Tap <strong>Enable Screen Wake</strong> above if it is not already on.</li>
        <li>Leave this <strong>Reach For The Stars tab open</strong> — do not close Chrome overnight.</li>
        {playsPerNight === 2 && (
          <>
            <li>
              Your second audio is scheduled about <strong>{gapHours} hours</strong> after the first.
              If it does not start on its own, unlock your phone and tap{" "}
              <strong>Start second audio now</strong>.
            </li>
            <li>
              Turn off <strong>battery saver</strong> for Chrome, or keep your phone plugged in while
              you sleep.
            </li>
          </>
        )}
        <li>
          If playback stops early, open this tab again and tap <strong>Play</strong> or{" "}
          <strong>Start second audio now</strong>.
        </li>
      </ul>
    </section>
  );
}
