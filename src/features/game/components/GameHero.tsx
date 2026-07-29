import { Badge, Card, ProgressBar } from "../../../components/ui";
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
              <span>{game.platform}</span>
              <i aria-hidden="true" />
              <span>{game.source}</span>
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

        {hasCoverImage && (
  <div className="game-hero__cover game-hero__cover--image">
    <img src={game.coverImage} alt="" />
  </div>
)}
      </div>
    </Card>
  );
}