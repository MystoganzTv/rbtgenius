/**
 * Maps every RBT-eligible concept ID to its primary BACB RBT Test Content
 * Outline (3rd ed.) item code.
 *
 * The large object below is the historical source map built around the old
 * Task List 2.0 structure. We keep it as a durable concept catalogue, then
 * remap it into the 2026 outline at import time so we can:
 *   - keep stable concept IDs and historical data
 *   - retire concepts that no longer fit the current exam model
 *   - avoid silently keeping old 2.0-only items alive
 */

import { TASK_LIST_ITEM_BY_CODE } from "./task-list.js";

const LEGACY_CONCEPT_TO_TASK_LIST = {
  // ─── A. Measurement ────────────────────────────────────────────────────────
  measurement_data_collection_preparation: "A-1",
  measurement_timing_accuracy:            "A-1",

  measurement_frequency:                  "A-2",
  measurement_duration:                   "A-2",
  measurement_latency:                    "A-2",
  measurement_rate:                       "A-2",
  measurement_trial_by_trial:             "A-2",
  measurement_count:                      "A-2",
  measurement_event_recording:            "A-2",
  measurement_mean_duration:              "A-2",

  measurement_partial_interval:           "A-3",
  measurement_whole_interval:             "A-3",
  measurement_momentary_time_sampling:    "A-3",

  measurement_permanent_product:          "A-4",

  measurement_graph_updating:             "A-5",
  measurement_percentage_correct:         "A-5",
  measurement_percentage_opportunities:   "A-5",
  measurement_percentage:                 "A-5",
  measurement_graph_trend:                "A-5",
  measurement_missing_data_impact:        "A-5",
  measurement_data_summarization:         "A-5",
  documentation_baseline_data_entry:      "A-5",

  measurement_observable_terms:           "A-6",
  measurement_measurable_terms:           "A-6",
  measurement_topography:                 "A-6",
  measurement_environment_description:    "A-6",

  // ─── B. Assessment ─────────────────────────────────────────────────────────
  assessment_preference:                  "B-1",
  assessment_paired_stimulus:             "B-1",
  assessment_mswo:                        "B-1",
  assessment_single_stimulus_preference:  "B-1",
  assessment_multiple_stimulus_preference:"B-1",
  assessment_preference_hierarchy:        "B-1",
  assessment_reinforcer:                  "B-1",
  assessment_free_operant:                "B-1",

  assessment_skill_strengths:             "B-2",
  assessment_skill_deficits:              "B-2",
  assessment_probe_assessment:            "B-2",
  assessment_baseline:                    "B-2",
  assessment_direct:                      "B-2",
  assessment_direct_observation:          "B-2",
  assessment_operational_definition:      "B-2",
  assessment_skill:                       "B-2",
  assessment_curriculum_based:            "B-2",
  assessment_developmental:               "B-2",
  assessment_social_skills:               "B-2",

  assessment_abc:                         "B-3",
  assessment_indirect:                    "B-3",
  assessment_interview:                   "B-3",
  assessment_functional_assessment_participation: "B-3",
  assessment_structured_interview:        "B-3",
  assessment_environmental_assessment:    "B-3",

  // ─── C. Skill Acquisition ──────────────────────────────────────────────────
  skill_written_plan_components:          "C-1",

  skill_session_preparation:              "C-2",

  skill_positive_reinforcement:           "C-3",
  skill_negative_reinforcement:           "C-3",
  skill_conditioned_reinforcer:           "C-3",
  skill_continuous_reinforcement:         "C-3",
  skill_intermittent_reinforcement:       "C-3",
  skill_reinforcer_pairing:               "C-3",

  skill_dtt:                              "C-4",
  skill_net:                              "C-5",
  skill_incidental_teaching:              "C-5",

  skill_task_analysis:                    "C-6",
  skill_forward_chaining:                 "C-6",
  skill_backward_chaining:                "C-6",

  skill_discrimination_training:          "C-7",

  skill_prompt_fading:                    "C-8",

  skill_least_to_most:                    "C-9",
  skill_most_to_least_prompting:          "C-9",
  skill_model_prompt:                     "C-9",
  skill_gesture_prompt:                   "C-9",
  skill_verbal_prompt:                    "C-9",
  skill_physical_prompt:                  "C-9",
  skill_errorless_teaching:               "C-9",
  skill_prompt_hierarchy:                 "C-9",

  skill_maintenance:                      "C-10",

  skill_shaping:                          "C-11",

  skill_token_exchange:                   "C-12",
  skill_token_economy:                    "C-12",

  // ─── D. Behavior Reduction ─────────────────────────────────────────────────
  behavior_written_plan_components:       "D-1",

  behavior_attention_function:            "D-2",
  behavior_escape_function:               "D-2",
  behavior_tangible_function:             "D-2",
  behavior_automatic_function:            "D-2",
  behavior_four_functions:                "D-2",

  behavior_antecedent:                    "D-3",
  behavior_high_p:                        "D-3",
  behavior_choice_making:                 "D-3",
  behavior_precorrection:                 "D-3",
  behavior_redirection:                   "D-3",
  behavior_antecedent_modification:       "D-3",

  behavior_dra_specific:                  "D-4",
  behavior_dra:                           "D-4",
  behavior_dri:                           "D-4",
  behavior_dro:                           "D-4",
  behavior_fct:                           "D-4",
  behavior_drr:                           "D-4",
  behavior_replacement_behavior:          "D-4",
  behavior_escape_replacement_response:   "D-4",
  behavior_attention_replacement_response:"D-4",
  behavior_tangible_replacement_response: "D-4",

  behavior_extinction:                    "D-5",
  behavior_planned_ignoring:              "D-5",

  behavior_safety_monitoring:             "D-6",

  // ─── E. Documentation and Reporting ────────────────────────────────────────
  documentation_supervisor_update:        "E-1",
  documentation_follow_up_communication_note: "E-1",

  professional_clarification_request:     "E-2",
  professional_seek_clinical_direction:   "E-2",
  professional_timely_direction_seeking:  "E-2",

  documentation_caregiver_log:            "E-3",
  documentation_relevant_variables:       "E-3",
  documentation_health_status_change:     "E-3",
  documentation_medication_change_report: "E-3",
  documentation_caregiver_update_note:    "E-3",
  documentation_environmental_change_report: "E-3",
  documentation_preference_update:        "E-3",
  documentation_environmental_context:    "E-3",

  documentation_notes:                    "E-4",
  documentation_immediate_entry:          "E-4",
  documentation_timestamp:                "E-4",
  documentation_abc_note:                 "E-4",
  documentation_trial_by_trial:           "E-4",
  documentation_prompt_levels:            "E-4",
  documentation_mastery_tracking:         "E-4",
  documentation_objective_language:       "E-4",
  documentation_subjective_statement:     "E-4",
  documentation_plan_deviation_note:      "E-4",
  documentation_absence_note:             "E-4",
  documentation_cancellation_note:        "E-4",
  documentation_partial_session_note:     "E-4",
  documentation_prompt_change_note:       "E-4",
  documentation_reinforcer_change_note:   "E-4",
  documentation_timely_reporting:         "E-4",
  documentation_material_change:          "E-4",
  documentation_reinforcement_log:        "E-4",
  documentation_session_objective:        "E-4",

  documentation_integrity:                "E-5",
  documentation_data_transcription_check: "E-5",
  documentation_signature_compliance:     "E-5",
  documentation_documentation_timeliness: "E-5",
  professional_documentation_timeliness:  "E-5",
  professional_workplace_policy_compliance:"E-5",

  // ─── F. Professional Conduct and Scope of Practice ─────────────────────────
  professional_supervision:               "F-1",
  professional_scope:                     "F-1",
  professional_following_plan:            "F-1",
  professional_supervision_preparation:   "F-1",
  professional_scope_refusal:             "F-1",
  professional_chain_of_command:          "F-1",
  professional_required_supervision_participation: "F-1",
  professional_supervisor_notification:   "F-1",
  professional_truthful_representation:   "F-1",
  professional_referral_outside_scope:    "F-1",
  professional_consistency:               "F-1",

  professional_communication:             "F-2",
  professional_record_honesty:            "F-2",
  professional_feedback_receptivity:      "F-2",
  professional_implement_feedback:        "F-2",
  professional_error_reporting:           "F-2",

  professional_guardian_consent:          "F-3",
  professional_interdisciplinary_collaboration: "F-3",
  professional_role_appropriate_communication: "F-3",

  professional_boundaries:                "F-4",
  professional_confidentiality:           "F-4",
  professional_social_media:              "F-4",
  professional_private_information_security: "F-4",
  professional_secure_record_storage:     "F-4",
  professional_public_privacy_protection: "F-4",
  professional_gift_boundary:             "F-4",
  professional_social_media_confidentiality: "F-4",
  professional_minimum_necessary_disclosure: "F-4",

  professional_dignity:                   "F-5",
  professional_assent:                    "F-5",
  professional_cultural_responsiveness:   "F-5",
  professional_caregiver_respect:         "F-5",
  professional_professionalism_under_stress: "F-5",
  professional_nonjudgmental_language:    "F-5",
  professional_respectful_language:       "F-5",
  professional_demeanor:                  "F-5",
  professional_client_preference_respect: "F-5",
  professional_client_rights_protection:  "F-5",

  // ─── Wave 2 — A-1 ──────────────────────────────────────────────────────────
  measurement_behavior_plan_review:       "A-1",
  measurement_data_sheet_setup:           "A-1",
  measurement_operational_def_review:     "A-1",
  measurement_materials_prep:             "A-1",
  measurement_ioa_preparation:            "A-1",
  measurement_reinforcer_check_prep:      "A-1",

  // ─── Wave 2 — A-2 ──────────────────────────────────────────────────────────
  measurement_frequency_vs_rate:          "A-2",
  measurement_total_duration_across:      "A-2",
  measurement_continuous_when:            "A-2",
  measurement_ioa_total_count:            "A-2",
  measurement_ioa_duration_method:        "A-2",
  measurement_recording_multiple_behaviors: "A-2",

  // ─── Wave 2 — A-3 ──────────────────────────────────────────────────────────
  measurement_interval_selection:         "A-3",
  measurement_whole_vs_partial_intervals: "A-3",
  measurement_mts_when_to_use:            "A-3",
  measurement_interval_size_effect:       "A-3",
  measurement_discontinuous_limitation:   "A-3",

  // ─── Wave 2 — A-4 ──────────────────────────────────────────────────────────
  measurement_permanent_product_when:     "A-4",
  measurement_permanent_product_examples: "A-4",
  measurement_permanent_product_ioa:      "A-4",
  measurement_work_sample_collection:     "A-4",
  measurement_product_accuracy_scoring:   "A-4",

  // ─── Wave 2 — A-5 ──────────────────────────────────────────────────────────
  measurement_graph_components:           "A-5",
  measurement_phase_line:                 "A-5",
  measurement_data_entry_accuracy:        "A-5",
  measurement_graph_reading_basic:        "A-5",

  // ─── Wave 2 — A-6 ──────────────────────────────────────────────────────────
  measurement_dead_man_test:              "A-6",
  measurement_label_vs_describe:          "A-6",
  measurement_environment_terms:          "A-6",
  measurement_pinpointing_behavior:       "A-6",

  // ─── Wave 2 — B-1 ──────────────────────────────────────────────────────────
  assessment_preference_satiation:        "B-1",
  assessment_preference_deprivation:      "B-1",
  assessment_stimulus_sampling:           "B-1",
  assessment_edible_vs_activity_preference: "B-1",

  // ─── Wave 2 — B-2 ──────────────────────────────────────────────────────────
  assessment_skill_probe:                 "B-2",
  assessment_mastery_criterion:           "B-2",
  assessment_rbt_assessment_role:         "B-2",

  // ─── Wave 2 — B-3 ──────────────────────────────────────────────────────────
  assessment_abc_pattern_review:          "B-3",
  assessment_setting_event_identification: "B-3",
  assessment_fa_condition_implementation: "B-3",
  assessment_rbt_data_collection_fba:     "B-3",

  // ─── Wave 2 — C-1 ──────────────────────────────────────────────────────────
  skill_sap_behavioral_objective:         "C-1",
  skill_sap_reinforcement_plan:           "C-1",
  skill_sap_data_system:                  "C-1",
  skill_sap_mastery_criteria:             "C-1",
  skill_sap_generalization_plan:          "C-1",
  skill_sap_teaching_procedure:           "C-1",
  skill_sap_target_behavior:              "C-1",

  // ─── Wave 2 — C-2 ──────────────────────────────────────────────────────────
  skill_material_gathering:               "C-2",
  skill_environment_arrangement:          "C-2",
  skill_reinforcer_preparation:           "C-2",
  skill_presession_data_review:           "C-2",
  skill_stimulus_preparation:             "C-2",
  skill_presession_program_review:        "C-2",
  skill_presession_supervisor_contact:    "C-2",

  // ─── Wave 2 — C-3 ──────────────────────────────────────────────────────────
  skill_reinforcement_immediacy:          "C-3",
  skill_reinforcement_magnitude:          "C-3",
  skill_reinforcement_schedule_thinning:  "C-3",
  skill_varied_reinforcement:             "C-3",

  // ─── Wave 2 — C-4 ──────────────────────────────────────────────────────────
  skill_dtt_discriminative_stimulus:      "C-4",
  skill_dtt_learner_response:             "C-4",
  skill_dtt_consequence_delivery:         "C-4",
  skill_dtt_intertrial_interval:          "C-4",
  skill_dtt_trial_components:             "C-4",
  skill_dtt_massed_practice:              "C-4",
  skill_dtt_multiple_programs:            "C-4",
  skill_dtt_error_correction:             "C-4",
  skill_dtt_trial_pacing:                 "C-4",

  // ─── Wave 2 — C-5 ──────────────────────────────────────────────────────────
  skill_net_contriving_opportunity:       "C-5",
  skill_net_learner_motivation:           "C-5",
  skill_net_dtt_comparison:               "C-5",
  skill_net_environment_use:              "C-5",
  skill_net_capture_vs_contrive:          "C-5",
  skill_net_embedded_instruction:         "C-5",

  // ─── Wave 2 — C-6 ──────────────────────────────────────────────────────────
  skill_total_task_chaining:              "C-6",
  skill_task_analysis_writing:            "C-6",
  skill_chaining_comparison:              "C-6",
  skill_chaining_step_independence:       "C-6",
  skill_task_analysis_steps:              "C-6",

  // ─── Wave 2 — C-7 ──────────────────────────────────────────────────────────
  skill_discriminative_stimulus_sd:       "C-7",
  skill_s_delta:                          "C-7",
  skill_massed_trials_discrimination:     "C-7",
  skill_random_rotation:                  "C-7",
  skill_discrimination_error_correction:  "C-7",
  skill_stimulus_control_definition:      "C-7",
  skill_target_rotation_sequence:         "C-7",

  // ─── Wave 2 — C-8 ──────────────────────────────────────────────────────────
  skill_most_to_least_hierarchy:          "C-8",
  skill_stimulus_prompt_fading:           "C-8",
  skill_response_prompt_types:            "C-8",
  skill_prompt_dependency_avoidance:      "C-8",
  skill_time_delay_types:                 "C-8",
  skill_stimulus_control_transfer:        "C-8",
  skill_independent_response_reinforcement: "C-8",

  // ─── Wave 2 — C-9 ──────────────────────────────────────────────────────────
  skill_graduated_guidance:               "C-9",
  skill_prompt_fading_criteria:           "C-9",
  skill_natural_cues_use:                 "C-9",
  skill_prompt_hierarchy_selection:       "C-9",

  // ─── Wave 2 — C-10 ─────────────────────────────────────────────────────────
  skill_stimulus_generalization:          "C-10",
  skill_response_generalization:          "C-10",
  skill_generalization_programming:       "C-10",
  skill_multiple_exemplar_training:       "C-10",
  skill_maintenance_probe:                "C-10",
  skill_natural_reinforcers:              "C-10",
  skill_generalization_probe:             "C-10",

  // ─── Wave 2 — C-11 ─────────────────────────────────────────────────────────
  skill_successive_approximations:        "C-11",
  skill_shaping_step_advancement:         "C-11",
  skill_shaping_vs_prompt_fading:         "C-11",
  skill_shaping_step_size:                "C-11",
  skill_shaping_topography:               "C-11",
  skill_shaping_regression:               "C-11",
  skill_shaping_new_behavior:             "C-11",

  // ─── Wave 2 — C-12 ─────────────────────────────────────────────────────────
  skill_token_delivery_procedure:         "C-12",
  skill_backup_reinforcer:                "C-12",
  skill_token_board_use:                  "C-12",
  skill_token_backup_exchange:            "C-12",
  skill_token_ratio:                      "C-12",
  skill_token_system_fading:              "C-12",

  // ─── Wave 2 — D-1 ──────────────────────────────────────────────────────────
  behavior_brp_operational_definition:    "D-1",
  behavior_brp_function_statement:        "D-1",
  behavior_brp_antecedent_section:        "D-1",
  behavior_brp_reinforcement_section:     "D-1",
  behavior_brp_crisis_section:            "D-1",
  behavior_brp_replacement_section:       "D-1",
  behavior_rbt_follows_brp:               "D-1",

  // ─── Wave 2 — D-2 ──────────────────────────────────────────────────────────
  behavior_function_from_abc:             "D-2",
  behavior_multiple_functions:            "D-2",
  behavior_function_vs_topography:        "D-2",

  // ─── Wave 2 — D-3 ──────────────────────────────────────────────────────────
  behavior_environment_modification:      "D-3",
  behavior_visual_supports:               "D-3",
  behavior_transition_warning:            "D-3",
  behavior_task_modification:             "D-3",

  // ─── Wave 2 — D-5 ──────────────────────────────────────────────────────────
  behavior_extinction_consistency:        "D-5",
  behavior_extinction_burst_management:   "D-5",
  behavior_spontaneous_recovery:          "D-5",
  behavior_planned_ignoring_procedure:    "D-5",
  behavior_escape_extinction_implementation: "D-5",
  behavior_extinction_safety:             "D-5",

  // ─── Wave 2 — D-6 ──────────────────────────────────────────────────────────
  behavior_crisis_plan_review:            "D-6",
  behavior_escalation_levels:             "D-6",
  behavior_crisis_supervisor_notification: "D-6",
  behavior_post_crisis_documentation:     "D-6",
  behavior_deescalation_strategies:       "D-6",
  behavior_physical_management_authorization: "D-6",
  behavior_safe_environment_crisis:       "D-6",

  // ─── Wave 2 — E-1 ──────────────────────────────────────────────────────────
  documentation_session_debrief:          "E-1",
  documentation_between_session_contact:  "E-1",
  documentation_concern_reporting:        "E-1",
  documentation_communication_format:     "E-1",
  documentation_progress_update:          "E-1",
  documentation_urgent_contact:           "E-1",

  // ─── Wave 2 — E-2 ──────────────────────────────────────────────────────────
  professional_uncertainty_action:        "E-2",
  professional_novel_behavior_response:   "E-2",
  professional_unclear_plan_response:     "E-2",
  professional_scope_question:            "E-2",
  professional_proactive_consultation:    "E-2",

  // ─── Wave 2 — E-3 ──────────────────────────────────────────────────────────
  documentation_illness_report:           "E-3",
  documentation_environmental_hazard:     "E-3",

  // ─── Wave 2 — F-1 ──────────────────────────────────────────────────────────
  professional_supervision_frequency:     "F-1",

  // ─── Wave 2 — F-2 ──────────────────────────────────────────────────────────
  professional_feedback_behavior_change:  "F-2",
  professional_self_monitoring:           "F-2",
  professional_constructive_disagreement: "F-2",

  // ─── Wave 2 — F-3 ──────────────────────────────────────────────────────────
  professional_family_communication:      "F-3",
  professional_information_sharing_limits: "F-3",
  professional_caregiver_behavior_support: "F-3",
  professional_team_member_communication: "F-3",
  professional_stakeholder_update_protocol: "F-3",

  // ─── Wave 2 — F-4 ──────────────────────────────────────────────────────────
  professional_outside_work_contact:      "F-4",
  professional_personal_disclosure_limits: "F-4",
  professional_dual_relationship_avoidance: "F-4",

  // ─── Wave 2 — F-5 ──────────────────────────────────────────────────────────
  professional_person_first_language:     "F-5",
  professional_client_autonomy:           "F-5",

  // ─── Wave 3 — New TCO 3rd Edition concepts ─────────────────────────────────
  // A-7 (identify trends in graphed data)
  measurement_increasing_trend:           "A-7",
  measurement_decreasing_trend:           "A-7",
  measurement_variable_trend:             "A-7",
  measurement_stable_trend:               "A-7",
  measurement_trend_direction:            "A-7",

  // C-2 (conditioned reinforcers) — "C-2" not in legacy remap map, safe
  skill_conditioned_reinforcer_pairing_procedure: "C-2",
  skill_praise_as_conditioned_reinforcer: "C-2",
  skill_conditioned_vs_unconditioned_reinforcer:  "C-2",

  // C-9 (maintenance vs acquisition) — "C-9" remaps to C-7 in legacy map,
  // so TCO_2026_CODE_OVERRIDES entries below force the correct code
  skill_acquisition_phase_definition:     "C-9",
  skill_maintenance_phase_definition:     "C-9",
  skill_acquisition_vs_maintenance_selection: "C-9",

  // D-5 (punishment procedures) — "D-5" remaps to D-4 in legacy map,
  // so TCO_2026_CODE_OVERRIDES entries below force the correct code
  behavior_punishment_definition:         "D-5",
  behavior_positive_punishment:           "D-5",
  behavior_negative_punishment:           "D-5",
  behavior_time_out_procedure:            "D-5",
  behavior_response_cost_procedure:       "D-5",
  behavior_rbt_punishment_role:           "D-5",

  // D-6 (side effects of extinction/punishment) — "D-6" remaps to D-7 in
  // legacy map, so TCO_2026_CODE_OVERRIDES entries below force the correct code
  behavior_extinction_burst_definition:   "D-6",
  behavior_spontaneous_recovery_definition: "D-6",
  behavior_punishment_side_effects:       "D-6",
  behavior_aggression_during_extinction:  "D-6",

  // F-4 (supervision practices) — "F-4" remaps to F-7 in legacy map,
  // so TCO_2026_CODE_OVERRIDES entries below force the correct code
  professional_supervision_feedback_role:         "F-4",
  professional_supervision_contact_frequency:     "F-4",
  professional_effective_supervision_components:  "F-4",
  professional_rbt_prepares_for_supervision:      "F-4",
  professional_supervision_documentation:         "F-4",
  professional_applying_supervisory_feedback:     "F-4",

  // F-6 (public communication) — "F-6" not in legacy remap map, safe
  professional_social_media_client_identity:  "F-6",
  professional_accurate_public_statements:    "F-6",
  professional_no_public_client_disclosure:   "F-6",
  professional_rbt_credential_accuracy:       "F-6",

  // F-7 (multiple relationships) — "F-7" not in legacy remap map, safe
  professional_dual_relationship_definition:  "F-7",
  professional_managing_dual_relationships:   "F-7",

  // F-8 (gift-giving) — "F-8" not in legacy remap map, safe
  professional_gift_receiving_policy:         "F-8",
  professional_gift_giving_to_clients:        "F-8",
  professional_gift_cultural_context:         "F-8",
  professional_gift_policy_consultation:      "F-8",

  // ─── Base bank concepts not previously in map ──────────────────────────────
  // These existed in question-bank.js but were silently excluded after
  // STRICT_RBT_ALLOWED_CONCEPT_IDS was simplified to Object.keys(CONCEPT_TO_TASK_LIST).
  // All are beginner/intermediate difficulty and belong in the question pool.

  // A-1 (continuous measurement)
  measurement_magnitude:                      "A-1",
  measurement_opportunity_based:              "A-1",

  // A-4 (enter data and update graphs) — "A-4" remaps to A-3 in legacy map;
  // override entry below forces correct code
  documentation_graphing:                     "A-4",

  // A-6 (calculate and summarize data) — "A-6" remaps to A-5 in legacy map;
  // override entries below force correct code
  documentation_data_summary:                 "A-6",
  documentation_behavior_frequency_summary:   "A-6",
  measurement_accuracy:                       "A-6",

  // B-2 (individualized skill assessment) — "B-2" is identity in legacy map, safe
  assessment_target_behavior_selection:       "B-2",
  assessment_task_analysis_probe:             "B-2",

  // B-3 (functional assessment components) — "B-3" is identity in legacy map, safe
  assessment_descriptive:                     "B-3",
  assessment_hypothesis_statement:            "B-3",

  // C-3 (DTT) — "C-3" remaps to C-1 in legacy map; override entry below forces correct code
  skill_choral_responding:                    "C-3",

  // D-2 (antecedent interventions) — "D-2" remaps to D-1 in legacy map;
  // override entry below forces correct code
  behavior_contingency_review:                "D-2",
};

