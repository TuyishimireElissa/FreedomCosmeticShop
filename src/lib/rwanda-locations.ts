/**
 * Rwanda administrative divisions reference data.
 *
 * Structure: Province → District → Sector
 *
 * Rwanda has:
 *   - 5 provinces (intara)
 *   - 30 districts (akarere)
 *   - 416 sectors (umurenge)
 *
 * Source: Rwanda Ministry of Local Government (MINALOC)
 *
 * For the full hierarchy including cells and villages, see:
 *   https://www.minaloc.gov.rw/index.php?id=34
 */

export const RWANDA_PROVINCES = [
  "Kigali City",
  "Northern Province",
  "Southern Province",
  "Eastern Province",
  "Western Province",
] as const

export type RwandaProvince = (typeof RWANDA_PROVINCES)[number]

/**
 * Districts grouped by province.
 * Key = province name, Value = array of district names.
 */
export const RWANDA_DISTRICTS: Record<RwandaProvince, string[]> = {
  "Kigali City": ["Nyarugenge", "Gasabo", "Kicukiro"],
  "Northern Province": [
    "Musanze",
    "Burera",
    "Gicumbi",
    "Rulindo",
    "Gakenke",
  ],
  "Southern Province": [
    "Nyanza",
    "Gisagara",
    "Nyaruguru",
    "Huye",
    "Nyamagabe",
    "Ruhango",
    "Muhanga",
    "Kamonyi",
  ],
  "Eastern Province": [
    "Rwamagana",
    "Nyagatare",
    "Gatsibo",
    "Kayonza",
    "Kirehe",
    "Ngoma",
    "Bugesera",
  ],
  "Western Province": [
    "Karongi",
    "Rutsiro",
    "Rubavu",
    "Nyabihu",
    "Ngororero",
    "Rusizi",
    "Nyamasheke",
  ],
}

/**
 * Major sectors per district (abbreviated — full list has 416 sectors).
 * Used for the address form dropdown.
 */
