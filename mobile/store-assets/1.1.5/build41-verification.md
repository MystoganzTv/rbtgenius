# 1.1.5 (41) — correcciones tras el rechazo 5.6

## Cambios del 21 de septiembre de 2026

- Terms y Privacy del paywall abren la ruta nativa Legal, ya accesible desde
  Profile, con regreso al paywall. Se elimina la navegación indirecta a la web
  desde esos dos botones, para todos los usuarios por igual.
- El paywall y los banners ya no presentan Analytics como algo que se desbloquea
  con Pro. Se conserva el acceso Free existente. Los términos explican los
  límites Free y los beneficios reales de Pro.
- La descripción guardada en App Store Connect y las notas explican Analytics
  para Free/Pro y la elegibilidad de Apple para la prueba gratuita de siete días.
  Las notas también explican Review Mistakes y los prompts nativos de valoración.
- Se corrigieron comentarios que afirmaban, sin confirmación de Apple, que el
  fallback de pago anterior había causado el rechazo.
- Se envió la respuesta de aclaración a las 9:42 PM EDT, incluyendo solicitud
  de pasos concretos y llamada en español. Ver app-review-clarification-2026-09-21.md.

## Validación

- Suite: **99 tests, 99 aprobados**.
- Nueva regresión: abrir ambos enlaces desde el paywall, mostrar el documento
  nativo correcto, permitir regresar y no abrir ningún URL externo.
- `npm run check:i18n`: aprobado.
- `git diff --check`: aprobado después de los cambios de código y documentación.
- `expo export --platform ios`: completado. Bundle:
  `/private/tmp/rbt-review-legal-fix-export/_expo/static/js/ios/index-cbb6991d0d062514cc9da75cd434ea77.hbc`.
- En ese bundle no aparecen los endpoints directos de checkout/portal/confirm,
  la URL de Pricing ni los dos URLs legales externos que antes abría el paywall.
- No se pudo compilar localmente para Simulator: Xcode devuelve que sus licencias
  no están aceptadas. No se aceptó ningún acuerdo en nombre del usuario. La
  validación nativa depende de la compilación EAS y la posterior prueba TestFlight.
- No se realizaron compras ni pruebas físicas durante esta corrección.

## Entrega

- EAS recibió el proyecto y asignó **1.1.5 (41)**.
- Build: https://expo.dev/accounts/mystodev/projects/rbt-genius/builds/772d4659-f9f5-4974-9a71-302dc690a37b
- Envío automático a TestFlight programado:
  https://expo.dev/accounts/mystodev/projects/rbt-genius/submissions/fa214fe6-5093-4ee6-81bc-1b782b29748f
- Último estado consultado: **IN_PROGRESS**, versión 1.1.5, build 41.
  La compilación y la entrega a TestFlight todavía no están confirmadas.
- App Review conserva **build 40 rechazado**; no se seleccionó ni reenvió otro
  build mientras esperamos los detalles solicitados a Apple.

## Prueba física pendiente

1. Instalar 1.1.5 (41) desde TestFlight cuando termine de procesarse.
2. Con cuenta Free, abrir More > Upgrade > Terms y luego Privacy. Comprobar
   lectura completa, scroll y vuelta al paywall sin navegador externo.
3. Comprobar Analytics accesible en Free y Mock Exams bloqueado de forma visible.
4. Verificar compra/restauración sandbox y conservación de Pro tras cierre completo.
5. Conservar la cuenta Free de revisión. Antes de reenviar, facilitar también
   acceso Pro revisable con una cuenta normal y documentar sus credenciales
   únicamente en App Store Connect; no crear lógica especial para revisores.
