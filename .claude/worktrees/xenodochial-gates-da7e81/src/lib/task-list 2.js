/**
 * BACB RBT 2.0 Task List — official catalogue.
 *
 * Single source of truth for the 6 sections (A–F) and 37 task items used by
 * the certification exam. Used to:
 *   - Tag every concept/question with a code (e.g. "A-2")
 *   - Compute mastery per section and per item
 *   - Render the progress UI grouped by official structure
 *
 * Reference: BACB RBT Task List 2.0 (effective Nov 2025+).
 *
 * NOTE: Section letters and item numbering match the official task list.
 * Wording is summarized for UI display; do not present these as verbatim
 * BACB language.
 */

export const TASK_LIST_SECTIONS = [
  {
    code: "A",
    title: "Measurement",
    title_es: "Medición",
    description: "Collecting, recording, and graphing behavioral data.",
    items: [
      { code: "A-1", title: "Prepare for data collection", title_es: "Preparar la recolección de datos" },
      { code: "A-2", title: "Implement continuous measurement procedures", title_es: "Implementar medición continua" },
      { code: "A-3", title: "Implement discontinuous measurement procedures", title_es: "Implementar medición discontinua" },
      { code: "A-4", title: "Implement permanent-product recording", title_es: "Implementar registro de producto permanente" },
      { code: "A-5", title: "Enter data and update graphs", title_es: "Ingresar datos y actualizar gráficos" },
      { code: "A-6", title: "Describe behavior and the environment in observable and measurable terms", title_es: "Describir conducta y ambiente en términos observables y medibles" },
    ],
  },
  {
    code: "B",
    title: "Assessment",
    title_es: "Evaluación",
    description: "Assisting with preference, skill, and functional assessments.",
    items: [
      { code: "B-1", title: "Conduct preference assessments", title_es: "Realizar evaluaciones de preferencia" },
      { code: "B-2", title: "Assist with individualized assessment procedures", title_es: "Asistir en evaluaciones individualizadas" },
      { code: "B-3", title: "Assist with functional assessment procedures", title_es: "Asistir en evaluaciones funcionales" },
    ],
  },
  {
    code: "C",
    title: "Skill Acquisition",
    title_es: "Adquisición de habilidades",
    description: "Teaching new skills using evidence-based ABA procedures.",
    items: [
      { code: "C-1", title: "Identify the components of a written skill acquisition plan", title_es: "Identificar componentes del plan de adquisición" },
      { code: "C-2", title: "Prepare for the session as required by the skill acquisition plan", title_es: "Preparar la sesión según el plan" },
      { code: "C-3", title: "Use contingencies of reinforcement", title_es: "Usar contingencias de reforzamiento" },
      { code: "C-4", title: "Implement discrete-trial teaching", title_es: "Implementar enseñanza por ensayos discretos (DTT)" },
      { code: "C-5", title: "Implement naturalistic teaching procedures", title_es: "Implementar enseñanza naturalista (NET)" },
      { code: "C-6", title: "Implement task-analyzed chaining", title_es: "Implementar encadenamiento por análisis de tareas" },
      { code: "C-7", title: "Implement discrimination training", title_es: "Implementar entrenamiento en discriminación" },
      { code: "C-8", title: "Implement stimulus-control transfer procedures", title_es: "Transferir control de estímulos" },
      { code: "C-9", title: "Implement prompt and prompt-fading procedures", title_es: "Implementar prompts y desvanecimiento" },
      { code: "C-10", title: "Implement generalization and maintenance procedures", title_es: "Implementar generalización y mantenimiento" },
      { code: "C-11", title: "Implement shaping procedures", title_es: "Implementar modelado por aproximaciones (shaping)" },
      { code: "C-12", title: "Implement token economy procedures", title_es: "Implementar economía de fichas" },
    ],
  },
  {
    code: "D",
    title: "Behavior Reduction",
    title_es: "Reducción de conductas",
    description: "Applying interventions to decrease problem behavior safely.",
    items: [
      { code: "D-1", title: "Identify essential components of a written behavior-reduction plan", title_es: "Identificar componentes del plan de reducción" },
      { code: "D-2", title: "Describe common functions of behavior", title_es: "Describir funciones comunes de la conducta" },
      { code: "D-3", title: "Implement interventions based on modification of antecedents", title_es: "Intervenciones basadas en antecedentes" },
      { code: "D-4", title: "Implement differential reinforcement", title_es: "Implementar reforzamiento diferencial" },
      { code: "D-5", title: "Implement extinction procedures", title_es: "Implementar procedimientos de extinción" },
      { code: "D-6", title: "Implement crisis/emergency procedures according to protocol", title_es: "Implementar procedimientos de crisis/emergencia" },
    ],
  },
  {
    code: "E",
    title: "Documentation and Reporting",
    title_es: "Documentación y reporte",
    description: "Recording sessions, supervisor communication, and compliance.",
    items: [
      { code: "E-1", title: "Effectively communicate with a supervisor in an ongoing manner", title_es: "Comunicación continua con el supervisor" },
      { code: "E-2", title: "Actively seek clinical direction from supervisor in a timely manner", title_es: "Buscar dirección clínica oportuna" },
      { code: "E-3", title: "Report other variables that might affect the client", title_es: "Reportar variables que afectan al cliente" },
      { code: "E-4", title: "Generate objective session notes", title_es: "Generar notas de sesión objetivas" },
      { code: "E-5", title: "Comply with applicable legal, regulatory, and workplace requirements", title_es: "Cumplir requisitos legales y de centro de trabajo" },
    ],
  },
  {
    code: "F",
    title: "Professional Conduct and Scope of Practice",
    title_es: "Conducta profesional y alcance",
    description: "Ethics, supervision, boundaries, and stakeholder communication.",
    items: [
      { code: "F-1", title: "Describe the BACB's RBT supervision requirements and the role of the RBT", title_es: "Describir requisitos de supervisión y rol del RBT" },
      { code: "F-2", title: "Respond appropriately to feedback and improve performance", title_es: "Responder apropiadamente a la retroalimentación" },
      { code: "F-3", title: "Communicate with stakeholders as authorized", title_es: "Comunicar con partes interesadas según autorización" },
      { code: "F-4", title: "Maintain professional boundaries", title_es: "Mantener límites profesionales" },
      { code: "F-5", title: "Maintain client dignity", title_es: "Mantener la dignidad del cliente" },
    ],
  },
];

