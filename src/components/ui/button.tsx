import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-sm font-semibold transition-all duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-fcs-brand text-white hover:bg-[#9B5A64]",
        destructive: "bg-[#D64045] text-white hover:bg-[#BC3035] focus-visible:ring-[#D64045]/20",
        outline: "border-2 border-fcs-brand bg-transparent text-fcs-brand-text hover:bg-fcs-brand hover:text-white",
        secondary: "bg-[#1a1a1a] text-white hover:bg-black",
        ghost: "text-[#666666] hover:bg-[#F5F5F5] hover:text-[#1a1a1a]",
        link: "text-primary underline-offset-4 hover:underline",
        // Umweto: filled brand button. brand-strong because white text on the
        // lighter brand rose is only 3.80:1 and fails AA for normal text.
        'fcs-primary': 'bg-fcs-brand-strong text-white shadow-fcs-2 hover:bg-fcs-brand-strong-hover',
        // Umweto: WhatsApp action. Breathing pulse is opt-out under reduced motion.
        'fcs-whatsapp': 'bg-fcs-whatsapp text-white shadow-fcs-glow-wa hover:bg-fcs-whatsapp-hover motion-safe:animate-[fcs-breathe_3.2s_ease-in-out_infinite]',
      },
      size: {
        // Umweto: 56px primary action target for mobile-first tapping.
        'fcs-xl': 'min-h-14 rounded-full px-8 text-base font-semibold',
        default: "h-11 px-5 py-2 has-[>svg]:px-4",
        sm: "h-10 gap-1.5 px-4 text-[13px] has-[>svg]:px-3",
        lg: "h-12 px-6 has-[>svg]:px-5",
        icon: "size-11 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
