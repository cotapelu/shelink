import { describe, it, expect } from "vitest";
import {
  emptyToNull,
  clientTypeToPartyType,
  normalizeProcedureParties,
  normalizeLitigationStanding,
  normalizeNewProcedureParties
} from "@/server/matters/helpers";
import { LitigationStanding, PartyRole, PartyType } from "@prisma/client";

describe("emptyToNull", () => {
  it("converts empty strings to null", () => {
    const input = { a: "", b: "text", c: 123 };
    const result = emptyToNull(input);
    expect(result).toEqual({ a: null, b: "text", c: 123 });
  });

  it("leaves non-string values untouched", () => {
    const input = { num: 0, bool: false, nil: null, arr: [] };
    const result = emptyToNull(input);
    expect(result).toEqual(input);
  });

  it("handles empty object", () => {
    const result = emptyToNull({});
    expect(result).toEqual({});
  });

  it("does not mutate original", () => {
    const input = { x: "" };
    emptyToNull(input);
    expect(input).toEqual({ x: "" });
  });
});

describe("clientTypeToPartyType", () => {
  it("maps INDIVIDUAL to NATURAL_PERSON", () => {
    expect(clientTypeToPartyType("INDIVIDUAL")).toBe("NATURAL_PERSON");
  });

  it("maps COMPANY to COMPANY", () => {
    expect(clientTypeToPartyType("COMPANY")).toBe("COMPANY");
  });

  it("maps ORGANIZATION to OTHER_ORG", () => {
    expect(clientTypeToPartyType("ORGANIZATION")).toBe("OTHER_ORG");
  });
});

describe("normalizeLitigationStanding", () => {
  it("normalizes JOINT_PLAINTIFF to PLAINTIFF", () => {
    expect(normalizeLitigationStanding("JOINT_PLAINTIFF" as LitigationStanding)).toBe("PLAINTIFF");
  });

  it("normalizes JOINT_DEFENDANT to DEFENDANT", () => {
    expect(normalizeLitigationStanding("JOINT_DEFENDANT" as LitigationStanding)).toBe("DEFENDANT");
  });

  it("keeps other standing values unchanged", () => {
    const standing: LitigationStanding = "PLAINTIFF";
    expect(normalizeLitigationStanding(standing)).toBe(standing);
    expect(normalizeLitigationStanding("DEFENDANT" as LitigationStanding)).toBe("DEFENDANT");
    expect(normalizeLitigationStanding("THIRD_PARTY" as LitigationStanding)).toBe("THIRD_PARTY");
  });
});

describe("normalizeProcedureParties", () => {
  it("filters out rows with empty partyId", () => {
    const rows = [
      { partyId: "", standing: "PLAINTIFF" as LitigationStanding },
      { partyId: "p1", standing: "DEFENDANT" as LitigationStanding }
    ];
    const result = normalizeProcedureParties(rows);
    expect(result.length).toBe(1);
    expect(result[0].partyId).toBe("p1");
  });

  it("filters out rows with invalid standing", () => {
    const rows = [
      { partyId: "p1", standing: "INVALID" as any },
      { partyId: "p2", standing: "PLAINTIFF" as LitigationStanding }
    ];
    const result = normalizeProcedureParties(rows);
    expect(result.length).toBe(1);
    expect(result[0].standing).toBe("PLAINTIFF");
  });

  it("normalizes standing values (JOINT_* cases)", () => {
    const rows = [
      { partyId: "p1", standing: "JOINT_PLAINTIFF" as LitigationStanding },
      { partyId: "p2", standing: "JOINT_DEFENDANT" as LitigationStanding }
    ];
    const result = normalizeProcedureParties(rows);
    expect(result[0].standing).toBe("PLAINTIFF");
    expect(result[1].standing).toBe("DEFENDANT");
  });

  it("deduplicates by (partyId, standing)", () => {
    const rows = [
      { partyId: "p1", standing: "PLAINTIFF" as LitigationStanding },
      { partyId: "p1", standing: "PLAINTIFF" as LitigationStanding },
      { partyId: "p1", standing: "DEFENDANT" as LitigationStanding }
    ];
    const result = normalizeProcedureParties(rows);
    expect(result.length).toBe(2);
  });

  it("preserves order", () => {
    const rows = [
      { partyId: "p2", standing: "DEFENDANT" as LitigationStanding },
      { partyId: "p1", standing: "PLAINTIFF" as LitigationStanding }
    ];
    const result = normalizeProcedureParties(rows);
    expect(result[0].partyId).toBe("p2");
    expect(result[1].partyId).toBe("p1");
  });
});

