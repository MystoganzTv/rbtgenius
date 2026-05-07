import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1 });
export { sql };

// ── Users ─────────────────────────────────────────────────────────────────────

export async function getUserByToken(token) {
  if (!token) return null;
  const rows = await sql`SELECT * FROM users WHERE token = ${token} LIMIT 1`;
  return rows[0] ?? null;
}

export async function getUserByEmail(email) {
  const rows = await sql`SELECT * FROM users WHERE email = ${email.toLowerCase()} LIMIT 1`;
  return rows[0] ?? null;
}

export async function getUserById(id) {
  const rows = await sql`SELECT * FROM users WHERE id = ${id} LIMIT 1`;
  return rows[0] ?? null;
}

export async function getAllUsers() {
  return sql`SELECT * FROM users ORDER BY created_at DESC`;
}

export async function createUser(user) {
  const [row] = await sql`
    INSERT INTO users (id, email, full_name, role, plan, created_at, auth_provider,
      oauth_accounts, token, token_issued_at, token_expires_at, stripe_customer_id,
      password_hash, password_salt)
    VALUES (
      ${user.id}, ${user.email}, ${user.full_name}, ${user.role}, ${user.plan},
      ${user.created_at}, ${user.auth_provider}, ${JSON.stringify(user.oauth_accounts ?? {})},
      ${user.token ?? null}, ${user.token_issued_at ?? null}, ${user.token_expires_at ?? null},
      ${user.stripe_customer_id ?? null}, ${user.password_hash ?? null}, ${user.password_salt ?? null}
    )
    RETURNING *
  `;
  return row;
}

export async function updateUser(id, fields) {
  const [row] = await sql`
    UPDATE users SET
      full_name         = COALESCE(${fields.full_name ?? null}, full_name),
      role              = COALESCE(${fields.role ?? null}, role),
      plan              = COALESCE(${fields.plan ?? null}, plan),
      token             = ${fields.token !== undefined ? fields.token : sql`token`},
      token_issued_at   = ${fields.token_issued_at !== undefined ? fields.token_issued_at : sql`token_issued_at`},
      token_expires_at  = ${fields.token_expires_at !== undefined ? fields.token_expires_at : sql`token_expires_at`},
      stripe_customer_id = COALESCE(${fields.stripe_customer_id ?? null}, stripe_customer_id),
      oauth_accounts    = COALESCE(${fields.oauth_accounts ? JSON.stringify(fields.oauth_accounts) : null}::jsonb, oauth_accounts)
    WHERE id = ${id}
    RETURNING *
  `;
  return row;
}

export async function clearUserSession(id) {
  await sql`
    UPDATE users SET token = NULL, token_issued_at = NULL, token_expires_at = NULL
    WHERE id = ${id}
  `;
}

export async function deleteUser(id) {
  await sql`DELETE FROM users WHERE id = ${id}`;
}

// ── Attempts ──────────────────────────────────────────────────────────────────

export async function getAttemptsByUser(userId) {
  return sql`SELECT * FROM attempts WHERE user_id = ${userId} ORDER BY created_at DESC`;
}

export async function getPracticeAttemptIdsByUser(userId) {
  const rows = await sql`
    SELECT DISTINCT question_id FROM attempts
    WHERE user_id = ${userId} AND (source = 'practice' OR source IS NULL)
  `;
  return rows.map(r => r.question_id);
}

export async function getMockAttemptIdsByUser(userId) {
  const rows = await sql`
    SELECT DISTINCT a->>'question_id' as question_id
    FROM mock_exams, jsonb_array_elements(answers) as a
    WHERE user_id = ${userId}
  `;
  return rows.map(r => r.question_id).filter(Boolean);
}

export async function createAttempt(attempt) {
  const [row] = await sql`
    INSERT INTO attempts (id, user_id, question_id, selected_answer, is_correct, topic, source, created_at)
    VALUES (${attempt.id}, ${attempt.user_id}, ${attempt.question_id},
      ${attempt.selected_answer ?? null}, ${attempt.is_correct}, ${attempt.topic ?? null},
      ${attempt.source ?? 'practice'}, ${attempt.created_at})
    RETURNING *
  `;
  return row;
}

