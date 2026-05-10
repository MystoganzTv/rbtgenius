/**
 * BACB RBT Test Content Outline (3rd ed.) — effective January 1, 2026.
 *
 * This is the official structure the current RBT exam follows. We keep the
 * legacy `A-1` code shape internally for stability, even though the BACB
 * prints these as `A.1`, `A.2`, etc.
 *
 * Wording is summarized for UI display; do not present these labels as
 * verbatim BACB text.
 */

export const TASK_LIST_SECTIONS = [
  {
    code: "A",
    title: "Data Collection and Graphing",
    title_es: "Recolección de datos y gráficas",
    description: "Collect, summarize, graph, and evaluate the quality of behavioral data.",
    items: [
      { code: "A-1", title: "Implement continuous measurement procedures", title_es: "Implementar procedimientos de medición continua" },
      { code: "A-2", title: "Implement discontinuous measurement procedures", title_es: "Implementar procedimientos de medición discontinua" },
      { code: "A-3", title: "Implement permanent-product recording procedures", title_es: "Implementar registro de producto permanente" },
      { code: "A-4", title: "Enter data and update graphs", title_es: "Ingresar datos y actualizar gráficas" },
      { code: "A-5", title: "Describe behavior and environmental events in observable, measurable terms", title_es: "Describir conducta y eventos ambientales en términos observables y medibles" },
      { code: "A-6", title: "Calculate and summarize data", title_es: "Calcular y resumir datos" },
      { code: "A-7", title: "Identify trends in graphed data", title_es: "Identificar tendencias en datos graficados" },
      { code: "A-8", title: "Identify risks to data reliability and procedural fidelity", title_es: "Identificar riesgos para la confiabilidad de datos y la fidelidad del procedimiento" },
    ],
  },
  {
    code: "B",
    title: "Behavior Assessment",
    title_es: "Evaluación de la conducta",
    description: "Support preference, skill, and functional assessment procedures at the RBT level.",
    items: [
      { code: "B-1", title: "Implement preference assessment procedures", title_es: "Implementar evaluaciones de preferencia" },
      { code: "B-2", title: "Implement individualized skill assessment procedures", title_es: "Implementar evaluaciones individualizadas de habilidades" },
      { code: "B-3", title: "Identify the components of functional assessment procedures", title_es: "Identificar los componentes de evaluaciones funcionales" },
    ],
  },
  {
    code: "C",
    title: "Behavior Acquisition",
    title_es: "Adquisición de conducta",
    description: "Teach new skills using core ABA teaching procedures.",
    items: [
      { code: "C-1", title: "Implement positive and negative reinforcement procedures", title_es: "Implementar reforzamiento positivo y negativo" },
      { code: "C-2", title: "Implement procedures using conditioned reinforcers", title_es: "Implementar procedimientos con reforzadores condicionados" },
      { code: "C-3", title: "Implement discrete-trial teaching procedures", title_es: "Implementar enseñanza por ensayos discretos" },
      { code: "C-4", title: "Implement naturalistic teaching procedures", title_es: "Implementar enseñanza naturalista" },
      { code: "C-5", title: "Implement task-analyzed chaining procedures", title_es: "Implementar encadenamiento con análisis de tareas" },
      { code: "C-6", title: "Implement discrimination training procedures", title_es: "Implementar entrenamiento en discriminación" },
      { code: "C-7", title: "Implement prompts and prompt-fading procedures", title_es: "Implementar prompts y desvanecimiento de prompts" },
      { code: "C-8", title: "Implement generalization procedures", title_es: "Implementar procedimientos de generalización" },
      { code: "C-9", title: "Distinguish maintenance procedures from acquisition procedures", title_es: "Distinguir procedimientos de mantenimiento de los de adquisición" },
      { code: "C-10", title: "Implement shaping procedures", title_es: "Implementar procedimientos de moldeamiento" },
      { code: "C-11", title: "Implement token economy procedures", title_es: "Implementar economía de fichas" },
    ],
  },
  {
    code: "D",
    title: "Behavior Reduction",
    title_es: "Reducción de conducta",
    description: "Apply safe, plan-aligned procedures to decrease challenging behavior.",
    items: [
      { code: "D-1", title: "Identify common functions of problem behavior", title_es: "Identificar funciones comunes de la conducta problema" },
      { code: "D-2", title: "Implement antecedent interventions", title_es: "Implementar intervenciones de antecedente" },
      { code: "D-3", title: "Implement differential reinforcement procedures", title_es: "Implementar reforzamiento diferencial" },
      { code: "D-4", title: "Implement extinction procedures", title_es: "Implementar procedimientos de extinción" },
      { code: "D-5", title: "Implement positive and negative punishment procedures", title_es: "Implementar procedimientos de castigo positivo y negativo" },
      { code: "D-6", title: "Identify secondary effects of extinction and punishment", title_es: "Identificar efectos secundarios de extinción y castigo" },
      { code: "D-7", title: "Implement crisis and emergency procedures according to protocol", title_es: "Implementar procedimientos de crisis y emergencia según protocolo" },
    ],
  },
  {
    code: "E",
    title: "Documentation and Reporting",
    title_es: "Documentación y reporte",
    description: "Communicate clinically relevant information and maintain compliant documentation.",
    items: [
      { code: "E-1", title: "Communicate effectively with supervisor and caregivers", title_es: "Comunicarse eficazmente con supervisor y cuidadores" },
      { code: "E-2", title: "Seek clinical direction from a supervisor when appropriate", title_es: "Buscar dirección clínica del supervisor cuando corresponda" },
      { code: "E-3", title: "Report variables that may affect the client or service delivery", title_es: "Reportar variables que puedan afectar al cliente o al servicio" },
      { code: "E-4", title: "Communicate objective and accurate information in accordance with legal, regulatory, and workplace requirements", title_es: "Comunicar información objetiva y precisa conforme a requisitos legales, regulatorios y laborales" },
    ],
  },
  {
    code: "F",
    title: "Ethics",
    title_es: "Ética",
    description: "Stay inside RBT scope while protecting dignity, safety, privacy, and professionalism.",
    items: [
      { code: "F-1", title: "Identify the core principles underlying the RBT Ethics Code", title_es: "Identificar los principios centrales del Código de Ética del RBT" },
      { code: "F-2", title: "Provide services only after demonstrating competence", title_es: "Prestar servicios solo después de demostrar competencia" },
      { code: "F-3", title: "Provide services only under ongoing supervision", title_es: "Prestar servicios solo bajo supervisión continua" },
      { code: "F-4", title: "Identify effective supervision practices", title_es: "Identificar prácticas efectivas de supervisión" },
      { code: "F-5", title: "Maintain client confidentiality", title_es: "Mantener la confidencialidad del cliente" },
      { code: "F-6", title: "Create and maintain accurate public statements", title_es: "Crear y mantener declaraciones públicas precisas" },
      { code: "F-7", title: "Avoid multiple relationships", title_es: "Evitar relaciones múltiples" },
      { code: "F-8", title: "Follow gift-giving and gift-receiving guidelines", title_es: "Seguir pautas sobre dar y recibir regalos" },
      { code: "F-9", title: "Demonstrate interpersonal and professional skills", title_es: "Demostrar habilidades interpersonales y profesionales" },
      { code: "F-10", title: "Engage in culturally aware and responsive service delivery", title_es: "Brindar servicios con sensibilidad y respuesta cultural" },
    ],
  },
];

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

export function getItemsBySection(sectionCode, language = "en") {
  const section = TASK_LIST_SECTION_BY_CODE[sectionCode];
  if (!section) return [];
  return section.items.map((item) => ({
    code: item.code,
    title: language === "es" ? item.title_es : item.title,
  }));
}
