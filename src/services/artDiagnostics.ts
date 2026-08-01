import { invoke } from "@tauri-apps/api/core";

export type ArtDiagnosticStep = {
  id: string;
  label: string;
  status: "ok" | "warning" | "error";
  detail: string;
  preview?: string;
};

type SteamGridArtResponse = {
  hero_image?: string;
  hero_images?: string[];
  cover_image?: string;
  logo?: string;
  matched_title: string;
};

type RemoteImageResponse = {
  data_url: string;
};

type RetroAchievement = {
  BadgeName?: string;
  Title?: string;
  Description?: string;
};

type RetroGame = {
  Title?: string;
  ImageBoxArt?: string;
  Achievements?: Record<string, RetroAchievement>;
};

type ArtDiagnosticOptions = {
  gameTitle: string;
  steamGridDbApiKey: string;
  retroAchievementsUser: string;
  retroAchievementsApiKey: string;
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function retroMediaUrl(path?: string, folder = "Images") {
  if (!path) return undefined;
  if (/^https:\/\//i.test(path)) return path;
  const normalized = path.replace(/^\/+/, "");
  if (/^(images|badge)\//i.test(normalized)) {
    return `https://media.retroachievements.org/${normalized}`;
  }
  return `https://media.retroachievements.org/${folder}/${normalized}`;
}

async function downloadPreview(url: string) {
  const response = await invoke<RemoteImageResponse>("fetch_remote_image", {
    request: { url },
  });
  if (!response.data_url.startsWith("data:image/")) {
    throw new Error("Tauri respondió, pero no produjo una imagen data válida");
  }
  return response.data_url;
}

export async function runArtDiagnostics(
  options: ArtDiagnosticOptions,
): Promise<ArtDiagnosticStep[]> {
  const steps: ArtDiagnosticStep[] = [];

  try {
    const preview = await downloadPreview(
      "https://media.retroachievements.org/Images/051872.png",
    );
    steps.push({
      id: "native-image",
      label: "Canal nativo de imágenes",
      status: "ok",
      detail: "Tauri descargó y convirtió una imagen externa correctamente.",
      preview,
    });
  } catch (error) {
    steps.push({
      id: "native-image",
      label: "Canal nativo de imágenes",
      status: "error",
      detail: errorMessage(error),
    });
  }

  try {
    const art = await invoke<SteamGridArtResponse>("fetch_es_de_art", {
      request: {
        title: options.gameTitle,
        platform: "",
        metadata_hint: "",
      },
    });
    const imageUrl = art.cover_image ?? art.hero_image ?? art.logo;
    steps.push({
      id: "esde-search",
      label: "ES-DE local",
      status: imageUrl ? "ok" : "warning",
      detail: imageUrl
        ? `Coincidencia local: ${art.matched_title}. Arte desde gamelist.xml.`
        : `Coincidencia local: ${art.matched_title}, pero sin imagen local.`,
    });
    if (imageUrl) {
      const preview = await downloadPreview(imageUrl);
      steps.push({
        id: "esde-image",
        label: "Imagen ES-DE",
        status: "ok",
        detail: "La imagen local se convirtió correctamente.",
        preview,
      });
    }
  } catch (error) {
    steps.push({
      id: "esde-error",
      label: "ES-DE local",
      status: "warning",
      detail: errorMessage(error),
    });
  }

  try {
    const art = await invoke<SteamGridArtResponse>("fetch_public_game_art", {
      request: {
        title: options.gameTitle,
        platform: "",
        language: "es",
      },
    });
    const imageUrl = art.cover_image ?? art.hero_image ?? art.logo;
    if (!imageUrl) throw new Error("El respaldo público no devolvió una imagen.");
    const preview = await downloadPreview(imageUrl);
    steps.push({
      id: "art-last-resort",
      label: "Respaldo de arte",
      status: "ok",
      detail: `Arte persistente desde ${art.matched_title}.`,
      preview,
    });
  } catch (error) {
    steps.push({
      id: "art-last-resort",
      label: "Respaldo de arte",
      status: "error",
      detail: errorMessage(error),
    });
  }

  if (!options.steamGridDbApiKey.trim()) {
    steps.push({
      id: "steamgrid-auth",
      label: "SteamGridDB",
      status: "warning",
      detail: "No hay una API key guardada.",
    });
  } else {
    try {
      const art = await invoke<SteamGridArtResponse>("fetch_steam_grid_art", {
        request: {
          title: options.gameTitle,
          api_key: options.steamGridDbApiKey,
        },
      });
      const imageUrl = art.cover_image ?? art.hero_image ?? art.logo;
      steps.push({
        id: "steamgrid-search",
        label: "Búsqueda SteamGridDB",
        status: imageUrl ? "ok" : "warning",
        detail: imageUrl
          ? `Coincidencia: ${art.matched_title}. URL de arte recibida.`
          : `Coincidencia: ${art.matched_title}, pero sin URL de arte.`,
      });
      if (imageUrl) {
        const preview = await downloadPreview(imageUrl);
        steps.push({
          id: "steamgrid-image",
          label: "Imagen SteamGridDB",
          status: "ok",
          detail: `Descarga nativa correcta desde ${new URL(imageUrl).hostname}.`,
          preview,
        });
      }
    } catch (error) {
      steps.push({
        id: "steamgrid-error",
        label: "SteamGridDB",
        status: "error",
        detail: errorMessage(error),
      });
    }
  }

  if (
    !options.retroAchievementsUser.trim() ||
    !options.retroAchievementsApiKey.trim()
  ) {
    steps.push({
      id: "ra-auth",
      label: "RetroAchievements",
      status: "warning",
      detail: "Falta el usuario o la Web API Key.",
    });
  } else {
    try {
      const games = await invoke<RetroGame[]>("fetch_retro_achievements", {
        request: {
          username: options.retroAchievementsUser,
          api_key: options.retroAchievementsApiKey,
          count: 1,
        },
      });
      const game = games[0];
      if (!game) throw new Error("La API no devolvió juegos recientes.");
      const achievement = Object.values(game.Achievements ?? {})[0];
      steps.push({
        id: "ra-data",
        label: "Datos RetroAchievements",
        status: achievement ? "ok" : "warning",
        detail: achievement
          ? `${game.Title ?? "Juego"}: catálogo, descripción y badge recibidos.`
          : `${game.Title ?? "Juego"}: llegó el juego, pero no el catálogo de logros.`,
      });

      const coverUrl = retroMediaUrl(game.ImageBoxArt);
      if (coverUrl) {
        const preview = await downloadPreview(coverUrl);
        steps.push({
          id: "ra-cover",
          label: "Carátula RetroAchievements",
          status: "ok",
          detail: "La carátula se descargó y convirtió correctamente.",
          preview,
        });
      } else {
        steps.push({
          id: "ra-cover",
          label: "Carátula RetroAchievements",
          status: "warning",
          detail: "La API no devolvió ImageBoxArt.",
        });
      }

      const badgeUrl = achievement?.BadgeName
        ? retroMediaUrl(`${achievement.BadgeName}.png`, "Badge")
        : undefined;
      if (badgeUrl) {
        const preview = await downloadPreview(badgeUrl);
        steps.push({
          id: "ra-badge",
          label: "Badge de logro",
          status: "ok",
          detail: `${achievement?.Title ?? "Logro"}: ${achievement?.Description ?? "sin descripción"}`,
          preview,
        });
      } else {
        steps.push({
          id: "ra-badge",
          label: "Badge de logro",
          status: "warning",
          detail: "El logro no incluyó BadgeName.",
        });
      }
    } catch (error) {
      steps.push({
        id: "ra-error",
        label: "RetroAchievements",
        status: "error",
        detail: errorMessage(error),
      });
    }
  }

  return steps;
}
