// @ts-nocheck
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock Label component
vi.mock("@/components/ui/label", () => ({
  Label: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <label className={className}>{children}</label>
  )
}));

import { Field } from "./field";

describe("Field", () => {
  it("renders label", () => {
    render(<Field label="Test Label"><input /></Field>);
    expect(screen.getByText("Test Label")).toBeInTheDocument();
  });

  it("shows required asterisk when required", () => {
    render(<Field label="Required Field" required><input /></Field>);
    expect(screen.getByText("*")).toBeInTheDocument();
    expect(screen.getByText("*")).toHaveClass("text-destructive");
  });

  it("does not show asterisk when not required", () => {
    render(<Field label="Optional"><input /></Field>);
    expect(screen.queryByText("*")).not.toBeInTheDocument();
  });

  it("renders children", () => {
    render(<Field label="Field"><button>Click me</button></Field>);
    expect(screen.getByRole("button")).toHaveTextContent("Click me");
  });

  it("renders hint when provided and no error", () => {
    render(<Field label="Field" hint="This is a hint"><input /></Field>);
    expect(screen.getByText("This is a hint")).toBeInTheDocument();
  });

  it("does not render hint when error present", () => {
    render(<Field label="Field" error="Error message" hint="Should not show"><input /></Field>);
    expect(screen.queryByText("Should not show")).not.toBeInTheDocument();
  });

  it("renders error when provided", () => {
    render(<Field label="Field" error="Error message"><input /></Field>);
    expect(screen.getByText("Error message")).toBeInTheDocument();
    expect(screen.getByText("Error message")).toHaveClass("text-destructive");
  });

  it("applies custom className to wrapper", () => {
    render(<Field label="Field" className="custom-class"><input /></Field>);
    // The className is applied to the outer div via cn()
    const wrapper = screen.getByText("Field").closest("div");
    expect(wrapper).toHaveClass("custom-class");
  });

  it("renders multiple fields independently", () => {
    render(
      <>
        <Field label="First"><input /></Field>
        <Field label="Second"><input /></Field>
      </>
    );
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
  });
});
