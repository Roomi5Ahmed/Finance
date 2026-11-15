import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "placeholder:text-[#64705f] border-[#dde3d0] bg-[#f6f8f1] flex h-9 w-full min-w-0 rounded-[11px] border px-3 py-1 text-sm text-[#01472e] shadow-sm transition-all duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus:border-[#01472e]/50 focus:ring-1 focus:ring-[#01472e]/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
