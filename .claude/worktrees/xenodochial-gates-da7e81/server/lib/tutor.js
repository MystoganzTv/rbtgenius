import {
  createTutorReplyOpenAI,
  isOpenAIConfigured,
  streamTutorReplyOpenAI,
} from "./tutor-openai.js";

function hasAny(text, patterns) {
  return patterns.some((pattern) => text.includes(pattern));
}

function hashText(value) {
  return Array.from(String(value || "")).reduce(
    (total, char) => total + char.charCodeAt(0),
    0,
  );
}

function pickBySeed(items, seed = 0) {
  if (!Array.isArray(items) || items.length === 0) {
    return "";
  }

  return items[Math.abs(seed) % items.length];
}

function uniqueItems(items) {
  return [...new Set(items.filter(Boolean))];
}

function formatTopicLead(topic, variant = "Continuing with") {
  return topic ? `*${variant} ${topic.title}*` : "";
}

function isAffirmative(text) {
  return hasAny(normalizeForMatch(text), [
    "yes",
    "yeah",
    "yep",
    "sure",
    "ok",
    "okay",
    "do it",
    "go ahead",
    "lets do it",
    "let s do it",
    "si",
    "claro",
    "dale",
    "hazlo",
  ]);
}

function isNegative(text) {
  return hasAny(normalizeForMatch(text), [
    "no",
    "nope",
    "not now",
    "later",
    "skip",
    "ahora no",
    "luego",
  ]);
}