const OMITTED_CONCEPT_IDS = new Set([
  "measurement_data_collection_preparation",
  "measurement_behavior_plan_review",
  "measurement_data_sheet_setup",
  "measurement_materials_prep",
  "measurement_ioa_preparation",
  "measurement_reinforcer_check_prep",
  "skill_written_plan_components",
  "skill_session_preparation",
  "skill_sap_behavioral_objective",
  "skill_sap_reinforcement_plan",
  "skill_sap_data_system",
  "skill_sap_mastery_criteria",
  "skill_sap_generalization_plan",
  "skill_sap_teaching_procedure",
  "skill_sap_target_behavior",
  "skill_material_gathering",
  "skill_environment_arrangement",
  "skill_reinforcer_preparation",
  "skill_stimulus_preparation",
  "skill_presession_data_review",
  "skill_presession_program_review",
  "skill_presession_supervisor_contact",
  "behavior_written_plan_components",
  "behavior_brp_operational_definition",
  "behavior_brp_function_statement",
  "behavior_brp_antecedent_section",
  "behavior_brp_reinforcement_section",
  "behavior_brp_crisis_section",
  "behavior_brp_replacement_section",
  "behavior_rbt_follows_brp",
  "professional_mandated_reporting",
  "professional_safety",
]);

const LEGACY_CODE_TO_TCO_2026 = {
  "A-2": "A-1",
  "A-3": "A-2",
  "A-4": "A-3",
  "A-5": "A-4",
  "A-6": "A-5",
  "B-1": "B-1",
  "B-2": "B-2",
  "B-3": "B-3",
  "C-3": "C-1",
  "C-4": "C-3",
  "C-5": "C-4",
  "C-6": "C-5",
  "C-7": "C-6",
  "C-8": "C-7",
  "C-9": "C-7",
  "C-10": "C-8",
  "C-11": "C-10",
  "C-12": "C-11",
  "D-2": "D-1",
  "D-3": "D-2",
  "D-4": "D-3",
  "D-5": "D-4",
  "D-6": "D-7",
  "E-1": "E-1",
  "E-2": "E-2",
  "E-3": "E-3",
  "E-4": "E-4",
  "E-5": "E-4",
  "F-1": "F-2",
  "F-2": "F-9",
  "F-3": "F-9",
  "F-4": "F-7",
  "F-5": "F-10",
};

