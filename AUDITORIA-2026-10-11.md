# Auditoría de RBTGenius — 11 de octubre de 2026

> Estado: este documento conserva los hallazgos originales. Las correcciones y comprobaciones posteriores se describen en `PUBLICACION-2026-10-11.md`.
Se revisó el código local de web, móvil y API, incluyendo los cambios que ya estaban pendientes. No se modificó la lógica de la aplicación ni se desplegó. Los resultados no demuestran qué versión está publicada ni cuántos usuarios han sufrido estos fallos. No se accedió a datos privados de producción.

## Hallazgos prioritarios

### 1. P1 — El examen móvil pierde las respuestas al agotarse el tiempo

Ubicación: `mobile/src/screens/tabs/MockExamScreen.jsx:71–80`, y `finishExam` en esa misma pantalla.

El efecto del temporizador depende únicamente de `phase`, por lo que conserva la función `finishExam` del inicio del examen, cuando `answers` todavía está vacío. Las respuestas posteriores actualizan la pantalla, pero no la función capturada por el intervalo.

**Reproducción:** render del componente real con React Test Renderer, servicios nativos y red simulados, una pregunta, selección de una respuesta y avance de los 5.400 ticks del temporizador. Antes del cierre la pantalla mostraba una respuesta; el POST contenía `answers: {}` y el ID de la pregunta. El evaluador trataría las respuestas como no contestadas. El envío manual utiliza la función actual y no tiene este mismo problema.

**Corrección:** invocar desde el temporizador una referencia actualizada a la función de cierre; proteger contra envíos duplicados y usar una hora de vencimiento para recuperarse de suspensiones de la app. Añadir una prueba del vencimiento con respuestas existentes.

### 2. P1 — Las flashcards guardan calificaciones incorrectas

Ubicación: `mobile/src/screens/tabs/FlashcardsScreen.tsx:99–114`; `api/index.js:1003–1009`.

“Lo sé” envía siempre `selected_answer: 'A'`; “Estudiar más” envía `'B'`. El servidor no toma `is_correct` del cliente: compara la letra contra la respuesta real del banco, que está mezclada entre A/B/C/D.

**Reproducción con el mazo real de 120 tarjetas:** marcar todas como “Lo sé” registra 87 como incorrectas; marcar todas como “Estudiar más” registra 32 como correctas. Otras dos tarjetas no existen en el banco del servidor. Esto afecta precisión, preparación y repaso de errores.

**Corrección:** registrar la autoevaluación de flashcards como una actividad específica, diferenciada de una respuesta de opción múltiple. Si se conserva el evaluador actual, enviar una letra coherente con la opción correcta real y distinguir la fuente. Probar ambas acciones con claves A/B/C/D.

### 3. P1 — Pérdida silenciosa de intentos en móvil

Ubicación: `mobile/src/screens/tabs/PracticeScreen.jsx:77–107`; el patrón se repite en `ReviewMistakesScreen.jsx:70–99` y `FlashcardsScreen.tsx:99–120`.

El código no comprueba `response.ok`: un HTTP 400/401/403/500 se trata como si se hubiera guardado. Los errores de red también se silencian. Además, mientras hay una petición en curso, `submitting.current` descarta la siguiente respuesta, aunque la interfaz permite avanzar y contestar.

**Reproducción:** con una primera petición pendiente, contestar, avanzar y contestar otra vez produjo dos respuestas visibles pero un solo POST. Al resolver con HTTP 500, la pantalla mantuvo “correcto” sin señalar que no se guardó. En práctica se incrementa además el contador diario después de cualquier respuesta HTTP.

**Corrección:** comprobar el estado HTTP, distinguir corrección local de guardado confirmado y conservar los intentos pendientes. Implementar reintentos con identificadores idempotentes; mostrar un estado de sincronización y actualizar los límites desde la respuesta del servidor.

### 4. P1 — El banco móvil y el servidor no están sincronizados

Ubicación: las tres copias de `question-bank.js` y `question-bank-official-expansion.js`; `api/index.js:1004–1005,1030`.

| Banco | Preguntas | Conceptos |
|---|---:|---:|
| Web | 1.110 | 370 |
| Servidor compartido | 1.110 | 370 |
| Móvil | 1.119 | 373 |

Los tres conceptos exclusivos de móvil son `measurement_cumulative_record`, `professional_exploitative_relationships` y `professional_client_advocacy`, cada uno con tres variantes.

**Impacto verificado:** un intento con esos IDs devuelve evaluación nula y la ruta responde 400. En exámenes, el servidor elimina silenciosamente los IDs desconocidos mediante `.filter(Boolean)`. Con semilla `audit-0`, el banco móvil genera 85 preguntas y el servidor reconoce 84. La práctica habitual incluye `professional_client_advocacy_scenario` entre sus preguntas accesibles.

También cambian los distractores de 405 preguntas compartidas. Las letras correctas de los IDs compartidos sí coinciden en esta versión; no se encontró una divergencia de calificación por letra entre esas preguntas.

**Corrección:** mantener una sola fuente de contenido y una versión identificable del banco. Garantizar compatibilidad con versiones móviles ya instaladas. Rechazar o resolver explícitamente IDs desconocidos al calificar, sin reducir silenciosamente el examen.

### 5. P2 — Práctica móvil solo permite recorrer 144 preguntas del banco

