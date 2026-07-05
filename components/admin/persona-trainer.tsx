"use client"

import { useState } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { CheckCircle2, Clock, Loader2, Video, XCircle } from "lucide-react"
import { PersonaAvatar } from "@/components/persona-avatar"
import { accent } from "@/lib/client/accents"
import type { Persona, PersonaProfile, TrainedVideo, TrainingStatus } from "@/lib/personas/types"
import { cn } from "@/lib/utils"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const statusIcon: Record<TrainingStatus, React.ReactNode> = {
  pending: <Clock className="size-3.5 text-muted-foreground" />,
  processing: <Loader2 className="size-3.5 animate-spin text-amber-400" />,
  trained: <CheckCircle2 className="size-3.5 text-emerald-400" />,
  failed: <XCircle className="size-3.5 text-rose-400" />,
}

export function PersonaTrainer({
  personaId,
  onChange,
}: {
  personaId: string
  onChange: () => void
}) {
  const { data, isLoading, mutate } = useSWR<{ persona: Persona }>(
    `/api/personas/${personaId}`,
    fetcher,
  )
  const persona = data?.persona
  const [url, setUrl] = useState("")
  const [training, setTraining] = useState(false)

  const refresh = () => {
    mutate()
    onChange()
  }

  const train = async () => {
    if (!url.trim()) return
    setTraining(true)
    try {
      const res = await fetch("/api/train", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ personaId, url: url.trim() }),
      })
      const body = await res.json()
      if (!res.ok) {
        toast.error(body.error ?? "Training failed.")
      } else {
        toast.success(body.message ?? `Draft v${body.version?.version} created. Review and publish.`)
        setUrl("")
      }
    } catch {
      toast.error("Training request failed.")
    } finally {
      setTraining(false)
      refresh()
    }
  }

  const publish = async (version: number) => {
    try {
      const res = await fetch(`/api/personas/${personaId}/publish`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ version }),
      })
      const body = await res.json()
      if (!res.ok) {
        toast.error(body.error ?? "Publish failed.")
      } else {
        toast.success(`v${version} is now live.`)
      }
    } catch {
      toast.error("Publish request failed.")
    } finally {
      refresh()
    }
  }

  if (isLoading || !persona) {
    return <div className="h-64 animate-pulse rounded-xl bg-muted" />
  }

  const a = accent(persona.config.accent)
  const activeVersion = persona.config.activeProfileVersion

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
        <PersonaAvatar
          src={persona.config.avatar}
          name={persona.config.displayName}
          accentName={persona.config.accent}
          size={48}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className={cn("text-base font-semibold", a.text)}>{persona.config.displayName}</h2>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[0.65rem] font-medium",
                persona.config.published
                  ? cn(a.bgSoft, a.text)
                  : "bg-muted text-muted-foreground",
              )}
            >
              {persona.config.published ? `v${activeVersion} live` : "unpublished"}
            </span>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {persona.config.tagline || "No tagline yet"}
          </p>
        </div>
      </div>

      {/* Train with a new video (BRD 5.3) */}
      <section className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Video className="size-4 text-rose-400" />
          <h3 className="text-sm font-semibold">Train with a YouTube video</h3>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          Paste a video URL. We fetch the transcript, extract style attributes, and create a new{" "}
          <span className="font-medium text-foreground">unpublished</span> profile version for
          review.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229) train()
            }}
            placeholder="https://www.youtube.com/watch?v=..."
            disabled={training}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
          />
          <button
            onClick={train}
            disabled={training || !url.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {training ? <Loader2 className="size-4 animate-spin" /> : null}
            {training ? "Training…" : "Train"}
          </button>
        </div>
      </section>

      {/* Profile versions (BRD 5.3) */}
      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold">Profile versions</h3>
        <div className="flex flex-col gap-2">
          {persona.versions
            .slice()
            .sort((x, y) => y.version - x.version)
            .map((v) => (
              <VersionRow
                key={v.version}
                profile={v}
                isActive={v.version === activeVersion}
                accentText={a.text}
                accentSoft={a.bgSoft}
                onPublish={() => publish(v.version)}
              />
            ))}
        </div>
      </section>

      {/* Trained videos registry */}
      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold">Trained videos</h3>
        {persona.videos.length === 0 ? (
          <p className="text-xs text-muted-foreground">No videos trained yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {persona.videos.map((video) => (
              <VideoRow key={video.videoId} video={video} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function VersionRow({
  profile,
  isActive,
  accentText,
  accentSoft,
  onPublish,
}: {
  profile: PersonaProfile
  isActive: boolean
  accentText: string
  accentSoft: string
  onPublish: () => void
}) {
  const isEmpty =
    profile.trademarkPhrases.length === 0 &&
    profile.sampleQA.length === 0 &&
    profile.personalityTraits.length === 0

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border p-3",
        isActive ? cn(accentSoft, "border-transparent") : "border-border bg-background",
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn("text-sm font-semibold", isActive && accentText)}>
            v{profile.version}
          </span>
          {isActive && <span className={cn("text-[0.65rem] font-medium", accentText)}>LIVE</span>}
          {isEmpty && <span className="text-[0.65rem] text-muted-foreground">empty</span>}
        </div>
        <div className="mt-0.5 text-[0.7rem] text-muted-foreground">
          {profile.trademarkPhrases.length} phrases · {profile.sampleQA.length} Q&amp;A ·{" "}
          {profile.personalityTraits.length} traits
        </div>
      </div>
      {!isActive && (
        <button
          onClick={onPublish}
          disabled={isEmpty}
          className="shrink-0 rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-40"
        >
          Publish
        </button>
      )}
    </div>
  )
}

function VideoRow({ video }: { video: TrainedVideo }) {
  return (
    <li className="flex items-center gap-2 rounded-lg border border-border bg-background p-2.5">
      <span className="shrink-0">{statusIcon[video.status]}</span>
      <a
        href={video.url}
        target="_blank"
        rel="noreferrer"
        className="min-w-0 flex-1 truncate text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        {video.title}
      </a>
      {video.mergedIntoVersion ? (
        <span className="shrink-0 text-[0.65rem] text-muted-foreground">
          → v{video.mergedIntoVersion}
        </span>
      ) : null}
      {video.status === "failed" && video.error ? (
        <span
          className="max-w-[40%] shrink-0 truncate text-[0.65rem] text-rose-400"
          title={video.error}
        >
          {video.error}
        </span>
      ) : null}
    </li>
  )
}
