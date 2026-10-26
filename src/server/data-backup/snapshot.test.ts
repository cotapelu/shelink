import { describe, it, expect } from "vitest";
import {
  BACKUP_RECORD_CAP,
  BACKUP_SCOPE_MODELS,
  BACKUP_SPECIAL_SELECTS,
  buildBackupFilename,
  buildBackupMeta,
  getBackupModelNames,
  isBackupScope
} from "./snapshot";

describe("backup/snapshot", () => {
  it("maps genealogy scope to its four models", () => {
    expect(getBackupModelNames("genealogy")).toEqual(["person", "relationship", "event", "lineage"]);
  });

  it("scope 'all' is a de-duplicated superset of business + genealogy + erp", () => {
    const all = getBackupModelNames("all");
    expect(new Set(all).size).toBe(all.length); // no duplicates
    expect(all).toEqual(expect.arrayContaining(["user", "matter", "feeEntry", "quote", "workTask", "person"]));
    for (const m of BACKUP_SCOPE_MODELS.genealogy) expect(all).toContain(m);
    for (const m of BACKUP_SCOPE_MODELS.erp) expect(all).toContain(m);
  });

  it("special selects strip secrets and storage/crypto paths", () => {
    expect(BACKUP_SPECIAL_SELECTS.user.passwordHash).toBeUndefined();
    expect(BACKUP_SPECIAL_SELECTS.user.id).toBe(true);
    expect(BACKUP_SPECIAL_SELECTS.document.path).toBeUndefined();
    expect(BACKUP_SPECIAL_SELECTS.document.iv).toBeUndefined();
    expect(BACKUP_SPECIAL_SELECTS.document.authTag).toBeUndefined();
    expect(BACKUP_SPECIAL_SELECTS.document.encrypted).toBe(true);
  });

  it("builds a stable UTF-8 friendly filename", () => {
    expect(buildBackupFilename("all", new Date("2026-10-26T05:00:00Z"))).toBe(
      "shelink-backup-all-2026-10-26.json"
    );
  });

  it("aggregates meta and flags models that hit the record cap", () => {
    const now = new Date("2026-10-26T05:00:00Z");
    const meta = buildBackupMeta("erp", { workTask: 3, project: BACKUP_RECORD_CAP, team: 0 }, now);
    expect(meta.modelCount).toBe(3);
    expect(meta.recordCount).toBe(3 + BACKUP_RECORD_CAP);
    expect(meta.truncatedModels).toEqual(["project"]);
    expect(meta.scopeLabel).toBe("Công việc nội bộ (ERP)");
    expect(meta.generatedAt).toBe(now.toISOString());
  });

  it("isBackupScope guards invalid input", () => {
    expect(isBackupScope("all")).toBe(true);
    expect(isBackupScope("erp")).toBe(true);
    expect(isBackupScope("nope")).toBe(false);
    expect(isBackupScope(123)).toBe(false);
  });
});
