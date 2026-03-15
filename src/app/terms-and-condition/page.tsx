import { redirect } from "next/navigation";

/** Redirect old URL to new. */
export default function TermsOldRoute() {
  redirect("/terms-and-conditions");
}
