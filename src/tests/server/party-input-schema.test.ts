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
import { describe, it, expect } from "vitest";
import { partyInputSchema } from "@/server/matters/schemas";

const baseInputs = {
  role: "OPPOSING_PARTY" as const,
  ordinal: 1,
  name: "张三",
  phone: "",
  address: "",
  legalRep: "",
  contactName: "",
  enterpriseName: "",
  notes: ""
};

describe("partyInputSchema (v0.27)", () => {
  it("自然人必须填 idNumber", () => {
    const r = partyInputSchema.safeParse({
      ...baseInputs,
      partyType: "NATURAL_PERSON",
      idNumber: "",
      enterpriseSocialCode: ""
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const issues = r.error.issues.map((i) => i.path.join("."));
      expect(issues).toContain("idNumber");
    }
  });

  it("自然人填了 idNumber 通过", () => {
    const r = partyInputSchema.safeParse({
      ...baseInputs,
      partyType: "NATURAL_PERSON",
      idNumber: "310101199001011234",
      enterpriseSocialCode: ""
    });
    expect(r.success).toBe(true);
  });

  it("公司必须填 enterpriseSocialCode", () => {
    const r = partyInputSchema.safeParse({
      ...baseInputs,
      name: "上海某某有限公司",
      partyType: "ORGANIZATION",
      idNumber: "",
      enterpriseSocialCode: ""
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const issues = r.error.issues.map((i) => i.path.join("."));
      expect(issues).toContain("enterpriseSocialCode");
    }
  });

  it("公司填了 enterpriseSocialCode 即使没 idNumber 也通过", () => {
    const r = partyInputSchema.safeParse({
      ...baseInputs,
      name: "上海某某有限公司",
      partyType: "ORGANIZATION",
      idNumber: "",
      enterpriseSocialCode: "91310000XXXXXXXXXX"
    });
    expect(r.success).toBe(true);
  });

  it("默认 partyType 为 NATURAL_PERSON（不传时）", () => {
    const r = partyInputSchema.safeParse({
      ...baseInputs,
      idNumber: "310101199001011234",
      enterpriseSocialCode: ""
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.partyType).toBe("NATURAL_PERSON");
    }
  });
});
