import { additionalOfficialQuestionConcepts } from "./question-bank-official-expansion.js";
import {
  CONCEPT_TO_TASK_LIST,
  getTaskListCode,
  getTaskListSection,
  validateConceptCoverage,
} from "./concept-task-list-map.js";

export const topicLabels = {
  measurement: "Measurement",
  assessment: "Assessment",
  skill_acquisition: "Skill Acquisition",
  behavior_reduction: "Behavior Reduction",
  documentation: "Documentation",
  professional_conduct: "Ethics",
};

export const PRACTICE_BATCH_SIZE = 24;

const OFFICIAL_CONCEPT_IDS = new Set([
  "measurement_frequency",
  "measurement_duration",
  "measurement_latency",
  "measurement_partial_interval",
  "measurement_whole_interval",
  "measurement_momentary_time_sampling",
  "measurement_permanent_product",
  "measurement_rate",
  "measurement_trial_by_trial",
  "measurement_ioa",
  "measurement_continuous",
  "measurement_discontinuous",
  "assessment_abc",
  "assessment_operational_definition",
  "assessment_preference",
  "assessment_reinforcer",
  "assessment_baseline",
  "assessment_scatterplot",
  "assessment_indirect",
  "assessment_direct",
  "assessment_interview",
  "assessment_paired_stimulus",
  "assessment_mswo",
  "assessment_fba",
  "skill_least_to_most",
  "skill_prompt_fading",
  "skill_shaping",
  "skill_task_analysis",
  "skill_total_task",
  "skill_forward_chaining",
  "skill_backward_chaining",
  "skill_dtt",
  "skill_net",
  "skill_discrimination_training",
  "skill_errorless_teaching",
  "skill_generalization",
  "skill_maintenance",
  "skill_time_delay",
  "behavior_extinction",
  "behavior_fct",
  "behavior_antecedent",
  "behavior_blocking",
  "behavior_noncontingent_reinforcement",
  "behavior_dro",
  "behavior_dri",
  "behavior_rird",
  "behavior_high_p",
  "behavior_dra_specific",
  "behavior_escape_extinction",
  "behavior_response_cost",
  "behavior_planned_ignoring",
  "behavior_extinction_burst",
  "documentation_notes",
  "documentation_immediate_entry",
  "documentation_incident_report",
  "documentation_integrity",
  "documentation_prompt_levels",
  "documentation_trial_by_trial",
  "documentation_abc_note",
  "documentation_mastery_tracking",
  "documentation_service_verification",
  "documentation_data_summary",
  "documentation_timestamp",
  "documentation_caregiver_log",
  "professional_scope",
  "professional_supervision",
  "professional_confidentiality",
  "professional_boundaries",
  "professional_safety",
  "professional_assent",
  "professional_dignity",
  "professional_communication",
  "professional_cultural_responsiveness",
  "professional_conflict_of_interest",
  "professional_mandated_reporting",
  "professional_record_honesty",
  // Newly activated — beginner/intermediate, RBT task list eligible
  "skill_token_economy",
  "skill_incidental_teaching",
  "skill_prompt_hierarchy",
  "skill_reinforcer_pairing",
  "behavior_dra",
  "measurement_count",
  "measurement_percentage",
  "measurement_event_recording",
  "assessment_skill",
  "assessment_free_operant",
  "behavior_drr",
  "documentation_preference_update",
  "documentation_absence_note",
  "documentation_material_change",
  "documentation_reinforcement_log",
  "documentation_session_objective",
  "documentation_signature_compliance",
  "documentation_environmental_context",
  "professional_following_plan",
  "professional_caregiver_respect",
  "professional_social_media",
  "professional_private_information_security",
  "professional_supervisor_notification",
  "professional_scope_refusal",
  "professional_professionalism_under_stress",
  "professional_chain_of_command",
  "professional_nonjudgmental_language",
  "professional_consistency",
  "professional_documentation_timeliness",
  // Base bank re-activations — newly mapped to TCO 3rd Edition codes
  "documentation_graphing",
  "measurement_accuracy",
  "measurement_opportunity_based",
  "assessment_descriptive",
  "assessment_target_behavior_selection",
  "assessment_task_analysis_probe",
  "documentation_behavior_frequency_summary",
  "assessment_hypothesis_statement",
  "skill_choral_responding",
  "behavior_contingency_review",
  "measurement_magnitude",
]);

