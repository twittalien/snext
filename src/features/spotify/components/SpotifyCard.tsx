import { useEffect, useMemo, useState } from "react";
import { Card, ProgressBar } from "../../../components/ui";
import "./SpotifyCard.css";

export type SpotifyTrack = {
  title: string;
  artist: string;
  album?: string;
  artwork?: string;
  progressMs: number;
  durationMs: number;
  isPlaying: boolean;
  device?: string;
  explicit?: boolean;
};

type SpotifyCardProps = {
  track?: SpotifyTrack;
  connected?: boolean;
  className?: string;
  aiOptions?: {
    ollamaUrl: string;
    ollamaModel: string;
    language: "es" | "en" | "pt";
  };
};

function formatTime(milliseconds: number) {
  const safeMilliseconds = Math.max(0, milliseconds);
  const totalSeconds = Math.floor(safeMilliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function SpotifyCard({
  track,
  connected = true,
  className,
  aiOptions,
}: SpotifyCardProps) {
  const hasTrack = connected && Boolean(track);
  const [tick, setTick] = useState(Date.now());
  const [musicInsight, setMusicInsight] = useState("");
  const trackKey = hasTrack
    ? `${track!.title}:${track!.artist}:${track!.album ?? ""}`
    : "";
  const receivedAt = useMemo(() => Date.now(), [trackKey, track?.progressMs]);

  useEffect(() => {
    if (!hasTrack || !track!.isPlaying) {
      return;
    }

    const timer = window.setInterval(() => setTick(Date.now()), 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [hasTrack, track?.isPlaying, trackKey]);

  useEffect(() => {
    setTick(Date.now());
  }, [trackKey, track?.progressMs]);

  useEffect(() => {
    if (!hasTrack || !aiOptions?.ollamaUrl.trim() || !aiOptions.ollamaModel.trim()) {
      setMusicInsight("");
      return;
    }

    const cacheKey = `snext-song-insight:${aiOptions.language}:${trackKey}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      setMusicInsight(cached);
      return;
    }

    let active = true;
    const languageName =
      aiOptions.language === "en"
        ? "English"
        : aiOptions.language === "pt"
          ? "Portuguese"
          : "Spanish";
    const prompt = [
      `Answer in ${languageName}.`,
      "You are Snext, a concise gaming companion on a secondary monitor.",
      "Give one interesting, factual-sounding music note about the current song, artist, album, genre or listening context.",
      "If you are not certain, phrase it as a listening suggestion instead of inventing facts.",
      "Keep it under 32 words.",
      `Song: ${track!.title}`,
      `Artist: ${track!.artist}`,
      `Album: ${track!.album ?? "Unknown"}`,
    ].join("\n");

    fetch(`${aiOptions.ollamaUrl.replace(/\/$/, "")}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: aiOptions.ollamaModel,
        prompt,
        stream: false,
      }),
    })
      .then((response) => response.ok ? response.json() : null)
      .then((data: { response?: string } | null) => {
        const body = data?.response?.trim();

        if (active && body) {
          localStorage.setItem(cacheKey, body);
          setMusicInsight(body);
        }
      })
      .catch(() => {
        if (active) {
          setMusicInsight("");
        }
      });

    return () => {
      active = false;
    };
  }, [aiOptions?.language, aiOptions?.ollamaModel, aiOptions?.ollamaUrl, hasTrack, trackKey]);

  const progress = hasTrack
    ? Math.min(
        track!.durationMs,
        Math.max(
          0,
          track!.progressMs +
            (track!.isPlaying ? Math.max(0, tick - receivedAt) : 0),
        ),
      )
    : 0;

  const percentage =
    hasTrack && track!.durationMs > 0
      ? (progress / track!.durationMs) * 100
      : 0;

  return (
    <Card
      className={["spotify-v2", className]
        .filter(Boolean)
        .join(" ")}
      tone="dark"
      padding="none"
    >
      {hasTrack && track!.artwork && (
        <>
          <img
            className="spotify-v2__background"
            src={track!.artwork}
            alt=""
          />
          <div className="spotify-v2__background-wash" />
        </>
      )}

      <div className="spotify-v2__noise" aria-hidden="true" />

      <header className="spotify-v2__header">
        <div className="spotify-v2__brand">
          <span className="spotify-v2__brand-icon">
            <img
              src="/brands/spotify/icon.png"
              alt="Spotify"
              aria-hidden="true"
            />
          </span>

          <div>
            <span>Spotify</span>
            <strong>
              {!connected
                ? "No conectado"
                : hasTrack
                  ? track!.isPlaying
                    ? "Reproduciendo ahora"
                    : "En pausa"
                  : "Sin reproducción"}
            </strong>
          </div>
        </div>

        {hasTrack && (
          <span
            className={[
              "spotify-v2__playing-indicator",
              track!.isPlaying
                ? "spotify-v2__playing-indicator--active"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-label={
              track!.isPlaying ? "Reproduciendo" : "En pausa"
            }
          >
            <i />
            <i />
            <i />
            <i />
          </span>
        )}
      </header>

      {hasTrack ? (
        <div className="spotify-v2__content">
          <div className="spotify-v2__artwork-wrap">
            {track!.artwork ? (
              <img
                className="spotify-v2__artwork"
                src={track!.artwork}
                alt={`Portada de ${track!.title}`}
              />
            ) : (
              <div className="spotify-v2__artwork spotify-v2__artwork--fallback">
                SN
              </div>
            )}

            <span
              className="spotify-v2__artwork-glow"
              aria-hidden="true"
            />
          </div>

          <div className="spotify-v2__track">
            <div className="spotify-v2__identity">
              <div>
                <div className="spotify-v2__title-row">
                  <h2>{track!.title}</h2>

                  {track!.explicit && (
                    <span
                      className="spotify-v2__explicit"
                      aria-label="Contenido explícito"
                    >
                      E
                    </span>
                  )}
                </div>

                <p>{track!.artist}</p>

                {track!.album && (
                  <span className="spotify-v2__album">
                    {track!.album}
                  </span>
                )}
              </div>
            </div>

            <div className="spotify-v2__progress">
              <ProgressBar
                value={percentage}
                size="medium"
                tone="success"
              />

              <div className="spotify-v2__time">
                <span>{formatTime(progress)}</span>
                <span>{formatTime(track!.durationMs)}</span>
              </div>
            </div>

            <footer className="spotify-v2__footer">
              <span>
                {track!.isPlaying ? "Sonando en" : "Pausado en"}
              </span>

              <strong>{track!.device ?? "Spotify"}</strong>
            </footer>

            <aside className="spotify-v2__insight">
              <span>Ollama</span>
              <p>
                {musicInsight ||
                  `Escucha los cambios de ritmo y mezcla de ${track!.artist}; Snext añadirá contexto musical cuando Ollama responda.`}
              </p>
            </aside>
          </div>
        </div>
      ) : (
        <div className="spotify-v2__empty">
          <span className="spotify-v2__empty-symbol" aria-hidden="true">
            ♫
          </span>

          <div>
            <h2>
              {connected
                ? "No hay música reproduciéndose"
                : "Conecta tu cuenta de Spotify"}
            </h2>

            <p>
              {connected
                ? "La próxima canción aparecerá aquí automáticamente."
                : "Puedes conectar Spotify desde Configuración."}
            </p>
          </div>
        </div>
      )}

      <div className="spotify-v2__ambient-bars" aria-hidden="true">
        {Array.from({ length: 24 }, (_, index) => (
          <i
            key={index}
            style={{
              height: `${18 + ((index * 29) % 78)}%`,
              animationDelay: `${index * -90}ms`,
            }}
          />
        ))}
      </div>
    </Card>
  );
}
