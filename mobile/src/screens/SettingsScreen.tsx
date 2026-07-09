/**
 * SettingsScreen — app settings (language, notifications, biometric, about).
 */

import React, { useState } from "react"
import { View, Text, TouchableOpacity, Switch, ScrollView, Linking } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useNavigation } from "@react-navigation/native"
import {
  ChevronLeft,
  Globe,
  Bell,
  Fingerprint,
  ShieldCheck,
  HelpCircle,
  Star,
  FileText,
  ChevronRight,
} from "lucide-react-native"

export function SettingsScreen() {
  const navigation = useNavigation<any>()
  const [pushEnabled, setPushEnabled] = useState(true)
  const [smsEnabled, setSmsEnabled] = useState(true)
  const [emailEnabled, setEmailEnabled] = useState(false)
  const [biometricEnabled, setBiometricEnabled] = useState(false)
  const [language, setLanguage] = useState("EN")

  const settings = [
    {
      section: "Preferences",
      items: [
        { icon: Globe, label: "Language", value: language, action: () => {
          const langs = ["EN", "FR", "RW"]
          const next = langs[(langs.indexOf(language) + 1) % 3]
          setLanguage(next)
        }},
      ],
    },
    {
      section: "Notifications",
      items: [
        { icon: Bell, label: "Push notifications", toggle: pushEnabled, onToggle: setPushEnabled },
        { icon: Bell, label: "SMS notifications", toggle: smsEnabled, onToggle: setSmsEnabled },
        { icon: Bell, label: "Email notifications", toggle: emailEnabled, onToggle: setEmailEnabled },
      ],
    },
    {
      section: "Security",
      items: [
        { icon: Fingerprint, label: "Biometric login", toggle: biometricEnabled, onToggle: setBiometricEnabled },
        { icon: ShieldCheck, label: "Privacy policy", action: () => Linking.openURL("https://freedomcosmeticshop.rw/privacy") },
      ],
    },
    {
      section: "About",
      items: [
        { icon: HelpCircle, label: "Help & support", action: () => Linking.openURL("https://wa.me/250788123456") },
        { icon: Star, label: "Rate the app", action: () => Linking.openURL("market://details?id=com.freedomcosmeticshop.rw") },
        { icon: FileText, label: "Terms of service", action: () => Linking.openURL("https://freedomcosmeticshop.rw/terms") },
      ],
    },
  ]

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center px-4 py-3">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <ChevronLeft color="#6d3a45" size={24} />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-foreground">Settings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {settings.map((section, si) => (
          <View key={si} className="mb-4">
            <Text className="mb-2 px-4 text-xs font-semibold uppercase text-muted-foreground">
              {section.section}
            </Text>
            <View className="mx-4 rounded-2xl border border-border bg-card">
              {section.items.map((item, i) => (
                <View
                  key={i}
                  className={`flex-row items-center justify-between p-4 ${i < section.items.length - 1 ? "border-b border-border" : ""}`}
                >
                  <View className="flex-row items-center gap-3">
                    <item.icon color="#b76e79" size={20} />
                    <Text className="text-sm font-medium text-foreground">{item.label}</Text>
                  </View>
                  {item.toggle !== undefined ? (
                    <Switch
                      value={item.toggle}
                      onValueChange={item.onToggle}
                      trackColor={{ false: "#e5e5e5", true: "#b76e79" }}
                      thumbColor="#fff"
                    />
                  ) : item.value ? (
                    <Text className="text-sm font-medium text-primary">{item.value}</Text>
                  ) : (
                    <ChevronRight color="#9ca3af" size={18} />
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}

        <Text className="px-4 pb-8 text-center text-xs text-muted-foreground">
          FreedomCosmeticShop v1.0.0{"\n"}Made with 🤍 in Kigali, Rwanda
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}
