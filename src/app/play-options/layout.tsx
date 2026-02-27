import { redirect } from "next/navigation";
import { getUserSessionEmail } from "@/lib/user-auth";

export const dynamic = "force-dynamic";

/** Gate play-options on the document request so we don't rely on client fetch seeing the cookie. */
export default async function PlayOptionsLayout({
  children
}: {
  children: React.ReactNode;
}) {
  try {
    const email = await getUserSessionEmail();
    if (!email) {
      redirect("/member/login");
    }
  } catch {
    redirect("/member/login");
  }
  return <>{children}</>;
}
