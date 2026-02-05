"use client";

export default function AdminLogoutButton() {
  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };
  return (
    <button
      type="button"
      className="button button-secondary"
      onClick={logout}
      style={{ padding: "8px 12px", fontSize: 13 }}
    >
      Log Out
    </button>
  );
}
