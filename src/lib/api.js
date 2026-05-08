function getAuthToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    window.localStorage.getItem("rbt_genius_auth_token") ||
    window.localStorage.getItem("access_token")
  );
}

function writeAuthToken(token) {
  if (typeof window === "undefined" || !token) {
    return;
  }

  window.localStorage.setItem("rbt_genius_auth_token", token);
  window.localStorage.setItem("access_token", token);
}

async function request(path, options = {}) {
  const { headers = {}, body, token: tokenOverride, ...restOptions } = options;
  const token = tokenOverride || getAuthToken();
  const response = await fetch(path, {
    ...restOptions,
    headers: {
      "Content-Type": "application/json",
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const rotatedToken = response.headers.get("X-New-Auth-Token");
  if (rotatedToken) {
    writeAuthToken(rotatedToken);
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const error = new Error(data?.message || response.statusText || "Request failed");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

function createQuery(params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export const api = {
  getPublicSettings() {
    return request("/api/public-settings");
  },
  getAuthProviders(options = {}) {
    return request("/api/auth/providers", options);
  },
  register(payload) {
    return request("/api/auth/register", {
      method: "POST",
      body: payload,
    });
  },
  login(payload) {
    return request("/api/auth/login", {
      method: "POST",
      body: payload,
    });
  },
  getMe(token) {
    return request("/api/auth/me", token ? { token } : {});
  },
  logout() {
    return request("/api/auth/logout", { method: "POST" });
  },
  getOAuthStartUrl(provider, redirectTo = "/") {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `/api/auth/oauth/${provider}/start${createQuery({ redirectTo, origin })}`;
  },
  listQuestions(params) {
    return request(`/api/questions${createQuery(params)}`);
  },
  getPracticeSession() {
    return request("/api/practice/session");
  },
  savePracticeSession(session) {
    return request("/api/practice/session", {
      method: "PUT",
      body: session,
    });
  },
  clearPracticeSession() {
    return request("/api/practice/session", { method: "DELETE" });
  },
  listAttempts() {
    return request("/api/question-attempts");
  },
  createAttempt(payload) {
    return request("/api/question-attempts", {
      method: "POST",
      body: payload,
    });
  },
  listMockExams() {
    return request("/api/mock-exams");
  },
  createMockExam(payload) {
    return request("/api/mock-exams", {
      method: "POST",
      body: payload,
    });
  },
  getDashboard() {
    return request("/api/dashboard");
  },
  getAnalytics() {
    return request("/api/analytics");
  },
  getProfile() {
    return request("/api/profile");
  },
  updateProfile(payload) {
    return request("/api/profile", {
      method: "PATCH",
      body: payload,
    });
  },
  resetProfileProgress(payload) {
    return request("/api/profile/reset-progress", {
      method: "POST",
      body: payload,
    });
  },
  setPassword(payload) {
    return request("/api/profile/password", { method: "PATCH", body: payload });
  },
  createCheckoutSession(plan, origin) {
    return request("/api/billing/checkout", {
      method: "POST",
      body: {
        plan,
        origin:
          origin || (typeof window !== "undefined" ? window.location.origin : undefined),
      },
    });
  },
  confirmCheckout(sessionId) {
    return request("/api/billing/confirm", {
      method: "POST",
      body: { session_id: sessionId },
    });
  },
  createBillingPortal(origin) {
    return request("/api/billing/portal", {
      method: "POST",
      body: {
        origin:
          origin || (typeof window !== "undefined" ? window.location.origin : undefined),
      },
    });
  },
  listAdminMembers() {
    return request("/api/admin/members");
  },
  getAdminMetrics() {
    return request("/api/admin/metrics");
  },
  sendMemberEmail(memberId, payload) {
    return request(`/api/admin/members/${memberId}/email`, { method: "POST", body: payload });
  },
  getAdminMemberPayments(memberId) {
    return request(`/api/admin/members/${memberId}/payments`);
  },
  updateAdminMember(memberId, payload) {
    return request(`/api/admin/members/${memberId}`, {
      method: "PATCH",
      body: payload,
    });
  },
  deleteAdminMember(memberId) {
    return request(`/api/admin/members/${memberId}`, {
      method: "DELETE",
    });
  },
  listTutorConversations() {
    return request("/api/ai-tutor/conversations");
  },
  createTutorConversation(payload) {
    return request("/api/ai-tutor/conversations", {
      method: "POST",
      body: payload,
    });
  },
  sendTutorMessage(conversationId, payload) {
    return request(`/api/ai-tutor/conversations/${conversationId}/messages`, {
      method: "POST",
      body: payload,
    });
  },
  /**
   * Streams a tutor reply via SSE.
   *
   * Calls onDelta(text) as tokens arrive, onDone({ message, entitlements })
   * once the LLM finishes, and onError(message) on any failure. Returns a
   * promise that resolves when the stream closes.
   *
   * Falls back to the non-streaming endpoint automatically when the server
   * responds 503 with code "openai_not_configured".
   */
  async streamTutorMessage(conversationId, payload, { onDelta, onDone, onError } = {}) {
    const token = getAuthToken();
    const response = await fetch(
      `/api/ai-tutor/conversations/${conversationId}/messages/stream`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      },
    );

    if (response.status === 503) {
      const fallbackPayload = await response.json().catch(() => ({}));
      if (fallbackPayload?.code === "openai_not_configured") {
        const result = await api.sendTutorMessage(conversationId, payload);
        const lastMessage = result?.conversation?.messages?.slice(-1)?.[0];
        if (lastMessage?.content) {
          onDelta?.(lastMessage.content);
        }
        onDone?.({ message: lastMessage, entitlements: result?.entitlements });
        return;
      }
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const error = new Error(errorBody?.message || "Stream request failed");
      error.status = response.status;
      error.data = errorBody;
      throw error;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by blank lines.
      const events = buffer.split("\n\n");
      buffer = events.pop() || "";

      for (const event of events) {
        const lines = event.split("\n");
        const eventName = lines.find((line) => line.startsWith("event:"))?.slice(6).trim();
        const dataLine = lines.find((line) => line.startsWith("data:"))?.slice(5).trim();

        if (!dataLine) continue;

        let data;
        try {
          data = JSON.parse(dataLine);
        } catch {
          continue;
        }

        if (eventName === "delta") {
          onDelta?.(data.content || "");
        } else if (eventName === "done") {
          onDone?.(data);
        } else if (eventName === "error") {
          onError?.(data.message || "Tutor stream error");
        }
      }
    }
  },
};
