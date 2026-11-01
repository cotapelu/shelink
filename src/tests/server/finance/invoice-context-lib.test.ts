import { describe, it, expect } from "vitest";
import {
  buildClientOptions,
  buildInvoiceContext,
  type PrimaryClientRow,
  type ClientLinkRow
} from "@/server/finance/invoice-context-lib";

const client = (id: string, name: string, idNumber: string | null = null) => ({ id, name, idNumber });

describe("buildClientOptions", () => {
  it("rỗng khi không có khách chính lẫn liên kết", () => {
    expect(buildClientOptions(null, [])).toEqual([]);
  });

  it("chỉ khách chính → 1 option isPrimary", () => {
    const opts = buildClientOptions({ ...client("c1", "An", "TAX1"), } as PrimaryClientRow, []);
    expect(opts).toEqual([{ id: "c1", name: "An", taxNo: "TAX1", isPrimary: true }]);
  });

  it("liên kết → map idNumber thành taxNo", () => {
    const opts = buildClientOptions(null, [{ isPrimary: false, client: client("c2", "Bình", "TAX2") }]);
    expect(opts).toEqual([{ id: "c2", name: "Bình", taxNo: "TAX2", isPrimary: false }]);
  });

  it("trùng id giữa chính và liên kết → gộp, isPrimary OR", () => {
    const opts = buildClientOptions({ ...client("c1", "An"), } as PrimaryClientRow, [
      { isPrimary: false, client: client("c1", "An") }
    ]);
    expect(opts).toHaveLength(1);
    expect(opts[0].isPrimary).toBe(true); // giữ primary từ khách chính
  });

  it("link isPrimary=true với khách không phải primaryClient → vẫn isPrimary", () => {
    const opts = buildClientOptions(null, [{ isPrimary: true, client: client("c2", "Bình") }]);
    expect(opts[0].isPrimary).toBe(true);
  });

  it("bỏ qua link có client null", () => {
    const opts = buildClientOptions(null, [
      { isPrimary: true, client: null },
      { isPrimary: false, client: client("c2", "Bình") }
    ]);
    expect(opts).toHaveLength(1);
    expect(opts[0].id).toBe("c2");
  });

  it("sắp xếp: isPrimary lên đầu, ổn định cho phần còn lại", () => {
    const opts = buildClientOptions({ ...client("p", "Primary"), } as PrimaryClientRow, [
      { isPrimary: false, client: client("b", "Beta") },
      { isPrimary: true, client: client("z", "Zeta") },
      { isPrimary: false, client: client("a", "Alpha") }
    ]);
    expect(opts.map((o) => o.id)).toEqual(["p", "z", "b", "a"]);
  });
});

describe("buildInvoiceContext", () => {
  const matterRow = (over: Record<string, unknown> = {}) => ({
    id: "m1",
    title: "Vụ A",
    intakeId: "i1",
    intake: {
      id: "i1",
      status: "RECEIVED",
      receivedAt: new Date("2026-01-01"),
      client: { name: "Khách intake" }
    },
    primaryClientId: "c1",
    primaryClient: { id: "c1", name: "Khách chính", idNumber: null },
    clientLinks: [],
    ...over
  });

  it("đầy đủ: clientOptions + intake + defaultBuyerName từ khách chính", () => {
    const ctx = buildInvoiceContext(matterRow() as never, []);
    expect(ctx).toMatchObject({
      matterId: "m1",
      matterTitle: "Vụ A",
      intakeId: "i1",
      defaultBuyerName: "Khách chính"
    });
    expect(ctx.intake).toEqual({
      id: "i1",
      status: "RECEIVED",
      receivedAt: new Date("2026-01-01"),
      clientName: "Khách intake"
    });
  });

  it("không có intake → intake null, intakeId null", () => {
    const ctx = buildInvoiceContext(matterRow({ intakeId: null, intake: null }) as never, []);
    expect(ctx.intake).toBeNull();
    expect(ctx.intakeId).toBeNull();
  });

  it("defaultBuyerName fallback: không primaryClient → tên khách từ intake", () => {
    const ctx = buildInvoiceContext(matterRow({ primaryClient: null, primaryClientId: null }) as never, []);
    expect(ctx.defaultBuyerName).toBe("Khách intake");
  });

  it("defaultBuyerName fallback cuối: không có gì → null", () => {
    const ctx = buildInvoiceContext(
      matterRow({ intake: { id: "i", status: "X", receivedAt: null, client: null }, primaryClient: null }) as never,
      []
    );
    expect(ctx.defaultBuyerName).toBeNull();
  });

  it("truyền options từ buildClientOptions qua", () => {
    const links: ClientLinkRow[] = [{ isPrimary: false, client: client("c2", "Bình") }];
    const ctx = buildInvoiceContext(matterRow({ clientLinks: links }) as never, [
      { id: "c2", name: "Bình", taxNo: null, isPrimary: false }
    ]);
    expect(ctx.clientOptions).toHaveLength(1);
  });
});
