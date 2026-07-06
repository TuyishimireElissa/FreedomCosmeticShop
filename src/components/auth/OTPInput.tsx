"use client"

/**
 * OTPInput — 6-digit code input with auto-advance and paste support.
 *
 * Features:
 *   - 6 separate input boxes
 *   - Auto-advance to next box on input
 *   - Backspace goes to previous box
 *   - Paste fills all boxes
 *   - Numeric-only input
 *   - Accessible (ARIA labels)
 *
 * Usage:
 *   <OTPInput value={code} onChange={setCode} onComplete={(code) => submit(code)} />
 */

import { useRef, useCallback, useEffect, type KeyboardEvent, type ClipboardEvent } from "react"
import { Input } from "@/components/ui/input"

interface OTPInputProps {
  /** Current code value (up to 6 digits) */
  value: string
  /** Called when the code changes */
  onChange: (value: string) => void
  /** Called when all 6 digits are entered */
  onComplete?: (value: string) => void
  /** Number of digits (default 6) */
  length?: number
  /** Disabled state */
  disabled?: boolean
  /** Auto-focus on mount */
  autoFocus?: boolean
}

export function OTPInput({
  value,
  onChange,
  onComplete,
  length = 6,
  disabled = false,
  autoFocus = true,
}: OTPInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Auto-focus the first input on mount
  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus()
    }
  }, [autoFocus])

  // Call onComplete when all digits are filled
  useEffect(() => {
    if (value.length === length && onComplete) {
      onComplete(value)
    }
  }, [value, length, onComplete])

  const setDigit = useCallback(
    (index: number, digit: string) => {
      const chars = value.split("")
      chars[index] = digit
      onChange(chars.join("").slice(0, length))
    },
    [value, onChange, length]
  )

  const handleChange = (index: number, inputValue: string) => {
    // Extract only the last digit typed
    const digit = inputValue.replace(/\D/g, "").slice(-1)
    setDigit(index, digit)

    // Auto-advance to next box
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (value[index]) {
        // Clear current box
        setDigit(index, "")
      } else if (index > 0) {
        // Go to previous box and clear it
        inputRefs.current[index - 1]?.focus()
        setDigit(index - 1, "")
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    } else if (e.key === "Enter" && value.length === length) {
      onComplete?.(value)
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length)
    if (pasted) {
      onChange(pasted)
      // Focus the last filled box or the next empty one
      const nextIndex = Math.min(pasted.length, length - 1)
      inputRefs.current[nextIndex]?.focus()
    }
  }

  return (
    <div className="flex gap-2 sm:gap-3" role="group" aria-label="Verification code input">
      {Array.from({ length }).map((_, i) => (
        <Input
          key={i}
          ref={(el) => {
            inputRefs.current[i] = el
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]"
          maxLength={1}
          value={value[i] || ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          disabled={disabled}
          aria-label={`Digit ${i + 1} of ${length}`}
          className="h-12 w-10 sm:h-14 sm:w-12 text-center text-lg font-semibold sm:text-xl"
        />
      ))}
    </div>
  )
}
