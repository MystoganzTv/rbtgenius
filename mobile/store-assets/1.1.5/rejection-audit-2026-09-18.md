# Investigación del rechazo 5.6 — 18 de septiembre de 2026

## Lo que Apple confirmó

- App Store Connect: versión 1.1.5, build 39, rechazada.
- Envío: `2217c394-ad82-4265-a4de-d60f19871de5`.
- Los mensajes del 14 y 17 de septiembre repiten que ciertas funciones parecen
  haberse ocultado durante la revisión. No identifican función, pantalla,
  dispositivo ni pasos de reproducción.
- La respuesta enviada el 14 de septiembre ya explicaba las correcciones de
  compras externas, onboarding y restauración. El nuevo rechazo no agrega
  detalles. No se ha enviado otra respuesta durante esta investigación.

## Evidencia del build enviado

Se descargó el IPA del build EAS `861a4529-e6c6-43ff-a60c-d6428825d1c5`.
Su Info.plist confirma versión 1.1.5 (39), compatibilidad con iPhone e iPad
y requisito de arquitectura arm64. El bundle Hermes no contiene las rutas
`/api/billing/checkout`, `/api/billing/portal`, `/api/billing/confirm` ni
`https://www.rbtgenius.com/pricing`.

SHA-256 del IPA: `d3b503beb4f2b546ae7f637d69047165465d91fa2fb0b05d5bdf026fd4da8f25`.

Esto descarta la presencia de esas rutas conocidas en ese bundle; no demuestra
por sí solo que todos los flujos externos sean correctos. La búsqueda del código
de navegación, cuenta y acceso no encontró un modo especial para revisores,
ocultamiento por IP o ubicación, ni actualizaciones remotas de código.

La descripción publicada enumera práctica, flashcards, exámenes y analíticas;
coincide con las pantallas registradas. Las notas de revisión explican cómo
comprar y restaurar, pero no incluyen una cuenta Pro separada ni un recorrido
completo por cada función Premium.

## Fallos reproducidos y corregidos localmente

1. **Premium aparecía como Free si fallaba el dashboard.** La respuesta de login
   ya contenía el plan confirmado por el servidor, pero `buildUser` lo ignoraba
   al calcular `isPremium`. Ahora conserva el acceso que indica ese plan.
2. **Una respuesta anterior podía bloquear funciones tras la compra.** Un
   dashboard solicitado antes de la compra podía llegar después de actualizar
   la cuenta a Pro y sobrescribirla. Ahora las respuestas se limitan a la
   revisión de sesión que las originó.
3. **Éxito de compra/restauración sin desbloqueo confirmado.** El paywall
   ignoraba errores HTTP y de actualización de cuenta. Ahora exige confirmación
   Premium del servidor y de la cuenta antes de anunciar éxito; permite
   reintentar la activación sin volver a comprar. La consulta y la actualización
   comparten un tiempo máximo de 10 segundos.
4. **Compra mientras la identidad de RevenueCat seguía pendiente.** Las compras
   podían comenzar antes de terminar `logIn`, incluso después de fallar el cambio
   de cuenta. Ahora la configuración inicial usa el ID de la cuenta y las
   operaciones esperan la identificación; una identidad fallida bloquea la compra.
5. **Error de red confundido con ausencia de compras.** Restaurar ya diferencia
   el error del caso legítimo sin suscripción.
6. **Controles Pro en ventanas pequeñas.** El contenido de administración de
   suscripción ahora permite desplazamiento vertical.

Los casos 1–5 se reprodujeron con pruebas que ejecutan el código real y sustituyen
las respuestas de red/SDK. No son evidencia de que Apple haya observado esos
casos ni sustituyen una transacción real de StoreKit.

## Verificación y límites

- Las regresiones fallaron antes de las correcciones y pasan después.
- Suite completa: 82 pruebas aprobadas, 0 fallidas.
- Verificación de traducciones aprobada; textos nuevos en inglés y español.
- Exportación de producción iOS completada; las rutas externas conocidas siguen
  ausentes del bundle.
- Compilación nativa Release para iOS Simulator: `BUILD SUCCEEDED`.
- iPad Pro 13-inch (M4), iOS 26.5: la cuenta demo conservada inició sesión,
  abrió Dashboard y More > Upgrade; cargaron $19.99/mes y $99.99/año desde Apple.
  Restore mostró correctamente que ese Apple ID no tiene una suscripción activa.
  No se inició ninguna compra. La compilación local conserva el número 37 del
  proyecto nativo; no debe confundirse con el build 39 distribuido por EAS.
- Después de propagar el límite de tiempo a la actualización de sesión, las
  12 pruebas de acceso, compra y revisión volvieron a pasar.
