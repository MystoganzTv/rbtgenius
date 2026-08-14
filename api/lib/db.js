import postgres from 'postgres';
import { attachSessionToUser } from '../../server/lib/auth.js';

let _sql = null;
function getSql() {
  if (!_sql) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
    _sql = postgres(process.env.DATABASE_URL, {
      ssl: 'require',
      max: 1,
      prepare: false,
      connect_timeout: 10,
      idle_timeout: 5,
      max_lifetime: 60,
      // Supabase's transaction pooler can open connections with an empty
      // search_path. Set it explicitly so every existing unqualified query
      // resolves to the application's public schema.
      connection: { search_path: 'public' },
    });
  }
  return _sql;
}
export function sql(strings, ...values) {
  return getSql()(strings, ...values);
}

// ── Health ────────────────────────────────────────────────────────────────────

// Cheapest possible round-trip to Postgres. Used by /api/health so an external
// monitor (UptimeRobot et al.) actually sees database outages instead of just
// confirming that the serverless function boots.
export async function pingDb({ timeoutMs = 5000 } = {}) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`db ping timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    await Promise.race([sql`SELECT 1`, timeout]);
    return true;
  } finally {
    clearTimeout(timer);
  }
}

// ── Users ─────────────────────────────────────────────────────────────────────

function normalizeUser(row) {
  if (!row) return null;
  return {
    ...row,
    oauth_accounts: typeof row.oauth_accounts === 'string'
      ? (() => { try { return JSON.parse(row.oauth_accounts); } catch { return {}; } })()
      : (row.oauth_accounts ?? {}),
  };
}

export async function getUserByToken(token) {
  if (!token) return null;
  const rows = await sql`SELECT * FROM users WHERE token = ${token} LIMIT 1`;
  return normalizeUser(rows[0] ?? null);
}

// ── Sessions ──────────────────────────────────────────────────────────────────
//
// One row per signed-in device. `users.token` is still written by the sign-in
// paths for backward compatibility, but it is no longer what keeps you signed
// in — that's this table. See the migration for the full rationale.

// Resolve a bearer token to its owner.
//
// Checks `sessions` first, then falls back to the legacy `users.token` column
// so tokens issued before the sessions table existed keep working. Returns the
// user with the presented session attached so callers can reuse the existing
// expiry checks without a second query.
export async function getUserBySessionToken(token) {
  if (!token) return null;

  const rows = await sql`
    SELECT
      u.*,
      s.token AS _session_token,
      s.issued_at AS _session_issued_at,
      s.expires_at AS _session_expires_at
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ${token}
    LIMIT 1
  `;
  if (rows[0]) {
    // Strip the joined aliases, then replace the legacy account-level
    // credential with the credential for the device making this request.
    const {
      _session_expires_at,
      _session_issued_at,
      _session_token,
      ...row
    } = rows[0];
    return attachSessionToUser(normalizeUser(row), {
      token: _session_token,
      issued_at: _session_issued_at,
      expires_at: _session_expires_at,
    });
  }

  // Legacy fallback — a session predating the sessions table.
  return getUserByToken(token);
}

export async function createSession(userId, session, platform = null) {
  await sql`
    INSERT INTO sessions (token, user_id, issued_at, expires_at, last_seen_at, platform)
    VALUES (${session.token}, ${userId}, ${session.issued_at}, ${session.expires_at}, NOW(), ${platform})
    ON CONFLICT (token) DO NOTHING
  `;
  await recordDailyActivity(userId);
}

// Swap one session row for another, preserving the device's platform tag.
// Used when a token is close to expiry and gets rotated.
export async function rotateSession(oldToken, userId, session) {
  await sql.begin(async (tx) => {
    const [previous] = await tx`SELECT platform FROM sessions WHERE token = ${oldToken}`;
    await tx`DELETE FROM sessions WHERE token = ${oldToken}`;
    await tx`
      INSERT INTO sessions (token, user_id, issued_at, expires_at, last_seen_at, platform)
      VALUES (${session.token}, ${userId}, ${session.issued_at}, ${session.expires_at}, NOW(), ${previous?.platform ?? null})
      ON CONFLICT (token) DO NOTHING
    `;
  });
  await recordDailyActivity(userId);
}

// Sign out a single device. Other sessions for the same user survive.
export async function deleteSession(token) {
  if (!token) return;
  await sql`DELETE FROM sessions WHERE token = ${token}`;
}

export async function deleteSessionsByUser(userId) {
  await sql`DELETE FROM sessions WHERE user_id = ${userId}`;
}

export async function listSessionsByUser(userId) {
  return sql`
    SELECT token, issued_at, expires_at, last_seen_at, platform
    FROM sessions
    WHERE user_id = ${userId} AND expires_at > NOW()
    ORDER BY last_seen_at DESC
  `;
}

export async function touchSession(token) {
  if (!token) return;
  const [session] = await sql`
    UPDATE sessions SET last_seen_at = NOW()
    WHERE token = ${token}
    RETURNING user_id
  `;
  if (session?.user_id) await recordDailyActivity(session.user_id);
}

async function recordDailyActivity(userId) {
  if (!userId) return;
  try {
    await sql`
      INSERT INTO user_daily_activity (
        user_id, activity_date, first_seen_at, last_seen_at, request_count
      )
      VALUES (
        ${userId},
        (NOW() AT TIME ZONE 'America/New_York')::date,
        NOW(),
        NOW(),
        1
      )
      ON CONFLICT (user_id, activity_date) DO UPDATE SET
        last_seen_at = EXCLUDED.last_seen_at,
        request_count = user_daily_activity.request_count + 1
    `;
  } catch (error) {
    // Activity telemetry must never prevent sign-in or an authenticated API
    // request. This also keeps a staged deploy safe if its additive migration
    // has not reached a preview database yet.
    console.warn('[activity] unable to record daily visit:', error.message);
  }
}

export async function pruneExpiredSessions() {
  await sql`DELETE FROM sessions WHERE expires_at < NOW()`;
}

export async function getUserByEmail(email) {
  const rows = await sql`SELECT * FROM users WHERE email = ${email.toLowerCase()} LIMIT 1`;
  return normalizeUser(rows[0] ?? null);
}

export async function getUserById(id) {
  const rows = await sql`SELECT * FROM users WHERE id = ${id} LIMIT 1`;
  return normalizeUser(rows[0] ?? null);
}

export async function getUserByStripeCustomerId(customerId) {
  if (!customerId) return null;
  const rows = await sql`SELECT * FROM users WHERE stripe_customer_id = ${customerId} LIMIT 1`;
  return normalizeUser(rows[0] ?? null);
}

export async function getUserByAppleId(appleUserId) {
  if (!appleUserId) return null;
  // oauth_accounts is stored as jsonb (or text jsonb) — try both cast forms
  const rows = await sql`
    SELECT * FROM users
    WHERE oauth_accounts->'apple'->>'id' = ${appleUserId}
       OR oauth_accounts::jsonb->'apple'->>'id' = ${appleUserId}
    LIMIT 1
  `;
  return normalizeUser(rows[0] ?? null);
}

export async function getAllUsers() {
  const rows = await sql`SELECT * FROM users ORDER BY created_at DESC`;
  return rows.map(normalizeUser);
}

// Load the compact admin dashboard dataset in one database round trip. This
// prevents Supabase's transaction pooler from queuing dozens of serialized
// serverless queries and starving ordinary authentication requests.
export async function getAdminMembersDataset() {
  const [row] = await sql`
    SELECT
      COALESCE((
        SELECT jsonb_agg(to_jsonb(u) ORDER BY u.created_at DESC)
        FROM users u
      ), '[]'::jsonb) AS users,
      COALESCE((
        SELECT jsonb_agg(to_jsonb(a) ORDER BY a.created_at DESC)
        FROM attempts a
      ), '[]'::jsonb) AS attempts,
      COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', e.id,
            'user_id', e.user_id,
            'score', e.score::float8,
            'total_questions', e.total_questions,
            'correct_answers', e.correct_answers,
            'time_taken_minutes', e.time_taken_minutes,
            'status', e.status,
            'passed', e.passed,
            'domain_scores', e.domain_scores,
            'created_at', e.created_at
          ) ORDER BY e.created_at DESC
        )
        FROM mock_exams e
      ), '[]'::jsonb) AS exams,
      COALESCE((
        SELECT jsonb_agg(to_jsonb(p) ORDER BY p.created_at DESC)
        FROM payments p
      ), '[]'::jsonb) AS payments,
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'user_id', s.user_id,
          'issued_at', s.issued_at,
          'last_seen_at', s.last_seen_at,
          'platform', s.platform
        ))
        FROM sessions s
      ), '[]'::jsonb) AS sessions,
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'user_id', v.user_id,
          'activity_date', v.activity_date,
          'first_seen_at', v.first_seen_at,
          'last_seen_at', v.last_seen_at,
          'request_count', v.request_count
        ))
        FROM user_daily_activity v
      ), '[]'::jsonb) AS visits,
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'user_id', t.user_id,
          'created_at', t.created_at
        ))
        FROM tutor_messages t
        WHERE t.role = 'user'
      ), '[]'::jsonb) AS tutor_activity
  `;

  return {
    users: (row?.users || []).map(normalizeUser),
    attempts: row?.attempts || [],
    exams: (row?.exams || []).map(exam => ({
      ...exam,
      domain_scores: parseJsonbField(exam.domain_scores),
    })),
    payments: (row?.payments || []).map(normalizePayment),
    sessions: row?.sessions || [],
    visits: row?.visits || [],
    tutorActivity: row?.tutor_activity || [],
  };
}

// One consistent source for the member table and its summary cards. A member
// is active when they used the app, answered a question, completed an exam, or
// sent a tutor message — not merely when an access token was first issued.
export async function getAdminActivitySummaries() {
  const rows = await sql`
    WITH calendar AS (
      SELECT (NOW() AT TIME ZONE 'America/New_York')::date AS today
    ),
    attempt_stats AS (
      SELECT
        user_id,
        COUNT(*)::int AS total_questions,
        COUNT(*) FILTER (
          WHERE (created_at AT TIME ZONE 'America/New_York')::date = calendar.today
        )::int AS questions_today,
        COUNT(*) FILTER (
          WHERE (created_at AT TIME ZONE 'America/New_York')::date = calendar.today - 1
        )::int AS questions_yesterday,
        COUNT(*) FILTER (
          WHERE (created_at AT TIME ZONE 'America/New_York')::date >= calendar.today - 6
        )::int AS questions_7d,
        COUNT(*) FILTER (
          WHERE (created_at AT TIME ZONE 'America/New_York')::date >= calendar.today - 29
        )::int AS questions_30d,
        MAX(created_at) AS last_attempt_at
      FROM attempts
      CROSS JOIN calendar
      GROUP BY user_id
    ),
    exam_stats AS (
      SELECT
        user_id,
        COUNT(*)::int AS total_exams,
        COUNT(*) FILTER (
          WHERE (created_at AT TIME ZONE 'America/New_York')::date >= calendar.today - 29
        )::int AS exams_30d,
        MAX(created_at) AS last_exam_at
      FROM mock_exams
      CROSS JOIN calendar
      GROUP BY user_id
    ),
    session_stats AS (
      SELECT user_id, MAX(last_seen_at) AS last_session_at
      FROM sessions
      GROUP BY user_id
    ),
    visit_stats AS (
      SELECT user_id, MAX(last_seen_at) AS last_visit_at
      FROM user_daily_activity
      GROUP BY user_id
    ),
    tutor_stats AS (
      SELECT user_id, MAX(created_at) AS last_tutor_at
      FROM tutor_messages
      WHERE role = 'user'
      GROUP BY user_id
    ),
    activity_days AS (
      SELECT user_id, activity_date FROM user_daily_activity
      UNION
      SELECT user_id, (created_at AT TIME ZONE 'America/New_York')::date FROM attempts
      UNION
      SELECT user_id, (created_at AT TIME ZONE 'America/New_York')::date FROM mock_exams
      UNION
      SELECT user_id, (created_at AT TIME ZONE 'America/New_York')::date
      FROM tutor_messages WHERE role = 'user'
    ),
    day_stats AS (
      SELECT
        user_id,
        COUNT(*) FILTER (WHERE activity_date >= calendar.today - 6)::int AS active_days_7d,
        COUNT(*) FILTER (WHERE activity_date >= calendar.today - 29)::int AS active_days_30d
      FROM activity_days
      CROSS JOIN calendar
      GROUP BY user_id
    )
    SELECT
      u.id AS user_id,
      COALESCE(a.total_questions, 0)::int AS total_questions,
      COALESCE(a.questions_today, 0)::int AS questions_today,
      COALESCE(a.questions_yesterday, 0)::int AS questions_yesterday,
      COALESCE(a.questions_7d, 0)::int AS questions_7d,
      COALESCE(a.questions_30d, 0)::int AS questions_30d,
      COALESCE(e.total_exams, 0)::int AS total_exams,
      COALESCE(e.exams_30d, 0)::int AS exams_30d,
      COALESCE(d.active_days_7d, 0)::int AS active_days_7d,
      COALESCE(d.active_days_30d, 0)::int AS active_days_30d,
      GREATEST(
        v.last_visit_at,
        s.last_session_at,
        a.last_attempt_at,
        e.last_exam_at,
        t.last_tutor_at,
        u.token_issued_at
      ) AS last_active_at
    FROM users u
    LEFT JOIN attempt_stats a ON a.user_id = u.id
    LEFT JOIN exam_stats e ON e.user_id = u.id
    LEFT JOIN session_stats s ON s.user_id = u.id
    LEFT JOIN visit_stats v ON v.user_id = u.id
    LEFT JOIN tutor_stats t ON t.user_id = u.id
    LEFT JOIN day_stats d ON d.user_id = u.id
  `;
  return rows;
}

export async function getMemberDailyActivity(userId, days = 30) {
  const safeDays = Math.min(90, Math.max(7, Number(days) || 30));
  return sql`
    WITH calendar AS (
      SELECT (NOW() AT TIME ZONE 'America/New_York')::date AS today
    ),
    days AS (
      SELECT generate_series(
        calendar.today - (${safeDays}::int - 1),
        calendar.today,
        INTERVAL '1 day'
      )::date AS activity_date
      FROM calendar
    ),
    attempt_daily AS (
      SELECT
        (created_at AT TIME ZONE 'America/New_York')::date AS activity_date,
        COUNT(*)::int AS questions,
        COUNT(*) FILTER (WHERE is_correct)::int AS correct
      FROM attempts
      CROSS JOIN calendar
      WHERE user_id = ${userId}
        AND (created_at AT TIME ZONE 'America/New_York')::date >= calendar.today - (${safeDays}::int - 1)
      GROUP BY 1
    ),
    exam_daily AS (
      SELECT
        (created_at AT TIME ZONE 'America/New_York')::date AS activity_date,
        COUNT(*)::int AS exams
      FROM mock_exams
      CROSS JOIN calendar
      WHERE user_id = ${userId}
        AND (created_at AT TIME ZONE 'America/New_York')::date >= calendar.today - (${safeDays}::int - 1)
      GROUP BY 1
    ),
    visit_daily AS (
      SELECT
        activity_date,
        MAX(last_seen_at) AS last_seen_at,
        SUM(request_count)::int AS request_count
      FROM user_daily_activity
      CROSS JOIN calendar
      WHERE user_id = ${userId}
        AND activity_date >= calendar.today - (${safeDays}::int - 1)
      GROUP BY activity_date
    ),
    tutor_daily AS (
      SELECT
        (created_at AT TIME ZONE 'America/New_York')::date AS activity_date,
        COUNT(*)::int AS tutor_messages
      FROM tutor_messages
      CROSS JOIN calendar
      WHERE user_id = ${userId}
        AND role = 'user'
        AND (created_at AT TIME ZONE 'America/New_York')::date >= calendar.today - (${safeDays}::int - 1)
      GROUP BY 1
    )
    SELECT
      TO_CHAR(days.activity_date, 'YYYY-MM-DD') AS date,
      COALESCE(a.questions, 0)::int AS questions,
      COALESCE(a.correct, 0)::int AS correct,
      COALESCE(e.exams, 0)::int AS exams,
      COALESCE(t.tutor_messages, 0)::int AS tutor_messages,
      COALESCE(v.request_count, 0)::int AS request_count,
      v.last_seen_at,
      (
        COALESCE(a.questions, 0) > 0 OR
        COALESCE(e.exams, 0) > 0 OR
        COALESCE(t.tutor_messages, 0) > 0 OR
        COALESCE(v.request_count, 0) > 0
      ) AS active
    FROM days
    LEFT JOIN attempt_daily a USING (activity_date)
    LEFT JOIN exam_daily e USING (activity_date)
    LEFT JOIN visit_daily v USING (activity_date)
    LEFT JOIN tutor_daily t USING (activity_date)
    ORDER BY days.activity_date ASC
  `;
}

export async function createUser(user) {
  const [row] = await sql`
    INSERT INTO users (id, email, full_name, role, plan, created_at, auth_provider,
      oauth_accounts, token, token_issued_at, token_expires_at, stripe_customer_id,
      stripe_subscription_id, password_hash, password_salt)
    VALUES (
      ${user.id}, ${user.email}, ${user.full_name}, ${user.role}, ${user.plan},
      ${user.created_at}, ${user.auth_provider}, ${JSON.stringify(user.oauth_accounts ?? {})},
      ${user.token ?? null}, ${user.token_issued_at ?? null}, ${user.token_expires_at ?? null},
      ${user.stripe_customer_id ?? null}, ${user.stripe_subscription_id ?? null}, ${user.password_hash ?? null}, ${user.password_salt ?? null}
    )
    RETURNING *
  `;
  return normalizeUser(row);
}

export async function updateUser(id, fields) {
  const patch = {};
  if (fields.full_name !== undefined) patch.full_name = fields.full_name;
  if (fields.role !== undefined) patch.role = fields.role;
  if (fields.plan !== undefined) patch.plan = fields.plan;
  if (fields.token !== undefined) patch.token = fields.token;
  if (fields.token_issued_at !== undefined) patch.token_issued_at = fields.token_issued_at;
  if (fields.token_expires_at !== undefined) patch.token_expires_at = fields.token_expires_at;
  if (fields.stripe_customer_id !== undefined) patch.stripe_customer_id = fields.stripe_customer_id;
  if (fields.stripe_subscription_id !== undefined) patch.stripe_subscription_id = fields.stripe_subscription_id;
  if (fields.oauth_accounts !== undefined) patch.oauth_accounts = JSON.stringify(fields.oauth_accounts);
  if (fields.password_hash !== undefined) patch.password_hash = fields.password_hash;
  if (fields.password_salt !== undefined) patch.password_salt = fields.password_salt;
  if (fields.email_verified !== undefined) patch.email_verified = fields.email_verified;
  if (fields.email_verification_token !== undefined) patch.email_verification_token = fields.email_verification_token;
  if (Object.keys(patch).length === 0) {
    const rows = await sql`SELECT * FROM users WHERE id = ${id}`;
    return normalizeUser(rows[0] ?? null);
  }
  const [row] = await sql`UPDATE users SET ${sql(patch)} WHERE id = ${id} RETURNING *`;
  return normalizeUser(row);
}

export async function clearUserSession(id) {
  await sql`
    UPDATE users SET token = NULL, token_issued_at = NULL, token_expires_at = NULL
    WHERE id = ${id}
  `;
}

export async function clearLegacySessionIfTokenMatches(id, token) {
  if (!token) return;
  await sql`
    UPDATE users SET token = NULL, token_issued_at = NULL, token_expires_at = NULL
    WHERE id = ${id} AND token = ${token}
  `;
}

// Delete a member and every row that references them.
//
// A plain `DELETE FROM users` fails: attempts, mock_exams, payments,
// practice_sessions, tutor_conversations, tutor_messages and push_tokens all
// hold a foreign key to users.id, so Postgres rejects the delete. Everything
// runs in one transaction — a partial delete would leave orphaned study data
// attached to an id that no longer exists.
//
// Child tables are removed before parents (tutor_messages before
// tutor_conversations) so the FK between them is never violated mid-transaction.
export async function deleteUser(id) {
  const db = getSql();
  await db.begin(async (tx) => {
    await tx`DELETE FROM tutor_messages WHERE user_id = ${id}`;
    await tx`DELETE FROM tutor_conversations WHERE user_id = ${id}`;
    await tx`DELETE FROM attempts WHERE user_id = ${id}`;
    await tx`DELETE FROM mock_exams WHERE user_id = ${id}`;
    await tx`DELETE FROM payments WHERE user_id = ${id}`;
    await tx`DELETE FROM practice_sessions WHERE user_id = ${id}`;
    await tx`DELETE FROM push_tokens WHERE user_id = ${id}`;
    await tx`DELETE FROM sessions WHERE user_id = ${id}`;
    await tx`DELETE FROM users WHERE id = ${id}`;
  });
}

// ── Attempts ──────────────────────────────────────────────────────────────────

export async function getAttemptsByUser(userId) {
  // Limit to last 1000 — enough for all progress calculations, avoids huge fetches
  return sql`SELECT * FROM attempts WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 1000`;
}

// Admin member analytics needs every member at once. Fetching per member on a
// single-connection serverless client serialized dozens of round trips and
// could exceed Vercel's five-minute limit.
export async function getAllAttemptsForAdmin() {
  return sql`
    SELECT id, user_id, question_id, selected_answer, is_correct, topic, source, created_at
    FROM attempts
    ORDER BY created_at DESC
  `;
}

// Returns question_ids where the user's MOST RECENT attempt was incorrect.
// Used by the "Review Mistakes" feature to surface genuinely unmastered questions.
export async function getWrongQuestionIdsByUser(userId) {
  const rows = await sql`
    SELECT question_id
    FROM (
      SELECT DISTINCT ON (question_id)
        question_id, is_correct
      FROM attempts
      WHERE user_id = ${userId}
        AND question_id IS NOT NULL
      ORDER BY question_id, created_at DESC
    ) latest
    WHERE is_correct = false
    LIMIT 200
  `;
  return rows.map(r => r.question_id);
}

export async function getPracticeAttemptIdsByUser(userId) {
  const rows = await sql`
    SELECT DISTINCT question_id FROM attempts
    WHERE user_id = ${userId} AND (source = 'practice' OR source IS NULL)
  `;
  return rows.map(r => r.question_id);
}

export async function getMockAttemptIdsByUser(userId) {
  const exams = await getMockExamsByUser(userId);
  const ids = new Set();
  for (const exam of exams) {
    const answers = Array.isArray(exam.answers) ? exam.answers : [];
    for (const a of answers) {
      if (a.question_id) ids.add(a.question_id);
    }
  }
  return [...ids];
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

function parseJsonbField(value) {
  if (!value || typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return value; }
}

// Full fetch — only use when answers are actually needed (mock exam history page)
export async function getMockExamsByUser(userId) {
  const rows = await sql`SELECT * FROM mock_exams WHERE user_id = ${userId} ORDER BY created_at DESC`;
  return rows.map(r => ({
    ...r,
    answers: parseJsonbField(r.answers),
    domain_scores: parseJsonbField(r.domain_scores),
  }));
}

// Lightweight fetch — no answers column. Use for progress/entitlements computation.
// Avoids downloading 85 answers × N exams on every authenticated request.
export async function getMockExamsMetaByUser(userId) {
  const rows = await sql`
    SELECT id, user_id,
           score::float8 AS score,
           total_questions::int AS total_questions,
           correct_answers::int AS correct_answers,
           time_taken_minutes::int AS time_taken_minutes,
           status, passed, domain_scores, created_at
    FROM mock_exams WHERE user_id = ${userId} ORDER BY created_at DESC
  `;
  return rows.map(r => ({
    ...r,
    domain_scores: parseJsonbField(r.domain_scores),
  }));
}

export async function getAllMockExamsMetaForAdmin() {
  const rows = await sql`
    SELECT id, user_id,
           score::float8 AS score,
           total_questions::int AS total_questions,
           correct_answers::int AS correct_answers,
           time_taken_minutes::int AS time_taken_minutes,
           status, passed, domain_scores, created_at
    FROM mock_exams
    ORDER BY created_at DESC
  `;
  return rows.map(row => ({
    ...row,
    domain_scores: parseJsonbField(row.domain_scores),
  }));
}

// Get answered question IDs from mock exams using SQL — avoids loading full answers in JS
export async function getMockAttemptIdsByUserDirect(userId) {
  const rows = await sql`
    SELECT DISTINCT elem->>'question_id' AS question_id
    FROM mock_exams,
         jsonb_array_elements(
           CASE WHEN jsonb_typeof(answers) = 'array' THEN answers ELSE '[]'::jsonb END
         ) AS elem
    WHERE user_id = ${userId}
      AND elem->>'question_id' IS NOT NULL
  `;
  return rows.map(r => r.question_id).filter(Boolean);
}

export async function createMockExam(exam) {
  const [row] = await sql`
    INSERT INTO mock_exams (id, user_id, created_at, score, total_questions, correct_answers,
      time_taken_minutes, status, passed, answers, domain_scores)
    VALUES (${exam.id}, ${exam.user_id}, ${exam.created_at}, ${exam.score},
      ${exam.total_questions}, ${exam.correct_answers}, ${exam.time_taken_minutes},
      ${exam.status}, ${exam.passed}, ${JSON.stringify(exam.answers)}::jsonb, ${JSON.stringify(exam.domain_scores)}::jsonb)
    RETURNING *
  `;
  return row;
}

export async function deleteMockExamsByUser(userId) {
  await sql`DELETE FROM mock_exams WHERE user_id = ${userId}`;
}

// ── Payments ──────────────────────────────────────────────────────────────────

function normalizePayment(row) {
  if (!row) return null;
  const metadata = typeof row.metadata === 'string'
    ? (() => { try { return JSON.parse(row.metadata); } catch { return {}; } })()
    : (row.metadata ?? {});

  return {
    ...row,
    amount: Number(row.amount ?? 0),
    metadata,
    plan: row.plan || metadata.plan || null,
    currency: row.currency || metadata.currency || 'USD',
    provider: row.provider || metadata.provider || null,
    provider_label:
      row.provider_label || metadata.provider_label || metadata.provider || null,
    stripe_session_id: row.stripe_session_id || metadata.stripe_session_id || null,
    stripe_customer_id: row.stripe_customer_id || metadata.stripe_customer_id || null,
    stripe_subscription_id:
      row.stripe_subscription_id || metadata.stripe_subscription_id || null,
    stripe_invoice_id: row.stripe_invoice_id || metadata.stripe_invoice_id || null,
  };
}

export async function getPaymentsByUser(userId) {
  const rows = await sql`SELECT * FROM payments WHERE user_id = ${userId} ORDER BY created_at DESC`;
  return rows.map(normalizePayment);
}

export async function getAllPayments() {
  const rows = await sql`SELECT * FROM payments ORDER BY created_at DESC`;
  return rows.map(normalizePayment);
}

export async function createPayment(payment) {
  const metadata = {
    ...(payment.metadata ?? {}),
    ...(payment.plan && !payment.metadata?.plan ? { plan: payment.plan } : {}),
    ...(payment.currency && !payment.metadata?.currency ? { currency: payment.currency } : {}),
    ...(payment.provider && !payment.metadata?.provider ? { provider: payment.provider } : {}),
    ...(payment.provider_label && !payment.metadata?.provider_label
      ? { provider_label: payment.provider_label }
      : {}),
    ...(payment.stripe_session_id && !payment.metadata?.stripe_session_id
      ? { stripe_session_id: payment.stripe_session_id }
      : {}),
    ...(payment.stripe_customer_id && !payment.metadata?.stripe_customer_id
      ? { stripe_customer_id: payment.stripe_customer_id }
      : {}),
    ...(payment.stripe_subscription_id && !payment.metadata?.stripe_subscription_id
      ? { stripe_subscription_id: payment.stripe_subscription_id }
      : {}),
    ...(payment.stripe_invoice_id && !payment.metadata?.stripe_invoice_id
      ? { stripe_invoice_id: payment.stripe_invoice_id }
      : {}),
  };
  const inserted = await sql`
    INSERT INTO payments (id, user_id, status, amount, payment_date, created_at, metadata)
    VALUES (${payment.id}, ${payment.user_id}, ${payment.status ?? null},
      ${Number(payment.amount ?? 0)}, ${payment.payment_date ?? null},
      ${payment.created_at}, ${JSON.stringify(metadata)})
    ON CONFLICT (id) DO NOTHING
    RETURNING id
  `;
  if (!inserted.length) {
    await sql`
      UPDATE payments
      SET status = ${payment.status ?? null},
          amount = ${Number(payment.amount ?? 0)},
          payment_date = ${payment.payment_date ?? null},
          metadata = ${JSON.stringify(metadata)}
      WHERE id = ${payment.id}
    `;
  }
  return {
    inserted: inserted.length > 0,
    payment: normalizePayment({ ...payment, metadata }),
  };
}

export async function deletePaymentsByUser(userId) {
  await sql`DELETE FROM payments WHERE user_id = ${userId}`;
}

// ── App Store Connect analytics ──────────────────────────────────────────────

async function ensureAppleAnalyticsTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS apple_analytics_rows (
      report_name TEXT NOT NULL,
      event_date DATE NOT NULL,
      dimension_hash TEXT NOT NULL,
      dimensions JSONB NOT NULL DEFAULT '{}',
      metrics JSONB NOT NULL DEFAULT '{}',
      processing_date DATE NOT NULL,
      source_instance_id TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (report_name, event_date, dimension_hash)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS apple_analytics_imports (
      instance_id TEXT PRIMARY KEY,
      report_name TEXT NOT NULL,
      processing_date DATE NOT NULL,
      row_count INTEGER NOT NULL DEFAULT 0,
      imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_apple_analytics_rows_event_date
    ON apple_analytics_rows(event_date DESC)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_apple_analytics_imports_processing_date
    ON apple_analytics_imports(processing_date DESC)
  `;
}

