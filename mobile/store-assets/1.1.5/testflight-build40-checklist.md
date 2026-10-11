# Prueba de aceptación — RBTGenius 1.1.5 (40)

Estado comprobado el 19 de septiembre de 2026: build disponible para pruebas
internas en TestFlight. App Store Connect confirma `VALID` e `IN_BETA_TESTING`.
Prueba parcial en iPhone físico completada. Build 40 reenviado a App Review el
19 de septiembre de 2026 a las 12:24 PM EDT; estado confirmado: `Waiting for Review`.

## Resultados observados el 19 de septiembre de 2026

- TestFlight muestra RBTGenius `1.1.5 (40)` instalado; se abrió desde su botón Open.
- La cuenta existente de Enrique muestra Pro en Dashboard y Profile.
- More > Manage Subscription > Restore previous purchase mostró
  `Restored!` / `Pro subscription restored.`
- Después de restaurar se abrió Analytics con los datos de la cuenta y la
  pantalla Mock Exam con Start Exam. No se inició un examen ni se modificaron
  respuestas o resultados del usuario.
- Al volver desde TestFlight se conservó la sesión y el acceso. Esta comprobación
  fue una vuelta desde segundo plano: no se confirmó un cierre completo del proceso.
- Dispositivo físico controlado mediante Duplicación del iPhone. Modelo exacto y
  versión de iOS no comprobados en esta sesión.
- Cambio de cuenta completado en el mismo iPhone y build 40: Enrique Pro
  (19 preguntas, 2% preparación, 47% acierto) → Test Free (11 preguntas,
  1% preparación, 43% acierto) → Enrique Pro con sus datos originales.
  Se cerró sesión en cada transición. Test no heredó Pro: Mock Exam mostró
  el candado Pro Feature. Al volver a Enrique mediante Google reapareció Start Exam.
  Profile confirmó `v1.1.5 (40)` en ambas cuentas. No se hicieron compras.
- Observación adicional: Analytics abre con las estadísticas propias de Test
  aun siendo Free. Esto no acredita una fuga entre cuentas; revisar la distinción
  entre analíticas básicas y avanzadas antes de afirmar que toda esa pantalla
  requiere una suscripción.
- Pendientes: compra nueva desde una cuenta gratuita, arranque tras cierre completo
  y recuperación tras fallo de activación en dispositivo físico.

## Recorrido completo de aceptación

1. Actualizar desde TestFlight y confirmar `1.1.5 (40)` en More > Profile.
2. Con una cuenta gratuita, abrir More > Upgrade. Confirmar que cargan los planes
   mensual y anual y que Restore previous purchase está disponible.
3. Realizar una compra de prueba de TestFlight. Confirmar que la app muestra Pro
   y permite abrir Exams y More > Analytics.
4. Cerrar y volver a abrir la aplicación. Confirmar que conserva la cuenta y Pro.
5. Abrir More > Manage Subscription > Restore previous purchase. Confirmar la
   restauración y que el acceso se mantiene.
6. Si Apple confirma la compra pero falla la activación, comprobar que la app
   ofrece Retry activation, sin iniciar otra compra. Recuperar la conexión y
   reintentar; verificar el acceso a las funciones Pro.
7. Cerrar sesión y entrar en otra cuenta de prueba. Confirmar que refleja el plan
   propio de esa cuenta. Volver a la cuenta original y comprobar su acceso.

Registrar dispositivo, versión de iOS, fecha y resultado de cada paso. No dar
por verificada una compra real a partir de pruebas con servicios simulados.

Los resultados se incorporaron a las notas de revisión antes del reenvío. App
Store Connect confirma que el elemento enviado es `1.1.5 (40)`.