const allQuestionConcepts = [
  {
    id: "measurement_frequency",
    topic: "measurement",
    difficulty: "beginner",
    answer: "Frequency recording",
    definition: "the RBT counts each instance of a target behavior during the observation period.",
    scenario:
      "An RBT wants the exact number of times a learner hits the table during a 20-minute session.",
    purpose: "To capture how often a behavior occurs.",
    explanation:
      "Frequency recording is used when the team needs an exact count of how many times behavior happened.",
  },
  {
    id: "measurement_duration",
    topic: "measurement",
    difficulty: "beginner",
    answer: "Duration recording",
    definition: "the RBT measures how long a behavior lasts from start to finish.",
    scenario:
      "A learner cries for several minutes at a time, and the team wants to measure how long each episode lasts.",
    purpose: "To measure the length of time a behavior continues.",
    explanation:
      "Duration recording tracks how long the response lasts, not how many times it happens.",
  },
  {
    id: "measurement_latency",
    topic: "measurement",
    difficulty: "intermediate",
    answer: "Latency recording",
    definition: "the RBT measures the time between an instruction and the start of the response.",
    scenario:
      "The team wants to know how long it takes a learner to begin cleaning up after the instruction is given.",
    purpose: "To measure how quickly a behavior starts after a cue.",
    explanation:
      "Latency recording is used when the delay between a cue and the response matters clinically.",
  },
  {
    id: "measurement_partial_interval",
    topic: "measurement",
    difficulty: "intermediate",
    answer: "Partial interval recording",
    definition: "the interval is scored if behavior happened at any time during that interval.",
    scenario:
      "During recess, an RBT marks the interval as yes if yelling occurs at least once during each 30-second block.",
    purpose: "To note whether behavior occurred at any point during each interval.",
    explanation:
      "Partial interval recording marks behavior as present if it occurs at any point in the interval.",
  },
  {
    id: "measurement_permanent_product",
    topic: "measurement",
    difficulty: "intermediate",
    answer: "Permanent product recording",
    definition:
      "the team evaluates behavior by reviewing a lasting outcome instead of watching it happen live.",
    scenario:
      "A supervisor counts how many math problems were completed correctly after the worksheet is finished.",
    purpose: "To measure behavior by looking at its lasting result.",
    explanation:
      "Permanent product data rely on an observable result, such as completed work or cleaned materials.",
  },
  {
    id: "assessment_abc",
    topic: "assessment",
    difficulty: "beginner",
    answer: "ABC data",
    definition:
      "the RBT records what happened before the behavior, the behavior itself, and what happened after.",
    scenario:
      "A learner drops to the floor, and the team wants to identify patterns around what triggers and follows the behavior.",
    purpose: "To look for patterns between antecedents, behavior, and consequences.",
    explanation:
      "ABC data help the team see relationships between triggers, the behavior, and the maintaining consequence.",
  },
  {
    id: "assessment_operational_definition",
    topic: "assessment",
    difficulty: "beginner",
    answer: "Operational definition",
    definition:
      "a behavior is described in observable, measurable terms so different staff can identify it the same way.",
    scenario:
      "Before collecting data on aggression, the team writes a description that includes only actions that can be seen and counted.",
    purpose: "To make behavior descriptions objective and consistent.",
    explanation:
      "Operational definitions reduce guesswork and help different staff collect data on the same response consistently.",
  },
  {
    id: "assessment_preference",
    topic: "assessment",
    difficulty: "beginner",
    answer: "Preference assessment",
    definition: "items or activities are systematically tested to identify likely reinforcers.",
    scenario:
      "An RBT rotates toys and snacks to see which items the learner chooses most often.",
    purpose: "To identify items or activities that may function as reinforcers.",
    explanation:
      "Preference assessments help the team identify what the learner is likely to work for during teaching.",
  },
  {
    id: "assessment_baseline",
    topic: "assessment",
    difficulty: "intermediate",
    answer: "Baseline data",
    definition: "data are collected before a new intervention starts.",
    scenario:
      "Before introducing a new prompting plan, the BCBA asks the RBT to measure current performance for several sessions.",
    purpose: "To understand current behavior levels before changing treatment.",
    explanation:
      "Baseline data show the learner's starting point so later changes can be interpreted accurately.",
  },
  {
    id: "assessment_scatterplot",
    topic: "assessment",
    difficulty: "advanced",
    answer: "Scatterplot assessment",
    definition:
      "behavior data are plotted across times of day to see when patterns happen most often.",
    scenario:
      "A school team maps aggressive behavior by hour to see whether it happens more during lunch, recess, or classwork.",
    purpose: "To detect time-based patterns in behavior.",
    explanation:
      "A scatterplot is useful when the team suspects behavior is more likely at particular times of day.",
  },
  {
    id: "skill_least_to_most",
    topic: "skill_acquisition",
    difficulty: "beginner",
    answer: "Least-to-most prompting",
    definition:
      "the RBT starts with the least intrusive prompt and increases help only as needed.",
    scenario:
      "During handwashing training, the RBT begins with a verbal cue and only adds modeling or physical guidance if needed.",
    purpose: "To encourage independence before adding more intrusive help.",
    explanation:
      "Least-to-most prompting preserves the chance for independent responding before stronger prompts are added.",
  },
  {
    id: "skill_prompt_fading",
    topic: "skill_acquisition",
    difficulty: "intermediate",
    answer: "Prompt fading",
    definition:
      "prompts are gradually reduced so control transfers to the natural cue.",
    scenario:
      "A learner first needs a model to label pictures, but the RBT systematically removes that help over time.",
    purpose: "To transfer stimulus control and build independent responding.",
    explanation:
      "Prompt fading helps the learner respond to the natural cue instead of depending on the prompt.",
  },
  {
    id: "skill_shaping",
    topic: "skill_acquisition",
    difficulty: "intermediate",
    answer: "Shaping",
    definition: "successive approximations of the target behavior are reinforced.",
    scenario:
      "A learner is reinforced first for saying 'ba,' then 'ball,' as the team works toward a full spoken request.",
    purpose: "To build a new skill by reinforcing closer and closer approximations.",
    explanation:
      "Shaping is useful when the final target behavior does not happen yet and smaller approximations must be reinforced first.",
  },
  {
    id: "skill_task_analysis",
    topic: "skill_acquisition",
    difficulty: "beginner",
    answer: "Task analysis",
    definition: "a complex skill is broken into smaller teachable steps.",
    scenario:
      "To teach brushing teeth, the team lists each part of the routine in the order it should be completed.",
    purpose: "To turn a complex routine into smaller teachable steps.",
    explanation:
      "Task analysis breaks a chain into clear steps so instruction can be delivered more systematically.",
  },
  {
    id: "skill_total_task",
    topic: "skill_acquisition",
    difficulty: "advanced",
    answer: "Total task chaining",
    definition:
      "the learner practices every step of the chain during each teaching opportunity.",
    scenario:
      "During snack preparation, the learner completes every step in order with support where needed.",
    purpose: "To teach an entire chained skill within each trial.",
    explanation:
      "Total task chaining involves completing the whole chain each time rather than just one link.",
  },
  {
    id: "behavior_dra",
    topic: "behavior_reduction",
    difficulty: "beginner",
    answer: "Differential reinforcement",
    definition:
      "reinforcement is delivered for a desired alternative or incompatible response while problem behavior is not reinforced.",
    scenario:
      "An RBT gives attention for raising a hand but withholds attention for yelling out.",
    purpose: "To increase appropriate behavior while reducing problem behavior.",
    explanation:
      "Differential reinforcement builds a better response while reducing reinforcement for the problem behavior.",
  },
  {
    id: "behavior_extinction",
    topic: "behavior_reduction",
    difficulty: "intermediate",
    answer: "Extinction",
    definition:
      "the consequence that previously maintained the behavior is no longer delivered.",
    scenario:
      "A learner screams for tablet access, and staff stop providing the tablet after screaming while teaching an alternative request.",
    purpose: "To reduce a behavior by no longer delivering the maintaining consequence.",
    explanation:
      "Extinction works by withholding the reinforcer that previously kept the behavior going.",
  },
  {
    id: "behavior_fct",
    topic: "behavior_reduction",
    difficulty: "intermediate",
    answer: "Functional communication training",
    definition:
      "the learner is taught a communication response that serves the same function as the problem behavior.",
    scenario:
      "Instead of hitting to escape work, a learner is taught to request a break appropriately.",
    purpose: "To replace problem behavior with an effective communication response.",
    explanation:
      "Functional communication training teaches a safer, more acceptable response that meets the same need.",
  },
  {
    id: "behavior_antecedent",
    topic: "behavior_reduction",
    difficulty: "beginner",
    answer: "Antecedent intervention",
    definition:
      "the environment is changed before behavior occurs to reduce the likelihood of the problem behavior.",
    scenario:
      "An RBT uses a visual schedule and warnings before transitions because transitions usually trigger tantrums.",
    purpose: "To prevent problem behavior by changing triggers before it starts.",
    explanation:
      "Antecedent interventions reduce the chance that the response will happen in the first place.",
  },
  {
    id: "behavior_blocking",
    topic: "behavior_reduction",
    difficulty: "advanced",
    answer: "Response blocking",
    definition:
      "the RBT physically interrupts behavior in the moment to prevent contact with reinforcement or harm, following the plan.",
    scenario:
      "During mouthing behavior, the RBT gently blocks the response as directed by the behavior plan.",
    purpose: "To interrupt unsafe or targeted behavior in the moment as outlined in the plan.",
    explanation:
      "Response blocking is an immediate intervention used only as described in the plan and often for safety.",
  },
  {
    id: "documentation_notes",
    topic: "documentation",
    difficulty: "beginner",
    answer: "Objective session notes",
    definition: "notes describe observable events and data without opinions or labels.",
    scenario:
      "Instead of writing that a client was lazy, the RBT documents that the client completed 3 of 10 tasks and left the table twice.",
    purpose: "To keep records factual, professional, and useful for clinical decisions.",
    explanation:
      "Objective notes focus on what happened and what data were collected, not on opinions or assumptions.",
  },
  {
    id: "documentation_graphing",
    topic: "documentation",
    difficulty: "intermediate",
    answer: "Graphing data",
    definition: "data are displayed visually so trends and changes can be reviewed over time.",
    scenario:
      "A BCBA asks the RBT to update the graph so the team can see whether independent manding has increased this month.",
    purpose: "To make behavior trends easier to review and interpret.",
    explanation:
      "Graphs make patterns and changes over time easier for the clinical team to spot quickly.",
  },
  {
    id: "documentation_immediate_entry",
    topic: "documentation",
    difficulty: "beginner",
    answer: "Immediate data entry",
    definition:
      "data are recorded as soon as possible after the behavior or teaching trial.",
    scenario:
      "After each discrete trial, the RBT enters the response immediately instead of waiting until the end of session.",
    purpose: "To improve accuracy by recording information while it is still fresh.",
    explanation:
      "Recording data right away reduces memory errors and makes the record more reliable.",
  },
  {
    id: "documentation_incident_report",
    topic: "documentation",
    difficulty: "advanced",
    answer: "Incident reporting",
    definition:
      "a significant event is documented according to policy and communicated promptly.",
    scenario:
      "A client falls during session and needs first aid, so the RBT completes the required report and notifies the supervisor.",
    purpose: "To document serious events clearly and communicate them through the correct process.",
    explanation:
      "Incident reports are required when important events affect safety, health, or the integrity of services.",
  },
  {
    id: "documentation_integrity",
    topic: "documentation",
    difficulty: "intermediate",
    answer: "Treatment integrity",
    definition: "procedures are implemented the way the plan was written.",
    scenario:
      "The BCBA checks whether the RBT is delivering prompts and reinforcement exactly as the program specifies.",
    purpose: "To make sure the intervention is carried out as designed.",
    explanation:
      "Treatment integrity matters because even good plans do not work as intended if they are implemented inconsistently.",
  },
  {
    id: "professional_scope",
    topic: "professional_conduct",
    difficulty: "beginner",
    answer: "Scope of competence",
    definition:
      "the RBT works only within the tasks, training, and authorization allowed for the role.",
    scenario:
      "A parent asks the RBT to change the behavior plan, but the RBT knows treatment changes must go through the BCBA.",
    purpose: "To protect the client by staying within the responsibilities of the RBT role.",
    explanation:
      "RBTs should not make independent treatment changes outside their role or training.",
  },
  {
    id: "professional_supervision",
    topic: "professional_conduct",
    difficulty: "beginner",
    answer: "Seeking supervision",
    definition: "the RBT seeks feedback or guidance when unsure how to proceed.",
    scenario:
      "An intervention is not going as expected, so the RBT brings data and questions to the supervisor instead of improvising.",
    purpose: "To keep services accurate and safe by involving supervision when needed.",
    explanation:
      "Seeking supervision protects the client and keeps services aligned with the treatment plan.",
  },
  {
    id: "professional_confidentiality",
    topic: "professional_conduct",
    difficulty: "beginner",
    answer: "Confidentiality",
    definition:
      "client information is shared only with authorized people and through appropriate channels.",
    scenario:
      "An RBT avoids discussing a client's treatment details with friends and keeps session documents secure.",
    purpose: "To protect private client information.",
    explanation:
      "Confidentiality requires protecting private information in conversation, storage, and communication.",
  },
  {
    id: "professional_boundaries",
    topic: "professional_conduct",
    difficulty: "intermediate",
    answer: "Professional boundaries",
    definition:
      "relationships with clients and families stay therapeutic and professional rather than social or personal.",
    scenario:
      "A family invites the RBT to babysit on weekends, and the RBT declines and keeps the relationship professional.",
    purpose: "To avoid conflicts of interest and preserve a professional relationship.",
    explanation:
      "Clear professional boundaries protect the therapeutic relationship and reduce conflicts of interest.",
  },
  {
    id: "professional_safety",
    topic: "professional_conduct",
    difficulty: "advanced",
    answer: "Safety escalation",
    definition:
      "urgent safety or abuse concerns are reported right away through the proper channels.",
    scenario:
      "An RBT notices injuries and hears statements that raise possible abuse concerns, so the RBT follows reporting policy immediately.",
    purpose: "To protect the client by reporting serious safety concerns without delay.",
    explanation:
      "Potential abuse or urgent safety concerns must be escalated immediately according to policy and law.",
  },
  {
    id: "measurement_rate",
    topic: "measurement",
    difficulty: "intermediate",
    answer: "Rate recording",
    definition: "the count of behavior is compared against the amount of observation time.",
    scenario:
      "One session lasts 15 minutes and another lasts 30, so the team wants a measure that allows fair comparison of how often calling out occurred.",
    purpose: "To compare behavior frequency across unequal observation periods.",
    explanation:
      "Rate recording standardizes counts by time, which is useful when observation periods differ in length.",
  },
  {
    id: "measurement_whole_interval",
    topic: "measurement",
    difficulty: "intermediate",
    answer: "Whole interval recording",
    definition: "the interval is scored only if the behavior lasted for the entire interval.",
    scenario:
      "An RBT marks on-task behavior only when the learner stayed engaged during the full 20-second interval.",
    purpose: "To identify whether behavior lasted through an entire interval.",
    explanation:
      "Whole interval recording requires the behavior to occur for the entire interval before it is scored.",
  },
  {
    id: "measurement_momentary_time_sampling",
    topic: "measurement",
    difficulty: "intermediate",
    answer: "Momentary time sampling",
    definition: "the observer checks for behavior only at specific moments in time.",
    scenario:
      "Every minute, the RBT glances up to see whether the learner is seated at that exact moment.",
    purpose: "To check whether behavior is happening at a specific instant.",
    explanation:
      "Momentary time sampling reduces continuous observation demands by checking behavior at preset moments.",
  },
  {
    id: "measurement_trial_by_trial",
    topic: "measurement",
    difficulty: "beginner",
    answer: "Trial-by-trial data",
    definition: "the RBT records the outcome of each teaching opportunity separately.",
    scenario:
      "During a table session, the RBT marks correct, incorrect, or prompted for every individual trial.",
    purpose: "To record performance on each teaching opportunity separately.",
    explanation:
      "Trial-by-trial data are useful during structured teaching because each opportunity is scored individually.",
  },
  {
    id: "measurement_ioa",
    topic: "measurement",
    difficulty: "advanced",
    answer: "Interobserver agreement",
    definition: "two observers collect data on the same behavior and compare how closely their records match.",
    scenario:
      "A BCBA observes alongside the RBT to confirm they are both recording aggression in the same way.",
    purpose: "To check whether two observers recorded behavior consistently.",
    explanation:
      "Interobserver agreement helps verify that behavior definitions and data collection are reliable.",
  },
  {
    id: "assessment_indirect",
    topic: "assessment",
    difficulty: "beginner",
    answer: "Indirect assessment",
    definition: "information about behavior is gathered through interviews, checklists, or rating forms.",
    scenario:
      "Before observing directly, the team asks caregivers and teachers structured questions about when problem behavior usually happens.",
    purpose: "To gather information about behavior from interviews, forms, or rating scales.",
    explanation:
      "Indirect assessment provides useful background information but does not replace direct observation.",
  },
  {
    id: "assessment_interview",
    topic: "assessment",
    difficulty: "beginner",
    answer: "Caregiver interview",
    definition: "the team speaks with someone familiar with the learner to gather history and context.",
    scenario:
      "A parent describes common triggers, routines, and preferences before a new case begins.",
    purpose: "To collect background information from someone who knows the learner well.",
    explanation:
      "Interviews can clarify routines, concerns, and context that may not be visible during one observation alone.",
  },
  {
    id: "assessment_reinforcer",
    topic: "assessment",
    difficulty: "intermediate",
    answer: "Reinforcer assessment",
    definition: "the team tests whether an item actually increases responding rather than only being preferred.",
    scenario:
      "A learner likes stickers, but the RBT checks whether stickers really increase correct responding during teaching.",
    purpose: "To confirm whether a preferred item actually increases responding.",
    explanation:
      "Something can be preferred without functioning as a reinforcer, so direct testing may be needed.",
  },
  {
    id: "assessment_skill",
    topic: "assessment",
    difficulty: "intermediate",
    answer: "Skill assessment",
    definition: "the learner's current strengths and deficits are tested across target areas.",
    scenario:
      "Before writing new goals, the BCBA reviews which receptive and expressive skills the learner already performs independently.",
    purpose: "To identify which component skills are already mastered and which still need teaching.",
    explanation:
      "Skill assessments help the team choose targets that fit the learner's current repertoire.",
  },
  {
    id: "assessment_functional_analysis",
    topic: "assessment",
    difficulty: "advanced",
    answer: "Functional analysis",
    definition: "conditions are systematically arranged to test which consequences may maintain the behavior.",
    scenario:
      "Under BCBA oversight, different test conditions are run to see whether escape, attention, or tangibles are driving the behavior.",
    purpose: "To test which consequence is maintaining the behavior under controlled conditions.",
    explanation:
      "A functional analysis experimentally tests behavior function rather than inferring it only from descriptive data.",
  },
  {
    id: "skill_discrimination_training",
    topic: "skill_acquisition",
    difficulty: "intermediate",
    answer: "Discrimination training",
    definition: "the learner is taught to respond one way to a relevant cue and differently when that cue is absent.",
    scenario:
      "A learner is reinforced for touching the red card when asked for red, but not for touching other colors.",
    purpose: "To teach the learner to respond differently to relevant cues.",
    explanation:
      "Discrimination training builds accurate responding under the correct stimulus conditions.",
  },
  {
    id: "skill_errorless_teaching",
    topic: "skill_acquisition",
    difficulty: "intermediate",
    answer: "Errorless teaching",
    definition: "the RBT provides enough support immediately to reduce the chance of mistakes during early learning.",
    scenario:
      "When introducing a new receptive label, the RBT prompts right away so the learner contacts success from the start.",
    purpose: "To minimize mistakes during initial instruction by providing immediate support.",
    explanation:
      "Errorless teaching is often used early in instruction so the learner practices the correct response more often than errors.",
  },
  {
    id: "skill_token_economy",
    topic: "skill_acquisition",
    difficulty: "beginner",
    answer: "Token economy",
    definition: "the learner earns conditioned reinforcers that can later be exchanged for a backup item or activity.",
    scenario:
      "A learner earns stars for completed tasks and trades five stars for extra drawing time.",
    purpose: "To build motivation by pairing target behavior with tokens that can be exchanged later.",
    explanation:
      "A token economy uses tokens as conditioned reinforcers linked to a later backup reinforcer.",
  },
  {
    id: "skill_generalization",
    topic: "skill_acquisition",
    difficulty: "advanced",
    answer: "Generalization programming",
    definition: "instruction is planned so a skill transfers across people, materials, and settings.",
    scenario:
      "After a learner mands in the clinic, the team practices the same skill at home and with different staff members.",
    purpose: "To help a skill transfer across people, settings, and materials.",
    explanation:
      "Generalization programming is intentional and helps a learned skill show up outside the original teaching setup.",
  },
  {
    id: "skill_maintenance",
    topic: "skill_acquisition",
    difficulty: "intermediate",
    answer: "Maintenance programming",
    definition: "previously learned skills are scheduled for periodic review after mastery.",
    scenario:
      "A target is already mastered, but the learner still practices it once a week so the skill stays strong.",
    purpose: "To keep a learned skill strong after initial mastery.",
    explanation:
      "Maintenance ensures mastered skills continue over time instead of dropping once formal teaching stops.",
  },
  {
    id: "behavior_noncontingent_reinforcement",
    topic: "behavior_reduction",
    difficulty: "advanced",
    answer: "Noncontingent reinforcement",
    definition: "reinforcement is delivered on a time-based schedule rather than after the target behavior.",
    scenario:
      "To reduce attention-seeking interruptions, the learner receives scheduled attention every few minutes regardless of behavior.",
    purpose: "To reduce motivation for problem behavior by delivering reinforcement on a schedule.",
    explanation:
      "Noncontingent reinforcement can reduce the value of the reinforcer that was previously maintaining the problem behavior.",
  },
  {
    id: "behavior_dro",
    topic: "behavior_reduction",
    difficulty: "intermediate",
    answer: "Differential reinforcement of other behavior",
    definition: "reinforcement is delivered when the problem behavior has not happened for a set period.",
    scenario:
      "A learner earns praise and a token each time a two-minute interval passes without yelling.",
    purpose: "To reinforce periods in which the problem behavior does not occur.",
    explanation:
      "DRO focuses on reinforcing the absence of the target behavior for a defined interval.",
  },
  {
    id: "behavior_dri",
    topic: "behavior_reduction",
    difficulty: "intermediate",
    answer: "Differential reinforcement of incompatible behavior",
    definition: "reinforcement is delivered for a response that cannot occur at the same time as the problem behavior.",
    scenario:
      "A learner is reinforced for keeping hands in pockets while walking, which cannot happen at the same time as hitting.",
    purpose: "To reinforce a behavior that cannot happen at the same time as the problem behavior.",
    explanation:
      "DRI works by strengthening a response that is physically incompatible with the problem behavior.",
  },
  {
    id: "behavior_rird",
    topic: "behavior_reduction",
    difficulty: "advanced",
    answer: "Response interruption and redirection",
    definition: "the problem response is interrupted and the learner is redirected to an appropriate alternative.",
    scenario:
      "A learner begins scripting repetitively, and the RBT interrupts briefly and redirects to answering simple social questions.",
    purpose: "To interrupt repetitive behavior and redirect toward a more appropriate response.",
    explanation:
      "Response interruption and redirection is commonly used for repetitive responses when specified in the plan.",
  },
  {
    id: "behavior_high_p",
    topic: "behavior_reduction",
    difficulty: "intermediate",
    answer: "High-probability request sequence",
    definition: "several easy requests are presented before a difficult one to build momentum.",
    scenario:
      "Before asking a learner to start handwriting, the RBT presents three easy motor responses the learner almost always follows.",
    purpose: "To build behavioral momentum before presenting a low-probability demand.",
    explanation:
      "A high-probability sequence can increase compliance by creating momentum with easy requests first.",
  },
  {
    id: "documentation_prompt_levels",
    topic: "documentation",
    difficulty: "beginner",
    answer: "Prompt level documentation",
    definition: "records show how much assistance was needed on each response.",
    scenario:
      "A data sheet includes whether each answer was independent, verbally prompted, modeled, or physically prompted.",
    purpose: "To show how much assistance the learner needed on each response.",
    explanation:
      "Prompt level documentation helps the team evaluate independence and when prompts can be faded.",
  },
  {
    id: "documentation_trial_by_trial",
    topic: "documentation",
    difficulty: "beginner",
    answer: "Trial-by-trial documentation",
    definition: "performance is scored separately for each teaching opportunity rather than only at the end of session.",
    scenario:
      "The RBT records correct, incorrect, and prompted for every card sort trial during DTT.",
    purpose: "To capture learner performance on each teaching opportunity separately.",
    explanation:
      "Trial-by-trial documentation gives a more detailed record of performance during structured instruction.",
  },
  {
    id: "documentation_abc_note",
    topic: "documentation",
    difficulty: "intermediate",
    answer: "ABC narrative note",
    definition: "a significant behavior episode is summarized by describing antecedent, behavior, and consequence in sequence.",
    scenario:
      "After an elopement episode, the RBT writes what happened before, exactly what the learner did, and what followed.",
    purpose: "To summarize the context of a significant behavior episode in sequence.",
    explanation:
      "An ABC narrative note is helpful when the team needs contextual detail around an important incident.",
  },
  {
    id: "documentation_mastery_tracking",
    topic: "documentation",
    difficulty: "intermediate",
    answer: "Mastery criterion tracking",
    definition: "ongoing records are compared against the program's stated mastery requirement.",
    scenario:
      "The BCBA checks whether a target has met 90 percent independent correct responding across three sessions.",
    purpose: "To determine whether a target meets the program's mastery requirement.",
    explanation:
      "Mastery tracking prevents staff from moving on too early or keeping a target too long without criteria.",
  },
  {
    id: "documentation_service_verification",
    topic: "documentation",
    difficulty: "advanced",
    answer: "Service verification documentation",
    definition: "records confirm the date, time, location, and delivery of authorized services.",
    scenario:
      "At the end of session, the RBT confirms attendance, service time, and required signatures according to agency policy.",
    purpose: "To confirm when and where authorized services were delivered.",
    explanation:
      "Service verification documentation supports compliance, scheduling accuracy, and billing integrity.",
  },
  {
    id: "professional_assent",
    topic: "professional_conduct",
    difficulty: "intermediate",
    answer: "Assent monitoring",
    definition: "the RBT watches for signs the learner is willing or unwilling to participate and responds appropriately.",
    scenario:
      "A learner pushes materials away and withdraws, so the RBT pauses and communicates this to the supervisor.",
    purpose: "To watch for signs the learner is willing or unwilling to participate.",
    explanation:
      "Monitoring assent supports ethical treatment and can guide when to pause, adjust, or seek support.",
  },
  {
    id: "professional_dignity",
    topic: "professional_conduct",
    difficulty: "beginner",
    answer: "Client dignity",
    definition: "services are delivered in a way that protects privacy, respect, and humane treatment.",
    scenario:
      "An RBT avoids discussing toileting goals in front of other families and uses respectful language during all care routines.",
    purpose: "To protect the learner's privacy, respect, and humane treatment.",
    explanation:
      "Client dignity means treating the learner respectfully and avoiding unnecessarily intrusive or embarrassing practices.",
  },
  {
    id: "professional_communication",
    topic: "professional_conduct",
    difficulty: "beginner",
    answer: "Timely communication",
    definition: "important treatment information is shared promptly with the right members of the team.",
    scenario:
      "A medication change is reported by the caregiver, and the RBT documents it and alerts the supervisor before session goals continue.",
    purpose: "To share important treatment information promptly with the supervisor and team.",
    explanation:
      "Timely communication helps the team respond quickly to changes that may affect treatment or safety.",
  },
  {
    id: "professional_cultural_responsiveness",
    topic: "professional_conduct",
    difficulty: "intermediate",
    answer: "Cultural responsiveness",
    definition: "services are delivered with awareness of the family's values, language, and context.",
    scenario:
      "The team adapts examples and routines so teaching fits the family's language preferences and daily practices.",
    purpose: "To provide services in a way that respects the family's values and context.",
    explanation:
      "Cultural responsiveness helps treatment stay respectful, relevant, and collaborative for the family.",
  },
  {
    id: "professional_conflict_of_interest",
    topic: "professional_conduct",
    difficulty: "advanced",
    answer: "Conflict-of-interest prevention",
    definition: "the RBT avoids personal arrangements that could impair professional judgment or objectivity.",
    scenario:
      "A caregiver offers extra cash for off-the-clock childcare, and the RBT declines because it would blur the professional relationship.",
    purpose: "To avoid personal arrangements that could impair professional judgment.",
    explanation:
      "Preventing conflicts of interest protects objectivity and reduces the risk of boundary problems.",
  },
  {
    id: "measurement_count",
    topic: "measurement",
    difficulty: "beginner",
    answer: "Count",
    definition: "a raw total of responses is recorded without converting it by time or opportunities.",
    scenario:
      "An RBT writes down that a learner threw materials 7 times during session and reports the total number only.",
    purpose: "To capture the raw total number of responses.",
    explanation:
      "Count is the simplest measure when the team needs the total number of responses and session length is not the main issue.",
  },
  {
    id: "measurement_percentage",
    topic: "measurement",
    difficulty: "beginner",
    answer: "Percentage of opportunities",
    definition: "performance is summarized by dividing correct responses by total chances and converting the result to a percent.",
    scenario:
      "A learner answered correctly on 8 out of 10 receptive trials, and the team reports performance as a percent.",
    purpose: "To summarize performance across a fixed number of opportunities.",
    explanation:
      "Percentage of opportunities is useful when the team wants to express success out of total chances rather than raw count alone.",
  },
  {
    id: "measurement_duration_per_occurrence",
    topic: "measurement",
    difficulty: "intermediate",
    answer: "Duration per occurrence",
    definition: "the length of each individual behavior episode is measured and compared.",
    scenario:
      "Tantrums happen several times in session, so the RBT records how long each tantrum lasts rather than only the total duration for the day.",
    purpose: "To compare how long each individual episode lasts.",
    explanation:
      "Duration per occurrence is useful when the team cares about the length of each episode, not only the total time across all episodes.",
  },
  {
    id: "measurement_continuous",
    topic: "measurement",
    difficulty: "advanced",
    answer: "Continuous measurement",
    definition: "every instance or full dimension of the behavior is directly measured during observation.",
    scenario:
      "The team wants the most precise data possible, so the RBT tracks each instance of aggression as it happens throughout the session.",
    purpose: "To capture every instance or full dimension of behavior as accurately as possible.",
    explanation:
      "Continuous measurement includes methods like count, duration, and latency because they record the whole response dimension directly.",
  },
  {
    id: "measurement_discontinuous",
    topic: "measurement",
    difficulty: "advanced",
    answer: "Discontinuous measurement",
    definition: "behavior is sampled instead of measured in full, using intervals or moments.",
    scenario:
      "Because full observation is difficult during a busy classroom routine, the RBT uses intervals rather than tracking every second of behavior.",
    purpose: "To estimate behavior by sampling instead of recording every instance fully.",
    explanation:
      "Discontinuous measurement includes methods like interval recording and momentary time sampling when continuous data are less practical.",
  },
  {
    id: "assessment_direct",
    topic: "assessment",
    difficulty: "beginner",
    answer: "Direct assessment",
    definition: "the team observes and records the learner's actual behavior rather than relying only on reports from others.",
    scenario:
      "Instead of using only interview information, the BCBA watches sessions and reviews data collected live by the RBT.",
    purpose: "To gather information by directly observing the learner's behavior.",
    explanation:
      "Direct assessment provides stronger evidence than indirect report alone because the behavior is observed as it happens.",
  },
  {
    id: "assessment_paired_stimulus",
    topic: "assessment",
    difficulty: "intermediate",
    answer: "Paired-stimulus assessment",
    definition: "two items are presented at a time and the learner chooses between them repeatedly.",
    scenario:
      "The RBT presents bubbles versus a toy car, then bubbles versus a snack, rotating pairs to see which items the learner selects most often.",
    purpose: "To compare choices between two options at a time to rank preferences.",
    explanation:
      "Paired-stimulus assessment helps produce a detailed preference hierarchy by comparing items in pairs.",
  },
  {
    id: "assessment_mswo",
    topic: "assessment",
    difficulty: "intermediate",
    answer: "MSWO assessment",
    definition: "multiple items are presented together, and each chosen item is removed before the next selection.",
    scenario:
      "A learner chooses from five available items, and after each choice the selected item is taken away before the next choice round.",
    purpose: "To rank preferences efficiently by removing each selected item after it is chosen.",
    explanation:
      "MSWO stands for multiple stimulus without replacement and is a common efficient way to rank several preferred items.",
  },
  {
    id: "assessment_free_operant",
    topic: "assessment",
    difficulty: "intermediate",
    answer: "Free-operant assessment",
    definition: "several items are made available at once and the observer records how long or how often the learner engages with each.",
    scenario:
      "The learner enters a play area with multiple materials available, and the RBT records which items hold the learner's attention the longest.",
    purpose: "To identify preferences by observing natural engagement with multiple available items.",
    explanation:
      "Free-operant assessment reduces repeated item removal and can be useful for learners who resist frequent transitions.",
  },
  {
    id: "assessment_fba",
    topic: "assessment",
    difficulty: "advanced",
    answer: "Functional behavior assessment",
    definition: "multiple assessment methods are combined to identify why problem behavior is happening.",
    scenario:
      "The BCBA reviews interviews, ABC data, and direct observations before designing a plan for severe aggression.",
    purpose: "To identify the likely function of problem behavior using multiple assessment methods.",
    explanation:
      "A functional behavior assessment integrates information from several sources to guide treatment planning.",
  },
  {
    id: "skill_dtt",
    topic: "skill_acquisition",
    difficulty: "beginner",
    answer: "Discrete trial teaching",
    definition: "instruction is delivered in structured repeated trials with a cue, response, consequence, and brief pause before the next trial.",
    scenario:
      "At the table, the RBT runs repeated receptive identification trials with immediate feedback after each response.",
    purpose: "To teach skills through structured repeated teaching trials.",
    explanation:
      "Discrete trial teaching uses a clear trial format and is often used for early or foundational skill instruction.",
  },
  {
    id: "skill_net",
    topic: "skill_acquisition",
    difficulty: "intermediate",
    answer: "Natural environment teaching",
    definition: "instruction is embedded into ongoing routines, play, and learner motivation rather than only table work.",
    scenario:
      "During play with trains, the RBT captures motivation to teach requesting, turn taking, and simple labels.",
    purpose: "To teach skills within natural routines and learner motivation.",
    explanation:
      "Natural environment teaching helps skills feel more functional because teaching happens in meaningful daily contexts.",
  },
  {
    id: "skill_forward_chaining",
    topic: "skill_acquisition",
    difficulty: "beginner",
    answer: "Forward chaining",
    definition: "the first step in a task chain is taught first, and additional steps are added in order over time.",
    scenario:
      "When teaching handwashing, the learner first masters turning on the water before later steps are added.",
    purpose: "To teach a chained skill by starting with the earliest step.",
    explanation:
      "Forward chaining teaches the sequence from the beginning toward the end, adding steps in order.",
  },
  {
    id: "skill_backward_chaining",
    topic: "skill_acquisition",
    difficulty: "beginner",
    answer: "Backward chaining",
    definition: "the final step of a task chain is taught first so the learner contacts the terminal reinforcer at the end of each trial.",
    scenario:
      "During shoe tying, the RBT completes most of the routine and lets the learner finish the last step independently.",
    purpose: "To teach a chained skill by starting with the final step.",
    explanation:
      "Backward chaining lets the learner contact the natural end result of the task after completing the last link.",
  },
  {
    id: "skill_time_delay",
    topic: "skill_acquisition",
    difficulty: "advanced",
    answer: "Time delay",
    definition: "the RBT systematically increases the pause before giving a prompt so the learner has a chance to respond independently.",
    scenario:
      "At first the learner is prompted immediately after the instruction, but later the RBT waits a few seconds before helping.",
    purpose: "To transfer responding to the natural cue by delaying prompts over time.",
    explanation:
      "Time delay gradually creates space for independent responding before the prompt is delivered.",
  },
  {
    id: "behavior_dra_specific",
    topic: "behavior_reduction",
    difficulty: "intermediate",
    answer: "Differential reinforcement of alternative behavior",
    definition: "reinforcement is delivered for an appropriate alternative response that serves the same need as the problem behavior.",
    scenario:
      "A learner is reinforced for asking for help appropriately instead of throwing materials when work is difficult.",
    purpose: "To strengthen an appropriate alternative response that can replace problem behavior.",
    explanation:
      "DRA focuses on reinforcing a more appropriate alternative that can take the place of the problem behavior.",
  },
  {
    id: "behavior_escape_extinction",
    topic: "behavior_reduction",
    difficulty: "advanced",
    answer: "Escape extinction",
    definition: "problem behavior no longer results in postponing or avoiding the demand that previously maintained it.",
    scenario:
      "A learner screams during work demands, and staff continue the task sequence according to plan while also prompting an appropriate break request.",
    purpose: "To reduce escape-maintained behavior by no longer allowing the task to be removed because of the problem behavior.",
    explanation:
      "Escape extinction means the demand is not removed following the problem behavior when escape was the maintaining reinforcer.",
  },
  {
    id: "behavior_extinction_burst",
    topic: "behavior_reduction",
    difficulty: "advanced",
    answer: "Extinction burst",
    definition: "problem behavior briefly increases in frequency, duration, or intensity after reinforcement is first withheld.",
    scenario:
      "After attention is no longer delivered for yelling, the learner yells even louder and more often for a short period.",
    purpose: "To recognize the temporary worsening that can happen when extinction first starts.",
    explanation:
      "An extinction burst is a temporary increase in behavior that may occur before the response decreases over time.",
  },
  {
    id: "behavior_spontaneous_recovery",
    topic: "behavior_reduction",
    difficulty: "advanced",
    answer: "Spontaneous recovery",
    definition: "a previously reduced behavior briefly returns after a period of improvement or absence.",
    scenario:
      "After several days without property destruction, one short episode happens again even though the overall trend had improved.",
    purpose: "To identify the temporary return of a previously reduced behavior.",
    explanation:
      "Spontaneous recovery is the brief reappearance of a response after it had decreased or stopped.",
  },
  {
    id: "behavior_planned_ignoring",
    topic: "behavior_reduction",
    difficulty: "beginner",
    answer: "Planned ignoring",
    definition: "attention is intentionally withheld for a behavior that is maintained by attention, as specified in the plan.",
    scenario:
      "A learner whines for attention, and staff withhold eye contact and conversation until appropriate communication occurs.",
    purpose: "To reduce attention-maintained behavior by withholding attention according to the plan.",
    explanation:
      "Planned ignoring is used only when attention is the reinforcer and when the procedure is safe and written into the plan.",
  },
  {
    id: "documentation_data_summary",
    topic: "documentation",
    difficulty: "intermediate",
    answer: "Data summary reporting",
    definition: "session performance is condensed into a brief factual overview for review by the supervisor or team.",
    scenario:
      "At the end of treatment, the RBT reports that the learner completed 18 trials, responded independently on 14, and engaged in aggression twice.",
    purpose: "To give the team a concise factual overview of session performance.",
    explanation:
      "Data summary reporting helps supervisors review progress quickly without replacing the underlying detailed records.",
  },
  {
    id: "documentation_timestamp",
    topic: "documentation",
    difficulty: "beginner",
    answer: "Time-stamped session documentation",
    definition: "records include when important events, transitions, or services occurred.",
    scenario:
      "The RBT notes when session began, when aggression occurred, when a break was given, and when the session ended.",
    purpose: "To document when important events or services occurred during session.",
    explanation:
      "Time-stamped documentation improves clarity when the sequence and timing of events matter.",
  },
  {
    id: "documentation_caregiver_log",
    topic: "documentation",
    difficulty: "beginner",
    answer: "Caregiver communication log",
    definition: "important information shared with or received from caregivers is recorded clearly and professionally.",
    scenario:
      "A caregiver reports poor sleep before session, and the RBT documents the update and shares it with the supervisor.",
    purpose: "To record important communication with caregivers in a professional way.",
    explanation:
      "Caregiver communication logs help the team track important information that may affect treatment or session interpretation.",
  },
  {
    id: "documentation_preference_update",
    topic: "documentation",
    difficulty: "intermediate",
    answer: "Preference update note",
    definition: "changes in preferred items or motivation are documented so teaching and reinforcement can be adjusted.",
    scenario:
      "A learner no longer works for stickers but responds well to drawing materials, and the RBT records that change for the team.",
    purpose: "To document changes in what the learner is motivated to work for.",
    explanation:
      "Preference update notes help the team adjust reinforcement procedures as learner motivation changes.",
  },
  {
    id: "documentation_severity_rating",
    topic: "documentation",
    difficulty: "advanced",
    answer: "Behavior severity rating",
    definition: "the intensity or seriousness of a behavior episode is recorded using the program's defined scale.",
    scenario:
      "Aggression is scored as mild, moderate, or severe based on the agency's operational criteria after each incident.",
    purpose: "To document how intense or serious each behavior episode was.",
    explanation:
      "Severity ratings help the team monitor whether the intensity of behavior is changing over time, not just its frequency.",
  },
  {
    id: "professional_mandated_reporting",
    topic: "professional_conduct",
    difficulty: "advanced",
    answer: "Mandated reporting",
    definition: "suspected abuse, neglect, or serious harm concerns are reported through the legally required process.",
    scenario:
      "An RBT hears statements and sees injuries that raise concern for abuse and follows the required reporting process immediately.",
    purpose: "To fulfill legal and ethical duties when abuse or neglect is suspected.",
    explanation:
      "Mandated reporting requires prompt action through the required channels when abuse or neglect is suspected.",
  },
  {
    id: "professional_record_honesty",
    topic: "professional_conduct",
    difficulty: "beginner",
    answer: "Accurate record keeping",
    definition: "the RBT documents what actually happened rather than filling in missing details from memory or assumption.",
    scenario:
      "A staff member suggests guessing the last few trial scores after a busy session, but the RBT records only what was actually observed.",
    purpose: "To keep records truthful and accurate.",
    explanation:
      "Accurate record keeping is essential because treatment decisions depend on honest and reliable documentation.",
  },
  {
    id: "professional_following_plan",
    topic: "professional_conduct",
    difficulty: "beginner",
    answer: "Following the treatment plan",
    definition: "the RBT implements procedures as written instead of improvising new interventions independently.",
    scenario:
      "Even when a session is difficult, the RBT follows the written prompting and reinforcement procedures rather than inventing a new strategy.",
    purpose: "To keep implementation aligned with the supervisor's written plan.",
    explanation:
      "Following the treatment plan protects treatment integrity and keeps decisions within the supervisor's role.",
  },
  {
    id: "professional_caregiver_respect",
    topic: "professional_conduct",
    difficulty: "intermediate",
    answer: "Respectful caregiver communication",
    definition: "the RBT communicates concerns and updates professionally, calmly, and within role boundaries.",
    scenario:
      "A caregiver is frustrated, and the RBT responds respectfully, shares objective information, and avoids arguing or offering unsupervised treatment advice.",
    purpose: "To maintain professional and respectful communication with caregivers.",
    explanation:
      "Respectful caregiver communication supports collaboration while keeping the RBT within scope and professional tone.",
  },
  {
    id: "professional_social_media",
    topic: "professional_conduct",
    difficulty: "intermediate",
    answer: "Social media professionalism",
    definition: "the RBT avoids posting client-related information or interacting online in ways that blur professional boundaries.",
    scenario:
      "An RBT declines a caregiver's social media friend request and never posts photos or stories that could identify a client.",
    purpose: "To protect confidentiality and boundaries in online spaces.",
    explanation:
      "Professional conduct extends to social media, where confidentiality and boundaries still apply.",
  },
  {
    id: "measurement_celeration",
    topic: "measurement",
    difficulty: "advanced",
    answer: "Celeration",
    definition: "the team analyzes how quickly the rate of behavior is accelerating or decelerating over time.",
    scenario:
      "A supervisor reviews whether independent reading responses are increasing faster each week rather than only looking at the raw count.",
    purpose: "To describe the rate of change in behavior over time.",
    explanation:
      "Celeration focuses on how behavior is speeding up or slowing down across time, not only on the current count.",
  },
  {
    id: "measurement_event_recording",
    topic: "measurement",
    difficulty: "beginner",
    answer: "Event recording",
    definition: "each occurrence of a discrete behavior is marked as it happens during observation.",
    scenario:
      "Every time a learner claps hands, the RBT clicks a counter to mark another instance.",
    purpose: "To record each occurrence of a discrete observable behavior.",
    explanation:
      "Event recording is most useful when behavior has a clear beginning and end and each occurrence can be counted reliably.",
  },
  {
    id: "measurement_response_ratio",
    topic: "measurement",
    difficulty: "advanced",
    answer: "Response ratio",
    definition: "two related behavior counts are compared to each other rather than viewed separately.",
    scenario:
      "A team compares the number of independent requests to prompted requests to see whether independence is improving.",
    purpose: "To compare two related response types directly.",
    explanation:
      "Response ratio can show change in balance between response classes, such as independent versus prompted performance.",
  },
  {
    id: "measurement_accuracy",
    topic: "measurement",
    difficulty: "beginner",
    answer: "Accuracy recording",
    definition: "responses are scored based on whether they were correct or incorrect.",
    scenario:
      "During receptive identification, the RBT records whether each trial response matched the correct item.",
    purpose: "To measure how correct the learner's responding is.",
    explanation:
      "Accuracy recording is commonly used in teaching programs when the quality of the response matters more than frequency alone.",
  },
  {
    id: "measurement_opportunity_based",
    topic: "measurement",
    difficulty: "intermediate",
    answer: "Opportunity-based recording",
    definition: "behavior is measured relative to the number of available opportunities to respond.",
    scenario:
      "A learner had only six chances to greet peers during a short outing, so the team scores greetings based on those opportunities rather than total session length.",
    purpose: "To measure behavior relative to the number of chances the learner had to respond.",
    explanation:
      "Opportunity-based recording is helpful when response chances vary and a raw count would be misleading.",
  },
  {
    id: "assessment_descriptive",
    topic: "assessment",
    difficulty: "intermediate",
    answer: "Descriptive assessment",
    definition: "behavior is observed in the natural environment and patterns are described without experimental manipulation.",
    scenario:
      "The BCBA reviews observations from classroom and home sessions to look for patterns before testing any hypotheses formally.",
    purpose: "To describe naturally occurring patterns around behavior in real settings.",
    explanation:
      "Descriptive assessment provides useful contextual information but does not establish function as strongly as experimental analysis.",
  },
  {
    id: "assessment_target_behavior_selection",
    topic: "assessment",
    difficulty: "beginner",
    answer: "Target behavior selection",
    definition: "the team chooses a specific measurable behavior to assess before collecting data.",
    scenario:
      "Instead of saying a learner is disruptive, the team decides to track shouting louder than conversational voice during instruction.",
    purpose: "To choose a clear specific behavior to assess and measure.",
    explanation:
      "Careful target behavior selection makes later assessment and intervention more precise and useful.",
  },
  {
    id: "assessment_ecological_review",
    topic: "assessment",
    difficulty: "advanced",
    answer: "Ecological assessment",
    definition: "the broader environment, routines, materials, and social context are reviewed to understand support needs.",
    scenario:
      "Before changing a plan, the team reviews classroom noise level, seating arrangement, available supports, and staff interactions around the learner.",
    purpose: "To understand how environmental context may influence behavior and support needs.",
    explanation:
      "Ecological assessment looks beyond the learner alone and examines how the surrounding environment may affect performance.",
  },
  {
    id: "assessment_task_analysis_probe",
    topic: "assessment",
    difficulty: "intermediate",
    answer: "Task analysis probe",
    definition: "the team tests which individual steps in a multi-step routine the learner can already do independently.",
    scenario:
      "Before teaching laundry, the RBT checks which parts of the washing routine the learner can already complete without help.",
    purpose: "To identify which steps in a chained skill are already mastered.",
    explanation:
      "Task analysis probes help the team place instruction at the correct step within a larger routine.",
  },
  {
    id: "assessment_barrier_review",
    topic: "assessment",
    difficulty: "advanced",
    answer: "Barrier assessment",
    definition: "the team examines variables that may interfere with learning, such as prompt dependence or weak motivation.",
    scenario:
      "A learner has many mastered targets but still struggles to generalize and initiates little, so the BCBA reviews barriers to progress.",
    purpose: "To identify variables that may be interfering with learning progress.",
    explanation:
      "Barrier assessment helps explain why progress may be slow even when instruction is ongoing.",
  },
  {
    id: "skill_incidental_teaching",
    topic: "skill_acquisition",
    difficulty: "intermediate",
    answer: "Incidental teaching",
    definition: "teaching is arranged around naturally occurring opportunities initiated by the learner.",
    scenario:
      "A learner reaches for bubbles, and the RBT uses that moment to teach a fuller request before giving access.",
    purpose: "To teach language or other skills within learner-initiated natural opportunities.",
    explanation:
      "Incidental teaching uses naturally occurring motivation and interaction moments to build skills.",
  },
  {
    id: "skill_stimulus_fading",
    topic: "skill_acquisition",
    difficulty: "advanced",
    answer: "Stimulus fading",
    definition: "an extra cue built into materials is gradually reduced so the natural cue controls responding.",
    scenario:
      "A picture is first highlighted to make it stand out, and later the highlight is gradually reduced as the learner responds correctly.",
    purpose: "To transfer control from an added cue to the natural stimulus.",
    explanation:
      "Stimulus fading removes extra prompts built into materials rather than delaying or reducing physical prompts alone.",
  },
  {
    id: "skill_prompt_hierarchy",
    topic: "skill_acquisition",
    difficulty: "beginner",
    answer: "Prompt hierarchy",
    definition: "prompts are organized from less intrusive to more intrusive or vice versa for consistent teaching.",
    scenario:
      "A program specifies gesture, model, then partial physical prompts so every staff member teaches the same way.",
    purpose: "To keep prompting systematic and consistent across instruction.",
    explanation:
      "A prompt hierarchy creates a predictable sequence of assistance levels during teaching.",
  },
  {
    id: "skill_reinforcer_pairing",
    topic: "skill_acquisition",
    difficulty: "intermediate",
    answer: "Reinforcer pairing",
    definition: "neutral items or people are repeatedly associated with preferred events so they become more valuable to the learner.",
    scenario:
      "A new therapist consistently joins preferred play and delivers favorite items so the learner begins approaching that therapist more readily.",
    purpose: "To build value in a person, stimulus, or item by pairing it with preferred events.",
    explanation:
      "Pairing can help establish new conditioned reinforcers or increase rapport in early teaching.",
  },
  {
    id: "skill_transfer_trial",
    topic: "skill_acquisition",
    difficulty: "advanced",
    answer: "Transfer trial",
    definition: "after a prompted correct response, a quick follow-up opportunity checks whether control transfers to a less prompted trial.",
    scenario:
      "A learner answers correctly after a model prompt, and the RBT immediately runs another trial with less help to test independence.",
    purpose: "To check whether stimulus control is shifting toward a less prompted response.",
    explanation:
      "Transfer trials help confirm that prompting is leading toward independent responding rather than prompt dependence.",
  },
  {
    id: "behavior_redirection",
    topic: "behavior_reduction",
    difficulty: "beginner",
    answer: "Redirection",
    definition: "the RBT interrupts the current course of action and guides the learner toward a more appropriate behavior.",
    scenario:
      "A learner begins banging blocks loudly, and the RBT redirects to stacking them and praising calmer play.",
    purpose: "To shift the learner from an inappropriate response to a more appropriate one.",
    explanation:
      "Redirection is often used to move behavior toward a safer or more functional alternative in the moment.",
  },
  {
    id: "behavior_response_cost",
    topic: "behavior_reduction",
    difficulty: "advanced",
    answer: "Response cost",
    definition: "a reinforcer or token is removed contingent on problem behavior according to the written plan.",
    scenario:
      "A learner loses one token from a token board after aggression as described in the behavior plan.",
    purpose: "To reduce behavior by removing a valued reinforcer contingent on that behavior.",
    explanation:
      "Response cost is a punishment-based procedure and should be used only when authorized and clearly planned.",
  },
  {
    id: "behavior_contingency_review",
    topic: "behavior_reduction",
    difficulty: "intermediate",
    answer: "Contingency review",
    definition: "the learner is reminded of the rule that links behavior with a specific consequence before responding.",
    scenario:
      "Before independent work begins, the RBT calmly reminds the learner that asking for help appropriately leads to support, while yelling does not.",
    purpose: "To clarify the rule connecting behavior and consequences before behavior occurs.",
    explanation:
      "Contingency review can reduce confusion by making the response-consequence relationship explicit ahead of time.",
  },
  {
    id: "behavior_choice_making",
    topic: "behavior_reduction",
    difficulty: "beginner",
    answer: "Choice making",
    definition: "the learner is offered meaningful options to reduce problem behavior and increase cooperation.",
    scenario:
      "Before a transition, the learner chooses whether to carry the red folder or the blue folder to the next room.",
    purpose: "To increase cooperation and reduce problem behavior by offering meaningful choices.",
    explanation:
      "Choice making is an antecedent-based support that can increase engagement and reduce resistance.",
  },
  {
    id: "behavior_behavioral_momentum",
    topic: "behavior_reduction",
    difficulty: "advanced",
    answer: "Behavioral momentum",
    definition: "compliance with easier responses is used to increase the likelihood of compliance with a harder one.",
    scenario:
      "After a learner quickly follows several simple instructions, the RBT presents a more difficult cleanup demand.",
    purpose: "To build momentum from easy responses before a more difficult task.",
    explanation:
      "Behavioral momentum relies on a series of likely responses to increase later compliance.",
  },
  {
    id: "documentation_absence_note",
    topic: "documentation",
    difficulty: "beginner",
    answer: "Absence or cancellation documentation",
    definition: "missed sessions, shortened sessions, or cancellations are recorded with the relevant factual details.",
    scenario:
      "A session ends early because of a school assembly, and the RBT records the shortened duration and reason.",
    purpose: "To document when scheduled services were missed or changed.",
    explanation:
      "Absence and cancellation notes help keep service records accurate and explain gaps in data or treatment time.",
  },
  {
    id: "documentation_material_change",
    topic: "documentation",
    difficulty: "intermediate",
    answer: "Program material change note",
    definition: "a record is made when materials or setup differ from usual and may affect performance.",
    scenario:
      "A learner usually uses picture cards, but today a device was unavailable, so the RBT documents the alternate materials used.",
    purpose: "To note environmental or material changes that may affect session performance.",
    explanation:
      "Documenting material changes gives context for interpreting differences in learner performance.",
  },
  {
    id: "documentation_behavior_frequency_summary",
    topic: "documentation",
    difficulty: "beginner",
    answer: "Behavior frequency summary",
    definition: "a note reports how many times a target behavior occurred during the session.",
    scenario:
      "At session end, the RBT records that elopement occurred three times and aggression occurred once.",
    purpose: "To summarize the number of times target behaviors occurred.",
    explanation:
      "Behavior frequency summaries help the team review key behavior counts without reading every raw event note.",
  },
  {
    id: "documentation_reinforcement_log",
    topic: "documentation",
    difficulty: "intermediate",
    answer: "Reinforcement log",
    definition: "the RBT records what reinforcers were used and how the learner responded to them.",
    scenario:
      "The team is testing several reinforcers, so the RBT tracks which ones increased correct responding most effectively.",
    purpose: "To document which reinforcers were used and how effective they appeared.",
    explanation:
      "Reinforcement logs can help the team adjust motivational systems based on what is working best.",
  },
  {
    id: "documentation_setting_event_note",
    topic: "documentation",
    difficulty: "advanced",
    answer: "Setting event note",
    definition: "events that may influence behavior but happened earlier or outside session are recorded for context.",
    scenario:
      "A caregiver reports poor sleep and illness before session, and the RBT documents that context because it may affect responding.",
    purpose: "To record contextual events that may influence behavior during session.",
    explanation:
      "Setting event notes help the team interpret unusual responding when outside factors may be contributing.",
  },
  {
    id: "professional_dual_relationship",
    topic: "professional_conduct",
    difficulty: "advanced",
    answer: "Dual relationship avoidance",
    definition: "the RBT avoids taking on multiple roles with the same family that could affect objectivity or boundaries.",
    scenario:
      "A caregiver asks the RBT to tutor the sibling privately after hours, and the RBT declines because it would create overlapping roles.",
    purpose: "To prevent overlapping roles that could impair professional judgment.",
    explanation:
      "Avoiding dual relationships helps maintain clear boundaries and protects the integrity of services.",
  },
  {
    id: "professional_private_information_security",
    topic: "professional_conduct",
    difficulty: "beginner",
    answer: "Information security",
    definition: "client records, devices, and messages are kept secure so unauthorized people cannot access them.",
    scenario:
      "The RBT locks a tablet with client data, logs out of shared devices, and avoids leaving printed records unattended.",
    purpose: "To protect private information from unauthorized access.",
    explanation:
      "Information security is part of confidentiality and includes both physical and digital safeguards.",
  },
  {
    id: "professional_supervisor_notification",
    topic: "professional_conduct",
    difficulty: "beginner",
    answer: "Supervisor notification",
    definition: "important clinical, ethical, or safety issues are reported to the supervisor promptly.",
    scenario:
      "A learner begins a new medication and shows unusual behavior changes, so the RBT informs the supervisor the same day.",
    purpose: "To keep the supervisor informed about important events affecting treatment or safety.",
    explanation:
      "Prompt supervisor notification supports safe decision-making and keeps the team aligned.",
  },
  {
    id: "professional_scope_refusal",
    topic: "professional_conduct",
    difficulty: "intermediate",
    answer: "Appropriate refusal outside scope",
    definition: "the RBT declines requests outside role boundaries and redirects them to the supervisor or proper professional.",
    scenario:
      "A family asks the RBT to diagnose why a learner is anxious, and the RBT explains that diagnostic decisions are outside the RBT role.",
    purpose: "To maintain role boundaries when asked to do work outside the RBT scope.",
    explanation:
      "Appropriate refusal protects the learner and keeps responsibilities within the correct professional role.",
  },
  {
    id: "professional_professionalism_under_stress",
    topic: "professional_conduct",
    difficulty: "intermediate",
    answer: "Professional composure",
    definition: "the RBT maintains calm, respectful, and role-appropriate behavior even during stressful interactions.",
    scenario:
      "A caregiver criticizes session progress in frustration, and the RBT stays calm, responds respectfully, and shares objective information only.",
    purpose: "To maintain professionalism during difficult or stressful interactions.",
    explanation:
      "Professional composure helps protect rapport, keeps communication productive, and supports ethical conduct.",
  },
  {
    id: "measurement_standard_celeration_chart",
    topic: "measurement",
    difficulty: "advanced",
    answer: "Standard celeration charting",
    definition: "behavior data are displayed on a chart designed to show frequency change over time on a standard scale.",
    scenario:
      "A supervisor wants to compare accelerating and decelerating response trends across multiple weeks using a standard visual format.",
    purpose: "To display frequency changes over time on a standard chart format.",
    explanation:
      "Standard celeration charting is used when the team wants a consistent visual analysis of changing response rates over time.",
  },
  {
    id: "measurement_magnitude",
    topic: "measurement",
    difficulty: "intermediate",
    answer: "Magnitude recording",
    definition: "the intensity or force of a response is measured rather than just its frequency.",
    scenario:
      "A learner slams a door with varying force, and the team wants to track how strong the response is during each incident.",
    purpose: "To measure how intense or forceful a behavior is.",
    explanation:
      "Magnitude recording is useful when the force or intensity of a response matters clinically, not only how often it occurs.",
  },
  {
    id: "measurement_topography",
    topic: "measurement",
    difficulty: "beginner",
    answer: "Topography description",
    definition: "behavior is identified by its observable form or shape rather than by its presumed function.",
    scenario:
      "The team defines hand flapping by the visible movement pattern rather than by guessing why the learner is doing it.",
    purpose: "To describe behavior based on what it looks like observably.",
    explanation:
      "Topography focuses on the physical form of the response and avoids assumptions about motivation or function.",
  },
  {
    id: "measurement_sampling_limitations",
    topic: "measurement",
    difficulty: "advanced",
    answer: "Sampling limitation awareness",
    definition: "the team recognizes that interval and momentary measures estimate behavior and can over- or underrepresent what really happened.",
    scenario:
      "A supervisor reminds staff that interval data may not perfectly reflect the actual duration of off-task behavior during class.",
    purpose: "To interpret sampled behavior data with appropriate caution.",
    explanation:
      "Discontinuous measurement can be efficient, but the team must remember that it estimates behavior rather than capturing it fully.",
  },
  {
    id: "measurement_data_review_frequency",
    topic: "measurement",
    difficulty: "intermediate",
    answer: "Ongoing data review",
    definition: "collected data are reviewed regularly so the team can detect trends and respond quickly.",
    scenario:
      "A BCBA checks weekly graphs with the RBT to decide whether prompting and reinforcement levels need adjustment.",
    purpose: "To review data often enough to guide timely treatment decisions.",
    explanation:
      "Ongoing data review keeps treatment responsive and prevents the team from missing important trends.",
  },
  {
    id: "assessment_hypothesis_statement",
    topic: "assessment",
    difficulty: "intermediate",
    answer: "Hypothesis statement",
    definition: "assessment results are summarized into a likely explanation of what maintains the behavior.",
    scenario:
      "After interviews and ABC data, the team concludes that tantrums most likely occur to escape difficult tasks.",
    purpose: "To summarize the likely function of behavior after assessment.",
    explanation:
      "A hypothesis statement organizes assessment findings into a clear working explanation that can guide intervention.",
  },
  {
    id: "assessment_medical_rule_out",
    topic: "assessment",
    difficulty: "advanced",
    answer: "Medical rule-out consideration",
    definition: "the team considers whether pain, illness, or medical issues may be affecting behavior before assuming a behavioral function only.",
    scenario:
      "A learner suddenly begins severe self-injury after a long history without it, so the team recommends checking for possible medical contributors.",
    purpose: "To consider whether medical issues may be contributing to behavior change.",
    explanation:
      "Medical rule-out consideration is important when abrupt or unusual behavior change may reflect health factors rather than only environmental contingencies.",
  },
  {
    id: "assessment_observation_sampling",
    topic: "assessment",
    difficulty: "intermediate",
    answer: "Observation sampling across contexts",
    definition: "the learner is observed in more than one setting or routine to compare patterns.",
    scenario:
      "Staff collect observation data during table work, recess, and transitions to see whether problem behavior clusters in one context.",
    purpose: "To compare behavior patterns across different settings or routines.",
    explanation:
      "Observation sampling across contexts helps the team avoid drawing conclusions from one narrow situation only.",
  },
  {
    id: "assessment_skill_probe",
    topic: "assessment",
    difficulty: "beginner",
    answer: "Probe assessment",
    definition: "the learner is tested briefly on a target without teaching during the same trial to see current performance level.",
    scenario:
      "Before starting instruction, the RBT presents a few target words without prompting to see whether any are already known.",
    purpose: "To check current skill level before or between teaching periods.",
    explanation:
      "Probe assessments help the team measure current performance without turning the assessment into active teaching.",
  },
  {
    id: "assessment_data_based_decision",
    topic: "assessment",
    difficulty: "advanced",
    answer: "Data-based assessment decision making",
    definition: "assessment conclusions are based on recorded data patterns rather than impression alone.",
    scenario:
      "Even though staff feel behavior is worse in the afternoon, the BCBA reviews actual counts across times of day before deciding.",
    purpose: "To base assessment conclusions on recorded evidence rather than impression alone.",
    explanation:
      "Assessment decisions should rely on patterns in data instead of memory, intuition, or isolated incidents.",
  },
  {
    id: "skill_choral_responding",
    topic: "skill_acquisition",
    difficulty: "intermediate",
    answer: "Choral responding",
    definition: "multiple learners respond at the same time after a shared instruction.",
    scenario:
      "During a group lesson, the RBT asks everyone to say the color together before providing feedback.",
    purpose: "To increase active responding during group instruction.",
    explanation:
      "Choral responding can increase participation and practice opportunities when several learners are taught together.",
  },
  {
    id: "skill_model_prompt",
    topic: "skill_acquisition",
    difficulty: "beginner",
    answer: "Model prompt",
    definition: "the instructor demonstrates the correct response for the learner to imitate.",
    scenario:
      "When teaching clapping, the RBT claps first so the learner can copy the action.",
    purpose: "To show the learner what the correct response looks like.",
    explanation:
      "A model prompt provides an example of the target response and is commonly used in imitation and motor teaching.",
  },
  {
    id: "skill_gesture_prompt",
    topic: "skill_acquisition",
    difficulty: "beginner",
    answer: "Gesture prompt",
    definition: "the instructor points, nods, or motions toward the correct response without physically guiding the learner.",
    scenario:
      "The RBT points toward the correct picture card after giving the instruction.",
    purpose: "To direct attention toward the correct response with a simple motion.",
    explanation:
      "Gesture prompts are less intrusive than model or physical prompts and can help maintain independence.",
  },
  {
    id: "skill_verbal_prompt",
    topic: "skill_acquisition",
    difficulty: "beginner",
    answer: "Verbal prompt",
    definition: "the instructor provides spoken assistance to increase the chance of the correct response.",
    scenario:
      "After asking a learner to label an item, the RBT says the first sound of the word to help.",
    purpose: "To increase correct responding through spoken assistance.",
    explanation:
      "Verbal prompts can range from full answers to partial cues and should be faded so the learner does not become prompt dependent.",
  },
  {
    id: "skill_response_generalization",
    topic: "skill_acquisition",
    difficulty: "advanced",
    answer: "Response generalization",
    definition: "one trained skill leads to the emergence of related but untrained appropriate responses.",
    scenario:
      "After being taught to ask for help verbally, a learner also begins appropriately asking for assistance with new materials never directly trained.",
    purpose: "To support the emergence of related appropriate responses beyond direct training.",
    explanation:
      "Response generalization occurs when training one response produces new but related appropriate behaviors.",
  },
  {
    id: "behavior_drr",
    topic: "behavior_reduction",
    difficulty: "intermediate",
    answer: "Differential reinforcement of reduced rates",
    definition: "reinforcement is delivered when a behavior occurs less often than before but is not expected to drop to zero.",
    scenario:
      "A learner who frequently asks repetitive questions earns reinforcement when the total number decreases to a manageable level during session.",
    purpose: "To reduce a behavior to a lower acceptable rate rather than eliminate it entirely.",
    explanation:
      "DRR is useful when the behavior is acceptable in moderation but problematic at very high rates.",
  },
  {
    id: "behavior_satiation_awareness",
    topic: "behavior_reduction",
    difficulty: "advanced",
    answer: "Satiation awareness",
    definition: "the team monitors whether a reinforcer may be losing value because the learner has recently had too much of it.",
    scenario:
      "A learner stops working for crackers late in session after already receiving many of them, so staff consider whether motivation has decreased.",
    purpose: "To recognize when repeated access may reduce reinforcer effectiveness.",
    explanation:
      "Satiation can make reinforcers less effective and may change how well behavior plans work over the course of a session.",
  },
  {
    id: "behavior_abolishing_operation",
    topic: "behavior_reduction",
    difficulty: "advanced",
    answer: "Abolishing operation",
    definition: "an event temporarily decreases the value of a reinforcer and makes related behavior less likely.",
    scenario:
      "After a learner has just had a full snack, requests for that same food decrease sharply during teaching.",
    purpose: "To identify events that temporarily reduce the value of a reinforcer.",
    explanation:
      "An abolishing operation decreases both the effectiveness of a reinforcer and the likelihood of behaviors that previously produced it.",
  },
  {
    id: "behavior_establishing_operation",
    topic: "behavior_reduction",
    difficulty: "advanced",
    answer: "Establishing operation",
    definition: "an event temporarily increases the value of a reinforcer and makes related behavior more likely.",
    scenario:
      "After a long period without attention, a learner begins calling out more often to get staff interaction.",
    purpose: "To identify events that temporarily increase the value of a reinforcer.",
    explanation:
      "An establishing operation increases the effectiveness of a reinforcer and the likelihood of behaviors that have produced it before.",
  },
  {
    id: "behavior_precorrection",
    topic: "behavior_reduction",
    difficulty: "beginner",
    answer: "Precorrection",
    definition: "the expected behavior is reminded or practiced immediately before a situation where problem behavior is likely.",
    scenario:
      "Right before entering the cafeteria, the RBT reminds and practices walking feet and quiet voice.",
    purpose: "To remind and practice the expected behavior before a high-risk situation.",
    explanation:
      "Precorrection is an antecedent strategy that can reduce problem behavior by clarifying expectations in advance.",
  },
  {
    id: "documentation_session_objective",
    topic: "documentation",
    difficulty: "beginner",
    answer: "Objective session summary",
    definition: "the overall session note includes factual details about targets run, behavior observed, and key outcomes without interpretation beyond the data.",
    scenario:
      "A note states that 4 targets were run, aggression occurred twice, and independent requests increased compared with the previous session.",
    purpose: "To summarize the session factually and clearly for supervisor review.",
    explanation:
      "Objective session summaries help the team see the key events and data from a session without relying on subjective impressions.",
  },
  {
    id: "documentation_signature_compliance",
    topic: "documentation",
    difficulty: "intermediate",
    answer: "Signature compliance",
    definition: "required signatures or acknowledgments are collected according to policy when documentation calls for them.",
    scenario:
      "After delivering authorized services, the RBT ensures the required verification signature is obtained before closing the note.",
    purpose: "To keep documentation compliant with required verification procedures.",
    explanation:
      "Signature compliance is important when agencies or payers require confirmation that services were delivered as documented.",
  },
  {
    id: "documentation_revision_note",
    topic: "documentation",
    difficulty: "advanced",
    answer: "Late-entry or revision documentation",
    definition: "if a record must be corrected, the change is clearly identified rather than hidden or overwritten.",
    scenario:
      "The RBT notices a time entry error and adds a clearly labeled correction rather than silently altering the record.",
    purpose: "To correct records transparently and maintain documentation integrity.",
    explanation:
      "Transparent revisions protect record accuracy and show that corrections were made ethically.",
  },
  {
    id: "documentation_program_change_alert",
    topic: "documentation",
    difficulty: "intermediate",
    answer: "Program change alert note",
    definition: "a note highlights when the team must review a target because data suggest a meaningful change in performance.",
    scenario:
      "Independent responding drops sharply across several sessions, so the RBT flags the target for supervisor review in the session documentation.",
    purpose: "To alert the team when a program may need review based on data changes.",
    explanation:
      "Program change alert notes help important performance shifts get reviewed quickly instead of being overlooked.",
  },
  {
    id: "documentation_environmental_context",
    topic: "documentation",
    difficulty: "intermediate",
    answer: "Environmental context note",
    definition: "the RBT documents unusual environmental variables that may have influenced behavior or performance.",
    scenario:
      "Construction noise outside the classroom disrupted instruction, so the RBT notes that context in the record.",
    purpose: "To document unusual environmental conditions that may affect session results.",
    explanation:
      "Environmental context notes help supervisors interpret data more accurately when the setting was not typical.",
  },
  {
    id: "professional_chain_of_command",
    topic: "professional_conduct",
    difficulty: "beginner",
    answer: "Following chain of command",
    definition: "concerns and requests are directed through the appropriate supervisory structure instead of bypassing it.",
    scenario:
      "When a caregiver asks for treatment changes, the RBT directs the request to the supervising BCBA rather than making changes independently.",
    purpose: "To route concerns and decisions through the appropriate supervisory structure.",
    explanation:
      "Following chain of command helps maintain clear responsibility and keeps clinical decision-making with the proper supervisor.",
  },
  {
    id: "professional_nonjudgmental_language",
    topic: "professional_conduct",
    difficulty: "beginner",
    answer: "Nonjudgmental language",
    definition: "the RBT describes behavior and family interactions without blame, sarcasm, or emotionally loaded wording.",
    scenario:
      "Instead of writing that a caregiver was difficult, the RBT notes that the caregiver declined two suggested practice opportunities.",
    purpose: "To keep communication respectful, objective, and professional.",
    explanation:
      "Nonjudgmental language protects professionalism and makes records more factual and useful.",
  },
  {
    id: "professional_consistency",
    topic: "professional_conduct",
    difficulty: "intermediate",
    answer: "Consistent professional behavior",
    definition: "the RBT behaves professionally across sessions, settings, and team interactions rather than only when supervised closely.",
    scenario:
      "Whether in clinic or community sessions, the RBT uses the same respectful tone, confidentiality practices, and treatment procedures.",
    purpose: "To maintain professional standards consistently across settings and interactions.",
    explanation:
      "Professional conduct should be consistent, not dependent on who is watching or which setting the RBT is in.",
  },
  {
    id: "professional_documentation_timeliness",
    topic: "professional_conduct",
    difficulty: "intermediate",
    answer: "Timely documentation",
    definition: "records are completed promptly enough to remain accurate and clinically useful.",
    scenario:
      "The RBT finishes notes shortly after session rather than waiting until much later when details may be forgotten.",
    purpose: "To keep documentation accurate by completing it promptly.",
    explanation:
      "Timely documentation supports accuracy, compliance, and better communication with the treatment team.",
  },
  {
    id: "professional_ethics_consultation",
    topic: "professional_conduct",
    difficulty: "advanced",
    answer: "Ethics consultation",
    definition: "when an ethical situation is unclear, the RBT seeks guidance rather than guessing or acting alone.",
    scenario:
      "A boundary situation feels ambiguous, so the RBT consults the supervisor before taking further action.",
    purpose: "To seek guidance when an ethical situation is unclear.",
    explanation:
      "Ethics consultation helps the RBT respond thoughtfully and within role instead of improvising in uncertain situations.",
  },
];

