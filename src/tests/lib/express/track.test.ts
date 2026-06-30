import { describe, it, expect, vi, beforeEach } from "vitest";
import { trackExpress } from "@/lib/express/track";
import { getExpressSettings } from "@/lib/express/settings";
import { detectCompany } from "@/lib/express/companies";

// Mock getExpressSettings to return configured kdniao
vi.mock("@/lib/express/settings", () => ({
  getExpressSettings: vi.fn().mockResolvedValue({
    kdniao: { configured: true, ebusinessId: "test-id", appKey: "test-key" },
    kuaidi100: { configured: false, customer: "", key: "" }
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

    let capturedBody: any;
    mockFetch.mockImplementation((_url, opts) => {
      capturedBody = opts.body;
      return Promise.resolve({
        json: () => Promise.resolve({ Success: true, Traces: [] })
      });
    });

    await trackExpress({ trackingNo: "TEST123", companyCode: "中通快递" });

    expect(capturedBody).not.toBeUndefined();
    if (capturedBody instanceof URLSearchParams) {
      expect(capturedBody.get("RequestType")).toBe("1002");
      expect(capturedBody.get("EBusinessID")).toBe("test-id");
      const requestData = capturedBody.get("RequestData");
      expect(requestData).toContain("TEST123");
      expect(requestData).toContain("ZTO");
    } else {
      const bodyStr = String(capturedBody);
      expect(bodyStr).toContain("RequestType=1002");
      expect(bodyStr).toContain("trackingNo=TEST123");
      expect(bodyStr).toContain("ShipperCode=ZTO");
    }
  });

  it("throws when no provider is configured", async () => {
    vi.mocked(getExpressSettings).mockResolvedValueOnce({
      kdniao: { configured: false, ebusinessId: "", appKey: "" },
      kuaidi100: { configured: false, customer: "", key: "" }
    });
    await expect(trackExpress({ trackingNo: "123" })).rejects.toThrow("请先到 设置 → 快递接入");
  });

  it("throws when company cannot be detected", async () => {
    vi.mocked(detectCompany).mockReturnValueOnce(null);
    await expect(trackExpress({ trackingNo: "123" })).rejects.toThrow("无法自动识别快递公司");
  });

  it("falls back to Kuaidi100 when KDNiao fails and Kuaidi100 configured", async () => {
    vi.mocked(getExpressSettings).mockResolvedValueOnce({
      kdniao: { configured: true, ebusinessId: "id", appKey: "key" },
      kuaidi100: { configured: true, customer: "cust", key: "k" }
    });
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ json: async () => ({ Success: false, Reason: "KDNiao error" }) });
      }
      return Promise.resolve({ json: async () => ({ status: "200", message: "ok", state: "3", data: [{ time: "2024-01-01", context: "delivered" }] }) });
    });
    global.fetch = mockFetch;
    const result = await trackExpress({ trackingNo: "123" });
    expect(result.provider).toBe("快递100");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("re-throws KDNiao error when Kuaidi100 not configured", async () => {
    vi.mocked(getExpressSettings).mockResolvedValueOnce({
      kdniao: { configured: true, ebusinessId: "id", appKey: "key" },
      kuaidi100: { configured: false, customer: "", key: "" }
    });
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({ Success: false, Reason: "KDNiao error" })
    });
    await expect(trackExpress({ trackingNo: "123" })).rejects.toThrow("KDNiao error");
  });

  it("handles missing traces gracefully", async () => {
    vi.mocked(getExpressSettings).mockResolvedValueOnce({
      kdniao: { configured: true, ebusinessId: "id", appKey: "key" },
      kuaidi100: { configured: false, customer: "", key: "" }
    });
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({ Success: true, State: "3" })
    });
    const result = await trackExpress({ trackingNo: "123" });
    expect(result.traces).toEqual([]);
  });

  it("maps unknown state codes to '未知'", async () => {
    vi.mocked(getExpressSettings).mockResolvedValueOnce({
      kdniao: { configured: true, ebusinessId: "id", appKey: "key" },
      kuaidi100: { configured: false, customer: "", key: "" }
    });
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({ Success: true, State: 999, Traces: [] })
    });
    const result = await trackExpress({ trackingNo: "123" });
    expect(result.state).toBe("未知");
  });

  it("maps unknown kuaidi100 state codes to '未知'", async () => {
    vi.mocked(getExpressSettings).mockResolvedValueOnce({
      kdniao: { configured: false, ebusinessId: "", appKey: "" },
      kuaidi100: { configured: true, customer: "c", key: "k" }
    });
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({ status: "200", message: "ok", state: "99", data: [] })
    });
    const result = await trackExpress({ trackingNo: "123" });
    expect(result.state).toBe("未知");
  });

  it("uses Kuaidi100 directly when KDNiao not configured", async () => {
    vi.mocked(getExpressSettings).mockResolvedValueOnce({
      kdniao: { configured: false, ebusinessId: "", appKey: "" },
      kuaidi100: { configured: true, customer: "cust", key: "key" }
    });
    const mockFetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({ status: "200", message: "ok", state: "3", data: [{ time: "2024-01-01", context: "delivered" }] })
    });
    global.fetch = mockFetch;
    const result = await trackExpress({ trackingNo: "123" });
    expect(result.provider).toBe("快递100");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("throws when Kuaidi100 returns error status", async () => {
    vi.mocked(getExpressSettings).mockResolvedValueOnce({
      kdniao: { configured: true, ebusinessId: "id", appKey: "key" },
      kuaidi100: { configured: true, customer: "cust", key: "k" }
    });
    // KDNiao fails, then Kuaidi100 fails too
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ json: async () => ({ Success: false, Reason: "KDNiao down" }) });
      }
      return Promise.resolve({ json: async () => ({ status: "500", message: "error", state: "0", data: [] }) });
    });
    global.fetch = mockFetch;
    await expect(trackExpress({ trackingNo: "123" })).rejects.toThrow("error");
  });
});