const TCO_2026_CODE_OVERRIDES = {
  assessment_operational_definition: "A-5",
  behavior_extinction_burst_management: "D-6",
  behavior_extinction_safety: "D-6",
  behavior_physical_management_authorization: "D-7",
  behavior_response_cost: "D-5",
  behavior_spontaneous_recovery: "D-6",
  measurement_data_summarization: "A-6",
  measurement_discontinuous_limitation: "A-8",
  measurement_frequency_vs_rate: "A-6",
  measurement_graph_trend: "A-7",
  measurement_ioa_duration_method: "A-8",
  measurement_ioa_total_count: "A-8",
  measurement_mean_duration: "A-6",
  measurement_missing_data_impact: "A-8",
  measurement_operational_def_review: "A-8",
  measurement_percentage: "A-6",
  measurement_percentage_correct: "A-6",
  measurement_percentage_opportunities: "A-6",
  measurement_rate: "A-6",
  measurement_timing_accuracy: "A-8",
  professional_chain_of_command: "F-3",
  professional_client_preference_respect: "F-10",
  professional_client_rights_protection: "F-1",
  professional_confidentiality: "F-5",
  professional_demeanor: "F-1",
  professional_dignity: "F-1",
  professional_gift_boundary: "F-8",
  professional_guardian_consent: "F-5",
  professional_minimum_necessary_disclosure: "F-5",
  professional_private_information_security: "F-5",
  professional_public_privacy_protection: "F-5",
  professional_record_honesty: "F-1",
  professional_required_supervision_participation: "F-3",
  professional_respectful_language: "F-1",
  professional_role_appropriate_communication: "F-9",
  professional_secure_record_storage: "F-5",
  professional_social_media: "F-6",
  professional_social_media_confidentiality: "F-5",
  professional_supervision: "F-3",
  professional_supervision_frequency: "F-3",
  professional_supervision_preparation: "F-4",
  professional_supervisor_notification: "F-3",
  skill_conditioned_reinforcer: "C-2",
  skill_maintenance: "C-9",
  skill_maintenance_probe: "C-9",
  skill_reinforcer_pairing: "C-2",

  // Wave 3 — C-9 concepts (legacy "C-9" remaps to C-7; force correct code)
  skill_acquisition_phase_definition:         "C-9",
  skill_maintenance_phase_definition:         "C-9",
  skill_acquisition_vs_maintenance_selection: "C-9",

  // Wave 3 — D-5 concepts (legacy "D-5" remaps to D-4; force correct code)
  behavior_punishment_definition:         "D-5",
  behavior_positive_punishment:           "D-5",
  behavior_negative_punishment:           "D-5",
  behavior_time_out_procedure:            "D-5",
  behavior_response_cost_procedure:       "D-5",
  behavior_rbt_punishment_role:           "D-5",

  // Wave 3 — D-6 concepts (legacy "D-6" remaps to D-7; force correct code)
  behavior_extinction_burst_definition:       "D-6",
  behavior_spontaneous_recovery_definition:   "D-6",
  behavior_punishment_side_effects:           "D-6",
  behavior_aggression_during_extinction:      "D-6",

  // Wave 3 — F-4 concepts (legacy "F-4" remaps to F-7; force correct code)
  professional_supervision_feedback_role:         "F-4",
  professional_supervision_contact_frequency:     "F-4",
  professional_effective_supervision_components:  "F-4",
  professional_rbt_prepares_for_supervision:      "F-4",
  professional_supervision_documentation:         "F-4",
  professional_applying_supervisory_feedback:     "F-4",

  // Base bank re-activations — codes that would be remapped incorrectly
  documentation_graphing:                     "A-4",  // "A-4" → "A-3" without override
  documentation_data_summary:                 "A-6",  // "A-6" → "A-5" without override
  documentation_behavior_frequency_summary:   "A-6",
  measurement_accuracy:                       "A-6",
  skill_choral_responding:                    "C-3",  // "C-3" → "C-1" without override
  behavior_contingency_review:                "D-2",  // "D-2" → "D-1" without override
};