const questionConcepts = [
  ...allQuestionConcepts.filter((concept) => OFFICIAL_CONCEPT_IDS.has(concept.id)),
  ...additionalOfficialQuestionConcepts,
];

export const RBT_ALLOWED_DIFFICULTIES = ["beginner", "intermediate", "advanced"];
const rbtAllowedDifficultySet = new Set(RBT_ALLOWED_DIFFICULTIES);
const STRICT_RBT_ALLOWED_CONCEPT_IDS = new Set(Object.keys(CONCEPT_TO_TASK_LIST));

function isRbtEligibleConcept(concept) {
  return (
    Boolean(concept) &&
    rbtAllowedDifficultySet.has(concept.difficulty) &&
    STRICT_RBT_ALLOWED_CONCEPT_IDS.has(concept.id)
  );
}

export const questionConceptLookup = questionConcepts.reduce((result, concept) => {
  result[concept.id] = concept;
  return result;
}, {});

function shuffleStable(items, seedValue) {
  return shuffleWithRandom(items, createRandom(seedValue));
}

function buildOptionsFromTexts(texts, correctText, variantKey) {
  const answerLabels = ["A", "B", "C", "D"];
  const shuffled = shuffleStable(texts, `answer-order:${variantKey}`);

  return {
    options: shuffled.map((text, index) => ({
      label: answerLabels[index],
      text,
    })),
    correct_answer: answerLabels[shuffled.indexOf(correctText)],
  };
}

