"use client";

import { useEffect } from "react";

/** On any server or client error in play-options, send user to member login. */
export default function PlayOptionsError() {
  useEffect(() => {
    window.location.replace("/member/login");
  }, []);
  return (
    <main>
      <section className="hero section">
        <p>Taking you to the login page…</p>
      </section>
    </main>
  );
}