Ubicación: `mobile/src/services/questionService.js:71–79`; `mobile/src/screens/tabs/PracticeScreen.jsx:54,110–115`.

El banco se genera con una semilla fija, se almacena en caché y se devuelven siempre las primeras 24 preguntas de cada tema. “Siguiente” vuelve al comienzo al terminar esas 24. Cambiar de tema o reiniciar la app no proporciona una nueva selección para la misma versión del banco.

**Comprobación:** 24 preguntas × 6 temas = 144 preguntas accesibles en práctica normal, de 1.119 disponibles. Los exámenes y las flashcards tienen otras selecciones.

**Corrección:** crear nuevas tandas, persistir el avance y priorizar preguntas no vistas o falladas. Mantener cobertura por tarea del temario y controlar la repetición de variantes del mismo concepto.

### 6. P2 — Un fallo al cargar errores aparece como ausencia de errores

Ubicación: `mobile/src/screens/tabs/ReviewMistakesScreen.jsx:39–56`.

El estado `empty` se utiliza tanto cuando no hay preguntas incorrectas como cuando falla la red o la API. Un usuario con errores pendientes puede recibir la pantalla de lista vacía.

**Corrección:** separar los estados de error y lista vacía, ofrecer reintento y conservar los últimos datos válidos. Verificado por inspección del flujo; no se probó contra producción.

### 7. P2 — La práctica web puede ignorar la sesión guardada

Ubicación: `src/pages/Practice.jsx:280–283,336–356,363–372`.

En una carga sin caché, `savedSession` empieza indefinido mientras React Query consulta la API. El efecto marca inmediatamente `sessionHydrated=true`; cuando llegan los datos, sale por esa condición y no restaura la sesión. Los guardados posteriores tampoco capturan errores ni serializan peticiones.

**Corrección:** esperar a que termine correctamente la consulta antes de marcar la hidratación; controlar fallos de guardado y evitar que escrituras antiguas sobrescriban el estado reciente. Hallazgo de análisis de código; no se reprodujo en navegador autenticado.

### 8. P2 — El resultado del examen oculta dominios con 0 %

Ubicación: `mobile/src/screens/tabs/MockExamScreen.jsx:241`.

La condición `if (pct === 0 && !domainScores[d.key]) return null` también elimina un dominio existente cuyo resultado real es cero. Por tanto, el desglose puede ocultar precisamente las áreas con todas las respuestas incorrectas.

**Corrección:** distinguir un valor ausente de un cero explícito y mostrar 0 % cuando el dominio sí fue evaluado. Verificado por inspección de la condición.

## ¿Están actualizadas las preguntas?

**La estructura está alineada con el temario vigente de 2026; eso no certifica cada pregunta ni su traducción.**

Se contrastó con la [fuente oficial BACB: RBT Test Content Outline, 3rd ed.](https://www.bacb.com/wp-content/rbt-outline-3rdEd/), que establece 43 tareas en seis dominios, 75 preguntas puntuables y 10 piloto. El banco local tiene preguntas asignadas a las 43 tareas. Las pruebas de ponderación de los simulacros pasan para las tres copias.

Los simulacros usan las 85 preguntas para calcular su porcentaje. Es una convención de práctica: no reproduce la distinción oficial entre preguntas puntuables y piloto. El umbral del 80 % de la app debe presentarse como objetivo de práctica, sin atribuirlo al criterio oficial de aprobación.

Las 1.110 preguntas de web se generan a partir de 370 conceptos, con variantes de definición, escenario y propósito. En móvil son 373 conceptos. No equivalen a 1.110/1.119 escenarios independientes revisados uno por uno.

Se verificaron IDs únicos, cuatro opciones sin textos duplicados dentro de cada pregunta y cobertura de las 43 tareas. La comprobación web de español pasó; además se ejecutó el constructor real de traducciones móvil para las 1.119 preguntas y todas tenían texto, explicación y opciones traducidas. Esto verifica presencia de traducción, no exactitud lingüística o clínica.

Recomendación editorial: una revisión por especialista con fuente, fecha, responsable y versión por concepto; controlar ambigüedad de distractores y equivalencia español/inglés, y añadir más problemas de aplicación, cálculo e interpretación de gráficas.

## Validación realizada

| Comprobación | Resultado |
|---|---|
| `npm test` | 99/99 pasan |
| `npm run build` | Pasa |
| `npm run lint` | Pasa; se repitió después del build para evitar una carrera al recorrer `dist` |
| `npm run check:i18n` | Pasa |
| `npm run check:pricing` | Pasa |
| `npm run typecheck` | Falla: 473 diagnósticos TypeScript |
| Integridad y comparación de bancos | IDs únicos y cobertura completa; nueve preguntas móviles ausentes en servidor |
| Traducción real móvil | 1.119 preguntas sin campos de traducción vacíos |
| Temporizador y guardado móvil | Reproducciones aisladas confirman pérdida de respuestas e intentos |

Los diagnósticos TypeScript no equivalen a 473 fallos funcionales. La configuración y las pruebas actuales no cubren adecuadamente los flujos de estudio móvil identificados arriba. Las reproducciones usaron los componentes reales y servicios nativos/red simulados; no sustituyen una prueba en dispositivo.

Orden recomendado: corregir cierre de examen, calificación de flashcards y persistencia; unificar/versionar el banco; ampliar la práctica y cubrir estos casos en pruebas automáticas; después revisar calidad editorial y sanear la comprobación de tipos.