export async function getImportedAppleInstanceIds(since) {
  await ensureAppleAnalyticsTables();
  const rows = await sql`
    SELECT instance_id
    FROM apple_analytics_imports
    WHERE processing_date >= ${since}::date
    LIMIT 2000
  `;
  return new Set(rows.map(row => row.instance_id));
}

export async function upsertAppleAnalyticsRows(rows = []) {
  await ensureAppleAnalyticsTables();
  for (const row of rows) {
    await sql`
      INSERT INTO apple_analytics_rows
        (report_name, event_date, dimension_hash, dimensions, metrics,
         processing_date, source_instance_id, updated_at)
      VALUES
        (${row.report_name}, ${row.event_date}::date, ${row.dimension_hash},
         ${JSON.stringify(row.dimensions)}::jsonb, ${JSON.stringify(row.metrics)}::jsonb,
         ${row.processing_date}::date, ${row.source_instance_id}, ${row.updated_at}::timestamptz)
      ON CONFLICT (report_name, event_date, dimension_hash) DO UPDATE SET
        dimensions = EXCLUDED.dimensions,
        metrics = EXCLUDED.metrics,
        processing_date = EXCLUDED.processing_date,
        source_instance_id = EXCLUDED.source_instance_id,
        updated_at = EXCLUDED.updated_at
    `;
  }
}

