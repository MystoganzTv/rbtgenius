/**
 * OpenAI Chat Completions client for the AI Tutor.
 *
 * Uses the global fetch API (Node 22+ has it built in) to avoid pulling in
 * the `openai` SDK as a dependency — keeps the server bundle small.
 *
 * Two entry points:
 *   - createTutorReplyOpenAI(...)        → non-streaming, returns full text
 *   - streamTutorReplyOpenAI(...)        → async generator yielding text chunks
 */

import { buildSystemMessages, buildUserContext, PROMPT_VERSION } from "./tutor-prompt.js";

const DEFAULT_MODEL = "gpt-4o-mini";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MAX_HISTORY_MESSAGES = 20; // keep last 20 turns to bound cost
const MAX_OUTPUT_TOKENS = 800;   // ~600 words; plenty for a tutor reply

export function isOpenAIConfigured(env = process.env) {
  return Boolean(env.OPENAI_API_KEY);
}

function getModel(env = process.env) {
  return env.OPENAI_TUTOR_MODEL || DEFAULT_MODEL;
}

function trimHistory(history = []) {
  const sanitized = history
    .filter((message) => message && (message.role === "user" || message.role === "assistant"))
    .map((message) => ({
      role: message.role,
      content: String(message.content || ""),
    }));

  return sanitized.slice(-MAX_HISTORY_MESSAGES);
}

function buildPayload({ content, history, userContext, stream }) {
  return {
    model: getModel(),
    stream,
    max_tokens: MAX_OUTPUT_TOKENS,
    temperature: 0.4, // lower than chat-default — we want consistency, not creativity
    messages: [
      ...buildSystemMessages({ userContext }),
      ...trimHistory(history),
      { role: "user", content: String(content || "") },
    ],
    user: undefined, // could pass req.currentUser.id for OpenAI abuse tracking; opt-in later
  };
}

async function callOpenAI(payload, env = process.env) {
  if (!isOpenAIConfigured(env)) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`OpenAI request failed: ${response.status} ${errorText.slice(0, 200)}`);
  }

  return response;
}

/**
 * Non-streaming. Returns { content, prompt_version, model } so we can log it.
 */
export async function createTutorReplyOpenAI({ content, history, progress, recentMissedTopic } = {}) {
  const userContext = buildUserContext({ progress, recentMissedTopic });
  const response = await callOpenAI(buildPayload({
    content, history, userContext, stream: false,
  }));

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content || "";

  return {
    content: text.trim(),
    prompt_version: PROMPT_VERSION,
    model: getModel(),
  };
}

/**
 * Streaming. Returns an async iterator yielding small text chunks as they
 * arrive from OpenAI's SSE stream. Caller is responsible for forwarding to
 * the browser (via SSE on the Express side, or ReadableStream on Netlify).
 *
 * Usage:
 *   for await (const chunk of streamTutorReplyOpenAI({...})) {
 *     // chunk is { delta: "...", done: false }
 *   }
 *   // final yield is { delta: "", done: true, fullContent: "...complete..." }
 */
export async function* streamTutorReplyOpenAI({ content, history, progress, recentMissedTopic } = {}) {
  const userContext = buildUserContext({ progress, recentMissedTopic });
  const response = await callOpenAI(buildPayload({
    content, history, userContext, stream: true,
  }));

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullContent = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // OpenAI streams Server-Sent Events: each event is "data: {json}\n\n",
      // with a final "data: [DONE]\n\n" sentinel.
      const events = buffer.split("\n\n");
      buffer = events.pop() || ""; // last fragment may be incomplete

      for (const event of events) {
        const line = event.trim();
        if (!line.startsWith("data:")) continue;

        const payload = line.slice(5).trim();
        if (payload === "[DONE]") continue;

        try {
          const parsed = JSON.parse(payload);
          const delta = parsed?.choices?.[0]?.delta?.content || "";
          if (delta) {
            fullContent += delta;
            yield { delta, done: false };
          }
        } catch {
          // Skip malformed chunks rather than crashing the stream.
        }
      }
    }
  } finally {
    reader.releaseLock?.();
  }

  yield {
    delta: "",
    done: true,
    fullContent: fullContent.trim(),
    prompt_version: PROMPT_VERSION,
    model: getModel(),
  };
}
