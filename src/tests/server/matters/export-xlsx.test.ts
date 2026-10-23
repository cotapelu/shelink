// @ts-nocheck
import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { resolveMattersExportParams, buildMattersExportWorkbook } from "@/server/matters/export-xlsx";

describe("resolveMattersExportParams", () => {
  it("should parse full params for active tab", () => {
    const params = new URLSearchParams();
    params.set("tab", "active");
    params.set("sortBy", "hearing");
    params.set("sortDir", "asc");

    const result = resolveMattersExportParams(params);

    expect(result.tab).toBe("active");
    expect(result.sortBy).toBe("hearing");
    expect(result.sortDir).toBe("asc");
    expect(result.search).toBeUndefined();
    expect(result.category).toBeUndefined();
  });

  it("should normalize hearing to intakeDate for intake tab", () => {
    const params = new URLSearchParams();
    params.set("tab", "intake");
    params.set("sortBy", "hearing"); // not allowed for intake
    params.set("sortDir", "desc");

    const result = resolveMattersExportParams(params);

    expect(result.tab).toBe("intake");
    expect(result.sortBy).toBe("intakeDate"); // normalized
  });

  it("should parse category and status", () => {
    const params = new URLSearchParams();
    params.set("tab", "active");
    params.set("category", "CIVIL_COMMERCIAL");
    params.set("status", "IN_PROGRESS");

    const result = resolveMattersExportParams(params);

    expect(result.category).toBe("CIVIL_COMMERCIAL");
    expect(result.status).toBe("IN_PROGRESS");
  });

  it("should default to active tab when missing", () => {
    const params = new URLSearchParams();
    params.set("sortBy", "claimAmount");

    const result = resolveMattersExportParams(params);

    expect(result.tab).toBe("active");
    expect(result.sortBy).toBe("claimAmount");
  });

  it("should trim and clean search text", () => {
    const params = new URLSearchParams();
    params.set("tab", "all");
    params.set("search", "  test query  ");

    const result = resolveMattersExportParams(params);

    expect(result.search).toBe("test query");
  });

  describe("edge cases and defaults", () => {
    it("should default tab to 'active' when invalid", () => {
      const params = new URLSearchParams("tab=invalid");
      const result = resolveMattersExportParams(params);
      expect(result.tab).toBe("active");
    });

    it("should accept all valid tab values", () => {
      const tabs = ["intake", "active", "archived", "revision", "all"] as const;
      tabs.forEach(tab => {
        const params = new URLSearchParams(`tab=${tab}`);
        expect(resolveMattersExportParams(params).tab).toBe(tab);
      });
    });

    it("should normalize sortBy to default for tab when invalid", () => {
      const params = new URLSearchParams("tab=active&sortBy=invalid");
      const result = resolveMattersExportParams(params);
      // defaultSortByForTab('active') returns 'hearing'
      expect(result.sortBy).toBe("hearing");
    });

    it("should keep sortBy when valid for tab", () => {
      const params = new URLSearchParams("tab=active&sortBy=hearing");
      expect(resolveMattersExportParams(params).sortBy).toBe("hearing");
      const params2 = new URLSearchParams("tab=intake&sortBy=intakeDate");
      expect(resolveMattersExportParams(params2).sortBy).toBe("intakeDate");
    });

    it("should set category to undefined when invalid", () => {
      const params = new URLSearchParams("category=INVALID");
      expect(resolveMattersExportParams(params).category).toBeUndefined();
    });

    it("should accept valid categories", () => {
      const valid = [
        "CIVIL_COMMERCIAL",
        "LABOR_ARBITRATION",
        "COMMERCIAL_ARBITRATION",
        "CRIMINAL",
        "ADMINISTRATIVE",
        "NON_LITIGATION",
        "LEGAL_COUNSEL",
        "SPECIAL_PROJECT"
      ] as const;
      valid.forEach(cat => {
        const params = new URLSearchParams(`category=${cat}`);
        expect(resolveMattersExportParams(params).category).toBe(cat);
      });
    });

    it("should set status to undefined when missing", () => {
      const params = new URLSearchParams();
      expect(resolveMattersExportParams(params).status).toBeUndefined();
    });

    it("should clean status text", () => {
      const params = new URLSearchParams("status=  in_progress  ");
      expect(resolveMattersExportParams(params).status).toBe("in_progress");
    });

    it("should return undefined for non-date format", () => {
      const params = new URLSearchParams("from=not-a-date");
      expect(resolveMattersExportParams(params).from).toBeUndefined();
    });

    it("should accept date in YYYY-MM-DD format even if semantically invalid", () => {
      // cleanDateText only checks format, not validity of month/day
      const params = new URLSearchParams("from=2025-13-01");
      expect(resolveMattersExportParams(params).from).toBe("2025-13-01");
    });

    it("should default sortDir to 'desc' when not 'asc'", () => {
      const params = new URLSearchParams("sortDir=desc");
      expect(resolveMattersExportParams(params).sortDir).toBe("desc");
      const params2 = new URLSearchParams("sortDir="); // empty
      expect(resolveMattersExportParams(params2).sortDir).toBe("desc");
    });

    it("should accept 'asc' sortDir", () => {
      const params = new URLSearchParams("sortDir=asc");
      expect(resolveMattersExportParams(params).sortDir).toBe("asc");
    });
  });
});

