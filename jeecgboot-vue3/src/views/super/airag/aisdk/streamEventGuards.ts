import type { NormalizedOrchestratorStreamEvent, OrchestratorEventName } from './types';

const KNOWN_EVENTS: OrchestratorEventName[] = [
  'INIT_REQUEST_ID',
  'MESSAGE',
  'TOOL_CALL',
  'TOOL_RESULT',
  'SKILL_SELECTED',
  'SPEC_EVENT',
  'MESSAGE_END',
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

  const data = toRecord(value.data);

  switch (event) {
    case 'INIT_REQUEST_ID':
      return {
        event,
        requestId: getOptionalString(value.requestId),
        conversationId: getOptionalString(value.conversationId),
        topicId: getOptionalString(value.topicId),
      };
    case 'MESSAGE':
      return {
        event,
        data: {
          message: firstString(data.message, data.content, data.text, data.delta),
        },
      };
    case 'TOOL_CALL': {
      const toolName = firstString(data.toolName, data.name, data.tool, 'tool');
      return {
        event,
        data: {
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
        event,
        data: {
          toolName,
          result,
          title: firstString(data.title, data.label, toolName, '工具结果'),
          toolCallId: getOptionalString(data.toolCallId),
        },
      };
    }
    case 'SKILL_SELECTED':
      return {
        event,
        data: {
          skillId: getOptionalString(data.skillId),
          skillName: firstString(data.skillName, data.name, data.title, '已选择 Skill'),
        },
      };
    case 'SPEC_EVENT':
      return {
        event,
        data: {
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
      return { event };
    case 'ERROR':
      return {
        event,
        data: {
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

function isKnownEvent(value: unknown): value is OrchestratorEventName {
  return typeof value === 'string' && KNOWN_EVENTS.includes(value as OrchestratorEventName);
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
