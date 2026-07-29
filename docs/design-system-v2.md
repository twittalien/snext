# Snext — Sistema de diseño y experiencia V2

**Estado:** aprobado para implementación  
**Fecha:** 2026-07-28  
**Plataforma principal:** Bazzite, KDE Plasma y Wayland  
**Tecnología:** Tauri 2, React, TypeScript, Vite y Rust  
**Idiomas:** español, inglés y portugués

---

## 1. Visión del producto

Snext es una aplicación de escritorio informativa diseñada para ejecutarse a pantalla completa en un monitor secundario mientras el usuario juega.

Su función es concentrar en una sola interfaz:

- información del juego activo;
- arte, descripción y calificación;
- progreso y logros;
- actividad de Spotify;
- presencia social mediante Discord;
- clima, fecha y hora;
- métricas del equipo;
- consejos contextuales generados por IA.

Snext no es un launcher ni un reemplazo de Steam, Discord o Spotify. Tampoco está diseñado para controlarse mediante mando. Su función principal es ofrecer información ambiental, útil y legible mientras el usuario juega con teclado, ratón o mando en la pantalla principal.

### Principio conceptual

> **Snext combina una presentación editorial de videojuegos, un smart display y un compañero de juego ambiental.**

---

## 2. Objetivos del diseño

La interfaz debe:

1. Dar prioridad visual al juego activo.
2. Ser atractiva sin distraer durante una partida.
3. Ser legible a distancia.
4. Adaptarse automáticamente a monitores verticales y horizontales.
5. Conservar utilidad sin interacción constante.
6. Mostrar estados claros cuando un servicio no esté conectado.
7. Mantener una experiencia consistente entre todas las integraciones.
8. Evitar que la interfaz parezca un dashboard administrativo.
9. Usar movimiento de forma ambiental y moderada.
10. Proteger las credenciales y la privacidad del usuario.

---

## 3. Dirección visual

La experiencia combina tres ideas:

### Presentación editorial

Inspirada en páginas de detalle de videojuegos:

- portada grande;
- logo oficial;
- descripción;
- calificación;
- tiempo jugado;
- progreso;
- metadatos de plataforma.

### Composición modular

Inspirada en dashboards lúdicos:

- tarjetas asimétricas;
- contraste entre superficies claras y oscuras;
- elementos decorativos de videojuegos;
- widgets con jerarquías diferentes;
- composición dinámica.

### Profundidad cinematográfica

Inspirada en hero cards con arte desbordado:

- personaje o key art fuera del contenedor;
- capas visuales;
- fondos derivados del juego;
- degradados intensos;
- composición con profundidad;
- transiciones suaves.

---

## 4. Principios visuales

### 4.1 Jerarquía

No todas las tarjetas deben tener el mismo peso.

Orden visual recomendado:

1. Hero del juego activo.
2. Spotify.
3. Logros.
4. Clima y reloj.
5. Asistente contextual.
6. Discord.
7. Métricas del sistema.

### 4.2 Color dominante

Solo tres componentes pueden dominar cromáticamente:

- el hero usa colores del juego;
- Spotify usa colores del álbum;
- clima usa colores del cielo.

Discord mantiene una superficie oscura con acento violeta. Logros, IA y sistema utilizan fondos más neutrales.

### 4.3 Contraste

En modo claro:

```text
Fondo general:       #EEF1FA
Superficie clara:    #F7F8FC
Panel oscuro:        #090B14
Texto principal:     #161426
Texto secundario:    #69667D
```

En modo oscuro:

```text
Fondo general:       #080A14
Superficie:          #121527
Superficie elevada:  #171A30
Texto principal:     #F8F9FF
Texto secundario:    #9298AF
```

Acentos de marca:

```text
Violeta Snext:       #865DFF
Cian Snext:          #35DFF0
Verde positivo:      #4FF0B4
Amarillo atención:   #F5B942
Rojo crítico:        #ED5A67
```

