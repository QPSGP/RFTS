import "@testing-library/jest-dom";
import { render, screen, within } from "@testing-library/react";
import SiteFooter from "./SiteFooter";

jest.mock("@/hooks/useMemberLoggedIn", () => ({
  useMemberLoggedIn: () => false
}));

describe("SiteFooter Legal section", () => {
  it("does not list Life Guidance Discovery under Legal", () => {
    render(<SiteFooter showCta={false} />);
    const legalHeading = screen.getByRole("heading", { name: "Legal" });
    const legalColumn = legalHeading.parentElement as HTMLElement;
    expect(
      within(legalColumn).queryByRole("link", { name: /Life Guidance Discovery/i })
    ).not.toBeInTheDocument();
    expect(within(legalColumn).getByRole("link", { name: /Privacy Policy/i })).toBeInTheDocument();
    expect(
      within(legalColumn).getByRole("link", { name: /Terms and Conditions/i })
    ).toBeInTheDocument();
  });
});
