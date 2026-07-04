import { cn } from "@/lib/utils/helpers";

describe("cn utility", () => {
  it("should merge class names correctly", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("should handle conditional classes", () => {
    expect(cn("base", true && "active", false && "inactive")).toBe("base active");
  });

  it("should merge Tailwind classes with conflict resolution", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("should handle array inputs", () => {
    expect(cn(["a", "b"], "c")).toBe("a b c");
  });

  it("should handle undefined and null", () => {
    expect(cn("a", undefined, null, "b")).toBe("a b");
  });
});
