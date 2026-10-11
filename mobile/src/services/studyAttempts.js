export function createAttemptId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}
export async function postStudyAttempt(token, payload) {
  const response = await fetch('https://www.rbtgenius.com/api/question-attempts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || 'Unable to save answer');
    error.status = response.status;
    throw error;
  }
  return data;
}