Los valores podrán evolucionar durante la implementación siempre que mantengan contraste accesible.

### 4.4 Bordes y profundidad

- Radios grandes: entre 18 y 28 px.
- Bordes translúcidos y discretos.
- Sombras amplias, suaves y poco opacas.
- Blur únicamente cuando mejore profundidad o legibilidad.
- Evitar cajas dentro de cajas sin una razón funcional.

### 4.5 Tipografía

La tipografía debe ser geométrica, limpia y altamente legible.

Jerarquía:

- hero: título grande y expresivo;
- títulos de tarjeta: semibold;
- cifras: grandes y con tabular numbers;
- metadatos: pequeños, pero con buen contraste;
- etiquetas: mayúsculas con tracking moderado.

---

## 5. Marca Snext

La identidad utiliza:

- nombre en minúsculas: `snext`;
- símbolo entrelazado violeta–cian;
- variantes monocromas;
- uso del símbolo como marca de agua;
- logo compacto para cabecera y estados vacíos.

El logo actual es provisional. Debe reemplazarse por un SVG refinado, escalable y original.

### Reglas de uso

- No deformar el símbolo.
- No utilizar demasiadas copias del logo en un mismo viewport.
- Usar la versión monocroma cuando el fondo sea visualmente complejo.
- Mantener un área de seguridad alrededor del símbolo.

---

## 6. Estructura responsive

Snext no dependerá de una resolución específica.

Debe responder a:

- orientación vertical;
- orientación horizontal;
- ventanas redimensionadas;
- escalado de KDE;
- distintas densidades de píxel;
- cambio de monitor en caliente.

### Vertical

```text
┌─────────────────────────────────┐
│ snext        perfil · clima · ⚙ │
├─────────────────────────────────┤
│                                 │
│ HERO ADAPTATIVO DEL JUEGO       │
│ arte desbordado                 │
│ logo · puntuación · tiempo      │
│ descripción · progreso          │
│                                 │
├─────────────────────────────────┤
│ SPOTIFY AMBIENTAL               │
│ portada · canción · progreso    │
├─────────────────┬───────────────┤
│ LOGROS          │ CLIMA/RELOJ   │
│ carrusel        │ cielo vivo    │
├─────────────────┴───────────────┤
│ ✦ CONSEJO CONTEXTUAL DE IA      │
├─────────────────┬───────────────┤
│ DISCORD OSCURO  │ SISTEMA       │
│ avatares        │ telemetría    │
└─────────────────┴───────────────┘
```

En pantallas verticales estrechas, las parejas de tarjetas pasan a una sola columna.

### Horizontal

```text
┌────────────────────────────────────────────────┐
│ snext                         perfil · clima · ⚙│
├──────────────────────────────┬─────────────────┤
│                              │ SPOTIFY         │
│ HERO DEL JUEGO               ├─────────────────┤
│ arte desbordado              │ CLIMA/RELOJ     │
│ logo · datos · progreso      ├─────────────────┤
│                              │ DISCORD         │
├──────────────────────────────┼─────────────────┤
│ LOGROS                       │ SISTEMA         │
├──────────────────────────────┴─────────────────┤
│ ✦ ASISTENTE CONTEXTUAL                         │
└────────────────────────────────────────────────┘
```

---

## 7. Cabecera

La cabecera debe incluir:

- logo Snext;
- nombre del producto;
- perfil del usuario;
- avatar;
- indicador resumido de estado;
- botón de configuración en la esquina superior derecha.

El perfil puede utilizar:

- iniciales;
- imagen local;
- avatar de Steam;
- avatar de RetroAchievements.

La cabecera debe mantenerse compacta y no competir con el hero.

---

## 8. Hero del juego activo

### Variante aprobada

Se utilizará una composición híbrida adaptativa.

#### Nivel 1: arte transparente disponible

- personaje o key art desbordado;
- fondo derivado del juego;
- logo oficial;
- información en una zona segura.

#### Nivel 2: hero panorámico disponible

