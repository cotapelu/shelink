// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listFirmFiles,
  getFirmFileVersionHistory,
  uploadFirmFile,
  updateFirmFile,
  deleteFirmFile,
} from "@/server/firm-files/actions";
import { requireSession } from "@/lib/auth/session";
import { storage } from "@/lib/storage";
import { sha256 } from "@/lib/storage/crypto";
import { audit } from "@/server/audit";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { FirmFileCategory } from "@prisma/client";

// Mock modules
vi.mock("@/lib/auth/session");
vi.mock("@/lib/storage");
vi.mock("@/lib/storage/crypto");
vi.mock("@/server/audit");
vi.mock("next/cache");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    firmFile: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

const mockRequireSession = vi.mocked(requireSession, true);
const mockStorage = vi.mocked(storage, true);
const mockSha256 = vi.mocked(sha256, true);
const mockAudit = vi.mocked(audit, true);
const mockRevalidatePath = vi.mocked(revalidatePath, true);
const mockPrisma = vi.mocked(prisma, true);

beforeEach(() => {
  vi.clearAllMocks();
  // Default session: any role, we'll override per test
  mockRequireSession.mockResolvedValue({
    user: { id: "u1", role: "LAWYER" },
  } as any);
  mockStorage.writeFile.mockResolvedValue("/uploads/firm-files/abc123");
  mockSha256.mockReturnValue("hash123");
  // $transaction executes the given callback
  mockPrisma.$transaction.mockImplementation(async (cb) => await cb(mockPrisma));
});

function adminSession() {
  mockRequireSession.mockResolvedValue({
    user: { id: "admin1", role: "ADMIN" },
  } as any);
}

function principalSession() {
  mockRequireSession.mockResolvedValue({
    user: { id: "principal1", role: "PRINCIPAL_LAWYER" },
  } as any);
}

function createFile(
  name: string,
  type: string,
  content: BlobPart
): File {
  return new File([content], name, { type });
}

