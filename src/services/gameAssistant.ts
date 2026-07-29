import type { GameHeroData } from "../features/game";

export type AssistantOptions = {
  geminiApiKey: string;
  ollamaUrl: string;
  ollamaModel: string;
  language: "es" | "en" | "pt";
};

export type AssistantInsight = {
  title: string;
  body: string;
  source: "gemini" | "ollama" | "local";
  updatedAt: string;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

type OllamaResponse = {
  response?: string;
};

const cacheTtlMs = 1000 * 60 * 30;

function cacheKey(game: GameHeroData, options: AssistantOptions) {
  return [
    "snext-assistant",
    options.language,
    game.title.toLowerCase(),
    game.source.toLowerCase(),
  ].join(":");
}

function readCachedInsight(key: string): AssistantInsight | null {
  try {
    const stored = localStorage.getItem(key);

    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as AssistantInsight & {
      cachedAt: number;
    };

    if (Date.now() - parsed.cachedAt > cacheTtlMs) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeCachedInsight(key: string, insight: AssistantInsight) {
  localStorage.setItem(
    key,
    JSON.stringify({
      ...insight,
      cachedAt: Date.now(),
    }),
  );
}

function buildPrompt(game: GameHeroData, language: AssistantOptions["language"]) {
  const languageName =
    language === "en" ? "English" : language === "pt" ? "Portuguese" : "Spanish";

  return [
    `Answer in ${languageName}.`,
    "You are Snext, a concise gaming companion shown on a secondary monitor.",
    "Give one practical, non-spoiler gameplay tip for the detected game.",
    "Avoid pretending you know the player's exact mission unless it is provided.",
    "Keep the answer under 55 words.",
    `Game title: ${game.title}`,
    `Platform/source: ${game.platform} / ${game.source}`,
    `Description: ${game.description}`,
  ].join("\n");
}

function localInsight(game: GameHeroData, language: AssistantOptions["language"]): AssistantInsight {
  const title =
    language === "en"
      ? "Context tip"
      : language === "pt"
        ? "Dica contextual"
        : "Consejo contextual";
  const body =
    language === "en"
      ? `Snext detected ${game.title}. Check your next objective, inventory and difficulty before continuing; once metadata is connected, tips will become specific to this game.`
      : language === "pt"
        ? `Snext detectou ${game.title}. Revise objetivo, inventário e dificuldade antes de continuar; quando os metadados estiverem conectados, as dicas serão específicas.`
        : `Snext detectó ${game.title}. Revisa objetivo, inventario y dificultad antes de continuar; cuando conectemos metadatos, los consejos serán específicos del juego.`;

  return {
    title,
    body,
    source: "local",
    updatedAt: new Date().toISOString(),
  };
}

async function loadGeminiInsight(
  game: GameHeroData,
  options: AssistantOptions,
): Promise<AssistantInsight | null> {
  if (!options.geminiApiKey.trim()) {
    return null;
  }

  const url = new URL(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
  );
  url.searchParams.set("key", options.geminiApiKey);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: buildPrompt(game, options.language) }],
        },
      ],
    }),
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as GeminiResponse;
  const body = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

  if (!body) {
    return null;
  }

  return {
    title: "Snext AI",
    body,
    source: "gemini",
    updatedAt: new Date().toISOString(),
  };
}

async function loadOllamaInsight(
  game: GameHeroData,
  options: AssistantOptions,
): Promise<AssistantInsight | null> {
  if (!options.ollamaUrl.trim() || !options.ollamaModel.trim()) {
    return null;
  }

  const response = await fetch(`${options.ollamaUrl.replace(/\/$/, "")}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options.ollamaModel,
      prompt: buildPrompt(game, options.language),
      stream: false,
    }),
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as OllamaResponse;
  const body = data.response?.trim();

  if (!body) {
    return null;
  }

  return {
    title: "Snext AI",
    body,
    source: "ollama",
    updatedAt: new Date().toISOString(),
  };
}

export async function loadAssistantInsight(
  game: GameHeroData,
  options: AssistantOptions,
): Promise<AssistantInsight> {
  const key = cacheKey(game, options);
  const cached = readCachedInsight(key);

  if (cached) {
    return cached;
  }

  const insight =
    (await loadGeminiInsight(game, options)) ??
    (await loadOllamaInsight(game, options)) ??
    localInsight(game, options.language);

  writeCachedInsight(key, insight);
  return insight;
}
