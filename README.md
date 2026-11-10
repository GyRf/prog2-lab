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
| `ALLOWED_ORIGIN` | server | `http://localhost:5173` | CORS |

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
