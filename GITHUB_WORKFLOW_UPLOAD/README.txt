Este directorio es visible para facilitar la carga desde Finder.

El archivo que GitHub Actions usa realmente ya esta incluido en:
  .github/workflows/build-appimage.yml

En macOS, Finder oculta carpetas cuyo nombre comienza con un punto. Para ver
.github en Finder, presiona Command + Shift + . dentro de la carpeta Snext.

Si ya subiste el repositorio y no ves el workflow en GitHub, abre
build-appimage.yml de este directorio, copia todo su contenido, y en GitHub:

1. Ve a twittalien/snext.
2. Pulsa Add file > Create new file.
3. Escribe exactamente: .github/workflows/build-appimage.yml
4. Pega el contenido del archivo visible build-appimage.yml.
5. Pulsa Commit changes en la rama main.

Luego ve a Actions > Crear AppImage de Snext > Run workflow. Al terminar,
aparecera el AppImage descargable en Releases.
