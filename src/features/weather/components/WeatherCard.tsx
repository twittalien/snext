import { useMemo } from "react";
import { Card } from "../../../components/ui";
import "./WeatherCard.css";

export type WeatherCondition =
  | "clear"
  | "partly-cloudy"
  | "cloudy"
  | "rain"
  | "storm"
  | "snow"
  | "fog";

export type WeatherForecastItem = {
  label: string;
  temperature: number;
  condition: WeatherCondition;
};

export type WeatherData = {
  condition: WeatherCondition;
  conditionLabel: string;
  temperature: number;
  feelsLike: number;
  location: string;
  isDay: boolean;
  forecast: WeatherForecastItem[];
  updatedAt?: Date;
};

type WeatherCardProps = {
  weather?: WeatherData;
  now: Date;
  locale?: string;
  loading?: boolean;
  motion?: "full" | "reduced" | "off";
  className?: string;
};

const weatherSymbols: Record<WeatherCondition, string> = {
  clear: "☀",
  "partly-cloudy": "◑",
  cloudy: "☁",
  rain: "☂",
  storm: "ϟ",
  snow: "✣",
  fog: "≋",
};

function WeatherArt({
  condition,
  isDay,
}: {
  condition: WeatherCondition;
  isDay: boolean;
}) {
  const showClouds =
    condition === "partly-cloudy" ||
    condition === "cloudy" ||
    condition === "rain" ||
    condition === "storm" ||
    condition === "snow";

  return (
    <div className="weather-v2__art" aria-hidden="true">
      <div
        className={
          isDay
            ? "weather-v2__celestial weather-v2__sun"
            : "weather-v2__celestial weather-v2__moon"
        }
      />

      {showClouds && (
        <>
          <span className="weather-v2__cloud weather-v2__cloud--one" />
          <span className="weather-v2__cloud weather-v2__cloud--two" />
        </>
      )}

      {(condition === "rain" || condition === "storm") && (
        <div className="weather-v2__rain">
          {Array.from({ length: 12 }, (_, index) => (
            <i
              key={index}
              style={{
                left: `${4 + index * 8}%`,
                animationDelay: `${index * -110}ms`,
              }}
            />
          ))}
        </div>
      )}

      {condition === "storm" && (
        <span className="weather-v2__lightning">ϟ</span>
      )}

      {condition === "snow" && (
        <div className="weather-v2__snow">
          {Array.from({ length: 15 }, (_, index) => (
            <i
              key={index}
              style={{
                left: `${3 + ((index * 19) % 94)}%`,
                animationDelay: `${index * -180}ms`,
                animationDuration: `${3.8 + (index % 4)}s`,
              }}
            />
          ))}
        </div>
      )}

      {condition === "fog" && (
        <div className="weather-v2__fog">
          <i />
          <i />
          <i />
        </div>
      )}

      {!isDay && (
        <div className="weather-v2__stars">
          {Array.from({ length: 12 }, (_, index) => (
            <i
              key={index}
              style={{
                left: `${5 + ((index * 23) % 88)}%`,
                top: `${8 + ((index * 31) % 58)}%`,
                animationDelay: `${index * -240}ms`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ForecastSymbol({
  condition,
}: {
  condition: WeatherCondition;
}) {
  return (
    <span className="weather-v2__forecast-symbol" aria-hidden="true">
      {weatherSymbols[condition]}
    </span>
  );
}

export function WeatherCard({
  weather,
  now,
  locale = "es-MX",
  loading = false,
  motion = "full",
  className,
}: WeatherCardProps) {
  const timeText = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        hour: "2-digit",
        minute: "2-digit",
      }).format(now),
    [locale, now],
  );

  const dateText = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        weekday: "short",
        day: "2-digit",
        month: "short",
      })
        .format(now)
        .replace(".", "")
        .toUpperCase(),
    [locale, now],
  );

  if (!weather) {
    return (
      <Card
        className={[
          "weather-v2",
          "weather-v2--empty",
          `weather-v2--motion-${motion}`,
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        padding="none"
      >
        <div className="weather-v2__empty-content">
          <span aria-hidden="true">☁</span>

          <div>
            <h2>
              {loading
                ? "Actualizando el clima"
                : "Configura tu ubicación"}
            </h2>

            <p>
              {loading
                ? "Consultando las condiciones actuales."
                : "El reloj seguirá funcionando sin datos meteorológicos."}
            </p>
          </div>

          <div className="weather-v2__empty-time">
            <strong>{timeText}</strong>
            <span>{dateText}</span>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={[
        "weather-v2",
        `weather-v2--${weather.condition}`,
        weather.isDay
          ? "weather-v2--day"
          : "weather-v2--night",
        `weather-v2--motion-${motion}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      padding="none"
    >
      <WeatherArt
        condition={weather.condition}
        isDay={weather.isDay}
      />

      <div className="weather-v2__wash" />

      <div className="weather-v2__content">
        <header className="weather-v2__header">
          <div className="weather-v2__condition">
            <span aria-hidden="true">
              {weatherSymbols[weather.condition]}
            </span>
            <strong>{weather.conditionLabel}</strong>
          </div>

          <div className="weather-v2__clock">
            <strong>{timeText}</strong>
            <span>{dateText}</span>
          </div>
        </header>

        <div className="weather-v2__current">
          <div>
            <strong>{Math.round(weather.temperature)}°</strong>
            <span>
              Sensación de {Math.round(weather.feelsLike)}°
            </span>
          </div>

          <div className="weather-v2__location">
            <span>{weather.location}</span>
            <small>
              {weather.updatedAt
                ? `Actualizado ${new Intl.DateTimeFormat(locale, {
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(weather.updatedAt)}`
                : "Datos de demostración"}
            </small>
          </div>
        </div>
      </div>

      <footer className="weather-v2__forecast">
        {weather.forecast.slice(0, 5).map((item) => (
          <div key={`${item.label}-${item.temperature}`}>
            <span>{item.label}</span>
            <ForecastSymbol condition={item.condition} />
            <strong>{Math.round(item.temperature)}°</strong>
          </div>
        ))}
      </footer>
    </Card>
  );
}
