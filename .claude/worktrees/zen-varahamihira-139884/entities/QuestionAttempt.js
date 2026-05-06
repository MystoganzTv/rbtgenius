export default class QuestionAttempt {
  constructor(data = {}) {
    this.question_id = data.question_id ?? "";
    this.selected_answer = data.selected_answer ?? "";
    this.is_correct = data.is_correct ?? false;
    this.topic = data.topic ?? "measurement";
    this.time_spent_seconds = data.time_spent_seconds ?? 0;
  }
}
