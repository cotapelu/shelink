import { describe, it, expect } from "vitest";
import { groupDocumentsByFolder } from "@/app/(app)/matters/[id]/_components/folders-panel-lib";
import type { FolderDocument, FolderPayload } from "@/app/(app)/matters/[id]/_components/folder-types";

function folder(id: string, name: string, isDefault = false): FolderPayload {
  return { id, name, orderIndex: 0, isDefault };
}

function doc(id: string, folderId: string | null): FolderDocument {
  return { id, name: `doc-${id}`, size: null, folderId, templateId: null, createdAt: new Date("2026-01-01") };
}

describe("groupDocumentsByFolder", () => {
  it("khởi tạo bucket rỗng cho mọi folder + bucket null (散件)", () => {
    const { byFolderId, loose } = groupDocumentsByFolder([folder("f1", "A"), folder("f2", "B")], []);
    expect(byFolderId.has(null)).toBe(true);
    expect([...byFolderId.keys()]).toEqual([null, "f1", "f2"]);
    expect(loose).toEqual([]);
  });

  it("phân tài liệu vào đúng folder theo folderId", () => {
    const { byFolderId } = groupDocumentsByFolder(
      [folder("f1", "A")],
      [doc("1", "f1"), doc("2", "f1"), doc("3", null)]
    );
    expect(byFolderId.get("f1")?.map((d) => d.id)).toEqual(["1", "2"]);
    expect(byFolderId.get(null)?.map((d) => d.id)).toEqual(["3"]);
  });

  it("loose = bucket null", () => {
    const { loose } = groupDocumentsByFolder([folder("f1", "A")], [doc("9", null), doc("8", null)]);
    expect(loose.map((d) => d.id)).toEqual(["9", "8"]);
  });

  it("folderId không tồn tại trong danh sách folder → tạo bucket riêng (giữ hành vi cũ)", () => {
    const { byFolderId } = groupDocumentsByFolder([folder("f1", "A")], [doc("1", "ghost")]);
    expect(byFolderId.get("ghost")?.map((d) => d.id)).toEqual(["1"]);
    expect(byFolderId.get(null)).toEqual([]);
  });

  it("không mutate đầu vào", () => {
    const folders = [folder("f1", "A")];
    const docs = [doc("1", "f1")];
    groupDocumentsByFolder(folders, docs);
    expect(docs).toHaveLength(1);
    expect(docs[0].folderId).toBe("f1");
  });

  it("rỗng-rỗng: chỉ có bucket null", () => {
    const { byFolderId, loose } = groupDocumentsByFolder([], []);
    expect([...byFolderId.keys()]).toEqual([null]);
    expect(loose).toEqual([]);
  });
});
