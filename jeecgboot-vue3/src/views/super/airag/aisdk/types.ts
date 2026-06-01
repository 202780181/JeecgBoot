import type { UIMessage } from 'ai';

export const AI_SDK_SESSION_TYPE = 'ai-sdk-dev';

export type AiSdkUIDataTypes = {
  thinking: Recordable;
  tool: Recordable;
  weather: Recordable;
  spec: AiSdkSpecData;
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

export interface AiSdkMessageMetadata {
  skills?: AiSdkMessageSkill[];
}

export type AiSdkUIMessage = UIMessage<AiSdkMessageMetadata, AiSdkUIDataTypes>;
export type AiSdkMessagePart = AiSdkUIMessage['parts'][number];
export type AiSdkTextPart = Extract<AiSdkMessagePart, { type: 'text' }>;
export type AiSdkThinkingPart = Extract<AiSdkMessagePart, { type: 'data-thinking' }>;
export type AiSdkToolPart = Extract<AiSdkMessagePart, { type: 'data-tool' }>;
export type AiSdkWeatherPart = Extract<AiSdkMessagePart, { type: 'data-weather' }>;
export type AiSdkSpecPart = Extract<AiSdkMessagePart, { type: 'data-spec' }>;

export interface AiSdkHistoryItem {
  id: string;
  title: string;
  updatedAt: number;
  messages: AiSdkUIMessage[];
  skillIds: string[];
  sessionType: typeof AI_SDK_SESSION_TYPE;
}

export type OrchestratorEventName =
  | 'INIT_REQUEST_ID'
  | 'MESSAGE'
  | 'TOOL_CALL'
  | 'TOOL_RESULT'
  | 'SKILL_SELECTED'
  | 'SPEC_EVENT'
  | 'MESSAGE_END'
  | 'ERROR';

export interface OrchestratorStreamEvent {
  event: OrchestratorEventName;
  requestId?: string;
  conversationId?: string;
  topicId?: string;
  data?: Recordable | null;
}

export type NormalizedOrchestratorStreamEvent =
  | {
      event: 'INIT_REQUEST_ID';
      requestId?: string;
      conversationId?: string;
      topicId?: string;
    }
  | {
      event: 'MESSAGE';
      data: {
        message: string;
      };
    }
  | {
      event: 'TOOL_CALL';
      data: {
        title: string;
        toolName: string;
        input?: Recordable | null;
        toolCallId?: string;
      };
    }
  | {
      event: 'TOOL_RESULT';
      data: {
        title: string;
        toolName: string;
        result: Recordable | null;
        toolCallId?: string;
      };
    }
  | {
      event: 'SKILL_SELECTED';
      data: {
        skillId?: string;
        skillName: string;
      };
    }
  | {
      event: 'SPEC_EVENT';
      data: {
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
    }
  | {
      event: 'MESSAGE_END';
    }
  | {
      event: 'ERROR';
      data: {
        message: string;
      };
    };

export interface ComposerAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  file: File;
  previewUrl?: string;
}
