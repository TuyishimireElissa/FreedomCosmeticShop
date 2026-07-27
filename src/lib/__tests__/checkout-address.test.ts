import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  RWANDA_LOCATION_DATA,
  formatRwandaPhone,
  getAllDistricts,
  getCellsForSector,
  getProvinceByDistrict,
  getVillagesForCell,
  isAirtelNumber,
  isMTNNumber,
  isValidRwandaLocation,
} from '@/lib/rwanda-locations'

const form = readFileSync(resolve(process.cwd(), 'src/components/checkout/AddressForm.tsx'), 'utf8')

describe('complete Rwanda checkout address system', () => {
  it('contains the full pinned administrative hierarchy', () => {
    const districts = RWANDA_LOCATION_DATA.flatMap((province) => province.districts)
    const sectors = districts.flatMap((district) => district.sectors.map((sector) => ({ district: district.name, sector })))
    const cells = sectors.flatMap(({ district, sector }) => getCellsForSector(district, sector).map((cell) => ({ district, sector, cell })))
    const villages = cells.flatMap(({ district, sector, cell }) => getVillagesForCell(district, sector, cell))
    expect(RWANDA_LOCATION_DATA).toHaveLength(5)
    expect(getAllDistricts()).toHaveLength(30)
    expect(new Set(getAllDistricts()).size).toBe(30)
    expect(sectors).toHaveLength(416)
    expect(cells).toHaveLength(2149)
    expect(villages).toHaveLength(14837)
  })

  it('supports verified cascading lookups and province inference', () => {
    expect(getProvinceByDistrict('Gasabo')).toBe('Kigali City')
    const cells = getCellsForSector('Gasabo', 'Remera')
    expect(cells.length).toBeGreaterThan(0)
    const villages = getVillagesForCell('Gasabo', 'Remera', cells[0])
    expect(villages.length).toBeGreaterThan(0)
    expect(isValidRwandaLocation('Kigali City', 'Gasabo', 'Remera', cells[0], villages[0])).toBe(true)
    expect(isValidRwandaLocation('Western Province', 'Gasabo')).toBe(false)
  })

  it('formats Rwanda phones and identifies real network prefixes', () => {
    expect(formatRwandaPhone('0788123456')).toBe('+250 788 123 456')
    expect(formatRwandaPhone('+250 788 123 456')).toBe('+250 788 123 456')
    expect(isMTNNumber('0788123456')).toBe(true)
    expect(isAirtelNumber('0732123456')).toBe(true)
    expect(isMTNNumber('0732123456')).toBe(false)
  })

  it('uses custom JWT saved-address APIs and preserves values during field updates', () => {
    expect(form).toContain("useStore((state) => state.user)")
    expect(form).toContain("fetch('/api/user/addresses'")
    expect(form).not.toContain('next-auth')
    expect(form).toContain("onChange({ ...value, [key]: fieldValue })")
    expect(form).toContain('getCellsForSector')
    expect(form).toContain('getVillagesForCell')
    expect(form).toContain('buildWhatsAppShareUrl(message)')
  })
})
