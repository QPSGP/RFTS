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
              On Android, the second half often starts the <strong>goal audio directly</strong> (skips a
              second intro) so Chrome is less likely to stop after the lock screen.
            </li>
            <li>
              If the second audio does not start on its own, unlock your phone, open this tab, and tap{" "}
              <strong>Start second audio now</strong>.
            </li>
            <li>
              If you reopen Play Options in the morning and the second audio never played, look for{" "}
              <strong>Second audio ready to finish</strong> and tap <strong>Start second audio now</strong>
              — we save that unfinished night so a killed Chrome tab does not lose it.
            </li>
            <li>
              Turn off <strong>battery saver</strong> for Chrome, or keep your phone plugged in while
              you sleep.
            </li>
            <li>
              Optional: install this site to your Home screen (Chrome menu → <strong>Install app</strong>{" "}
              or Add to Home screen). A dedicated icon sometimes keeps overnight sessions more reliable
              than a regular browser tab.
            </li>
          </>
        )}
        <li>
          If you only hear intro music and not the goal audio, unlock and tap <strong>Play</strong> —
          the goal track should continue.
        </li>
      </ul>
    </section>
  );
}
