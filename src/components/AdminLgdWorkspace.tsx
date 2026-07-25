"use client";

import { useState } from "react";
import type { Interest } from "@/lib/types";
import AdminLgdIntakeRunner from "@/components/AdminLgdIntakeRunner";
import AdminLgdPanel from "@/components/AdminLgdPanel";

type Props = {
  interests: Interest[];
};

/** Shares “open form for this member” between the intake runner and review queue. */
export default function AdminLgdWorkspace({ interests }: Props) {
  const [activeEmail, setActiveEmail] = useState<string | null>(null);

  return (
    <>
      <AdminLgdIntakeRunner
        interests={interests}
        activeEmail={activeEmail}
        onActiveEmailChange={setActiveEmail}
      />
      <AdminLgdPanel
        onEditForm={(email) => {
          setActiveEmail(email.trim().toLowerCase());
          if (typeof window !== "undefined") {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        }}
      />
    </>
  );
}
