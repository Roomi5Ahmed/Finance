import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "placeholder:text-slate-500 border-white/10 bg-[#0B1121] flex h-9 w-full min-w-0 rounded-lg border px-3 py-1 text-sm text-white shadow-sm transition-colors outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