function getTopicAlternatives(concept, field) {
  return shuffleStable(
    questionConcepts
      .filter((candidate) => candidate.topic === concept.topic && candidate.id !== concept.id)
      .map((candidate) => candidate[field]),
    `${concept.id}:${field}`,
  ).slice(0, 3);
}

function buildQuestionSeedSet(concept) {
  const answerChoices = [concept.answer, ...getTopicAlternatives(concept, "answer")];
  const purposeChoices = [concept.purpose, ...getTopicAlternatives(concept, "purpose")];

  const definitionMatch = buildOptionsFromTexts(
    answerChoices,
    concept.answer,
    `${concept.id}:definition`,
  );
  const scenarioMatch = buildOptionsFromTexts(
    answerChoices,
    concept.answer,
    `${concept.id}:scenario`,
  );
  const purposeMatch = buildOptionsFromTexts(
    purposeChoices,
    concept.purpose,
    `${concept.id}:purpose`,
  );

  // Pre-compute the official exam-outline code once per concept; null when the
  // concept isn't RBT-eligible (those questions get filtered out downstream
  // anyway, so the null is harmless).
  const taskListCode = getTaskListCode(concept.id);
  const taskListSection = getTaskListSection(concept.id);

  return [
    {
      id: `${concept.id}_definition`,
      concept_id: concept.id,
      text: `Which concept is being described as ${concept.definition}`,
      topic: concept.topic,
      task_list_code: taskListCode,
      task_list_section: taskListSection,
      difficulty: concept.difficulty,
      explanation: concept.explanation,
      options: definitionMatch.options,
      correct_answer: definitionMatch.correct_answer,
    },
    {
      id: `${concept.id}_scenario`,
      concept_id: concept.id,
      text: `${concept.scenario} Which concept is the best match?`,
      topic: concept.topic,
      task_list_code: taskListCode,
      task_list_section: taskListSection,
      difficulty: concept.difficulty,
      explanation: concept.explanation,
      options: scenarioMatch.options,
      correct_answer: scenarioMatch.correct_answer,
    },
    {
      id: `${concept.id}_purpose`,
      concept_id: concept.id,
      text: `What is the main goal of ${concept.answer}?`,
      topic: concept.topic,
      task_list_code: taskListCode,
      task_list_section: taskListSection,
      difficulty: concept.difficulty,
      explanation: `${concept.explanation} The main goal is ${concept.purpose.toLowerCase()}`,
      options: purposeMatch.options,
      correct_answer: purposeMatch.correct_answer,
    },
  ];
}

