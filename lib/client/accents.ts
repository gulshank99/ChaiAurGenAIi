// Maps a persona accent name to a fixed set of Tailwind utility classes.
// Static strings so Tailwind's compiler can see them.

export interface AccentClasses {
  dot: string
  text: string
  border: string
  ring: string
  bgSoft: string
  bubble: string
  gradient: string
}

const ACCENTS: Record<string, AccentClasses> = {
  amber: {
    dot: "bg-amber-400",
    text: "text-amber-400",
    border: "border-amber-400/40",
    ring: "ring-amber-400/50",
    bgSoft: "bg-amber-400/10",
    bubble: "bg-amber-400/10 border-amber-400/25",
    gradient: "from-amber-400/20",
  },
  sky: {
    dot: "bg-sky-400",
    text: "text-sky-400",
    border: "border-sky-400/40",
    ring: "ring-sky-400/50",
    bgSoft: "bg-sky-400/10",
    bubble: "bg-sky-400/10 border-sky-400/25",
    gradient: "from-sky-400/20",
  },
  emerald: {
    dot: "bg-emerald-400",
    text: "text-emerald-400",
    border: "border-emerald-400/40",
    ring: "ring-emerald-400/50",
    bgSoft: "bg-emerald-400/10",
    bubble: "bg-emerald-400/10 border-emerald-400/25",
    gradient: "from-emerald-400/20",
  },
  rose: {
    dot: "bg-rose-400",
    text: "text-rose-400",
    border: "border-rose-400/40",
    ring: "ring-rose-400/50",
    bgSoft: "bg-rose-400/10",
    bubble: "bg-rose-400/10 border-rose-400/25",
    gradient: "from-rose-400/20",
  },
}

export function accent(name: string): AccentClasses {
  return ACCENTS[name] ?? ACCENTS.emerald
}