export const CONCEPT_TO_TASK_LIST = Object.fromEntries(
  [
    ...Object.entries(LEGACY_CONCEPT_TO_TASK_LIST),
    ["behavior_response_cost", "D-5"],
  ].flatMap(([conceptId, legacyCode]) => {
    if (OMITTED_CONCEPT_IDS.has(conceptId)) {
      return [];
    }

    const remappedCode =
      TCO_2026_CODE_OVERRIDES[conceptId] ||
      LEGACY_CODE_TO_TCO_2026[legacyCode] ||
      legacyCode;

    return [[conceptId, remappedCode]];
  }),
);

/**
 * O(1) lookup. Returns the exam-outline code for a given concept ID, or null
 * if the concept isn't mapped.
 */
export function getTaskListCode(conceptId) {
  return CONCEPT_TO_TASK_LIST[conceptId] || null;
}

/**
 * Returns the section letter ("A".."F") for a concept. Convenience for
 * computing section-level mastery from attempts that only carry concept_id.
 */
export function getTaskListSection(conceptId) {
  const code = getTaskListCode(conceptId);
  if (!code) return null;
  const [section] = code.split("-");
  return section;
}

/**
 * Run-time invariant. Given the list of concept IDs the question bank
 * actually emits, throws if any concept is missing from the map (so a new
 * concept added in question-bank.js without a code shows up as a hard error
 * instead of silently dropping out of the analytics).
 */
export function validateConceptCoverage(conceptIds = []) {
  const missing = [];
  const invalidCodes = [];

  conceptIds.forEach((conceptId) => {
    const code = CONCEPT_TO_TASK_LIST[conceptId];
    if (!code) {
      missing.push(conceptId);
    } else if (!TASK_LIST_ITEM_BY_CODE[code]) {
      invalidCodes.push({ conceptId, code });
    }
  });

  if (missing.length || invalidCodes.length) {
    const lines = [];
    if (missing.length) {
      lines.push(`Concepts missing from CONCEPT_TO_TASK_LIST: ${missing.join(", ")}`);
    }
    if (invalidCodes.length) {
      lines.push(
        `Concepts mapped to unknown task-list codes: ${invalidCodes
          .map((entry) => `${entry.conceptId}=>${entry.code}`)
          .join(", ")}`,
      );
    }
    throw new Error(lines.join(" | "));
  }

  return true;
}
