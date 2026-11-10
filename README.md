# Prog2 Lab — Plataforma de práctica de Programación 2 (TUDAI, UNICEN)

Aplicación web para aprender y practicar POO en Java: lecciones, quizzes, editor Java (Monaco), análisis de código, ejercicios aislados y generados proceduralmente, modos tutor/práctica/examen, progreso y animaciones.

> El contenido académico está resumido a partir del programa de la materia y de la documentación oficial de Java. No se consultó Moodle. Lo específico de la cátedra que no figure acá debe confirmarse con el material oficial.

## Requisitos
- Node.js 20+
- Para compilar/ejecutar Java: **Docker** (recomendado) o un JDK 17+ local.

## Instalación y ejecución
```bash
cd web && npm install
npm run dev                 # http://localhost:5173

# en otra terminal: servidor de ejecución Java
cd server
npm start                   # usa Docker (imagen eclipse-temurin:21-jdk)
# o, sin Docker y SOLO en tu propia máquina:
npm run start:local         # javac/java locales, sin aislamiento
```
Sin servidor, la app funciona igual (teoría, quizzes, animaciones, análisis estático, generador); sólo no compila ni ejecuta tests.

## Publicación (para que muchas personas lo usen)
- **Página**: GitHub Pages (`.github/workflows/pages.yml`), se publica sola en cada push a `main`: https://gyrf.github.io/prog2-lab/
- **Servidor Java**: Render, plan gratuito, con el blueprint `render.yaml` (imagen `server/Dockerfile`).
  1. Entrá a https://dashboard.render.com/blueprint/new?repo=https://github.com/GyRf/prog2-lab e iniciá sesión con GitHub.
  2. Aceptá el blueprint: crea el servicio `prog2-lab-java`.
  3. Si la URL que te da Render no es `https://prog2-lab-java.onrender.com`, creá la variable de repositorio `JAVA_API_URL` = `https://TU-URL.onrender.com/api` (Settings → Secrets and variables → Actions → Variables) y volvé a correr el workflow.
- Capacidad: las ejecuciones se atienden de a 2 y el resto espera en una cola (hasta 30); límite de 30 ejecuciones por minuto por persona. El plan gratuito "duerme" el servidor tras 15 min sin uso: la primera ejecución después tarda ~1 minuto.
- Aislamiento en Render: cada ejecución es un proceso aparte con timeout, memoria limitada y Security Manager de Java con política vacía (sin red, archivos ni procesos). Con Docker disponible (VM propia) usar `JAVA_RUNNER=docker`, que es más fuerte.

### Tests
```bash
cd web && npm test -- --run   # (o npx vitest run) analizador, generación, progreso, quizzes.
                             # Si hay javac, compila las ~100 soluciones de referencia y corre sus tests.
cd server && npm test
```

### Variables de entorno (ver `.env.example`)
| Variable | Dónde | Default | Uso |
|---|---|---|---|
| `VITE_JAVA_API_URL` | web | `/api` | URL del servidor de ejecución |
| `PORT` | server | `8787` | Puerto |
| `JAVA_RUNNER` | server | `docker` | `docker` o `local` |
| `JAVA_DOCKER_IMAGE` | server | `eclipse-temurin:21-jdk` | Imagen del sandbox |
| `JAVA_TIMEOUT_MS` / `JAVA_RUN_TIMEOUT_S` | server | `15000` / `5` | Límites de tiempo |
| `JAVA_MAX_CONCURRENT` | server | `2` | Ejecuciones simultáneas |
| `ALLOWED_ORIGIN` | server | `http://localhost:5173` | CORS (lista separada por comas) |
| `HOST` | server | `127.0.0.1` | `0.0.0.0` en hosting |
| `JAVA_MAX_QUEUE` / `RATE_LIMIT_PER_MIN` | server | `30` / `30` | Cola y límite por IP |

## Estructura
```
server/                 Servidor de ejecución (Node sin dependencias) + tests
web/src/
  models/               Tipos: Exercise, Attempt, Diagnostic, Progress, animaciones…
  data/                 Conceptos, lecciones, quizzes, dominios, ejercicios fijos, animaciones
  controllers/
    analysis/           Parser Java liviano + reglas de buenas/malas prácticas
    execution/          JavaExecutionService (HTTP y navegador), harness de tests, parser de javac
    generation/         PRNG, plantillas procedurales, validador
    exercise/           Catálogo, corrección por rúbrica, hook de sesión (useExerciseSession)
    progress/           Progreso y recomendaciones
    quiz/, modes.ts     Corrección de quizzes y políticas de cada modo
  services/             ProgressRepository (localStorage desacoplado), inyección de servicios
  views/                Layout, páginas y componentes (sin lógica de negocio)
docs/ARQUITECTURA.md    Decisiones técnicas, seguridad y mejoras futuras
```
