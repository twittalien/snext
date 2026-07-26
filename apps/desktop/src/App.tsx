import { useEffect, useRef, useState } from "react";
import "./App.css";

type DashboardCard = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  meta: string;
  size?: "normal" | "wide" | "tall";
  accent: "cyan" | "violet" | "blue" | "pink";
  icon: string;
};

const navigation = [
  { label: "Inicio", icon: "⌂" },
  { label: "Biblioteca", icon: "▦" },
  { label: "Actividad", icon: "◉" },
  { label: "Social", icon: "◎" },
  { label: "Sistema", icon: "◈" },
];

const cards: DashboardCard[] = [
  {
    id: "continue",
    eyebrow: "Continuar jugando",
    title: "Cyberpunk 2077",
    description: "Última sesión hace 2 horas",
    meta: "46 h jugadas",
    size: "wide",
    accent: "violet",
    icon: "▶",
  },
  {
    id: "library",
    eyebrow: "Colección",
    title: "Biblioteca",
    description: "Steam, Epic, retro y juegos locales",
    meta: "184 juegos",
    accent: "cyan",
    icon: "▦",
  },
  {
    id: "friends",
    eyebrow: "Discord",
    title: "Amigos",
    description: "3 amigos están jugando ahora",
    meta: "12 conectados",
    accent: "blue",
    icon: "◎",
  },
  {
    id: "activity",
    eyebrow: "Actividad reciente",
    title: "Logros",
    description: "Desbloqueaste Caminante nocturno",
    meta: "72 % completado",
    accent: "pink",
    icon: "✦",
  },
  {
    id: "system",
    eyebrow: "Estado del equipo",
    title: "Snext Machine",
    description: "Todos los servicios funcionan correctamente",
    meta: "GPU 54 °C · CPU 42 °C",
    size: "wide",
    accent: "cyan",
    icon: "◈",
  },
];

function App() {
  const [activeNavigation, setActiveNavigation] = useState(0);
  const [focusedCard, setFocusedCard] = useState(0);
  const [message, setMessage] = useState("Selecciona un módulo para comenzar");
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const focusCard = (index: number) => {
    const normalizedIndex = Math.max(0, Math.min(index, cards.length - 1));
    setFocusedCard(normalizedIndex);
    cardRefs.current[normalizedIndex]?.focus();
  };

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Home") {
        event.preventDefault();
        focusCard(0);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  const handleCardKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    const gridColumns = 3;
    let nextIndex = index;

    switch (event.key) {
      case "ArrowRight":
        nextIndex = Math.min(index + 1, cards.length - 1);
        break;
      case "ArrowLeft":
        nextIndex = Math.max(index - 1, 0);
        break;
      case "ArrowDown":
        nextIndex = Math.min(index + gridColumns, cards.length - 1);
        break;
      case "ArrowUp":
        nextIndex = Math.max(index - gridColumns, 0);
        break;
      default:
        return;
    }

    event.preventDefault();
    focusCard(nextIndex);
  };

  const activateCard = (card: DashboardCard) => {
    setMessage(`${card.title} estará disponible en una próxima iteración.`);
  };

  return (
    <main className="snext-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <aside className="sidebar" aria-label="Navegación principal">
        <div className="brand" aria-label="Snext">
          <div className="brand-symbol">
            <span />
            <span />
          </div>
          <span className="brand-name">snext</span>
        </div>

        <nav className="navigation">
          {navigation.map((item, index) => (
            <button
              className={`nav-item ${
                activeNavigation === index ? "nav-item-active" : ""
              }`}
              key={item.label}
              onClick={() => {
                setActiveNavigation(index);
                setMessage(`${item.label} seleccionado`);
              }}
              type="button"
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="avatar">OS</div>
          <div>
            <strong>twittalien</strong>
            <span>Perfil local</span>
          </div>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="overline">Buenas noches</p>
            <h1>Tu espacio, listo para jugar.</h1>
          </div>

          <div className="topbar-actions">
            <button className="icon-button" type="button" aria-label="Buscar">
              ⌕
            </button>
            <button
              className="status-pill"
              type="button"
              onClick={() => setMessage("Snext Machine está conectada")}
            >
              <span className="status-dot" />
              Snext Machine
            </button>
            <time>02:32</time>
          </div>
        </header>

        <section className="dashboard" aria-label="Panel principal">
          {cards.map((card, index) => (
            <button
              ref={(element) => {
                cardRefs.current[index] = element;
              }}
              className={`dashboard-card card-${card.accent} ${
                card.size ? `card-${card.size}` : ""
              } ${focusedCard === index ? "card-current" : ""}`}
              key={card.id}
              type="button"
              onFocus={() => setFocusedCard(index)}
              onKeyDown={(event) => handleCardKeyDown(event, index)}
              onClick={() => activateCard(card)}
            >
              <div className="card-glow" />
              <div className="card-header">
                <span className="card-icon">{card.icon}</span>
                <span className="card-arrow">↗</span>
              </div>

              <div className="card-copy">
                <span className="card-eyebrow">{card.eyebrow}</span>
                <h2>{card.title}</h2>
                <p>{card.description}</p>
              </div>

              <span className="card-meta">{card.meta}</span>
            </button>
          ))}
        </section>

        <footer className="command-bar">
          <p>{message}</p>
          <div className="control-hints">
            <span>
              <kbd>↑ ↓ ← →</kbd> Navegar
            </span>
            <span>
              <kbd>Enter</kbd> Abrir
            </span>
            <span>
              <kbd>Home</kbd> Inicio
            </span>
          </div>
        </footer>
      </section>
    </main>
  );
}

export default App;