- fondo panorámico;
- portada superpuesta;
- logo o título;
- degradado de contraste.

#### Nivel 3: solo portada disponible

- composición editorial;
- portada grande;
- título;
- descripción;
- metadatos.

#### Nivel 4: sin recursos visuales

- gradiente Snext;
- icono de plataforma;
- título textual.

### Contenido

- logo o título;
- portada;
- plataforma;
- proveedor o launcher;
- descripción;
- tiempo jugado;
- progreso;
- calificación;
- estado actual.

### Calificación

La calificación debe indicar claramente su fuente.

Ejemplos:

```text
★★★★★ · 94% positivo en Steam
★★★★☆ · 8.7
```

No se deben representar fuentes diferentes como si fueran equivalentes.

### Tiempo jugado

- Steam: API o datos locales.
- Emuladores: seguimiento local de sesiones.
- Sin datos: ocultar la métrica.

---

## 9. Spotify

### Dirección aprobada

Widget ambiental e informativo, sin controles y sin letras.

### Fuente

Spotify Web API será la única fuente de reproducción.

No se integrará Musixmatch debido a:

- requisitos de licencia;
- restricciones regionales;
- seguimiento obligatorio de vistas;
- condiciones de caché;
- acceso dependiente del plan;
- complejidad desproporcionada.

### Contenido

- portada;
- nombre de canción;
- artista;
- álbum;
- progreso;
- tiempo transcurrido;
- duración;
- estado reproduciendo o pausado;
- dispositivo, cuando esté disponible.

### Apariencia

Capas:

1. Portada ampliada como fondo.
2. Blur fuerte.
3. Gradiente de legibilidad.
4. Portada nítida.
5. Metadatos.
6. Barra de progreso.
7. Animación ambiental decorativa.

La animación no debe presentarse como un visualizador de audio exacto.

### Modos

#### Completo

Portada grande, metadatos, dispositivo y progreso.

#### Compacto

Portada pequeña, canción, artista y progreso.

#### Pausado

Fondo desaturado e indicador de pausa.

#### Sin reproducción

Gradiente neutral y mensaje discreto.

#### No conectado

Invitación a configurar Spotify desde el engrane.

### Restricciones

No incluir:

- reproducción;
- pausa;
- siguiente;
- anterior;
- volumen;
- selección de dispositivo;
- letra.

---

## 10. Discord

### Dirección aprobada

Widget social oscuro inspirado en grupos de avatares y canales de voz.

### Apariencia

- superficie casi negra incluso en tema claro;
- acento violeta de Discord;
- avatares superpuestos;
- badges de presencia;
- contador de personas en línea;
- miniwidgets internos;
- logo grande únicamente en estados vacíos.

### Presencia

```text
En línea:       verde
Ausente:        amarillo
No molestar:    rojo
Desconectado:   gris
```

### Actividad

Cuando esté disponible:

- juego actual;
- tiempo de sesión;
- Spotify;
- estado personalizado;
- presencia en canal de voz.

### Estructura sugerida

```text
┌─────────────────────────────────────┐
│ Discord                    conectado│
│                                     │
│ [avatar●][avatar●][avatar◐][avatar●]│
│ 5 personas en línea                 │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Jugando ahora                   │ │
│ │ Hades II · 2 personas           │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Voz · Sala de juegos                │
│ [avatar][avatar][avatar]  3 en voz  │
└─────────────────────────────────────┘
```

### Integración

No utilizar:

- tokens personales;
- self-bots;
- scraping;
- endpoints privados;
- automatización del cliente.

Integración propuesta:

- bot oficial;
- servidor compartido;
- miembros y presencia disponibles según permisos;
- usuarios favoritos configurables;
- actividad propia como fallback.

La tarjeta no debe prometer mostrar todos los amigos personales de Discord.

### Interacción

No incluir mensajería ni botones para unirse a voz en la primera versión.

---

## 11. Logros

### Dirección aprobada

