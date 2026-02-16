export type ActionStatus = 'PROPOSED' | 'APPROVED' | 'DISMISSED' | 'SNOOZED' | 'EXECUTED' | 'FAILED';
export type BlockerStatus = 'ACTIVE' | 'RESOLVED';
export type ExecutionModeDefault = 'ONE_TIME' | 'BACKGROUND';

export interface PatientRecord {
  meta: {
    patient_id: string;
    scenario_name: string;
  };
  patient_profile: {
    patient_name: string;
    dob?: string;
    sex?: string;
    mrn: string;
    primary_diagnosis: string;
    attending_physician: string;
    current_location: { unit: string; bed: string };
    disposition_target: string;
    insurance: {
      payer_name: string;
      auth_status: string;
      auth_deadline_local?: string | null;
      auth_reference?: string | null;
    };
  };
  encounter_timeline: {
    events: EncounterTimelineEvent[];
  };
  milestones: {
    items: MilestoneItem[];
  };
  worklist_view_state: {
    bucket_status: string;
    rank_position: number;
    los_day: number;
    expected_los_day?: number;
    active_agents: Array<{ agent: string; activity: string }>;
  };
  blockers: {
    items: Blocker[];
  };
  parsed_insights: {
    items: ParsedInsight[];
  };
  proposed_actions: {
    items: ProposedAction[];
  };
  execution_log?: {
    entries: ExecutionLogEntry[];
  };
  evidence_items: {
    items: EvidenceItem[];
  };
  demo_state_snapshots: DemoSnapshot[];
}

export interface Blocker {
  blocker_id: string;
  type: string;
  severity: 'RED' | 'ORANGE' | 'YELLOW';
  status: BlockerStatus;
  owner?: string;
  display_mode?: string;
  description: string;
  summary_line: string;
  due_by_local?: string | null;
  next_action_id?: string | null;
  surfaced_at_local?: string | null;
  resolved_at_local?: string | null;
  related_milestones?: string[];
  source_refs?: string[];
  nested_steps: NestedStep[];
  evidence_summary: {
    source_count: number;
    source_types: string[];
    last_evidence_update_local: string;
    view_evidence_label: string;
  };
}

export interface NestedStep {
  step_id: string;
  label: string;
  step_kind: 'PREREQUISITE' | 'EXECUTION' | 'TRACKING' | 'DECISION';
  execution_mode: 'AGENT_AUTOMATIC' | 'CM_PERMISSION_REQUIRED' | 'AGENT_BACKGROUND' | 'CM_DECISION';
  status: 'DONE' | 'PENDING' | 'NOT_STARTED' | 'NOT_NEEDED';
  visibility?: string;
  last_updated_local?: string;
}

export interface EncounterTimelineEvent {
  event_id: string;
  timestamp_local: string;
  event_type: string;
  title: string;
  details: string;
}

export interface MilestoneItem {
  milestone_id: string;
  label: string;
  tier: 'SCAFFOLD' | 'CM_CRITICAL';
  display_emphasis: 'MUTED' | 'PROMINENT';
  visibility: 'INTERNAL_ONLY' | 'SURFACE_WHEN_BLOCKED';
  status: 'DONE' | 'PENDING' | 'NOT_STARTED' | 'NOT_NEEDED';
  status_reason: string;
  last_updated_local: string;
  source_refs: string[];
  changes_next_action: boolean;
}

export interface ParsedInsight {
  insight_id: string;
  category: string;
  title: string;
  value: string;
  confidence_label: 'High' | 'Moderate' | 'Low';
  evidence_refs?: string[];
  source_snippets?: string[];
}

export interface BackgroundPolicy {
  enabled: boolean;
  cadence_hours: number;
  max_duration_hours: number;
  stop_conditions: string[];
  notify_on: string[];
}

export interface ProposedAction {
  action_id: string;
  title: string;
  reason: string;
  status: ActionStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  cta_primary: string;
  cta_secondary?: string;
  execution_mode_default: ExecutionModeDefault;
  background_policy: BackgroundPolicy;
  permission_microcopy: string;
  dependencies: string[];
  target_entities: Array<{ type: string; name: string; contact?: string; reference?: string }>;
}

export interface EvidenceItem {
  evidence_id: string;
  source_type: string;
  source_label: string;
  author_or_system: string;
  timestamp_local: string;
  linked_to: {
    blocker_ids: string[];
    action_ids: string[];
    insight_ids: string[];
  };
}

export interface ExecutionLogEntry {
  log_id: string;
  timestamp_local: string;
  event: string;
  actor: string;
  result: string;
  related_action_id?: string | null;
  ui_impact?: string;
}

export interface DemoSnapshot {
  state_id: string;
  label: string;
  timestamp_local: string;
  blocker_statuses: Array<{ blocker_id: string; status: BlockerStatus }>;
  worklist_state: {
    bucket_status: string;
    rank_position: number;
    active_agents?: Array<{ agent: string; activity: string }>;
  };
  action_statuses: Array<{ action_id: string; status: ActionStatus }>;
}

export interface MilestoneJourneyNode {
  id: string;
  nodeType: 'MILESTONE' | 'BLOCKER' | 'ENDPOINT';
  label: string;
  statusLabel: 'Complete' | 'Pending' | 'Blocked' | 'Not started';
  displayState: 'COMPLETE' | 'PENDING' | 'BLOCKED' | 'FUTURE';
  statusTone: 'COMPLETE' | 'PENDING' | 'BLOCKED' | 'FUTURE';
  isPostBlockerAdjusted?: boolean;
  isClickable: boolean;
  timestampLocal?: string | null;
  why: string;
  chips: string[];
  milestoneId?: string;
  blockerId?: string;
  linkedBlockerIds: string[];
  evidenceCount: number;
  evidenceItems: Array<{
    id: string;
    label: string;
    source: string;
    timestamp: string;
  }>;
  segmentBefore: 'COMPLETE' | 'PENDING' | 'BLOCKED' | 'FUTURE' | 'NONE';
  segmentAfter: 'COMPLETE' | 'PENDING' | 'BLOCKED' | 'FUTURE' | 'NONE';
}
