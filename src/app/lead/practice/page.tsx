import type { Metadata } from "next";
import EventLeadPublicForm from "@/components/EventLeadPublicForm";
import { LONG_BEACH_EXPO_2026 } from "@/lib/event-leads";

export const metadata: Metadata = {
  title: "Practice survey | Reach For The Stars",
  robots: { index: false, follow: false }
};

type Props = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function LeadPracticePage({ searchParams = {} }: Props) {
  const event =
    typeof searchParams.event === "string" ? searchParams.event : LONG_BEACH_EXPO_2026.eventName;
  const dates =
    typeof searchParams.dates === "string" ? searchParams.dates : LONG_BEACH_EXPO_2026.eventDates;
  const key =
    typeof searchParams.key === "string" ? searchParams.key : LONG_BEACH_EXPO_2026.eventKey;

  return (
    <main style={{ padding: "32px 16px", minHeight: "70vh" }}>
      <EventLeadPublicForm
        formType="practice_survey"
        defaultEventName={event}
        defaultEventDates={dates}
        defaultEventKey={key}
      />
    </main>
  );
}
