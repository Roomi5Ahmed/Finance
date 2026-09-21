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
          "bg-[#FF98A2] text-[#000000] hover:bg-[#FF98A2]/90",
        destructive:
          "bg-transparent text-[#FF98A2] border border-[#FF98A2]/30 hover:bg-[#FF98A2]/10",
        outline:
          "border border-[#FF98A2]/40 bg-transparent text-[#EFEFEF] hover:bg-[#FF98A2]/10",
        secondary:
          "bg-[#181818] text-[#EFEFEF] border border-white/10 hover:border-[#FF98A2]/30",
        ghost:
          "text-[#8C8C8C] hover:text-[#EFEFEF] hover:bg-white/5",
        link:
          "text-[#FF98A2] underline-offset-4 hover:underline",
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
