// Keep the legacy URL compatible while sharing every billing fix with /api/billing/webhook.
export const config = { api: { bodyParser: false } };
export { default } from '../index.js';
