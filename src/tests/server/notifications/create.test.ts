import { createNotification } from "@/server/notifications/create";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    notification: {
      create: vi.fn(),
    },
  },
}));

describe("createNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create notification with default priority NORMAL", async () => {
    const mockResult = { id: "n1", userId: "u1", type: "TEST", priority: "NORMAL", title: "Test" };
    (prisma.notification.create as any).mockResolvedValue(mockResult);

    const result = await createNotification({
      userId: "u1",
      type: "TEST",
      title: "Test",
    });

    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: {
        userId: "u1",
        type: "TEST",
        priority: "NORMAL",
        title: "Test",
        content: undefined,
        href: undefined,
        refType: undefined,
        refId: undefined,
      },
    });
    expect(result).toBe(mockResult);
  });

  it("should allow custom priority and all fields", async () => {
    (prisma.notification.create as any).mockResolvedValue({ id: "n2" });

    await createNotification({
      userId: "u2",
      type: "ARCHIVE_APPROVED",
      priority: "HIGH",
      title: "Approved",
      content: "Your archive was approved",
      href: "/archive",
      refType: "ArchiveRecord",
      refId: "ar1",
    });

    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: {
        userId: "u2",
        type: "ARCHIVE_APPROVED",
        priority: "HIGH",
        title: "Approved",
        content: "Your archive was approved",
        href: "/archive",
        refType: "ArchiveRecord",
        refId: "ar1",
      },
    });
  });
});
