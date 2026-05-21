export default class MockExam {
  constructor(data = {}) {
    this.score = data.score ?? 0;
    this.total_questions = data.total_questions ?? 85;
    this.correct_answers = data.correct_answers ?? 0;
    this.time_taken_minutes = data.time_taken_minutes ?? 0;
    this.status = data.status ?? "in_progress";
    this.answers = Array.isArray(data.answers)
      ? data.answers.map((answer) => ({
          question_id: answer.question_id ?? "",
          selected_answer: answer.selected_answer ?? "",
          is_correct: answer.is_correct ?? false,
        }))
      : [];
    this.domain_scores = data.domain_scores ?? {};
    this.passed = data.passed ?? false;
  }
}
