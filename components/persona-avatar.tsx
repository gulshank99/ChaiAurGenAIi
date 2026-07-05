import Image from "next/image"
import { accent } from "@/lib/client/accents"
import { cn } from "@/lib/utils"

export function PersonaAvatar({
  src,
  name,
  accentName,
  size = 40,
  className,
}: {
  src: string
  name: string
  accentName: string
  size?: number
  className?: string
}) {
  const a = accent(accentName)
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 ring-2 ring-offset-2 ring-offset-background select-none",
        a.border,
        a.ring,
        className,
      )}
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image
          src={src}
          alt={name}
          width={size}
          height={size}
          className="object-cover"
          onError={(e) => {
            // Hide broken image, show initials fallback via sibling
            ;(e.target as HTMLImageElement).style.display = "none"
          }}
        />
      ) : null}
      {/* Initials fallback — always rendered but hidden when image loads */}
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center font-semibold text-muted-foreground",
          a.bgSoft,
        )}
        style={{ fontSize: size * 0.38 }}
        aria-hidden="true"
      >
        {initials}
      </span>
    </span>
  )
}