export const baseQuestions = questionConcepts.flatMap(buildQuestionSeedSet);
export const rbtQuestions = baseQuestions.filter((question) =>
  isRbtEligibleConcept(questionConceptLookup[question.concept_id]),
);
export const TOTAL_PRACTICE_QUESTIONS = rbtQuestions.length;

// Boot-time invariant: every concept that ends up in the practice bank must
// have an exam-outline mapping. If someone adds a new concept without a code,
// this throws on import so the bug surfaces immediately instead of silently
// dropping that concept from per-section analytics.
validateConceptCoverage([...new Set(rbtQuestions.map((q) => q.concept_id))]);
export const OFFICIAL_CONCEPT_COUNT = questionConcepts.filter((concept) =>
  isRbtEligibleConcept(concept),
).length;

// ── Spanish concept translations ──────────────────────────────────────────────
// Loaded at runtime by question-translations-es-loader.js
let _conceptTranslationsEs = {};
// Reverse lookup: English option text → Spanish translation
let _answerToSpanish = {};
let _purposeToSpanish = {};

export function setConceptTranslations(translations) {
  _conceptTranslationsEs = translations || {};
  _answerToSpanish = {};
  _purposeToSpanish = {};
  for (const [conceptId, tr] of Object.entries(_conceptTranslationsEs)) {
    const concept = questionConceptLookup[conceptId];
    if (!concept) continue;
    // Only use reviewed/approved translations
    if (!tr.status || tr.status === 'draft_machine') continue;
    if (tr.options_es?.answer) _answerToSpanish[concept.answer] = tr.options_es.answer;
    if (tr.options_es?.purpose) _purposeToSpanish[concept.purpose] = tr.options_es.purpose;
  }
}

