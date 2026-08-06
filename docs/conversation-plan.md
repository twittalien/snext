# Snext — Plan Recuperado Del Chat

Este documento captura decisiones que aparecieron durante la conversación de construcción y que no estaban completamente reflejadas en `design-system-v2.md`.

## Estado Implementado En Esta Rama

- Tauri 2, React, TypeScript y Vite.
- Dashboard responsive para monitor vertical u horizontal.
- Perfil editable con nombre y avatar local.
- Avatar preparado para fuentes Steam y RetroAchievements.
- Español, inglés y portugués.
- Tema automático, claro y oscuro.
- Panel de configuración desde engrane superior derecho.
- Clima en vivo con Open-Meteo sin API key.
- OpenWeatherMap seleccionable cuando exista API key.
- Métricas reales vía Tauri: CPU, RAM, plataforma y conteo de procesos.
- Detección local de juegos por procesos, argumentos de emuladores e historial de RetroArch.
- Consejos contextuales de IA conectados a Gemini u Ollama según configuración.
- Caché local de consejos por juego e idioma.
- Fallbacks visuales para juego, Spotify, clima y sistema.
- Configuración persistente para credenciales e integraciones.

## Configuración Prevista

### Perfil

- Nombre mostrado.
- Avatar personalizado.
- Sincronización opcional con Steam.
- Sincronización opcional con RetroAchievements.
- Selector de fuente preferida del avatar.

### Apariencia

- Tema automático, claro u oscuro.
- Idioma: español, inglés o portugués.
- Escala de interfaz.
- Densidad de tarjetas.
- Nivel de transparencia y desenfoque.
- Animaciones y fondos dinámicos.
- Inicio en pantalla completa.
- Monitor preferido, sin fijar resolución.

### Juegos

- Steam.
- SteamGridDB.
- RetroAchievements.
- RetroArch.
- EmulationStation.
- Ryujinx, Citra y otros emuladores.
- Reglas editables de detección.
- Corrección manual del juego detectado.
- Fuentes preferidas de metadatos.

### Servicios

- Spotify Client ID y autorización OAuth PKCE.
- Usuario y API key de RetroAchievements.
- Steam Web API key opcional.
- SteamGridDB API key.
- Gemini API key.
- URL y modelo de Ollama.
- Configuración de Discord mediante vías oficiales.

### Clima Y Ubicación

- Open-Meteo como proveedor sin clave.
- OpenWeatherMap como proveedor popular con API key.
- Ubicación por ciudad.
- Coordenadas manuales en una fase posterior.
- Ubicación aproximada por IP solo con consentimiento.
- Caché local para evitar consultas innecesarias.

### Sistema Y Privacidad

- Unidades y frecuencia de actualización.
- Métricas visibles: CPU, GPU, RAM, VRAM, temperaturas, batería, almacenamiento y red.
- Exportar/importar configuración sin secretos.
- Borrar caché.
- Revocar autorizaciones.
- Diagnóstico de integraciones.
- Control independiente de cada conexión externa.

## Integraciones Pendientes Para Ser 100% Reales

- Spotify requiere OAuth PKCE y callback local en Tauri.
- Discord no permite leer libremente amigos personales con una app normal; usar RPC local o servidor compartido.
- SteamGridDB requiere API key para arte real de juegos.
- RetroAchievements requiere usuario y API key.
- Gemini requiere API key. Ya existe un adaptador MVP desde frontend; debe moverse a Tauri/keyring para producción.
- Ollama puede funcionar localmente si el servidor está activo.
- GPU, VRAM, temperaturas y batería deben añadirse al backend Rust con proveedores específicos de Linux/Bazzite.

## Nota Para Bazzite

La ruta más fiable es ejecutar Snext como ventana Tauri fullscreen sin bordes en el monitor secundario mientras Steam corre en Big Picture en la pantalla principal. Quedan pendientes:

- selección automática y manual de monitor;
- recuperación si el monitor se desconecta;
- reorganización vertical/horizontal en caliente;
- bloqueo opcional al monitor elegido;
- prevención de suspensión de la pantalla informativa;
- inicio automático con KDE mediante servicio de usuario o autostart.