Carrusel automático de juegos que ya tengan progreso en Steam o RetroAchievements.

### Vista principal

- imagen;
- nombre;
- plataforma;
- proveedor;
- logros obtenidos y totales;
- porcentaje;
- barra de progreso;
- puntos o rareza;
- logro reciente destacado.

### Rotación

Valores iniciales:

```text
Juego visible:       60 segundos
Logro destacado:     12 segundos
Pausa en hover:      Sí
Pausa con modal:     Sí
```

El intervalo por juego será editable.

### Orden predeterminado

1. Juego activo.
2. Último juego con logro desbloqueado.
3. Mayor progreso reciente.
4. Juego más próximo a completarse.
5. Resto por actividad reciente.

### Contenido del carrusel

Por defecto se excluyen:

- juegos sin logros;
- progreso cero;
- duplicados exactos;
- juegos ocultos.

### Steam y RetroAchievements

#### RetroAchievements

Mostrar puntos:

```text
🏆 10 pts
```

También se podrá diferenciar progreso softcore y hardcore cuando la API lo permita.

#### Steam

Steam no tiene puntos universales. Mostrar rareza:

```text
◆ 8.4% global
```

No inventar puntos para Steam.

### Vista de detalle

Al hacer clic en el juego se abre un modal con:

- encabezado;
- imagen;
- título;
- plataforma;
- proveedor;
- progreso general;
- cuadrícula de logros.

### Estados de logro

#### Desbloqueado

- imagen a color;
- fecha;
- descripción;
- puntos o rareza.

#### Pendiente

- escala de grises;
- opacidad reducida;
- descripción si no es secreta.

#### Oculto

- imagen neutral;
- texto “Logro oculto”;
- no revelar información restringida.

### Ficha de logro

```text
┌────────────────────────────────────┐
│ Primer ataque                      │
│                                    │
│ Realiza el primer golpe del combo. │
│                                    │
│ 26 oct 2024              🏆 5 pts  │
└────────────────────────────────────┘
```

---

## 12. Clima y reloj

### Dirección aprobada

Una sola tarjeta que representa visualmente el cielo y combina clima, hora y fecha.

### Contenido

- condición;
- temperatura;
- sensación térmica;
- hora;
- fecha;
- ubicación;
- pronóstico por hora o por día.

### Fondo dinámico

#### Soleado

- gradiente cálido o azul;
- sol parcial;
- anillos suaves;
- brillo ambiental.

#### Noche despejada

- azul profundo;
- luna;
- estrellas discretas.

#### Nublado

- capas onduladas;
- tonos grises y azules.

#### Lluvia

- fondo oscuro;
- líneas diagonales suaves;
- reflejos discretos.

#### Tormenta

- azul/violeta profundo;
- destellos muy sutiles;
- sin flashes agresivos.

#### Nieve

- partículas lentas;
- fondo azul;
- variación día/noche.

#### Niebla

- capas translúcidas;
- desplazamiento horizontal lento.

### Implementación visual

Preferir:

- gradientes CSS;
- SVG original;
- pseudo-elementos;
- animaciones limitadas.

Evitar depender de fotografías externas.

### Proveedores

- OpenWeatherMap como proveedor configurable principal.
- Open-Meteo como alternativa.

### Ubicación

- aproximada por IP con consentimiento;
- ciudad manual;
- coordenadas manuales.

No almacenar historial de ubicaciones.

### Actualización

```text
Clima actual:   cada 15 minutos
Pronóstico:     cada 30–60 minutos
Ubicación IP:   al iniciar o al cambiar de red
Reloj:          actualización local
```

El reloj debe funcionar incluso si falla el proveedor.

---

## 13. Métricas del sistema

### Dirección aprobada

Franja compacta de telemetría gaming, no un dashboard técnico.

### Contenido prioritario

- CPU: uso y temperatura;
- GPU: uso y temperatura;
- RAM;
- VRAM;
- red;
- latencia;
- batería y alimentación;
- FPS y frametime solo con fuente fiable;
- almacenamiento solo como alerta.

