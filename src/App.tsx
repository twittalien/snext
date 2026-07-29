import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import "./App.css";
import { GameHero, type GameHeroData } from "./features/game";
import { getTranslation, type Language } from "./i18n";

type AvatarSource = "initials" | "local" | "steam" | "retro";
type Theme = "auto" | "dark" | "light";

type Settings = {
  name: string;
  language: Language;
  theme: Theme;
  retroAchievementsUser: string;
  weatherLocation: string;
  avatarSource: AvatarSource;
  avatarData: string;
};

const defaultSettings: Settings = {
  name: "twittalien",
  language: "es",
  theme: "auto",
  retroAchievementsUser: "twittalien",
  weatherLocation: "Ubicación automática",
  avatarSource: "initials",
  avatarData: "",
};

const achievements = [
  { name: "El viaje comienza", progress: 100 },
  { name: "Coleccionista", progress: 72 },
  { name: "Maestro del combate", progress: 43 },
];

const friends = [
  {
    name: "Nova",
    activity: "Jugando Helldivers 2",
    color: "#5ee7ff",
  },
  {
    name: "Kiro",
    activity: "En línea",
    color: "#8467ff",
  },
  {
    name: "Luz",
    activity: "Escuchando Spotify",
    color: "#ff6bb5",
  },
];

const marioKartGame: GameHeroData = {
  title: "Mario Kart 8 Deluxe",
  heroImage: "/demo/game/hero.jpg",
  platform: "Nintendo Switch",
  source: "Emulación",
  description:
    "Acelera a través de las pistas del Reino Champiñón bajo el agua, en el cielo, de cabeza y sin gravedad. Compite en multijugador local, torneos en línea y el renovado modo batalla.",
  playtimeHours: 42,
  progress: 68,
  rating: 4.7,
  ratingLabel: "94% recomendado",
  status: "playing",
};

function loadSettings(): Settings {
  try {
    const stored = localStorage.getItem("snext-settings");

    if (!stored) {
      return defaultSettings;
    }

    return {
      ...defaultSettings,
      ...(JSON.parse(stored) as Partial<Settings>),
    };
  } catch {
    return defaultSettings;
  }
}

function Logo() {
  return (
    <svg className="logo-mark" viewBox="0 0 72 72" aria-hidden="true">
      <defs>
        <linearGradient
          id="logo-gradient"
          x1="8"
          y1="8"
          x2="64"
          y2="64"
        >
          <stop stopColor="#865dff" />
          <stop offset="1" stopColor="#35def2" />
        </linearGradient>
      </defs>

      <path
        d="M52 18c-8-8-25-7-31 3-7 12 6 17 16 18 8 1 14 3 11 9-4 8-21 6-28-2"
        fill="none"
        stroke="url(#logo-gradient)"
        strokeWidth="9"
        strokeLinecap="round"
      />

      <path
        d="M20 54c8 8 25 7 31-3 7-12-6-17-16-18-8-1-14-3-11-9 4-8 21-6 28 2"
        fill="none"
        stroke="url(#logo-gradient)"
        strokeWidth="5"
        strokeLinecap="round"
        opacity=".9"
      />
    </svg>
  );
}

function Icon({ children }: { children: string }) {
  return (
    <span className="icon" aria-hidden="true">
      {children}
    </span>
  );
}

