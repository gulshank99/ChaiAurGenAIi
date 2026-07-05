import { GraduationCap, Layers, Rocket } from "lucide-react"
import type { SkillLevel } from "@/lib/personas/types"
import { cn } from "@/lib/utils"

const MAP: Record<SkillLevel, { label: string; icon: typeof Rocket; cls: string }> = {
  beginner: {
    label: "Beginner",
    icon: GraduationCap,
    cls: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  },
  intermediate: {
    label: "Intermediate",
    icon: Layers,
    cls: "text-sky-400 border-sky-400/30 bg-sky-400/10",
  },
  advanced: {
    label: "Advanced",
    icon: Rocket,
    cls: "text-amber-400 border-amber-400/30 bg-amber-400/10",
  },
}

// export function SkillBadge({ level, className }: { level: SkillLevel; className?: string }) {
//   const { label, icon: Icon, cls } = MAP[level]
//   return (
//     <span
//       className={cn(
//         "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.7rem] font-medium",
//         cls,
//         className,
//       )}
//       title={`Detected skill level: ${label}`}
//     >
//       <Icon className="size-3" />
//       {label}
//     </span>
//   )
// }

export function SkillBadge({
  level,
  className,
}: { level?: SkillLevel; className?: string }) {
  // If the level is missing or invalid, render nothing (or a fallback UI)
  const entry = level && MAP[level]
  if (!entry) return null   // ← prevents the destructuring error

  const { label, icon: Icon, cls } = entry
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.7rem] font-medium",
        cls,
        className,
      )}
      title={`Detected skill level: ${label}`}
    >
      <Icon className="size-3" />
      {label}
    </span>
  )
}