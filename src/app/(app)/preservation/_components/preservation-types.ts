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
import type { Prisma, PreservationType, PropertyType, GuaranteeType, PreservationStatus } from "@prisma/client";

export type PreservationCaseRow = Prisma.PreservationCaseGetPayload<{
  include: {
    matter: { select: { id: true; internalCode: true; title: true } };
    owner: { select: { id: true; name: true } };
    targets: {
      include: {
        properties: {
          include: {
            renewals: { orderBy: { renewedAt: "desc" }; take: 3 }
          }
        }
      }
    }
  };
}>;

export type MatterOption = {
  id: string;
  internalCode: string;
  title: string;
};

export type UserOption = { id: string; name: string };

/** @deprecated bí danh tương thích model cũ */
export type PreservationRow = Prisma.PreservationGetPayload<{
  include: {
    matter: { select: { id: true; internalCode: true; title: true } };
    owner: { select: { id: true; name: true } };
    renewals: true;
  };
}>;

export const PRES_TYPE_CN: Record<PreservationType, string> = {
  PRE_LITIGATION: "Bảo toàn trước kiện",
  LITIGATION: "Bảo toàn trong kiện",
  ENFORCEMENT: "Bảo toàn thi hành án"
};

export const PROPERTY_TYPE_CN: Record<PropertyType, string> = {
  BANK_DEPOSIT: "Tiền gửi ngân hàng",
  REAL_ESTATE: "Bất động sản",
  VEHICLE: "Phương tiện",
  EQUITY: "Cổ phần",
  IP: "Sở hữu trí tuệ",
  OTHER: "Tài sản khác"
};

export const GUARANTEE_TYPE_CN: Record<GuaranteeType, string> = {
  CASH_DEPOSIT: "Tiền ký quỹ",
  GUARANTEE_LETTER: "Bảo lãnh",
  PROPERTY: "Bảo đảm bằng tài sản",
  NONE: "Không cần bảo đảm"
};

export const PRES_STATUS_CN: Record<PreservationStatus, string> = {
  ACTIVE: "Đang hiệu lực",
  RENEWED: "Đã gia hạn",
  EXPIRED: "Đã hết hạn",
  LIFTED: "Đã gỡ bỏ"
};

export const PRES_STATUS_COLOR: Record<PreservationStatus, { bg: string; text: string; border: string }> = {
  ACTIVE: { bg: "rgb(74 222 128 / 0.12)", text: "rgb(22 163 74)", border: "rgb(74 222 128 / 0.5)" },
  RENEWED: { bg: "rgb(96 165 250 / 0.12)", text: "rgb(37 99 235)", border: "rgb(96 165 250 / 0.5)" },
  EXPIRED: { bg: "rgb(248 113 113 / 0.12)", text: "rgb(220 38 38)", border: "rgb(248 113 113 / 0.5)" },
  LIFTED: { bg: "rgb(156 163 175 / 0.12)", text: "rgb(107 114 128)", border: "rgb(156 163 175 / 0.5)" }
};

// Phân cấp đếm ngược đến hạn
export function classifyExpiry(daysLeft: number): { label: string; tone: "danger" | "warn" | "ok" | "muted" } {
  if (daysLeft < 0) return { label: `Đã hết hạn ${-daysLeft} ngày`, tone: "danger" };
  if (daysLeft === 0) return { label: "Đến hạn hôm nay", tone: "danger" };
  if (daysLeft <= 7) return { label: `Còn ${daysLeft} ngày nữa đến hạn`, tone: "danger" };
  if (daysLeft <= 30) return { label: `Còn ${daysLeft} ngày nữa đến hạn`, tone: "warn" };
  if (daysLeft <= 60) return { label: `Còn ${daysLeft} ngày nữa đến hạn`, tone: "muted" };
  return { label: `Còn ${daysLeft} ngày nữa đến hạn`, tone: "ok" };
}
