/**
 * Test cho các lib thuần tách từ export-xlsx (AUTO-67b).
 * Coverage: params (parse/where/sort), columns (compose), rows (build), formatters.
 */
import { describe, it, expect } from "vitest";
import {
  resolveMattersExportParams,
  buildIntakeWhere,
  buildMatterWhere,
  matterStatusWhere,
  sortMatterRows
} from "@/server/matters/matters-export-params";
import { intakeColumnsForKind, matterColumnsForKind } from "@/server/matters/matters-export-columns";
import { buildIntakeRow } from "@/server/matters/matters-export-rows-intake";
import { formatParty, formatDocuments, formatContacts } from "@/server/matters/matters-export-rows-format";
import { formatDate, cleanDateText, sheetName, buildFilename, yesNo, label } from "@/server/matters/matters-export-formatters";
import { TAB_LABEL } from "@/server/matters/matters-export-labels";

const baseParams = { tab: "active" as const, sortBy: "hearing" as const, sortDir: "desc" as const };
const user = { id: "u1", role: "LAWYER" };

describe("resolveMattersExportParams", () => {
  it("mac dinh tab=active, sortBy=hearing khi thieu", () => {
    const p = resolveMattersExportParams(new URLSearchParams());
    expect(p.tab).toBe("active");
    expect(p.sortBy).toBe("hearing");
    expect(p.sortDir).toBe("desc");
  });

  it("nhan sortDir=asc", () => {
    const p = resolveMattersExportParams(new URLSearchParams("sortDir=asc"));
    expect(p.sortDir).toBe("asc");
  });

  it("fillTER category khong hop le -> undefined", () => {
    const p = resolveMattersExportParams(new URLSearchParams("category=KHONG_TON_TAI"));
    expect(p.category).toBeUndefined();
  });

  it("nhan category hop le", () => {
    const p = resolveMattersExportParams(new URLSearchParams("category=CIVIL_COMMERCIAL"));
    expect(p.category).toBe("CIVIL_COMMERCIAL");
  });

  it("sortBy=hearing bi ep ve intakeDate cho tab khong phai active/all", () => {
    const p = resolveMattersExportParams(new URLSearchParams("tab=archived&sortBy=hearing"));
    expect(p.sortBy).toBe("intakeDate");
  });

  it("trim search, giu ngay hop le, bo ngay khong dung dinh dang", () => {
    const p = resolveMattersExportParams(new URLSearchParams("search=%20abc%20&from=2026-01-01&to=ngay-x"));
    expect(p.search).toBe("abc");
    expect(p.from).toBe("2026-01-01");
    expect(p.to).toBeUndefined();
  });
});

describe("buildWhere", () => {
  it("intake tab=revision dung status NEEDS_REVISION", () => {
    const where = buildIntakeWhere({ ...baseParams, tab: "revision" }, user) as any;
    const statusPart = where.AND.find((x: any) => x.status);
    expect(statusPart.status.in).toEqual(["NEEDS_REVISION"]);
  });

  it("intake tab=intake dung 2 status", () => {
    const where = buildIntakeWhere({ ...baseParams, tab: "intake" }, user) as any;
    const statusPart = where.AND.find((x: any) => x.status);
    expect(statusPart.status.in).toEqual(["INTAKE", "PENDING_CONFIRMATION"]);
  });

  it("intake khong co search -> OR chi cua visibility (khong co title/description)", () => {
    const where = buildIntakeWhere({ ...baseParams, tab: "intake" }, user) as any;
    const ors = where.AND.filter((x: any) => x.OR).flatMap((x: any) => x.OR);
    expect(ors.some((o: any) => o.title || o.description)).toBe(false);
  });

  it("intake co search them OR 5 nhanh tim kiem", () => {
    const where = buildIntakeWhere({ ...baseParams, tab: "intake", search: "abc" }, user) as any;
    const orPart = where.AND.find((x: any) => x.OR?.some((o: any) => o.title));
    expect(orPart.OR).toHaveLength(5);
  });

  it("matter status where theo tab", () => {
    expect(matterStatusWhere({ ...baseParams, tab: "archived" })).toEqual({ status: { in: ["ARCHIVED"] } });
    expect(matterStatusWhere({ ...baseParams, tab: "active" })).toEqual({ status: { notIn: ["CLOSED", "ARCHIVED"] } });
  });

  it("matter where gom deletedAt=null", () => {
    const where = buildMatterWhere(baseParams, user) as any;
    expect(where.AND.some((x: any) => x.deletedAt === null)).toBe(true);
  });

  it("matter search them OR 7 nhanh tim kiem", () => {
    const where = buildMatterWhere({ ...baseParams, search: "abc" }, user) as any;
    const orPart = where.AND.find((x: any) => x.OR?.some((o: any) => o.internalCode));
    expect(orPart.OR).toHaveLength(7);
  });
});

