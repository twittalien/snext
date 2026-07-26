# Entorno de desarrollo de Snext

## Arquitectura

- Cliente: macOS
- Servidor: Bazzite
- Acceso: SSH mediante `ssh snext`
- Resolución local: `snext.local`
- Editor: VS Code Remote SSH
- Contenedor: Distrobox `snext-dev`
- Distribución del contenedor: Fedora 44

## Entrar al entorno

Desde Bazzite:

    distrobox enter snext-dev

## Verificar herramientas

Dentro del contenedor:

    cd ~/Projects/Snext
    ./scripts/check-environment.sh

## Recrear el contenedor

Desde Bazzite, fuera del contenedor:

    cd ~/Projects/Snext
    distrobox assemble create --file distrobox.ini

El directorio personal está compartido entre Bazzite y Distrobox, por lo que el repositorio permanece disponible al recrear el contenedor.
