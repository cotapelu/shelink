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
import {
  intakeStatusSchema,
  feeTypeSchema,
  clientTypeSchema,
  litigationStandingSchema,
  intakeCreateSchema,
  intakeUpdateSchema,
  intakeListQuerySchema,
  declineIntakeSchema
} from "@/server/intakes/schemas";

describe("intakeStatusSchema", () => {
  it("accepts all valid statuses", () => {
    const statuses = ["INTAKE", "PENDING_CONFIRMATION", "CONVERTED", "DECLINED", "NEEDS_REVISION"];
    statuses.forEach(status => {
      expect(intakeStatusSchema.parse(status)).toBe(status);
    });
  });

  it("rejects invalid status", () => {
    expect(() => intakeStatusSchema.parse("INVALID")).toThrow();
  });
});

describe("feeTypeSchema", () => {
  it("accepts FIXED, CONTINGENCY, TIMED", () => {
    expect(feeTypeSchema.parse("FIXED")).toBe("FIXED");
    expect(feeTypeSchema.parse("CONTINGENCY")).toBe("CONTINGENCY");
    expect(feeTypeSchema.parse("TIMED")).toBe("TIMED");
  });
});

describe("clientTypeSchema", () => {
  it("accepts INDIVIDUAL, COMPANY, ORGANIZATION", () => {
    expect(clientTypeSchema.parse("INDIVIDUAL")).toBe("INDIVIDUAL");
    expect(clientTypeSchema.parse("COMPANY")).toBe("COMPANY");
    expect(clientTypeSchema.parse("ORGANIZATION")).toBe("ORGANIZATION");
  });
});

describe("litigationStandingSchema", () => {
  it("accepts common standings", () => {
    const standings = ["PLAINTIFF", "DEFENDANT", "THIRD_PARTY", "APPELLANT", "APPELLEE"];
    standings.forEach(s => {
      expect(litigationStandingSchema.parse(s)).toBe(s);
    });
  });
});

describe("intakeListQuerySchema", () => {
  it("accepts defaults", () => {
    const result = intakeListQuerySchema.parse({});
    expect(result.sortBy).toBe("intakeDate");
    expect(result.sortDir).toBe("desc");
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it("accepts valid filters", () => {
    const data = {
      search: "test",
      category: "CIVIL_COMMERCIAL" as const,
      status: "INTAKE" as const,
      receivedAtFrom: new Date("2024-01-01"),
      receivedAtTo: new Date("2024-12-31"),
      page: 2,
      pageSize: 50,
      sortBy: "claimAmount" as const,
      sortDir: "asc" as const
    };
    const result = intakeListQuerySchema.parse(data);
    expect(result.search).toBe("test");
    expect(result.page).toBe(2);
    expect(result.sortBy).toBe("claimAmount");
  });

  it("rejects pageSize > 100", () => {
    expect(() => intakeListQuerySchema.parse({ pageSize: 200 })).toThrow();
  });

  it("coerces string page to number", () => {
    const result = intakeListQuerySchema.parse({ page: "2" });
    expect(result.page).toBe(2);
    expect(typeof result.page).toBe("number");
  });
});

describe("intakeCreateSchema - whitespace preprocessing", () => {
  it("strips all whitespace from title", () => {
    const result = intakeCreateSchema.parse({
      title: "  Test   Intake  ",
      category: "NON_LITIGATION" // non-litigation, no standing required
    });
    expect(result.title).toBe("TestIntake");
  });

  it("accepts non-litigation category without standing", () => {
    const result = intakeCreateSchema.parse({
      title: "Advisory",
      category: "LEGAL_COUNSEL"
    });
    expect(result.category).toBe("LEGAL_COUNSEL");
  });

  it("accepts project category without standing", () => {
    const result = intakeCreateSchema.parse({
      title: "Project",
      category: "SPECIAL_PROJECT"
    });
    expect(result.category).toBe("SPECIAL_PROJECT");
  });
});

describe("intakeCreateSchema - litigation standing rules", () => {
  it("rejects litigation without ourStanding", () => {
    const result = intakeCreateSchema.safeParse({
      title: "Case",
      category: "CIVIL_COMMERCIAL"
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = result.error.flatten();
      expect(issues.formErrors).toHaveLength(0);
      const ourStandingIssue = issues.fieldErrors.ourStanding;
      expect(ourStandingIssue).toBeDefined();
    }
  });

  it("accepts litigation with ourStanding but no parties", () => {
    const result = intakeCreateSchema.safeParse({
      title: "Case",
      category: "CIVIL_COMMERCIAL" as const,
      ourStanding: "PLAINTIFF" as const,
      parties: []
    });
    expect(result.success).toBe(true);
  });

  it("rejects litigation when party standing missing", () => {
    const result = intakeCreateSchema.safeParse({
      title: "Case",
      category: "CIVIL_COMMERCIAL" as const,
      ourStanding: "PLAINTIFF" as const,
      parties: [{ role: "OPPOSING_PARTY" as const, name: "Opp" }]
      // missing party.standing and party.idNumber for NATURAL_PERSON default type
    });
    expect(result.success).toBe(false);
  });

  // Complex party validation requires full partyInputSchema; deferred to integration tests
});

describe("intakeUpdateSchema", () => {
  it("requires id field", () => {
    const result = intakeUpdateSchema.safeParse({
      title: "Updated",
      category: "CIVIL_COMMERCIAL"
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = result.error.flatten();
      expect(issues.fieldErrors.id).toBeDefined();
    }
  });

  it("accepts valid id", () => {
    // Use a valid CUID pattern (approx 25 chars, alphanumeric)
    const result = intakeUpdateSchema.safeParse({
      id: "clqwed4pl0000xqeratg7x9c",
      title: "Updated",
      category: "CIVIL_COMMERCIAL" as const,
      ourStanding: "PLAINTIFF" as const
    });
    expect(result.success).toBe(true);
  });
});

describe("declineIntakeSchema", () => {
  it("requires valid cuid id", () => {
    const result = declineIntakeSchema.safeParse({
      id: "invalid",
      reason: "Not taking"
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid decline", () => {
    const result = declineIntakeSchema.safeParse({
      id: "clqwed4pl0000xqeratg7x9c",
      reason: "Conflict of interest"
    });
    expect(result.success).toBe(true);
  });
});
