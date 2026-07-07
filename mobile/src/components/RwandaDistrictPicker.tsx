/**
 * RwandaDistrictPicker — mobile-friendly searchable district picker.
 *
 * Features:
 *   - Searchable list of all 30 districts
 *   - Grouped by province
 *   - Shows delivery fee when selected
 *   - Smooth animation
 *
 * Usage:
 *   <RwandaDistrictPicker
 *     selected={district}
 *     onSelect={(district, province) => setDistrict(district)}
 *   />
 */

import React, { useState, useMemo } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  Platform,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Search, ChevronDown, Check, MapPin, X } from "lucide-react-native"

// All 30 districts grouped by province
const DISTRICTS_BY_PROVINCE = [
  {
    province: "Kigali City",
    districts: [
      { name: "Gasabo", fee: "1,000 RWF", time: "Same day", isSameDay: true },
      { name: "Kicukiro", fee: "1,000 RWF", time: "Same day", isSameDay: true },
      { name: "Nyarugenge", fee: "1,000 RWF", time: "Same day", isSameDay: true },
    ],
  },
  {
    province: "Northern Province",
    districts: [
      { name: "Burera", fee: "3,000 RWF", time: "2-3 days", isSameDay: false },
      { name: "Gakenke", fee: "3,000 RWF", time: "2-3 days", isSameDay: false },
      { name: "Gicumbi", fee: "3,000 RWF", time: "2-3 days", isSameDay: false },
      { name: "Musanze", fee: "3,000 RWF", time: "2-3 days", isSameDay: false },
      { name: "Rulindo", fee: "3,000 RWF", time: "2-3 days", isSameDay: false },
    ],
  },
  {
    province: "Southern Province",
    districts: [
      { name: "Gisagara", fee: "3,000 RWF", time: "2-3 days", isSameDay: false },
      { name: "Huye", fee: "3,000 RWF", time: "2-3 days", isSameDay: false },
      { name: "Kamonyi", fee: "3,000 RWF", time: "2-3 days", isSameDay: false },
      { name: "Muhanga", fee: "3,000 RWF", time: "2-3 days", isSameDay: false },
      { name: "Nyamagabe", fee: "3,000 RWF", time: "2-3 days", isSameDay: false },
      { name: "Nyanza", fee: "3,000 RWF", time: "2-3 days", isSameDay: false },
      { name: "Nyaruguru", fee: "3,000 RWF", time: "2-3 days", isSameDay: false },
      { name: "Ruhango", fee: "3,000 RWF", time: "2-3 days", isSameDay: false },
    ],
  },
  {
    province: "Eastern Province",
    districts: [
      { name: "Bugesera", fee: "3,500 RWF", time: "2-3 days", isSameDay: false },
      { name: "Gatsibo", fee: "3,500 RWF", time: "2-3 days", isSameDay: false },
      { name: "Kayonza", fee: "3,500 RWF", time: "2-3 days", isSameDay: false },
      { name: "Kirehe", fee: "3,500 RWF", time: "2-3 days", isSameDay: false },
      { name: "Ngoma", fee: "3,500 RWF", time: "2-3 days", isSameDay: false },
      { name: "Nyagatare", fee: "3,500 RWF", time: "2-3 days", isSameDay: false },
      { name: "Rwamagana", fee: "3,500 RWF", time: "2-3 days", isSameDay: false },
    ],
  },
  {
    province: "Western Province",
    districts: [
      { name: "Karongi", fee: "4,000 RWF", time: "3-4 days", isSameDay: false },
      { name: "Ngororero", fee: "4,000 RWF", time: "3-4 days", isSameDay: false },
      { name: "Nyabihu", fee: "4,000 RWF", time: "3-4 days", isSameDay: false },
      { name: "Nyamasheke", fee: "4,000 RWF", time: "3-4 days", isSameDay: false },
      { name: "Rubavu", fee: "4,000 RWF", time: "3-4 days", isSameDay: false },
      { name: "Rusizi", fee: "4,000 RWF", time: "3-4 days", isSameDay: false },
      { name: "Rutsiro", fee: "4,000 RWF", time: "3-4 days", isSameDay: false },
    ],
  },
]

