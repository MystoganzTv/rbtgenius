export default class Question {
  constructor(data = {}) {
    this.text = data.text ?? "";
    this.options = Array.isArray(data.options)
      ? data.options.map((option) => ({
          label: option.label ?? "",
          text: option.text ?? "",
        }))
      : [];
    this.correct_answer = data.correct_answer ?? "";
    this.explanation = data.explanation ?? "";
    this.topic = data.topic ?? "measurement";
    this.difficulty = data.difficulty ?? "beginner";
    this.bacb_concept = data.bacb_concept ?? "";
    this.study_file_id = data.study_file_id ?? "";
  }
}
