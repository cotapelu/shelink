import type { ExternalContactCategory } from "@prisma/client";

export const EXT_CATEGORY_LABEL: Record<ExternalContactCategory, string> = {
  COURT: "Toà án",
  PROSECUTOR: "Viện kiểm sát",
  POLICE: "Công an",
  NOTARY: "Phòng công chứng",
  ARBITRATION: "Trọng tài",
  OTHER_FIRM: "Luật sư VP khác",
  EXPERT: "Chuyên gia giám định",
  OTHER: "Khác"
};
