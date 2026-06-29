/*
 * Copyright 2026 叶森 (Sen Ye) - Original work (MIT Licensed)
 * Copyright 2026 COTAPELU - Modifications and additions (Apache 2.0 Licensed)
 *
 * This file contains modifications to the original MIT-licensed work.
 *
 * The original work was licensed under MIT License (see below):
 * Copyright (c) 2026 叶森 (Sen Ye)
 *
 * Modifications in this file are licensed under the Apache License, Version 2.0.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * ORIGINAL MIT LICENSE TEXT:
 * ==========================
 * MIT License
 *
 * Copyright (c) 2026 叶森 (Sen Ye)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
/**
 * /inbox 共享类型
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
  HEARING_NOTICE: "开庭通知",
  SERVICE_NOTICE: "送达通知",
  FEE_NOTICE: "缴费通知",
  MEDIATION: "调解通知",
  ENFORCEMENT: "执行通知",
  FILING_NOTICE: "立案通知",
  JUDGMENT_NOTICE: "判决通知",
  EVIDENCE_SUBMIT: "提交材料",
  OTHER: "其他通知"
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

// 解析结果结构（与 lib/sms-parser.ts ParsedSms 对齐）
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
  // v0.9.1 AI 增强字段
  aiEnriched?: boolean;
  action?: string | null;
  urgency?: "HIGH" | "MEDIUM" | "LOW" | null;
};
