import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "placeholder:text-[#8C8C8C] border-white/10 bg-[#000000] flex h-9 w-full min-w-0 rounded-[11px] border px-3 py-1 text-sm text-[#EFEFEF] shadow-sm transition-all duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus:border-[#FF98A2]/50 focus:ring-1 focus:ring-[#FF98A2]/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
