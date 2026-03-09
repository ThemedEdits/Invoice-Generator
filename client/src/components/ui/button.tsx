import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // ── Base ──────────────────────────────────────────────────────────────────
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold",
    "transition-all duration-200 ease-out",
    "focus-visible:outline-none focus-visible:ring-0",
    "disabled:pointer-events-none disabled:opacity-40",
    "active:scale-[0.97]",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        // ── Primary — amber gold ───────────────────────────────────────────
        default: [
          "bg-amber-400 text-slate-900 border border-amber-400",
          "hover:bg-amber-300 hover:border-amber-300",
          "hover:-translate-y-px",
          "shadow-md shadow-amber-400/20",
          "hover:shadow-lg hover:shadow-amber-400/30",
        ].join(" "),

        // ── Destructive ────────────────────────────────────────────────────
        destructive: [
          "bg-red-500/10 text-red-400 border border-red-500/20",
          "hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-300",
          "hover:-translate-y-px",
          "shadow-sm shadow-red-500/10",
          "hover:shadow-md hover:shadow-red-500/20",
        ].join(" "),

        // ── Outline ────────────────────────────────────────────────────────
        outline: [
          "bg-transparent text-slate-300 border border-white/[0.10]",
          "hover:bg-white/[0.06] hover:border-white/[0.18] hover:text-white",
          "hover:-translate-y-px",
          "shadow-sm shadow-black/20",
          "hover:shadow-md hover:shadow-black/30",
        ].join(" "),

        // ── Secondary ──────────────────────────────────────────────────────
        secondary: [
          "bg-white/[0.06] text-slate-300 border border-white/[0.08]",
          "hover:bg-white/[0.10] hover:border-white/[0.15] hover:text-white",
          "hover:-translate-y-px",
        ].join(" "),

        // ── Ghost ──────────────────────────────────────────────────────────
        ghost: [
          "bg-transparent text-slate-400 border border-transparent",
          "hover:bg-white/[0.06] hover:text-white hover:border-white/[0.06]",
        ].join(" "),

        // ── Link ───────────────────────────────────────────────────────────
        link: [
          "bg-transparent text-amber-400 border border-transparent underline-offset-4",
          "hover:underline hover:text-amber-300",
        ].join(" "),
      },

      size: {
        default: "min-h-9 px-4 py-2",
        sm:      "min-h-8 rounded-md px-3 text-xs",
        lg:      "min-h-11 rounded-xl px-8 text-base",
        icon:    "h-9 w-9 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size:    "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }