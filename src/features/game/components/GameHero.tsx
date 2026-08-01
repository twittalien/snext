import {
  Card,
  PlatformBadge,
  ProgressBar,
  RemoteImage,
} from "../../../components/ui";
import type { CSSProperties } from "react";
import { getPlatformInfo } from "../../../services/platformCatalog";
import "./GameHero.css";

export type GameHeroData = {
  title: string;
  logo?: string;
  heroImage?: string;
  heroImages?: string[];
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
  const heroImages =
    game.heroImages && game.heroImages.length > 0
      ? game.heroImages
      : game.heroImage
        ? [game.heroImage]
        : [];
  const hasHeroImage = heroImages.length > 0;
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
          <div
            className={[
              "game-hero__backgrounds",
              heroImages.length > 1 && "game-hero__backgrounds--carousel",
            ]
              .filter(Boolean)
              .join(" ")}
            style={
              {
                "--game-hero-slide-count": heroImages.length,
              } as CSSProperties
            }
            aria-hidden="true"
          >
            {heroImages.map((heroImage, index) => (
              <RemoteImage
                className="game-hero__background"
                src={heroImage}
                fallbackSrc="/demo/game/hero.svg"
                alt=""
                key={`${heroImage}-${index}`}
                style={
                  {
                    "--game-hero-slide-index": index,
                  } as CSSProperties
                }
              />
            ))}
          </div>
        )}

        <div className="game-hero__wash" />
        <div className="game-hero__pattern" aria-hidden="true">
          <span>＋</span>
          <span>×</span>
          <span>○</span>
          <span>□</span>
        </div>

        <div className="game-hero__content">
          <div className="game-hero__header">
            <p className="snext-eyebrow">Juego activo</p>
          </div>

          <div className="game-hero__game-row">
            {hasCoverImage && (
              <div className="game-hero__cover game-hero__cover--image">
                <RemoteImage
                  src={game.coverImage}
                  fallbackSrc="/demo/game/cover.svg"
                  alt={`${game.title} portada`}
                />
              </div>
            )}

            <div className="game-hero__identity">
              {game.logo ? (
                <RemoteImage
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
