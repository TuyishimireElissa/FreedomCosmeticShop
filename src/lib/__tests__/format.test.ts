/**
 * Format helpers tests — RWF formatting + delivery fees.
 */

import { formatRWF, formatRWFCompact, deliveryFeeFor } from "@/lib/format"

describe("Format Helpers", () => {
  describe("formatRWF", () => {
    it("formats 12500 as RWF 12,500", () => {
      expect(formatRWF(12500)).toBe("RWF 12,500")
    })

    it("formats 0 as RWF 0", () => {
      expect(formatRWF(0)).toBe("RWF 0")
    })

    it("formats 1000000 as RWF 1,000,000", () => {
      expect(formatRWF(1000000)).toBe("RWF 1,000,000")
    })
  })

  describe("formatRWFCompact", () => {
    it("formats 12500 as RWF 12.5k", () => {
      expect(formatRWFCompact(12500)).toBe("RWF 12.5k")
    })

    it("formats 1500000 as RWF 1.5M", () => {
      expect(formatRWFCompact(1500000)).toBe("RWF 1.5M")
    })
  })

  describe("deliveryFeeFor", () => {
    it("returns 1000 for Kigali City", () => {
      expect(deliveryFeeFor("Kigali City")).toBe(1000)
    })

    it("returns 3000 for Northern Province", () => {
      expect(deliveryFeeFor("Northern Province")).toBe(3000)
    })

    it("returns 3500 for Eastern Province", () => {
      expect(deliveryFeeFor("Eastern Province")).toBe(3500)
    })

    it("returns 4000 for Western Province", () => {
      expect(deliveryFeeFor("Western Province")).toBe(4000)
    })

    it("returns 3000 default for unknown province", () => {
      expect(deliveryFeeFor("Unknown")).toBe(3000)
    })
  })
})
