import type { NormalizedOrchestratorStreamEvent, OrchestratorEventData, OrchestratorEventDisplay, OrchestratorEventName } from '../types';

const KNOWN_EVENTS: OrchestratorEventName[] = [
  'RUN_STARTED',
  'PREFLIGHT',
  'MESSAGE',
  'TOOL_CALL',
  'TOOL_RESULT',
  'SKILL_SELECTED',
  'SPEC_EVENT',
  'MESSAGE_END',
  'CANCELLED',
  'ERROR',
];

type UnknownRecord = Record<string, unknown>;

export function parseNormalizedStreamEvent(content: string): NormalizedOrchestratorStreamEvent | null {
  if (!content) return null;
  try {
    return normalizeStreamEvent(JSON.parse(content));
  } catch (error) {
    console.log('AI SDK stream parse failed:', error, content);
    return null;
  }
}

export function normalizeStreamEvent(value: unknown): NormalizedOrchestratorStreamEvent | null {
  if (!isRecord(value)) return null;

  const event = value.event;
  if (!isKnownEvent(event)) {
    console.log('AI SDK unknown stream event:', value);
    return null;
  }
  const envelope = normalizeEnvelope(value);
  if (!envelope) {
    console.log('AI SDK invalid stream envelope:', value);
    return null;
  }

  const data = toRecord(value.data);
  const normalizedData = normalizeData(data);

  switch (event) {
    case 'RUN_STARTED':
      return {
        ...envelope,
        event,
      };
    case 'PREFLIGHT':
      return {
        ...envelope,
        event,
        data: {
          ...normalizedData,
          intent: firstString(data.intent, 'unknown'),
          riskLevel: firstString(data.riskLevel, 'low'),
          summary: firstString(data.summary, ''),
          operationNote: firstString(data.operationNote, ''),
          safetyNotes: toStringArray(data.safetyNotes),
          proposedSteps: toStringArray(data.proposedSteps),
          verificationSteps: toStringArray(data.verificationSteps),
          needsClarification: data.needsClarification === true,
          requiresConfirmation: data.requiresConfirmation === true,
          blocked: data.blocked === true,
          blockReason: getOptionalString(data.blockReason),
        },
      };
    case 'MESSAGE':
      return {
        ...envelope,
        event,
        data: {
          ...normalizedData,
          message: firstString(data.message, data.content, data.text, data.delta),
        },
      };
    case 'TOOL_CALL': {
      const toolName = firstString(data.toolName, data.name, data.tool, 'tool');
      return {
        ...envelope,
        event,
        data: {
          ...normalizedData,
          toolName,
          title: firstString(data.title, data.label, toolName, '工具调用'),
          input: toRecordOrNull(data.input ?? data.arguments ?? data.params),
          toolCallId: getOptionalString(data.toolCallId),
        },
      };
    }
    case 'TOOL_RESULT': {
      const toolName = firstString(data.toolName, data.name, data.tool, 'tool');
      const result = toRecordOrNull(data.result ?? data.output ?? data.data);
      return {
        ...envelope,
        event,
        data: {
          ...normalizedData,
          toolName,
          result,
          title: firstString(data.title, data.label, toolName, '工具结果'),
          toolCallId: getOptionalString(data.toolCallId),
        },
      };
    }
    case 'SKILL_SELECTED':
      return {
        ...envelope,
        event,
        data: {
          ...normalizedData,
          skillId: getOptionalString(data.skillId),
          skillName: firstString(data.skillName, data.name, data.title, '已选择 Skill'),
        },
      };
    case 'SPEC_EVENT':
      return {
        ...envelope,
        event,
        data: {
          ...normalizedData,
          stage: firstString(data.stage, 'start'),
          status: firstString(data.status, 'running'),
          message: firstString(data.message, data.status, data.title, 'spec-kit 进度已更新'),
          skillId: getOptionalString(data.skillId),
          skillName: getOptionalString(data.skillName),
          template: getOptionalString(data.template) || null,
          mode: getOptionalString(data.mode),
          artifact: toRecordOrNull(data.artifact),
          result: toRecordOrNull(data.result),
        },
      };
    case 'MESSAGE_END':
      return { ...envelope, event };
    case 'CANCELLED':
      return {
        ...envelope,
        event,
        data: {
          ...normalizedData,
          message: firstString(data.message, data.error, data.detail, '响应已停止'),
        },
      };
    case 'ERROR':
      return {
        ...envelope,
        event,
        data: {
          ...normalizedData,
          message: firstString(data.message, data.error, data.detail, '调用 AI Orchestrator 失败'),
        },
      };
    default:
      return null;
  }
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toRecord(value: unknown): UnknownRecord {
  return isRecord(value) ? value : {};
}

function toRecordOrNull(value: unknown): Recordable | null {
  return isRecord(value) ? (value as Recordable) : null;
}

function normalizeData(data: UnknownRecord): OrchestratorEventData {
  return {
    ...(data as Recordable),
    title: getOptionalString(data.title),
    summary: getOptionalString(data.summary),
    display: normalizeDisplay(data.display),
    artifacts: Array.isArray(data.artifacts) ? (data.artifacts.filter(isRecord) as Recordable[]) : undefined,
    fileChanges: Array.isArray(data.fileChanges) ? (data.fileChanges.filter(isRecord) as any[]) : undefined,
  };
}

function normalizeDisplay(value: unknown): OrchestratorEventDisplay | null {
  if (!isRecord(value)) return null;
  return {
    ...(value as Recordable),
    kind: getOptionalString(value.kind),
    icon: getOptionalString(value.icon),
    text: getOptionalString(value.text),
    detail: getOptionalString(value.detail),
    status: getOptionalString(value.status),
  };
}

function isKnownEvent(value: unknown): value is OrchestratorEventName {
  return typeof value === 'string' && KNOWN_EVENTS.includes(value as OrchestratorEventName);
}

function normalizeEnvelope(value: UnknownRecord) {
  const version = getOptionalString(value.version);
  const runId = getOptionalString(value.runId);
  const sequence = typeof value.sequence === 'number' ? value.sequence : Number(value.sequence);
  const phase = getOptionalString(value.phase);
  const status = getOptionalString(value.status);
  const timestamp = typeof value.timestamp === 'number' ? value.timestamp : Number(value.timestamp);
  if (!version || !runId || !Number.isFinite(sequence) || !phase || !status || !Number.isFinite(timestamp)) {
    return null;
  }
  return {
    version,
    runId,
    sequence,
    phase,
    status,
    timestamp,
    messageId: getOptionalString(value.messageId) || null,
    conversationId: getOptionalString(value.conversationId),
    topicId: getOptionalString(value.topicId),
  };
}

function getOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value) return value;
  }
  return '';
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && !!item);
}
