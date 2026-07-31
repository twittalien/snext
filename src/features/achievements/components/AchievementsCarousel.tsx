import { useEffect, useMemo, useState } from "react";
import {
  Card,
  Modal,
  PlatformBadge,
  ProgressBar,
} from "../../../components/ui";
import "./AchievementsCarousel.css";

export type AchievementProvider = "steam" | "retroachievements" | "local";

export type AchievementDetail = {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  hidden?: boolean;
  unlockedAt?: string;
  points?: number;
  rarityPercent?: number;
  image?: string;
  hardcore?: boolean;
};

export type AchievementGame = {
  id: string;
  title: string;
  platform: string;
  provider: AchievementProvider;
  image?: string;
  heroImage?: string;
  unlocked: number;
  total: number;
  points?: number;
  rarityPercent?: number;
  lastUnlockedAt?: string;
  recentAchievement?: AchievementDetail;
  achievements: AchievementDetail[];
};

type AchievementsCarouselProps = {
  games: AchievementGame[];
  rotationSeconds?: number;
  title: string;
};

function providerLabel(provider: AchievementProvider) {
  if (provider === "retroachievements") return "RetroAchievements";
  if (provider === "steam") return "Steam";
  return "Snext";
}

function formatMeta(game: AchievementGame) {
  if (game.provider === "retroachievements") {
    return `Trophy ${game.points ?? 0} pts`;
  }

  if (typeof game.rarityPercent === "number") {
    return `Rare ${game.rarityPercent.toFixed(1)}% global`;
  }

  return `${game.achievements.filter((achievement) => achievement.unlocked).length} recientes`;
}

function rewardLabel(achievement: AchievementDetail, provider: AchievementProvider) {
  if (provider === "retroachievements") {
    return `Trophy ${achievement.points ?? 0} pts`;
  }

  if (typeof achievement.rarityPercent === "number") {
    return `Rare ${achievement.rarityPercent.toFixed(1)}%`;
  }

  return achievement.unlocked ? "Unlocked" : "Pending";
}

