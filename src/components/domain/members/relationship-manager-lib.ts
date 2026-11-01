/*
 * Logic thuần cho RelationshipManager (genealogy) — tách khỏi component để test
 * (R/T-refactor AUTO-56). Không import React/API.
 */

import type { Person, RelationshipType } from "@/types";

export type RelDirection = "parent" | "child" | "spouse" | "child_in_law";

export interface EnrichedRelationship {
  id: string;
  type: RelationshipType;
  direction: RelDirection;
  targetPerson: Person;
  note: string | null;
}

export interface RelationshipApiResponse {
  id: string;
  type: RelationshipType;
  person_a: string;
  person_b: string;
  person_a_data?: Person;
  person_b_data?: Person;
  note: string | null;
}

/** Hướng quan hệ giữa người hiện tại và người kia. */
export function deriveRelDirection(
  type: RelationshipType,
  personA: string,
  personId: string
): RelDirection {
  if (type === "marriage") return "spouse";
  if (type === "biological_child" || type === "adopted_child") {
    return personA === personId ? "child" : "parent";
  }
  return "spouse";
}

/** Map 1 dòng API → dòng đã enriched. */
export function mapRelationshipRow(r: RelationshipApiResponse, personId: string): EnrichedRelationship {
  const isSelf = r.person_a === personId;
  return {
    id: r.id,
    type: r.type,
    direction: deriveRelDirection(r.type, r.person_a, personId),
    targetPerson: (isSelf ? r.person_b_data : r.person_a_data) as Person,
    note: r.note
  };
}

/** Map danh sách API; bỏ dòng thiếu targetPerson. */
export function mapRelationshipRows(rows: RelationshipApiResponse[], personId: string): EnrichedRelationship[] {
  return rows.map((r) => mapRelationshipRow(r, personId)).filter((r) => !!r.targetPerson);
}

/** ID các con trực tiếp. */
export function collectChildIds(rows: EnrichedRelationship[]): string[] {
  return rows.filter((r) => r.direction === "child").map((r) => r.targetPerson.id);
}

/** Nhãn mô tả vợ/chồng của con (dâu/rể). */
export function formatChildInLawNote(spouseGender: string | undefined, childName: string, note: string | null): string {
  let label = `Vợ/chồng của ${childName}`;
  if (spouseGender === "female") label = `Con dâu (vợ của ${childName})`;
  if (spouseGender === "male") label = `Con rể (chồng của ${childName})`;
  return note ? `${label} - ${note}` : label;
}

/** 1 hôn nhân của con → dòng child_in_law (null nếu thiếu dữ liệu bên). */
export function toChildInLawRow(m: RelationshipApiResponse, childrenIds: string[]): EnrichedRelationship | null {
  const isAChild = childrenIds.includes(m.person_a);
  const childPerson = isAChild ? m.person_a_data : m.person_b_data;
  const spousePerson = isAChild ? m.person_b_data : m.person_a_data;
  if (!spousePerson || !childPerson) return null;
  return {
    id: `${m.id}_inlaw`,
    type: "marriage",
    direction: "child_in_law",
    targetPerson: spousePerson,
    note: formatChildInLawNote(spousePerson.gender, childPerson.full_name, m.note)
  };
}

/** Gộp các dòng child_in_law từ danh sách hôn nhân của con. */
export function buildChildInLawRows(marriages: RelationshipApiResponse[], childrenIds: string[]): EnrichedRelationship[] {
  return marriages.map((m) => toChildInLawRow(m, childrenIds)).filter((r): r is EnrichedRelationship => r !== null);
}

/** Payload tạo Person (dùng cho bulk-add con và quick-add vợ/chồng). */
export function buildPersonPayload(input: {
  name: string;
  gender: "male" | "female" | "other";
  birthYear: string;
}): { full_name: string; gender: string; birth_year?: number } {
  const payload: { full_name: string; gender: string; birth_year?: number } = {
    full_name: input.name.trim(),
    gender: input.gender
  };
  const year = parseInt(input.birthYear, 10);
  if (input.birthYear.trim() !== "" && !isNaN(year)) payload.birth_year = year;
  return payload;
}

/** Giới tính mặc định của vợ/chồng mới (ngược với người hiện tại; mặc định nữ). */
export function inferSpouseGender(personGender: string): "male" | "female" {
  if (personGender === "male") return "female";
  if (personGender === "female") return "male";
  return "female";
}

/** Chỉ giữ dòng bulk có tên. */
export function validBulkChildren<T extends { name: string }>(rows: T[]): T[] {
  return rows.filter((c) => c.name.trim() !== "");
}

/** person_a/person_b theo hướng khai báo (parent = đảo chiều). */
export function resolveRelEndpoints(
  direction: "parent" | "child" | "spouse",
  personId: string,
  targetId: string
): { personA: string; personB: string } {
  if (direction === "parent") return { personA: targetId, personB: personId };
  return { personA: personId, personB: targetId };
}

/** RelationshipType theo lựa chọn trên form. */
export function resolveRelType(
  direction: "parent" | "child" | "spouse",
  selectedType: RelationshipType
): RelationshipType {
  if (direction === "spouse") return "marriage";
  if (selectedType === "adopted_child") return "adopted_child";
  return "biological_child";
}
