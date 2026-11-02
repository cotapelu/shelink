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
 * Kiểu dùng chung cho /inbox
 */
import type { Prisma, SmsType, ProcedureType } from "@prisma/client";

export type SmsRow = Prisma.SmsMessageGetPayload<{
  include: {
    receivedBy: { select: { id: true; name: true } };
    matchedMatter: {
      select: {
        id: true;
        internalCode: true;
        title: true;
        procedures: {
          select: { id: true; type: true; customLabel: true; caseNumber: true };
        };
      };
    };
  };
}>;

export type MatterOption = {
  id: string;
  internalCode: string;
  title: string;
  procedures: {
    id: string;
    type: ProcedureType;
    customLabel: string | null;
    caseNumber: string | null;
  }[];
};

export const SMS_TYPE_CN: Record<SmsType, string> = {
  HEARING_NOTICE: "Thông báo mở phiên",
  SERVICE_NOTICE: "Thông báo tống đạt",
  FEE_NOTICE: "Thông báo nộp phí",
  MEDIATION: "Thông báo hòa giải",
  ENFORCEMENT: "Thông báo thi hành",
  FILING_NOTICE: "Thông báo tiếp nhận",
  JUDGMENT_NOTICE: "Thông báo tuyên án",
  EVIDENCE_SUBMIT: "Nộp tài liệu",
  OTHER: "Thông báo khác"
};

export const SMS_TYPE_ACCENT: Record<SmsType, string> = {
  HEARING_NOTICE: "#dc2626",
  SERVICE_NOTICE: "#0ea5e9",
  FEE_NOTICE: "#d97706",
  MEDIATION: "#0891b2",
  ENFORCEMENT: "#7c2d12",
  FILING_NOTICE: "#16a34a",
  JUDGMENT_NOTICE: "#7c3aed",
  EVIDENCE_SUBMIT: "#0d9488",
  OTHER: "#737373"
};

// Cấu trúc kết quả phân tích (khớp ParsedSms của lib/sms-parser.ts)
export type ParsedJson = {
  smsType: SmsType;
  caseNumbers: string[];
  court: string | null;
  dates: string[];
  hearingDate: string | null;
  filingDate: string | null;
  judgmentDate: string | null;
  appealDeadline: string | null;
  courtRoom: string | null;
  judge: string | null;
  clerk: string | null;
  phones: string[];
  amounts: string[];
  urls: string[];
  platforms: string[];
  summary: string;
  // v0.9.1 trường tăng cường AI
  aiEnriched?: boolean;
  action?: string | null;
  urgency?: "HIGH" | "MEDIUM" | "LOW" | null;
};
