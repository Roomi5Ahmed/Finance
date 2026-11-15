import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-[#01472e] text-white hover:bg-[#01472e]/90",
        destructive:
          "bg-transparent text-[#01472e] border border-[#01472e]/30 hover:bg-[#01472e]/10",
        outline:
          "border border-[#01472e]/40 bg-transparent text-[#01472e] hover:bg-[#01472e]/10",
        secondary:
          "bg-[#ffffff] text-[#01472e] border border-[#dde3d0] hover:border-[#01472e]/30",
        ghost:
          "text-[#64705f] hover:text-[#01472e] hover:bg-[#f6f8f1]",
        link:
          "text-[#01472e] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3 rounded-[16px]",
        sm: "h-8 rounded-[11px] gap-1.5 px-3 text-xs has-[>svg]:px-2.5",
        lg: "h-[66px] rounded-[16px] px-6 has-[>svg]:px-4",
        icon: "size-9 rounded-[16px]",
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
