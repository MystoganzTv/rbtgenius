# Correcciones y publicación — 11 de octubre de 2026

## Cambios

- Fuente canónica en `shared/questions`, sincronizada con web y móvil: 1.119 preguntas, 373 conceptos, cobertura de las 43 tareas del TCO vigente. Se conservan las tres variantes de cada concepto. La alineación con el temario no equivale a una certificación individual del contenido por BACB.
- Correcciones de español mezclado con inglés y de los escenarios señalados en la auditoría; opciones y explicaciones usan la misma fuente. Eliminada la duplicación obsoleta `options_es`. El generador de borradores preserva siglas, no palabras inglesas comunes, y carga también la expansión oficial.
- Práctica y flashcards móviles ofrecen el banco completo. Flashcards envía la letra correcta real; los intentos se guardan antes de enviarse, conservan su identificador al reintentar y bloquean la siguiente respuesta mientras hay un guardado pendiente. El servidor evita duplicados por ID.
- El reloj del simulacro utiliza el tiempo transcurrido y las respuestas recientes. Rechazo explícito de preguntas desconocidas o duplicadas en lugar de acortar el examen. Los resultados de 0% se muestran.
- Recuperación de la sesión web tras cargarla; guardados y borrado en orden, con error visible.
- Errores de carga visibles en repaso de errores y estadísticas. Fechas, días, estados, pestaña Más, errores de autenticación, políticas y notificaciones respetan el idioma. El panel bilingüe permite desplazarse.
- Se incluyen las correcciones previas existentes de acceso Pro, restauración de compras, paywall iOS y procesamiento transaccional de Stripe, cubiertas por la suite de regresión.

## Comprobaciones

- Suite de Node: 110 pruebas (incluye ejecución de pantallas y hook reales con servicios nativos simulados, y handlers de API con almacenamiento simulado).
- Nuevas regresiones: cierre automático tras suspensión, respuestas recientes, reintento persistente tras remontar pantalla, HTTP 500, letras de flashcards, políticas españolas, estadísticas a 0%, API idempotente, rechazo de exámenes incompletos y equivalencia completa de los bancos.
- Compilación Vite, lint, check:i18n, check:questions y check:pricing.
- TypeScript móvil y exportación Metro iOS.
- El comando histórico `npm run typecheck` sigue teniendo errores anteriores de inferencia/tipos en JavaScript (473 en la auditoría inicial). No se desactivó ni se ocultó este chequeo. El proyecto TypeScript con `tsconfig.json` y el de móvil se verifican por separado; muchos archivos JS y algunos TSX usan exclusiones preexistentes, por lo que esto no sustituye las pruebas de ejecución.

## Límites de la verificación

No se realizaron compras reales ni pruebas físicas en iPhone/iPad. El panel con letra grande necesita una comprobación visual en dispositivo. Las comprobaciones automáticas de traducción no certifican la gramática ni la precisión clínica de cada pregunta. El simulacro muestra su resultado local y avisa si falla su guardado; no tiene recuperación persistente del examen completo tras cerrar la app.

## Entrega

Pendiente de registrar las URLs y estados confirmados al completar la publicación.
