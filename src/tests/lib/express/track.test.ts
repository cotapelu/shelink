import { describe, it, expect, vi, beforeEach } from "vitest";
import { trackExpress } from "@/lib/express/track";

// Mock getExpressSettings to return configured kdniao
vi.mock("@/lib/express/settings", () => ({
  getExpressSettings: vi.fn().mockResolvedValue({
    kdniao: { configured: true, ebusinessId: "test-id", appKey: "test-key" },
    kuaidi100: { configured: false }
  })
}));

// Mock COMPANY_CODES and detectCompany to return a valid code
vi.mock("@/lib/express/companies", () => ({
  COMPANY_CODES: {
    "顺丰快递": ["SF", "SF"],
    "中通快递": ["ZTO", "ZTO"]
  },
  SUPPORTED_COMPANIES: [],
  detectCompany: vi.fn().mockReturnValue("顺丰快递")
}));

describe("trackExpress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls KDNiao API over HTTPS", async () => {
    // Mock global fetch
    const mockFetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ Success: true, Traces: [] })
    });
    global.fetch = mockFetch;

    await trackExpress({ trackingNo: "123456", companyCode: "顺丰快递" });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.kdniao.com/Ebusiness/EbusinessOrderHandle.aspx");
    expect(options.method).toBe("POST");
    expect(options.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
  });

  it("includes correct form parameters in body", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ Success: true, Traces: [] })
    });
    global.fetch = mockFetch;

    // Track the body to verify it contains expected params
    let capturedBody: any = undefined;
    mockFetch.mockImplementation((_url, opts) => {
      capturedBody = opts.body;
      return Promise.resolve({
        json: () => Promise.resolve({ Success: true, Traces: [] })
      });
    });

    await trackExpress({ trackingNo: "TEST123", companyCode: "中通快递" });

    expect(capturedBody).not.toBeUndefined();
    // The body is a URLSearchParams object
    if (capturedBody instanceof URLSearchParams) {
      expect(capturedBody.get("RequestType")).toBe("1002");
      expect(capturedBody.get("EBusinessID")).toBe("test-id");
      const requestData = capturedBody.get("RequestData");
      expect(requestData).toContain("TEST123"); // tracking number in XML
      expect(requestData).toContain("ZTO"); // shipper code
    } else {
      // In some environments, URLSearchParams may be stringified automatically
      const bodyStr = String(capturedBody);
      expect(bodyStr).toContain("RequestType=1002");
      expect(bodyStr).toContain("trackingNo=TEST123");
      expect(bodyStr).toContain("ShipperCode=ZTO");
    }
  });
});
