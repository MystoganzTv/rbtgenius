# Rechazo 5.6 — comprobación del 21 de septiembre de 2026

## Resultado

App Store Connect confirma que el rechazo actual corresponde a **1.1.5 (40)**,
reenviada el 19 de septiembre a las 12:24 PM. El cuarto mensaje, de Apple,
aparece como «Today 3:23 PM». No identifica pantalla, dispositivo, pasos ni
adjunta evidencia en el mensaje visible. No se modificó la app, la configuración
remota ni el envío; tampoco se mandó una respuesta a Apple en esta investigación.

No se encontró en el código revisado una condición que detecte al revisor y le
oculte funcionalidades. Eso no demuestra que todos los recorridos sean correctos
ni permite conocer la causa exacta del rechazo.

## Qué cambió y qué existía antes

- Desde la referencia de código `a69ab5b` (bump a build 37), los cambios móviles
  incluyen prueba gratuita de siete días condicionada a elegibilidad de Apple,
  ilustraciones en preguntas, solicitud nativa de valoración tras hitos de estudio,
  alineación del examen con el temario, capturas y ajustes de compras/onboarding.
  Esa referencia de Git no equivale a reconstruir el IPA público aprobado.
- El fallback de pago externo **ya existía antes de esta actualización**. Antes
  de `69d3895`, si RevenueCat no cargaba productos, Upgrade podía iniciar checkout
  web; Restore podía abrir Pricing. Es un comportamiento condicional real que
  podría explicar una diferencia observada por Apple. Apple no confirmó que fuera
  el motivo del primer rechazo.
- `69d3895` lo retiró de iOS el 14 de septiembre. Sus comentarios y mensaje de
  commit atribuyen el rechazo a ese fallback con más certeza de la que tenemos.
- Build 40 incorpora las correcciones posteriores de identidad, activación y
  conservación de acceso Pro, según el historial de verificación del repositorio.

## Hallazgos pendientes, con evidencia

### 1. Los enlaces legales del paywall siguen abriendo la web completa

`mobile/src/screens/tabs/UpgradeScreen.jsx:489` y `:493` abren Terms y Privacy
en el navegador. Ambos URLs también están en el bundle real de build 40.

Se abrió la Privacy pública y se siguió su enlace **Store**. La tienda cargó y
mostró 0 productos, «Orders open when inventory returns» y «Store checkout is
not configured yet». La política pública habla de Stripe. El código del footer
confirma el enlace Store (`src/components/public/PublicSiteFooter.jsx:36`).

Esto acredita una ruta indirecta desde los enlaces legales hacia otra superficie
del producto. **No acredita una compra externa completada ni una infracción por
sí sola**. Tampoco es una función añadida ahora: esos enlaces y la tienda son
anteriores. La afirmación previa sobre ausencia de endpoints directos no cubría
esta navegación indirecta. Conviene hacer coherentes los destinos legales iOS
con la experiencia y las políticas reales de compras de Apple, manteniendo la
información legal pública accesible.

### 2. Notas y descripción prometen una separación de Analytics que el móvil no aplica

Las notas guardadas dicen «Basic progress appears in Analytics; advanced analytics
and full mock exams are Pro features». La descripción también incluye analíticas
avanzadas y desglose por dominio en Pro.

En `mobile/src/screens/tabs/AnalyticsScreen.tsx`, `isPro` solo controla el texto
promocional de la línea 432; no bloquea las secciones de analíticas. El historial
de pruebas físicas del 19 de septiembre también registra Analytics accesible a
la cuenta Free. Es una discrepancia que debemos corregir o describir fielmente,
no evidencia de ocultamiento intencional. No se recomienda quitar acceso a Free
únicamente para hacer coincidir una descripción errónea.

### 3. Solo se ofrece una cuenta Free en las instrucciones de revisión

Las notas actuales lo dicen expresamente y requieren comprar en sandbox para
desbloquear Mock Exams. No incluyen una segunda cuenta Pro ya activa. Esto no
implica automáticamente incumplimiento, pero deja la revisión completa dependiente
de que la compra y la sincronización funcionen. Conviene proporcionar también
una cuenta normal con acceso Pro, sin condiciones especiales que alteren la app
para Apple, conservando la cuenta Free para revisar el paywall.

