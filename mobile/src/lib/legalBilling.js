// Billing paragraphs for the in-app legal screens — Android / web build.
// Metro resolves legalBilling.ios.js on iOS, where purchases are billed by
// Apple and refunds are handled by Apple, not by us. Keeping these texts
// per-platform stops the app from telling iOS users something that is not
// true of their purchase (which is how a legal screen becomes "misleading"
// under App Store Review Guideline 5.6).

export const BILLING_PRIVACY_SECTION = {
  h: '3. Billing and payment data',
  b: 'Subscription payments may be processed through Stripe. RBT Genius may store payment metadata such as plan, amount, currency, status, Stripe customer IDs, and Stripe session or subscription references. Full card data is not stored directly by RBT Genius.',
};

export const REFUND_SECTIONS = [
  { h: '1. Subscription purchases', b: 'Premium access may be sold as monthly or yearly recurring billing. By purchasing a premium subscription, you authorize recurring charges according to the plan selected during checkout.' },
  { h: '2. Refund requests', b: 'Refund requests are reviewed on a case-by-case basis. If you believe you were charged in error or experienced a billing problem, contact us as soon as possible so we can review the situation.' },
  { h: '3. Non-refundable situations', b: 'In general, partial usage of a billing period, missed cancellations, or access to premium content alone may not automatically qualify for a refund. However, we will still review legitimate cases fairly.' },
  { h: '4. How to request help', b: 'For billing support or refund review, email info@rbtgenius.com and include the email used on your account, the plan involved, and the date of the charge.' },
];

export const BILLING_PRIVACY_SECTION_ES = {
  h: '3. Datos de facturación y pago',
  b: 'Los pagos de suscripciones pueden procesarse mediante Stripe. RBT Genius puede guardar metadatos como plan, importe, moneda, estado, identificadores de cliente de Stripe y referencias de sesiones o suscripciones. RBT Genius no almacena directamente los datos completos de la tarjeta.',
};
export const REFUND_SECTIONS_ES = [
  { h: '1. Compras de suscripciones', b: 'El acceso premium puede venderse con facturación recurrente mensual o anual. Al comprar una suscripción, autorizas los cargos recurrentes según el plan seleccionado durante el pago.' },
  { h: '2. Solicitudes de reembolso', b: 'Las solicitudes de reembolso se revisan individualmente. Si crees que se te cobró por error o hubo un problema de facturación, contáctanos lo antes posible para revisarlo.' },
  { h: '3. Situaciones sin reembolso automático', b: 'En general, el uso parcial de un período, no cancelar a tiempo o acceder a contenido premium no dan derecho automático a un reembolso. Revisaremos de forma justa los casos legítimos.' },
  { h: '4. Cómo solicitar ayuda', b: 'Para asistencia de facturación o revisión de un reembolso, escribe a info@rbtgenius.com e indica el correo de tu cuenta, el plan y la fecha del cargo.' },
];
