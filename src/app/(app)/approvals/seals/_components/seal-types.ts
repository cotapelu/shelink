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
 * /seals 页面共享类型（v0.8）
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
  OFFICIAL_SEAL: "律所公章",
  CONTRACT_SEAL: "合同专用章",
  FINANCE_SEAL: "财务专用章",
  LEGAL_REP_SEAL: "法定代表人章",
  CONTRACT_REVIEW_SEAL: "合同审核章"
};

export const SEAL_STATUS_CN: Record<string, string> = {
  PENDING: "待审批",
  APPROVED: "待盖章",
  STAMPED: "已完成",
  REJECTED: "已驳回",
  CANCELLED: "已撤销"
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
