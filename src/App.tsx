import {
  type CSSProperties,
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { openUrl } from "@tauri-apps/plugin-opener";
import "./App.css";
import { AchievementsCarousel } from "./features/achievements";
import { GameHero } from "./features/game";
import { SpotifyCard } from "./features/spotify";
import { WeatherCard } from "./features/weather";
import { getTranslation, type Language } from "./i18n";
import {
  loadDashboardData,
  type DashboardData,
  normalizeGameTitleKey,
  searchSteamGridDbGames,
  type SteamGridSearchResult,
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
  spotifyRefreshToken: string;
  spotifyTokenExpiresAt: number;
  retroAchievementsApiKey: string;
  steamWebApiKey: string;
  steamGridDbApiKey: string;
  steamGridDbGameOverrides: Record<string, number>;
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

type SpotifyCallbackResponse = {
  code: string;
};

type PendingGameMatch = {
  title: string;
  key: string;
  candidates: SteamGridSearchResult[];
};

const SNEXT_VERSION = "2.0.1";
const SNEXT_BUILD = "AppImage portable con acceso KDE autocreado";
const SPOTIFY_REDIRECT_URI = "http://127.0.0.1:53127/callback";
const SPOTIFY_SCOPES = [
  "user-read-currently-playing",
  "user-read-playback-state",
].join(" ");

type CredentialHelp = {
  title: string;
  steps: string[];
  linkLabel: string;
  url: string;
};

const CREDENTIAL_HELP = {
  spotify: {
    title: "Spotify Client ID",
    steps: [
      "Inicia sesión en Spotify for Developers.",
      "Crea una app o abre la existente y copia su Client ID.",
      `Agrega ${SPOTIFY_REDIRECT_URI} como Redirect URI y guarda.`,
    ],
    linkLabel: "Abrir Spotify Developer Dashboard",
    url: "https://developer.spotify.com/dashboard",
  },
  retroUser: {
    title: "Usuario RetroAchievements",
    steps: [
      "Inicia sesión en RetroAchievements.",
      "Escribe exactamente tu nombre de usuario público, no tu correo.",
    ],
    linkLabel: "Abrir RetroAchievements",
    url: "https://retroachievements.org/settings",
  },
  retroKey: {
    title: "RetroAchievements Web API Key",
    steps: [
      "Inicia sesión y abre Settings en RetroAchievements.",
      "Copia la Web API Key y pégala aquí. No la compartas.",
    ],
    linkLabel: "Abrir configuración de RetroAchievements",
    url: "https://retroachievements.org/settings",
  },
  steamWeb: {
    title: "Steam Web API Key",
    steps: [
      "Inicia sesión con la cuenta de Steam que usarás en Snext.",
      "Registra un nombre de dominio local, por ejemplo localhost, y copia la key.",
    ],
    linkLabel: "Abrir Steam Web API Key",
    url: "https://steamcommunity.com/dev/apikey",
  },
  steamGrid: {
    title: "SteamGridDB API Key",
    steps: [
      "Inicia sesión o crea tu cuenta en SteamGridDB.",
      "Abre API Preferences, genera una key y pégala aquí.",
    ],
    linkLabel: "Abrir SteamGridDB API Preferences",
    url: "https://www.steamgriddb.com/profile/preferences/api",
  },
  openWeather: {
    title: "OpenWeatherMap API Key",
    steps: [
      "Crea una cuenta de OpenWeatherMap.",
      "Abre My API Keys, genera una key y espera su activación si el portal lo indica.",
    ],
    linkLabel: "Abrir OpenWeatherMap API Keys",
    url: "https://home.openweathermap.org/api_keys",
  },
  gemini: {
    title: "Gemini API Key",
    steps: [
      "Abre Google AI Studio con tu cuenta de Google.",
      "Crea una API key para un proyecto y restríngela a Gemini API.",
    ],
    linkLabel: "Abrir Google AI Studio",
    url: "https://aistudio.google.com/app/apikey",
  },
  ollama: {
    title: "Ollama local",
    steps: [
      "Instala Ollama en Bazzite y descarga un modelo, por ejemplo llama3.1.",
      "Deja la URL local y el nombre del modelo que instalaste. No requiere API key.",
    ],
    linkLabel: "Abrir Ollama",
    url: "https://ollama.com/download",
  },
  discordBot: {
    title: "Discord Bot Token",
    steps: [
      "Crea una aplicación en Discord Developer Portal y añade un Bot.",
      "Copia el token del bot, activa los intents necesarios e invita el bot a tu servidor.",
    ],
    linkLabel: "Abrir Discord Developer Portal",
    url: "https://discord.com/developers/applications",
  },
  discordGuild: {
    title: "Discord Guild ID",
    steps: [
      "Activa Developer Mode en Discord.",
      "Haz clic derecho sobre tu servidor y usa Copiar ID del servidor.",
    ],
    linkLabel: "Abrir Discord Developer Portal",
    url: "https://discord.com/developers/applications",
  },
} satisfies Record<string, CredentialHelp>;

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
  spotifyRefreshToken: "",
  spotifyTokenExpiresAt: 0,
  retroAchievementsApiKey: "",
  steamWebApiKey: "",
  steamGridDbApiKey: "",
  steamGridDbGameOverrides: {},
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

function base64UrlEncode(buffer: ArrayBuffer) {
  return window
    .btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function createCodeVerifier() {
  const bytes = new Uint8Array(64);
  window.crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes.buffer);
}

async function createCodeChallenge(verifier: string) {
  const data = new TextEncoder().encode(verifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(digest);
}

type SpotifyTokenData = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
};

async function refreshSpotifyAccessToken(
  clientId: string,
  refreshToken: string,
): Promise<SpotifyTokenData> {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  const data = (await response.json()) as SpotifyTokenData;
  if (!response.ok || !data.access_token) {
    throw new Error(data.error ?? `Spotify respondió ${response.status}`);
  }
  return data;
}

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

function CredentialLabel({
  children,
  help,
  onOpen,
}: {
  children: string;
  help: CredentialHelp;
  onOpen: (help: CredentialHelp) => void;
}) {
  return (
    <span className="credential-label">
      <span>{children}</span>
      <button
        className="credential-help-button"
        type="button"
        aria-label={`Cómo configurar ${children}`}
        title={`Cómo configurar ${children}`}
        onClick={() => onOpen(help)}
      >
        ❕
      </button>
    </span>
  );
}

function Logo() {
  return (
    <svg className="logo-mark" viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient
          id="logo-gradient"
          x1="10"
          y1="54"
          x2="54"
          y2="10"
        >
          <stop stopColor="#7658ed" />
          <stop offset="0.5" stopColor="#5f9ff0" />
          <stop offset="1" stopColor="#59e2e7" />
        </linearGradient>
      </defs>
      <path
        d="M24.7 39.3 18.4 45.6A11.2 11.2 0 0 1 2.6 29.8l12.7-12.7a11.2 11.2 0 0 1 15.8 0l3.1 3.1"
        fill="none"
        stroke="url(#logo-gradient)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m39.3 24.7 6.3-6.3a11.2 11.2 0 0 1 15.8 15.8L48.7 46.9a11.2 11.2 0 0 1-15.8 0l-3.1-3.1"
        fill="none"
        stroke="url(#logo-gradient)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m23 41 18-18"
        fill="none"
        stroke="#f7fcff"
        strokeWidth="4"
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

function MetricGauge({
  label,
  value,
  display,
  tone = "cyan",
}: {
  label: string;
  value: number;
  display: string;
  tone?: "cyan" | "violet" | "green" | "amber" | "rose";
}) {
  const safeValue = Math.min(100, Math.max(0, value));

  return (
    <div
      className={`system-metric system-metric--${tone}`}
      style={{ "--metric-value": `${safeValue}%` } as CSSProperties}
    >
      <i aria-hidden="true" />
      <span>{label}</span>
      <strong>{display}</strong>
    </div>
  );
}

function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [credentialHelp, setCredentialHelp] = useState<CredentialHelp | null>(
    null,
  );
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
  const [pendingGameMatch, setPendingGameMatch] =
    useState<PendingGameMatch | null>(null);
  const [dismissedGameMatchKey, setDismissedGameMatchKey] = useState("");

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

      let spotifyAccessToken = settings.spotifyAccessToken;
      const tokenExpiresSoon =
        Boolean(settings.spotifyRefreshToken) &&
        settings.spotifyTokenExpiresAt <= Date.now() + 90_000;
      if (tokenExpiresSoon && settings.spotifyClientId.trim()) {
        try {
          const token = await refreshSpotifyAccessToken(
            settings.spotifyClientId.trim(),
            settings.spotifyRefreshToken,
          );
          spotifyAccessToken = token.access_token ?? spotifyAccessToken;
          setSettings((currentSettings) => ({
            ...currentSettings,
            spotifyAccessToken,
            spotifyRefreshToken:
              token.refresh_token ?? currentSettings.spotifyRefreshToken,
            spotifyTokenExpiresAt:
              Date.now() + Math.max(30, token.expires_in ?? 3600) * 1000,
          }));
        } catch (error) {
          console.error("Spotify token refresh failed", error);
          if (error instanceof Error && error.message === "invalid_grant") {
            setSettings((currentSettings) => ({
              ...currentSettings,
              spotifyAccessToken: "",
              spotifyRefreshToken: "",
              spotifyTokenExpiresAt: 0,
            }));
            spotifyAccessToken = "";
          }
        }
      }

      const data = await loadDashboardData(settings.weatherLocation, locale, {
      language: settings.language,
      weatherProvider: settings.weatherProvider,
      openWeatherMapApiKey: settings.openWeatherMapApiKey,
      steamGridDbApiKey: settings.steamGridDbApiKey,
      steamGridDbGameOverrides: settings.steamGridDbGameOverrides,
      retroAchievementsUser: settings.retroAchievementsUser,
      retroAchievementsApiKey: settings.retroAchievementsApiKey,
      spotifyAccessToken,
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
      settings.spotifyClientId,
      settings.spotifyAccessToken,
      settings.spotifyRefreshToken,
      settings.spotifyTokenExpiresAt,
      settings.steamGridDbApiKey,
      settings.steamGridDbGameOverrides,
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

  useEffect(() => {
    const game = dashboardData?.game;
    if (!game || !settings.steamGridDbApiKey.trim()) {
      return;
    }

    const key = normalizeGameTitleKey(game.title);
    if (
      !key ||
      key === normalizeGameTitleKey("CGGamepadAPI Task") ||
      settings.steamGridDbGameOverrides[key] ||
      pendingGameMatch?.key === key ||
      dismissedGameMatchKey === key
    ) {
      return;
    }

    let active = true;
    searchSteamGridDbGames(game.title, settings.steamGridDbApiKey)
      .then((candidates) => {
        if (active && candidates.length > 1) {
          setPendingGameMatch({
            title: game.title,
            key,
            candidates,
          });
        }
      })
      .catch((error) => {
        console.error("SteamGridDB candidate search failed", error);
      });

    return () => {
      active = false;
    };
  }, [
    dashboardData?.game.title,
    dismissedGameMatchKey,
    pendingGameMatch?.key,
    settings.steamGridDbApiKey,
    settings.steamGridDbGameOverrides,
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
      spotifyRefreshToken: "",
      spotifyTokenExpiresAt: 0,
      retroAchievementsApiKey: "",
      steamWebApiKey: "",
      steamGridDbApiKey: "",
      openWeatherMapApiKey: "",
      geminiApiKey: "",
      discordBotToken: "",
    }));
  };

  const connectSpotify = async () => {
    const clientId = settings.spotifyClientId.trim();
    if (!clientId) {
      window.alert("Primero pega tu Spotify Client ID.");
      return;
    }

    const verifier = createCodeVerifier();
    const challenge = await createCodeChallenge(verifier);
    const state = createCodeVerifier().slice(0, 32);
    localStorage.setItem("snext-spotify-code-verifier", verifier);
    localStorage.setItem("snext-spotify-oauth-state", state);

    const url = new URL("https://accounts.spotify.com/authorize");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", SPOTIFY_REDIRECT_URI);
    url.searchParams.set("scope", SPOTIFY_SCOPES);
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("code_challenge", challenge);
    url.searchParams.set("state", state);

    try {
      const callbackPromise = invoke<SpotifyCallbackResponse>("listen_spotify_callback", {
        request: { state },
      });
      await openUrl(url.toString());
      const { code } = await callbackPromise;

      const body = new URLSearchParams({
        client_id: clientId,
        grant_type: "authorization_code",
        code,
        redirect_uri: SPOTIFY_REDIRECT_URI,
        code_verifier: verifier,
      });

      const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });

      if (!response.ok) {
        throw new Error(`Spotify respondió ${response.status}`);
      }

      const tokenData = (await response.json()) as SpotifyTokenData;

      if (!tokenData.access_token) {
        throw new Error("Spotify no devolvió access_token.");
      }

      localStorage.removeItem("snext-spotify-code-verifier");
      localStorage.removeItem("snext-spotify-oauth-state");
      setSettings((currentSettings) => ({
        ...currentSettings,
        spotifyAccessToken: tokenData.access_token ?? "",
        spotifyRefreshToken: tokenData.refresh_token ?? "",
        spotifyTokenExpiresAt:
          Date.now() + Math.max(30, tokenData.expires_in ?? 3600) * 1000,
      }));
      await refreshDashboard(false);
    } catch (error) {
      window.alert(
        `No se pudo conectar Spotify. ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  const disconnectSpotify = () => {
    localStorage.removeItem("snext-spotify-code-verifier");
    localStorage.removeItem("snext-spotify-oauth-state");
    setSettings((currentSettings) => ({
      ...currentSettings,
      spotifyAccessToken: "",
      spotifyRefreshToken: "",
      spotifyTokenExpiresAt: 0,
    }));
  };

  const selectSteamGridDbMatch = (candidate: SteamGridSearchResult) => {
    if (!pendingGameMatch) return;
    setSettings((currentSettings) => ({
      ...currentSettings,
      steamGridDbGameOverrides: {
        ...currentSettings.steamGridDbGameOverrides,
        [pendingGameMatch.key]: candidate.id,
      },
    }));
    setPendingGameMatch(null);
    window.setTimeout(() => {
      refreshDashboard(false).catch((error) => {
        console.error("No se pudo refrescar después de elegir SteamGridDB", error);
      });
    }, 0);
  };

  const dismissSteamGridDbMatch = () => {
    if (pendingGameMatch) {
      setDismissedGameMatchKey(pendingGameMatch.key);
    }
    setPendingGameMatch(null);
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

          <div className="achievements-card">
            <AchievementsCarousel
              games={dashboardData?.achievementGames ?? []}
              rotationSeconds={settings.achievementRotationSeconds}
              title={t.achievements}
            />
          </div>

          <div className="music-card">
            <SpotifyCard
              track={dashboardData?.track}
              connected={Boolean(dashboardData?.track)}
              aiOptions={{
                ollamaUrl: settings.ollamaUrl,
                ollamaModel: settings.ollamaModel,
                language: settings.language,
              }}
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
              <MetricGauge
                label="CPU"
                value={dashboardData?.system.cpuLoad ?? 0}
                display={`${dashboardData?.system.cpuLoad ?? 0}%`}
                tone="cyan"
              />

              <MetricGauge
                label="GPU"
                value={dashboardData?.system.gpuLoad ?? 0}
                display={`${dashboardData?.system.gpuLoad ?? 0}%`}
                tone="violet"
              />

              {dashboardData?.system.vramLabel ? (
                <MetricGauge
                  label="VRAM"
                  value={dashboardData.system.vramLoad ?? 0}
                  display={dashboardData.system.vramLabel}
                  tone="rose"
                />
              ) : null}

              <MetricGauge
                label="RAM"
                value={dashboardData?.system.memoryLoad ?? 0}
                display={dashboardData?.system.memoryLabel ?? "N/D"}
                tone="green"
              />

              {dashboardData?.system.cpuTemperatureLabel ? (
                <MetricGauge
                  label="CPU temp"
                  value={Number.parseInt(dashboardData.system.cpuTemperatureLabel, 10) || 0}
                  display={dashboardData.system.cpuTemperatureLabel}
                  tone="amber"
                />
              ) : null}

              <MetricGauge
                label={t.network}
                value={dashboardData?.system.networkLoad ?? 0}
                display={dashboardData?.system.networkLabel ?? "N/D"}
                tone="cyan"
              />

              {dashboardData?.system.batteryLabel ? (
                <MetricGauge
                  label="Batería"
                  value={dashboardData.system.batteryLoad ?? 0}
                  display={dashboardData.system.batteryLabel}
                  tone="green"
                />
              ) : null}
            </div>
          </article>
        </section>
      </main>

      {pendingGameMatch && (
        <div className="match-layer" role="dialog" aria-modal="true">
          <div className="match-modal">
            <header>
              <div>
                <p className="eyebrow">SteamGridDB</p>
                <h2>Selecciona el juego correcto</h2>
              </div>
              <button type="button" onClick={dismissSteamGridDbMatch}>
                ×
              </button>
            </header>

            <p className="hint">
              Snext encontró varias coincidencias para <strong>{pendingGameMatch.title}</strong>.
            </p>

            <div className="match-list">
              {pendingGameMatch.candidates.map((candidate) => (
                <button
                  type="button"
                  key={candidate.id}
                  onClick={() => selectSteamGridDbMatch(candidate)}
                >
                  <strong>{candidate.name}</strong>
                  <span>
                    ID {candidate.id}
                    {candidate.release_date ? ` · ${candidate.release_date}` : ""}
                    {candidate.types.length ? ` · ${candidate.types.join(", ")}` : ""}
                  </span>
                </button>
              ))}
            </div>

            <button
              className="match-auto"
              type="button"
              onClick={dismissSteamGridDbMatch}
            >
              Usar selección automática esta vez
            </button>
          </div>
        </div>
      )}

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
                  <summary>Juego activo, ES-DE y SteamGridDB</summary>
                  <p>
                    La detección se actualiza cada 10 segundos. Para juegos emulados, Snext lee las carátulas, fanart, marquee y descripción que ES-DE ya descargó. Para juegos de Steam, consulta Steam Store sin API key y guarda el resultado en caché local; SteamGridDB completa logos y arte alternativo cuando conectas una key.
                  </p>
                </details>

                <details>
                  <summary>ScreenScraper</summary>
                  <p>
                    No necesitas copiar credenciales de ScreenScraper a Snext. ES-DE ya usa su integración autorizada para descargar el scrape y Snext lee esos archivos locales. Si un juego no existe en tu scrape, Snext prueba Steam Store, SteamGridDB y Wikimedia sin reutilizar credenciales de otras aplicaciones.
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
                    Crea una aplicación en Spotify for Developers, agrega <code>{SPOTIFY_REDIRECT_URI}</code> como Redirect URI y pega el Client ID. Después presiona Conectar Spotify; Snext usará OAuth PKCE con permisos <code>user-read-currently-playing</code> y <code>user-read-playback-state</code>. No necesitas Client Secret para esta app local.
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
                  <CredentialLabel
                    help={CREDENTIAL_HELP.spotify}
                    onOpen={setCredentialHelp}
                  >
                    Spotify Client ID
                  </CredentialLabel>

                  <input
                    autoComplete="off"
                    value={settings.spotifyClientId}
                    onChange={(event) =>
                      updateSetting("spotifyClientId", event.target.value)
                    }
                    placeholder={t.notConfigured}
                  />
                </label>

                <div className="integration-actions">
                  <button type="button" onClick={connectSpotify}>
                    Conectar Spotify
                  </button>
                  <button type="button" onClick={disconnectSpotify}>
                    Desconectar
                  </button>
                </div>
                <p className="hint">
                  Redirect URI para Spotify: <code>{SPOTIFY_REDIRECT_URI}</code>
                  {settings.spotifyAccessToken
                    ? ` · Conectado hasta ${new Date(settings.spotifyTokenExpiresAt || Date.now()).toLocaleTimeString(locale)}`
                    : " · Spotify pendiente de conexión"}
                </p>

                <label>
                  <CredentialLabel
                    help={CREDENTIAL_HELP.retroUser}
                    onOpen={setCredentialHelp}
                  >
                    RetroAchievements usuario
                  </CredentialLabel>

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
                  <CredentialLabel
                    help={CREDENTIAL_HELP.retroKey}
                    onOpen={setCredentialHelp}
                  >
                    RetroAchievements API key
                  </CredentialLabel>

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
                  <CredentialLabel
                    help={CREDENTIAL_HELP.steamWeb}
                    onOpen={setCredentialHelp}
                  >
                    Steam Web API key
                  </CredentialLabel>

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
                  <CredentialLabel
                    help={CREDENTIAL_HELP.steamGrid}
                    onOpen={setCredentialHelp}
                  >
                    SteamGridDB API key
                  </CredentialLabel>

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
                  <CredentialLabel
                    help={CREDENTIAL_HELP.openWeather}
                    onOpen={setCredentialHelp}
                  >
                    OpenWeatherMap API key
                  </CredentialLabel>

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
                  <CredentialLabel
                    help={CREDENTIAL_HELP.gemini}
                    onOpen={setCredentialHelp}
                  >
                    Gemini API key
                  </CredentialLabel>

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
                  <CredentialLabel
                    help={CREDENTIAL_HELP.ollama}
                    onOpen={setCredentialHelp}
                  >
                    Ollama URL
                  </CredentialLabel>

                  <input
                    value={settings.ollamaUrl}
                    onChange={(event) =>
                      updateSetting("ollamaUrl", event.target.value)
                    }
                  />
                </label>

                <label>
                  <CredentialLabel
                    help={CREDENTIAL_HELP.ollama}
                    onOpen={setCredentialHelp}
                  >
                    Ollama modelo
                  </CredentialLabel>

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
                  <CredentialLabel
                    help={CREDENTIAL_HELP.discordBot}
                    onOpen={setCredentialHelp}
                  >
                    Discord bot token
                  </CredentialLabel>

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
                  <CredentialLabel
                    help={CREDENTIAL_HELP.discordGuild}
                    onOpen={setCredentialHelp}
                  >
                    Discord guild ID
                  </CredentialLabel>

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

      {credentialHelp && (
        <div className="credential-help-layer" role="presentation">
          <button
            className="backdrop"
            type="button"
            aria-label="Cerrar ayuda"
            onClick={() => setCredentialHelp(null)}
          />
          <section
            className="credential-help-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="credential-help-title"
          >
            <header>
              <div>
                <p className="eyebrow">CONFIGURACIÓN</p>
                <h2 id="credential-help-title">{credentialHelp.title}</h2>
              </div>
              <button
                type="button"
                aria-label="Cerrar ayuda"
                onClick={() => setCredentialHelp(null)}
              >
                ×
              </button>
            </header>
            <ol>
              {credentialHelp.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <button
              className="credential-help-link"
              type="button"
              onClick={() => openUrl(credentialHelp.url)}
            >
              {credentialHelp.linkLabel}
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