export const RWANDA_SECTORS: Record<string, string[]> = {
  // Kigali City
  Nyarugenge: ["Nyarugenge", "Gitega", "Kigali", "Kimirombe", "Nyakabanda", "Rwezamenyo", "Mageragere", "Kanyinya", "Gisozi"],
  Gasabo: ["Remera", "Ndera", "Rutunga", "Gikomero", "Gatsata", "Jali", "Gisozi", "Kimihurura", "Kimironko", "Ndera"],
  Kicukiro: ["Gikondo", "Kagarama", "Kicukiro", "Gatenga", "Niboye", "Kanombe", "Kagugu", "Masaka", "Niboyi"],
  // Northern Province
  Musanze: ["Musanze", "Cyuve", "Gataraga", "Kimonyi", "Kinigi", "Muko", "Musanze", "Nyange", "Shingiro", "Buhabwa"],
  Burera: ["Bungwe", "Butaro", "Cyanika", "Cyeru", "Gahunga", "Gitovu", "Kagogo", "Kinoni", "Kinyababa", "Nemba"],
  Gicumbi: ["Bukure", "Bwisige", "Cyumba", "Giti", "Kaniga", "Manyagiro", "Miyove", "Kageyo", "Muko", "Rubaya", "Rukozo", "Rutare", "Ruvune", "Shangasha"],
  Rulindo: ["Burega", "Bushoki", "Buyoga", "Cyungo", "Kinihira", "Kisaro", "Masoro", "Mbuye", "Murambi", "Ngoma", "Ntarabana", "Rukozo", "Rusiga", "Shyorongi", "Tumba"],
  Gakenke: ["Coko", "Gakenke", "Gashyamba", "Janja", "Kamubuga", "Karambo", "Mugongo", "Muhondo", "Muzo", "Nemba", "Ruli", "Rusaza", "Rutake", "Rwerere"],
  // Southern Province
  Nyanza: ["Busasamana", "Busoro", "Cyabakamyi", "Kibirizi", "Mukingo", "Muyira", "Ntyazo", "Nyagisozi", "Rwabicuma"],
  Gisagara: ["Gishubi", "Kansi", "Mamba", "Muganza", "Mugombwa", "Mukindo", "Musha", "Ndora", "Nyanza", "Save"],
  Nyaruguru: ["Busanze", "Cyanika", "Gasharu", "Kibeho", "Kivu", "Mata", "Matyazo", "Muganza", "Ngera", "Ngoma", "Nyabimata", "Nyamagabe", "Ruhuha", "Rusenge"],
  Huye: ["Busoro", "Mbazi", "Mukura", "Ngoma", "Ruhashya", "Rusatira", "Rwaniro", "Simbi", "Tumba", "Gishamvu", "Huye", "Karama", "Kigoma", "Maraba", "Mbazi", "Rusatira", "Save"],
  Nyamagabe: ["Buruhukiro", "Cyanika", "Gasaka", "Gatare", "Kaduha", "Kamegeri", "Kibumbwe", "Kitabi", "Mbazi", "Mugano", "Musange", "Musange", "Nshili", "Tare", "Uwinkingi"],
  Ruhango: ["Bweramana", "Byimana", "Kabagari", "Kigoma", "Kinazi", "Mbuye", "Mwendo", "Ntongwe", "Ruhango", "Rwimbogo"],
  Muhanga: ["Cyeza", "Gashali", "Kabacuzi", "Kibangu", "Kiyumba", "Muhanga", "Mushishiro", "Nyabinoni", "Nyamabuye", "Nyarusange", "Rongi", "Rugendabari", "Shyogwe"],
  Kamonyi: ["Gacurabwenge", "Karama", "Kayenzi", "Kibangu", "Mugina", "Musambira", "Ngomba", "Nyarubaka", "Rilima", "Rukoma", "Rusamvura", "Gitaraga"],
  // Eastern Province
  Rwamagana: ["Fumbwe", "Gahengeri", "Gishari", "Karengenge", "Kigabiro", "Muhazi", "Munyaga", "Munyiginya", "Musha", "Muyumbu", "Mwulire", "Nyakaliro", "Nzige", "Rubona"],
  Nyagatare: ["Gatunda", "Kiyombe", "Matimba", "Mimuli", "Mukama", "Musheri", "Nyagatare", "Rukomo", "Rwempasha", "Rwimiyaga", "Tabagwe", "Karangazi", "Gatunda"],
  Gatsibo: ["Gatsibo", "Gitoki", "Kabarore", "Kagarama", "Kageyo", "Kiramuruzi", "Muhura", "Murambi", "Ngarama", "Nyagihanga", "Remera", "Rugarama", "Rwimbogo"],
  Kayonza: ["Gahara", "Gatore", "Kabare", "Kabarondo", "Kagarama", "Murama", "Mukarange", "Mwiri", "Ndego", "Nyamirama", "Rukara", "Ruramira", "Rwinkwavu"],
  Kirehe: ["Gahara", "Gatore", "Kigarama", "Kigina", "Kirehe", "Mahama", "Mpanga", "Musaza", "Mushikiri", "Nasho", "Nyamugari", "Nyarubuye"],
  Ngoma: ["Gashanda", "Jarama", "Karembo", "Kayonza", "Kibungo", "Mugesera", "Murama", "Mutenderi", "Rukira", "Rukumberi", "Rurenge", "Sake", "Zaza"],
  Bugesera: ["Gashora", "Juru", "Kamabuye", "Mareba", "Mayange", "Musenyi", "Mwogo", "Ngeruka", "Ntarama", "Nyamata", "Nyarugenge", "Rilima", "Ruhuha", "Rweru", "Shyara"],
  // Western Province
  Karongi: ["Bwishyura", "Gashali", "Gishyita", "Gisovu", "Gitovu", "Mubuga", "Murambi", "Mutuntu", "Rubengera", "Rugabano", "Ruganda", "Rwankuba", "Twumba"],
  Rutsiro: ["Boneza", "Gihango", "Kigeyo", "Kivumu", "Manihira", "Mukura", "Murunda", "Musasa", "Mushonyi", "Mushubati", "Nyabirasi", "Ruhango", "Rusebeya"],
  Rubavu: ["Bugeshi", "Busasamana", "Cyanzarwe", "Gisenyi", "Gisenyi", "Kanzenze", "Mudende", "Nyakiriba", "Nyundo", "Rubavu", "Rugera", "Kanzenze"],
  Nyabihu: ["Bigogwe", "Jenda", "Kintobo", "Mukamira", "Muringa", "Nyabihu", "Rambura", "Ruga", "Shyira", "Karago"],
  Ngororero: ["Bwira", "Gatumba", "Hindiro", "Kabaya", "Kageyo", "Kavumu", "Matyazo", "Muhanda", "Musebeya", "Ngororero", "Nyange", "Sovu"],
  Rusizi: ["Bugarama", "Butare", "Gashonga", "Gihundwe", "Giheke", "Gikundamvura", "Gitambi", "Kamembe", "Mushaka", "Mashesha", "Nkanka", "Nkombo", "Nyakabuye", "Nyakarenzo"],
  Nyamasheke: ["Bigogwe", "Bugarama", "Choyo", "Gihombo", "Kagano", "Kanjongo", "Karambi", "Karengera", "Kirimbi", "Macuba", "Mahembe", "Nyabitekeri", "Ruharambuga", "Rusebeya", "Shangi"],
}

/**
 * Get all districts as a flat array.
 */
export function getAllDistricts(): string[] {
  return Object.values(RWANDA_DISTRICTS).flat()
}

/**
 * Get sectors for a given district.
 * Falls back to an empty array if the district isn't in our reference data.
 */
export function getSectorsForDistrict(district: string): string[] {
  return RWANDA_SECTORS[district] || []
}

/**
 * Get districts for a given province.
 */
export function getDistrictsForProvince(province: string): string[] {
  return RWANDA_DISTRICTS[province as RwandaProvince] || []
}

/**
 * Validate that a province/district/sector combination is valid.
 */
export function isValidRwandaLocation(
  province: string,
  district: string,
  sector?: string
): boolean {
  const districts = getDistrictsForProvince(province)
  if (!districts.includes(district)) return false
  if (sector) {
    const sectors = getSectorsForDistrict(district)
    if (sectors.length > 0 && !sectors.includes(sector)) return false
  }
  return true
}