function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const [settings, setSettings] = useState<Settings>(loadSettings);

  const t = getTranslation(settings.language);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("snext-settings", JSON.stringify(settings));
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.lang = settings.language;
  }, [settings]);

  useEffect(() => {
    if (!settingsOpen) {
      return;
    }

    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSettingsOpen(false);
      }
    };

    document.addEventListener("keydown", closeWithEscape);

    return () => {
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, [settingsOpen]);

  const locale =
    settings.language === "en"
      ? "en-US"
      : settings.language === "pt"
        ? "pt-BR"
        : "es-MX";

  const initials = useMemo(() => {
    return (
      settings.name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase())
        .join("") || "SN"
    );
  }, [settings.name]);

  const handleAvatarFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      window.alert(t.imageOnly);
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      window.alert(t.imageTooLarge);
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setSettings((currentSettings) => ({
        ...currentSettings,
        avatarSource: "local",
        avatarData: String(reader.result ?? ""),
      }));
    };

    reader.readAsDataURL(file);
  };

  const avatarContent =
    settings.avatarSource === "local" && settings.avatarData ? (
      <img src={settings.avatarData} alt="" />
    ) : (
      initials
    );

  const dateText = now.toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const timeText = now.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });

  const translatedAchievements = [
    {
      name:
        settings.language === "en"
          ? "The journey begins"
          : settings.language === "pt"
            ? "A jornada começa"
            : achievements[0].name,
      progress: achievements[0].progress,
    },
    {
      name:
        settings.language === "en"
          ? "Collector"
          : settings.language === "pt"
            ? "Colecionador"
            : achievements[1].name,
      progress: achievements[1].progress,
    },
    {
      name:
        settings.language === "en"
          ? "Combat master"
          : settings.language === "pt"
            ? "Mestre do combate"
            : achievements[2].name,
      progress: achievements[2].progress,
    },
  ];

  const translatedFriends = friends.map((friend) => {
    if (friend.name === "Kiro") {
      return {
        ...friend,
        activity: t.online,
      };
    }

    if (friend.name === "Luz") {
      return {
        ...friend,
        activity: t.listeningSpotify,
      };
    }

    return friend;
  });

  return (
    <div className="app">
      <div className="ambient ambient-purple" />
      <div className="ambient ambient-cyan" />

      <header className="topbar">
        <div className="brand">
          <Logo />

          <div>
            <strong>snext</strong>
            <span>{t.gamingCompanion}</span>
          </div>
        </div>

        <div className="topbar-actions">
          <div className="user">
            <span className="user-avatar">{avatarContent}</span>
            <span>{settings.name}</span>
          </div>

          <button
            className="settings-button"
            type="button"
            aria-label={t.settings}
            aria-expanded={settingsOpen}
            onClick={() => setSettingsOpen(true)}
          >
            ⚙
          </button>
        </div>
      </header>

      <main>
        <section className="welcome">
          <div>
            <p className="eyebrow">{t.gameScreen.toUpperCase()}</p>

            <h1>
              {t.headlineStart} <span>{t.headlineAccent}</span>
            </h1>

            <p className="welcome-copy">{t.subtitle}</p>
          </div>

          <div className="date-widget">
            <strong>{timeText}</strong>
            <span>{dateText}</span>
          </div>
        </section>

        <section className="dashboard">
          <div className="game-hero-cell">
            <GameHero game={marioKartGame} />
          </div>

          <article className="card music-card">
            <div className="card-title">
              <Icon>♫</Icon>

              <div>
                <span>Spotify</span>
                <strong>{t.nowPlaying}</strong>
              </div>
            </div>

            <div className="song">
              <div className="album-art">SN</div>

              <div>
                <h3>Midnight City</h3>
                <p>M83 · Hurry Up, We’re Dreaming</p>
              </div>
            </div>

            <div className="song-progress">
              <span />
            </div>

            <div className="song-time">
              <span>2:14</span>
              <span>4:03</span>
            </div>
          </article>

          <article className="card achievements-card">
            <div className="card-title">
              <Icon>◆</Icon>

              <div>
                <span>{t.progress}</span>
                <strong>{t.achievements}</strong>
              </div>

              <b className="counter">18 / 42</b>
            </div>

            <div className="achievement-list">
              {translatedAchievements.map((achievement) => (
                <div className="achievement" key={achievement.name}>
                  <div>
                    <span>{achievement.name}</span>
                    <strong>{achievement.progress}%</strong>
                  </div>

                  <div className="progress">
                    <span style={{ width: `${achievement.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="card weather-card">
            <div className="card-title">
              <Icon>☁</Icon>

              <div>
                <span>
                  {settings.weatherLocation ===
                  defaultSettings.weatherLocation
                    ? t.automaticLocation
                    : settings.weatherLocation}
                </span>

                <strong>{t.weather}</strong>
              </div>
            </div>

            <div className="weather">
              <strong>18°</strong>

              <div>
                <b>{t.partlyCloudy}</b>
                <span>{t.feelsLike}</span>
              </div>
            </div>
          </article>

          <article className="card friends-card">
            <div className="card-title">
              <Icon>◉</Icon>

              <div>
                <span>{t.discord}</span>
                <strong>{t.onlineFriends}</strong>
              </div>

              <b className="counter">3</b>
            </div>

            <div className="friend-list">
              {translatedFriends.map((friend) => (
                <div className="friend" key={friend.name}>
                  <span
                    className="friend-avatar"
                    style={{ background: friend.color }}
                  >
                    {friend.name[0]}
                  </span>

                  <div>
                    <strong>{friend.name}</strong>
                    <span>{friend.activity}</span>
                  </div>

                  <i />
                </div>
              ))}
            </div>
          </article>

          <article className="card system-card">
            <div className="card-title">
              <Icon>▦</Icon>

              <div>
                <span>{t.bazzite}</span>
                <strong>{t.yourSystem}</strong>
              </div>
            </div>

            <div className="system-grid">
              <div>
                <span>CPU</span>
                <strong>22%</strong>

                <i>
                  <b style={{ width: "22%" }} />
                </i>
              </div>

              <div>
                <span>GPU</span>
                <strong>64%</strong>

                <i>
                  <b style={{ width: "64%" }} />
                </i>
              </div>

              <div>
                <span>RAM</span>
                <strong>6.7 GB</strong>

                <i>
                  <b style={{ width: "21%" }} />
                </i>
              </div>

              <div>
                <span>{t.network}</span>
                <strong>486 Mbps</strong>

                <i>
                  <b style={{ width: "76%" }} />
                </i>
              </div>
            </div>
          </article>

          <article className="card assistant-card">
            <div className="assistant-icon">✦</div>

            <div>
              <p className="eyebrow">{t.aiTipLabel.toUpperCase()}</p>
              <h2>{t.aiTipTitle}</h2>
              <p>{t.aiTip}</p>
            </div>
          </article>
        </section>
      </main>

      {settingsOpen && (
        <div className="settings-layer">
          <button
            className="backdrop"
            type="button"
            aria-label={t.settings}
            onClick={() => setSettingsOpen(false)}
          />

          <aside
            className="settings-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
          >
            <header>
              <div>
                <p className="eyebrow">SNEXT</p>
                <h2 id="settings-title">{t.settings}</h2>
              </div>

              <button
                type="button"
                aria-label={t.settings}
                onClick={() => setSettingsOpen(false)}
              >
                ×
              </button>
            </header>

            <div className="settings-content">
              <section>
                <h3>{t.profile}</h3>

                <div className="profile-editor">
                  <span className="profile-avatar">{avatarContent}</span>

                  <div>
                    <strong>{settings.name || "Snext Player"}</strong>
                    <span>{t.profileDescription}</span>
                  </div>
                </div>

                <label>
                  {t.visibleName}

                  <input
                    value={settings.name}
                    onChange={(event) =>
                      setSettings((currentSettings) => ({
                        ...currentSettings,
                        name: event.target.value,
                      }))
                    }
                  />
                </label>

                <label>
                  {t.avatarSource}

                  <select
                    value={settings.avatarSource}
                    onChange={(event) =>
                      setSettings((currentSettings) => ({
                        ...currentSettings,
                        avatarSource: event.target.value as AvatarSource,
                      }))
                    }
                  >
                    <option value="initials">{t.initials}</option>
                    <option value="local">{t.localImage}</option>
                    <option value="steam">{t.steamSoon}</option>
                    <option value="retro">{t.retroSoon}</option>
                  </select>
                </label>

                {settings.avatarSource === "local" && (
                  <label>
                    {t.selectImage}

                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={handleAvatarFile}
                    />
                  </label>
                )}

                {(settings.avatarSource === "steam" ||
                  settings.avatarSource === "retro") && (
                  <p className="hint">{t.providerSoon}</p>
                )}
              </section>

              <section>
                <h3>{t.appearance}</h3>

                <label>
                  {t.language}

                  <select
                    value={settings.language}
                    onChange={(event) =>
                      setSettings((currentSettings) => ({
                        ...currentSettings,
                        language: event.target.value as Language,
                      }))
                    }
                  >
                    <option value="es">Español</option>
                    <option value="en">English</option>
                    <option value="pt">Português</option>
                  </select>
                </label>

                <label>
                  {t.theme}

                  <select
                    value={settings.theme}
                    onChange={(event) =>
                      setSettings((currentSettings) => ({
                        ...currentSettings,
                        theme: event.target.value as Theme,
                      }))
                    }
                  >
                    <option value="auto">{t.automatic}</option>
                    <option value="dark">{t.dark}</option>
                    <option value="light">{t.light}</option>
                  </select>
                </label>
              </section>

              <section>
                <h3>{t.climate}</h3>

                <label>
                  {t.location}

                  <input
                    value={settings.weatherLocation}
                    onChange={(event) =>
                      setSettings((currentSettings) => ({
                        ...currentSettings,
                        weatherLocation: event.target.value,
                      }))
                    }
                  />
                </label>
              </section>

              <section>
                <h3>{t.integrations}</h3>

                {[
                  "Spotify Client ID",
                  "RetroAchievements API key",
                  "SteamGridDB API key",
                  "OpenWeatherMap API key",
                  "Gemini API key",
                ].map((label) => (
                  <label key={label}>
                    {label}

                    <input
                      type="password"
                      autoComplete="off"
                      placeholder={t.notConfigured}
                    />
                  </label>
                ))}
              </section>

              <p className="privacy">{t.demoWarning}</p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export default App;