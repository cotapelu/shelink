import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("merges class names correctly", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles falsy values", () => {
    expect(cn("foo", false, undefined, null, "bar")).toBe("foo bar");
  });

  it("merges conditional classes", () => {
    const isActive = true;
    const isDisabled = false;
    expect(cn("base", isActive && "active", isDisabled && "disabled")).toBe("base active");
  });

  it("works with objects", () => {
    expect(cn("foo", { bar: true, baz: false })).toBe("foo bar");
  });

  it("handles arrays", () => {
    expect(cn(["a", "b", false, "c"])).toBe("a b c");
  });

  it("deduplicates classes with tailwind-merge", () => {
    // conflicting classes: padding
    expect(cn("p-4", "p-2")).toBe("p-2"); // later overrides
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("handles empty input", () => {
    expect(cn()).toBe("");
    expect(cn(false, null, undefined)).toBe("");
  });

  it("combines strings and arrays", () => {
    expect(cn("foo", ["bar", "baz"], "qux")).toBe("foo bar baz qux");
  });
});
