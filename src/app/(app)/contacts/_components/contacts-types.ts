import type { ExternalContactCategory, ExternalContactStatus } from "@prisma/client";

export type ColleagueItem = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  avatar: string | null;
};

export type ExternalContactItem = {
  id: string;
  name: string;
  category: ExternalContactCategory;
  organization: string | null;
  title: string | null;
  phone: string | null;
  email: string | null;
  wechat: string | null;
  address: string | null;
  notes: string | null;
  tags: string[];
  status: ExternalContactStatus;
  createdBy: { id: string; name: string };
  reviewedBy: { id: string; name: string } | null;
  reviewedAt: Date | null;
  reviewNote: string | null;
  createdAt: Date;
};