describe("firm-files/actions", () => {
  describe("listFirmFiles", () => {
    it("should return mapped files", async () => {
      const now = new Date();
      mockPrisma.firmFile.findMany.mockResolvedValue([
        {
          id: "f1",
          name: "Doc1.pdf",
          description: "Desc",
          category: "GUIDE" as FirmFileCategory,
          tags: ["tag1"],
          mimeType: "application/pdf",
          size: 1234,
          createdAt: now,
          supersededById: null,
          uploadedBy: { id: "u2", name: "Uploader" },
          _count: { supersedes: 0 },
        },
      ]);

      const result = await listFirmFiles({});

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: "f1",
        name: "Doc1.pdf",
        description: "Desc",
        category: "GUIDE",
        tags: ["tag1"],
        mimeType: "application/pdf",
        size: 1234,
        uploadedBy: { id: "u2", name: "Uploader" },
        createdAt: now,
        hasNewerVersion: false,
        supersedesCount: 0,
      });
    });

    it("should filter by category", async () => {
      await listFirmFiles({ category: "TEMPLATE" });
      const where = mockPrisma.firmFile.findMany.mock.calls[0][0].where as any;
      expect(where.category).toBe("TEMPLATE");
    });

    it("should filter by search across name, description, tags", async () => {
      await listFirmFiles({ search: "test" });
      const where = mockPrisma.firmFile.findMany.mock.calls[0][0].where as any;
      expect(where.OR).toEqual([
        { name: { contains: "test", mode: "insensitive" } },
        { description: { contains: "test", mode: "insensitive" } },
        { tags: { has: "test" } },
      ]);
    });

    it("should exclude superseded by default", async () => {
      await listFirmFiles({});
      const where = mockPrisma.firmFile.findMany.mock.calls[0][0].where as any;
      expect(where.supersedes).toEqual({ none: {} });
    });

    it("should include superseded when flag true", async () => {
      await listFirmFiles({ includeSuperseded: true });
      const where = mockPrisma.firmFile.findMany.mock.calls[0][0].where as any;
      expect(where).not.toHaveProperty("supersedes");
    });
  });

  describe("getFirmFileVersionHistory", () => {
    it("should return version chain from current to earliest", async () => {
      mockRequireSession.mockResolvedValue({ user: { id: "u1" } } as any);
      mockPrisma.firmFile.findUnique
        .mockResolvedValueOnce({
          id: "f2",
          name: "v2",
          createdAt: new Date("2025-07-07"),
          uploadedBy: { name: "U2" },
          supersedes: [{ id: "f1" }],
        })
        .mockResolvedValueOnce({
          id: "f1",
          name: "v1",
          createdAt: new Date("2025-07-06"),
          uploadedBy: { name: "U1" },
          supersedes: [],
        });

      const result = await getFirmFileVersionHistory({ id: "f2" });

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("f2");
      expect(result[1].id).toBe("f1");
    });

    it("should return empty if starting file not found", async () => {
      mockRequireSession.mockResolvedValue({ user: { id: "u1" } } as any);
      mockPrisma.firmFile.findUnique.mockResolvedValue(null);
      const result = await getFirmFileVersionHistory({ id: "missing" });
      expect(result).toEqual([]);
    });
  });

  describe("uploadFirmFile", () => {
    beforeEach(() => {
      // Default to ADMIN for upload tests (will override per test)
      adminSession();
    });

    it("should reject if user not ADMIN/PRINCIPAL", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u1", role: "LAWYER" },
      } as any);
      const formData = new FormData();
      formData.append("file", createFile("test.pdf", "application/pdf", "x"));
      formData.append("name", "Test");
      formData.append("category", "GUIDE");

      await expect(uploadFirmFile(formData)).rejects.toThrow(
        "Chỉ admin / Principal Lawyer được quản lý tài liệu律所"
      );
    });

    it("should reject missing file", async () => {
      const formData = new FormData();
      formData.append("name", "Test");
      formData.append("category", "GUIDE");

      await expect(uploadFirmFile(formData)).rejects.toThrow("缺少文件");
    });

    it("should reject empty file", async () => {
      const formData = new FormData();
      formData.append("file", createFile("empty.pdf", "application/pdf", ""));
      formData.append("name", "Test");
      formData.append("category", "GUIDE");

      await expect(uploadFirmFile(formData)).rejects.toThrow("空文件");
    });

    it("should reject file exceeding max size (50MB)", async () => {
      const huge = new Uint8Array(51 * 1024 * 1024); // 51MB
      const formData = new FormData();
      formData.append("file", createFile("big.pdf", "application/pdf", huge));
      formData.append("name", "Test");
      formData.append("category", "GUIDE");

      await expect(uploadFirmFile(formData)).rejects.toThrow(
        "File vượt quá 50MB"
      );
    });

    it("should reject missing name", async () => {
      const formData = new FormData();
      formData.append("file", createFile("test.pdf", "application/pdf", "x"));
      formData.append("category", "GUIDE");
      // no name

      await expect(uploadFirmFile(formData)).rejects.toThrow("Tên bắt buộc");
    });

    it("should parse category and create file record", async () => {
      const formData = new FormData();
      formData.append("file", createFile("test.pdf", "application/pdf", "x"));
      formData.append("name", "My File");
      formData.append("category", "TEMPLATE");
      mockPrisma.firmFile.create.mockResolvedValue({
        id: "newid",
        name: "My File.pdf",
      });
      mockPrisma.firmFile.update.mockResolvedValue({});

      const result = await uploadFirmFile(formData);

      expect(result).toEqual({ ok: true, id: "newid", name: "My File.pdf" });
      expect(mockPrisma.firmFile.create).toHaveBeenCalled();
    });

    it("should parse tags correctly (comma/space)", async () => {
      const formData = new FormData();
      formData.append("file", createFile("test.pdf", "application/pdf", "x"));
      formData.append("name", "My File");
      formData.append("category", "POLICY");
      formData.append("tags", "foo, bar , baz");
      mockPrisma.firmFile.create.mockResolvedValue({ id: "f", name: "My File.pdf" });
      mockPrisma.firmFile.update.mockResolvedValue({});

      await uploadFirmFile(formData);

      const data = mockPrisma.firmFile.create.mock.calls[0][0].data as any;
      expect(data.tags).toEqual(["foo", "bar", "baz"]);
    });

    it("should limit tags to 20", async () => {
      const many = Array.from({ length: 25 }, (_, i) => `t${i}`).join(",");
      const formData = new FormData();
      formData.append("file", createFile("test.pdf", "application/pdf", "x"));
      formData.append("name", "My File");
      formData.append("category", "REFERENCE");
      formData.append("tags", many);
      mockPrisma.firmFile.create.mockResolvedValue({ id: "f", name: "My File.pdf" });
      mockPrisma.firmFile.update.mockResolvedValue({});

      await uploadFirmFile(formData);

      const data = mockPrisma.firmFile.create.mock.calls[0][0].data as any;
      expect(data.tags).toHaveLength(20);
    });

    it("should write file to storage and compute hash", async () => {
      const formData = new FormData();
      const content = "binarycontent";
      formData.append("file", createFile("test.pdf", "application/pdf", content));
      formData.append("name", "Storage Test");
      formData.append("category", "GUIDE");
      mockPrisma.firmFile.create.mockResolvedValue({ id: "fid", name: "Storage Test.pdf" });
      mockPrisma.firmFile.update.mockResolvedValue({});

      await uploadFirmFile(formData);

      expect(mockStorage.writeFile).toHaveBeenCalledWith(
        "firm-files",
        expect.any(Buffer)
      );
      expect(mockSha256).toHaveBeenCalledWith(expect.any(Buffer));
    });

    it("should handle supersedes workflow (replace old version)", async () => {
      const formData = new FormData();
      formData.append("file", createFile("new.pdf", "application/pdf", "x"));
      formData.append("name", "New Version");
      formData.append("category", "GUIDE");
      formData.append("supersedesId", "oldf");
      // Mock old file lookup
      mockPrisma.firmFile.findUnique
        .mockResolvedValueOnce({
          id: "oldf",
          supersededById: null,
          archivedAt: null,
        }) // for check
        .mockResolvedValueOnce(null); // not called again
      mockPrisma.firmFile.create.mockResolvedValue({ id: "newf", name: "New Version.pdf" });
      mockPrisma.firmFile.update.mockResolvedValue({});

      await uploadFirmFile(formData);

      expect(mockPrisma.firmFile.update).toHaveBeenCalledWith({
        where: { id: "oldf" },
        data: { supersededById: "newf" },
      });
    });

    it("should reject supersede if old file not found", async () => {
      const formData = new FormData();
      formData.append("file", createFile("new.pdf", "application/pdf", "x"));
      formData.append("name", "New Version");
      formData.append("category", "GUIDE");
      formData.append("supersedesId", "missing");
      mockPrisma.firmFile.findUnique.mockResolvedValue(null);

      await expect(uploadFirmFile(formData)).rejects.toThrow(
        "Phiên bản cũ cần thay thế không tồn tại"
      );
    });

    it("should reject supersede if old already superseded", async () => {
      const formData = new FormData();
      formData.append("file", createFile("new.pdf", "application/pdf", "x"));
      formData.append("name", "New Version");
      formData.append("category", "GUIDE");
      formData.append("supersedesId", "oldf");
      mockPrisma.firmFile.findUnique.mockResolvedValue({
        id: "oldf",
        supersededById: "other",
        archivedAt: null,
      });

      await expect(uploadFirmFile(formData)).rejects.toThrow(
        "Phiên bản cũ này đã được phiên bản khác thay thế"
      );
    });

    it("should call audit with UPLOAD action", async () => {
      const formData = new FormData();
      formData.append("file", createFile("new.pdf", "application/pdf", "x"));
      formData.append("name", "New");
      formData.append("category", "REFERENCE");
      mockPrisma.firmFile.create.mockResolvedValue({ id: "fid", name: "New.pdf" });
      mockPrisma.firmFile.update.mockResolvedValue({});

      await uploadFirmFile(formData);

      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "admin1",
          action: "FIRM_FILE_UPLOAD",
          targetType: "FirmFile",
          targetId: "fid",
          detail: expect.objectContaining({
            name: "New.pdf",
            category: "REFERENCE",
            supersededId: null,
          }),
        })
      );
    });

    it("should call audit with REPLACE when supersedes", async () => {
      const formData = new FormData();
      formData.append("file", createFile("new.pdf", "application/pdf", "x"));
      formData.append("name", "New");
      formData.append("category", "REFERENCE");
      formData.append("supersedesId", "oldf");
      mockPrisma.firmFile.findUnique.mockResolvedValue({
        id: "oldf",
        supersededById: null,
        archivedAt: null,
      });
      mockPrisma.firmFile.create.mockResolvedValue({ id: "newf", name: "New.pdf" });
      mockPrisma.firmFile.update.mockResolvedValue({});

      await uploadFirmFile(formData);

      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "FIRM_FILE_REPLACE",
          detail: expect.objectContaining({ supersededId: "oldf" }),
        })
      );
    });
  });

  describe("updateFirmFile", () => {
    beforeEach(() => {
      adminSession();
    });

    it("should reject non-uploader role", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u1", role: "LAWYER" },
      } as any);
      await expect(
        updateFirmFile({ id: "f1", name: "New name" })
      ).rejects.toThrow(
        "Chỉ admin / Principal Lawyer được quản lý tài liệu律所"
      );
    });

    it("should reject if file not found", async () => {
      mockPrisma.firmFile.findUnique.mockResolvedValue(null);
      await expect(updateFirmFile({ id: "missing" })).rejects.toThrow(
        "资料不存在"
      );
    });

    it("should reject if file is archived", async () => {
      mockPrisma.firmFile.findUnique.mockResolvedValue({
        id: "f1",
        archivedAt: new Date(),
      } as any);
      await expect(updateFirmFile({ id: "f1" })).rejects.toThrow(
        "已删除的资料不可编辑"
      );
    });

    it("should update allowed fields (name, description, tags, category)", async () => {
      mockPrisma.firmFile.findUnique.mockResolvedValue({
        id: "f1",
        archivedAt: null,
      } as any);
      mockPrisma.firmFile.update.mockResolvedValue({});

      await updateFirmFile({
        id: "f1",
        name: "Updated Name",
        description: "New desc",
        tags: ["a", "b"],
        category: "POLICY",
      });

      expect(mockPrisma.firmFile.update).toHaveBeenCalledWith({
        where: { id: "f1" },
        data: {
          name: "Updated Name",
          description: "New desc",
          tags: ["a", "b"],
          category: "POLICY",
        },
      });
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "FIRM_FILE_UPDATE",
          targetId: "f1",
          detail: expect.objectContaining({
            name: "Updated Name",
            description: "New desc",
            tags: ["a", "b"],
            category: "POLICY",
          }),
        })
      );
    });
  });

  describe("deleteFirmFile", () => {
    beforeEach(() => {
      adminSession();
    });

    it("should reject non-uploader role", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u1", role: "LAWYER" },
      } as any);
      await expect(deleteFirmFile({ id: "f1" })).rejects.toThrow(
        "Chỉ admin / Principal Lawyer được quản lý tài liệu律所"
      );
    });

    it("should set archivedAt to now", async () => {
      mockPrisma.firmFile.update.mockResolvedValue({});

      await deleteFirmFile({ id: "f1" });

      expect(mockPrisma.firmFile.update).toHaveBeenCalledWith({
        where: { id: "f1" },
        data: { archivedAt: expect.any(Date) },
      });
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "FIRM_FILE_DELETE",
          targetId: "f1",
        })
      );
    });
  });
});
