import { describe, it, expect } from "vitest";
import { parseSms, splitSmsBatch } from "@/lib/sms-parser";

describe("sms-parser", () => {
  describe("parseSms", () => {
    it("should parse basic SMS with case number and court", () => {
      const text = `【湖北省武汉市人民法院】案件号：(2024)鄂01民初123号，开庭时间：2024-05-20 09:00`;
      const result = parseSms(text);
      expect(result.smsType).toBeDefined(); // type classified
      expect(result.caseNumbers).toContain("(2024)鄂01民初123号");
      expect(result.court).toBe("湖北省武汉市人民法院");
      expect(result.dates).toContain("2024-05-20 09:00");
      expect(result.hearingDate).toBe("2024-05-20 09:00");
    });

    it("should extract URLs and platforms", () => {
      const text = `请登录 https://court.gov.cn/case/view 查看详情`;
      const result = parseSms(text);
      expect(result.urls).toContain("https://court.gov.cn/case/view");
      expect(result.platforms).toContain("人民法院在线服务");
    });

    it("should extract phone numbers", () => {
      const text = `联系电话：024-12345678，咨询电话：024-87654321`;
      const result = parseSms(text);
      expect(result.phones).toContain("024-12345678");
      expect(result.phones).toContain("024-87654321");
    });

    it("should extract amounts", () => {
      const text = `标的金额：¥50,000.00元，诉讼费：500元`;
      const result = parseSms(text);
      expect(result.amounts.some(a => a.includes("50000") || a.includes("50,000"))).toBe(true);
    });

    it("should parse appeal deadline", () => {
      const text = `如不服本判决，可在送达之日起15日内向本院提起上诉`;
      const result = parseSms(text);
      expect(result.appealDeadline).toBe("15日");
    });

    it("should split SMS batch on blank lines", () => {
      const batch = `SMS 1 content

SMS 2 content`;
      const parts = splitSmsBatch(batch);
      expect(parts).toHaveLength(2);
      expect(parts[0]).toBe("SMS 1 content");
      expect(parts[1]).toBe("SMS 2 content");
    });
  });
});