export async function deleteAttemptsByUser(userId) {
  await sql`DELETE FROM attempts WHERE user_id = ${userId}`;
}

// ── Mock Exams ────────────────────────────────────────────────────────────────

export async function getMockExamsByUser(userId) {
  return sql`SELECT * FROM mock_exams WHERE user_id = ${userId} ORDER BY created_at DESC`;
}

export async function createMockExam(exam) {
  const [row] = await sql`
    INSERT INTO mock_exams (id, user_id, created_at, score, total_questions, correct_answers,
      time_taken_minutes, status, passed, answers, domain_scores)
    VALUES (${exam.id}, ${exam.user_id}, ${exam.created_at}, ${exam.score},
      ${exam.total_questions}, ${exam.correct_answers}, ${exam.time_taken_minutes},
      ${exam.status}, ${exam.passed}, ${JSON.stringify(exam.answers)}, ${JSON.stringify(exam.domain_scores)})
    RETURNING *
  `;
  return row;
}

export async function deleteMockExamsByUser(userId) {
  await sql`DELETE FROM mock_exams WHERE user_id = ${userId}`;
}

// ── Payments ──────────────────────────────────────────────────────────────────

export async function getPaymentsByUser(userId) {
  return sql`SELECT * FROM payments WHERE user_id = ${userId} ORDER BY created_at DESC`;
}

export async function getAllPayments() {
  return sql`SELECT * FROM payments ORDER BY created_at DESC`;
}

export async function createPayment(payment) {
  await sql`
    INSERT INTO payments (id, user_id, status, amount, payment_date, created_at, metadata)
    VALUES (${payment.id}, ${payment.user_id}, ${payment.status ?? null},
      ${Number(payment.amount ?? 0)}, ${payment.payment_date ?? null},
      ${payment.created_at}, ${JSON.stringify(payment.metadata ?? {})})
    ON CONFLICT (id) DO UPDATE SET
      status = EXCLUDED.status, amount = EXCLUDED.amount,
      payment_date = EXCLUDED.payment_date, metadata = EXCLUDED.metadata
  `;
}

export async function deletePaymentsByUser(userId) {
  await sql`DELETE FROM payments WHERE user_id = ${userId}`;
}

// ── Practice sessions ─────────────────────────────────────────────────────────

export async function getPracticeSession(userId) {
  const rows = await sql`SELECT data FROM practice_sessions WHERE user_id = ${userId}`;
  return rows[0]?.data ?? null;
}

export async function upsertPracticeSession(userId, data) {
  await sql`
    INSERT INTO practice_sessions (user_id, data, updated_at)
    VALUES (${userId}, ${JSON.stringify(data)}, NOW())
    ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
  `;
}

export async function deletePracticeSession(userId) {
  await sql`DELETE FROM practice_sessions WHERE user_id = ${userId}`;
}

// ── Tutor conversations ───────────────────────────────────────────────────────

export async function getTutorConversationsByUser(userId) {
  const convs = await sql`
    SELECT * FROM tutor_conversations WHERE user_id = ${userId} ORDER BY updated_at DESC
  `;
  if (convs.length === 0) return [];
  const ids = convs.map(c => c.id);
  const msgs = await sql`
    SELECT * FROM tutor_messages WHERE conversation_id = ANY(${ids}) ORDER BY created_at ASC
  `;
  return convs.map(c => ({
    id: c.id,
    metadata: { name: c.name },
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    messages: msgs
      .filter(m => m.conversation_id === c.id)
      .map(m => ({ id: m.id, role: m.role, content: m.content, created_at: m.created_at, ...(m.extras ?? {}) })),
  }));
}

export async function getTutorConversation(id, userId) {
  const rows = await sql`
    SELECT * FROM tutor_conversations WHERE id = ${id} AND user_id = ${userId} LIMIT 1
  `;
  if (!rows[0]) return null;
  const c = rows[0];
  const msgs = await sql`
    SELECT * FROM tutor_messages WHERE conversation_id = ${id} ORDER BY created_at ASC
  `;
  return {
    id: c.id,
    metadata: { name: c.name },
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    messages: msgs.map(m => ({ id: m.id, role: m.role, content: m.content, created_at: m.created_at, ...(m.extras ?? {}) })),
  };
}

