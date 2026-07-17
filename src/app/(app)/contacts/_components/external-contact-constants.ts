import type { ExternalContactCategory } from "@prisma/client";

export const EXT_CATEGORY_LABEL: Record<ExternalContactCategory, string> = {
  COURT: "法院",
  PROSECUTOR: "检察院",
  POLICE: "公安",
  NOTARY: "公证处",
  ARBITRATION: "仲裁",
  OTHER_FIRM: "他所律师",
  EXPERT: "鉴定专家",
  OTHER: "其他"
};
