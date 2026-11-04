import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] active:translate-y-0.5",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Polaris & Vercel Luxury Aura Variants
        auraCyan:
          "bg-gradient-to-b from-sky-400 via-sky-600 to-sky-700 text-white border border-sky-300/40 shadow-[0_4px_14px_-1px_rgba(56,189,248,0.75),0_12px_28px_-4px_rgba(2,132,199,0.55),0_0_22px_rgba(56,189,248,0.45)] hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_6px_22px_-1px_rgba(56,189,248,1),0_18px_42px_-4px_rgba(2,132,199,0.85),0_0_40px_rgba(56,189,248,0.75)] hover:brightness-110",
        auraDanger:
          "bg-gradient-to-b from-rose-500 via-rose-600 to-rose-800 text-white border border-rose-300/40 shadow-[0_4px_14px_-1px_rgba(244,63,94,0.75),0_12px_28px_-4px_rgba(225,29,72,0.55),0_0_20px_rgba(244,63,94,0.4)] hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_6px_22px_-1px_rgba(244,63,94,1),0_18px_44px_-4px_rgba(225,29,72,0.85),0_0_38px_rgba(244,63,94,0.75)] hover:brightness-110",
        auraEmerald:
          "bg-gradient-to-b from-emerald-500 via-emerald-600 to-emerald-800 text-white border border-emerald-300/40 shadow-[0_4px_14px_-1px_rgba(16,185,129,0.75),0_12px_28px_-4px_rgba(5,150,105,0.55),0_0_22px_rgba(16,185,129,0.45)] hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_6px_22px_-1px_rgba(16,185,129,1),0_18px_42px_-4px_rgba(5,150,105,0.85),0_0_40px_rgba(16,185,129,0.75)] hover:brightness-110",
        auraAmber:
          "bg-gradient-to-b from-amber-500 via-amber-600 to-amber-800 text-white border border-amber-300/40 shadow-[0_4px_14px_-1px_rgba(245,158,11,0.75),0_12px_28px_-4px_rgba(217,119,6,0.55),0_0_22px_rgba(245,158,11,0.45)] hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_6px_22px_-1px_rgba(245,158,11,1),0_18px_44px_-4px_rgba(217,119,6,0.85),0_0_40px_rgba(245,158,11,0.75)] hover:brightness-110",
        auraPurple:
          "bg-gradient-to-b from-purple-500 via-purple-600 to-purple-800 text-white border border-purple-300/40 shadow-[0_4px_14px_-1px_rgba(168,85,247,0.8),0_12px_28px_-4px_rgba(124,58,237,0.6),0_0_24px_rgba(168,85,247,0.5)] hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_6px_22px_-1px_rgba(168,85,247,1),0_18px_44px_-4px_rgba(124,58,237,0.9),0_0_42px_rgba(168,85,247,0.8)] hover:brightness-110",
        auraGlass:
          "bg-white/10 backdrop-blur-md text-slate-100 border border-white/20 shadow-[0_4px_14px_-2px_rgba(0,0,0,0.6),0_10px_24px_-4px_rgba(0,0,0,0.4)] hover:-translate-y-1 hover:scale-[1.02] hover:bg-white/15 hover:border-sky-400/50 hover:shadow-[0_6px_20px_-1px_rgba(0,0,0,0.7),0_14px_32px_-4px_rgba(56,189,248,0.35),0_0_22px_rgba(56,189,248,0.3)]",
        rainbow:
          "bg-slate-950 text-white border border-white/25 shadow-[0_4px_16px_-2px_rgba(56,189,248,0.45),0_12px_30px_-4px_rgba(168,85,247,0.4),0_0_22px_rgba(244,63,94,0.3)] hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_6px_22px_-1px_rgba(56,189,248,0.7),0_18px_45px_-4px_rgba(168,85,247,0.65),0_0_35px_rgba(244,63,94,0.55)] hover:brightness-115",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
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