export async function createTutorConversation(userId, id, name, createdAt) {
  await sql`
    INSERT INTO tutor_conversations (id, user_id, name, created_at, updated_at)
    VALUES (${id}, ${userId}, ${name}, ${createdAt}, ${createdAt})
  `;
}

export async function addTutorMessage(msg) {
  const extras = {};
  if (msg.quiz) extras.quiz = msg.quiz;
  if (msg.follow_up) extras.follow_up = msg.follow_up;
  await sql`
    INSERT INTO tutor_messages (id, conversation_id, user_id, role, content, created_at, extras)
    VALUES (${msg.id}, ${msg.conversation_id}, ${msg.user_id}, ${msg.role},
      ${msg.content}, ${msg.created_at}, ${JSON.stringify(extras)})
  `;
  await sql`
    UPDATE tutor_conversations SET updated_at = NOW(), name = CASE
      WHEN name = 'New Chat' THEN ${msg.autoName ?? 'New Chat'}
      ELSE name END
    WHERE id = ${msg.conversation_id}
  `;
}

export async function countTutorMessagesToday(userId) {
  const rows = await sql`
    SELECT COUNT(*) as cnt FROM tutor_messages
    WHERE user_id = ${userId} AND role = 'user' AND created_at >= CURRENT_DATE
  `;
  return Number(rows[0]?.cnt ?? 0);
}

export async function deleteTutorConversationsByUser(userId) {
  await sql`DELETE FROM tutor_conversations WHERE user_id = ${userId}`;
}

// ── Push tokens ───────────────────────────────────────────────────────────────

export async function upsertPushToken(userId, token, platform) {
  await sql`
    INSERT INTO push_tokens (user_id, token, platform, updated_at)
    VALUES (${userId}, ${token}, ${platform ?? 'ios'}, NOW())
    ON CONFLICT (user_id) DO UPDATE SET token = EXCLUDED.token, platform = EXCLUDED.platform, updated_at = NOW()
  `;
}

export async function deletePushToken(userId) {
  await sql`DELETE FROM push_tokens WHERE user_id = ${userId}`;
}

export async function getAllPushTokens() {
  return sql`SELECT user_id, token, platform FROM push_tokens`;
}

// ── Stripe events ─────────────────────────────────────────────────────────────

export async function hasStripeEvent(eventId) {
  const rows = await sql`SELECT 1 FROM stripe_events WHERE event_id = ${eventId}`;
  return rows.length > 0;
}

export async function saveStripeEvent(eventId) {
  await sql`
    INSERT INTO stripe_events (event_id) VALUES (${eventId}) ON CONFLICT DO NOTHING
  `;
}

// ── OAuth states ──────────────────────────────────────────────────────────────

export async function saveOAuthState(state, data) {
  await sql`DELETE FROM oauth_states WHERE created_at < NOW() - INTERVAL '15 minutes'`;
  await sql`
    INSERT INTO oauth_states (state, provider_id, frontend_origin, redirect_to, created_at)
    VALUES (${state}, ${data.provider_id}, ${data.frontend_origin ?? null},
      ${data.redirect_to ?? null}, ${data.created_at})
    ON CONFLICT (state) DO NOTHING
  `;
}

export async function consumeOAuthState(state) {
  const rows = await sql`DELETE FROM oauth_states WHERE state = ${state} RETURNING *`;
  return rows[0] ?? null;
}

// ── Rate limits ───────────────────────────────────────────────────────────────

export async function getRateLimitDb(keys) {
  if (!keys.length) return {};
  const rows = await sql`SELECT key, data FROM rate_limits WHERE key = ANY(${keys})`;
  const out = {};
  rows.forEach(r => { out[r.key] = r.data; });
  return out;
}

export async function setRateLimitDb(key, data) {
  await sql`
    INSERT INTO rate_limits (key, data, updated_at) VALUES (${key}, ${JSON.stringify(data)}, NOW())
    ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
  `;
}

export async function deleteRateLimitKey(key) {
  await sql`DELETE FROM rate_limits WHERE key = ${key}`;
}
