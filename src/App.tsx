import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "./App.css";
import { AchievementsCarousel } from "./features/achievements";
import { GameHero } from "./features/game";
import { SpotifyCard } from "./features/spotify";
import { WeatherCard } from "./features/weather";
import { getTranslation, type Language } from "./i18n";
import {
  loadDashboardData,
  type DashboardData,
} from "./services/dashboardData";
import {
  loadAssistantInsight,
  type AssistantInsight,
} from "./services/gameAssistant";
import {
  runArtDiagnostics,
  type ArtDiagnosticStep,
} from "./services/artDiagnostics";

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
  uiScale: number;
  density: "comfortable" | "compact";
  transparency: number;
  dynamicBackgrounds: boolean;
  startFullscreen: boolean;
  preferredMonitor: string;
  detectionRules: string;
  steamUserId: string;
  spotifyClientId: string;
  spotifyAccessToken: string;
  retroAchievementsApiKey: string;
  steamWebApiKey: string;
  steamGridDbApiKey: string;
  screenScraperDevId: string;
  screenScraperDevPassword: string;
  screenScraperUser: string;
  screenScraperPassword: string;
  weatherProvider: "open-meteo" | "openweathermap";
  openWeatherMapApiKey: string;
  weatherMotion: "full" | "reduced" | "off";
  geminiApiKey: string;
  ollamaUrl: string;
  ollamaModel: string;
  discordMode: "disabled" | "rpc" | "server";
  discordBotToken: string;
  discordGuildId: string;
  achievementRotationSeconds: 10 | 20 | 30 | 60;
};

type Friend = {
  name: string;
  activity: string;
  color: string;
};

const SNEXT_VERSION = "0.2.1";
const SNEXT_BUILD = "Corrección de compilación + proveedores de arte";

const defaultSettings: Settings = {
  name: "twittalien",
  language: "es",
  theme: "auto",
  retroAchievementsUser: "twittalien",
  weatherLocation: "Ubicación automática",
  avatarSource: "initials",
  avatarData: "",
  uiScale: 100,
  density: "comfortable",
  transparency: 78,
  dynamicBackgrounds: true,
  startFullscreen: false,
  preferredMonitor: "auto",
  detectionRules: "retroarch\nryujinx\ncitra\nsteam\nheroic\nlutris",
  steamUserId: "",
  spotifyClientId: "",
  spotifyAccessToken: "",
  retroAchievementsApiKey: "",
  steamWebApiKey: "",
  steamGridDbApiKey: "",
  screenScraperDevId: "",
  screenScraperDevPassword: "",
  screenScraperUser: "",
  screenScraperPassword: "",
  weatherProvider: "open-meteo",
  openWeatherMapApiKey: "",
  weatherMotion: "full",
  geminiApiKey: "",
  ollamaUrl: "http://localhost:11434",
  ollamaModel: "llama3.1",
  discordMode: "disabled",
  discordBotToken: "",
  discordGuildId: "",
  achievementRotationSeconds: 30,
};

