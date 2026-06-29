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
