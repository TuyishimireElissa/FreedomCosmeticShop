/**
 * Phone validation tests — Rwanda +250 phone format.
 */

import { normalizeRwandaPhone, isValidRwandaPhone, detectNetwork, formatRwandaPhoneDisplay } from "@/lib/phone"

describe("Rwanda Phone Validation", () => {
  describe("normalizeRwandaPhone", () => {
    it("normalizes 0788123456 to +250788123456", () => {
      expect(normalizeRwandaPhone("0788123456")).toBe("+250788123456")
    })

    it("normalizes 250788123456 to +250788123456", () => {
      expect(normalizeRwandaPhone("250788123456")).toBe("+250788123456")
    })

    it("normalizes +250788123456 to +250788123456", () => {
      expect(normalizeRwandaPhone("+250788123456")).toBe("+250788123456")
    })

    it("normalizes 0788 123 456 (with spaces) to +250788123456", () => {
      expect(normalizeRwandaPhone("0788 123 456")).toBe("+250788123456")
    })

    it("throws on invalid phone", () => {
      expect(() => normalizeRwandaPhone("12345")).toThrow()
      expect(() => normalizeRwandaPhone("invalid")).toThrow()
    })

    it("throws on non-Rwanda phone", () => {
      expect(() => normalizeRwandaPhone("+1234567890")).toThrow()
    })
  })

  describe("isValidRwandaPhone", () => {
    it("returns true for valid MTN number", () => {
      expect(isValidRwandaPhone("0788123456")).toBe(true)
    })

    it("returns true for valid Airtel number", () => {
      expect(isValidRwandaPhone("0728123456")).toBe(true)
    })

    it("returns false for invalid number", () => {
      expect(isValidRwandaPhone("12345")).toBe(false)
    })
  })

  describe("detectNetwork", () => {
    it("detects MTN for 078X", () => {
      expect(detectNetwork("0788123456")).toBe("MTN")
    })

    it("detects MTN for 079X", () => {
      expect(detectNetwork("0798123456")).toBe("MTN")
    })

    it("detects AIRTEL for 072X", () => {
      expect(detectNetwork("0728123456")).toBe("AIRTEL")
    })

    it("detects AIRTEL for 073X", () => {
      expect(detectNetwork("0738123456")).toBe("AIRTEL")
    })
  })

  describe("formatRwandaPhoneDisplay", () => {
    it("formats +250788123456 as +250 788 123 456", () => {
      expect(formatRwandaPhoneDisplay("+250788123456")).toBe("+250 788 123 456")
    })
  })
})
