"use client";

import FacilitatorMembers from "@/components/FacilitatorMembers";

export default function ModeratorConsolePage() {
  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  return (
    <main>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 8
        }}
      >
        <button className="button button-secondary" type="button" onClick={logout}>
          Log Out
        </button>
      </div>
      <FacilitatorMembers />
    </main>
  );
}
