import { invoke } from "@tauri-apps/api/core";
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

type NativeAiTipResponse = {
  title: string;
  body: string;
  source: "gemini" | "ollama" | "local";
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

async function loadNativeInsight(
  game: GameHeroData,
  options: AssistantOptions,
): Promise<AssistantInsight | null> {
  try {
    const response = await invoke<NativeAiTipResponse>("generate_ai_tip", {
      request: {
        provider: options.geminiApiKey.trim() ? "gemini" : "ollama",
        api_key: options.geminiApiKey,
        ollama_url: options.ollamaUrl,
        ollama_model: options.ollamaModel,
        language: options.language,
        game_title: game.title,
        platform: `${game.platform} / ${game.source}`,
        description: game.description,
      },
    });

    if (!response.body.trim()) {
      return null;
    }

    return {
      ...response,
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

async function loadBrowserOllamaInsight(
  game: GameHeroData,
  options: AssistantOptions,
): Promise<AssistantInsight | null> {
  if (!options.ollamaUrl.trim() || !options.ollamaModel.trim()) {
    return null;
  }

  const languageName =
    options.language === "en"
      ? "English"
      : options.language === "pt"
        ? "Portuguese"
        : "Spanish";
  const prompt = [
    `Answer in ${languageName}.`,
    "You are Snext, a concise gaming companion shown on a secondary monitor.",
    "Give one practical, non-spoiler gameplay tip for the detected game.",
    "Avoid pretending you know the player's exact mission unless it is provided.",
    "Keep the answer under 55 words.",
    `Game title: ${game.title}`,
    `Platform/source: ${game.platform} / ${game.source}`,
    `Description: ${game.description}`,
  ].join("\n");

  try {
    const response = await fetch(`${options.ollamaUrl.replace(/\/$/, "")}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: options.ollamaModel,
        prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { response?: string };
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
  } catch {
    return null;
  }
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
    (await loadNativeInsight(game, options)) ??
    (await loadBrowserOllamaInsight(game, options)) ??
    localInsight(game, options.language);

  writeCachedInsight(key, insight);
  return insight;
}