describe("buildMattersExportWorkbook", () => {
  const mockUser: ExportUser = { id: "u1", role: "LAWYER" };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.intake).findMany = vi.fn();
    vi.mocked(prisma.matter).findMany = vi.fn();
    vi.mocked(prisma.user).findMany = vi.fn();
  });

  it("handles empty intake tab with no data", async () => {
    vi.mocked(prisma.intake).findMany.mockResolvedValue([]);

    const result = await buildMattersExportWorkbook(
      { tab: "intake", sortBy: "intakeDate", sortDir: "desc" },
      mockUser
    );

    expect(result.total).toBe(0);
    expect(result.filename).toContain("intake");
    expect(result.tabLabel).toBe("Chờ duyệt");
    expect(prisma.intake.findMany).toHaveBeenCalledTimes(1);
  });

  it("handles empty active tab with no matters", async () => {
    vi.mocked(prisma.matter).findMany.mockResolvedValue([]);

    const result = await buildMattersExportWorkbook(
      { tab: "active", sortBy: "hearing", sortDir: "asc" },
      mockUser
    );

    expect(result.total).toBe(0);
    expect(result.filename).toContain("active");
    expect(result.tabLabel).toBe("Đang xử lý");
    expect(prisma.matter.findMany).toHaveBeenCalledTimes(1);
  });

  it("propagates prisma errors on intake tab", async () => {
    const mockError = new Error("DB failure");
    vi.mocked(prisma.intake).findMany.mockRejectedValue(mockError);

    await expect(
      buildMattersExportWorkbook(
        { tab: "intake", sortBy: "intakeDate", sortDir: "desc" },
        mockUser
      )
    ).rejects.toThrow("DB failure");
  });

  it("propagates prisma errors on active tab", async () => {
    const mockError = new Error("DB failure");
    vi.mocked(prisma.matter).findMany.mockRejectedValue(mockError);

    await expect(
      buildMattersExportWorkbook(
        { tab: "active", sortBy: "hearing", sortDir: "asc" },
        mockUser
      )
    ).rejects.toThrow("DB failure");
  });

  it("handles revision tab same as intake", async () => {
    vi.mocked(prisma.intake).findMany.mockResolvedValue([]);

    const result = await buildMattersExportWorkbook(
      { tab: "revision", sortBy: "intakeDate", sortDir: "desc" },
      mockUser
    );

    expect(result.total).toBe(0);
    expect(result.tabLabel).toBe("Chờ bổ sung");
  });

  it("handles archived tab with no data", async () => {
    vi.mocked(prisma.matter).findMany.mockResolvedValue([]);

    const result = await buildMattersExportWorkbook(
      { tab: "archived", sortBy: "intakeDate", sortDir: "desc" },
      mockUser
    );

    expect(result.total).toBe(0);
 expect(result.tabLabel).toBe("Đã lưu trữ");
    expect(prisma.matter.findMany).toHaveBeenCalledTimes(1);
  });

  it("handles all tab with no data", async () => {
    vi.mocked(prisma.matter).findMany.mockResolvedValue([]);

    const result = await buildMattersExportWorkbook(
      { tab: "all", sortBy: "intakeDate", sortDir: "desc" },
      mockUser
    );

    expect(result.total).toBe(0);
    expect(result.tabLabel).toBe("Tất cả vụ án");
    // all tab queries matters without archive filter
    expect(prisma.matter.findMany).toHaveBeenCalledTimes(1);
  });
});

describe("addIntakesSheet with data", () => {
  const mockUser: ExportUser = { id: "u1", role: "LAWYER" };
  const mockIntakeRows: any[] = [
    {
      id: "i1",
      title: "Intake 1",
      category: "CIVIL_COMMERCIAL",
      status: "PENDING",
      receivedAt: new Date("2025-01-15"),
      cause: { name: "Contract" },
      causeFreeText: "",
      description: "Desc 1",
      client: {
        id: "c1",
        name: "Client A",
        type: "INDIVIDUAL",
        idNumber: "123",
        address: "Addr",
        phone: "0901",
        legalRep: "",
        contacts: []
      },
      contactName: "",
      contactPhone: "",
      clientContacts: "",
      firstProcedureType: "LITIGATION",
      firstAgency: "",
      jurisdiction: "",
      ourStanding: "PLAINTIFF",
      claimAmount: 10000,
      claimDescription: "",
      barFiling: "NOT_REQUIRED",
      counterclaim: false,
      businessType: "",
      serviceScope: "",
      deliverables: "",
      counselType: "",
      serviceStart: new Date("2025-02-01"),
      serviceEnd: new Date("2025-03-01"),
      feeType: "HOURLY",
      feeAmount: 5000,
      contingencyTerms: "",
      feeSchedule: "",
      feeNote: "",
      ownerUser: { name: "Owner" },
      coUserIds: [],
      parties: [],
      documents: [],
      matter: { firmCaseNo: "FC-001", internalCode: "IN-001", title: "Matter A" },
      declinedReason: "",
      createdAt: new Date("2025-01-10"),
      updatedAt: new Date("2025-01-12")
    },
    {
      id: "i2",
      title: "Intake 2",
      category: "CRIMINAL",
      status: "REVIEW",
      receivedAt: new Date("2025-02-01"),
      cause: null,
      causeFreeText: "Custom cause",
      description: "Desc 2",
      client: null,
      contactName: "Contact",
      contactPhone: "0902",
      clientContacts: "",
      firstProcedureType: "ARBITRATION",
      firstAgency: "Agency",
      jurisdiction: "Hanoi",
      ourStanding: "DEFENDANT",
      claimAmount: null,
      claimDescription: "",
      barFiling: "REQUIRED",
      counterclaim: true,
      businessType: "",
      serviceScope: "",
      deliverables: "",
      counselType: "",
      serviceStart: null,
      serviceEnd: null,
      feeType: "FIXED",
      feeAmount: null,
      contingencyTerms: "30%",
      feeSchedule: "",
      feeNote: "",
      ownerUser: { name: "Owner2" },
      coUserIds: ["u2"],
      parties: [],
      documents: [],
      matter: null,
      declinedReason: "",
      createdAt: new Date("2025-02-05"),
      updatedAt: new Date("2025-02-06")
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.intake).findMany = vi.fn();
    vi.mocked(prisma.user).findMany = vi.fn().mockResolvedValue([
      { id: "u2", name: "CoUser" }
    ]);
  });

  it("creates worksheets grouped by category", async () => {
    vi.mocked(prisma.intake).findMany.mockResolvedValue(mockIntakeRows);

    const result = await buildMattersExportWorkbook(
      { tab: "intake", sortBy: "intakeDate", sortDir: "desc" },
      mockUser
    );

    expect(result.total).toBe(2);
    expect(result.filename).toContain("intake");
  });

  it("handles co-user name mapping", async () => {
    vi.mocked(prisma.intake).findMany.mockResolvedValue(mockIntakeRows);

    const result = await buildMattersExportWorkbook(
      { tab: "intake", sortBy: "intakeDate", sortDir: "desc" },
      mockUser
    );

    expect(result.total).toBe(2);
    // Verify coUserNames lookup called
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["u2"] } },
      select: { id: true, name: true }
    });
  });

  it("handles revision tab with data", async () => {
    vi.mocked(prisma.intake).findMany.mockResolvedValue(mockIntakeRows);

    const result = await buildMattersExportWorkbook(
      { tab: "revision", sortBy: "intakeDate", sortDir: "desc" },
      mockUser
    );

    expect(result.total).toBe(2);
    expect(result.tabLabel).toBe("Chờ bổ sung");
  });
});

