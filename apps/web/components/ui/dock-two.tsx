import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface DockProps {
  className?: string
  items: {
    icon: LucideIcon
    label: string
    onClick?: () => void
    isActive?: boolean
  }[]
}

interface DockIconButtonProps {
  icon: LucideIcon
  label: string
  onClick?: () => void
  isActive?: boolean
  className?: string
}

const floatingAnimation = {
  initial: { y: 0 },
  animate: {
    y: [-2, 2, -2],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
}

const DockIconButton = React.forwardRef<HTMLButtonElement, DockIconButtonProps>(
  ({ icon: Icon, label, onClick, isActive, className }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.15, y: -4 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
          className={cn(
            "relative group p-3.5 rounded-[11px] transition-all duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)]",
          isActive
            ? "bg-[#FF98A2]/10 text-[#FF98A2]"
            : "hover:bg-white/5 text-[#8C8C8C] hover:text-[#EFEFEF]",
          className
        )}
      >
        <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.5} />
        <span className={cn(
          "absolute -top-9 left-1/2 -translate-x-1/2",
          "px-2.5 py-1 rounded-[4px] text-[11px] font-medium",
          "bg-[#181818] text-[#EFEFEF] border border-white/10 shadow-lg",
          "opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100",
          "transition-all duration-200 whitespace-nowrap pointer-events-none"
        )}>
          {label}
        </span>
        {isActive && (
          <motion.div
            layoutId="dock-active"
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#FF98A2]"
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        )}
      </motion.button>
    )
  }
)
DockIconButton.displayName = "DockIconButton"

const Dock = React.forwardRef<HTMLDivElement, DockProps>(
  ({ items, className }, ref) => {
    return (
      <div ref={ref} className={cn("fixed bottom-6 left-1/2 -translate-x-1/2 z-50", className)}>
        <motion.div
          initial="initial"
          animate="animate"
          variants={floatingAnimation}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-[16px]",
            "backdrop-blur-sm border border-white/10",
            "bg-[#000000]/90",
            "hover:shadow-[0_8px_40px_rgba(255,152,162,0.1)] transition-shadow duration-[0.6s]"
          )}
        >
          {items.map((item) => (
            <DockIconButton key={item.label} {...item} />
          ))}
        </motion.div>
      </div>
    )
  }
)
Dock.displayName = "Dock"

export { Dock }
