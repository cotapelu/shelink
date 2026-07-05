import { generateCorrelationId, getCorrelationId, withCorrelationId } from "@/lib/telemetry/correlation-id";

describe("correlation-id utilities", () => {
  describe("generateCorrelationId", () => {
    it("should generate ID with 'req_' prefix", () => {
      const id = generateCorrelationId();
      expect(id).toMatch(/^req_[0-9a-f-]{36}$/i);
    });
  });

  describe("getCorrelationId (server-side)", () => {
    it("should generate new ID when no window", () => {
      // In Node environment (no window), it'll call generateCorrelationId
      const id = getCorrelationId();
      expect(id).toMatch(/^req_[0-9a-f-]{36}$/i);
    });
  });

  describe("withCorrelationId", () => {
    it("should add correlationId to object", () => {
      const obj = { foo: "bar" };
      const result = withCorrelationId(obj, "test-id");
      expect(result).toEqual({ foo: "bar", correlationId: "test-id" });
    });

    it("should generate id if not provided", () => {
      const obj = { a: 1 };
      const result = withCorrelationId(obj);
      expect(result).toHaveProperty("correlationId");
      expect(result.correlationId).toMatch(/^req_[0-9a-f-]{36}$/i);
    });
  });
});