export function AchievementsCarousel({
  games,
  rotationSeconds = 30,
  title,
}: AchievementsCarouselProps) {
  const visibleGames = useMemo(
    () =>
      games
        .filter((game) => game.total > 0)
        .slice(0, 10),
    [games],
  );
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [selectedGame, setSelectedGame] = useState<AchievementGame | null>(
    null,
  );
  const [selectedAchievement, setSelectedAchievement] =
    useState<AchievementDetail | null>(null);

  const safeRotationSeconds = [10, 20, 30, 60].includes(rotationSeconds)
    ? rotationSeconds
    : 30;
  const currentGame = visibleGames[index] ?? visibleGames[0];
  const progress = currentGame
    ? Math.round((currentGame.unlocked / currentGame.total) * 100)
    : 0;

  useEffect(() => {
    if (paused || selectedGame || visibleGames.length < 2) {
      return;
    }

    const timer = window.setInterval(() => {
      setIndex((currentIndex) => (currentIndex + 1) % visibleGames.length);
    }, safeRotationSeconds * 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [paused, safeRotationSeconds, selectedGame, visibleGames.length]);

  useEffect(() => {
    if (index >= visibleGames.length) {
      setIndex(0);
    }
  }, [index, visibleGames.length]);

  if (!currentGame) {
    return (
      <Card className="achievements-v2 achievements-v2--empty">
        <div className="achievements-v2__empty">
          <span>RA</span>
          <div>
            <h2>{title}</h2>
            <p>Conecta Steam o RetroAchievements desde Configuracion.</p>
          </div>
        </div>
      </Card>
    );
  }

  const recentAchievement =
    currentGame.recentAchievement ??
    currentGame.achievements.find((achievement) => achievement.unlocked) ??
    currentGame.achievements[0];

  return (
    <>
      <Card
        className="achievements-v2"
        padding="none"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <button
          className="achievements-v2__button"
          type="button"
          onClick={() => setSelectedGame(currentGame)}
        >
          <img
            className="achievements-v2__background"
            src={currentGame.heroImage ?? currentGame.image ?? "/demo/game/hero.svg"}
            alt=""
          />
          <span className="achievements-v2__wash" />

          <span className="achievements-v2__content">
            <span className="achievements-v2__topline">
              <span>
                <small>Logros</small>
                <strong>
                  {index + 1} de {visibleGames.length}
                </strong>
              </span>
              <span className="achievements-v2__provider">
                {providerLabel(currentGame.provider)}
              </span>
            </span>

            <span className="achievements-v2__main">
              <span className="achievements-v2__cover-wrap">
                <img
                  className="achievements-v2__cover"
                  src={currentGame.image ?? "/demo/game/cover.svg"}
                  alt=""
                />
              </span>

              <span className="achievements-v2__identity">
                <strong>{currentGame.title}</strong>
                <span>
                  <PlatformBadge platform={currentGame.platform} />
                </span>
                <small>{providerLabel(currentGame.provider)}</small>
              </span>
            </span>

            <span className="achievements-v2__progress">
              <span>
                <strong>
                  {currentGame.unlocked} / {currentGame.total}
                </strong>
                <em>{progress}%</em>
              </span>
              <ProgressBar value={progress} tone="brand" />
            </span>

            <span className="achievements-v2__recent">
              <span className="achievements-v2__badge">
                {recentAchievement.image ? (
                  <img src={recentAchievement.image} alt="" />
                ) : (
                  <b>{recentAchievement.unlocked ? "T" : "?"}</b>
                )}
              </span>
              <span>
                <small>Ultimo logro</small>
                <strong>{recentAchievement.name}</strong>
              </span>
              <em>{formatMeta(currentGame)}</em>
            </span>

            <span className="achievements-v2__dots">
              {visibleGames.map((game, dotIndex) => (
                <i
                  className={dotIndex === index ? "is-active" : ""}
                  key={game.id}
                />
              ))}
            </span>
          </span>
        </button>

        <div className="achievements-v2__controls">
          <button
            type="button"
            aria-label="Anterior"
            onClick={() =>
              setIndex(
                (currentIndex) =>
                  (currentIndex - 1 + visibleGames.length) %
                  visibleGames.length,
              )
            }
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Siguiente"
            onClick={() =>
              setIndex((currentIndex) => (currentIndex + 1) % visibleGames.length)
            }
          >
            ›
          </button>
        </div>
      </Card>

      <Modal
        open={Boolean(selectedGame)}
        title={selectedGame?.title ?? title}
        eyebrow={
          selectedGame
            ? `${selectedGame.platform} · ${providerLabel(selectedGame.provider)}`
            : undefined
        }
        size="large"
        onClose={() => {
          setSelectedGame(null);
          setSelectedAchievement(null);
        }}
      >
        {selectedGame && (
          <div className="achievements-detail">
            <div className="achievements-detail__summary">
              <img src={selectedGame.image ?? "/demo/game/cover.svg"} alt="" />
              <div>
                <ProgressBar
                  value={Math.round(
                    (selectedGame.unlocked / selectedGame.total) * 100,
                  )}
                  label={`${selectedGame.unlocked} / ${selectedGame.total} logros`}
                  showValue
                />
                <p>{formatMeta(selectedGame)}</p>
              </div>
            </div>

            <div className="achievements-detail__grid">
              {selectedGame.achievements.map((achievement) => (
                <button
                  className={[
                    "achievement-tile",
                    achievement.unlocked ? "is-unlocked" : "is-locked",
                    achievement.hardcore ? "is-hardcore" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  type="button"
                  key={achievement.id}
                  onClick={() => setSelectedAchievement(achievement)}
                >
                  <span>
                    {achievement.image ? (
                      <img src={achievement.image} alt="" />
                    ) : (
                      <b>{achievement.hidden ? "?" : "T"}</b>
                    )}
                  </span>
                  <strong>
                    {achievement.hidden && !achievement.unlocked
                      ? "Logro oculto"
                      : achievement.name}
                  </strong>
                  <p>
                    {achievement.hidden && !achievement.unlocked
                      ? "Descripción oculta"
                      : achievement.description}
                  </p>
                  <small>{rewardLabel(achievement, selectedGame.provider)}</small>
                </button>
              ))}
            </div>

            {selectedAchievement && (
              <aside className="achievement-popover">
                <button
                  type="button"
                  aria-label="Cerrar logro"
                  onClick={() => setSelectedAchievement(null)}
                >
                  ×
                </button>
                <h3>
                  {selectedAchievement.hidden && !selectedAchievement.unlocked
                    ? "Logro oculto"
                    : selectedAchievement.name}
                </h3>
                <p>
                  {selectedAchievement.hidden && !selectedAchievement.unlocked
                    ? "El proveedor oculta los detalles hasta desbloquearlo."
                    : selectedAchievement.description}
                </p>
                <span>
                  {selectedAchievement.unlockedAt ?? "Pendiente"}
                  <em>
                    {rewardLabel(selectedAchievement, selectedGame.provider)}
                  </em>
                </span>
              </aside>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