function normalizeForMatch(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stemWord(word) {
  if (word.endsWith("ies") && word.length > 4) {
    return `${word.slice(0, -3)}y`;
  }

  if (word.endsWith("es") && word.length > 4) {
    return word.slice(0, -2);
  }

  if (word.endsWith("s") && word.length > 3) {
    return word.slice(0, -1);
  }

  return word;
}

function tokenMatches(left, right) {
  const a = stemWord(normalizeForMatch(left));
  const b = stemWord(normalizeForMatch(right));

  if (!a || !b) {
    return false;
  }

  return a === b || a.startsWith(b.slice(0, 4)) || b.startsWith(a.slice(0, 4));
}

function extractWords(value) {
  return normalizeForMatch(value)
    .split(" ")
    .filter((word) => word.length >= 3);
}

function buildQuizMetadata(topic, question) {
  return {
    topicId: topic.id,
    prompt: question.prompt,
    answer: question.answer,
    rationale: question.rationale,
    keywords: question.keywords || [],
  };
}

function findPendingQuiz(history) {
  const lastMessage = [...(history || [])].slice(-1)[0];
  if (lastMessage?.role === "assistant" && lastMessage?.quiz) {
    return lastMessage.quiz;
  }

  return null;
}

function findPendingFollowUp(history) {
  const lastMessage = [...(history || [])].slice(-1)[0];
  if (lastMessage?.role === "assistant" && lastMessage?.follow_up) {
    return lastMessage.follow_up;
  }

  return null;
}

function evaluateQuizAnswer(response, quiz) {
  const normalizedResponse = normalizeForMatch(response);
  const normalizedAnswer = normalizeForMatch(quiz.answer);

  if (!normalizedResponse) {
    return { score: 0, verdict: "empty" };
  }

  if (
    normalizedResponse === normalizedAnswer ||
    normalizedResponse.includes(normalizedAnswer) ||
    normalizedAnswer.includes(normalizedResponse)
  ) {
    return { score: 1, verdict: "correct" };
  }

  const responseWords = extractWords(response).map(stemWord);
  const keywordHits = (quiz.keywords || []).filter((keyword) =>
    responseWords.some((word) => tokenMatches(word, keyword)),
  ).length;
  const keywordScore =
    quiz.keywords?.length > 0 ? keywordHits / quiz.keywords.length : 0;

  const answerWords = extractWords(quiz.answer).map(stemWord);
  const answerHits = answerWords.filter((word) =>
    responseWords.some((responseWord) => tokenMatches(responseWord, word)),
  ).length;
  const answerScore = answerWords.length > 0 ? answerHits / answerWords.length : 0;

  const score = Math.max(keywordScore, answerScore);

  if (score >= 0.8) {
    return { score, verdict: "correct" };
  }

  if (score >= 0.4) {
    return { score, verdict: "partial" };
  }

  return { score, verdict: "incorrect" };
}

function formatQuizEvaluation(userText, quiz, topic) {
  const normalized = normalizeForMatch(userText);

  if (hasAny(normalized, ["hint", "clue", "pista", "ayuda"])) {
    return {
      content: [
        formatTopicLead(topic, "Still on"),
        "**Hint**",
        "",
        `Look for the key idea behind this question: ${quiz.rationale}`,
        "",
        "Take another shot, or say `I don't know` and I will show the answer.",
      ]
        .filter(Boolean)
        .join("\n"),
    };
  }

  if (hasAny(normalized, ["i dont know", "i don't know", "dont know", "don't know", "idk", "skip", "no se", "no sé", "paso"])) {
    return {
      content: [
        formatTopicLead(topic, "Still on"),
        "**No problem. Here is the answer**",
        "",
        `**Correct answer**: ${quiz.answer}`,
        "",
        `**Why**: ${quiz.rationale}`,
        "",
        "Say `next question` if you want another one on this same topic.",
      ]
        .filter(Boolean)
        .join("\n"),
    };
  }

  const evaluation = evaluateQuizAnswer(userText, quiz);

  if (evaluation.verdict === "correct") {
    return {
      content: [
        formatTopicLead(topic, "Nice"),
        "**Correct**",
        "",
        `Your answer matches the core idea: **${quiz.answer}**.`,
        "",
        `**Why**: ${quiz.rationale}`,
        "",
        "Say `next question` if you want another one on this topic, or `harder` if you want a tougher version.",
      ]
        .filter(Boolean)
        .join("\n"),
    };
  }

  if (evaluation.verdict === "partial") {
    return {
      content: [
        formatTopicLead(topic, "Almost there on"),
        "**Close, but tighten it up**",
        "",
        `**Best answer**: ${quiz.answer}`,
        "",
        `**Why**: ${quiz.rationale}`,
        "",
        "Try answering again in your own words, or say `next question` if you want to keep moving.",
      ]
        .filter(Boolean)
        .join("\n"),
    };
  }

  return {
    content: [
      formatTopicLead(topic, "Let's correct"),
      "**Not quite**",
      "",
      `**Best answer**: ${quiz.answer}`,
      "",
      `**Why**: ${quiz.rationale}`,
      "",
      "If you want, say `next question` for another one or `give me an example` to review the concept again.",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

const TOPICS = [
  {
    id: "positive_reinforcement",
    title: "Positive Reinforcement",
    aliases: ["positive reinforcement", "reinforcement", "reward", "refuerzo positivo", "reforzamiento positivo"],
    summaries: [
      "Positive reinforcement means adding something valuable right after a behavior so that the behavior is more likely to happen again.",
      "In ABA, positive reinforcement happens when a behavior is followed by something preferred and that behavior increases later.",
    ],
    whyItMatters: [
      "it is one of the most tested ABA principles and shows up constantly in RBT-style questions",
      "many exam questions hide it inside scenarios, so recognizing the future increase in behavior is key",
    ],
    examples: [
      "a learner answers correctly, then receives praise or access to a preferred item",
      "a child asks for a break appropriately and gets a short break, so that communication response happens more often next time",
    ],
    examTips: [
      "if the question asks whether behavior increases in the future, positive reinforcement is often the target concept",
      "ignore whether the consequence sounds pleasant and ask what happened to the future behavior afterward",
    ],
    quizzes: [
      {
        prompt: "A learner labels a picture correctly and immediately gets praise and a token. What principle is most likely occurring if correct labeling increases later?",
        answer: "Positive reinforcement",
        rationale: "A valued consequence was added after the response and the response increased in the future.",
        keywords: ["positive", "reinforcement"],
      },
      {
        prompt: "What is the single best sign that positive reinforcement occurred?",
        answer: "The behavior becomes more likely in the future",
        rationale: "The defining feature of reinforcement is an increase in future behavior.",
        keywords: ["increase", "future", "behavior"],
      },
      {
        prompt: "Why is praise alone not enough to prove reinforcement happened?",
        answer: "Because you still have to see whether the behavior increases later",
        rationale: "The label depends on the future effect on behavior, not just the consequence delivered.",
        keywords: ["behavior", "increases", "later"],
      },
    ],
  },
  {
    id: "prompting",
    title: "Prompting and Prompt Fading",
    aliases: ["prompting", "prompt hierarchy", "least to most", "most to least", "prompt fading", "ayudas", "jerarquia de ayudas", "desvanecimiento de ayudas"],
    summaries: [
      "Prompts are extra cues that help the learner respond correctly, and prompt fading reduces that help over time.",
      "Prompting supports correct responding in the moment, while fading helps transfer control to the natural cue.",
    ],
    whyItMatters: [
      "the goal is not just a correct response today, but independent responding later",
      "many exam items test whether staff are preventing prompt dependence or creating it",
    ],
    examples: [
      "you start with a gesture prompt, then fade it so the learner responds to the natural cue alone",
      "a technician uses a model prompt to teach toothbrushing, then gradually removes that support as the learner improves",
    ],
    examTips: [
      "if the question asks about preventing prompt dependence, think prompt fading and transfer of stimulus control",
      "most-to-least helps with error reduction, while least-to-most often gives the learner a chance to respond more independently first",
    ],
    quizzes: [
      {
        prompt: "What is the main purpose of prompt fading?",
        answer: "To transfer control to the natural cue and build independence",
        rationale: "Fading is about reducing extra help so the learner responds independently.",
        keywords: ["transfer", "control", "independence"],
      },
      {
        prompt: "Which arrangement is more consistent with least-to-most prompting?",
        answer: "Start with the smallest amount of help and increase only if needed",
        rationale: "Least-to-most gives the learner an initial chance to respond with less assistance.",
        keywords: ["smallest", "help", "increase"],
      },
      {
        prompt: "If a learner waits for help every trial, what risk should you think about first?",
        answer: "Prompt dependence",
        rationale: "Overreliance on prompts can block independent responding.",
        keywords: ["prompt", "dependence"],
      },
    ],
  },
  {
    id: "data_collection",
    title: "Data Collection",
    aliases: ["data collection", "taking data", "recording data", "collecting data", "toma de datos", "recoleccion de datos", "registrar datos"],
    summaries: [
      "Data collection means recording behavior or skill performance accurately and consistently according to the treatment plan.",
      "Good data tells the team what is improving, what is not, and whether the intervention should stay the same or change.",
    ],
    whyItMatters: [
      "supervisors rely on clean data to judge progress and make treatment decisions",
      "RBT exam questions often treat objective, consistent data as the safest professional answer",
    ],
    examples: [
      "tracking frequency of aggression or percentage of independent correct responses",
      "recording duration of tantrums across sessions to see whether the behavior is decreasing over time",
    ],
    examTips: [
      "when the safest answer talks about objectivity, consistency, or treatment decisions, data collection is usually central",
      "if an option relies on memory instead of immediate recording, it is usually weaker",
    ],
    quizzes: [
      {
        prompt: "Why does the treatment team need accurate data from the RBT?",
        answer: "To evaluate progress and make sound treatment decisions",
        rationale: "Data drives whether goals, procedures, or supports need to change.",
        keywords: ["progress", "treatment", "decisions"],
      },
      {
        prompt: "Which is usually stronger: objective written data or memory-based impressions after session?",
        answer: "Objective written data",
        rationale: "Objective recording reduces bias and improves consistency.",
        keywords: ["objective", "written", "data"],
      },
      {
        prompt: "If two staff collect data differently on the same target, what problem should you suspect?",
        answer: "Poor measurement consistency",
        rationale: "Inconsistent data makes progress harder to interpret.",
        keywords: ["measurement", "consistency"],
      },
    ],
  },
  {
    id: "fba",
    title: "Functional Behavior Assessment",
    aliases: ["functional behavior assessment", "fba", "function of behavior", "abc data", "evaluacion funcional de la conducta", "funcion de la conducta", "datos abc"],
    summaries: [
      "A functional behavior assessment identifies why a behavior happens by looking at antecedents, behavior, and consequences.",
      "FBA is about finding the behavior's likely function so the intervention matches what is maintaining it.",
    ],
    whyItMatters: [
      "interventions are stronger when they match the real function of the behavior",
      "exam questions often expect you to gather more ABC data before jumping to an intervention",
    ],
    examples: [
      "if aggression usually leads to escape from tasks, the behavior may be maintained by escape",
      "if a learner screams and adults consistently rush over with comfort, the behavior may be maintained by attention",
    ],
    examTips: [
      "before choosing an intervention, exam questions often expect you to identify function or gather more ABC data first",
      "when a scenario highlights what happens right before and after behavior, think ABC and function",
    ],
    quizzes: [
      {
        prompt: "What is the main goal of an FBA?",
        answer: "To identify the variables maintaining the behavior",
        rationale: "FBA helps explain why the behavior is happening so treatment can be matched to function.",
        keywords: ["identify", "variables", "behavior"],
      },
      {
        prompt: "If a learner hits when tasks are presented and the task is removed, what possible function should you consider first?",
        answer: "Escape",
        rationale: "The behavior appears to produce removal of a demand.",
        keywords: ["escape"],
      },
      {
        prompt: "What should come before choosing a replacement behavior plan in many exam scenarios?",
        answer: "A clearer understanding of the behavior's function",
        rationale: "Interventions are usually stronger when they align with function.",
        keywords: ["function", "behavior"],
      },
    ],
  },
  {
    id: "task_analysis",
    title: "Task Analysis and Chaining",
    aliases: ["task analysis", "chaining", "forward chaining", "backward chaining", "analisis de tareas", "encadenamiento"],
    summaries: [
      "A task analysis breaks a skill into smaller teachable steps, and chaining teaches those steps in sequence.",
      "Complex routines become more teachable when each step is defined clearly and reinforced systematically.",
    ],
    whyItMatters: [
      "it makes complex skills easier to teach, monitor, and reinforce",
      "exam questions often use daily living skills and routines to test this concept",
    ],
    examples: [
      "washing hands can be broken into turning on water, wetting hands, adding soap, scrubbing, rinsing, and drying",
      "making a snack can be taught step by step, reinforcing each part according to the chaining plan",
    ],
    examTips: [
      "if the question focuses on step-by-step teaching of a routine, think task analysis first",
      "forward chaining starts with the first step, while backward chaining ends with the learner completing the final step first",
    ],
    quizzes: [
      {
        prompt: "What is the purpose of a task analysis?",
        answer: "To break a complex skill into smaller teachable steps",
        rationale: "Task analysis makes instruction clearer and easier to monitor.",
        keywords: ["break", "skill", "steps"],
      },
      {
        prompt: "Which chaining approach commonly lets the learner contact the natural reinforcer at the end of every teaching trial?",
        answer: "Backward chaining",
        rationale: "The learner completes the last step and immediately contacts the finished outcome.",
        keywords: ["backward", "chaining"],
      },
      {
        prompt: "If a routine is too complex to teach all at once, what should you think of first?",
        answer: "Task analysis",
        rationale: "It organizes the routine into teachable components.",
        keywords: ["task", "analysis"],
      },
    ],
  },
  {
    id: "ethics",
    title: "Ethics and Professional Conduct",
    aliases: ["ethics", "professional conduct", "supervisor", "scope of competence", "confidentiality", "etica", "conducta profesional", "confidencialidad"],
    summaries: [
      "RBTs should stay within their role, protect confidentiality, follow the treatment plan, and contact the supervisor when a situation exceeds their authority.",
      "Professional conduct in ABA is usually about safety, boundaries, documentation, and asking for supervision when needed.",
    ],
    whyItMatters: [
      "ethics questions often reward the safest, most role-appropriate action",
      "many exam items are really about whether the RBT stays within scope and documents appropriately",
    ],
    examples: [
      "if a caregiver asks you to change the program, the safest move is usually to document and consult the supervisor",
      "if a peer asks for private client details, protecting confidentiality is the correct priority",
    ],
    examTips: [
      "when two answers seem possible, the more role-appropriate and supervised one is usually stronger",
      "if a situation feels outside your role, involve the supervisor instead of improvising treatment changes",
    ],
    quizzes: [
      {
        prompt: "What is often the safest first step if a caregiver asks an RBT to change a treatment procedure on the spot?",
        answer: "Consult the supervisor and follow the existing plan until guidance is given",
        rationale: "RBTs should stay within role and not independently change treatment.",
        keywords: ["supervisor", "plan", "guidance"],
      },
      {
        prompt: "Which matters more in an ethics scenario: personal preference or role-appropriate action?",
        answer: "Role-appropriate action",
        rationale: "Professional conduct is grounded in boundaries, supervision, and client welfare.",
        keywords: ["role", "appropriate", "action"],
      },
      {
        prompt: "If a request falls outside your competence or authorization, what should you do?",
        answer: "Seek supervisor guidance",
        rationale: "That protects the client and keeps practice within scope.",
        keywords: ["supervisor", "guidance"],
      },
    ],
  },
];

function getTopicById(topicId) {
  return TOPICS.find((topic) => topic.id === topicId) || null;
}

function findTopicFromText(text) {
  const normalized = String(text || "").toLowerCase();
  return (
    TOPICS.find((topic) =>
      topic.aliases.some((alias) => normalized.includes(alias.toLowerCase())),
    ) || null
  );
}

function inferTopicFromHistory(history) {
  const recentTexts = [...(history || [])]
    .slice(-8)
    .reverse()
    .map((message) => String(message?.content || ""));

  for (const text of recentTexts) {
    const topic = findTopicFromText(text);
    if (topic) {
      return topic;
    }
  }

  return null;
}

function formatConceptReply(topic, seed, intro = "") {
  const summary = pickBySeed(topic.summaries, seed);
  const whyItMatters = pickBySeed(topic.whyItMatters, seed + 1);
  const example = pickBySeed(topic.examples, seed + 2);
  const examTip = pickBySeed(topic.examTips, seed + 3);

  return [
    intro || formatTopicLead(topic),
    `**${topic.title}**`,
    "",
    summary,
    "",
    `**Why it matters**: ${whyItMatters}`,
    "",
    `**Example**: ${example}`,
    "",
    `**Exam tip**: ${examTip}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function formatExampleReply(topic, seed, intro = "") {
  const example = pickBySeed(topic.examples, seed);
  const examTip = pickBySeed(topic.examTips, seed + 1);

  return [
    intro || formatTopicLead(topic),
    `**${topic.title}: quick example**`,
    "",
    example,
    "",
    `**What to notice**: ${examTip}`,
    "",
    "If you want, I can turn this into an exam-style scenario, a wrong-answer breakdown, or a one-question check.",
  ]
    .filter(Boolean)
    .join("\n");
}

function formatQuizReply(topic, seed, options = {}) {
  const count = options.count || 3;
  const revealAnswers = options.revealAnswers ?? true;
  const intro = options.intro || "";
  const rotated = topic.quizzes
    .map((item, index) => ({ item, score: (seed + index) % topic.quizzes.length }))
    .sort((left, right) => left.score - right.score)
    .slice(0, count)
    .map(({ item }) => item);

  const lines = [
    intro || formatTopicLead(topic),
    `**Quick check: ${topic.title}**`,
    "",
  ].filter(Boolean);

  rotated.forEach((question, index) => {
    lines.push(`${index + 1}. ${question.prompt}`);
    if (revealAnswers) {
      lines.push("");
      lines.push(`   **Answer**: ${question.answer}`);
      lines.push("");
      lines.push(`   **Why**: ${question.rationale}`);
    }
    lines.push("");
  });

  lines.push(
    revealAnswers
      ? "If you want, I can make the next round harder or quiz you one question at a time without showing the answer first."
      : "Reply with your answers and I will grade them one by one.",
  );

  const content = lines.join("\n");
  const quiz = !revealAnswers && rotated[0] ? buildQuizMetadata(topic, rotated[0]) : null;
  const followUp = revealAnswers
    ? {
        type: "quiz_review",
        topicId: topic.id,
        defaultAction: "one_question_at_a_time",
      }
    : null;

  return { content, quiz, followUp };
}

function formatStudyPlan(activeTopic, seed) {
  const topicLabel = activeTopic?.title || "your weakest RBT domains";
  const firstFocus = activeTopic
    ? `Review **${topicLabel}** for 15 to 20 minutes and rewrite the concept in your own words.`
    : "Review one weak domain for 15 to 20 minutes and rewrite the concept in your own words.";

  const secondFocus = activeTopic
    ? `Do 8 to 10 questions specifically on **${topicLabel}**.`
    : "Do 10 to 15 mixed RBT practice questions.";

  const closer = pickBySeed(
    [
      "Finish with one short quiz or flashcard round so you end with active recall.",
      "Close the session by teaching the concept out loud as if you were explaining it to a parent or supervisee.",
    ],
    seed,
  );

  return [
    activeTopic ? formatTopicLead(activeTopic, "Focus area:") : "",
    `**Study plan for ${topicLabel}**`,
    "",
    `1. ${firstFocus}`,
    `2. ${secondFocus}`,
    "3. Review every missed item by asking what concept was actually being tested.",
    "4. Ask the tutor for one harder scenario on the same topic.",
    `5. ${closer}`,
    "",
    "**Best rhythm**: shorter daily sessions usually stick better than one long cram session.",
  ]
    .filter(Boolean)
    .join("\n");
}

function formatWrongAnswerReply(activeTopic) {
  const topicHint = activeTopic
    ? `If this is about **${activeTopic.title}**, I can also tell you what cue in the stem points to that concept.`
    : "If you paste the full item, I can tell you exactly what clue in the stem points to the right answer.";

  return [
    activeTopic ? formatTopicLead(activeTopic) : "",
    "**How to break down a wrong answer**",
    "",
    "1. Identify the exact concept being tested.",
    "2. Look for the word or phrase that makes the tempting option unsafe or incomplete.",
    "3. Ask what the best answer does better: is it more ethical, more functional, or more consistent with ABA principles?",
    "",
    topicHint,
  ]
    .filter(Boolean)
    .join("\n");
}

function formatGeneralHelp(activeTopic) {
  const topicLine = activeTopic
    ? `Since we are already talking about **${activeTopic.title}**, I can keep going with that.`
    : "I can switch between concepts, quizzes, examples, and exam strategy.";

  return [
    "I can help with:",
    "",
    "- explaining ABA or RBT concepts in simple words",
    "- giving examples and exam-style scenarios",
    "- quizzing you with easier or harder questions",
    "- breaking down why an answer is wrong",
    "- building a focused study plan",
    "",
    topicLine,
    "",
    "Try: `Quiz me on prompting`, `Give me a harder FBA scenario`, `Why is this answer wrong?`, or `Make me a study plan for reinforcement`.",
  ].join("\n");
}

function buildCoreTopicQuiz(seed) {
  const selectedTopics = TOPICS.slice(0, 4)
    .map((topic, index) => ({ topic, score: (seed + index * 7) % TOPICS.length }))
    .sort((left, right) => left.score - right.score)
    .slice(0, 3)
    .map(({ topic }) => topic);

  const questions = selectedTopics.map((topic, index) => {
    const quiz = pickBySeed(topic.quizzes, seed + index);
    return `${index + 1}. ${quiz.prompt}\n   **Answer**: ${quiz.answer}\n   **Why**: ${quiz.rationale}`;
  });

  return [
    "**Quick quiz: mixed core RBT concepts**",
    "",
    ...questions,
    "",
    "If you want, I can make the next round topic-specific, more scenario-based, or one question at a time.",
  ].join("\n");
}

function performFollowUpAction(followUp, activeTopic, seed) {
  const topic = getTopicById(followUp?.topicId) || activeTopic || getTopicById("positive_reinforcement");

  if (followUp?.defaultAction === "one_question_at_a_time") {
    return formatQuizReply(topic, seed + 3, {
      count: 1,
      revealAnswers: false,
      intro: formatTopicLead(topic, "Let's do one question at a time on"),
    });
  }

  if (followUp?.defaultAction === "next_question") {
    return formatQuizReply(topic, seed + 5, {
      count: 1,
      revealAnswers: false,
      intro: formatTopicLead(topic, "Next question on"),
    });
  }

  return {
    content: formatGeneralHelp(topic),
  };
}

export function createRuleBasedTutorReply(text, options = {}) {
  const normalized = String(text || "").trim().toLowerCase();
  const history = Array.isArray(options.history) ? options.history : [];
  const seed = hashText(`${normalized}:${history.length}`);
  const now = new Date();
  const todayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(now);

  const explicitTopic = findTopicFromText(normalized);
  const activeTopic = explicitTopic || inferTopicFromHistory(history);
  const intro = !explicitTopic && activeTopic ? formatTopicLead(activeTopic) : "";
  const pendingQuiz = findPendingQuiz(history);
  const pendingFollowUp = findPendingFollowUp(history);

  if (pendingQuiz) {
    const quizTopic = getTopicById(pendingQuiz.topicId) || activeTopic;

    if (hasAny(normalized, ["next question", "another question", "next one", "siguiente pregunta", "otra pregunta"])) {
      const topic = quizTopic || getTopicById("positive_reinforcement");
      return formatQuizReply(topic, seed + 5, {
        count: 1,
        revealAnswers: false,
        intro: formatTopicLead(topic, "Next question on"),
      });
    }

    return formatQuizEvaluation(text, pendingQuiz, quizTopic);
  }

  if (pendingFollowUp) {
    if (isAffirmative(text)) {
      return performFollowUpAction(pendingFollowUp, activeTopic, seed);
    }

    if (isNegative(text)) {
      return {
        content: [
          activeTopic ? formatTopicLead(activeTopic) : "",
          "No problem.",
          "",
          "We can stay on this topic, switch topics, do a harder quiz, or walk through an example instead.",
        ]
          .filter(Boolean)
          .join("\n"),
      };
    }
  }

  if (
    hasAny(normalized, [
      "what day is today",
      "what day is it",
      "what date is today",
      "today's date",
      "que dia es hoy",
      "que día es hoy",
    ])
  ) {
    return { content: `Today is **${todayLabel}**.` };
  }

  if (hasAny(normalized, ["what can you do", "help me", "how can you help", "ayudame", "como puedes ayudar"])) {
    return { content: formatGeneralHelp(activeTopic) };
  }

  if (hasAny(normalized, ["study plan", "how should i study", "study schedule", "plan de estudio", "como debo estudiar"])) {
    return { content: formatStudyPlan(activeTopic, seed) };
  }

  if (hasAny(normalized, ["why is this wrong", "why is that wrong", "why wrong", "por que esta mal", "por que esto esta mal"])) {
    return { content: formatWrongAnswerReply(activeTopic) };
  }

  if (hasAny(normalized, ["another example", "one more example", "more example", "otro ejemplo", "mas ejemplo", "más ejemplo"])) {
    const topic = activeTopic || getTopicById("positive_reinforcement");
    return { content: formatExampleReply(topic, seed + 1, intro) };
  }

  if (hasAny(normalized, ["example", "give me an example", "ejemplo", "dame un ejemplo"])) {
    const topic = activeTopic || getTopicById("positive_reinforcement");
    return { content: formatExampleReply(topic, seed, intro) };
  }

  if (
    hasAny(normalized, [
      "one question at a time",
      "one question",
      "without showing the answer",
      "don't show the answer",
      "dont show the answer",
      "una pregunta a la vez",
      "sin mostrar la respuesta",
      "no muestres la respuesta",
    ])
  ) {
    const topic = activeTopic || getTopicById("positive_reinforcement");
    return formatQuizReply(topic, seed, {
      count: 1,
      revealAnswers: false,
      intro,
    });
  }

  if (hasAny(normalized, ["harder", "more challenging", "mas dificil", "más difícil"])) {
    const topic = activeTopic || getTopicById("positive_reinforcement");
    return {
      content: formatQuizReply(topic, seed + 2, {
        count: 2,
        revealAnswers: true,
        intro: intro || `Here is a harder pass on **${topic.title}**:`,
      }).content,
      followUp: {
        type: "quiz_review",
        topicId: topic.id,
        defaultAction: "one_question_at_a_time",
      },
    };
  }

  if (hasAny(normalized, ["quiz me", "test me", "practice me", "hazme un quiz", "preguntame", "pruebame"])) {
    if (activeTopic) {
      const quizReply = formatQuizReply(activeTopic, seed, {
        count: 3,
        revealAnswers: true,
        intro,
      });
      return {
        content: quizReply.content,
        followUp: quizReply.followUp,
      };
    }

    return { content: buildCoreTopicQuiz(seed) };
  }

  if (
    hasAny(normalized, [
      "negative reinforcement",
      "punishment",
      "difference between reinforcement and punishment",
    ])
  ) {
    return {
      content: [
      "**Reinforcement vs punishment**",
      "",
      "- **Reinforcement** increases a future behavior.",
      "- **Punishment** decreases a future behavior.",
      "- **Positive** means something is added.",
      "- **Negative** means something is removed.",
      "",
      "**Memory tip**: ignore whether the event feels good or bad and ask, `Did the future behavior go up or down?`",
      "",
      "If you want, I can give you three mini scenarios and have you label each one.",
    ].join("\n"),
    };
  }

  if (activeTopic) {
    return { content: formatConceptReply(activeTopic, seed, intro) };
  }

  if (hasAny(normalized, ["rbt exam", "exam tips", "study tips"])) {
    return {
      content: [
      "**RBT exam prep tips**",
      "",
      "1. Practice in short daily blocks instead of cramming.",
      "2. Review missed questions by concept, not only by final answer.",
      "3. Focus hard on reinforcement, prompting, data collection, ethics, and behavior reduction.",
      "4. Mix recognition practice with recall: explain concepts out loud, not just by rereading.",
      "",
      "If you want, I can build you a 7-day mini study plan or quiz you on your weakest area.",
    ].join("\n"),
    };
  }

  return { content: formatGeneralHelp(activeTopic) };
}

// ─────────────────────────────────────────────────────────────────────────────
// LLM integration
// ─────────────────────────────────────────────────────────────────────────────
//
// createTutorReply (the public entrypoint used by the API endpoints) now
// delegates to OpenAI when OPENAI_API_KEY is set, and falls back to the
// rule-based engine above when it isn't. This keeps local dev cheap and means
// production never breaks if the env var is missing — it just degrades to the
// old behavior with an error logged.

export async function createTutorReply(text, options = {}) {
  if (isOpenAIConfigured()) {
    try {
      const llmReply = await createTutorReplyOpenAI({
        content: text,
        history: options.history,
        progress: options.progress,
        recentMissedTopic: options.recentMissedTopic,
      });
      return { content: llmReply.content };
    } catch (error) {
      console.error("[tutor] OpenAI failed, falling back to rule-based:", error.message);
      // fall through to rule-based
    }
  }

  return createRuleBasedTutorReply(text, options);
}

export { streamTutorReplyOpenAI, isOpenAIConfigured };
