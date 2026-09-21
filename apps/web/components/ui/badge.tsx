import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-[4px] border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-all duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-[#FF98A2]/30 bg-[#FF98A2]/10 text-[#FF98A2]",
        secondary:
          "border-white/10 bg-[#181818] text-[#8C8C8C]",
        destructive:
          "border-[#FF98A2]/30 bg-[#FF98A2]/15 text-[#FF98A2]",
        outline:
          "border-white/10 text-[#8C8C8C] bg-transparent",
        success:
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
        warning:
          "border-amber-500/30 bg-amber-500/10 text-amber-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