// Flatten for search
const ALL_DISTRICTS = DISTRICTS_BY_PROVINCE.flatMap((p) =>
  p.districts.map((d) => ({ ...d, province: p.province }))
)

interface RwandaDistrictPickerProps {
  selected: string | null
  onSelect: (district: string, province: string) => void
}

export function RwandaDistrictPicker({ selected, onSelect }: RwandaDistrictPickerProps) {
  const [modalVisible, setModalVisible] = useState(false)
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    if (!search.trim()) return ALL_DISTRICTS
    const q = search.toLowerCase()
    return ALL_DISTRICTS.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.province.toLowerCase().includes(q)
    )
  }, [search])

  const selectedDistrict = ALL_DISTRICTS.find((d) => d.name === selected)

  const handleSelect = (district: string, province: string) => {
    onSelect(district, province)
    setModalVisible(false)
    setSearch("")
  }

  return (
    <View>
      {/* Trigger button */}
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setModalVisible(true)}
      >
        <MapPin color="#b76e79" size={20} />
        <View style={styles.triggerText}>
          <Text style={styles.triggerLabel}>District</Text>
          <Text style={styles.triggerValue}>
            {selectedDistrict ? selectedDistrict.name : "Select your district"}
          </Text>
          {selectedDistrict && (
            <Text style={styles.triggerFee}>
              {selectedDistrict.fee} · {selectedDistrict.time}
            </Text>
          )}
        </View>
        <ChevronDown color="#9ca3af" size={20} />
      </TouchableOpacity>

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select District</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X color="#6d3a45" size={24} />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
              <Search color="#9ca3af" size={18} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search district..."
                value={search}
                onChangeText={setSearch}
                placeholderTextColor="#9ca3af"
              />
            </View>

            {/* District list */}
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.name}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.districtItem,
                    selected === item.name && styles.districtItemSelected,
                  ]}
                  onPress={() => handleSelect(item.name, item.province)}
                >
                  <View style={styles.districtInfo}>
                    <Text style={styles.districtName}>{item.name}</Text>
                    <Text style={styles.districtProvince}>{item.province}</Text>
                  </View>
                  <View style={styles.districtFee}>
                    {item.isSameDay && (
                      <View style={styles.sameDayBadge}>
                        <Text style={styles.sameDayText}>Same Day</Text>
                      </View>
                    )}
                    <Text style={styles.feeText}>{item.fee}</Text>
                    <Text style={styles.timeText}>{item.time}</Text>
                  </View>
                  {selected === item.name && (
                    <Check color="#b76e79" size={20} />
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#f3e0d8",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
  },
  triggerText: {
    flex: 1,
  },
  triggerLabel: {
    fontSize: 12,
    color: "#9ca3af",
  },
  triggerValue: {
    fontSize: 16,
    color: "#6d3a45",
    fontWeight: "500",
  },
  triggerFee: {
    fontSize: 12,
    color: "#b76e79",
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff8f3",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3e0d8",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#6d3a45",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f3e0d8",
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#6d3a45",
  },
  districtItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  districtItemSelected: {
    backgroundColor: "#fce4ec",
  },
  districtInfo: {
    flex: 1,
  },
  districtName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#6d3a45",
  },
  districtProvince: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
  },
  districtFee: {
    alignItems: "flex-end",
    marginRight: 8,
  },
  sameDayBadge: {
    backgroundColor: "#fce4ec",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 4,
  },
  sameDayText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#b76e79",
  },
  feeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6d3a45",
  },
  timeText: {
    fontSize: 11,
    color: "#9ca3af",
  },
  separator: {
    height: 1,
    backgroundColor: "#f3e0d8",
  },
})
