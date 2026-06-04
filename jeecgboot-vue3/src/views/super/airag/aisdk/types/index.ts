import type { UIMessage } from 'ai';

export const AI_SDK_SESSION_TYPE = 'ai-sdk-dev';

export type AiSdkUIDataTypes = {
  thinking: {
    text?: string;
  };
  source: {
    items: AiSdkSourceItem[];
  };
  weather: Recordable;
  toolProgress: {
    items: AiSdkToolProgressItem[];
  };
  fileChanges: {
    items: AiSdkFileChangeItem[];
  };
  operationLog: {
    items: AiSdkOperationLogItem[];
  };
};

export type AiSdkSpecStage = 'start' | 'spec' | 'plan' | 'tasks' | 'completed' | 'failed' | string;

export interface AiSdkSpecArtifact {
  type?: string;
  path?: string | null;
  title?: string;
}

export interface AiSdkSpecResult {
  note?: string;
  source?: string;
  featureDir?: string | null;
  specPath?: string | null;
  planPath?: string | null;
  tasksPath?: string | null;
  taskCount?: number;
}

export interface AiSdkSpecData {
  stage: AiSdkSpecStage;
  status: string;
  message: string;
  skillId?: string;
  skillName?: string;
  template?: string | null;
  mode?: string;
  artifact?: AiSdkSpecArtifact | null;
  result?: AiSdkSpecResult | null;
  artifacts?: AiSdkSpecArtifact[];
}

export interface AiSdkMessageSkill {
  id: string;
  name: string;
}

export interface AiSdkMessageAttachment {
  id?: string;
  name?: string;
  size?: number;
  type?: string;
  path?: string;
  url?: string;
}

export interface AiSdkMessageMetadata {
  skills?: AiSdkMessageSkill[];
  attachments?: AiSdkMessageAttachment[];
}

export interface AiSdkContextMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiSdkSourceItem {
  title: string;
  url: string;
  snippet?: string;
  source?: string;
}

export interface AiSdkToolProgressItem {
  id: string;
  toolName: string;
  title: string;
  detail?: string;
}

export interface AiSdkFileChangeItem {
  path: string;
  additions: number;
  deletions: number;
}

export interface AiSdkOperationLogItem {
  id: string;
  icon: 'search' | 'terminal' | 'edit' | 'tool';
  text: string;
  detail?: string;
  status?: 'running' | 'done' | 'error';
}

export type AiSdkUIMessage = UIMessage<AiSdkMessageMetadata, AiSdkUIDataTypes>;
export type AiSdkMessagePart = AiSdkUIMessage['parts'][number];
export type AiSdkTextPart = Extract<AiSdkMessagePart, { type: 'text' }>;
export type AiSdkThinkingPart = Extract<AiSdkMessagePart, { type: 'data-thinking' }>;
export type AiSdkSourcePart = Extract<AiSdkMessagePart, { type: 'data-source' }>;
export type AiSdkWeatherPart = Extract<AiSdkMessagePart, { type: 'data-weather' }>;
export type AiSdkToolProgressPart = Extract<AiSdkMessagePart, { type: 'data-toolProgress' }>;
export type AiSdkFileChangesPart = Extract<AiSdkMessagePart, { type: 'data-fileChanges' }>;
export type AiSdkOperationLogPart = Extract<AiSdkMessagePart, { type: 'data-operationLog' }>;

export interface AiSdkHistoryItem {
  id: string;
  title: string;
  updatedAt: number;
  skillIds: string[];
  sessionType: typeof AI_SDK_SESSION_TYPE;
  appId?: string;
  appName?: string;
  modelId?: string;
}

export interface AiSdkServerConversation {
  id: string;
  title: string;
  appId?: string;
  appName?: string;
  modelId?: string;
  sessionType: typeof AI_SDK_SESSION_TYPE;
  skillIds?: string[];
  createTime?: string;
  updateTime?: string;
}

export interface AiSdkServerMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | string;
  content?: string;
  status?: string;
  modelId?: string;
  skillIds?: string[];
  metadata?: Recordable;
  runEvents?: AiSdkServerRunEvent[];
  createTime?: string;
}

