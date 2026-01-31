"use client";

import { useEffect, useState } from "react";

export default function AdminSetupHint() {
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    fetch("/api/admin/setup")
      .then((res) => res.json())
      .then((data) => setNeedsSetup(Boolean(data.needsSetup)))
      .catch(() => setNeedsSetup(false));
  }, []);

  if (!needsSetup) {
    return null;
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <strong>Admin setup required.</strong>
      <p>
        Create the first admin account at <a href="/admin/setup">/admin/setup</a>.
      </p>
    </div>
  );
}