### Estructura

```text
┌───────────────────────────────────────────┐
│ SISTEMA · BAZZITE                 ÓPTIMO  │
│                                           │
│ CPU        GPU        RAM       RED       │
│ 22%        64%        6.7/32GB  486 Mbps  │
│ 72°C       68°C       21%       18 ms     │
│                                           │
│ GTX 1650 Ti · i7-10750H · AC conectado    │
└───────────────────────────────────────────┘
```

### Gráficos

- minigráficas históricas de aproximadamente 60 segundos;
- barras compactas como fallback;
- gradiente violeta–cian;
- estados de alerta mediante color.

### Fuentes técnicas previstas

- `/proc`;
- `/sys`;
- `sysinfo`;
- `nvidia-smi`;
- NetworkManager;
- UPower;
- Gamescope o MangoHud cuando exista integración fiable.

No inventar métricas no disponibles.

---

## 14. Asistente de IA

### Dirección aprobada

El asistente será una capa contextual del juego, no un chat permanente.

### Vista principal

```text
┌────────────────────────────────────────────┐
│ ✦ SNEXT AI          Zelda · sin spoilers   │
│                                            │
│ Antes de entrar al templo, prepara comida  │
│ con resistencia al frío y conserva al      │
│ menos una ranura para un arma elemental.   │
│                                            │
│ Fuente: manual y datos del juego           │
└────────────────────────────────────────────┘
```

### Contenido posible

- consejos;
- controles;
- objetivo;
- mecánicas;
- secretos;
- equipo recomendado;
- soluciones;
- manual;
- contexto narrativo;
- accesibilidad.

### Spoilers

Opciones:

```text
Ninguno
Suaves
Completos
```

Predeterminado:

```text
Ninguno
```

### Interacción

Al hacer clic se podrá abrir:

- preguntas rápidas;
- controles;
- ayuda con un jefe;
- orientación;
- pregunta personalizada.

### Proveedores

- Gemini como principal.
- Ollama como alternativa local.
- Configuración editable.
- Caché por juego.
- Fallback local cuando no haya conexión.

### Exactitud

- mostrar fuentes cuando sea posible;
- distinguir información confirmada de generación;
- comunicar incertidumbre;
- no inventar datos específicos.

---

## 15. Panel de configuración

### Apariencia

- panel lateral oscuro;
- fondo de dashboard desenfocado;
- navegación por categorías;
- superficies internas gris carbón;
- acentos Snext;
- estados de conexión;
- credenciales ocultas.

### Categorías

```text
Perfil
Apariencia
Pantalla
Juegos y detección
Logros
Spotify
Discord
Clima
Inteligencia artificial
Sistema
Privacidad
Acerca de
```

### Horizontal

```text
┌──────────────┬─────────────────────────┐
│ Perfil       │                         │
│ Apariencia   │ Contenido de sección    │
│ Juegos       │                         │
│ Spotify      │                         │
│ Discord      │                         │
└──────────────┴─────────────────────────┘
```

### Vertical

En dispositivos estrechos se muestra una lista de categorías y después una vista de detalle con navegación de retorno.

### Integraciones

Cada servicio tendrá:

- estado;
- cuenta;
- última sincronización;
- acción para conectar;
- acción para desconectar;
- diagnóstico;
- permisos requeridos.

Las credenciales no se mostrarán en texto plano.

---

## 16. Decoración gaming

### Elementos

- cruceta;
- botones geométricos;
- stick;
- gatillos;
- líneas de circuito;
- píxeles;
- cuadrículas;
- siluetas abstractas de hardware.

### Uso

- detrás del hero;
- esquinas vacías;
- estados sin configurar;
- panel de ajustes;
- transiciones.

### Regla

Máximo uno o dos elementos decorativos dominantes por viewport.

Los elementos decorativos no deben parecer controles interactivos.

