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
import { describe, expect, it } from "vitest";
import { intakeCreateSchema } from "@/server/intakes/schemas";

const baseLitigationIntake = {
  category: "CIVIL_COMMERCIAL",
  title: "甲与乙合同纠纷",
  firstProcedureType: "FIRST_INSTANCE",
  clientName: "甲",
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
  it("诉讼/仲裁类收案必须填写委托方和案件当事人的诉讼地位", () => {
    const result = intakeCreateSchema.safeParse(baseLitigationIntake);

    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }));
      expect(issues).toContainEqual({
        path: "ourStanding",
        message: "请选择委托方诉讼地位"
      });
      expect(issues).toContainEqual({
        path: "parties.0.standing",
        message: "请选择诉讼地位"
      });
    }
  });

  it("诉讼/仲裁类收案填写诉讼地位后通过", () => {
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

  it("非诉/顾问/专项不强制诉讼地位", () => {
    const result = intakeCreateSchema.safeParse({
      ...baseLitigationIntake,
      category: "NON_LITIGATION",
      firstProcedureType: "NON_LITIGATION_PHASE"
    });

    expect(result.success).toBe(true);
  });
});
