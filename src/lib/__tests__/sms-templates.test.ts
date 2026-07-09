/**
 * SMS Templates tests — bilingual template rendering.
 */

import { getSmsMessage, renderTemplate, countSmsSegments, estimateSmsCost } from "@/server/services/sms-templates"

describe("SMS Templates", () => {
  describe("renderTemplate", () => {
    it("replaces {{variables}} with values", () => {
      const result = renderTemplate("Hello {{name}}!", { name: "Aline" })
      expect(result).toBe("Hello Aline!")
    })

    it("handles multiple variables", () => {
      const result = renderTemplate("Order {{orderNumber}} total: {{amount}} RWF", {
        orderNumber: "UB-2026-001",
        amount: 25000,
      })
      expect(result).toBe("Order UB-2026-001 total: 25000 RWF")
    })

    it("replaces unknown variables with empty string", () => {
      const result = renderTemplate("Hello {{name}}!", {})
      expect(result).toBe("Hello !")
    })

    it("handles conditional syntax", () => {
      const result = renderTemplate("Status: {{code ? 'has code' : 'no code'}}", { code: "WELCOME10" })
      expect(result).toBe("Status: has code")
    })
  })

  describe("getSmsMessage", () => {
    it("renders ORDER_PLACED in English", () => {
      const msg = getSmsMessage("ORDER_PLACED", "en", { orderNumber: "UB-2026-001" })
      expect(msg).toContain("UB-2026-001")
      expect(msg).toContain("FreedomCosmeticShop")
    })

    it("renders ORDER_PLACED in Kinyarwanda", () => {
      const msg = getSmsMessage("ORDER_PLACED", "rw", { orderNumber: "UB-2026-001" })
      expect(msg).toContain("UB-2026-001")
      expect(msg).toContain("Murakoze")
    })

    it("renders PAYMENT_CONFIRMED with amount", () => {
      const msg = getSmsMessage("PAYMENT_CONFIRMED", "en", {
        orderNumber: "UB-2026-001",
        amount: 25000,
      })
      expect(msg).toContain("25000")
      expect(msg).toContain("UB-2026-001")
    })

    it("renders OTP with code", () => {
      const msg = getSmsMessage("OTP", "en", { code: "123456" })
      expect(msg).toContain("123456")
    })
  })

  describe("countSmsSegments", () => {
    it("returns 1 for short message", () => {
      expect(countSmsSegments("Hello")).toBe(1)
    })

    it("returns 2 for message over 160 chars", () => {
      const longMsg = "A".repeat(161)
      expect(countSmsSegments(longMsg)).toBe(2)
    })
  })

  describe("estimateSmsCost", () => {
    it("estimates 6 RWF for single segment", () => {
      expect(estimateSmsCost("Hello")).toBe(6)
    })

    it("estimates 12 RWF for two segments", () => {
      expect(estimateSmsCost("A".repeat(161))).toBe(12)
    })
  })
})