export interface AiSdkServerRunEvent {
  id: string;
  runId: string;
  conversationId: string;
  sequence: number;
  eventType: OrchestratorEventName;
  phase: string;
  status: string;
  payload?: OrchestratorStreamEvent | Recordable | null;
  createTime?: string;
}

export type OrchestratorEventName =
  | 'RUN_STARTED'
  | 'PREFLIGHT'
  | 'MESSAGE'
  | 'TOOL_CALL'
  | 'TOOL_RESULT'
  | 'SKILL_SELECTED'
  | 'SPEC_EVENT'
  | 'MESSAGE_END'
  | 'CANCELLED'
  | 'ERROR';

export interface OrchestratorStreamEvent {
  version: string;
  runId: string;
  sequence: number;
  event: OrchestratorEventName;
  phase: string;
  status: string;
  timestamp: number;
  messageId?: string | null;
  conversationId?: string;
  topicId?: string;
  data?: Recordable | null;
}

export interface OrchestratorEventEnvelope {
  version: string;
  runId: string;
  sequence: number;
  phase: string;
  status: string;
  timestamp: number;
  messageId?: string | null;
  conversationId?: string;
  topicId?: string;
}

export interface OrchestratorEventDisplay {
  kind?: 'operation' | 'file_changes' | 'source' | 'message' | string;
  icon?: string;
  text?: string;
  detail?: string;
  status?: 'running' | 'done' | 'error' | 'cancelled' | string;
}

export interface OrchestratorEventData extends Recordable {
  title?: string;
  summary?: string;
  display?: OrchestratorEventDisplay | null;
  artifacts?: Recordable[];
  fileChanges?: AiSdkFileChangeItem[];
}

export type NormalizedOrchestratorStreamEvent =
  | {
      event: 'RUN_STARTED';
    } & OrchestratorEventEnvelope
  | {
      event: 'PREFLIGHT';
      data: OrchestratorEventData & {
        intent: string;
        riskLevel: string;
        summary: string;
        operationNote: string;
        safetyNotes: string[];
        proposedSteps: string[];
        verificationSteps: string[];
        needsClarification: boolean;
        requiresConfirmation: boolean;
        blocked: boolean;
        blockReason?: string;
      };
    } & OrchestratorEventEnvelope
  | {
      event: 'MESSAGE';
      data: OrchestratorEventData & {
        message: string;
      };
    } & OrchestratorEventEnvelope
  | {
      event: 'TOOL_CALL';
      data: OrchestratorEventData & {
        title: string;
        toolName: string;
        input?: Recordable | null;
        toolCallId?: string;
      };
    } & OrchestratorEventEnvelope
  | {
      event: 'TOOL_RESULT';
      data: OrchestratorEventData & {
        title: string;
        toolName: string;
        result: Recordable | null;
        toolCallId?: string;
      };
    } & OrchestratorEventEnvelope
  | {
      event: 'SKILL_SELECTED';
      data: OrchestratorEventData & {
        skillId?: string;
        skillName: string;
      };
    } & OrchestratorEventEnvelope
  | {
      event: 'SPEC_EVENT';
      data: OrchestratorEventData & {
        stage: AiSdkSpecStage;
        status: string;
        message: string;
        skillId?: string;
        skillName?: string;
        template?: string | null;
        mode?: string;
        artifact?: AiSdkSpecArtifact | null;
        result?: AiSdkSpecResult | null;
      };
    } & OrchestratorEventEnvelope
  | {
      event: 'MESSAGE_END';
    } & OrchestratorEventEnvelope
  | {
      event: 'CANCELLED';
      data: OrchestratorEventData & {
        message: string;
      };
    } & OrchestratorEventEnvelope
  | {
      event: 'ERROR';
      data: OrchestratorEventData & {
        message: string;
      };
    } & OrchestratorEventEnvelope;

export interface ComposerAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  file: File;
  previewUrl?: string;
}