- El ESLint del repositorio no cubre los archivos JSX de `mobile`; no se presenta
  su ejecución como validación de esos componentes.
- Falta verificar compras/restauración reales en un nuevo build de TestFlight y
  confirmar con Apple qué función motivó el rechazo. El build 39 sigue rechazado;
  editar el código local no modifica el binario enviado.
- El primer intento de subida fue bloqueado antes de ejecutarse por la revisión
  automática de permisos. Tras la instrucción del usuario de continuar, se
  autorizó y ejecutó la compilación con envío a TestFlight.

## Build 40 — seguimiento

- Versión 1.1.5 (40), creada en EAS el 18 de septiembre de 2026.
- Build: https://expo.dev/accounts/mystodev/projects/rbt-genius/builds/0483a9ca-bd91-44cf-b82a-fe5d73445626
- Envío automático a App Store Connect: https://expo.dev/accounts/mystodev/projects/rbt-genius/submissions/d1a3f7fc-468e-4e84-9e9b-102d26ff643e
- Compilación finalizada correctamente el 18 de septiembre a las 15:29:49 UTC.
- IPA descargado y verificado: versión 1.1.5 (40), presentes los cambios de
  identificación y activación, y ausentes las rutas externas conocidas.
- SHA-256 del IPA: `7bfa5b27459f612a96e43e31dd1597161b78045f4c10df4474c9908895cf00a2`.
- Envío terminado: `FINISHED`, el 18 de septiembre a las 16:30:32 UTC.
- Consulta directa de App Store Connect el 19 de septiembre mediante
  `eas submit:status`: build 40 con `processingState: VALID`,
  `internalState: IN_BETA_TESTING`, no expirado. Disponible para pruebas internas
  en TestFlight.
- La versión pública continúa en 1.1.3 (37).
- El 19 de septiembre de 2026 se sustituyó el build 39 por el build 40 en la
  versión 1.1.5. Las notas de revisión se actualizaron con las correcciones,
  recorridos y resultados de la prueba física.
- App Store Connect confirmó el reenvío a las 12:24 PM EDT con el elemento
  `1.1.5 (40)` y estado `Waiting for Review`. Se conservó el mismo Submission ID:
  `2217c394-ad82-4265-a4de-d60f19871de5`.
- La explicación se incluyó en las notas de revisión; no se envió un mensaje
  separado en Resolution Center.

### Verificación parcial en iPhone físico — 19 de septiembre

TestFlight mostró `1.1.5 (40)` instalado. La cuenta existente de Enrique abrió
Dashboard y Profile como Pro. More > Manage Subscription > Restore previous
purchase respondió `Restored!` / `Pro subscription restored.` Después se abrieron
Analytics con datos y la pantalla de inicio de Mock Exam. No se inició un examen.
Al volver desde TestFlight se conservó el acceso; no se confirmó un cierre completo
del proceso, por lo que no se considera verificado el arranque en frío.

Se completó después el cambio de usuario en build 40: Enrique Pro (19 preguntas,
2% preparación, 47% acierto) → Test Free (11 preguntas, 1% preparación, 43% acierto)
→ Enrique Pro con sus datos originales. Se cerró sesión en cada transición.
Mock Exam mostró Pro Feature bloqueado para Test y Start Exam al volver a Enrique
mediante Google. Profile confirmó `v1.1.5 (40)` en ambas cuentas. No hubo compras.

Analytics mostró las estadísticas propias de Test aun siendo Free. Revisar la
distinción de analíticas básicas/avanzadas en producto y metadatos; no afirmar
que toda la pantalla está restringida a Pro. No se observó mezcla de datos.

Pendientes en dispositivo físico: compra desde una cuenta gratuita, arranque en
frío y recuperación tras fallo de activación. No se comprobó el modelo exacto ni
la versión de iOS del iPhone en esta sesión. Se dejó abierta la cuenta de Enrique.

## Fuentes

- https://developer.apple.com/forums/thread/817078 — dispositivos compatibles.
- https://developer.apple.com/forums/thread/810791 — acceso completo de revisión
  y pruebas de compras en sandbox.
- https://www.revenuecat.com/docs/customers/identifying-customers — identificación
  del cliente y asociación de compras.

## Próxima verificación antes de reenviar

En un nuevo build: cuenta gratuita, compra sandbox, acceso a exámenes y analíticas,
reapertura, restauración, cambio de cuenta y recuperación de conexión. Probar
iPhone e iPad y documentar exactamente los resultados. Añadir a las notas de
revisión un recorrido por cada función y pedir a Apple pantalla, dispositivo y
pasos del comportamiento cuestionado, sin presentar una hipótesis como causa
confirmada.
