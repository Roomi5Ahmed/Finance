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
          "border-[#01472e]/30 bg-[#01472e]/10 text-[#01472e]",
        secondary:
          "border-[#dde3d0] bg-[#ffffff] text-[#64705f]",
        destructive:
          "border-[#01472e]/30 bg-[#01472e]/15 text-[#01472e]",
        outline:
          "border-[#dde3d0] text-[#64705f] bg-transparent",
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