// Indexes computed once at import time for cheap lookups.
export const TASK_LIST_SECTION_BY_CODE = TASK_LIST_SECTIONS.reduce((result, section) => {
  result[section.code] = section;
  return result;
}, {});

export const TASK_LIST_ITEM_BY_CODE = TASK_LIST_SECTIONS.flatMap((section) =>
  section.items.map((item) => ({ ...item, section_code: section.code })),
).reduce((result, item) => {
  result[item.code] = item;
  return result;
}, {});

export const TASK_LIST_ALL_CODES = Object.keys(TASK_LIST_ITEM_BY_CODE);

/**
 * "A-2" → "A". Returns null for invalid codes so callers can guard.
 */
export function getSectionCode(itemCode) {
  if (!itemCode || typeof itemCode !== "string") return null;
  const [section] = itemCode.split("-");
  return TASK_LIST_SECTION_BY_CODE[section] ? section : null;
}

export function getSectionTitle(sectionCode, language = "en") {
  const section = TASK_LIST_SECTION_BY_CODE[sectionCode];
  if (!section) return sectionCode;
  return language === "es" ? section.title_es : section.title;
}

export function getItemTitle(itemCode, language = "en") {
  const item = TASK_LIST_ITEM_BY_CODE[itemCode];
  if (!item) return itemCode;
  return language === "es" ? item.title_es : item.title;
}

/**
 * Convenience: returns an array of { code, title } for every item under a
 * given section, ordered by item number.
 */
export function getItemsBySection(sectionCode, language = "en") {
  const section = TASK_LIST_SECTION_BY_CODE[sectionCode];
  if (!section) return [];
  return section.items.map((item) => ({
    code: item.code,
    title: language === "es" ? item.title_es : item.title,
  }));
}
