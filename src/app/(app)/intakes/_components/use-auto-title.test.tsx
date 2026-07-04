// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAutoTitleSuggestion } from "./use-auto-title";

// Mock react-hook-form
vi.mock("react-hook-form", () => ({
  useFormContext: () => ({
    control: {},
    setValue: vi.fn()
  }),
  useWatch: vi.fn()
}));

describe("useAutoTitleSuggestion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes with default state", () => {
    const { result } = renderHook(() => useAutoTitleSuggestion({}));
    expect(result.current.titleTouched).toBe(false);
    expect(result.current.causeName).toBe("");
    expect(typeof result.current.setTitleTouched).toBe("function");
    expect(typeof result.current.setCauseName).toBe("function");
  });

  it("setTitleTouched updates state", () => {
    const { result } = renderHook(() => useAutoTitleSuggestion({}));
    act(() => {
      result.current.setTitleTouched(true);
    });
    expect(result.current.titleTouched).toBe(true);
  });

  it("setCauseName updates state", () => {
    const { result } = renderHook(() => useAutoTitleSuggestion({}));
    act(() => {
      result.current.setCauseName("Test Cause");
    });
    expect(result.current.causeName).toBe("Test Cause");
  });
});
