/**
 * Applied questions — decisions, calculations and graph reading.
 *
 * The concept bank asks the student to NAME a concept ("Which concept is the
 * best match?"). The real RBT exam mostly asks what the RBT should DO, or what
 * the data SAY. This layer covers that gap, prioritised by exam weight and by
 * items the concept bank cannot express:
 *   - A.6 calculations (rate, mean duration, percentages, IOA)
 *   - A.7 reading trends on an actual graph (`chart`)
 *   - C, D and F decisions with four plausible options
 *
 * Authoring rules
 *   - `options[0]` is always the correct answer in the source; the builder
 *     shuffles deterministically per id, and applies the same order to the
 *     Spanish options so both languages stay aligned.
 *   - `concept_id` must be an existing RBT-eligible concept: it supplies the
 *     topic and the Test Content Outline code, so analytics, mock-exam
 *     weighting and domain mastery treat these exactly like the rest.
 *   - Ids start with `applied_` and never end in definition/scenario/purpose,
 *     so translation code never mistakes them for template questions.
 *   - New ids only. Never reuse or rename an id once students have attempts.
 */

export const APPLIED_QUESTIONS = [
  // ─── A.6 Calculate and summarize data ─────────────────────────────────────
  {
    id: "applied_calc_rate",
    concept_id: "measurement_rate",
    text: "During a 30-minute session, an RBT counts 12 instances of hand flapping. What rate should be entered on the data sheet?",
    options: ["0.4 responses per minute", "2.5 responses per minute", "12 responses per minute", "40%"],
    explanation: "Rate is count divided by observation time: 12 ÷ 30 minutes = 0.4 responses per minute. 2.5 is the time divided by the count, and a percentage is not a rate.",
    es: {
      text: "Durante una sesión de 30 minutos, un RBT cuenta 12 episodios de aleteo de manos. ¿Qué tasa debe anotar en la hoja de datos?",
      options: ["0,4 respuestas por minuto", "2,5 respuestas por minuto", "12 respuestas por minuto", "40 %"],
      explanation: "La tasa es el conteo dividido entre el tiempo de observación: 12 ÷ 30 minutos = 0,4 respuestas por minuto. 2,5 es el tiempo dividido entre el conteo, y un porcentaje no es una tasa.",
    },
  },
  {
    id: "applied_calc_mean_duration",
    concept_id: "measurement_mean_duration",
    text: "A learner has four tantrums in one session, lasting 3, 5, 2 and 6 minutes. What is the mean duration per tantrum?",
    options: ["4 minutes", "16 minutes", "5 minutes", "3.5 minutes"],
    explanation: "Mean duration is total duration divided by the number of episodes: (3 + 5 + 2 + 6) ÷ 4 = 16 ÷ 4 = 4 minutes. 16 minutes is the total duration, not the mean.",
    es: {
      text: "Un aprendiz tiene cuatro rabietas en una sesión, de 3, 5, 2 y 6 minutos. ¿Cuál es la duración media por rabieta?",
      options: ["4 minutos", "16 minutos", "5 minutos", "3,5 minutos"],
      explanation: "La duración media es la duración total dividida entre el número de episodios: (3 + 5 + 2 + 6) ÷ 4 = 16 ÷ 4 = 4 minutos. 16 minutos es la duración total, no la media.",
    },
  },
  {
    id: "applied_calc_percentage_correct",
    concept_id: "measurement_percentage_correct",
    text: "In a discrete-trial program, the learner responds correctly on 14 of 20 trials. What should be recorded?",
    options: ["70% correct", "14% correct", "30% correct", "86% correct"],
    explanation: "Percentage correct = correct trials ÷ total trials × 100: 14 ÷ 20 × 100 = 70%. 30% is the percentage of incorrect trials.",
    es: {
      text: "En un programa de ensayos discretos, el aprendiz responde correctamente en 14 de 20 ensayos. ¿Qué se debe registrar?",
      options: ["70 % de aciertos", "14 % de aciertos", "30 % de aciertos", "86 % de aciertos"],
      explanation: "Porcentaje de aciertos = ensayos correctos ÷ ensayos totales × 100: 14 ÷ 20 × 100 = 70 %. El 30 % es el porcentaje de ensayos incorrectos.",
    },
  },
  {
    id: "applied_calc_percentage_opportunities",
    concept_id: "measurement_percentage_opportunities",
    text: "During snack, the RBT creates 8 opportunities for the learner to request a break. The learner requests independently on 6 of them. What should be recorded?",
    options: ["75% of opportunities", "6 responses per session", "25% of opportunities", "133% of opportunities"],
    explanation: "Responses ÷ opportunities × 100 = 6 ÷ 8 × 100 = 75%. Reporting only the count (6) hides how many chances the learner had.",
    es: {
      text: "Durante la merienda, el RBT crea 8 oportunidades para que el aprendiz pida un descanso. El aprendiz lo pide de forma independiente en 6 de ellas. ¿Qué se debe registrar?",
      options: ["75 % de las oportunidades", "6 respuestas por sesión", "25 % de las oportunidades", "133 % de las oportunidades"],
      explanation: "Respuestas ÷ oportunidades × 100 = 6 ÷ 8 × 100 = 75 %. Anotar solo el conteo (6) oculta cuántas oportunidades tuvo el aprendiz.",
    },
  },

  // ─── A.7 Identify trends in graphed data ──────────────────────────────────
  {
    id: "applied_graph_increasing_trend",
    concept_id: "measurement_increasing_trend",
    text: "The graph shows the number of independent requests (mands) per session. Which statement best describes the data?",
    chart: {
      y_label: "Independent mands",
      x_label: "Session",
      y_max: 12,
      series: [2, 3, 3, 5, 6, 6, 8, 9, 10, 11],
    },
    options: [
      "An increasing trend: independent requesting is improving",
      "A decreasing trend: independent requesting is getting worse",
      "A stable level with no trend",
      "The data are too variable to describe a trend",
    ],
    explanation: "Each data point tends to be higher than the one before, from 2 to 11 requests. That is an increasing trend, and for a skill we want more of, it means progress.",
    es: {
      text: "La gráfica muestra el número de peticiones independientes (mands) por sesión. ¿Qué afirmación describe mejor los datos?",
      chart: { y_label: "Mands independientes", x_label: "Sesión" },
      options: [
        "Una tendencia ascendente: las peticiones independientes están mejorando",
        "Una tendencia descendente: las peticiones independientes están empeorando",
        "Un nivel estable sin tendencia",
        "Los datos son demasiado variables para describir una tendencia",
      ],
      explanation: "Cada punto tiende a ser más alto que el anterior, de 2 a 11 peticiones. Es una tendencia ascendente y, en una habilidad que queremos aumentar, significa progreso.",
    },
  },
  {
    id: "applied_graph_phase_change",
    concept_id: "measurement_decreasing_trend",
    text: "The graph shows aggression per session. The dashed line marks when the behavior intervention plan started. What is the most accurate description?",
    chart: {
      y_label: "Aggressive acts",
      x_label: "Session",
      y_max: 12,
      series: [9, 10, 8, 10, 9, 7, 6, 6, 4, 4, 2],
      phase_change_after: 5,
      phase_labels: ["Baseline", "Intervention"],
    },
    options: [
      "A stable baseline, then a decreasing trend after the intervention started",
      "A stable baseline, then an immediate drop in level with no further trend",
      "A variable baseline, so the intervention's effect cannot be judged yet",
      "A decreasing trend in baseline that simply continued during the intervention",
    ],
    explanation: "Baseline stays between 8 and 10 with no clear direction, so it is stable, not variable. After the phase line, aggression keeps falling across sessions, from 7 down to 2: a decreasing trend that begins with the intervention, not just a one-time drop in level.",
    es: {
      text: "La gráfica muestra la agresión por sesión. La línea discontinua marca cuándo empezó el plan de intervención conductual. ¿Cuál es la descripción más precisa?",
      chart: { y_label: "Actos de agresión", x_label: "Sesión", phase_labels: ["Línea base", "Intervención"] },
      options: [
        "Una línea base estable, seguida de una tendencia descendente al empezar la intervención",
        "Una línea base estable, seguida de una bajada inmediata de nivel sin más tendencia",
        "Una línea base variable, por lo que aún no se puede juzgar el efecto de la intervención",
        "Una tendencia descendente en línea base que simplemente continuó durante la intervención",
      ],
      explanation: "La línea base se mantiene entre 8 y 10 sin una dirección clara, así que es estable, no variable. Tras la línea de cambio de fase, la agresión sigue bajando a lo largo de las sesiones, de 7 a 2: una tendencia descendente que empieza con la intervención, no solo una bajada puntual de nivel.",
    },
  },
  {
    id: "applied_graph_variable",
    concept_id: "measurement_variable_trend",
    text: "The graph shows elopement attempts per session over the last eight sessions. What should the RBT report to the supervisor?",
    chart: {
      y_label: "Elopement attempts",
      x_label: "Session",
      y_max: 12,
      series: [2, 9, 1, 8, 3, 10, 2, 7],
    },
    options: [
      "The data are highly variable, so no clear trend can be identified yet",
      "There is a clear increasing trend",
      "There is a clear decreasing trend",
      "The data are stable, so the target can be considered mastered",
    ],
    explanation: "The values jump between low and high from one session to the next. With this much variability no reliable trend can be described, and the variability itself is worth reporting so the supervisor can look for what changes between sessions.",
    es: {
      text: "La gráfica muestra los intentos de fuga por sesión en las últimas ocho sesiones. ¿Qué debe informar el RBT a su supervisor?",
      chart: { y_label: "Intentos de fuga", x_label: "Sesión" },
      options: [
        "Los datos son muy variables, así que todavía no se puede identificar una tendencia clara",
        "Hay una tendencia ascendente clara",
        "Hay una tendencia descendente clara",
        "Los datos son estables, así que el objetivo se puede dar por dominado",
      ],
      explanation: "Los valores saltan de bajos a altos de una sesión a otra. Con tanta variabilidad no se puede describir una tendencia fiable, y conviene informar de esa variabilidad para que el supervisor busque qué cambia entre sesiones.",
    },
  },
  {
    id: "applied_graph_stable_no_progress",
    concept_id: "measurement_stable_trend",
    text: "The graph shows percentage correct on a receptive identification target over seven sessions. What do the data show?",
    chart: {
      y_label: "% correct",
      x_label: "Session",
      y_max: 100,
      series: [40, 42, 40, 41, 40, 42, 41],
    },
    options: [
      "A stable level with no meaningful trend: the learner is not making progress yet",
      "An increasing trend toward the mastery criterion",
      "Highly variable responding",
      "A decreasing trend",
    ],
    explanation: "Responding stays around 40% with almost no change. Stable data at a low level mean the current teaching is not producing progress, which the RBT should share with the supervisor.",
    es: {
      text: "La gráfica muestra el porcentaje de aciertos en un objetivo de identificación receptiva durante siete sesiones. ¿Qué muestran los datos?",
      chart: { y_label: "% de aciertos", x_label: "Sesión" },
      options: [
        "Un nivel estable sin una tendencia relevante: el aprendiz todavía no está progresando",
        "Una tendencia ascendente hacia el criterio de dominio",
        "Respuestas muy variables",
        "Una tendencia descendente",
      ],
      explanation: "Las respuestas se mantienen en torno al 40 % casi sin cambios. Unos datos estables en un nivel bajo indican que la enseñanza actual no está produciendo progreso, y el RBT debe comunicárselo al supervisor.",
    },
  },

  // ─── A.8 Data reliability and procedural fidelity ─────────────────────────
  {
    id: "applied_ioa_total_count",
    concept_id: "measurement_ioa_total_count",
    text: "The RBT and the supervisor count the same behavior during one session. The RBT records 16 and the supervisor records 20. What is the total count IOA?",
    options: ["80%", "4%", "125%", "90%"],
    explanation: "Total count IOA = smaller count ÷ larger count × 100 = 16 ÷ 20 × 100 = 80%. Dividing the larger by the smaller (125%) is a common mistake.",
    es: {
      text: "El RBT y el supervisor cuentan la misma conducta durante una sesión. El RBT registra 16 y el supervisor 20. ¿Cuál es el IOA de conteo total?",
      options: ["80 %", "4 %", "125 %", "90 %"],
      explanation: "IOA de conteo total = conteo menor ÷ conteo mayor × 100 = 16 ÷ 20 × 100 = 80 %. Dividir el mayor entre el menor (125 %) es un error frecuente.",
    },
  },
  {
    id: "applied_definition_drift",
    concept_id: "measurement_operational_def_review",
    text: "An RBT realizes she has only been recording tantrums that last longer than a minute, but the operational definition includes every episode of crying while dropping to the floor. What is the main risk?",
    options: [
      "The data underestimate the behavior, which can lead the team to make the wrong treatment decisions",
      "There is no risk as long as she records the same way every session",
      "There is no risk because IOA checks will correct the numbers automatically",
      "It only matters if the BCBA asks to see the raw data sheets",
    ],
    explanation: "Recording consistently but against the wrong definition still produces inaccurate data. The team decides whether to change the plan based on these numbers, so the RBT should tell the supervisor and return to the written definition.",
    es: {
      text: "Una RBT se da cuenta de que solo ha registrado las rabietas de más de un minuto, pero la definición operacional incluye cualquier episodio de llanto tirándose al suelo. ¿Cuál es el riesgo principal?",
      options: [
        "Los datos subestiman la conducta, lo que puede llevar al equipo a tomar decisiones de tratamiento equivocadas",
        "No hay riesgo mientras registre siempre de la misma manera",
        "No hay riesgo porque los controles de IOA corrigen los números automáticamente",
        "Solo importa si la BCBA pide ver las hojas de datos originales",
      ],
      explanation: "Registrar de forma consistente pero con la definición equivocada sigue produciendo datos inexactos. El equipo decide si cambia el plan a partir de estos números, así que la RBT debe avisar al supervisor y volver a la definición escrita.",
    },
  },

  // ─── B. Behavior Assessment ───────────────────────────────────────────────
  {
    id: "applied_mswo_result",
    concept_id: "assessment_mswo",
    text: "In a multiple-stimulus-without-replacement (MSWO) assessment, the learner selects items in this order: tablet, bubbles, crackers, ball. Based only on these results, which item is most likely to work as a reinforcer?",
    options: [
      "The tablet, because it was selected first",
      "The ball, because items selected last build motivation",
      "The crackers, because edible items are always the strongest reinforcers",
      "The bubbles, to avoid satiation on the first item",
    ],
    explanation: "In an MSWO the order of selection produces a preference hierarchy: the first item chosen is the most preferred and the most likely to function as a reinforcer. Whether it actually reinforces behavior is confirmed by how responding changes.",
    es: {
      text: "En una evaluación de estímulos múltiples sin reemplazo (MSWO), el aprendiz elige en este orden: tableta, burbujas, galletas, pelota. Solo con estos resultados, ¿qué objeto tiene más probabilidad de funcionar como reforzador?",
      options: [
        "La tableta, porque fue la primera elegida",
        "La pelota, porque los objetos elegidos al final aumentan la motivación",
        "Las galletas, porque los comestibles siempre son los reforzadores más fuertes",
        "Las burbujas, para evitar la saciedad del primer objeto",
      ],
      explanation: "En una MSWO, el orden de elección produce una jerarquía de preferencias: el primer objeto elegido es el preferido y el que tiene más probabilidad de funcionar como reforzador. Si realmente refuerza la conducta se confirma viendo cómo cambian las respuestas.",
    },
  },
  {
    id: "applied_abc_pattern_report",
    concept_id: "assessment_abc_pattern_review",
    text: "ABC data show that most screaming episodes happen right after the learner is told to put toys away, and that the learner usually ends up continuing to play. What should the RBT do with this information?",
    options: [
      "Share the pattern with the supervisor, noting that escaping the cleanup demand may be maintaining the screaming",
      "Stop giving the cleanup instruction so the screaming does not happen",
      "Conclude the behavior is escape-maintained and start escape extinction",
      "Ignore the pattern, because ABC data cannot suggest a function",
    ],
    explanation: "The RBT participates in functional assessment by collecting and reporting data. Interpreting the function and changing the plan belong to the supervisor, so the right step is to share the observed pattern objectively.",
    es: {
      text: "Los datos ABC muestran que la mayoría de los episodios de gritos ocurren justo después de pedirle al aprendiz que recoja los juguetes, y que el aprendiz suele terminar siguiendo con el juego. ¿Qué debe hacer el RBT con esta información?",
      options: [
        "Compartir el patrón con el supervisor, señalando que evitar la tarea de recoger puede estar manteniendo los gritos",
        "Dejar de dar la instrucción de recoger para que no haya gritos",
        "Concluir que la conducta se mantiene por escape y empezar la extinción del escape",
        "Ignorar el patrón, porque los datos ABC no pueden sugerir una función",
      ],
      explanation: "El RBT participa en la evaluación funcional recogiendo e informando datos. Interpretar la función y cambiar el plan le corresponde al supervisor, así que lo correcto es compartir el patrón observado de forma objetiva.",
    },
  },

  // ─── C. Behavior Acquisition ──────────────────────────────────────────────
  {
    id: "applied_backward_chaining_next",
    concept_id: "skill_backward_chaining",
    text: "Handwashing is being taught with backward chaining. The learner now independently completes the last step, drying hands. What should the RBT teach next?",
    options: [
      "The second-to-last step (turning off the water), then let the learner finish by drying independently",
      "The first step (turning on the water)",
      "All the steps at once, using total-task chaining",
      "Keep practicing only drying until the learner generalizes it to other bathrooms",
    ],
    explanation: "In backward chaining, the learner first masters the last step, then the step before it, and so on, always finishing the chain independently and contacting the natural reinforcer.",
    es: {
      text: "Se enseña el lavado de manos con encadenamiento hacia atrás. El aprendiz ya completa solo el último paso, secarse las manos. ¿Qué debe enseñar el RBT a continuación?",
      options: [
        "El penúltimo paso (cerrar el grifo) y dejar que el aprendiz termine secándose solo",
        "El primer paso (abrir el grifo)",
        "Todos los pasos a la vez, con encadenamiento de tarea total",
        "Seguir practicando solo el secado hasta que lo generalice a otros baños",
      ],
      explanation: "En el encadenamiento hacia atrás, el aprendiz domina primero el último paso, luego el anterior, y así sucesivamente, terminando siempre la cadena de forma independiente y en contacto con el reforzador natural.",
    },
  },
  {
    id: "applied_errorless_first_trial",
    concept_id: "skill_errorless_teaching",
    text: "A new target is being taught with errorless teaching. What should the RBT do on the first trial?",
    options: [
      "Give the instruction with an immediate prompt that guarantees a correct response, then fade it over later trials",
      "Give the instruction, wait 5 seconds and prompt only if the learner responds incorrectly",
      "Give the instruction and let the learner make errors so they learn from feedback",
      "Start with a verbal prompt and add more help after each error",
    ],
    explanation: "Errorless teaching prevents errors by prompting immediately (often with the most supportive effective prompt) and fading the prompt systematically. Waiting for an error or adding help after errors is least-to-most prompting.",
    es: {
      text: "Se enseña un objetivo nuevo con enseñanza sin errores. ¿Qué debe hacer el RBT en el primer ensayo?",
      options: [
        "Dar la instrucción con una ayuda inmediata que garantice la respuesta correcta y desvanecerla en ensayos posteriores",
        "Dar la instrucción, esperar 5 segundos y ayudar solo si el aprendiz responde mal",
        "Dar la instrucción y dejar que el aprendiz cometa errores para que aprenda de la retroalimentación",
        "Empezar con una ayuda verbal y añadir más ayuda después de cada error",
      ],
      explanation: "La enseñanza sin errores evita los errores ayudando de inmediato (a menudo con la ayuda eficaz de mayor apoyo) y desvaneciendo la ayuda de forma sistemática. Esperar al error o añadir ayuda tras los errores es ayuda de menor a mayor.",
    },
  },
  {
    id: "applied_incidental_teaching",
    concept_id: "skill_incidental_teaching",
    text: "During free play, the learner reaches toward a toy car on a high shelf. Using incidental teaching, what is the best response?",
    options: [
      "Use the moment: prompt the learner to request \"car\" and give the car right after the request",
      "Hand over the car, since play time is not teaching time",
      "Take the learner to the table for a discrete trial on labeling \"car\"",
      "Put the car away so the learner focuses on other toys",
    ],
    explanation: "Incidental teaching uses the learner's own motivation in the natural environment: the learner shows interest, the RBT prompts the target response, and access to the item is the reinforcer.",
    es: {
      text: "Durante el juego libre, el aprendiz intenta alcanzar un coche de juguete en un estante alto. Con enseñanza incidental, ¿cuál es la mejor respuesta?",
      options: [
        "Aprovechar el momento: ayudar al aprendiz a pedir \"coche\" y darle el coche justo después de la petición",
        "Darle el coche, porque el rato de juego no es para enseñar",
        "Llevar al aprendiz a la mesa para un ensayo discreto de nombrar \"coche\"",
        "Guardar el coche para que el aprendiz se centre en otros juguetes",
      ],
      explanation: "La enseñanza incidental aprovecha la motivación del aprendiz en el entorno natural: el aprendiz muestra interés, el RBT ayuda a dar la respuesta objetivo y el acceso al objeto es el reforzador.",
    },
  },
  {
    id: "applied_shaping_raise_criterion",
    concept_id: "skill_shaping",
    text: "The plan uses shaping to teach the word \"bubble\". The learner used to say \"buh\" and now reliably says \"bub\". What should the RBT do?",
    options: [
      "Reinforce \"bub\" or closer approximations, and stop reinforcing \"buh\"",
      "Keep reinforcing \"buh\" and \"bub\" equally",
      "Require the full word \"bubble\" before giving any reinforcement",
      "Physically prompt the mouth movements for \"bubble\" on every trial",
    ],
    explanation: "Shaping reinforces successive approximations: once a closer approximation is reliable, earlier approximations are placed on extinction. Jumping straight to the final behavior skips the steps and usually stops responding.",
    es: {
      text: "El plan usa moldeamiento para enseñar la palabra \"bubble\" (burbuja). El aprendiz antes decía \"buh\" y ahora dice \"bub\" de forma fiable. ¿Qué debe hacer el RBT?",
      options: [
        "Reforzar \"bub\" o aproximaciones más cercanas, y dejar de reforzar \"buh\"",
        "Seguir reforzando \"buh\" y \"bub\" por igual",
        "Exigir la palabra completa \"bubble\" antes de dar cualquier reforzador",
        "Ayudar físicamente con los movimientos de la boca en cada ensayo",
      ],
      explanation: "El moldeamiento refuerza aproximaciones sucesivas: cuando una aproximación más cercana es fiable, las anteriores pasan a extinción. Saltar directamente a la conducta final se salta pasos y suele hacer que el aprendiz deje de responder.",
    },
  },
  {
    id: "applied_generalization_next_step",
    concept_id: "skill_generalization_programming",
    text: "A learner has mastered labeling \"dog\" with one picture card, at the table, with one RBT. Which next step best promotes generalization?",
    options: [
      "Probe and teach with different dog pictures, real dogs, other people and other settings",
      "Run more trials with the same card to make the skill stronger",
      "Move the target to maintenance and stop presenting it",
      "Teach \"cat\" with the same card format",
    ],
    explanation: "Generalization is programmed by varying stimuli, people and settings (multiple exemplars). More trials with the same card strengthen responding to that card only.",
    es: {
      text: "Un aprendiz domina nombrar \"perro\" con una sola tarjeta, en la mesa y con un solo RBT. ¿Qué siguiente paso favorece más la generalización?",
      options: [
        "Evaluar y enseñar con distintas fotos de perros, perros reales, otras personas y otros lugares",
        "Hacer más ensayos con la misma tarjeta para reforzar la habilidad",
        "Pasar el objetivo a mantenimiento y dejar de presentarlo",
        "Enseñar \"gato\" con el mismo formato de tarjeta",
      ],
      explanation: "La generalización se programa variando estímulos, personas y lugares (ejemplos múltiples). Más ensayos con la misma tarjeta solo fortalecen la respuesta ante esa tarjeta.",
    },
  },
  {
    id: "applied_maintenance_handling",
    concept_id: "skill_acquisition_vs_maintenance_selection",
    text: "A target met its mastery criterion last month and is now in maintenance. How is it typically handled in today's session?",
    options: [
      "Presented occasionally, mixed in with acquisition targets, on a thinner reinforcement schedule",
      "Presented on every trial with continuous reinforcement, like a new target",
      "Never presented again, since it is mastered",
      "Retested from baseline at the start of every session",
    ],
    explanation: "Maintenance checks that a mastered skill stays in the repertoire: the target appears less often, is interspersed with acquisition work and is reinforced on a leaner schedule, as specified by the supervisor.",
    es: {
      text: "Un objetivo cumplió su criterio de dominio el mes pasado y ahora está en mantenimiento. ¿Cómo se suele trabajar en la sesión de hoy?",
      options: [
        "Se presenta de vez en cuando, intercalado con objetivos de adquisición, con un programa de reforzamiento más espaciado",
        "Se presenta en cada ensayo con reforzamiento continuo, como un objetivo nuevo",
        "No se vuelve a presentar, porque ya está dominado",
        "Se vuelve a evaluar desde línea base al principio de cada sesión",
      ],
      explanation: "El mantenimiento comprueba que una habilidad dominada sigue en el repertorio: el objetivo aparece con menos frecuencia, se intercala con el trabajo de adquisición y se refuerza con un programa más espaciado, según indique el supervisor.",
    },
  },
  {
    id: "applied_token_exchange_timing",
    concept_id: "skill_token_exchange",
    text: "A learner's token board requires 5 tokens, and the plan says the exchange happens as soon as the board is full. She earns the fifth token in the middle of a task. What should the RBT do?",
    options: [
      "Let her exchange the tokens for the backup reinforcer she chose, as the plan states",
      "Delay the exchange until the end of the session so she finishes more work",
      "Give her a sixth token to keep her motivated",
      "Remove a token because the task is not finished yet",
    ],
    explanation: "A token economy only works if tokens reliably lead to the backup reinforcer as described in the plan. Delaying or changing the exchange rule weakens the tokens as conditioned reinforcers.",
    es: {
      text: "El tablero de fichas de una aprendiz requiere 5 fichas, y el plan dice que el canje se hace en cuanto el tablero está completo. Gana la quinta ficha a mitad de una tarea. ¿Qué debe hacer el RBT?",
      options: [
        "Dejar que canjee las fichas por el reforzador de respaldo que eligió, como indica el plan",
        "Retrasar el canje hasta el final de la sesión para que termine más trabajo",
        "Darle una sexta ficha para mantenerla motivada",
        "Quitarle una ficha porque todavía no terminó la tarea",
      ],
      explanation: "Una economía de fichas solo funciona si las fichas llevan de forma fiable al reforzador de respaldo tal como describe el plan. Retrasar o cambiar la regla de canje debilita las fichas como reforzadores condicionados.",
    },
  },

  // ─── D. Behavior Reduction ────────────────────────────────────────────────
  {
    id: "applied_fct_attention_function",
    concept_id: "behavior_fct",
    text: "The supervisor has determined that a learner screams to get adult attention, and the plan uses functional communication training (FCT). Which response should the RBT teach?",
    options: [
      "Tapping the RBT's arm or saying \"look\" to request attention, then providing attention",
      "Saying \"break\" to leave the task",
      "Sitting quietly for 2 minutes to earn a token",
      "No new response; the screaming should simply be ignored",
    ],
    explanation: "FCT teaches a communication response that produces the same reinforcer as the problem behavior. If screaming is maintained by attention, the replacement must request attention; a break request matches an escape function.",
    es: {
      text: "El supervisor ha determinado que un aprendiz grita para conseguir la atención de un adulto, y el plan usa entrenamiento en comunicación funcional (FCT). ¿Qué respuesta debe enseñar el RBT?",
      options: [
        "Tocar el brazo del RBT o decir \"mira\" para pedir atención, y entonces darle atención",
        "Decir \"descanso\" para salir de la tarea",
        "Estar sentado en silencio 2 minutos para ganar una ficha",
        "Ninguna respuesta nueva; basta con ignorar los gritos",
      ],
      explanation: "El FCT enseña una respuesta comunicativa que produce el mismo reforzador que la conducta problema. Si los gritos se mantienen por atención, la respuesta alternativa debe pedir atención; pedir un descanso corresponde a una función de escape.",
    },
  },
  {
    id: "applied_extinction_burst_response",
    concept_id: "behavior_extinction_burst_management",
    text: "Per the plan, attention is now withheld when the learner whines. On the second day, whining is louder and lasts longer than it did in baseline. What is the most appropriate action for the RBT?",
    options: [
      "Continue the plan as written, keep everyone safe, record the data and inform the supervisor",
      "Give attention to calm the learner, and try extinction again later",
      "Stop the plan because it is making the behavior worse",
      "Add a punishment procedure to stop the increase",
    ],
    explanation: "A temporary increase is an expected extinction burst. Giving attention during the burst reinforces the more intense whining. The RBT follows the plan, keeps the session safe and reports the data; only the supervisor changes the plan.",
    es: {
      text: "Según el plan, ahora se retira la atención cuando el aprendiz se queja. El segundo día, las quejas son más fuertes y duran más que en línea base. ¿Qué es lo más apropiado que haga el RBT?",
      options: [
        "Seguir el plan tal como está escrito, mantener la seguridad, registrar los datos e informar al supervisor",
        "Darle atención para calmarlo y volver a intentar la extinción más adelante",
        "Suspender el plan porque está empeorando la conducta",
        "Añadir un procedimiento de castigo para frenar el aumento",
      ],
      explanation: "Un aumento temporal es una explosión de extinción esperable. Dar atención durante la explosión refuerza las quejas más intensas. El RBT sigue el plan, mantiene la sesión segura e informa de los datos; solo el supervisor cambia el plan.",
    },
  },
  {
    id: "applied_resetting_dro",
    concept_id: "behavior_dro",
    text: "The plan specifies a resetting DRO with a 3-minute interval for spitting. Spitting occurs at minute 2 of the interval. What should the RBT do?",
    options: [
      "Withhold reinforcement for that interval and restart the 3-minute timer",
      "Deliver reinforcement at minute 3 as scheduled",
      "Double the interval to 6 minutes",
      "Deliver reinforcement only if the learner apologizes",
    ],
    explanation: "In a DRO, reinforcement is delivered only if the target behavior does not occur during the interval. In a resetting DRO, an occurrence restarts the interval. Changing the interval length is a decision for the supervisor.",
    es: {
      text: "El plan indica un DRO con reinicio y un intervalo de 3 minutos para escupir. El aprendiz escupe en el minuto 2 del intervalo. ¿Qué debe hacer el RBT?",
      options: [
        "No dar el reforzador de ese intervalo y reiniciar el temporizador de 3 minutos",
        "Dar el reforzador en el minuto 3, como estaba previsto",
        "Duplicar el intervalo a 6 minutos",
        "Dar el reforzador solo si el aprendiz pide perdón",
      ],
      explanation: "En un DRO, el reforzador se da solo si la conducta objetivo no ocurre durante el intervalo. En un DRO con reinicio, una ocurrencia vuelve a empezar el intervalo. Cambiar la duración del intervalo es una decisión del supervisor.",
    },
  },
  {
    id: "applied_time_out_as_written",
    concept_id: "behavior_time_out_procedure",
    text: "The behavior plan includes a 2-minute non-exclusionary time-out for throwing materials. The learner throws a block. What should the RBT do?",
    options: [
      "Implement the time-out exactly as written: remove access to reinforcement for 2 minutes, then resume the activity",
      "Extend the time-out to 10 minutes because throwing is dangerous",
      "Skip the time-out and give a verbal reprimand instead",
      "Take the learner to a separate room and leave them alone",
    ],
    explanation: "Punishment procedures are implemented only as written in the plan and under supervision. Changing the duration, swapping in another procedure or moving to exclusion are not RBT decisions.",
    es: {
      text: "El plan de conducta incluye un tiempo fuera sin exclusión de 2 minutos por lanzar materiales. El aprendiz lanza un bloque. ¿Qué debe hacer el RBT?",
      options: [
        "Aplicar el tiempo fuera exactamente como está escrito: retirar el acceso al reforzamiento 2 minutos y luego retomar la actividad",
        "Alargar el tiempo fuera a 10 minutos porque lanzar objetos es peligroso",
        "Saltarse el tiempo fuera y darle una reprimenda verbal",
        "Llevar al aprendiz a otra habitación y dejarlo solo",
      ],
      explanation: "Los procedimientos de castigo se aplican solo como están escritos en el plan y bajo supervisión. Cambiar la duración, usar otro procedimiento o pasar a la exclusión no son decisiones del RBT.",
    },
  },
  {
    id: "applied_unplanned_self_injury",
    concept_id: "behavior_crisis_supervisor_notification",
    text: "A learner suddenly begins banging his head hard against a wall. This behavior is not covered in the behavior plan. What should the RBT do first?",
    options: [
      "Keep the learner and others safe using only procedures they are trained and authorized to use, then contact the supervisor",
      "Use a physical hold seen in a training video to stop it quickly",
      "Place the behavior on extinction by ignoring it",
      "Finish the session and mention it at the next supervision meeting",
    ],
    explanation: "Safety comes first, but only with procedures the RBT is trained and authorized to use. Because the behavior is new and dangerous, the supervisor must be contacted right away, not at the next meeting.",
    es: {
      text: "Un aprendiz empieza de repente a golpearse la cabeza con fuerza contra la pared. Esta conducta no aparece en el plan de conducta. ¿Qué debe hacer primero el RBT?",
      options: [
        "Mantener a salvo al aprendiz y a los demás usando solo procedimientos para los que esté formado y autorizado, y luego contactar al supervisor",
        "Usar una sujeción física vista en un vídeo de formación para detenerlo rápido",
        "Poner la conducta en extinción ignorándola",
        "Terminar la sesión y mencionarlo en la próxima reunión de supervisión",
      ],
      explanation: "La seguridad es lo primero, pero solo con procedimientos para los que el RBT esté formado y autorizado. Como la conducta es nueva y peligrosa, hay que contactar al supervisor de inmediato, no en la próxima reunión.",
    },
  },

  // ─── E. Documentation and Reporting ───────────────────────────────────────
  {
    id: "applied_medication_change",
    concept_id: "documentation_medication_change_report",
    text: "At drop-off, a parent mentions that the learner started a new medication this week. During the session the learner is unusually sleepy. What should the RBT do?",
    options: [
      "Document the parent's report and the observed sleepiness objectively, and notify the supervisor promptly",
      "Advise the parent to stop the medication",
      "Do nothing, because medical issues are outside the RBT's role",
      "Write in the note that the medication caused a bad session",
    ],
    explanation: "Medication changes and health changes are variables that can affect progress. The RBT reports them objectively and in a timely way, without giving medical advice or guessing at causes.",
    es: {
      text: "Al dejar al aprendiz, un padre comenta que esta semana empezó una medicación nueva. Durante la sesión, el aprendiz está inusualmente somnoliento. ¿Qué debe hacer el RBT?",
      options: [
        "Documentar de forma objetiva lo que dijo el padre y la somnolencia observada, y avisar al supervisor sin demora",
        "Aconsejar al padre que suspenda la medicación",
        "No hacer nada, porque los temas médicos están fuera del rol del RBT",
        "Escribir en la nota que la medicación causó una mala sesión",
      ],
      explanation: "Los cambios de medicación y de salud son variables que pueden afectar al progreso. El RBT los informa de forma objetiva y a tiempo, sin dar consejos médicos ni suponer causas.",
    },
  },
  {
    id: "applied_objective_note",
    concept_id: "documentation_objective_language",
    text: "Which session note entry is most appropriate?",
    options: [
      "\"Learner cried and dropped to the floor 4 times; the longest episode lasted 3 minutes.\"",
      "\"Learner was very angry and manipulative today.\"",
      "\"Learner had a terrible session, as usual.\"",
      "\"Learner seemed upset because she missed her mom.\"",
    ],
    explanation: "Session notes describe what was observed in measurable terms. Labels (\"manipulative\"), opinions (\"terrible\") and guesses about causes (\"missed her mom\") are not objective.",
    es: {
      text: "¿Qué entrada de nota de sesión es la más apropiada?",
      options: [
        "\"La aprendiz lloró y se tiró al suelo 4 veces; el episodio más largo duró 3 minutos.\"",
        "\"La aprendiz estuvo muy enfadada y manipuladora hoy.\"",
        "\"La aprendiz tuvo una sesión terrible, como siempre.\"",
        "\"La aprendiz parecía molesta porque echaba de menos a su mamá.\"",
      ],
      explanation: "Las notas de sesión describen lo observado en términos medibles. Las etiquetas (\"manipuladora\"), las opiniones (\"terrible\") y las suposiciones sobre causas (\"echaba de menos a su mamá\") no son objetivas.",
    },
  },
  {
    id: "applied_unclear_plan_direction",
    concept_id: "professional_unclear_plan_response",
    text: "The behavior plan says to \"block\" hitting but does not explain how, and the RBT is not sure what is allowed. What should the RBT do?",
    options: [
      "Ask the supervisor for clarification before the situation comes up, and follow that direction",
      "Use whatever blocking method feels most natural",
      "Ask an experienced coworker and use their method without telling the supervisor",
      "Avoid blocking and let the hitting happen until the plan is rewritten",
    ],
    explanation: "When a procedure is unclear, the RBT seeks clinical direction from the supervisor in a timely manner instead of improvising or relying on someone without that responsibility.",
    es: {
      text: "El plan de conducta dice que hay que \"bloquear\" los golpes, pero no explica cómo, y el RBT no está seguro de qué está permitido. ¿Qué debe hacer?",
      options: [
        "Pedir aclaración al supervisor antes de que ocurra la situación y seguir sus indicaciones",
        "Usar el método de bloqueo que le parezca más natural",
        "Preguntar a un compañero con experiencia y usar su método sin decírselo al supervisor",
        "No bloquear y dejar que ocurran los golpes hasta que se reescriba el plan",
      ],
      explanation: "Cuando un procedimiento no está claro, el RBT pide dirección clínica a su supervisor a tiempo, en lugar de improvisar o apoyarse en alguien sin esa responsabilidad.",
    },
  },

  // ─── F. Ethics ────────────────────────────────────────────────────────────
  {
    id: "applied_gift_card_offer",
    concept_id: "professional_gift_receiving_policy",
    text: "At the end of the year, a caregiver offers the RBT a $100 gift card as a thank-you. What should the RBT do?",
    options: [
      "Politely decline, and consult the supervisor about the organization's gift policy if unsure",
      "Accept it, since declining would be culturally insensitive",
      "Accept it and use it to buy materials for the client",
      "Accept it but avoid mentioning it to the supervisor",
    ],
    explanation: "Accepting a gift of significant monetary value from a client's family creates a conflict of interest. The RBT declines respectfully and follows the organization's policy, asking the supervisor when in doubt.",
    es: {
      text: "A final de año, un cuidador le ofrece al RBT una tarjeta regalo de 100 dólares como agradecimiento. ¿Qué debe hacer el RBT?",
      options: [
        "Rechazarla con amabilidad y, si tiene dudas, consultar al supervisor sobre la política de regalos de la organización",
        "Aceptarla, porque rechazarla sería culturalmente insensible",
        "Aceptarla y usarla para comprar materiales para el cliente",
        "Aceptarla, pero no comentárselo al supervisor",
      ],
      explanation: "Aceptar un regalo de valor económico significativo de la familia de un cliente crea un conflicto de intereses. El RBT lo rechaza con respeto y sigue la política de la organización, consultando al supervisor si tiene dudas.",
    },
  },
  {
    id: "applied_social_media_video",
    concept_id: "professional_social_media_client_identity",
    text: "An RBT wants to post a video of a client saying his first word on her personal Instagram. The parent said \"sure\" verbally, and she plans to blur the client's face. What should she do?",
    options: [
      "Not post it: client information and session content do not belong on her personal social media",
      "Post it, since the parent agreed",
      "Post it, since the face will be blurred",
      "Post it as a private story visible only to close friends",
    ],
    explanation: "Blurring a face does not remove identifying details such as voice, home or clothing, and an informal verbal OK is not the same as the organization's consent process. Personal social media is not the place for client content.",
    es: {
      text: "Una RBT quiere publicar en su Instagram personal un vídeo de un cliente diciendo su primera palabra. El padre le dijo \"claro\" de palabra, y ella piensa difuminar la cara del cliente. ¿Qué debe hacer?",
      options: [
        "No publicarlo: la información de los clientes y lo que ocurre en sesión no tienen cabida en sus redes sociales personales",
        "Publicarlo, porque el padre estuvo de acuerdo",
        "Publicarlo, porque la cara estará difuminada",
        "Publicarlo como historia privada visible solo para amigos cercanos",
      ],
      explanation: "Difuminar la cara no elimina datos identificativos como la voz, la casa o la ropa, y un \"claro\" informal no equivale al proceso de consentimiento de la organización. Las redes sociales personales no son lugar para contenido de clientes.",
    },
  },
  {
    id: "applied_babysitting_request",
    concept_id: "professional_dual_relationship_avoidance",
    text: "A client's parent asks the RBT to babysit the client on weekends for extra pay. What should the RBT do?",
    options: [
      "Decline, explaining that it would create a multiple relationship, and let the supervisor know",
      "Accept, since she already knows the learner's plan well",
      "Accept, as long as she does not run behavior programs while babysitting",
      "Accept, and bill the hours as therapy",
    ],
    explanation: "Taking on a second, paid role with a client's family is a multiple relationship that can impair objectivity and harm the client. The RBT declines and informs the supervisor.",
    es: {
      text: "El padre de un cliente le pide al RBT que cuide al niño los fines de semana a cambio de un pago extra. ¿Qué debe hacer el RBT?",
      options: [
        "Rechazarlo, explicando que crearía una relación múltiple, e informar al supervisor",
        "Aceptar, porque ya conoce bien el plan del aprendiz",
        "Aceptar, siempre que no aplique programas de conducta mientras lo cuida",
        "Aceptar y facturar esas horas como terapia",
      ],
      explanation: "Asumir un segundo rol remunerado con la familia de un cliente es una relación múltiple que puede afectar a la objetividad y perjudicar al cliente. El RBT lo rechaza e informa al supervisor.",
    },
  },
  {
    id: "applied_untrained_procedure",
    concept_id: "professional_scope_refusal",
    text: "The supervisor asks the RBT to start a feeding program today. The RBT has never been trained on this procedure. What is the best response?",
    options: [
      "Explain that she has not been trained on it, and ask for training and observation before implementing it",
      "Implement it and learn as she goes",
      "Refuse and ask to stop working with the client",
      "Watch an online video about feeding programs, then run it",
    ],
    explanation: "RBTs provide services only after demonstrating competence. The professional response is to say so and request training, not to refuse the client or improvise.",
    es: {
      text: "El supervisor le pide a la RBT que empiece hoy un programa de alimentación. Nunca la han formado en ese procedimiento. ¿Cuál es la mejor respuesta?",
      options: [
        "Explicar que no ha recibido formación en ello y pedir formación y observación antes de aplicarlo",
        "Aplicarlo e ir aprendiendo sobre la marcha",
        "Negarse y pedir dejar de trabajar con el cliente",
        "Ver un vídeo en internet sobre programas de alimentación y luego aplicarlo",
      ],
      explanation: "Los RBT prestan servicios solo después de demostrar competencia. Lo profesional es decirlo y pedir formación, no rechazar al cliente ni improvisar.",
    },
  },
  {
    id: "applied_family_values_reinforcer",
    concept_id: "professional_cultural_responsiveness",
    text: "For religious reasons, a family asks that the RBT not use a snack she planned as a reinforcer. What should the RBT do?",
    options: [
      "Respect the request, stop using that item, and work with the supervisor to identify other reinforcers",
      "Keep using the snack, since it is the learner's strongest reinforcer",
      "Ask the family to explain and justify their beliefs",
      "Stop using edible reinforcers with every client",
    ],
    explanation: "Culturally responsive practice respects the family's values. The RBT honors the request and involves the supervisor to adjust the reinforcers, without questioning the family's beliefs.",
    es: {
      text: "Por motivos religiosos, una familia pide que la RBT no use un snack que había previsto como reforzador. ¿Qué debe hacer la RBT?",
      options: [
        "Respetar la petición, dejar de usar ese snack y buscar otros reforzadores junto con el supervisor",
        "Seguir usando el snack, porque es el reforzador más fuerte del aprendiz",
        "Pedir a la familia que explique y justifique sus creencias",
        "Dejar de usar reforzadores comestibles con todos los clientes",
      ],
      explanation: "La práctica culturalmente responsiva respeta los valores de la familia. La RBT atiende la petición e involucra al supervisor para ajustar los reforzadores, sin cuestionar las creencias de la familia.",
    },
  },
];
