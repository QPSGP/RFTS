import { headers } from "next/headers";
import { getSessionConsoleType } from "@/lib/auth";
import { findDefaultByPath } from "@/lib/site-copy";

/** Shown on live landing/blog pages so an admin preview is never a dead end. */
export default async function CopyEditorReturnBanner() {
  const pathname = (await headers()).get("x-rfts-pathname") ?? "";
  if (!pathname || pathname.startsWith("/admin")) return null;

  const consoleType = await getSessionConsoleType();
  if (consoleType !== "admin") return null;
  if (!findDefaultByPath(pathname)) return null;

  const href = `/admin/copy?path=${encodeURIComponent(pathname)}`;
  return (
    <div
      role="region"
      aria-label="Page copy editor"
      style={{
        background: "#ecfdf5",
        color: "#065f46",
        padding: "10px 16px",
        textAlign: "center",
        borderBottom: "1px solid #a7f3d0",
        fontSize: 14
      }}
    >
      Viewing the live page.{" "}
      <a href={href} style={{ color: "#065f46", fontWeight: 700 }}>
        Back to page copy editor
      </a>
    </div>
  );
}