---

## 17. Movimiento

### Cambio de juego

1. Desvanecer fondo.
2. Cambiar portada y logo.
3. Recalcular paleta.
4. Actualizar widgets.
5. Actualizar consejo de IA.

Duración:

```text
600–900 ms
```

### Spotify

- crossfade del fondo;
- desplazamiento mínimo de portada;
- cambio de texto con fade;
- sincronización local de barra.

### Clima

Transición únicamente cuando cambia:

- condición;
- día/noche;
- ubicación.

### Logros

- fade;
- desplazamiento horizontal leve;
- sin giros 3D;
- pausa durante hover y modal.

### Movimiento reducido

Respetar:

```css
prefers-reduced-motion: reduce
```

También ofrecer:

```text
Animaciones completas
Animaciones reducidas
Sin animaciones
```

---

## 18. Internacionalización

Idiomas requeridos:

- español;
- inglés;
- portugués.

Reglas:

- no incluir textos visibles directamente en componentes;
- usar claves de traducción;
- adaptar formatos de fecha y hora;
- permitir textos más largos;
- no asumir que todos los idiomas ocupan el mismo ancho;
- conservar nombres propios sin traducir.

---

## 19. Accesibilidad

- Contraste suficiente.
- Foco visible.
- Navegación mediante teclado y ratón.
- Cierre de modales con `Esc`.
- Textos alternativos.
- Estados no comunicados únicamente mediante color.
- Soporte para movimiento reducido.
- Escalado de interfaz.
- Tipografía legible a distancia.
- Áreas interactivas mínimas de aproximadamente 40 px.

---

## 20. Privacidad y seguridad

### Credenciales

No guardar claves en:

- código fuente;
- Git;
- `localStorage`;
- archivos de texto sin cifrar.

Usar almacenamiento seguro del sistema o mecanismo equivalente.

### Discord

Prohibido:

- token personal;
- self-bot;
- scraping;
- endpoints privados.

### Ubicación

- pedir consentimiento para localización por IP;
- no guardar historial;
- permitir borrado inmediato.

### Spotify

- OAuth con PKCE;
- almacenamiento protegido;
- revocación desde ajustes;
- sin historial permanente por defecto.

### IA

- mostrar qué datos se enviarán;
- permitir Ollama local;
- no enviar información innecesaria;
- borrar caché bajo demanda.

---

## 21. Estados vacíos y errores

Cada widget debe contemplar:

- cargando;
- conectado;
- no configurado;
- sin datos;
- sin conexión;
- credencial expirada;
- permiso insuficiente;
- error del proveedor;
- caché disponible.

Los errores técnicos no deben mostrarse directamente en el dashboard.

Ejemplo:

```text
Spotify no está conectado.
Configúralo desde ⚙
```

No mostrar:

```text
HTTP 401 invalid_grant
```

Los detalles técnicos estarán disponibles en diagnóstico.

---

## 22. Arquitectura de componentes sugerida

```text
src/
├── app/
├── components/
│   ├── Card/
│   ├── Modal/
│   ├── Badge/
│   ├── AvatarGroup/
│   ├── ProgressBar/
│   └── EmptyState/
├── features/
│   ├── game/
│   ├── spotify/
│   ├── discord/
│   ├── achievements/
│   ├── weather/
│   ├── system/
│   ├── assistant/
│   ├── profile/
│   └── settings/
├── integrations/
├── i18n/
├── styles/
├── types/
└── utils/
```

Backend:

```text
src-tauri/src/
├── commands/
├── detection/
├── integrations/
├── storage/
├── system/
└── lib.rs
```

---

## 23. Fases de implementación

### Fase 1: fundamentos visuales

- tokens;
- tipografía;
- grid responsive;
- tarjetas;
- modales;
- estados;
- movimiento;
- accesibilidad.

### Fase 2: hero

- variantes;
- fallbacks;
- paleta dinámica;
- portada;
- logo;
- arte desbordado;
- comportamiento vertical/horizontal.