const friends: Friend[] = [
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [now, setNow] = useState(new Date());
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null,
  );
  const [assistantInsight, setAssistantInsight] =
    useState<AssistantInsight | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [artDiagnostics, setArtDiagnostics] = useState<ArtDiagnosticStep[]>([]);
  const [artDiagnosticsRunning, setArtDiagnosticsRunning] = useState(false);

  const t = getTranslation(settings.language);

  useEffect(() => {
    getCurrentWindow()
      .isFullscreen()
      .then(setIsFullscreen)
      .catch(() => setIsFullscreen(false));
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const nextValue = !isFullscreen;
    try {
      await getCurrentWindow().setFullscreen(nextValue);
      setIsFullscreen(nextValue);
    } catch (error) {
      console.error("No se pudo cambiar el modo de ventana", error);
    }
  }, [isFullscreen]);

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
    document.documentElement.style.setProperty(
      "--snext-user-scale",
      `${settings.uiScale / 100}`,
    );
    document.documentElement.style.setProperty(
      "--snext-user-surface-alpha",
      `${settings.transparency / 100}`,
    );
    document.documentElement.dataset.density = settings.density;
    document.documentElement.dataset.dynamicBackgrounds = String(
      settings.dynamicBackgrounds,
    );
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

  const refreshDashboard = useCallback(
    async (showLoading = false) => {
      if (showLoading) {
        setDataLoading(true);
      }

    const data = await loadDashboardData(settings.weatherLocation, locale, {
      language: settings.language,
      weatherProvider: settings.weatherProvider,
      openWeatherMapApiKey: settings.openWeatherMapApiKey,
      steamGridDbApiKey: settings.steamGridDbApiKey,
      screenScraperDevId: settings.screenScraperDevId,
      screenScraperDevPassword: settings.screenScraperDevPassword,
      screenScraperUser: settings.screenScraperUser,
      screenScraperPassword: settings.screenScraperPassword,
      retroAchievementsUser: settings.retroAchievementsUser,
      retroAchievementsApiKey: settings.retroAchievementsApiKey,
      spotifyAccessToken: settings.spotifyAccessToken,
      discordMode: settings.discordMode,
      discordBotToken: settings.discordBotToken,
      discordGuildId: settings.discordGuildId,
      });

      setDashboardData(data);

      if (showLoading) {
        setDataLoading(false);
      }
    },
    [
      locale,
      settings.discordBotToken,
      settings.discordGuildId,
      settings.discordMode,
      settings.openWeatherMapApiKey,
      settings.retroAchievementsApiKey,
      settings.retroAchievementsUser,
      settings.spotifyAccessToken,
      settings.steamGridDbApiKey,
      settings.screenScraperDevId,
      settings.screenScraperDevPassword,
      settings.screenScraperUser,
      settings.screenScraperPassword,
      settings.weatherLocation,
      settings.weatherProvider,
    ],
  );

  useEffect(() => {
    let active = true;

    const load = (showLoading = false) => {
      refreshDashboard(showLoading).catch(() => {
        if (active && showLoading) {
          setDataLoading(false);
        }
      });
    };

    load(true);
    const timer = window.setInterval(() => load(false), 10000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [refreshDashboard]);

  useEffect(() => {
    if (!dashboardData?.game) {
      return;
    }

    let active = true;

    setAssistantLoading(true);

    loadAssistantInsight(dashboardData.game, {
      geminiApiKey: settings.geminiApiKey,
      ollamaUrl: settings.ollamaUrl,
      ollamaModel: settings.ollamaModel,
      language: settings.language,
    })
      .then((insight) => {
        if (active) {
          setAssistantInsight(insight);
        }
      })
      .finally(() => {
        if (active) {
          setAssistantLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [
    dashboardData?.game.title,
    settings.geminiApiKey,
    settings.language,
    settings.ollamaModel,
    settings.ollamaUrl,
  ]);

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

  const updateSetting = <Key extends keyof Settings>(
    key: Key,
    value: Settings[Key],
  ) => {
    setSettings((currentSettings) => ({
      ...currentSettings,
      [key]: value,
    }));
  };

  const clearLocalSecrets = () => {
    setSettings((currentSettings) => ({
      ...currentSettings,
      spotifyClientId: "",
      spotifyAccessToken: "",
      retroAchievementsApiKey: "",
      steamWebApiKey: "",
      steamGridDbApiKey: "",
      openWeatherMapApiKey: "",
      geminiApiKey: "",
      discordBotToken: "",
    }));
  };

  const diagnoseArt = async () => {
    setArtDiagnosticsRunning(true);
    setArtDiagnostics([]);
    try {
      const results = await runArtDiagnostics({
        gameTitle: dashboardData?.game.title ?? "Sonic the Hedgehog",
        steamGridDbApiKey: settings.steamGridDbApiKey,
        retroAchievementsUser: settings.retroAchievementsUser,
        retroAchievementsApiKey: settings.retroAchievementsApiKey,
      });
      setArtDiagnostics(results);
    } finally {
      setArtDiagnosticsRunning(false);
    }
  };

  const avatarContent =
    settings.avatarSource === "local" && settings.avatarData ? (
      <img src={settings.avatarData} alt="" />
    ) : (
      initials
    );

  const translatedFriends = (dashboardData?.friends ?? friends).map((friend) => {
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

  const dataModeLabel =
    dashboardData?.dataMode === "live"
      ? "Datos en vivo"
      : dataLoading
        ? "Actualizando datos"
        : "Modo fallback";
  const assistantSourceLabel = assistantLoading
    ? "Consultando IA"
    : assistantInsight?.source === "gemini"
      ? "Gemini"
      : assistantInsight?.source === "ollama"
        ? "Ollama local"
        : dataModeLabel;

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
            className="window-mode-button"
            type="button"
            aria-label={isFullscreen ? "Usar ventana" : "Pantalla completa"}
            title={isFullscreen ? "Usar ventana" : "Pantalla completa"}
            onClick={toggleFullscreen}
          >
            {isFullscreen ? "▣" : "⛶"}
          </button>

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
        <section className="dashboard">
          <div className="game-hero-cell">
            {dashboardData && <GameHero game={dashboardData.game} />}
          </div>

          <div className="music-card">
            <SpotifyCard
              track={dashboardData?.track}
              connected={Boolean(dashboardData?.track)}
            />
          </div>

          <div className="achievements-card">
            <AchievementsCarousel
              games={dashboardData?.achievementGames ?? []}
              rotationSeconds={settings.achievementRotationSeconds}
              title={t.achievements}
            />
          </div>

          <div className="weather-card">
            <WeatherCard
              weather={dashboardData?.weather}
              now={now}
              locale={locale}
              loading={dataLoading}
              motion={settings.weatherMotion}
            />
          </div>

          <article className="card friends-card">
            <div className="card-title">
              <Icon>DC</Icon>

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
              <Icon>PC</Icon>

              <div>
                <span>{t.bazzite}</span>
                <strong>{t.yourSystem}</strong>
              </div>
            </div>

            <div className="system-grid">
              <div>
                <span>CPU</span>
                <strong>
                  {dashboardData?.system.cpuLoad ?? 0}%
                </strong>

                <i>
                  <b
                    style={{
                      width: `${dashboardData?.system.cpuLoad ?? 0}%`,
                    }}
                  />
                </i>
              </div>

              <div>
                <span>GPU</span>
                <strong>
                  {dashboardData?.system.gpuLoad ?? 0}%
                </strong>

                <i>
                  <b
                    style={{
                      width: `${dashboardData?.system.gpuLoad ?? 0}%`,
                    }}
                  />
                </i>
              </div>

              {dashboardData?.system.vramLabel ? (
                <div>
                  <span>VRAM</span>
                  <strong>{dashboardData.system.vramLabel}</strong>

                  <i>
                    <b
                      style={{
                        width: `${dashboardData.system.vramLoad ?? 0}%`,
                      }}
                    />
                  </i>
                </div>
              ) : null}

              <div>
                <span>RAM</span>
                <strong>
                  {dashboardData?.system.memoryLabel ?? "N/D"}
                </strong>

                <i>
                  <b
                    style={{
                      width: `${dashboardData?.system.memoryLoad ?? 0}%`,
                    }}
                  />
                </i>
              </div>

              {dashboardData?.system.cpuTemperatureLabel ? (
                <div>
                  <span>CPU temp</span>
                  <strong>{dashboardData.system.cpuTemperatureLabel}</strong>

                  <i>
                    <b
                      style={{
                        width: `${Math.min(
                          100,
                          Number.parseInt(dashboardData.system.cpuTemperatureLabel, 10) || 0,
                        )}%`,
                      }}
                    />
                  </i>
                </div>
              ) : null}

              <div>
                <span>{t.network}</span>
                <strong>
                  {dashboardData?.system.networkLabel ?? "N/D"}
                </strong>

                <i>
                  <b
                    style={{
                      width: `${dashboardData?.system.networkLoad ?? 0}%`,
                    }}
                  />
                </i>
              </div>

              {dashboardData?.system.batteryLabel ? (
                <div>
                  <span>Batería</span>
                  <strong>{dashboardData.system.batteryLabel}</strong>

                  <i>
                    <b
                      style={{
                        width: `${dashboardData.system.batteryLoad ?? 0}%`,
                      }}
                    />
                  </i>
                </div>
              ) : null}
            </div>
          </article>

          <article className="card assistant-card">
            <div className="assistant-icon">✦</div>

            <div>
              <p className="eyebrow">
                {assistantSourceLabel.toUpperCase()}
              </p>
              <h2>{assistantInsight?.title ?? t.aiTipTitle}</h2>
              <p>{assistantInsight?.body ?? t.aiTip}</p>
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
              <section className="version-panel" aria-label="Versión de Snext">
                <div>
                  <span>VERSIÓN INSTALADA</span>
                  <strong>Snext v{SNEXT_VERSION}</strong>
                  <small>{SNEXT_BUILD}</small>
                </div>
                <b>v{SNEXT_VERSION}</b>
              </section>

              <section className="art-diagnostics">
                <div className="art-diagnostics__heading">
                  <div>
                    <h3>Diagnóstico de arte</h3>
                    <p className="hint">
                      Prueba las APIs, la descarga nativa y el renderizado sin mostrar tus claves.
                    </p>
                  </div>
                  <button
                    className="diagnostic-action"
                    type="button"
                    disabled={artDiagnosticsRunning}
                    onClick={diagnoseArt}
                  >
                    {artDiagnosticsRunning ? "Probando..." : "Ejecutar"}
                  </button>
                </div>

                {artDiagnostics.length > 0 && (
                  <div className="art-diagnostics__results">
                    {artDiagnostics.map((step) => (
                      <article
                        className={`art-diagnostic art-diagnostic--${step.status}`}
                        key={step.id}
                      >
                        {step.preview && <img src={step.preview} alt="" />}
                        <div>
                          <strong>{step.label}</strong>
                          <p>{step.detail}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className="setup-guide">
                <h3>Guía rápida de tarjetas</h3>
                <p className="hint">
                  Configura una integración, guarda los cambios cerrando este panel y espera la siguiente actualización automática.
                </p>

                <details open>
                  <summary>Juego activo y SteamGridDB</summary>
                  <p>
                    La detección se actualiza cada 10 segundos. Snext normaliza puntuación, subtítulos y variantes del nombre antes de consultar SteamGridDB. Si no encuentra arte, usa ScreenScraper cuando hayas configurado ID y contraseña de desarrollador, más tu usuario y contraseña de ScreenScraper.
                  </p>
                </details>

                <details>
                  <summary>ScreenScraper</summary>
                  <p>
                    Regístrate en ScreenScraper.fr y solicita credenciales de desarrollador. Introduce el ID y la contraseña de desarrollador; también puedes añadir tu usuario y contraseña de ScreenScraper para aumentar los límites de consulta. Se usa automáticamente después de SteamGridDB.
                  </p>
                </details>

                <details>
                  <summary>RetroAchievements</summary>
                  <p>
                    Escribe tu usuario y tu Web API Key. Snext consulta tus juegos recientes y el set completo: carátula, fondo, badges, nombres, puntos, descripciones y fecha de desbloqueo. Los logros ocultos sin desbloquear mantienen su estado protegido.
                  </p>
                </details>

                <details>
                  <summary>IA con Ollama o Gemini</summary>
                  <p>
                    En Bazzite instala Ollama con <code>curl -fsSL https://ollama.com/install.sh | sh</code>; después ejecuta <code>ollama pull llama3.1</code> y verifica con <code>ollama run llama3.1</code>. Mantén Ollama ejecutándose y deja URL <code>http://localhost:11434</code> y modelo <code>llama3.1</code>. Como alternativa, pega una API key de Gemini. Si ninguna está disponible, Snext mostrará el consejo local y lo indicará como fallback.
                  </p>
                </details>

                <details>
                  <summary>Spotify</summary>
                  <p>
                    Crea una aplicación en Spotify for Developers, usa el Client ID y genera un access token OAuth con los permisos <code>user-read-currently-playing</code> y <code>user-read-playback-state</code>. Pega el token temporal en el campo correspondiente; cuando expire, genera uno nuevo.
                  </p>
                </details>

                <details>
                  <summary>Discord</summary>
                  <p>
                    En Discord Developer Portal crea una aplicación y un bot, copia su token y habilita el intent de miembros si el portal lo solicita. Invita el bot a tu servidor, copia el ID del servidor con Developer Mode y pega token e ID. Usa Servidor compartido para amigos; RPC local queda reservado para una integración nativa futura.
                  </p>
                </details>

                <details>
                  <summary>Clima y sistema</summary>
                  <p>
                    Open-Meteo funciona sin key: escribe ciudad y conserva ese proveedor. OpenWeatherMap requiere su API key. En Bazzite, CPU, GPU, VRAM, temperatura y batería se leen de nvidia-smi, lm-sensors y UPower; si algún comando no está disponible, esa métrica aparece como N/D.
                  </p>
                </details>
              </section>

              <section>
                <h3>{t.profile}</h3>

                <div className="profile-editor">
                  <span className="profile-avatar">
                    {avatarContent}
                  </span>

                  <div>
                    <strong>
                      {settings.name || "Snext Player"}
                    </strong>
                    <span>{t.profileDescription}</span>
                  </div>
                </div>

                <label>
                  {t.visibleName}

                  <input
                    value={settings.name}
                    onChange={(event) =>
                      updateSetting("name", event.target.value)
                    }
                  />
                </label>

                <label>
                  {t.avatarSource}

                  <select
                    value={settings.avatarSource}
                    onChange={(event) =>
                      updateSetting(
                        "avatarSource",
                        event.target.value as AvatarSource,
                      )
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
                      updateSetting(
                        "language",
                        event.target.value as Language,
                      )
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
                      updateSetting("theme", event.target.value as Theme)
                    }
                  >
                    <option value="auto">{t.automatic}</option>
                    <option value="dark">{t.dark}</option>
                    <option value="light">{t.light}</option>
                  </select>
                </label>

                <label>
                  Escala de interfaz

                  <input
                    type="range"
                    min="85"
                    max="120"
                    value={settings.uiScale}
                    onChange={(event) =>
                      updateSetting("uiScale", Number(event.target.value))
                    }
                  />
                </label>

                <label>
                  Densidad

                  <select
                    value={settings.density}
                    onChange={(event) =>
                      updateSetting(
                        "density",
                        event.target.value as Settings["density"],
                      )
                    }
                  >
                    <option value="comfortable">Cómoda</option>
                    <option value="compact">Compacta</option>
                  </select>
                </label>

                <label>
                  Transparencia

                  <input
                    type="range"
                    min="55"
                    max="95"
                    value={settings.transparency}
                    onChange={(event) =>
                      updateSetting(
                        "transparency",
                        Number(event.target.value),
                      )
                    }
                  />
                </label>

                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={settings.dynamicBackgrounds}
                    onChange={(event) =>
                      updateSetting(
                        "dynamicBackgrounds",
                        event.target.checked,
                      )
                    }
                  />
                  Fondos dinámicos
                </label>
              </section>

              <section>
                <h3>Juegos y pantalla</h3>

                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={settings.startFullscreen}
                    onChange={(event) =>
                      updateSetting("startFullscreen", event.target.checked)
                    }
                  />
                  Iniciar en pantalla completa
                </label>

                <label>
                  Monitor preferido

                  <input
                    value={settings.preferredMonitor}
                    onChange={(event) =>
                      updateSetting("preferredMonitor", event.target.value)
                    }
                    placeholder="auto, HDMI-1, DP-1"
                  />
                </label>

                <label>
                  Steam ID

                  <input
                    value={settings.steamUserId}
                    onChange={(event) =>
                      updateSetting("steamUserId", event.target.value)
                    }
                    placeholder={t.notConfigured}
                  />
                </label>

                <label>
                  Reglas de detección

                  <textarea
                    value={settings.detectionRules}
                    onChange={(event) =>
                      updateSetting("detectionRules", event.target.value)
                    }
                    rows={6}
                  />
                </label>
              </section>

              <section>
                <h3>Logros</h3>

                <label>
                  Tiempo por juego

                  <select
                    value={settings.achievementRotationSeconds}
                    onChange={(event) =>
                      updateSetting(
                        "achievementRotationSeconds",
                        Number(event.target.value) as Settings["achievementRotationSeconds"],
                      )
                    }
                  >
                    <option value={10}>10 segundos</option>
                    <option value={20}>20 segundos</option>
                    <option value={30}>30 segundos</option>
                    <option value={60}>60 segundos</option>
                  </select>
                </label>

                <p className="hint">
                  El carrusel pausa la rotación al pasar el cursor o al abrir
                  el detalle del juego.
                </p>
              </section>

              <section>
                <h3>{t.climate}</h3>

                <label>
                  {t.location}

                  <input
                    value={settings.weatherLocation}
                    onChange={(event) =>
                      updateSetting("weatherLocation", event.target.value)
                    }
                  />
                </label>

                <label>
                  Proveedor

                  <select
                    value={settings.weatherProvider}
                    onChange={(event) =>
                      updateSetting(
                        "weatherProvider",
                        event.target.value as Settings["weatherProvider"],
                      )
                    }
                  >
                    <option value="open-meteo">Open-Meteo</option>
                    <option value="openweathermap">OpenWeatherMap</option>
                  </select>
                </label>

                <label>
                  Animaciones meteorológicas

                  <select
                    value={settings.weatherMotion}
                    onChange={(event) =>
                      updateSetting(
                        "weatherMotion",
                        event.target.value as Settings["weatherMotion"],
                      )
                    }
                  >
                    <option value="full">Completas</option>
                    <option value="reduced">Reducidas</option>
                    <option value="off">Desactivadas</option>
                  </select>
                </label>
              </section>

              <section>
                <h3>{t.integrations}</h3>

                <label>
                  Spotify Client ID

                  <input
                    type="password"
                    autoComplete="off"
                    value={settings.spotifyClientId}
                    onChange={(event) =>
                      updateSetting("spotifyClientId", event.target.value)
                    }
                    placeholder={t.notConfigured}
                  />
                </label>

                <label>
                  Spotify access token temporal

                  <input
                    type="password"
                    autoComplete="off"
                    value={settings.spotifyAccessToken}
                    onChange={(event) =>
                      updateSetting("spotifyAccessToken", event.target.value)
                    }
                    placeholder="OAuth PKCE pendiente"
                  />
                </label>

                <label>
                  RetroAchievements usuario

                  <input
                    value={settings.retroAchievementsUser}
                    onChange={(event) =>
                      updateSetting(
                        "retroAchievementsUser",
                        event.target.value,
                      )
                    }
                    placeholder={t.notConfigured}
                  />
                </label>

                <label>
                  RetroAchievements API key

                  <input
                    type="password"
                    autoComplete="off"
                    value={settings.retroAchievementsApiKey}
                    onChange={(event) =>
                      updateSetting(
                        "retroAchievementsApiKey",
                        event.target.value,
                      )
                    }
                    placeholder={t.notConfigured}
                  />
                </label>

                <label>
                  Steam Web API key

                  <input
                    type="password"
                    autoComplete="off"
                    value={settings.steamWebApiKey}
                    onChange={(event) =>
                      updateSetting("steamWebApiKey", event.target.value)
                    }
                    placeholder={t.notConfigured}
                  />
                </label>

                <label>
                  SteamGridDB API key

                  <input
                    type="password"
                    autoComplete="off"
                    value={settings.steamGridDbApiKey}
                    onChange={(event) =>
                      updateSetting("steamGridDbApiKey", event.target.value)
                    }
                    placeholder={t.notConfigured}
                  />
                </label>

                <label>
                  ScreenScraper developer ID

                  <input
                    value={settings.screenScraperDevId}
                    onChange={(event) =>
                      updateSetting("screenScraperDevId", event.target.value)
                    }
                    placeholder="Opcional: ID de desarrollador"
                  />
                </label>

                <label>
                  ScreenScraper developer password

                  <input
                    type="password"
                    autoComplete="off"
                    value={settings.screenScraperDevPassword}
                    onChange={(event) =>
                      updateSetting("screenScraperDevPassword", event.target.value)
                    }
                    placeholder="Opcional: contraseña de desarrollador"
                  />
                </label>

                <label>
                  ScreenScraper usuario

                  <input
                    value={settings.screenScraperUser}
                    onChange={(event) =>
                      updateSetting("screenScraperUser", event.target.value)
                    }
                    placeholder="Usuario ScreenScraper"
                  />
                </label>

                <label>
                  ScreenScraper contraseña

                  <input
                    type="password"
                    autoComplete="off"
                    value={settings.screenScraperPassword}
                    onChange={(event) =>
                      updateSetting("screenScraperPassword", event.target.value)
                    }
                    placeholder="Contraseña ScreenScraper"
                  />
                </label>

                <label>
                  OpenWeatherMap API key

                  <input
                    type="password"
                    autoComplete="off"
                    value={settings.openWeatherMapApiKey}
                    onChange={(event) =>
                      updateSetting(
                        "openWeatherMapApiKey",
                        event.target.value,
                      )
                    }
                    placeholder={t.notConfigured}
                  />
                </label>

                <label>
                  Gemini API key

                  <input
                    type="password"
                    autoComplete="off"
                    value={settings.geminiApiKey}
                    onChange={(event) =>
                      updateSetting("geminiApiKey", event.target.value)
                    }
                    placeholder={t.notConfigured}
                  />
                </label>

                <label>
                  Ollama URL

                  <input
                    value={settings.ollamaUrl}
                    onChange={(event) =>
                      updateSetting("ollamaUrl", event.target.value)
                    }
                  />
                </label>

                <label>
                  Ollama modelo

                  <input
                    value={settings.ollamaModel}
                    onChange={(event) =>
                      updateSetting("ollamaModel", event.target.value)
                    }
                  />
                </label>

                <label>
                  Discord

                  <select
                    value={settings.discordMode}
                    onChange={(event) =>
                      updateSetting(
                        "discordMode",
                        event.target.value as Settings["discordMode"],
                      )
                    }
                  >
                    <option value="disabled">Desactivado</option>
                    <option value="rpc">RPC local</option>
                    <option value="server">Servidor compartido</option>
                  </select>
                </label>

                <label>
                  Discord bot token

                  <input
                    type="password"
                    autoComplete="off"
                    value={settings.discordBotToken}
                    onChange={(event) =>
                      updateSetting("discordBotToken", event.target.value)
                    }
                    placeholder="Bot token oficial"
                  />
                </label>

                <label>
                  Discord guild ID

                  <input
                    value={settings.discordGuildId}
                    onChange={(event) =>
                      updateSetting("discordGuildId", event.target.value)
                    }
                    placeholder="Servidor de Discord"
                  />
                </label>
              </section>

              <section>
                <h3>Sistema y privacidad</h3>

                <button
                  className="danger-action"
                  type="button"
                  onClick={clearLocalSecrets}
                >
                  Borrar claves locales
                </button>

                <p className="hint">
                  Las llamadas de Gemini y Discord pasan por Tauri. Las
                  claves se conservan localmente durante desarrollo; el
                  siguiente endurecimiento es guardarlas en el keyring del
                  sistema.
                </p>
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
