// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listTemplates,
  getTemplate,
  toggleTemplate,
  renderTemplate,
} from "@/server/document-templates/actions";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { assertMatterWritable } from "@/lib/archive/guard";
import { assertCanLeadMatter } from "@/lib/permissions";
import { decryptBuffer, encryptBuffer, sha256 } from "@/lib/storage/crypto";
import { buildContext, renderDocxBuffer, detectMissing } from "@/lib/template-engine";
import { suggestFolderByTemplateCategory } from "@/lib/default-folders";

vi.mock("@/lib/auth/session");
vi.mock("@/server/audit");
vi.mock("next/cache");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    documentTemplate: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    document: {
      create: vi.fn(),
    },
    matter: {
      findUnique: vi.fn(),
    },
    documentFolder: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));
vi.mock("@/lib/storage");
vi.mock("@/lib/archive/guard");
vi.mock("@/lib/permissions");
vi.mock("@/server/audit");
vi.mock("@/lib/storage/crypto");
vi.mock("@/lib/template-engine");
vi.mock("@/lib/default-folders");

const mockRequireSession = vi.mocked(requireSession, true);
const mockAudit = vi.mocked(audit, true);
const mockRevalidatePath = vi.mocked(revalidatePath, true);
const mockPrisma = vi.mocked(prisma, true);
const mockStorage = vi.mocked(storage, true);
const mockAssertMatterWritable = vi.mocked(assertMatterWritable, true);
const mockAssertCanLeadMatter = vi.mocked(assertCanLeadMatter, true);
const mockDecryptBuffer = vi.mocked(decryptBuffer, true);
const mockEncryptBuffer = vi.mocked(encryptBuffer, true);
const mockSha256 = vi.mocked(sha256, true);
const mockBuildContext = vi.mocked(buildContext, true);
const mockRenderDocxBuffer = vi.mocked(renderDocxBuffer, true);
const mockDetectMissing = vi.mocked(detectMissing, true);
const mockSuggestFolderByTemplateCategory = vi.mocked(suggestFolderByTemplateCategory, true);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({
    user: { id: CUID(1), role: "LAWYER" },
  } as any);
  mockAssertMatterWritable.mockResolvedValue(undefined);
  mockAssertCanLeadMatter.mockResolvedValue(undefined);
});

const CUID = (n: number) => `c${n.toString().padStart(24, "0")}`;

function dummyBuffer(content: string = "dummy docx content") {
  return Buffer.from(content);
}

