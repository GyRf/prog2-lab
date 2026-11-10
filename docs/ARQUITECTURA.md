# Arquitectura y decisiones técnicas

## MVC adaptado a React
- **Models** (`models/`): tipos puros. **Data** (`data/`): contenido.
- **Controllers** (`controllers/`): funciones puras y hooks (`useExerciseSession`) con toda la lógica: análisis, ejecución, generación, corrección, progreso, modos.
- **Views** (`views/`): sólo renderizan y llaman acciones. Los servicios se inyectan con `AppServicesProvider`.

## Ejecución de Java
`JavaExecutionService` tiene dos implementaciones:
- `HttpJavaExecutionService`: habla con `server/`. Los tests de cada ejercicio se convierten en un `TestRunner.java` (harness) que imprime `@@TEST|id|PASS/FAIL|mensaje`.
- `BrowserJavaExecutionService`: sin servidor. Hace chequeo sintáctico básico y análisis estático; marca los tests como "no ejecutados".

### Reglas de seguridad del servidor
- Nunca ejecuta código en su propio proceso.
- Modo `docker`: contenedor descartable por pedido con `--network none`, `--memory 256m`, `--cpus 1`, `--pids-limit 128`, `--read-only`, `/tmp` tmpfs de 64 MB, `--cap-drop ALL`, `no-new-privileges`, usuario `nobody`, código montado sólo lectura, `--rm`.
- Timeout de proceso (15 s) y de ejecución (5 s), salida truncada a 64 KB, cuerpo máximo 256 KB, concurrencia limitada.
- Validación de nombres de archivo y clase principal (sin inyección de comandos). Directorio temporal eliminado siempre.
- Escucha sólo en 127.0.0.1. Modo `local` sólo para uso personal (avisa por consola).

## Análisis de código
Parser liviano (no compilador) que extrae clases, campos y métodos, más reglas heurísticas con severidad **error real / mala práctica / mejora opcional**, línea, código, explicación, por qué, sugerencia, ejemplo corregido y concepto. Es estático: puede tener falsos positivos/negativos.

## Generación procedural
`(plantilla, dominio, dificultad, semilla)` → ejercicio determinístico; el id lo codifica, por eso no se guarda. 8 plantillas × 11 dominios. El validador revisa coherencia (tests vs clases, requisitos que la solución cumple, duplicados) y `reference.test.ts` compila con javac real cada solución de referencia y verifica que pase todos sus tests.

## Persistencia
`ProgressRepository` (interfaz) con implementación `LocalProgressRepository` sobre cualquier `KeyValueStore`. Cambiar a IndexedDB o un backend no toca las vistas.

## Mejoras futuras
- Backend con usuarios y progreso en servidor.
- Análisis con un parser Java completo (p. ej. JavaParser en el servidor) y detección de código duplicado más precisa.
- Más plantillas: State, Decorator, Observer generados; Composite con reglas especiales (Contenedor Express, cupos máximos).
- Tests escritos por el alumno en el ejercicio de diseño completo.
- Incorporar los PDFs y archivos .java de la cátedra para afinar enunciados.