const COL = {
  internalCode: "Mã hệ thống",
  firmCaseNo: "Mã nội bộ",
  title: "Tên vụ án",
  category: "Phân loại",
  status: "Trạng thái",
  intakeDate: "Ngày nhận",
  firstAcceptedAt: "Lần đầu nộp đơn/bắt đầu",
  closedAt: "Ngày kết thúc",
  archivedAt: "Ngày lưu trữ",
  primaryClient: "Khách hàng chính",
  primaryClientType: "Loại khách hàng chính",
  primaryClientIdNumber: "Số ID khách hàng chính",
  primaryClientAddress: "Địa chỉ khách hàng chính",
  primaryClientLegalRep: "Đại diện pháp lý",
  primaryClientContacts: "Liên hệ khách hàng chính",
  otherClients: "Khách hàng khác",
  owner: "Luật sư phụ trách",
  members: "Thành viên team",
  cause: "Nguyên cáo",
  causeFreeText: "Nguyên cáo tự do",
  claimAmount: "Giá trị yêu cầu",
  ourStanding: "Vị trí của tôi",
  counterclaimAsPlaintiff: "Nguyên cáo ngược",
  counterclaimAsDefendant: "Bị cáo ngược",
  barFiling: "Lưu trữ hội luật sư",
  parties: "Các bên liên quan",
  businessType: "Loại hình dự án",
  serviceScope: "Phạm vi dịch vụ",
  deliverables: "Đầu ra",
  serviceStart: "Bắt đầu dịch vụ",
  serviceEnd: "Kết thúc dịch vụ",
  procedureSummary: "Tóm tắt thủ tục/giai đoạn",
  counselType: "Loại tư vấn",
  relatedEntities: "Thực thể liên kết",
  relatedMatters: "Vụ án liên kết",
  documents: "Tài liệu vụ án",
  customValues: "Trường tùy chỉnh",
  intakeTitle: "Tiêu đề intake nguồn",
  intakeStatus: "Trạng thái intake nguồn",
  sourceReceivedAt: "Ngày nhận nguồn",
  sourceDescription: "Mô tả vụ án nguồn",
  sourceFeeType: "Hình thức thu phí nguồn",
  sourceFeeAmount: "Số tiền luật sư nguồn",
  sourceFeeSchedule: "Các mốcthanh toán nguồn",
  sourceFeeNote: "Ghi chú phí nguồn",
  sourceCoUsers: "Luật sư cùng nguồn",
  sourceDocuments: "Tài liệu nguồn",
  createdAt: "Ngày tạo",
  updatedAt: "Ngày cập nhật",
  sourceFirstProcedureType: "Nguồn: Thủ tục đầu tiên",
  sourceFirstAgency: "Nguồn: Cơ quan giải quyết",
  sourceJurisdiction: "Nguồn: Có thẩm quyền",
  sourceOurStanding: "Nguồn: Vị trí của tôi",
  sourceClaimAmount: "Nguồn: Giá trị yêu cầu",
  sourceClaimDescription: "Nguồn: Mô tả yêu cầu",
  sourceBarFiling: "Nguồn: Lưu trữ hội luật sư",
  sourceCounterclaim: "Nguồn: Có khiếu nại ngược",
  sourceBusinessType: "Nguồn: Loại hình",
  sourceServiceScope: "Nguồn: Phạm vi dịch vụ",
  sourceDeliverables: "Nguồn: Đầu ra",
  sourceServiceStart: "Nguồn: Dịch vụ bắt đầu",
  sourceServiceEnd: "Nguồn: Dịch vụ kết thúc",
  sourceCounselType: "Nguồn: Loại tư vấn",
  procedure1Type: "Thủ tục 1-Loại",
  procedure2Type: "Thủ tục 2-Loại",
  procedure3Type: "Thủ tục 3-Loại",
  procedure4Type: "Thủ tục 4-Loại",
  procedure1Label: "Thủ tục 1-Nhãn",
  procedure2Label: "Thủ tục 2-Nhãn",
  procedure3Label: "Thủ tục 3-Nhãn",
  procedure4Label: "Thủ tục 4-Nhãn",
  procedure1Engagement: "Thủ tục 1-Cách tham gia",
  procedure2Engagement: "Thủ tục 2-Cách tham gia",
  procedure3Engagement: "Thủ tục 3-Cách tham gia",
  procedure4Engagement: "Thủ tục 4-Cách tham gia",
  procedure1Status: "Thủ tục 1-Trạng thái",
  procedure2Status: "Thủ tục 2-Trạng thái",
  procedure3Status: "Thủ tục 3-Trạng thái",
  procedure4Status: "Thủ tục 4-Trạng thái",
  procedure1CaseNumber: "Thủ tục 1-Số vụ án",
  procedure2CaseNumber: "Thủ tục 2-Số vụ án",
  procedure3CaseNumber: "Thủ tục 3-Số vụ án",
  procedure4CaseNumber: "Thủ tục 4-Số vụ án",
  procedure1Jurisdiction: "Thủ tục 1-Có thẩm quyền",
  procedure2Jurisdiction: "Thủ tục 2-Có thẩm quyền",
  procedure3Jurisdiction: "Thủ tục 3-Có thẩm quyền",
  procedure4Jurisdiction: "Thủ tục 4-Có thẩm quyền",
  procedure1HandlingAgency: "Thủ tục 1-Cơ quan xử lý",
  procedure2HandlingAgency: "Thủ tục 2-Cơ quan xử lý",
  procedure3HandlingAgency: "Thủ tục 3-Cơ quan xử lý",
  procedure4HandlingAgency: "Thủ tục 4-Cơ quan xử lý",
  procedure1Panel: "Thủ tục 1-Ban xét xử/Phòng ban",
  procedure2Panel: "Thủ tục 2-Ban xét xử/Phòng ban",
  procedure3Panel: "Thủ tục 3-Ban xét xử/Phòng ban",
  procedure4Panel: "Thủ tục 4-Ban xét xử/Phòng ban",
  procedure1Handler: "Thủ tục 1-Người xử lý",
  procedure2Handler: "Thủ tục 2-Người xử lý",
  procedure3Handler: "Thủ tục 3-Người xử lý",
  procedure4Handler: "Thủ tục 4-Người xử lý",
  procedure1OurStanding: "Thủ tục 1-Vị trí của tôi",
  procedure2OurStanding: "Thủ tục 2-Vị trí của tôi",
  procedure3OurStanding: "Thủ tục 3-Vị trí của tôi",
  procedure4OurStanding: "Thủ tục 4-Vị trí của tôi",
  procedure1LeadLawyer: "Thủ tục 1-Luật sư phụ trách",
  procedure2LeadLawyer: "Thủ tục 2-Luật sư phụ trách",
  procedure3LeadLawyer: "Thủ tục 3-Luật sư phụ trách",
  procedure4LeadLawyer: "Thủ tục 4-Luật sư phụ trách",
  procedure1ExternalLead: "Thủ tục 1-Đại diện bên ngoài",
  procedure2ExternalLead: "Thủ tục 2-Đại diện bên ngoài",
  procedure3ExternalLead: "Thủ tục 3-Đại diện bên ngoài",
  procedure4ExternalLead: "Thủ tục 4-Đại diện bên ngoài",
  procedure1AcceptedAt: "Thủ tục 1-Nộp đơn/Bắt đầu",
  procedure2AcceptedAt: "Thủ tục 2-Nộp đơn/Bắt đầu",
  procedure3AcceptedAt: "Thủ tục 3-Nộp đơn/Bắt đầu",
  procedure4AcceptedAt: "Thủ tục 4-Nộp đơn/Bắt đầu",
  procedure1ConcludedAt: "Thủ tục 1-Phán quyết/Kết thúc",
  procedure2ConcludedAt: "Thủ tục 2-Phán quyết/Kết thúc",
  procedure3ConcludedAt: "Thủ tục 3-Phán quyết/Kết thúc",
  procedure4ConcludedAt: "Thủ tục 4-Phán quyết/Kết thúc",
  procedure1Outcome: "Thủ tục 1-Kết quả",
  procedure2Outcome: "Thủ tục 2-Kết quả",
  procedure3Outcome: "Thủ tục 3-Kết quả",
  procedure4Outcome: "Thủ tục 4-Kết quả",
  procedure1OutcomeNote: "Thủ tục 1-Giải thích kết quả",
  procedure2OutcomeNote: "Thủ tục 2-Giải thích kết quả",
  procedure3OutcomeNote: "Thủ tục 3-Giải thích kết quả",
  procedure4OutcomeNote: "Thủ tục 4-Giải thích kết quả",
  procedure1PresidingJudge: "Thủ tục 1-Thẩm phán/Trọng tài viên/Thực thi judge",
  procedure2PresidingJudge: "Thủ tục 2-Thẩm phán/Trọng tài viên/Thực thi judge",
  procedure3PresidingJudge: "Thủ tục 3-Thẩm phán/Trọng tài viên/Thực thi judge",
  procedure4PresidingJudge: "Thủ tục 4-Thẩm phán/Trọng tài viên/Thực thi judge",
  procedure1PresidingJudgeContact: "Thủ tục 1-Thông tin liên hệ",
  procedure2PresidingJudgeContact: "Thủ tục 2-Thông tin liên hệ",
  procedure3PresidingJudgeContact: "Thủ tục 3-Thông tin liên hệ",
  procedure4PresidingJudgeContact: "Thủ tục 4-Thông tin liên hệ",
  procedure1JudgeAssistant: "Thủ tục 1-Trợ lý",
  procedure2JudgeAssistant: "Thủ tục 2-Trợ lý",
  procedure3JudgeAssistant: "Thủ tục 3-Trợ lý",
  procedure4JudgeAssistant: "Thủ tục 4-Trợ lý",
  procedure1JudgeAssistantContact: "Thủ tục 1-Thông tin liên hệ trợ lý",
  procedure2JudgeAssistantContact: "Thủ tục 2-Thông tin liên hệ trợ lý",
  procedure3JudgeAssistantContact: "Thủ tục 3-Thông tin liên hệ trợ lý",
  procedure4JudgeAssistantContact: "Thủ tục 4-Thông tin liên hệ trợ lý",
  procedure1Parties: "Thủ tục 1-Các bên liên quan",
  procedure2Parties: "Thủ tục 2-Các bên liên quan",
  procedure3Parties: "Thủ tục 3-Các bên liên quan",
  procedure4Parties: "Thủ tục 4-Các bên liên quan",
};
describe("buildMatterRow section builders - litigation kind (CIVIL_COMMERCIAL)", () => {
  const mockUser: ExportUser = { id: "u1", role: "LAWYER" };

  const fullIntake = {
    id: "i1",
    title: "Intake nguồn",
    status: "CONVERTED",
    receivedAt: new Date("2025-01-05"),
    description: "Mô tả nguồn",
    firstProcedureType: "FIRST_INSTANCE",
    firstAgency: "TAND Q1",
    jurisdiction: "TP.HCM",
    ourStanding: "PLAINTIFF",
    claimAmount: 120000,
    claimDescription: "Bồi thường",
    barFiling: "COLLECTIVE",
    counterclaim: true,
    businessType: "Tư vấn",
    serviceScope: "Phạm vi",
    deliverables: "Báo cáo",
    counselType: "Đại diện",
    serviceStart: new Date("2025-02-01"),
    serviceEnd: new Date("2025-03-01"),
    feeType: "FIXED",
    feeAmount: 8000,
    feeSchedule: "2 đợt",
    feeNote: "Ghi chú phí",
    coUserIds: ["u9"],
    documents: [{ name: "Intake.pdf", category: "OTHER", createdAt: new Date("2025-01-06") }]
  };

  const fullMatter = {
    id: "m1",
    internalCode: "IN-001",
    firmCaseNo: "FC-2025-001",
    title: "Vụ án A",
    category: "CIVIL_COMMERCIAL",
    status: "IN_PROGRESS",
    intakeDate: new Date("2025-01-05"),
    firstAcceptedAt: new Date("2025-01-10"),
    closedAt: null,
    archivedAt: null,
    primaryClient: {
      id: "c1",
      name: "Công ty ABC",
      type: "COMPANY",
      idNumber: "ORG-1",
      address: "123 Đường A",
      phone: "0901",
      legalRep: "Nguyễn Văn X",
      contacts: [
        { name: "Liên hệ chính", title: "Chủ tịch", phone: "0902", email: "main@abc.vn", isPrimary: true },
        { name: "Liên hệ phụ", title: null, phone: "0903", email: null, isPrimary: false }
      ]
    },
    clientLinks: [
      { clientId: "c1", label: "Chính", client: { name: "Công ty ABC" } },
      { clientId: "c2", label: "", client: { name: "Công ty XYZ" } }
    ],
    owner: { id: "u1", name: "Luật sư A" },
    members: [
      { user: { id: "u2", name: "Trợ lý B" }, role: "ASSISTANT" },
      { user: { id: "u3", name: "Luật sư C" }, role: "LEAD" }
    ],
    cause: { name: "Tranh chấp hợp đồng" },
    causeFreeText: "Tự do",
    claimAmount: 150000,
    ourStanding: "PLAINTIFF",
    counterclaimAsPlaintiff: true,
    counterclaimAsDefendant: false,
    barFiling: "COLLECTIVE",
    businessType: "Tư vấn",
    serviceScope: "Toàn bộ",
    deliverables: "Báo cáo",
    counselType: "Đại diện",
    serviceStart: new Date("2025-02-01"),
    serviceEnd: new Date("2025-03-01"),
    parties: [
      { role: "CLIENT_PARTY", standing: "PLAINTIFF", partyType: "COMPANY", name: "Công ty ABC", idNumber: null, enterpriseSocialCode: "0123456789", phone: "0909", address: "456 Đường B", legalRep: "Nguyễn Văn X", contactName: null, notes: null },
      { role: "OPPOSING_PARTY", standing: "DEFENDANT", partyType: "NATURAL_PERSON", name: "Nguyễn Văn B", idNumber: "123456789", enterpriseSocialCode: null, phone: null, address: null, legalRep: null, contactName: null, notes: null }
    ],
    procedures: [
      {
        type: "FIRST_INSTANCE",
        customLabel: "Sơ thẩm",
        engagement: "ENGAGED",
        status: "IN_PROGRESS",
        caseNumber: "123/2025/TLST",
        jurisdiction: "TP.HCM",
        handlingAgency: "TAND Q1",
        panel: "HĐXX 1",
        handler: "Thẩm phán A",
        ourStanding: "PLAINTIFF",
        leadLawyer: { id: "u1", name: "Luật sư A" },
        isExternalLead: false,
        acceptedAt: new Date("2025-02-01"),
        concludedAt: null,
        outcome: null,
        outcomeNote: null,
        hearings: [{ startsAt: new Date("2025-03-01T09:00:00") }],
        procedureParties: [
          { standing: "PLAINTIFF", party: { partyType: "COMPANY", name: "Công ty ABC", idNumber: null, enterpriseSocialCode: null, phone: null, address: null, legalRep: null, contactName: null, notes: null } },
          { standing: "DEFENDANT", party: { partyType: "NATURAL_PERSON", name: "Nguyễn Văn B" } }
        ]
      },
      {
        type: "COMMERCIAL_ARBITRATION",
        customLabel: null,
        engagement: "INFORMATIONAL",
        status: "CONCLUDED",
        caseNumber: null,
        jurisdiction: null,
        handlingAgency: null,
        panel: null,
        handler: null,
        ourStanding: null,
        leadLawyer: null,
        isExternalLead: true,
        acceptedAt: null,
        concludedAt: new Date("2025-04-01"),
        outcome: "WON",
        outcomeNote: "Thắng toàn bộ",
        hearings: [],
        procedureParties: []
      }
    ],
    relatedEntities: [
      { name: "Đối tác X", relationship: "Bên liên quan", notes: "Ghi chú" },
      { name: "Không notes", relationship: "Khác", notes: null }
    ],
    linksFrom: [{ relatedMatter: { internalCode: "IN-002", firmCaseNo: null, title: "Vụ án B" } }],
    linksTo: [{ matter: { internalCode: "IN-003", firmCaseNo: "FC-9", title: "Vụ án C" } }],
    documents: [{ name: "Hợp đồng.pdf", category: "CONTRACT", createdAt: new Date("2025-01-11") }],
    intake: fullIntake,
    customValues: [{ a: 1 }],
    createdAt: new Date("2025-06-15T10:30:00"),
    updatedAt: new Date("2025-06-16T09:00:00")
  };

  // __COL_MAP__

  const readDataRow = async (buffer: any, rowNumber = 2) => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
    const sheet = wb.worksheets[0];
    const rawHeaders = sheet.getRow(1).values as any[];
    const values = sheet.getRow(rowNumber).values as any[];
    const map: Record<string, any> = {};
    const headers: string[] = [];
    rawHeaders.forEach((header, index) => {
      if (header === null || header === undefined) return;
      headers.push(String(header));
      map[String(header)] = values[index];
    });
    return { map, headers, values };
  };

  const cellValue = (data: { map: Record<string, any> }, key: string) => data.map[COL[key]];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.matter).findMany = vi.fn().mockResolvedValue([fullMatter]);
    vi.mocked(prisma.user).findMany = vi.fn().mockResolvedValue([{ id: "u9", name: "CoUser9" }]);
  });

  it("builds matter base, client and cause columns from row data", async () => {
    const result = await buildMattersExportWorkbook(
      { tab: "active", sortBy: "hearing", sortDir: "asc" },
      mockUser
    );

    expect(result.total).toBe(1);
    const data = await readDataRow(result.buffer);
    const at = (key: string) => cellValue(data, key);

    // buildMatterBase
    expect(at("internalCode")).toBe("IN-001");
    expect(at("firmCaseNo")).toBe("FC-2025-001");
    expect(at("title")).toBe("Vụ án A");
    expect(at("category")).toBe("Dân sự - Thương mại");
    expect(at("status")).toBe("Đang xử lý");
    expect(at("intakeDate")).toBe("2025-01-05");
    expect(at("firstAcceptedAt")).toBe("2025-01-10");
    expect(at("closedAt")).toBe("");
    expect(at("archivedAt")).toBe("");

    // buildClientSection
    expect(at("primaryClient")).toBe("Công ty ABC");
    expect(at("primaryClientType")).toBe("Công ty");
    expect(at("primaryClientIdNumber")).toBe("ORG-1");
    expect(at("primaryClientAddress")).toBe("123 Đường A");
    expect(at("primaryClientLegalRep")).toBe("Nguyễn Văn X");
    expect(at("primaryClientContacts")).toContain("Liên hệ chính / Chủ tịch / 0902 / main@abc.vn");
    expect(at("primaryClientContacts")).toContain("Liên hệ phụ / 0903");
    expect(at("otherClients")).toContain("Chính:Công ty ABC");
    expect(at("otherClients")).toContain("Công ty XYZ");
    expect(at("owner")).toBe("Luật sư A");
    expect(at("members")).toContain("Luật sư C（Chủ vụ）");
    expect(at("members")).toContain("Trợ lý B（Trợ lý）");

    // buildCauseSection
    expect(at("cause")).toBe("Tranh chấp hợp đồng");
    expect(at("causeFreeText")).toBe("Tự do");
    expect(at("claimAmount")).toBe(150000);
    expect(at("ourStanding")).toBe("Nguyên đơn");
    expect(at("counterclaimAsPlaintiff")).toBe("是");
    expect(at("counterclaimAsDefendant")).toBe("否");
    expect(at("barFiling")).toBe("Cần, liên quan tập thể");

    // buildPartiesAndSummary
    expect(at("parties")).toContain("Khách hàng：Công ty ABC（Nguyên đơn，Công ty，代码:0123456789，电话:0909，法定代表人:Nguyễn Văn X，地址:456 Đường B）");
    expect(at("parties")).toContain("Đối phương：Nguyễn Văn B（Bị đơn，Cá nhân，证件:123456789）");
    // litigation kind does not emit procedureSummary column
    expect(data.headers).toContain(COL.parties);
    expect(data.headers).not.toContain(COL.procedureSummary);
  });

  it("builds related section and timestamp columns", async () => {
    const result = await buildMattersExportWorkbook(
      { tab: "active", sortBy: "hearing", sortDir: "asc" },
      mockUser
    );
    const data = await readDataRow(result.buffer);
    const at = (key: string) => cellValue(data, key);

    // buildRelatedSection
    expect(at("relatedEntities")).toContain("Đối tác X / Bên liên quan / Ghi chú");
    expect(at("relatedEntities")).toContain("Không notes / Khác");
    expect(at("relatedEntities")).not.toContain("Không notes / Khác / ");
    expect(at("relatedMatters")).toContain("IN-002 Vụ án B");
    expect(at("relatedMatters")).toContain("FC-9 Vụ án C");
    expect(at("documents")).toContain("Hợp đồng.pdf（CONTRACT，2025-01-11）");
    expect(at("customValues")).toBe('[{"a":1}]');

    // buildTimestampSection
    expect(at("createdAt")).toBe("2025-06-15 10:30");
    expect(at("updatedAt")).toBe("2025-06-16 09:00");
  });

  it("builds intake source section from linked intake", async () => {
    const result = await buildMattersExportWorkbook(
      { tab: "active", sortBy: "hearing", sortDir: "asc" },
      mockUser
    );
    const data = await readDataRow(result.buffer);
    const at = (key: string) => cellValue(data, key);

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["u9"] } },
      select: { id: true, name: true }
    });

    expect(at("intakeTitle")).toBe("Intake nguồn");
    expect(at("intakeStatus")).toBe("Đã chuyển đổi");
    expect(at("sourceReceivedAt")).toBe("2025-01-05");
    expect(at("sourceDescription")).toBe("Mô tả nguồn");
    expect(at("sourceFirstProcedureType")).toBe("Tòa sơ thẩm");
    expect(at("sourceFirstAgency")).toBe("TAND Q1");
    expect(at("sourceJurisdiction")).toBe("TP.HCM");
    expect(at("sourceOurStanding")).toBe("Nguyên đơn");
    expect(at("sourceClaimAmount")).toBe(120000);
    expect(at("sourceClaimDescription")).toBe("Bồi thường");
    expect(at("sourceBarFiling")).toBe("Cần, liên quan tập thể");
    expect(at("sourceCounterclaim")).toBe("是");
    // litigation source columns only (no business/counsel source columns)
    expect(at("sourceFeeType")).toBe("Cố định");
    expect(at("sourceFeeAmount")).toBe(8000);
    expect(at("sourceFeeSchedule")).toBe("2 đợt");
    expect(at("sourceFeeNote")).toBe("Ghi chú phí");
    expect(at("sourceCoUsers")).toBe("CoUser9");
    expect(at("sourceDocuments")).toContain("Intake.pdf（OTHER，2025-01-06）");
    expect(data.headers).not.toContain(COL.sourceBusinessType);
    expect(data.headers).not.toContain(COL.sourceServiceScope);
    expect(data.headers).not.toContain(COL.sourceDeliverables);
    expect(data.headers).not.toContain(COL.sourceCounselType);
    expect(data.headers).not.toContain(COL.sourceServiceStart);
    expect(data.headers).not.toContain(COL.sourceServiceEnd);
  });

  it("builds all procedure columns for each procedure slot", async () => {
    const result = await buildMattersExportWorkbook(
      { tab: "active", sortBy: "hearing", sortDir: "asc" },
      mockUser
    );
    const data = await readDataRow(result.buffer);
    const at = (key: string) => cellValue(data, key);

    // procedure slot 1 (complete)
    expect(at("procedure1Type")).toBe("Tòa sơ thẩm");
    expect(at("procedure1Label")).toBe("Sơ thẩm");
    expect(at("procedure1Engagement")).toBe("Tham gia");
    expect(at("procedure1Status")).toBe("Đang xử lý");
    expect(at("procedure1CaseNumber")).toBe("123/2025/TLST");
    expect(at("procedure1Jurisdiction")).toBe("TP.HCM");
    expect(at("procedure1HandlingAgency")).toBe("TAND Q1");
    expect(at("procedure1Panel")).toBe("HĐXX 1");
    expect(at("procedure1Handler")).toBe("Thẩm phán A");
    expect(at("procedure1OurStanding")).toBe("Nguyên đơn");
    expect(at("procedure1LeadLawyer")).toBe("Luật sư A");
    expect(at("procedure1ExternalLead")).toBe("否");
    expect(at("procedure1AcceptedAt")).toBe("2025-02-01");
    expect(at("procedure1ConcludedAt")).toBe("");
    expect(at("procedure1Outcome")).toBe("");
    expect(at("procedure1OutcomeNote")).toBe("");
    expect(at("procedure1Parties")).toContain("Nguyên đơn：Công ty ABC");
    expect(at("procedure1Parties")).toContain("Bị đơn：Nguyễn Văn B");

    // procedure slot 2 (null branches + outcome branch)
    expect(at("procedure2Type")).toBe("Trọng tài thương mại");
    expect(at("procedure2Label")).toBe("");
    expect(at("procedure2Engagement")).toBe("Chỉ đăng ký");
    expect(at("procedure2Status")).toBe("Đã kết thúc");
    expect(at("procedure2CaseNumber")).toBe("");
    expect(at("procedure2ExternalLead")).toBe("是");
    expect(at("procedure2LeadLawyer")).toBe("");
    expect(at("procedure2AcceptedAt")).toBe("");
    expect(at("procedure2ConcludedAt")).toBe("2025-04-01");
    expect(at("procedure2Outcome")).toBe("Thắng kiện");
    expect(at("procedure2OutcomeNote")).toBe("Thắng toàn bộ");
    expect(at("procedure2Parties")).toBe("");
  });

  it("returns empty builder output for sparse matter (counsel kind, no intake)", async () => {
    vi.mocked(prisma.matter).findMany.mockResolvedValue([
      {
        id: "m2",
        internalCode: "IN-002",
        firmCaseNo: null,
        title: "Tư vấn rỗng",
        category: "LEGAL_COUNSEL",
        status: "PENDING_ACCEPTANCE",
        intakeDate: null,
        firstAcceptedAt: null,
        closedAt: null,
        archivedAt: null,
        primaryClient: null,
        clientLinks: [],
        owner: { id: "u1", name: "Luật sư A" },
        members: [],
        cause: null,
        causeFreeText: "",
        claimAmount: null,
        ourStanding: null,
        counterclaimAsPlaintiff: false,
        counterclaimAsDefendant: false,
        barFiling: "NONE",
        businessType: "",
        serviceScope: "",
        deliverables: "",
        counselType: "",
        serviceStart: null,
        serviceEnd: null,
        parties: [],
        procedures: [],
        relatedEntities: [],
        linksFrom: [],
        linksTo: [],
        documents: [],
        intake: undefined,
        customValues: {},
        createdAt: new Date("2025-05-01T08:00:00"),
        updatedAt: new Date("2025-05-01T08:00:00")
      }
    ]);

    const result = await buildMattersExportWorkbook(
      { tab: "active", sortBy: "hearing", sortDir: "asc" },
      mockUser
    );

    expect(result.total).toBe(1);
    const data = await readDataRow(result.buffer);
    const at = (key: string) => cellValue(data, key);

    expect(at("internalCode")).toBe("IN-002");
    expect(at("firmCaseNo")).toBe("");
    expect(at("category")).toBe("Tư vấn");
    expect(at("status")).toBe("Chờ khởi động");
    expect(at("intakeDate")).toBe("");
    // buildClientSection fallbacks
    expect(at("primaryClient")).toBe("");
    expect(at("primaryClientType")).toBe("");
    expect(at("primaryClientIdNumber")).toBe("");
    expect(at("primaryClientAddress")).toBe("");
    expect(at("primaryClientLegalRep")).toBe("");
    expect(at("primaryClientContacts")).toBe("");
    expect(at("otherClients")).toBe("");
    expect(at("members")).toBe("");
    // counsel kind does not emit litigation-only columns
    expect(data.headers).not.toContain(COL.cause);
    expect(data.headers).not.toContain(COL.claimAmount);
    expect(data.headers).not.toContain(COL.barFiling);
    // buildPartiesAndSummary / buildRelatedSection empty
    expect(at("parties")).toBe("");
    expect(at("procedureSummary")).toBe("");
    expect(at("relatedEntities")).toBe("");
    expect(at("relatedMatters")).toBe("");
    expect(at("documents")).toBe("");
    expect(at("customValues")).toBe("");
    // EMPTY_INTAKE_SOURCE fallback (no linked intake)
    expect(at("intakeTitle")).toBe("");
    expect(at("intakeStatus")).toBe("");
    expect(at("sourceCoUsers")).toBe("");
    expect(at("sourceDocuments")).toBe("");
    expect(at("sourceFeeAmount")).toBe("");
    // counsel kind emits counsel source columns, not litigation ones
    expect(data.headers).toContain(COL.sourceCounselType);
    expect(data.headers).not.toContain(COL.sourceClaimAmount);
    // counsel kind → no procedure columns generated (maxProcedures = 0)
    expect(data.headers).not.toContain(COL.procedure1Type);
    // buildTimestampSection
    expect(at("createdAt")).toBe("2025-05-01 08:00");
    expect(at("updatedAt")).toBe("2025-05-01 08:00");
    // loadUserNameMap: no co-user ids → user lookup skipped entirely
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it("builds empty values for sparse litigation matter (null branches)", async () => {
    vi.mocked(prisma.matter).findMany.mockResolvedValue([
      {
        id: "m3",
        internalCode: "IN-003",
        firmCaseNo: null,
        title: "Vụ án rỗng",
        category: "CIVIL_COMMERCIAL",
        status: "PENDING_ACCEPTANCE",
        intakeDate: null,
        firstAcceptedAt: null,
        closedAt: null,
        archivedAt: null,
        primaryClient: null,
        clientLinks: [],
        owner: { id: "u1", name: "Luật sư A" },
        members: [],
        cause: null,
        causeFreeText: "",
        claimAmount: null,
        ourStanding: null,
        counterclaimAsPlaintiff: false,
        counterclaimAsDefendant: true,
        barFiling: "NONE",
        businessType: "",
        serviceScope: "",
        deliverables: "",
        counselType: "",
        serviceStart: null,
        serviceEnd: null,
        parties: [],
        procedures: [],
        relatedEntities: [],
        linksFrom: [],
        linksTo: [],
        documents: [],
        intake: undefined,
        customValues: {},
        createdAt: new Date("2025-07-01T07:00:00"),
        updatedAt: new Date("2025-07-01T07:00:00")
      }
    ]);

    const result = await buildMattersExportWorkbook(
      { tab: "active", sortBy: "hearing", sortDir: "asc" },
      mockUser
    );

    expect(result.total).toBe(1);
    const data = await readDataRow(result.buffer);
    const at = (key: string) => cellValue(data, key);

    // buildCauseSection null branches (litigation columns exist)
    expect(at("cause")).toBe("");
    expect(at("causeFreeText")).toBe("");
    expect(at("claimAmount")).toBe("");
    expect(at("ourStanding")).toBe("");
    expect(at("counterclaimAsPlaintiff")).toBe("否");
    expect(at("counterclaimAsDefendant")).toBe("是");
    expect(at("barFiling")).toBe("Không");
    // procedure columns exist (maxProcedures >= 1) but are empty
    expect(data.headers).toContain(COL.procedure1Type);
    expect(at("procedure1Type")).toBeUndefined();
    expect(at("procedure1CaseNumber")).toBeUndefined();
    // EMPTY_INTAKE_SOURCE fallback
    expect(at("intakeTitle")).toBe("");
    expect(at("sourceCoUsers")).toBe("");
    expect(at("sourceFeeAmount")).toBe("");
    // empty customValues object
    expect(at("customValues")).toBe("");
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });
});
