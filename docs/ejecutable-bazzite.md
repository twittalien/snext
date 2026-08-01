# Snext para cualquier usuario de Bazzite

Snext se entrega como un unico archivo **AppImage**. Ese archivo contiene el ejecutable nativo de Tauri/Rust, la interfaz compilada, iconos, recursos locales y el archivo de escritorio que necesita KDE. No depende del repositorio, de Node.js, de Rust, de Konsole ni de la carpeta de desarrollo de quien lo compiló.

## Descargar y abrir

1. Abre [la ultima version de Snext](https://github.com/twittalien/snext/releases/latest) desde cualquier navegador.
2. Descarga el archivo `Snext-<version>-x86_64.AppImage` en **Assets**.
3. Guárdalo en una carpeta estable de tu usuario, por ejemplo `Applications/Snext`. No necesitas conservar el repositorio.
4. En Dolphin abre **Propiedades > Permisos** y marca que el archivo puede ejecutarse.
5. Abre el AppImage con doble clic.

En la primera ejecucion, Snext crea su acceso de aplicacion en KDE usando la ruta del AppImage que acabas de abrir. Desde ese momento puedes buscar **Snext** en el menu de aplicaciones y anclarlo al panel.

Si despues mueves el archivo a otra carpeta, abrelo una vez con doble clic desde la nueva ubicacion para actualizar el acceso del menu.

## Actualizar

1. Descarga el AppImage de la nueva version desde la misma pagina de Releases.
2. Reemplaza el archivo anterior en tu carpeta estable.
3. Abre el nuevo archivo una vez con doble clic. El acceso de KDE queda actualizado.

Tus preferencias y credenciales de las tarjetas se conservan en el almacenamiento local de tu usuario.

## Que requiere Internet o credenciales

El AppImage es autosuficiente, pero los servicios que por naturaleza consultan Internet siguen necesitando la configuracion personal del usuario: SteamGridDB/Steam Store para arte remoto, RetroAchievements, Spotify, Discord, clima, Gemini u Ollama local. El scrapeo local de ES-DE y los lectores de hardware disponibles en Bazzite no dependen del repositorio.

## Para quien mantiene el proyecto

Cada push a `main` ejecuta el flujo **Crear AppImage de Snext**. Este compila el archivo en Ubuntu 22.04, adjunta un artefacto de prueba en Actions y publica/actualiza la Release `v<version>` con el AppImage descargable para todos.
