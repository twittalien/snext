import type { CSSProperties } from "react";
import {
  Badge,
  Card,
  PlatformBadge,
  ProgressBar,
} from "../../../components/ui";
import { getPlatformInfo } from "../../../services/platformCatalog";
import "./GameHero.css";

export type GameHeroData = {
  title: string;
  logo?: string;
  heroImage?: string;
  coverImage?: string;
  platform: string;
  source: string;
  description: string;
  playtimeHours?: number;
  progress?: number;
  rating?: number;
  ratingLabel?: string;
  status?: "playing" | "recent" | "idle";
  platformHint?: string;
};

type GameHeroProps = {
  game: GameHeroData;
  className?: string;
};

function StarRating({ rating }: { rating: number }) {
  const safeRating = Math.min(5, Math.max(0, rating));
  const roundedRating = Math.round(safeRating);

  return (
    <span
      className="game-hero__stars"
      aria-label={`${safeRating} de 5 estrellas`}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <span
          className={
            index < roundedRating
              ? "game-hero__star game-hero__star--active"
              : "game-hero__star"
          }
          aria-hidden="true"
          key={index}
        >
          ★
        </span>
      ))}
    </span>
  );
}

export function GameHero({
  game,
  className,
}: GameHeroProps) {
  const progress = Math.min(100, Math.max(0, game.progress ?? 0));
  const hasHeroImage = Boolean(game.heroImage);
  const hasCoverImage = Boolean(game.coverImage);
  const platformInfo = getPlatformInfo(
    `${game.platform} ${game.source} ${game.platformHint ?? ""}`,
  );

  return (
    <Card
      className={[
        "game-hero",
        hasHeroImage
          ? "game-hero--with-art"
          : "game-hero--fallback",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      padding="none"
      overflow="visible"
    >
      <div className="game-hero__frame">
        {hasHeroImage && (
          <img
            className="game-hero__background"
            src={game.heroImage}
            alt=""
          />
        )}

        <div className="game-hero__wash" />
        <div className="game-hero__pattern" aria-hidden="true">
          <span>＋</span>
          <span>×</span>
          <span>○</span>
          <span>□</span>
        </div>

        <div className="game-hero__platform-stack" aria-hidden="true">
          {[platformInfo, getPlatformInfo("steam"), getPlatformInfo("retroarch")]
            .filter(
              (info, index, list) =>
                list.findIndex((item) => item.key === info.key) === index,
            )
            .slice(0, 3)
            .map((info, index) => (
              <span
                key={info.key}
                style={{
                  "--platform-color": info.color,
                  "--platform-bg": info.background,
                  "--stack-index": index,
                } as CSSProperties}
              >
                <b>{info.glyph}</b>
              </span>
            ))}
        </div>

        <div className="game-hero__content">
          <div className="game-hero__header">
            <p className="snext-eyebrow">Juego activo</p>

            <Badge
              tone={game.status === "playing" ? "success" : "neutral"}
              dot={game.status === "playing"}
            >
              {game.status === "playing"
                ? "En juego"
                : game.status === "recent"
                  ? "Reciente"
                  : "Disponible"}
            </Badge>
          </div>

          <div className="game-hero__game-row">
            {hasCoverImage && (
              <div className="game-hero__cover game-hero__cover--image">
                <img src={game.coverImage} alt={`${game.title} portada`} />
              </div>
            )}

            <div className="game-hero__identity">
              {game.logo ? (
                <img
                  className="game-hero__logo"
                  src={game.logo}
                  alt={game.title}
                />
              ) : (
                <h1>{game.title}</h1>
              )}

              <div className="game-hero__meta">
                <PlatformBadge
                  platform={`${game.platform} ${game.source} ${game.platformHint ?? ""}`}
                  label={platformInfo.name}
                />
                <i aria-hidden="true" />
                <span>{game.platform}</span>
                <i aria-hidden="true" />
                <span>{game.source}</span>
              </div>
            </div>
          </div>

          <p className="game-hero__description">{game.description}</p>

          <div className="game-hero__rating">
            {typeof game.rating === "number" && (
              <StarRating rating={game.rating} />
            )}

            {game.ratingLabel && <span>{game.ratingLabel}</span>}
          </div>

          <div className="game-hero__footer">
            {typeof game.playtimeHours === "number" && (
              <div className="game-hero__stat">
                <strong>{game.playtimeHours} h</strong>
                <span>Tiempo jugado</span>
              </div>
            )}

            <div className="game-hero__progress">
              <div>
                <span>Progreso</span>
                <strong>{Math.round(progress)}%</strong>
              </div>

              <ProgressBar
                value={progress}
                size="medium"
                tone="brand"
              />
            </div>
          </div>
        </div>

      </div>
    </Card>
  );
}
