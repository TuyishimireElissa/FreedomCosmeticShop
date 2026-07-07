/**
 * MoMoPaymentSheet — bottom sheet component for MTN MoMo / Airtel Money payments.
 *
 * Shows:
 *   - Phone number input (MTN or Airtel)
 *   - Pay button
 *   - Waiting animation with countdown
 *   - Success state
 *   - Failure state with retry
 *
 * Usage:
 *   <MoMoPaymentSheet
 *     visible={visible}
 *     onClose={() => setVisible(false)}
 *     orderId="xxx"
 *     amount={25000}
 *     network="MTN"
 *     onSuccess={(ref) => navigation.navigate("OrderTracking")}
 *   />
 */

import React, { useState } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { usePayment } from "@/hooks/usePayment"
import {
  CheckCircle2,
  XCircle,
  Clock,
  X,
  Loader2,
} from "lucide-react-native"

interface MoMoPaymentSheetProps {
  visible: boolean
  onClose: () => void
  orderId: string
  amount: number
  network: "MTN" | "AIRTEL"
  onSuccess?: (transactionRef: string) => void
  onFailure?: (error: string) => void
}

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api"

export function MoMoPaymentSheet({
  visible,
  onClose,
  orderId,
  amount,
  network,
  onSuccess,
  onFailure,
}: MoMoPaymentSheetProps) {
  const [phone, setPhone] = useState("")
  const [phoneError, setPhoneError] = useState<string | null>(null)

  const { status, error, elapsedSeconds, remainingSeconds, initiate, cancel, reset } =
    usePayment()

  // Validate phone based on network
  const validatePhone = (value: string): boolean => {
    const cleaned = value.replace(/[\s-]/g, "")
    if (network === "MTN") {
      // MTN: 078 or 079 prefix
      return /^(?:\+250|250|0)?7[89][0-9]{7}$/.test(cleaned)
    } else {
      // Airtel: 072 or 073 prefix
      return /^(?:\+250|250|0)?7[23][0-9]{7}$/.test(cleaned)
    }
  }

  const handlePay = async () => {
    setPhoneError(null)

    if (!validatePhone(phone)) {
      setPhoneError(
        network === "MTN"
          ? "Enter a valid MTN number (078 or 079)"
          : "Enter a valid Airtel number (072 or 073)"
      )
      return
    }

    const success = await initiate({ phone, amount, orderId, network })
    if (!success && status === "failed") {
      onFailure?.(error || "Payment failed")
    }
  }

  const handleSuccess = () => {
    onSuccess?.("")
    onClose()
    reset()
  }

  const handleRetry = () => {
    reset()
  }

  const handleClose = () => {
    if (status === "waiting" || status === "initiating") {
      cancel()
    }
    reset()
    setPhone("")
    setPhoneError(null)
    onClose()
  }

  const formatRWF = (amt: number) => `RWF ${amt.toLocaleString()}`

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={handleClose}>
      <SafeAreaView style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {network === "MTN" ? "MTN Mobile Money" : "Airtel Money"}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X color="#6d3a45" size={24} />
            </TouchableOpacity>
          </View>

          {/* ─── Phone input (idle state) ─── */}
          {(status === "idle") && (
            <View style={styles.content}>
              <Text style={styles.label}>
                {network === "MTN" ? "MTN MoMo Number" : "Airtel Money Number"}
              </Text>
              <TextInput
                style={[styles.input, phoneError ? styles.inputError : null]}
                value={phone}
                onChangeText={setPhone}
                placeholder={network === "MTN" ? "078XXXXXXX" : "072XXXXXXX"}
                keyboardType="phone-pad"
                placeholderTextColor="#9ca3af"
              />
              {phoneError && <Text style={styles.errorText}>{phoneError}</Text>}
              <Text style={styles.hint}>
                ⚠️ Use the number registered for {network === "MTN" ? "MTN" : "Airtel"} Mobile Money
              </Text>

              <TouchableOpacity style={styles.payButton} onPress={handlePay}>
                <Text style={styles.payButtonText}>
                  Pay {formatRWF(amount)} with {network === "MTN" ? "MoMo" : "Airtel"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ─── Waiting state ─── */}
          {(status === "waiting" || status === "initiating") && (
            <View style={styles.content}>
              <View style={styles.spinnerContainer}>
                <ActivityIndicator size="large" color="#b76e79" />
              </View>
              <Text style={styles.statusTitle}>Waiting for payment approval</Text>
              <Text style={styles.statusText}>
                Check your phone and approve the {network === "MTN" ? "MTN MoMo" : "Airtel Money"}{"\n"}
                prompt to complete your payment of {formatRWF(amount)}.
              </Text>

              {/* Countdown */}
              <View style={styles.countdownContainer}>
                <View style={styles.countdownRow}>
                  <Text style={styles.countdownText}>
                    Elapsed: {Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, "0")}
                  </Text>
                  <Text style={styles.countdownText}>
                    Remaining: {Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, "0")}
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${(elapsedSeconds / 300) * 100}%` },
                    ]}
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                <Text style={styles.cancelButtonText}>Cancel Payment</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ─── Success state ─── */}
          {status === "success" && (
            <View style={styles.content}>
              <View style={styles.successIcon}>
                <CheckCircle2 color="#10b981" size={64} />
              </View>
              <Text style={styles.successTitle}>Payment Successful!</Text>
              <Text style={styles.successAmount}>{formatRWF(amount)} received</Text>
              <Text style={styles.successSubtext}>Order confirmed · SMS sent to your phone</Text>
              <TouchableOpacity style={styles.successButton} onPress={handleSuccess}>
                <Text style={styles.successButtonText}>View My Order</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ─── Failure state ─── */}
          {(status === "failed" || status === "timeout") && (
            <View style={styles.content}>
              <View style={styles.failureIcon}>
                <XCircle color="#ef4444" size={64} />
              </View>
              <Text style={styles.failureTitle}>Payment Failed</Text>
              <Text style={styles.failureText}>
                {error || "Payment could not be completed. Please try again."}
              </Text>
              <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  sheet: {
    backgroundColor: "#fff8f3",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3e0d8",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#6d3a45",
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
    alignItems: "center",
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6d3a45",
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#f3e0d8",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#6d3a45",
    backgroundColor: "#fff",
  },
  inputError: {
    borderColor: "#ef4444",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  hint: {
    color: "#9ca3af",
    fontSize: 12,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  payButton: {
    width: "100%",
    backgroundColor: "#b76e79",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 16,
  },
  payButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  spinnerContainer: {
    marginVertical: 20,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#6d3a45",
    textAlign: "center",
  },
  statusText: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  countdownContainer: {
    width: "100%",
    marginTop: 20,
  },
  countdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  countdownText: {
    fontSize: 12,
    color: "#9ca3af",
  },
  progressBar: {
    height: 4,
    backgroundColor: "#fce4ec",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#b76e79",
  },
  cancelButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f3e0d8",
  },
  cancelButtonText: {
    color: "#6d3a45",
    fontSize: 14,
    fontWeight: "500",
  },
  successIcon: {
    marginVertical: 20,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#065f46",
  },
  successAmount: {
    fontSize: 16,
    color: "#10b981",
    fontWeight: "600",
    marginTop: 8,
  },
  successSubtext: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 4,
  },
  successButton: {
    width: "100%",
    backgroundColor: "#10b981",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 20,
  },
  successButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  failureIcon: {
    marginVertical: 20,
  },
  failureTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#991b1b",
  },
  failureText: {
    fontSize: 14,
    color: "#ef4444",
    textAlign: "center",
    marginTop: 8,
  },
  retryButton: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#f3e0d8",
  },
  retryButtonText: {
    color: "#6d3a45",
    fontSize: 16,
    fontWeight: "500",
  },
})
