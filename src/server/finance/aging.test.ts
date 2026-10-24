import { describe, it, expect } from "vitest";
import {
  bucketForAgeDays,
  buildAgingRows,
  summarizeAging,
  AGING_BUCKETS
} from "./aging";

const DAY = 86400000;
const NOW = 1_700_000_000_000; // mốc cố định

describe("bucketForAgeDays", () => {
  it("maps ages to buckets at boundaries", () => {
    expect(bucketForAgeDays(0)).toBe("b0_30");
    expect(bucketForAgeDays(30)).toBe("b0_30");
    expect(bucketForAgeDays(31)).toBe("b31_60");
    expect(bucketForAgeDays(60)).toBe("b31_60");
    expect(bucketForAgeDays(61)).toBe("b61_90");
    expect(bucketForAgeDays(90)).toBe("b61_90");
    expect(bucketForAgeDays(91)).toBe("b90plus");
  });
});

describe("buildAgingRows", () => {
  it("keeps only matters with outstanding > 0, sorted by age desc", () => {
    const rows = buildAgingRows(
      [
        { matterId: "m1", receivable: 1000, received: 1000, anchorAt: NOW - 100 * DAY }, // hết nợ
        { matterId: "m2", receivable: 2000, received: 500, anchorAt: NOW - 10 * DAY },
        { matterId: "m3", receivable: 3000, received: 0, anchorAt: NOW - 120 * DAY }
      ],
      NOW
    );
    expect(rows.map((r) => r.matterId)).toEqual(["m3", "m2"]);
    expect(rows[0]).toMatchObject({ matterId: "m3", outstanding: 3000, ageDays: 120, bucket: "b90plus" });
    expect(rows[1]).toMatchObject({ matterId: "m2", outstanding: 1500, ageDays: 10, bucket: "b0_30" });
  });

  it("rounds outstanding to 2 decimals", () => {
    const rows = buildAgingRows(
      [{ matterId: "m", receivable: 100.204, received: 0.1, anchorAt: NOW - 5 * DAY }],
      NOW
    );
    expect(rows[0].outstanding).toBe(100.1);
  });
});

describe("summarizeAging", () => {
  it("aggregates by all four buckets with counts", () => {
    const rows = buildAgingRows(
      [
        { matterId: "a", receivable: 100, received: 0, anchorAt: NOW - 10 * DAY },
        { matterId: "b", receivable: 200, received: 0, anchorAt: NOW - 45 * DAY },
        { matterId: "c", receivable: 300, received: 0, anchorAt: NOW - 200 * DAY }
      ],
      NOW
    );
    const summary = summarizeAging(rows);
    expect(summary).toHaveLength(AGING_BUCKETS.length);
    expect(summary.find((s) => s.key === "b0_30")).toMatchObject({ amount: 100, count: 1 });
    expect(summary.find((s) => s.key === "b31_60")).toMatchObject({ amount: 200, count: 1 });
    expect(summary.find((s) => s.key === "b61_90")).toMatchObject({ amount: 0, count: 0 });
    expect(summary.find((s) => s.key === "b90plus")).toMatchObject({ amount: 300, count: 1 });
  });
});
