/*
 * Copyright 2026 叶森 (Sen Ye) - Original work
 * Copyright 2026 COTAPELU - Modifications and additions
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This file is part of a derivative work based on the original MIT-licensed project.
 * Original author: 叶森 (Sen Ye) - Copyright 2026
 */
/**
 * Kiểu dùng chung cho trang /seals (v0.8)
 */
import type { Prisma } from "@prisma/client";

export type SealRequestRow = Prisma.SealRequestGetPayload<{
  include: {
    matter: { select: { id: true; internalCode: true; title: true } };
    requestedBy: { select: { id: true; name: true } };
    approvedBy: { select: { id: true; name: true } };
    stampedByUser: { select: { id: true; name: true } };
    draftDoc: { select: { id: true; name: true; size: true } };
    stampedDoc: { select: { id: true; name: true; size: true } };
  };
}>;

export type SealTypeConfigRow = Prisma.SealTypeConfigGetPayload<{}>;

export type MatterOption = {
  id: string;
  internalCode: string;
  title: string;
};

export const SEAL_TYPE_CN: Record<string, string> = {
  OFFICIAL_SEAL: "Dấu văn phòng",
  CONTRACT_SEAL: "Dấu hợp đồng",
  FINANCE_SEAL: "Dấu tài chính",
  LEGAL_REP_SEAL: "Dấu người đại diện theo pháp luật",
  CONTRACT_REVIEW_SEAL: "Dấu duyệt hợp đồng"
};

export const SEAL_STATUS_CN: Record<string, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Chờ đóng dấu",
  STAMPED: "Đã hoàn tất",
  REJECTED: "Đã từ chối",
  CANCELLED: "Đã thu hồi"
};

export const SEAL_STATUS_COLOR: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  PENDING: {
    bg: "rgb(252 211 77 / 0.12)",
    text: "rgb(180 130 0)",
    border: "rgb(252 211 77 / 0.5)"
  },
  APPROVED: {
    bg: "rgb(96 165 250 / 0.12)",
    text: "rgb(37 99 235)",
    border: "rgb(96 165 250 / 0.5)"
  },
  STAMPED: {
    bg: "rgb(74 222 128 / 0.12)",
    text: "rgb(22 163 74)",
    border: "rgb(74 222 128 / 0.5)"
  },
  REJECTED: {
    bg: "rgb(248 113 113 / 0.12)",
    text: "rgb(220 38 38)",
    border: "rgb(248 113 113 / 0.5)"
  },
  CANCELLED: {
    bg: "rgb(156 163 175 / 0.12)",
    text: "rgb(107 114 128)",
    border: "rgb(156 163 175 / 0.5)"
  }
};