describe("sortMatterRows", () => {
  const row = (over: any = {}) => ({
    claimAmount: null,
    intakeDate: null,
    procedures: [],
    updatedAt: new Date("2026-01-01"),
    ...over
  });

  it("sap xep theo ngay tang dan khi sortDir=asc", () => {
    const rows = [
      row({ id: "b", intakeDate: new Date("2026-02-01") }),
      row({ id: "a", intakeDate: new Date("2026-01-01") })
    ];
    const sorted = sortMatterRows(rows as any, { ...baseParams, sortBy: "intakeDate", sortDir: "asc" }) as any[];
    expect(sorted.map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("null dung cuoi ca khi giam dan", () => {
    const rows = [
      row({ id: "null", intakeDate: null }),
      row({ id: "val", intakeDate: new Date("2026-01-01") })
    ];
    const sorted = sortMatterRows(rows as any, { ...baseParams, sortBy: "intakeDate", sortDir: "desc" }) as any[];
    expect(sorted.map((r) => r.id)).toEqual(["val", "null"]);
  });

  it("khong mutate mang goc", () => {
    const rows = [row({ id: "b", intakeDate: new Date("2026-02-01") }), row({ id: "a", intakeDate: new Date("2026-01-01") })];
    sortMatterRows(rows as any, baseParams);
    expect(rows.map((r) => r.id)).toEqual(["b", "a"]);
  });

  it("claimAmount so sanh nhu number", () => {
    const rows = [row({ id: "big", claimAmount: 100 }), row({ id: "small", claimAmount: 1 })];
    const sorted = sortMatterRows(rows as any, { ...baseParams, sortBy: "claimAmount", sortDir: "asc" }) as any[];
    expect(sorted.map((r) => r.id)).toEqual(["small", "big"]);
  });
});

describe("columns", () => {
  it("intake columns: litigation them cot su kien", () => {
    const litigation = intakeColumnsForKind("litigation");
    const counsel = intakeColumnsForKind("counsel");
    expect(litigation.length).toBeGreaterThan(counsel.length);
    expect(litigation.map((c) => c.key)).toContain("counterclaim");
    expect(counsel.map((c) => c.key)).toContain("counselType");
  });

  it("matter columns: 0 thu tuc -> khong co cot procedure", () => {
    const keys = matterColumnsForKind("litigation", 0).map((c) => c.key);
    expect(keys.some((k) => typeof k === "string" && k.startsWith("procedure1"))).toBe(false);
  });

  it("matter columns: moi thu tuc sinh 21 cot placeholder so", () => {
    const cols = matterColumnsForKind("litigation", 2);
    const procKeys = cols.map((c) => c.key).filter((k) => typeof k === "string" && k!.startsWith("procedure"));
    expect(procKeys).toHaveLength(42);
    expect(procKeys).toContain("procedure1Type");
    expect(procKeys).toContain("procedure2Type");
    const header = cols.find((c) => c.key === "procedure2Type")?.header;
    expect(header).toBe("Thủ tục 2-Loại");
  });

  it("matter columns: kind=project them cot businessType", () => {
    const keys = matterColumnsForKind("project", 0).map((c) => c.key);
    expect(keys).toContain("businessType");
    expect(keys).not.toContain("counselType");
  });
});

describe("formatters + format rows", () => {
  it("formatDate null -> empty, co ngay -> YYYY-MM-DD", () => {
    expect(formatDate(null)).toBe("");
    expect(formatDate(new Date("2026-03-05T00:00:00"))).toBe("2026-03-05");
  });

  it("cleanDateText chi kiem tra dinh dang (khong validate thang/ngay)", () => {
    // Hành vi gốc: regex YYYY-MM-DD; giá trị như 2026-13-99 vẫn qua (DB/lọc sẽ xử lý)
    expect(cleanDateText("2026-13-99")).toBe("2026-13-99");
    expect(cleanDateText("abc")).toBeUndefined();
    expect(cleanDateText(" 2026-01-02 ")).toBe("2026-01-02");
  });

  it("sheetName cat ky tu cấm + gioi han 31", () => {
    expect(sheetName('a/b:c*d?e[f]g')).toBe("abcdefg");
    expect(sheetName("x".repeat(40)).length).toBe(31);
    expect(sheetName("")).toBe("Sheet");
  });

  it("buildFilename dung TAB_FILE_KEY", () => {
    expect(buildFilename("intake")).toMatch(/^lawlink-matters-intake-\d{4}-\d{2}-\d{2}\.xlsx$/);
  });

  it("yesNo + label", () => {
    expect(yesNo(true)).toBe("Có");
    expect(yesNo(null)).toBe("Không");
    expect(label({ A: "a" }, "A")).toBe("a");
    expect(label({ A: "a" }, null)).toBe("");
    expect(label({ A: "a" }, "B" as any)).toBe("B");
  });

  it("formatParty luon co it nhat loai chu the", () => {
    expect(formatParty({ name: "A", partyType: "COMPANY" } as any)).toBe("A (Công ty)");
  });

  it("formatParty co detail -> ten (chi tiet)", () => {
    const out = formatParty({ name: "A", partyType: "COMPANY", phone: "09" } as any);
    expect(out).toBe("A (Công ty, Điện thoại: 09)");
  });

  it("formatDocuments + formatContacts join dung ki tu", () => {
    expect(formatDocuments([{ name: "a", category: "CONTRACT", createdAt: new Date("2026-01-02T00:00:00") }])).toBe("a（CONTRACT，2026-01-02）");
    expect(formatContacts([{ name: "n", title: null, phone: null, email: null, isPrimary: true }])).toBe("Chính / n");
  });

  it("TAB_LABEL day du 5 tab", () => {
    expect(Object.keys(TAB_LABEL)).toHaveLength(5);
    expect(TAB_LABEL.active).toBe("Đang xử lý");
  });
});

describe("buildIntakeRow", () => {
  const base = {
    id: "i1",
    title: "T",
    category: "CIVIL_COMMERCIAL",
    status: "INTAKE",
    receivedAt: new Date("2026-01-02T00:00:00"),
    cause: null,
    causeFreeText: null,
    description: null,
    client: null,
    clientType: "INDIVIDUAL",
    claimAmount: null,
    feeAmount: null,
    serviceStart: null,
    serviceEnd: null,
    firstProcedureType: null,
    ourStanding: null,
    barFiling: null,
    counterclaim: null,
    feeType: null,
    ownerUser: null,
    coUserIds: [] as string[],
    parties: [] as any[],
    documents: [] as any[],
    matter: null,
    declinedReason: null,
    createdAt: new Date("2026-01-02T00:00:00"),
    updatedAt: new Date("2026-01-03T00:00:00")
  };

  it("row rong van du khoa co ban", () => {
    const row = buildIntakeRow(base as any, new Map());
    expect(row.id).toBe("i1");
    expect(row.status).toBe("Đã tư vấn");
    expect(row.client).toBe("");
    expect(row.coUsers).toBe("");
  });

  it("map coUserIds qua map ten", () => {
    const row = buildIntakeRow({ ...base, coUserIds: ["u1", "u2"] } as any, new Map([["u1", "An"]]));
    expect(row.coUsers).toBe("An；u2");
  });

  it("client ton tai -> lay ten + loai tu client", () => {
    const row = buildIntakeRow(
      { ...base, client: { name: "KH", type: "COMPANY", idNumber: null, address: null, legalRep: null, phone: null, contacts: [] } } as any,
      new Map()
    );
    expect(row.client).toBe("KH");
    expect(row.clientType).toBe("Công ty");
  });
});
