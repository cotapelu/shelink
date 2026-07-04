// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFormContext, useWatch } from "react-hook-form";
import { useAutoTitleSuggestion } from "./use-auto-title";

// Mock react-hook-form
vi.mock("react-hook-form", () => ({
  useFormContext: () => ({
    control: {},
    setValue: vi.fn()
  }),
  useWatch: vi.fn()
}));

const mockSetValue = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  // Default mocks
  vi.mocked(useFormContext).mockReturnValue({
    control: {},
    setValue: mockSetValue
  } as any);
  vi.mocked(useWatch).mockReturnValue(undefined);
});

describe("useAutoTitleSuggestion", () => {
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

  describe("Auto-title effect", () => {
    beforeEach(() => {
      mockSetValue.mockClear();
    });

    it("does not set title when parties empty", () => {
      vi.mocked(useWatch).mockImplementation((arg: any) => {
        if (arg.name === "parties") return [];
        if (arg.name === "title") return "";
        if (arg.name === "causeFreeText") return "";
        return undefined;
      });
      const { result } = renderHook(() => useAutoTitleSuggestion({}));
      act(() => {
        result.current.setCauseName("Some Cause");
      });
      expect(mockSetValue).not.toHaveBeenCalled();
    });

    it("sets title when client and opponent present", () => {
      const parties = [
        { role: "CLIENT_PARTY", name: "Client A" },
        { role: "OPPOSING_PARTY", name: "Defendant B" }
      ];
      vi.mocked(useWatch).mockImplementation((arg: any) => {
        if (arg.name === "parties") return parties;
        if (arg.name === "title") return "";
        if (arg.name === "causeFreeText") return "";
        return undefined;
      });
      const { result } = renderHook(() => useAutoTitleSuggestion({}));
      act(() => {
        result.current.setCauseName("Contract Dispute");
      });
      expect(mockSetValue).toHaveBeenCalledWith(
        "title",
        "Client A与Defendant BContract Dispute",
        { shouldDirty: true }
      );
    });

    it("skips auto-title when titleTouched is true", () => {
      const parties = [{ role: "CLIENT_PARTY", name: "Client A" }];
      vi.mocked(useWatch).mockImplementation((arg: any) => {
        if (arg.name === "parties") return parties;
        if (arg.name === "title") return "";
        if (arg.name === "causeFreeText") return "";
        return undefined;
      });
      const { result } = renderHook(() => useAutoTitleSuggestion({}));
      act(() => {
        result.current.setTitleTouched(true);
      });
      act(() => {
        result.current.setCauseName("Some Cause");
      });
      expect(mockSetValue).not.toHaveBeenCalled();
    });

    it("uses causeName over causeFreeText", () => {
      const parties = [{ role: "CLIENT_PARTY", name: "Client A" }];
      vi.mocked(useWatch).mockImplementation((arg: any) => {
        if (arg.name === "parties") return parties;
        if (arg.name === "title") return "";
        if (arg.name === "causeFreeText") return "FreeText Cause";
        return undefined;
      });
      const { result } = renderHook(() => useAutoTitleSuggestion({}));
      act(() => {
        result.current.setCauseName("Preferred Cause");
      });
      expect(mockSetValue).toHaveBeenCalledWith(
        "title",
        "Client APreferred Cause",
        { shouldDirty: true }
      );
    });

    it("does not overwrite existing title", () => {
      const parties = [{ role: "CLIENT_PARTY", name: "Client A" }];
      vi.mocked(useWatch).mockImplementation((arg: any) => {
        if (arg.name === "parties") return parties;
        if (arg.name === "title") return "Existing Title";
        if (arg.name === "causeFreeText") return "";
        return undefined;
      });
      const { result } = renderHook(() => useAutoTitleSuggestion({}));
      act(() => {
        result.current.setCauseName("New Cause");
      });
      expect(mockSetValue).not.toHaveBeenCalled();
    });
  });
});