### Fase 3: Spotify y clima

- widgets visuales;
- estados;
- fondos dinámicos;
- progreso;
- cielo gráfico.

### Fase 4: Discord y logros

- avatar groups;
- presencia;
- carrusel;
- modal;
- cuadrícula de insignias;
- detalle.

### Fase 5: sistema e IA

- telemetría;
- históricos;
- estados de alerta;
- consejos contextuales;
- spoilers.

### Fase 6: configuración

- categorías;
- conexiones;
- perfil;
- apariencia;
- pantalla;
- privacidad;
- diagnóstico.

### Fase 7: integraciones reales

- detección de juegos;
- Steam;
- SteamGridDB;
- RetroAchievements;
- Spotify;
- Discord;
- clima;
- Gemini;
- Ollama;
- métricas del sistema.

---

## 24. Criterios de aceptación visual

Una versión se considera coherente con este sistema cuando:

- el juego activo domina la composición;
- el layout funciona en vertical y horizontal;
- las tarjetas no tienen el mismo peso visual;
- el arte no perjudica la legibilidad;
- el dashboard no parece un panel administrativo;
- las animaciones no distraen;
- los estados sin conexión siguen siendo atractivos;
- las métricas no parecen una herramienta de monitoreo empresarial;
- Discord no parece un cliente de chat;
- Spotify no parece un reproductor controlable;
- la IA no parece un chat permanente;
- la configuración se distingue claramente del dashboard;
- los tres idiomas funcionan sin desbordamientos importantes;
- los temas claro y oscuro mantienen contraste.

---

## 25. Decisiones consolidadas

```text
Hero:
- Híbrido adaptativo.
- Arte transparente, hero, portada o fallback.

Spotify:
- Informativo.
- Sin controles.
- Sin letras.
- Sin Musixmatch.
- Fondo de portada desenfocado.

Discord:
- Widget oscuro.
- Avatares agrupados.
- Actividad y voz cuando estén disponibles.
- Sin tokens personales.
- Sin mensajería.

Logros:
- Carrusel automático.
- 60 segundos por juego.
- Steam y RetroAchievements.
- Detalle interactivo.
- Puntos RA y rareza Steam.

Clima:
- Integrado con reloj.
- Cielo gráfico dinámico.
- Pronóstico breve.
- Ubicación configurable.

Sistema:
- Telemetría gaming compacta.
- Sin inventar valores.
- Históricos breves.

IA:
- Contextual.
- Gemini y Ollama.
- Control de spoilers.
- Chat solo bajo demanda.

Configuración:
- Panel oscuro categorizado.
- Credenciales seguras.
- Diagnóstico y privacidad.

Interacción:
- Ratón y teclado.
- Mando reservado para jugar.
```

---

## 26. Referencias visuales

Las referencias sirven como inspiración conceptual, no como material para copiar.

### Dashboard y hero

- Composición editorial con portada, puntuación y tiempo jugado.
- Contraste entre superficies claras y paneles oscuros.
- Hero con arte desbordado.

### Spotify

- Portada como fondo desenfocado.
- Metadatos y progreso.
- Sin letras en la implementación final.

### Discord

- Grupos de avatares.
- Contadores de presencia.
- Miniwidget de canal de voz.
- Superficie oscura.

### Logros

- Biblioteca de juegos con progreso.
- Cuadrícula de insignias.
- Ficha con descripción, fecha y puntos.

### Clima

- Fondo gráfico según condición.
- Temperatura y reloj integrados.
- Franja inferior de pronóstico.

---

## 27. Nota final

Este documento define la dirección aprobada de Snext V2. Durante la implementación pueden realizarse ajustes de espaciado, color, tipografía o composición siempre que mantengan los principios, jerarquía y comportamiento aquí descritos.

Toda integración debe diseñarse primero con estados simulados y fallbacks. Las credenciales y conexiones reales se incorporarán después de validar la experiencia visual.