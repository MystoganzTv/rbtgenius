export function authErrorText(error, t) {
  const message = String(error?.message || '');
  if (/invalid email or password/i.test(message)) return t('auth.error_credentials');
  if (/verify your email/i.test(message)) return t('auth.verify_email');
  if (/already exists/i.test(message)) return t('auth.email_exists');
  if (/at least 8 characters/i.test(message)) return t('auth.password_min');
  if (/network|fetch|offline/i.test(message)) return t('common.network_error');
  return t('common.try_again');
}
