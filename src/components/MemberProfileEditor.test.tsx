import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import MemberProfileEditor from "./MemberProfileEditor";
import { emptyMemberProfileDraft } from "@/lib/member-profile-form";
import { formatSignupDate } from "@/lib/format-signup-date";

describe("MemberProfileEditor signup date", () => {
  it("shows a read-only signed up date when createdAt is present", () => {
    const createdAt = "2026-09-13T12:00:00.000Z";
    render(
      <MemberProfileEditor
        draft={emptyMemberProfileDraft()}
        onChange={() => undefined}
        createdAt={createdAt}
      />
    );
    expect(screen.getByLabelText("Signed up")).toHaveValue(formatSignupDate(createdAt));
    expect(screen.getByLabelText("Signed up")).toHaveAttribute("readOnly");
  });

  it("does not show signed up when createdAt is missing", () => {
    render(
      <MemberProfileEditor draft={emptyMemberProfileDraft()} onChange={() => undefined} />
    );
    expect(screen.queryByLabelText("Signed up")).not.toBeInTheDocument();
  });
});
