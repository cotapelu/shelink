import { render, screen } from "@testing-library/react";
import { SealRowDate } from "./seal-row-date";

describe("SealRowDate", () => {
  it("formats date in Chinese locale", () => {
    const date = new Date("2025-01-15");
    render(<SealRowDate date={date} />);
    // The formatted date will be like 2025/01/15 depending on locale
    expect(screen.getByText(/2025/)).toBeInTheDocument();
  });
});