describe("normalizeNewProcedureParties", () => {
  it("trims fields for COMPANY (requires enterpriseSocialCode)", () => {
    const rows = [
      {
        existingPartyId: "",
        name: "  Client Name  ",
        role: "THIRD_PARTY" as PartyRole,
        partyType: "COMPANY" as PartyType,
        idNumber: "  ID123  ",
        enterpriseSocialCode: "  CODE  ",
        standings: ["PLAINTIFF" as LitigationStanding]
      }
    ];
    const result = normalizeNewProcedureParties(rows);
    expect(result.length).toBe(1);
    expect(result[0].name).toBe("Client Name");
    expect(result[0].idNumber).toBe("ID123");
    expect(result[0].enterpriseSocialCode).toBe("CODE");
    expect(result[0].existingPartyId).toBeNull();
  });

  it("trims fields for NATURAL_PERSON (requires idNumber)", () => {
    const rows = [
      {
        existingPartyId: null,
        name: "  Test Name  ",
        role: "CLIENT_PARTY" as PartyRole,
        partyType: "NATURAL_PERSON" as PartyType,
        idNumber: "  ID999  ",
        enterpriseSocialCode: "",
        standings: ["DEFENDANT" as LitigationStanding]
      }
    ];
    const result = normalizeNewProcedureParties(rows);
    expect(result.length).toBe(1);
    expect(result[0].name).toBe("Test Name");
    expect(result[0].idNumber).toBe("ID999");
    expect(result[0].enterpriseSocialCode).toBe("");
  });

  it("normalizes standing values", () => {
    const rows = [
      {
        existingPartyId: null,
        name: "Test",
        role: "OPPOSING_PARTY" as PartyRole,
        partyType: "NATURAL_PERSON" as PartyType,
        idNumber: "ID123",
        enterpriseSocialCode: "",
        standings: ["JOINT_PLAINTIFF" as LitigationStanding]
      }
    ];
    const result = normalizeNewProcedureParties(rows);
    expect(result.length).toBe(1);
    expect(result[0].standings[0]).toBe("PLAINTIFF");
  });

  it("deduplicates standings via Set", () => {
    const rows = [
      {
        existingPartyId: null,
        name: "Test",
        role: "THIRD_PARTY" as PartyRole,
        partyType: "NATURAL_PERSON" as PartyType,
        idNumber: "ID123",
        enterpriseSocialCode: "",
        standings: ["PLAINTIFF" as LitigationStanding, "PLAINTIFF" as LitigationStanding, "DEFENDANT" as LitigationStanding]
      }
    ];
    const result = normalizeNewProcedureParties(rows);
    expect(result.length).toBe(1);
    expect(result[0].standings.length).toBe(2);
  });

  it("preserves role and partyType unchanged", () => {
    const rows = [
      {
        existingPartyId: null,
        name: "Test",
        role: "WITNESS" as PartyRole,
        partyType: "OTHER_ORG" as PartyType,
        idNumber: "",
        enterpriseSocialCode: "SOCIAL_CODE",
        standings: ["DEFENDANT" as LitigationStanding]
      }
    ];
    const result = normalizeNewProcedureParties(rows);
    expect(result.length).toBe(1);
    expect(result[0].role).toBe("WITNESS");
    expect(result[0].partyType).toBe("OTHER_ORG");
  });

  it("filters out rows without required fields per partyType", () => {
    // NATURAL_PERSON without idNumber
    const rows1 = [
      {
        existingPartyId: null,
        name: "Test",
        role: "CLIENT_PARTY" as PartyRole,
        partyType: "NATURAL_PERSON" as PartyType,
        idNumber: "",
        enterpriseSocialCode: "",
        standings: ["PLAINTIFF" as LitigationStanding]
      }
    ];
    expect(normalizeNewProcedureParties(rows1).length).toBe(0);

    // COMPANY without enterpriseSocialCode
    const rows2 = [
      {
        existingPartyId: null,
        name: "Test",
        role: "OPPOSING_PARTY" as PartyRole,
        partyType: "COMPANY" as PartyType,
        idNumber: "ID123",
        enterpriseSocialCode: "",
        standings: ["DEFENDANT" as LitigationStanding]
      }
    ];
    expect(normalizeNewProcedureParties(rows2).length).toBe(0);
  });
});