export function getConceptTranslationEs(conceptId) {
  const tr = _conceptTranslationsEs[conceptId];
  if (!tr) return null;
  // Only return reviewed or approved translations
  if (!tr.status || tr.status === 'draft_machine') return null;
  return tr;
}

export function getSpanishForOptionText(englishText) {
  return _answerToSpanish[englishText] || _purposeToSpanish[englishText] || null;
}

export const PRACTICE_TOPIC_TOTALS = rbtQuestions.reduce(
  (result, question) => ({
    ...result,
    [question.topic]: (result[question.topic] || 0) + 1,
  }),
  Object.keys(topicLabels).reduce((result, key) => {
    result[key] = 0;
    return result;
  }, {}),
);

const questionLookup = new Map(baseQuestions.map((question) => [question.id, question]));

function hashString(value) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function createRandom(seedValue) {
  let seed = hashString(String(seedValue)) || 1;

  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let result = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithRandom(items, random) {
  const nextItems = [...items];

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [nextItems[index], nextItems[swapIndex]] = [nextItems[swapIndex], nextItems[index]];
  }

  return nextItems;
}

function cloneQuestion(question) {
  return {
    ...question,
    options: question.options.map((option) => ({ ...option })),
  };
}

function uniqueQuestions(questions) {
  const seen = new Set();
  return questions.filter((question) => {
    if (seen.has(question.id)) {
      return false;
    }

    seen.add(question.id);
    return true;
  });
}

