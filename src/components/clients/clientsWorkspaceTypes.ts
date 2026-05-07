import { AdminChildRecord, AdminPaymentRecord } from '../../lib/backendApi';
import {
  ClientNextAction,
  ClientStage,
  ClientTaskItem,
  ClientTemperature,
  ClientTimelineEntry,
  TrialWorkspaceStage,
} from './clientStatus';

export type WorkspaceTab = 'today' | 'funnel' | 'base' | 'trials' | 'tasks' | 'archive';
export type MobileWorkspaceTab = 'today' | 'funnel' | 'trials' | 'base' | 'more';
export type MobileMoreTab = 'tasks' | 'archive' | 'sources' | 'tech';
export type TaskTab = 'mine' | 'today' | 'overdue' | 'unassigned' | 'done';
export type StageFilter = 'all' | 'leads' | 'trials' | 'waiting_payment' | 'active' | 'risk' | 'archive';
export type TemperatureFilter = 'all' | 'hot' | 'warm' | 'cold' | 'problem';
export type ArchiveFilter = 'all' | 'lost' | 'no_response' | 'no_show' | 'too_expensive' | 'schedule' | 'former' | 'duplicate' | 'other';

export interface ClientWorkspaceEntry {
  child: AdminChildRecord;
  payments: AdminPaymentRecord[];
  stage: ClientStage;
  temperature: ClientTemperature;
  nextAction: ClientNextAction;
  timeline: ClientTimelineEntry[];
  relatedTasks: ClientTaskItem[];
  trialFacts: {
    trialStage: TrialWorkspaceStage;
    title: string;
    note: string;
  };
  latestOpenPayment: AdminPaymentRecord | null;
}

export interface ClientWorkspaceSection {
  id: string;
  title: string;
  items: ClientWorkspaceEntry[];
}
