import { useEffect, useState } from "react";
import "./App.css";

type Settings = {
  name: string;
  language: "es" | "en" | "pt";
  theme: "auto" | "dark" | "light";
  retroAchievementsUser: string;
  weatherLocation: string;
};

const defaultSettings: Settings = {
  name: "twittalien",
  language: "es",
  theme: "auto",
  retroAchievementsUser: "twittalien",
  weatherLocation: "Ubicación automática",
};

const achievements = [
  { name: "El viaje comienza", progress: 100 },
  { name: "Coleccionista", progress: 72 },
  { name: "Maestro del combate", progress: 43 },
];

const friends = [
  { name: "Nova", activity: "Jugando Helldivers 2", color: "#5ee7ff" },
  { name: "Kiro", activity: "En línea", color: "#8467ff" },
  { name: "Luz", activity: "Escuchando Spotify", color: "#ff6bb5" },
];

function Logo() {
  return (
    <svg className="logo-mark" viewBox="0 0 72 72" aria-hidden="true">
      <defs>
        <linearGradient id="logo-gradient" x1="8" y1="8" x2="64" y2="64">
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
  return <span className="icon" aria-hidden="true">{children}</span>;
}

function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const [settings, setSettings] = useState<Settings>(() => {
    const stored = localStorage.getItem("snext-settings");
    return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
  });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem("snext-settings", JSON.stringify(settings));
    document.documentElement.dataset.theme = settings.theme;
  }, [settings]);

  const locale =
    settings.language === "en"
      ? "en-US"
      : settings.language === "pt"
        ? "pt-BR"
        : "es-MX";

  return (
    <div className="app">
      <div className="ambient ambient-purple" />
      <div className="ambient ambient-cyan" />

      <header className="topbar">
        <div className="brand">
          <Logo />
          <div>
            <strong>snext</strong>
            <span>gaming companion</span>
          </div>
        </div>

        <div className="topbar-actions">
          <div className="user">
            <span className="user-avatar">
              {settings.name.slice(0, 2).toUpperCase()}
            </span>
            <span>{settings.name}</span>
          </div>

          <button
            className="settings-button"
            type="button"
            aria-label="Abrir configuración"
            onClick={() => setSettingsOpen(true)}
          >
            ⚙
          </button>
        </div>
      </header>

      <main>
        <section className="welcome">
          <div>
            <p className="eyebrow">PANTALLA DE JUEGO</p>
            <h1>
              Tu partida, <span>en contexto.</span>
            </h1>
            <p className="welcome-copy">
              Información, progreso y servicios mientras juegas.
            </p>
          </div>

          <div className="date-widget">
            <strong>
              {now.toLocaleTimeString(locale, {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </strong>
            <span>
              {now.toLocaleDateString(locale, {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </span>
          </div>
        </section>

        <section className="dashboard">
          <article className="card game-card">
            <div className="card-heading">
              <div>
                <p className="eyebrow">JUEGO ACTIVO</p>
                <h2>The Legend of Zelda</h2>
              </div>
              <span className="status">
                <i /> EN JUEGO
              </span>
            </div>

            <div className="game-content">
              <div className="game-cover">
                <Logo />
              </div>
              <div className="game-details">
                <span className="platform">Nintendo Switch · Emulación</span>
                <p>
                  Explora un vasto reino, descubre secretos y recupera el poder
                  perdido mientras completas tu aventura.
                </p>
                <div className="game-stats">
                  <div><strong>42 h</strong><span>Tiempo jugado</span></div>
                  <div><strong>9.4</strong><span>Calificación</span></div>
                  <div><strong>68%</strong><span>Progreso</span></div>
                </div>
              </div>
            </div>
          </article>

          <article className="card music-card">
            <div className="card-title">
              <Icon>♫</Icon>
              <div><span>Spotify</span><strong>Reproduciendo ahora</strong></div>
            </div>
            <div className="song">
              <div className="album-art">SN</div>
              <div>
                <h3>Midnight City</h3>
                <p>M83 · Hurry Up, We’re Dreaming</p>
              </div>
            </div>
            <div className="song-progress"><span /></div>
            <div className="song-time"><span>2:14</span><span>4:03</span></div>
          </article>

          <article className="card achievements-card">
            <div className="card-title">
              <Icon>◆</Icon>
              <div><span>Progreso</span><strong>Logros</strong></div>
              <b className="counter">18 / 42</b>
            </div>
            <div className="achievement-list">
              {achievements.map((achievement) => (
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
              <div><span>{settings.weatherLocation}</span><strong>Clima</strong></div>
            </div>
            <div className="weather">
              <strong>18°</strong>
              <div><b>Parcialmente nublado</b><span>Sensación de 17°</span></div>
            </div>
          </article>

          <article className="card friends-card">
            <div className="card-title">
              <Icon>◉</Icon>
              <div><span>Discord</span><strong>Amigos conectados</strong></div>
              <b className="counter">3</b>
            </div>
            <div className="friend-list">
              {friends.map((friend) => (
                <div className="friend" key={friend.name}>
                  <span
                    className="friend-avatar"
                    style={{ background: friend.color }}
                  >
                    {friend.name[0]}
                  </span>
                  <div><strong>{friend.name}</strong><span>{friend.activity}</span></div>
                  <i />
                </div>
              ))}
            </div>
          </article>

          <article className="card system-card">
            <div className="card-title">
              <Icon>▦</Icon>
              <div><span>Bazzite</span><strong>Tu equipo</strong></div>
            </div>
            <div className="system-grid">
              <div><span>CPU</span><strong>22%</strong><i><b style={{ width: "22%" }} /></i></div>
              <div><span>GPU</span><strong>64%</strong><i><b style={{ width: "64%" }} /></i></div>
              <div><span>RAM</span><strong>6.7 GB</strong><i><b style={{ width: "21%" }} /></i></div>
              <div><span>Red</span><strong>486 Mbps</strong><i><b style={{ width: "76%" }} /></i></div>
            </div>
          </article>

          <article className="card assistant-card">
            <div className="assistant-icon">✦</div>
            <div>
              <p className="eyebrow">SNEXT AI</p>
              <h2>Consejo para tu aventura</h2>
              <p>
                Antes de entrar al siguiente templo, combina alimentos con
                bonificaciones de resistencia. Podrás escalar durante más tiempo.
              </p>
            </div>
          </article>
        </section>
      </main>

      {settingsOpen && (
        <div className="settings-layer">
          <button
            className="backdrop"
            type="button"
            aria-label="Cerrar configuración"
            onClick={() => setSettingsOpen(false)}
          />

          <aside className="settings-panel">
            <header>
              <div>
                <p className="eyebrow">SNEXT</p>
                <h2>Configuración</h2>
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setSettingsOpen(false)}
              >
                ×
              </button>
            </header>

            <div className="settings-content">
              <section>
                <h3>Perfil</h3>
                <label>
                  Nombre visible
                  <input
                    value={settings.name}
                    onChange={(event) =>
                      setSettings({ ...settings, name: event.target.value })
                    }
                  />
                </label>
                <p className="hint">
                  En la siguiente fase podrás elegir una foto local, de Steam o
                  de RetroAchievements.
                </p>
              </section>

              <section>
                <h3>Apariencia</h3>
                <label>
                  Idioma
                  <select
                    value={settings.language}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        language: event.target.value as Settings["language"],
                      })
                    }
                  >
                    <option value="es">Español</option>
                    <option value="en">English</option>
                    <option value="pt">Português</option>
                  </select>
                </label>

                <label>
                  Tema
                  <select
                    value={settings.theme}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        theme: event.target.value as Settings["theme"],
                      })
                    }
                  >
                    <option value="auto">Automático</option>
                    <option value="dark">Oscuro</option>
                    <option value="light">Claro</option>
                  </select>
                </label>
              </section>

              <section>
                <h3>Clima</h3>
                <label>
                  Ubicación
                  <input
                    value={settings.weatherLocation}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        weatherLocation: event.target.value,
                      })
                    }
                  />
                </label>
              </section>

              <section>
                <h3>Integraciones</h3>
                {[
                  "Spotify Client ID",
                  "RetroAchievements API key",
                  "SteamGridDB API key",
                  "OpenWeatherMap API key",
                  "Gemini API key",
                ].map((label) => (
                  <label key={label}>
                    {label}
                    <input type="password" placeholder="Sin configurar" />
                  </label>
                ))}
              </section>

              <p className="privacy">
                Esta versión utiliza información demostrativa. No introduzcas
                todavía credenciales reales.
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export default App;