function buildQuestionPool({
  seedValue,
  excludeIds = [],
  sourceQuestions = rbtQuestions,
}) {
  const blockedIds = new Set(excludeIds);
  const preferred = shuffleStable(sourceQuestions, `${seedValue}:preferred`).filter(
    (question) => !blockedIds.has(question.id),
  );

  if (preferred.length >= sourceQuestions.length || blockedIds.size === 0) {
    return preferred;
  }

  const fallback = shuffleStable(sourceQuestions, `${seedValue}:fallback`);
  return uniqueQuestions([...preferred, ...fallback]);
}

function withPracticeMetadata(question, index) {
  return {
    ...cloneQuestion(question),
    original_id: question.original_id || question.id,
    practice_index: index + 1,
  };
}

export function getQuestionById(questionId) {
  return questionLookup.get(questionId) || null;
}

export function getQuestionsByIds(questionIds = []) {
  return questionIds
    .map((questionId) => getQuestionById(questionId))
    .filter(Boolean)
    .map(cloneQuestion);
}

export function sanitizeQuestion(question, mode = "practice") {
  const cloned = cloneQuestion(question);

  if (mode === "flashcards") {
    return cloned;
  }

  const {
    correct_answer: _correctAnswer,
    explanation: _explanation,
    ...safeQuestion
  } = cloned;

  return safeQuestion;
}

