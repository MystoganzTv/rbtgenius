# Auditoría inglés/español — 11 de octubre de 2026

> Estado: este documento conserva los hallazgos originales. Las correcciones y comprobaciones posteriores se describen en `PUBLICACION-2026-10-11.md`.
Revisión del código local y de las funciones que construyen los textos de web y móvil. No se cambió la lógica de la app ni se desplegó. Se amplía la auditoría general: tener una traducción no significa que sea correcta, completa o equivalente al original.

## 1. P1 — Una traducción cambia el procedimiento y enseña una regla incorrecta

Concepto: `measurement_discontinuous_limitation`.

Ubicación: `src/lib/questions/question-translations-es.json:5508`, también en la copia móvil.

El escenario inglés describe una conducta que ocurre **entre las observaciones de muestreo momentáneo**, por lo que puede no registrarse. La traducción dice:

> El RBT usa intervalo parcial y no registra un episodio de agresión que ocurrió y terminó en el segundo 10 de un intervalo de 20 segundos.

Se ha cambiado muestreo momentáneo por intervalo parcial. En intervalo parcial, una ocurrencia en cualquier momento del intervalo cuenta como presencia de la conducta; este escenario no es un ejemplo correcto de una limitación de ese procedimiento. Se contrastó con la [explicación de registro por intervalos del IRIS Center, Vanderbilt University](https://iris.peabody.vanderbilt.edu/activity/behavior-assessment-frequency-and-interval-recording/).

Corrección propuesta: mantener el procedimiento del original. Por ejemplo: «El aprendiz golpea únicamente entre los instantes de observación. El muestreo momentáneo no registra esas ocurrencias, aunque la conducta sí ocurrió».

## 2. P1 — Hay español mezclado con inglés, marcado como revisado

Se ejecutaron los constructores reales de traducción y una búsqueda conservadora de palabras inglesas inequívocas, seguida de revisión de ejemplos. El detector señaló:

| Alcance | Resultado |
|---|---:|
| Conceptos activos móviles analizados | 373 |
| Conceptos con campos señalados | 21 |
| Campos principales señalados | 29 |
| Variantes móviles con mezcla en enunciado, explicación u opciones | 52 de 1.119 |
| Variantes web con mezcla en enunciado, explicación u opciones | 70 de 1.110 |

Son recuentos del detector, no una revisión lingüística exhaustiva. Web y móvil se solapan; las cifras no deben sumarse. El detector puede dejar fuera errores de gramática o vocabulario no incluido en la búsqueda.

Ejemplos reales:

- `assessment_abc_pattern_review`: «Después de ten sesiones de ABC registro, el RBT notices que el aprendiz's berrinches nearly siempre follow a demand…».
- `behavior_response_cost`: «Respuesta costo es a castigo-basado procedimiento y should ser usado only cuando autorizada y clearly planned».
- `assessment_mastery_criterion`: «el dominio criterio defines el nivel de desempeño Un aprendiz must reach…».

Ubicaciones web: `question-translations-es.json:14`, `:1466` y `:279`; las mismas entradas existen en móvil. Están etiquetadas `status: "reviewed"`, pero el texto no justifica considerar completada su revisión.

Corrección: revisar todos los campos del concepto, incluidos los distractores que reutilizan sus textos, y actualizar las copias conjuntamente. La aprobación editorial debe conservar responsable, fecha y versión del original.

## 3. P2 — La web usa traducciones antiguas de opciones que móvil ya resuelve mejor

Se encontraron **21 textos de opción distintos** que producen traducciones diferentes en ambas plataformas. No se trata de que los archivos JSON difieran: son idénticos, pero los resolutores leen campos distintos.

Ejemplo de `assessment_mastery_criterion`:

- Campo `purpose`: «Establecer un estándar claro y medible para determinar cuándo se ha adquirido una habilidad».
- Campo `options_es.purpose`: «Para establish a clear, medible standard para cuando a habilidad has been acquired».

La web recurre al segundo; móvil puede obtener el primero. La duplicación permite corregir un campo y dejar obsoleto otro.

Ubicaciones: `src/lib/questions/question-bank.js:2127–2156` y `mobile/src/lib/questions/reviewed-question-translations.js:34–63`.

Corrección: una sola traducción canónica por texto/concepto y un resolutor compartido. Probar que un mismo original da la misma traducción en web y móvil.

## 4. P2 — Otros escenarios españoles ya no corresponden al original inglés

Ejemplos comprobados comparando los campos:

| Concepto | Inglés | Español actual |
|---|---|---|
| `professional_feedback_behavior_change` | Esperar cinco segundos después del estímulo discriminativo, siguiendo feedback del supervisor | Entregar el reforzador inmediatamente después de la respuesta |
| `measurement_mts_when_to_use` | Comprobar al final de cada intervalo de un minuto | Observar brevemente cada cinco minutos |
| `measurement_ioa_total_count` | Observadores cuentan 20 y 25 ocurrencias | Observadores cuentan 10 y 8 ocurrencias |
| `skill_prompt_fading_criteria` | Seguir el criterio escrito de cuatro respuestas correctas de cinco | El RBT decide retirar ayudas cuando aprecia respuestas consistentes |

Algunos ejemplos preservan el concepto o incluso el resultado numérico, por lo que no todos son respuestas incorrectas. Aun así, no son traducciones equivalentes: cambian las cifras, la acción o condiciones del escenario y confunden a quien compara EN/ES en el mismo panel. En el último ejemplo se omite que el criterio lo establece el plan.

Corrección: mantener actores, procedimiento, números, condiciones y alcance del original. Las adaptaciones pedagógicas deben identificarse como ejemplos diferentes.

## 5. P2 — Los mensajes de acceso pueden mostrar inglés o una clave interna en español

Los archivos móviles EN/ES tienen 421 claves cada uno, con las mismas variables de interpolación. Sin embargo, las pantallas llaman a `common.try_again`, que **no existe en ninguno**.

Ubicaciones: `mobile/src/screens/auth/LoginScreen.jsx:61,72` y `RegisterScreen.jsx:64`.

Se comprobó con una instancia real de i18next en español: `t('common.try_again')` devuelve literalmente `common.try_again`. Ese texto aparece como alternativa si un error del proveedor no incluye `message`.

Además, `LoginScreen.jsx:51` muestra directamente `err.message`. El contexto propaga el mensaje del servidor y la API devuelve «Invalid email or password», aunque la interfaz esté en español y exista `auth.error_credentials` traducido.

Corrección: usar códigos de error estables y traducirlos en la interfaz; emplear una clave existente para reintentar. Probar inicio de sesión y registro fallidos en ambos idiomas.

## 6. P2 — Las notificaciones ignoran el idioma seleccionado

- `mobile/src/services/NotificationService.js:43–48`: los cuatro recordatorios locales están siempre en español. Uno mezcla «readiness score» dentro del español.
- `api/cron/daily-reminder.js`: los recordatorios del servidor están siempre en inglés.
- El registro del token de notificaciones no envía la preferencia de idioma.

Se ejecutó `scheduleDailyReminder` con los servicios nativos simulados: los cuatro títulos generados fueron españoles. No se programaron notificaciones reales.

Corrección: registrar el idioma para las notificaciones remotas, traducir las locales y reprogramarlas cuando el usuario cambie de idioma.

## 7. P2 — Estadísticas y navegación mezclan idiomas

En `mobile/src/screens/tabs/AnalyticsScreen.tsx`:

- Línea 90: días de la semana fijos en español, incluso con interfaz inglesa.
- Líneas 92–96: estados «Exam Ready», «Almost There», «In Progress» y «Getting Started» fijos en inglés, incluso con interfaz española.
- Línea 129: fecha del examen formateada con `es-ES` fijo.

En `mobile/src/navigation/RootNavigator.jsx:90–93`, la pestaña `More` no recibe `tabBarLabel` traducido; las otras pestañas sí. Existe `more.tab_label = "Más"`, pero no se utiliza allí.

Corrección: usar i18next para etiquetas e `Intl` con el idioma elegido para fechas. Generar las etiquetas del gráfico al renderizar o recalcularlas al cambiar de idioma, en lugar de conservar nombres ya traducidos en el estado.

## 8. P2 — Las políticas móviles están exclusivamente en inglés

`mobile/src/screens/legal/LegalScreen.jsx` define títulos, introducciones y secciones como texto inglés fijo, sin consultar i18next. Incluye «Terms of Service», «Privacy Policy» y «Questions? Email us at». Las secciones de facturación importadas también se redactan en inglés.

Corrección: ofrecer versiones españolas revisadas y equivalentes, o indicar expresamente el idioma del documento antes de abrirlo. No pasar estos documentos por sustitución automática de palabras.

## 9. P2 — El panel móvil de traducción puede dejar texto fuera de la vista

`mobile/src/components/i18n/TranslationSheet.jsx` limita la altura del panel al 72 % y contiene los bloques EN/ES dentro de `View`, sin `ScrollView`.

La combinación de un escenario largo en dos idiomas y tamaño de letra grande puede superar ese espacio sin que el usuario pueda desplazarse. Es un riesgo identificado en el layout, pendiente de reproducción visual en dispositivo; no se presenta como recorte confirmado en todos los teléfonos.

Corrección: cuerpo desplazable, controles de cierre accesibles y comprobación con el texto más largo y escalado de fuente grande.

## 10. P2 — La prueba actual de idiomas ofrece una confianza excesiva

`npm run check:i18n` sigue pasando con los problemas anteriores.

En `scripts/check-i18n.mjs:80–88`, una pregunta se considera española si contiene `¿`, un acento o `ñ`. Los enunciados ya incorporan «¿Qué concepto…?», aunque el resto esté mezclado. Una opción parcialmente traducida tampoco se considera fallo si ya difiere del original. No se validan las explicaciones. La búsqueda de claves se limita a JSX web en `src/`, sin recorrer la interfaz móvil.

Mejoras concretas:

1. Comprobar claves usadas, variables, plurales y textos dinámicos tanto en web como en móvil.
2. Comparar la salida de ambos resolutores para un mismo texto.
3. Detectar inglés residual con una lista permitida de siglas y términos técnicos; tratarlo como señal para revisión, no como prueba de exactitud semántica.
4. Revisar por concepto la equivalencia de procedimiento, cantidades, negaciones y condiciones.
5. Añadir pruebas de cambios de idioma con pantallas abiertas, errores de acceso, notificaciones, fechas y textos largos.

## Decisión de producto que conviene aclarar

La práctica web fuerza `localizeQuestion(question, "en")` en `QuestionCard.jsx:62`; móvil muestra `question.prompt` y abre el español mediante el botón de traducción. Elegir español traduce la interfaz, pero no sustituye el texto principal de las preguntas. El patrón es consistente con un posible modo de estudio en inglés con apoyo español; no se considera por sí solo un fallo de programación. Conviene explicarlo en Ajustes o separar «Idioma de interfaz» de «Idioma de estudio».

## Resultado de las comprobaciones

- EN/ES móvil: 421 claves por idioma, sin diferencias entre diccionarios ni variables de interpolación incompatibles.
- Una clave utilizada inexistente (`common.try_again`), en tres llamadas.
- No se encontraron opciones españolas idénticas dentro de una misma pregunta mediante normalización de mayúsculas, puntuación y espacios; no es una prueba de ausencia de ambigüedad.
- Se ejecutaron los resolutores reales sobre todo el banco y se compararon opciones compartidas entre plataformas.
- Se reprodujeron la clave interna visible y los títulos de notificaciones con dependencias simuladas.
- `npm run check:i18n`: pasa; sus limitaciones explican por qué no detecta estos problemas.

Prioridad: corregir el cambio de procedimiento y las traducciones mezcladas; unificar la fuente de traducción y su validación; después completar mensajes, notificaciones, fechas y políticas.