export async function recordAppleAnalyticsImport({
  instanceId,
  reportName,
  processingDate,
  rowCount,
}) {
  await ensureAppleAnalyticsTables();
  await sql`
    INSERT INTO apple_analytics_imports
      (instance_id, report_name, processing_date, row_count)
    VALUES (${instanceId}, ${reportName}, ${processingDate}::date, ${rowCount})
    ON CONFLICT (instance_id) DO UPDATE SET
      report_name = EXCLUDED.report_name,
      processing_date = EXCLUDED.processing_date,
      row_count = EXCLUDED.row_count,
      imported_at = NOW()
  `;
}

export async function getAppleAnalyticsRows() {
  await ensureAppleAnalyticsTables();
  return sql`
    SELECT
      report_name,
      event_date::text,
      dimensions,
      metrics,
      processing_date::text
    FROM apple_analytics_rows
    ORDER BY event_date ASC
    LIMIT 20000
  `;
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
      .map(m => ({ id: m.id, role: m.role, content: m.content, created_at: m.created_at, ...(typeof m.extras === 'object' && m.extras !== null ? m.extras : {}) })),
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
    messages: msgs.map(m => ({ id: m.id, role: m.role, content: m.content, created_at: m.created_at, ...(typeof m.extras === 'object' && m.extras !== null ? m.extras : {}) })),
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
      ${msg.content}, ${msg.created_at}, ${JSON.stringify(extras)}::jsonb)
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

