export default class Payment {
  constructor(data = {}) {
    this.amount = data.amount ?? 0;
    this.plan = data.plan ?? "premium_monthly";
    this.status = data.status ?? "completed";
    this.payment_date = data.payment_date ?? null;
    this.next_billing_date = data.next_billing_date ?? null;
    this.payment_method = data.payment_method ?? "";
  }
}
