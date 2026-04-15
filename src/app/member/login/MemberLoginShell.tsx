"use client";

import { useEffect } from "react";

/**
 * While on /member/login, adds body.member-login so CSS can hide the misleading
 * "Members Console" link in the header (session may still be valid until logout).
 * Does not call logout on mount (that raced with sign-in and cleared the new cookie).
 */
export default function MemberLoginShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.body.classList.add("member-login");
    return () => document.body.classList.remove("member-login");
  }, []);
  return <>{children}</>;
}
