// ABA technical terms: English term → Spanish explanation
// Format: "term" → "spanish_term / brief explanation in spanish"
export const ABA_GLOSSARY = {
  "treatment integrity": "integridad del tratamiento / seguir el plan exactamente como fue diseñado",
  "fidelity": "fidelidad / implementar el procedimiento exactamente como fue escrito",
  "reinforcement": "refuerzo / consecuencia que aumenta la probabilidad de una conducta en el futuro",
  "positive reinforcement": "refuerzo positivo / agregar algo después de la conducta para aumentarla",
  "negative reinforcement": "refuerzo negativo / retirar algo después de la conducta para aumentarla",
  "punishment": "castigo / consecuencia que disminuye la probabilidad de una conducta",
  "extinction": "extinción / dejar de reforzar una conducta para que disminuya",
  "prompting": "ayudas / señales o apoyos para que el aprendiz dé la respuesta correcta",
  "prompt fading": "desvanecimiento de ayudas / reducir gradualmente las ayudas para lograr independencia",
  "stimulus control": "control de estímulo / la conducta ocurre solo ante ciertos estímulos específicos",
  "shaping": "moldeamiento / reforzar aproximaciones progresivas hacia la conducta objetivo",
  "chaining": "encadenamiento / enseñar una secuencia de pasos uno a la vez",
  "task analysis": "análisis de tarea / dividir una habilidad compleja en pasos pequeños y enseñables",
  "behavior reduction": "reducción de conducta / estrategias para disminuir conductas problemáticas",
  "antecedent": "antecedente / lo que ocurre antes de la conducta",
  "consequence": "consecuencia / lo que ocurre después de la conducta",
  "ABC data": "datos ABC / registro de Antecedente-Conducta-Consecuencia",
  "FBA": "FBA / Evaluación Funcional de la Conducta — identificar por qué ocurre la conducta",
  "baseline": "línea base / nivel de la conducta antes de iniciar la intervención",
  "measurement": "medición / registrar la conducta de forma objetiva y sistemática",
  "frequency recording": "registro de frecuencia / contar cuántas veces ocurre la conducta",
  "duration recording": "registro de duración / medir cuánto tiempo dura la conducta",
  "IOA": "IOA / Acuerdo entre Observadores — mide qué tan consistentes son dos personas al registrar la misma conducta",
  "DTT": "DTT / Entrenamiento en Ensayos Discretos — instrucción estructurada con inicio, respuesta y consecuencia claros",
  "NET": "NET / Enseñanza en Entorno Natural — aprendizaje integrado en actividades cotidianas",
  "preference assessment": "evaluación de preferencias / identificar qué cosas pueden funcionar como reforzadores",
  "reinforcer assessment": "evaluación de reforzadores / confirmar qué consecuencias realmente aumentan la conducta",
  "DRO": "DRO / Refuerzo Diferencial de Otra Conducta — reforzar la ausencia de la conducta problemática",
  "DRA": "DRA / Refuerzo Diferencial de Conducta Alternativa — reforzar una conducta alternativa aceptable",
  "FCT": "FCT / Entrenamiento en Comunicación Funcional — enseñar una forma aceptable de comunicar la misma función",
  "supervision": "supervisión / apoyo y orientación de un profesional certificado (BCBA)",
  "scope of practice": "ámbito de práctica / límites de lo que un RBT está autorizado a hacer",
  "data collection": "recolección de datos / registrar la conducta de forma sistemática durante las sesiones",
  "intervention": "intervención / el plan o procedimiento para cambiar la conducta",
  "generalization": "generalización / la conducta ocurre en diferentes contextos, personas o materiales",
  "maintenance": "mantenimiento / la conducta se mantiene con el tiempo sin reforzamiento constante",
  "pairing": "apareamiento / asociar al terapeuta o materiales con cosas que el aprendiz disfruta",
  "rapport": "rapport / relación de confianza y comodidad entre el aprendiz y el terapeuta",
};

// Extract key terms found in a text string
export function extractKeyTerms(text) {
  if (!text) return [];
  const lower = text.toLowerCase();
  return Object.keys(ABA_GLOSSARY).filter((term) => lower.includes(term.toLowerCase()));
}

// Get glossary entry for a term
export function getGlossaryEntry(term) {
  return ABA_GLOSSARY[term.toLowerCase()] || null;
}
