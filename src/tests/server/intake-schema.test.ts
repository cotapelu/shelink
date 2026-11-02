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
import { describe, expect, it } from "vitest";
import { intakeCreateSchema } from "@/server/intakes/schemas";

const baseLitigationIntake = {
  category: "CIVIL_COMMERCIAL",
  title: "Tranh chấp hợp đồng giữa甲 và乙",
  firstProcedureType: "FIRST_INSTANCE",
  clientName: "Nguyên đơn",
  clientType: "INDIVIDUAL",
  clientIdNumber: "330100199001010000",
  parties: [
    {
      role: "OPPOSING_PARTY",
      ordinal: 1,
      partyType: "NATURAL_PERSON",
      name: "乙",
      idNumber: "330100199002020000",
      enterpriseSocialCode: "",
      phone: "",
      address: "",
      legalRep: "",
      contactName: "",
      enterpriseName: "",
      notes: ""
    }
  ]
};

describe("intakeCreateSchema", () => {
  it("Tiếp nhận loại tố tụng/trọng tài bắt buộc điền lập trường của bên ủy quyền và các bên", () => {
    const result = intakeCreateSchema.safeParse(baseLitigationIntake);

    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }));
      expect(issues).toContainEqual({
        path: "ourStanding",
        message: "Chọn lập trường tố tụng cho bên ủy quyền"
      });
      expect(issues).toContainEqual({
        path: "parties.0.standing",
        message: "Chọn lập trường tố tụng"
      });
    }
  });

  it("Tiếp nhận tố tụng/trọng tài điền lập trường tố tụng thì hợp lệ", () => {
    const result = intakeCreateSchema.safeParse({
      ...baseLitigationIntake,
      ourStanding: "PLAINTIFF",
      parties: [
        {
          ...baseLitigationIntake.parties[0],
          standing: "DEFENDANT"
        }
      ]
    });

    expect(result.success).toBe(true);
  });

  it("Phi tố tụng/tư vấn/đặc biệt không bắt buộc lập trường tố tụng", () => {
    const result = intakeCreateSchema.safeParse({
      ...baseLitigationIntake,
      category: "NON_LITIGATION",
      firstProcedureType: "NON_LITIGATION_PHASE"
    });

    expect(result.success).toBe(true);
  });
});
