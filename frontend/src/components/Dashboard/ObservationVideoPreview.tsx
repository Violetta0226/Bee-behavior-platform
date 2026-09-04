import { Link } from "@tanstack/react-router"
import { ArrowUpRight, FileVideo, LoaderCircle } from "lucide-react"
import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"

const API_BASE = "/api/v1"

export type ObservationVideoPreviewItem = {
  id: string
  original_filename: string
  scene_type: string
}

type PreviewState = {
  status: "idle" | "loading" | "ready" | "error"
  src: string | null
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("access_token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function useObservationVideoPreview(
  video: ObservationVideoPreviewItem | null,
  enabled: boolean,
): PreviewState {
  const videoId = video?.id
  const [preview, setPreview] = useState<PreviewState>({
    status: "idle",
    src: null,
  })

  useEffect(() => {
    let active = true
    let objectUrl: string | null = null
    const controller = new AbortController()

    if (!videoId || !enabled) {
      setPreview({ status: "idle", src: null })
      return () => controller.abort()
    }

    setPreview({ status: "loading", src: null })

    const loadPreview = async () => {
      try {
        const response = await fetch(`${API_BASE}/videos/${videoId}/file`, {
          headers: getAuthHeaders(),
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`video preview failed: ${response.status}`)
        }

        const blob = await response.blob()
        if (!active) return

        objectUrl = URL.createObjectURL(blob)
        setPreview({ status: "ready", src: objectUrl })
      } catch (error) {
        if (!active || controller.signal.aborted) return
        console.error(error)
        setPreview({ status: "error", src: null })
      }
    }

    void loadPreview()

    return () => {
      active = false
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [enabled, videoId])

  return preview
}

function formatDuration(duration: number) {
  const totalSeconds = Math.floor(duration)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

function getPreviewSeekTime(duration: number) {
  if (!Number.isFinite(duration) || duration <= 0) return 0

  const durationBeforeEnd = Math.max(0, duration - 0.05)
  return Math.min(durationBeforeEnd, Math.max(0.6, duration * 0.12))
}

export function ObservationVideoPreview({
  video,
  displayId,
  sceneLabel,
  secondaryLabel,
  className,
}: {
  video: ObservationVideoPreviewItem | null
  displayId: string
  sceneLabel: string
  secondaryLabel?: string
  className?: string
}) {
  const videoId = video?.id
  const [previewVideoId, setPreviewVideoId] = useState<string | null>(null)
  const [mediaErrorVideoId, setMediaErrorVideoId] = useState<string | null>(
    null,
  )
  const [duration, setDuration] = useState<{
    videoId: string
    value: number
  } | null>(null)
  const preview = useObservationVideoPreview(
    video,
    Boolean(videoId && previewVideoId === videoId),
  )

  if (!video) {
    return (
      <div className={cn("observation-video-empty", className)}>
        <FileVideo className="size-4" aria-hidden="true" />
        <div>
          <strong>暂无观测视频</strong>
          <span>上传一条观测视频后，这里将显示真实观测画面。</span>
        </div>
      </div>
    )
  }

  const showVideo =
    preview.status === "ready" && preview.src && mediaErrorVideoId !== video.id
  const overlayRight =
    duration?.videoId === video.id
      ? formatDuration(duration.value)
      : secondaryLabel

  return (
    <Link
      to="/videos/$videoId"
      params={{ videoId: video.id }}
      className={cn("observation-video-preview", className)}
      aria-label={`查看观测样本 ${displayId}：${video.original_filename}`}
      onPointerEnter={() => setPreviewVideoId(video.id)}
      onFocus={() => setPreviewVideoId(video.id)}
    >
      {showVideo ? (
        <video
          src={preview.src ?? undefined}
          className="observation-video-preview-media"
          muted
          playsInline
          preload="metadata"
          onError={() => setMediaErrorVideoId(video.id)}
          onLoadedMetadata={(event) => {
            const media = event.currentTarget
            if (Number.isFinite(media.duration) && media.duration > 0) {
              setDuration({ videoId: video.id, value: media.duration })
              media.currentTime = getPreviewSeekTime(media.duration)
            }
          }}
        />
      ) : (
        <div className="observation-video-preview-placeholder">
          {preview.status === "loading" ? (
            <>
              <LoaderCircle
                className="size-4 animate-spin"
                aria-hidden="true"
              />
              <span>正在读取真实观测画面</span>
            </>
          ) : (
            <>
              <FileVideo className="size-4" aria-hidden="true" />
              <span>
                {preview.status === "error"
                  ? "预览暂不可用"
                  : "聚焦读取观测画面"}
              </span>
            </>
          )}
        </div>
      )}
      <span className="observation-video-preview-overlay">
        <span>
          {displayId} · {sceneLabel}
        </span>
        {overlayRight && (
          <time className="observation-data tabular-nums">{overlayRight}</time>
        )}
      </span>
      <ArrowUpRight
        className="observation-video-preview-link size-4"
        aria-hidden="true"
      />
    </Link>
  )
}