export function sanitizeQuestions(questions, mode = "practice") {
  return questions.map((question) => sanitizeQuestion(question, mode));
}

export function isRbtQuestion(question) {
  if (!question) {
    return false;
  }

  const concept = question.concept_id
    ? questionConceptLookup[question.concept_id]
    : null;

  if (concept) {
    return isRbtEligibleConcept(concept);
  }

  return rbtAllowedDifficultySet.has(question.difficulty);
}

export function evaluateQuestionAnswer(questionId, selectedAnswer) {
  const question = getQuestionById(questionId);

  if (!question) {
    return null;
  }

  return {
    question_id: question.id,
    selected_answer: selectedAnswer || "",
    is_correct: selectedAnswer === question.correct_answer,
    correct_answer: question.correct_answer,
    explanation: question.explanation,
    topic: question.topic,
  };
}

export function buildPracticeQuestionBank(
  size = TOTAL_PRACTICE_QUESTIONS,
  seed = "practice-default",
  options = {},
) {
  const pool = buildQuestionPool({
    seedValue: `practice:${seed}:${size}`,
    excludeIds: options.excludeIds,
  });

  return pool
    .slice(0, Math.min(size, TOTAL_PRACTICE_QUESTIONS))
    .map((question, index) => withPracticeMetadata(question, index));
}

export function buildFlashcardBank(
  size = TOTAL_PRACTICE_QUESTIONS,
  seed = "flashcards-default",
) {
  return shuffleStable(rbtQuestions, `flashcards:${seed}:${size}`)
    .slice(0, Math.min(size, TOTAL_PRACTICE_QUESTIONS))
    .map((question) => cloneQuestion(question));
}

/**
 * BACB RBT Test Content Outline 3rd Edition (eff. Jan 2026) — section weights.
 * 75 scored questions + 10 unscored pilot = 85 total.
 * Weights: A 18%, B 12%, C 24%, D 20%, E 14%, F 12%.
 * Counts below sum to exactly 85 and match those percentages as closely as
 * possible while keeping whole numbers.
 */
const MOCK_EXAM_SECTION_COUNTS = {
  A: 15, // 17.6%  (target 18%)
  B: 10, // 11.8%  (target 12%)
  C: 21, // 24.7%  (target 24%)
  D: 17, // 20.0%  (target 20%)
  E: 12, // 14.1%  (target 14%)
  F: 10, // 11.8%  (target 12%)
};

export function buildMockExamQuestionSet(
  size = 85,
  sourceQuestions = null,
  seed = `mock-${Date.now()}`,
  options = {},
) {
  // When a custom source pool is given (e.g. retry from weak areas) fall back
  // to a simple shuffle so callers can override the weighted sampling.
  if (Array.isArray(sourceQuestions) && sourceQuestions.length > 0) {
    return uniqueQuestions(sourceQuestions)
      .slice(0, Math.min(size, sourceQuestions.length))
      .map((question, index) => withPracticeMetadata(question, index));
  }

  const blockedIds = new Set(options.excludeIds || []);
  const eligible = rbtQuestions.filter((q) => !blockedIds.has(q.id));

  // Group by section letter (from task_list_section field set at build time)
  const bySection = {};
  eligible.forEach((q) => {
    const section = q.task_list_section || "?";
    if (!bySection[section]) bySection[section] = [];
    bySection[section].push(q);
  });

  // Shuffle each section's questions with a deterministic seed
  const selected = [];
  Object.entries(MOCK_EXAM_SECTION_COUNTS).forEach(([section, target]) => {
    const sectionPool = bySection[section] || [];
    const shuffled = shuffleStable(sectionPool, `mock:${seed}:section:${section}`);
    // Take up to `target` questions; if section is small, take what's available
    selected.push(...shuffled.slice(0, Math.min(target, shuffled.length)));
  });

  // Handle any shortfall by pulling from whatever section has extras
  if (selected.length < size) {
    const usedIds = new Set(selected.map((q) => q.id));
    const overflow = shuffleStable(eligible, `mock:${seed}:overflow`).filter(
      (q) => !usedIds.has(q.id),
    );
    selected.push(...overflow.slice(0, size - selected.length));
  }

  // Final shuffle so section blocks are interleaved randomly
  const finalPool = shuffleStable(selected, `mock:${seed}:final`);

  return finalPool
    .slice(0, Math.min(size, finalPool.length))
    .map((question, index) => withPracticeMetadata(question, index));
}
