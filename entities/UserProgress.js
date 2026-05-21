export default class UserProgress {
  constructor(data = {}) {
    this.total_questions_completed = data.total_questions_completed ?? 0;
    this.total_correct = data.total_correct ?? 0;
    this.study_streak_days = data.study_streak_days ?? 0;
    this.last_study_date = data.last_study_date ?? null;
    this.study_hours = data.study_hours ?? 0;
    this.readiness_score = data.readiness_score ?? 0;
    this.badges = Array.isArray(data.badges) ? data.badges : [];
    this.plan = data.plan ?? "free";
    this.domain_mastery = data.domain_mastery ?? {};
    this.questions_today = data.questions_today ?? 0;
    this.last_question_date = data.last_question_date ?? null;
  }
}