describe("document-templates/actions", () => {
  describe("listTemplates", () => {
    it("should list templates with valid category filter", async () => {
      mockPrisma.documentTemplate.findMany.mockResolvedValue([
        {
          id: CUID(1),
          name: "Intake Form",
          category: "INTAKE",
          description: "Desc",
          applicableCategories: ["CIVIL_COMMERCIAL"],
          variables: ["clientName"],
          isBuiltIn: true,
          enabled: true,
          updatedAt: new Date(),
        },
      ]);

      const result = await listTemplates({ onlyEnabled: true, category: "INTAKE" });

      expect(mockPrisma.documentTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            enabled: true,
            category: "INTAKE",
          }),
          orderBy: [{ category: "asc" }, { name: "asc" }],
        })
      );
      expect(result).toHaveLength(1);
    });

    it("should handle empty filter", async () => {
      mockPrisma.documentTemplate.findMany.mockResolvedValue([]);
      const result = await listTemplates();
      expect(result).toEqual([]);
    });
  });

  describe("getTemplate", () => {
    it("should get template with blob and creator", async () => {
      const id = CUID(1);
      mockPrisma.documentTemplate.findUnique.mockResolvedValue({
        id,
        name: "T1",
        docxBlob: { id: CUID(2), name: "file.docx", size: 1234 },
        createdBy: { id: CUID(3), name: "Alice" },
      });

      const result = await getTemplate(id);

      expect(mockPrisma.documentTemplate.findUnique).toHaveBeenCalledWith({
        where: { id },
        include: {
          docxBlob: { select: { id: true, name: true, size: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });
      expect(result).toBeDefined();
    });

    it("should return null if not found", async () => {
      mockPrisma.documentTemplate.findUnique.mockResolvedValue(null);
      const result = await getTemplate(CUID(1));
      expect(result).toBeNull();
    });
  });

  describe("toggleTemplate", () => {
    it("should require admin", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: CUID(1), role: "LAWYER" },
      } as any);
      await expect(toggleTemplate({ id: CUID(1), enabled: true })).rejects.toThrow("仅管理员可启用/禁用模板");
    });

    it("should enable/disable template and audit", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: CUID(1), role: "ADMIN" },
      } as any);
      mockPrisma.documentTemplate.update.mockResolvedValue({ id: CUID(1), enabled: true } as any);

      await toggleTemplate({ id: CUID(1), enabled: true });

      expect(mockPrisma.documentTemplate.update).toHaveBeenCalledWith({
        where: { id: CUID(1) },
        data: { enabled: true },
      });
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: CUID(1),
          action: "TEMPLATE_TOGGLE",
          targetType: "DocumentTemplate",
          targetId: CUID(1),
          detail: { enabled: true },
        })
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith("/settings/templates");
    });
  });

  describe("renderTemplate", () => {
    const baseInput = {
      matterId: CUID(2),
      templateId: CUID(1),
      folderId: null, // nullable, can be null
      overrides: {},
    };

    it("should render document successfully", async () => {
      const tmpl = {
        id: CUID(1),
        name: "Contract",
        enabled: true,
        docxBlob: { path: "/path/to/blob.docx", encrypted: false },
        variables: ["clientName"],
      };
      mockPrisma.documentTemplate.findUnique.mockResolvedValue(tmpl);
      mockPrisma.matter.findUnique.mockResolvedValue({ id: CUID(2), internalCode: "INV-001", category: "CIVIL_COMMERCIAL" } as any);
      mockStorage.readFile.mockResolvedValue(dummyBuffer("raw"));
      mockEncryptBuffer.mockReturnValue({
        ciphertext: Buffer.from("enc"),
        algorithm: "aes-256-gcm",
        iv: Buffer.alloc(12, 1),
        authTag: Buffer.alloc(16, 2),
      } as any);
      mockStorage.writeFile.mockResolvedValue("/storage/out");
      mockSha256.mockReturnValue("sha256hash");
      mockBuildContext.mockResolvedValue({ clientName: "John" } as any);
      mockDetectMissing.mockReturnValue([]);
      mockRenderDocxBuffer.mockReturnValue(dummyBuffer("rendered"));
      mockPrisma.document.create.mockResolvedValue({ id: CUID(3) } as any);

      const result = await renderTemplate(baseInput as any);

      expect(mockBuildContext).toHaveBeenCalledWith({
        matterId: CUID(2),
        userId: CUID(1),
        overrides: {},
      });
      expect(mockRenderDocxBuffer).toHaveBeenCalledWith(dummyBuffer("raw"), { clientName: "John" });
      expect(mockStorage.writeFile).toHaveBeenCalledWith(`m_${CUID(2)}`, Buffer.from("enc"));
      expect(mockPrisma.document.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            matterId: CUID(2),
            templateId: CUID(1),
            name: expect.stringMatching(/^Contract_.*_\d{4}-\d{2}-\d{2}\.docx$/),
            path: "/storage/out",
            size: expect.any(Number),
            sha256: "sha256hash",
            encrypted: true,
            algorithm: "aes-256-gcm",
            iv: expect.any(String),
            authTag: expect.any(String),
            tags: expect.arrayContaining(["模板生成", "Contract"]),
          }),
        })
      );
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: CUID(1),
          action: "TEMPLATE_RENDER",
          targetType: "Document",
          targetId: CUID(3),
          detail: expect.objectContaining({
            templateId: CUID(1),
            templateName: "Contract",
            matterId: CUID(2),
          }),
        })
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith(`/matters/${CUID(2)}`);
      expect(result).toEqual({ ok: true, documentId: CUID(3), fileName: expect.stringMatching(/\.docx$/), missing: [] });
    });

    it("should decrypt template if encrypted", async () => {
      const tmpl = {
        id: CUID(1),
        name: "Encrypted",
        enabled: true,
        docxBlob: { path: "/blob", encrypted: true, iv: "ivbase64", authTag: "tagbase64" },
        variables: [],
      };
      mockPrisma.documentTemplate.findUnique.mockResolvedValue(tmpl);
      mockPrisma.matter.findUnique.mockResolvedValue({ id: CUID(2), internalCode: "INV-002", category: "CIVIL_COMMERCIAL" } as any);
      mockStorage.readFile.mockResolvedValue(dummyBuffer("encrypted file"));
      mockDecryptBuffer.mockReturnValue(dummyBuffer("decrypted"));
      mockEncryptBuffer.mockReturnValue({
        ciphertext: Buffer.from("enc2"),
        algorithm: "aes-256-gcm",
        iv: Buffer.alloc(12, 3),
        authTag: Buffer.alloc(16, 4),
      } as any);
      mockStorage.writeFile.mockResolvedValue("/out");
      mockSha256.mockReturnValue("hash2");
      mockBuildContext.mockResolvedValue({} as any);
      mockDetectMissing.mockReturnValue([]);
      mockRenderDocxBuffer.mockReturnValue(dummyBuffer("rendered"));
      mockPrisma.document.create.mockResolvedValue({ id: CUID(4) } as any);

      await renderTemplate(baseInput as any);

      expect(mockDecryptBuffer).toHaveBeenCalledWith(dummyBuffer("encrypted file"), "ivbase64", "tagbase64");
      expect(mockRenderDocxBuffer).toHaveBeenCalledWith(dummyBuffer("decrypted"), {});
    });

    it("should suggest folder if folderId is null and matter has category", async () => {
      const tmpl = {
        id: CUID(1),
        name: "Doc",
        category: "LITIGATION",
        enabled: true,
        docxBlob: { path: "/blob", encrypted: false },
        variables: [],
      };
      mockPrisma.documentTemplate.findUnique.mockResolvedValue(tmpl);
      mockPrisma.matter.findUnique.mockResolvedValue({ id: CUID(2), internalCode: "INV-003", category: "CIVIL_COMMERCIAL" } as any);
      mockStorage.readFile.mockResolvedValue(dummyBuffer());
      mockEncryptBuffer.mockReturnValue({ ciphertext: Buffer.alloc(0), algorithm: "aes-256-gcm", iv: Buffer.alloc(12, 0), authTag: Buffer.alloc(16, 0) } as any);
      mockStorage.writeFile.mockResolvedValue("/out");
      mockSha256.mockReturnValue("hash");
      mockBuildContext.mockResolvedValue({} as any);
      mockDetectMissing.mockReturnValue([]);
      mockRenderDocxBuffer.mockReturnValue(dummyBuffer());
      mockSuggestFolderByTemplateCategory.mockReturnValue("Litigation Materials");
      mockPrisma.documentFolder.findFirst.mockResolvedValue({ id: CUID(3) } as any);
      mockPrisma.document.create.mockResolvedValue({ id: CUID(4) } as any);

      await renderTemplate(baseInput as any);

      expect(mockSuggestFolderByTemplateCategory).toHaveBeenCalledWith("LITIGATION", "CIVIL_COMMERCIAL");
      expect(mockPrisma.documentFolder.findFirst).toHaveBeenCalledWith({
        where: { matterId: CUID(2), name: "Litigation Materials" },
        select: { id: true },
      });
      const createCall = mockPrisma.document.create.mock.calls[0][0];
      expect(createCall.data.folderId).toBe(CUID(3));
    });

    it("should throw if template missing or disabled", async () => {
      mockPrisma.documentTemplate.findUnique.mockResolvedValue(null);
      await expect(renderTemplate(baseInput as any)).rejects.toThrow("模板不存在或已禁用");
      mockPrisma.documentTemplate.findUnique.mockResolvedValue({ enabled: false } as any);
      await expect(renderTemplate(baseInput as any)).rejects.toThrow("模板不存在或已禁用");
    });

    it("should throw if docxBlob missing", async () => {
      mockPrisma.documentTemplate.findUnique.mockResolvedValue({
        id: CUID(1),
        enabled: true,
        docxBlob: null,
      } as any);
      await expect(renderTemplate(baseInput as any)).rejects.toThrow("模板源文件缺失");
    });

    it("should validate folder belongs to matter", async () => {
      const tmpl = {
        id: CUID(1),
        name: "Doc",
        enabled: true,
        docxBlob: { path: "/blob", encrypted: false },
        variables: [],
      };
      mockPrisma.documentTemplate.findUnique.mockResolvedValue(tmpl);
      mockPrisma.matter.findUnique.mockResolvedValue({ id: CUID(2), internalCode: "INV-004", category: "CIVIL_COMMERCIAL" } as any);
      mockStorage.readFile.mockResolvedValue(dummyBuffer());
      mockEncryptBuffer.mockReturnValue({ ciphertext: Buffer.alloc(0), algorithm: "aes-256-gcm", iv: Buffer.alloc(12, 0), authTag: Buffer.alloc(16, 0) } as any);
      mockStorage.writeFile.mockResolvedValue("/out");
      mockSha256.mockReturnValue("hash");
      mockBuildContext.mockResolvedValue({} as any);
      mockDetectMissing.mockReturnValue([]);
      mockRenderDocxBuffer.mockReturnValue(dummyBuffer());
      mockPrisma.documentFolder.findUnique.mockResolvedValue({ matterId: CUID(99) } as any); // mismatched matterId
      mockPrisma.document.create.mockResolvedValue({ id: CUID(5) } as any);

      await expect(renderTemplate({ ...baseInput, folderId: CUID(10), matterId: CUID(2) } as any)).rejects.toThrow("目标卷宗与案件不匹配");
    });

    it("should throw if matter does not exist", async () => {
      const tmpl = {
        id: CUID(1),
        name: "Doc",
        enabled: true,
        docxBlob: { path: "/blob", encrypted: false },
        variables: [],
      };
      mockPrisma.documentTemplate.findUnique.mockResolvedValue(tmpl);
      mockPrisma.matter.findUnique.mockResolvedValue(null);
      mockStorage.readFile.mockResolvedValue(dummyBuffer());
      mockEncryptBuffer.mockReturnValue({ ciphertext: Buffer.alloc(0), algorithm: "aes-256-gcm", iv: Buffer.alloc(12, 0), authTag: Buffer.alloc(16, 0) } as any);
      mockStorage.writeFile.mockResolvedValue("/out");
      mockSha256.mockReturnValue("hash");
      mockBuildContext.mockResolvedValue({} as any);
      mockDetectMissing.mockReturnValue([]);
      mockRenderDocxBuffer.mockReturnValue(dummyBuffer());
      mockPrisma.document.create.mockResolvedValue({ id: CUID(6) } as any);

      await expect(renderTemplate({ ...baseInput, matterId: CUID(2) } as any)).rejects.toThrow("案件不存在");
    });

    it("should include missing variables in result", async () => {
      const tmpl = {
        id: CUID(1),
        name: "Doc",
        enabled: true,
        docxBlob: { path: "/blob", encrypted: false },
        variables: ["var1", "var2"],
      };
      mockPrisma.documentTemplate.findUnique.mockResolvedValue(tmpl);
      mockPrisma.matter.findUnique.mockResolvedValue({ id: CUID(2), internalCode: "INV-005", category: "CIVIL_COMMERCIAL" } as any);
      mockStorage.readFile.mockResolvedValue(dummyBuffer());
      mockEncryptBuffer.mockReturnValue({ ciphertext: Buffer.alloc(0), algorithm: "aes-256-gcm", iv: Buffer.alloc(12, 0), authTag: Buffer.alloc(16, 0) } as any);
      mockStorage.writeFile.mockResolvedValue("/out");
      mockSha256.mockReturnValue("hash");
      mockBuildContext.mockResolvedValue({ var1: "val1" } as any);
      mockDetectMissing.mockReturnValue(["var2"]);
      mockRenderDocxBuffer.mockReturnValue(dummyBuffer());
      mockPrisma.document.create.mockResolvedValue({ id: CUID(7) } as any);

      const result = await renderTemplate(baseInput as any);

      expect(result).toEqual({ ok: true, documentId: CUID(7), fileName: expect.stringMatching(/\.docx$/), missing: ["var2"] });
    });

    it("should include overrides in context build", async () => {
      const tmpl = {
        id: CUID(1),
        name: "Doc",
        enabled: true,
        docxBlob: { path: "/blob", encrypted: false },
        variables: [],
      };
      mockPrisma.documentTemplate.findUnique.mockResolvedValue(tmpl);
      mockPrisma.matter.findUnique.mockResolvedValue({ id: CUID(2), internalCode: "INV-006", category: "CIVIL_COMMERCIAL" } as any);
      mockStorage.readFile.mockResolvedValue(dummyBuffer());
      mockEncryptBuffer.mockReturnValue({ ciphertext: Buffer.alloc(0), algorithm: "aes-256-gcm", iv: Buffer.alloc(12, 0), authTag: Buffer.alloc(16, 0) } as any);
      mockStorage.writeFile.mockResolvedValue("/out");
      mockSha256.mockReturnValue("hash");
      mockBuildContext.mockResolvedValue({} as any);
      mockDetectMissing.mockReturnValue([]);
      mockRenderDocxBuffer.mockReturnValue(dummyBuffer());
      mockPrisma.document.create.mockResolvedValue({ id: CUID(8) } as any);

      await renderTemplate({ ...baseInput, overrides: { foo: "bar" } } as any);

      expect(mockBuildContext).toHaveBeenCalledWith({
        matterId: CUID(2),
        userId: CUID(1),
        overrides: { foo: "bar" },
      });
    });

    it("should set fileName with proper format", async () => {
      const tmpl = {
        id: CUID(1),
        name: "MyTemplate",
        enabled: true,
        docxBlob: { path: "/blob", encrypted: false },
        variables: [],
      };
      mockPrisma.documentTemplate.findUnique.mockResolvedValue(tmpl);
      mockPrisma.matter.findUnique.mockResolvedValue({ id: CUID(2), internalCode: "INV-007", category: "CIVIL_COMMERCIAL" } as any);
      mockStorage.readFile.mockResolvedValue(dummyBuffer());
      mockEncryptBuffer.mockReturnValue({ ciphertext: Buffer.alloc(0), algorithm: "aes-256-gcm", iv: Buffer.alloc(12, 0), authTag: Buffer.alloc(16, 0) } as any);
      mockStorage.writeFile.mockResolvedValue("/out");
      mockSha256.mockReturnValue("hash");
      mockBuildContext.mockResolvedValue({} as any);
      mockDetectMissing.mockReturnValue([]);
      mockRenderDocxBuffer.mockReturnValue(dummyBuffer());
      mockPrisma.document.create.mockResolvedValue({ id: CUID(9) } as any);

      const result = await renderTemplate(baseInput as any);

      expect(result.fileName).toMatch(/^MyTemplate_INV-007_\d{4}-\d{2}-\d{2}\.docx$/);
    });
  });
});