### 4. La prueba gratuita es una diferencia condicional nueva que no se explica

`mobile/src/screens/tabs/DashboardScreen.jsx:67–95` muestra la invitación solo
en iOS, a cuentas no Pro y cuando el producto ofrece siete días gratis y Apple
confirma elegibilidad. El paywall usa la misma condición. Esto explica por qué
dos cuentas pueden ver cosas distintas legítimamente. Las notas actuales no
explican esa condición. Debe documentarse sin presentar la oferta a personas
no elegibles.

## Comprobaciones y límites

- IPA conservado: `/private/tmp/rbt-review-build40.ipa`.
- SHA-256 recalculado: `7bfa5b27459f612a96e43e31dd1597161b78045f4c10df4474c9908895cf00a2`.
- Info.plist confirma 1.1.5 (40), familias iPhone/iPad, capacidad arm64,
  orientación vertical y pantalla completa.
- No aparecen en su bundle los strings `/api/billing/checkout`,
  `/api/billing/portal`, `/api/billing/confirm`, la URL directa de Pricing ni
  `/api/ai-tutor/conversations`. Esta búsqueda no equivale a analizar todos
  los posibles flujos en ejecución.
- AITutorScreen sigue en el repositorio, pero se retiró del navegador móvil en
  mayo (`b63afad`); no es un cambio nuevo ni se encontró un interruptor de reactivación.
- La configuración nativa local desactiva Expo Updates; no se encontró en el
  código revisado ocultamiento por IP, dispositivo del revisor o cuenta Apple.
- Pasan las 12 pruebas de acceso, identidad de compra y flujos de revisión.
  Usan servicios simulados; no se realizó una compra nueva ni prueba física hoy.
- El enlace de Apple sobre compatibilidad recomienda probar iPad, Mac y Vision
  cuando la app esté disponible allí; **su inclusión no demuestra qué dispositivo
  usó el revisor**. No se comprobó hoy la disponibilidad en Mac/Vision ni esos modos.

## Próximo paso recomendado

Pedir por Resolution Center la función exacta y una llamada, aportando el build
40 y los recorridos. Corregir la documentación y revisar los destinos legales;
completar el recorrido de compra desde Free y arranque en frío en el binario
distribuido. No atribuir otro build a una causa aún desconocida.

## Borrador para Apple — NO enviado

Hello App Review Team,

We reviewed your latest Guideline 5.6 message for RBTGenius 1.1.5 (40).
To reproduce the issue, please identify the specific feature or screen that
appeared intentionally hidden, the device and OS version, and the steps taken.
Did this occur before sign-in, with the Free demo account, or after a sandbox
purchase or restore? A screenshot or recording would help us locate the issue.

The supplied demo account is Free. Full mock exams require Pro, and the
subscription screen is at More > Upgrade. A seven-day trial invitation appears
only when Apple's subscription eligibility check confirms eligibility. We found
no reviewer-specific feature switches in the authentication, navigation, and
subscription code we inspected.

We also identified discrepancies to address in our review documentation: the
mobile Analytics screen is accessible to Free users, and the paywall's legal
links open our public website, whose navigation includes a separate Store page.
Please let us know if either behavior relates to your finding.

Could we arrange a call with an App Review specialist to clarify the specific
concern before another submission? Spanish is preferred; we can coordinate an
available time through this conversation.

Thank you,
RBTGenius Team

## Fuentes

- Envío: https://appstoreconnect.apple.com/apps/6766110248/distribution/reviewsubmissions/details/2217c394-ad82-4265-a4de-d60f19871de5
- Reglas: https://developer.apple.com/app-store/review/guidelines/#5.6
- Compatibilidad: https://developer.apple.com/forums/thread/817078
- Cuentas, notas y solicitud de llamada: https://developer.apple.com/forums/thread/810791
- Privacy verificada: https://www.rbtgenius.com/privacy-policy
- Store verificada: https://www.rbtgenius.com/store
