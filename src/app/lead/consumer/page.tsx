import type { Metadata } from "next";
import EventLeadPublicForm from "@/components/EventLeadPublicForm";

export const metadata: Metadata = {
  title: "Lead card | Reach For The Stars",
  robots: { index: false, follow: false }
};

type Props = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function LeadConsumerPage({ searchParams = {} }: Props) {
  const event = typeof searchParams.event === "string" ? searchParams.event : "Event lead";
  const dates = typeof searchParams.dates === "string" ? searchParams.dates : "";
  const key = typeof searchParams.key === "string" ? searchParams.key : "consumer-lead";

  return (
    <main style={{ padding: "32px 16px", minHeight: "70vh" }}>
      <EventLeadPublicForm
        formType="consumer_lead"
        defaultEventName={event}
        defaultEventDates={dates}
        defaultEventKey={key}
      />
    </main>
  );
}
