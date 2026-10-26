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
 * Sao lưu dữ liệu tự phục vụ (TD-G6) — thuần, không DB/React.
 * Xác định phạm vi sao lưu, model theo từng phạm vi và bộ dựng metadata/tên tệp.
 * Việc đọc DB thật nằm ở ./collect; file này chỉ là cấu hình + hàm thuần (dễ test).
 */

export const BACKUP_SCOPES = ["genealogy", "erp", "all"] as const;
export type BackupScope = (typeof BACKUP_SCOPES)[number];

export const BACKUP_SCOPE_LABELS: Record<BackupScope, string> = {
  genealogy: "Gia phả",
  erp: "Công việc nội bộ (ERP)",
  all: "Toàn bộ hệ thống"
};

/** Giới hạn số bản ghi mỗi model để tránh đầy bộ nhớ (cờ truncated trong meta nếu chạm trần). */
export const BACKUP_RECORD_CAP = 20_000;

/**
 * Select an toàn cho model nhạy cảm — KHÔNG xuất secret/mật mã trong bản sao lưu:
 * - user: không đọc passwordHash (secret — AGENTS §8).
 * - document: không đọc path/iv/authTag (vị trí lưu trữ + mật mã AES).
 */
export const BACKUP_SPECIAL_SELECTS: Record<string, Record<string, boolean>> = {
  user: {
    id: true, name: true, email: true, role: true, phone: true,
    active: true, lastLoginAt: true, createdAt: true, updatedAt: true
  },
  document: {
    id: true, name: true, category: true, version: true, isLatest: true, familyId: true,
    mimeType: true, size: true, sha256: true, encrypted: true, status: true,
    matterId: true, intakeId: true, procedureId: true, folderId: true, templateId: true,
    createdAt: true, updatedAt: true
  }
};

/** Lõi nghiệp vụ khái quát cho công ty nhỏ (dự án, thương mại, tài chính, vận hành). */
const BUSINESS_MODELS = [
  "user", "client", "contact", "causeOfAction", "intake",
  "matter", "matterMember", "matterClient", "matterProcedure", "matterStage",
  "legalTask", "hearing", "deadline", "procedureMemo", "party", "procedureParty",
  "relatedEntity", "matterLink", "note", "document", "documentFolder",
  "billing", "feeEntry", "commissionPlan", "quote", "quoteItem",
  "contract", "contractEvent", "cashAccount", "timesheetEntry", "expenseClaim",
  "leaveRequest", "systemSetting", "announcement", "externalContact"
] as const;

const GENEALOGY_MODELS = ["person", "relationship", "event", "lineage"] as const;

const ERP_MODELS = [
  "workTask", "subTask", "project", "projectMember", "projectMilestone",
  "workflow", "workflowStep", "workflowTransition", "workflowAudit",
  "team", "teamMember", "comment"
] as const;

function dedupe(items: readonly string[]): string[] {
  return [...new Set(items)];
}

export const BACKUP_SCOPE_MODELS: Record<BackupScope, readonly string[]> = {
  genealogy: GENEALOGY_MODELS,
  erp: ERP_MODELS,
  all: dedupe([...BUSINESS_MODELS, ...GENEALOGY_MODELS, ...ERP_MODELS])
};

export function isBackupScope(value: unknown): value is BackupScope {
  return typeof value === "string" && (BACKUP_SCOPES as readonly string[]).includes(value);
}

export function getBackupModelNames(scope: BackupScope): string[] {
  return [...BACKUP_SCOPE_MODELS[scope]];
}

export function buildBackupFilename(scope: BackupScope, now: Date): string {
  return `shelink-backup-${scope}-${now.toISOString().slice(0, 10)}.json`;
}

export type BackupCounts = Record<string, number>;

export type BackupMeta = {
  app: string;
  scope: BackupScope;
  scopeLabel: string;
  modelCount: number;
  recordCount: number;
  generatedAt: string;
  truncatedModels: string[];
};

/** Meta mô tả bản sao lưu phục vụ người dùng + quan sát (model/bản ghi, model bị cắt). */
export function buildBackupMeta(scope: BackupScope, counts: BackupCounts, now: Date): BackupMeta {
  const truncatedModels = Object.keys(counts).filter((k) => counts[k] >= BACKUP_RECORD_CAP);
  return {
    app: "shelink",
    scope,
    scopeLabel: BACKUP_SCOPE_LABELS[scope],
    modelCount: Object.keys(counts).length,
    recordCount: Object.values(counts).reduce((s, n) => s + n, 0),
    generatedAt: now.toISOString(),
    truncatedModels
  };
}