// Push tokens belonging to admin accounts (plus any explicitly allowlisted
// emails). Used to ping the owners' phones on subscription events.
export async function getAdminPushTokens(adminEmails = []) {
  const emails = adminEmails.map((e) => String(e).trim().toLowerCase()).filter(Boolean);
  const rows = await sql`
    SELECT pt.token
    FROM push_tokens pt
    JOIN users u ON u.id = pt.user_id
    WHERE u.role = 'admin'
       OR LOWER(u.email) = ANY(${emails})
  `;
  return [...new Set(rows.map((r) => r.token).filter(Boolean))];
}

export async function deletePushToken(userId) {
  await sql`DELETE FROM push_tokens WHERE user_id = ${userId}`;
}

export async function deletePushTokensByToken(tokens) {
  const uniqueTokens = [...new Set((tokens || []).filter(Boolean))];
  if (!uniqueTokens.length) return 0;
  const rows = await sql`
    DELETE FROM push_tokens
    WHERE token = ANY(${uniqueTokens})
    RETURNING token
  `;
  return rows.length;
}

export async function getAllPushTokens() {
  return sql`SELECT user_id, token, platform FROM push_tokens`;
}

// Returns push tokens enriched with per-user domain stats and last-study date.
// Used by the personalized daily-reminder cron to craft per-user messages.
// One query: joins push_tokens → attempts, aggregates domain accuracy + last attempt date.
export async function getPushTokensWithUserStats() {
  // Step 1: get all tokens with user_ids
  const tokens = await sql`SELECT user_id, token FROM push_tokens`;
  if (!tokens.length) return [];

  const userIds = tokens.map(t => t.user_id);

  // Step 2: for each user, get per-domain correct/total counts + last attempt date
  const rows = await sql`
    SELECT
      user_id,
      topic,
      COUNT(*)::int                                          AS total,
      SUM(CASE WHEN is_correct THEN 1 ELSE 0 END)::int      AS correct,
      MAX(created_at)                                        AS last_at
    FROM attempts
    WHERE user_id = ANY(${userIds})
      AND topic IS NOT NULL
    GROUP BY user_id, topic
  `;

  // Step 3: group by user
  const statsMap = {};
  for (const row of rows) {
    if (!statsMap[row.user_id]) {
      statsMap[row.user_id] = { domains: {}, lastAt: null };
    }
    const pct = row.total >= 5
      ? Math.round((row.correct / row.total) * 100)
      : null; // not enough data
    statsMap[row.user_id].domains[row.topic] = { pct, total: row.total };
    const d = new Date(row.last_at);
    if (!statsMap[row.user_id].lastAt || d > statsMap[row.user_id].lastAt) {
      statsMap[row.user_id].lastAt = d;
    }
  }

  return tokens.map(({ user_id, token }) => ({
    user_id,
    token,
    stats: statsMap[user_id] ?? null,
  }));
}

// Returns aggregate attempt stats per question_id for a given user.
// Powers the "You've seen this X times" hint in PracticeScreen.
export async function getQuestionStatsByUser(userId) {
  const rows = await sql`
    SELECT
      question_id,
      COUNT(*)::int                                        AS total,
      SUM(CASE WHEN is_correct THEN 1 ELSE 0 END)::int    AS correct
    FROM attempts
    WHERE user_id = ${userId}
      AND question_id IS NOT NULL
    GROUP BY question_id
  `;
  // Returns object: { [question_id]: { total, correct, wrong } }
  const map = {};
  for (const r of rows) {
    map[r.question_id] = { total: r.total, correct: r.correct, wrong: r.total - r.correct };
  }
  return map;
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

// ── Email verification ────────────────────────────────────────────────────────

export async function getUserByVerificationToken(token) {
  const rows = await sql`SELECT * FROM users WHERE email_verification_token = ${token} LIMIT 1`;
  return rows[0] ?? null;
}

export async function setEmailVerified(userId) {
  const [row] = await sql`
    UPDATE users SET email_verified = true, email_verification_token = NULL
    WHERE id = ${userId} RETURNING *
  `;
  return row;
}
