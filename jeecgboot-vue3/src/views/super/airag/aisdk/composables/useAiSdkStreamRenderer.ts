import { parseNormalizedStreamEvent } from '../utils/streamEventGuards';
import type {
  AiSdkFileChangeItem,
  AiSdkOperationLogItem,
  AiSdkSourceItem,
  AiSdkToolProgressItem,
  NormalizedOrchestratorStreamEvent,
  OrchestratorStreamEvent,
} from '../types';

interface UseAiSdkStreamRendererOptions {
  appendSourcePart: (id: string, items: AiSdkSourceItem[]) => void;
  appendFileChangesPart: (id: string, items: AiSdkFileChangeItem[]) => void;
  appendOperationLogPart: (id: string, item: AiSdkOperationLogItem) => void;
  upsertToolProgressPart: (id: string, item: AiSdkToolProgressItem) => void;
  removeToolProgressPart: (id: string, itemId: string) => void;
  clearToolProgressParts: (id: string) => void;
  appendWeatherPart: (id: string, data: Recordable) => void;
  finishMessage: (id: string) => void;
  updateThinkingMessage: (id: string, text: string) => void;
  updateMessage: (id: string, text: string) => void;
}

export function useAiSdkStreamRenderer(options: UseAiSdkStreamRendererOptions) {
  function createRenderSession(assistantId: string) {
    let text = '';
    let statusText = '正在思考';
    let pendingSources: AiSdkSourceItem[] = [];
    let pendingFileChanges: AiSdkFileChangeItem[] = [];
    let ended = false;

    function appendAssistantText(content: string) {
      if (!content) return;
      clearNextStepProgress();
      text += content;
      options.updateMessage(assistantId, text || '正在思考');
    }

    function updateStatus(content: string) {
      if (!content || text) return;
      statusText = content;
      options.updateThinkingMessage(assistantId, statusText);
    }

    function dispatchStreamEvent(event: NormalizedOrchestratorStreamEvent) {
      switch (event.event) {
        case 'RUN_STARTED':
          return;
        case 'PREFLIGHT':
          renderDisplay(event, 'agent-preflight');
          updateStatus(event.data.display?.text || event.data.operationNote || event.data.summary || '正在理解需求并检查操作安全');
          return;
        case 'MESSAGE':
          renderDisplay(event);
          appendAssistantText(event.data.message);
          return;
        case 'TOOL_CALL':
          handleToolCallEvent(event);
          return;
        case 'TOOL_RESULT':
          handleToolResultEvent(event);
          return;
        case 'SKILL_SELECTED':
          renderDisplay(event);
          updateStatus(event.data.display?.text || `正在执行 Skill：${event.data.skillName}`);
          return;
        case 'SPEC_EVENT':
          renderDisplay(event);
          updateStatus(event.data.display?.text || getSpecEventText(event.data));
          return;
        case 'MESSAGE_END':
          ended = true;
          options.clearToolProgressParts(assistantId);
          options.finishMessage(assistantId);
          flushFinalParts();
          return;
        case 'CANCELLED':
          ended = true;
          options.clearToolProgressParts(assistantId);
          options.finishMessage(assistantId);
          flushFinalParts();
          return;
        case 'ERROR':
          ended = true;
          options.clearToolProgressParts(assistantId);
          renderDisplay(event);
          options.updateMessage(assistantId, event.data.message);
          options.finishMessage(assistantId);
          return;
        default:
          return;
      }
    }

    function handleToolCallEvent(event: Extract<NormalizedOrchestratorStreamEvent, { event: 'TOOL_CALL' }>) {
      clearNextStepProgress();
      const operation = getOperationFromDisplay(event) || fallbackOperation(event, 'running');
      const progressId = getToolProgressId(event.data.toolCallId, event.data.toolName);
      options.upsertToolProgressPart(assistantId, {
        id: progressId,
        toolName: event.data.toolName,
        title: operation.text,
        detail: operation.detail,
      });
      appendOperationLog(progressId, operation.icon, operation.text, operation.detail, operation.status || 'running');
      updateStatus(operation.text);
    }

    function handleToolResultEvent(event: Extract<NormalizedOrchestratorStreamEvent, { event: 'TOOL_RESULT' }>) {
      options.removeToolProgressPart(assistantId, getToolProgressId(event.data.toolCallId, event.data.toolName));
      const fileChanges = normalizeFileChanges(event.data.fileChanges);
      if (fileChanges.length) {
        pendingFileChanges = [...pendingFileChanges, ...fileChanges];
      }
      renderDisplay(event);
      if (event.data.display?.kind !== 'operation') {
        const operation = fallbackOperation(event, 'done');
        appendOperationLog(getToolProgressId(event.data.toolCallId, event.data.toolName), operation.icon, operation.text, operation.detail, operation.status || 'done');
      }
      if (event.data.display?.kind === 'source' && event.data.result) {
        pendingSources = [...pendingSources, ...normalizeSearchSources(event.data.result)];
      } else {
        pendingSources = [...pendingSources, ...normalizeSources(event.data.sources)];
      }
      if (event.data.display?.kind === 'message' && event.data.display.text) {
        appendAssistantText(event.data.display.text);
      }
      if (event.data.toolName === 'weather' && event.data.result && event.data.display?.kind !== 'message') {
        options.appendWeatherPart(assistantId, event.data.result);
      }
      showNextStepProgress();
    }

    function renderDisplay(event: Extract<NormalizedOrchestratorStreamEvent, { data: Recordable }>, fixedId?: string) {
      const display = event.data.display;
      if (!display?.kind) return;
      const id = fixedId || getDisplayId(event);
      if (display.kind === 'operation') {
        appendOperationLog(id, toOperationIcon(display.icon), display.text || event.data.title || '', display.detail || event.data.summary, toOperationStatus(display.status));
        return;
      }
      if (display.kind === 'file_changes') {
        const changes = normalizeFileChanges(event.data.fileChanges);
        if (changes.length) pendingFileChanges = [...pendingFileChanges, ...changes];
        return;
      }
      if (display.kind === 'source') {
        pendingSources = [...pendingSources, ...normalizeSources(event.data.sources)];
        return;
      }
      if (display.kind === 'message' && display.text) {
        appendAssistantText(display.text);
      }
    }

    function getOperationFromDisplay(event: Extract<NormalizedOrchestratorStreamEvent, { data: Recordable }>): AiSdkOperationLogItem | null {
      const display = event.data.display;
      if (!display || display.kind !== 'operation') return null;
      return {
        id: getDisplayId(event),
        icon: toOperationIcon(display.icon),
        text: display.text || event.data.title || '',
        detail: display.detail || event.data.summary,
        status: toOperationStatus(display.status),
      };
    }

    function getDisplayId(event: Extract<NormalizedOrchestratorStreamEvent, { data?: Recordable }>) {
      const data = event.data || {};
      return getString(data.toolCallId) || `${event.event}-${event.sequence}`;
    }

    function getNextStepProgressId() {
      return `${assistantId}-next-step`;
    }

    function showNextStepProgress() {
      options.upsertToolProgressPart(assistantId, {
        id: getNextStepProgressId(),
        toolName: 'assistant_next_step',
        title: '正在分析下一步操作',
      });
    }

    function clearNextStepProgress() {
      options.removeToolProgressPart(assistantId, getNextStepProgressId());
    }

    function appendOperationLog(id: string, icon: AiSdkOperationLogItem['icon'], text: string, detail: string | undefined, status: AiSdkOperationLogItem['status']) {
      if (!text) return;
      options.appendOperationLogPart(assistantId, { id, icon, text, detail, status });
    }

    function flushPendingSources() {
      if (!pendingSources.length) return;
      options.appendSourcePart(assistantId, pendingSources);
      pendingSources = [];
    }

    function flushPendingFileChanges() {
      if (!pendingFileChanges.length) return;
      options.appendFileChangesPart(assistantId, pendingFileChanges);
      pendingFileChanges = [];
    }

    function flushFinalParts() {
      flushPendingSources();
      flushPendingFileChanges();
    }

    function finalizeOpenStream() {
      if (!ended && !text) {
        options.clearToolProgressParts(assistantId);
        options.updateMessage(assistantId, statusText || 'AI Orchestrator 已结束连接，但没有返回内容。');
      }
      if (!ended && text) {
        options.clearToolProgressParts(assistantId);
        options.finishMessage(assistantId);
        flushFinalParts();
      }
      return { hasText: !!text };
    }

    return {
      dispatchStreamEvent,
      finalizeOpenStream,
    };
  }

  async function renderAssistantStream(readableStream: ReadableStream<Uint8Array>, assistantId: string) {
    if (!readableStream?.getReader) {
      options.updateMessage(assistantId, 'AI Orchestrator 没有返回有效的流式响应。');
      return { hasText: false };
    }
    const reader = readableStream.getReader();
    const decoder = new TextDecoder('UTF-8');
    const session = createRenderSession(assistantId);
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split(/\r?\n\r?\n/);
      buffer = parts.pop() || '';

      for (const part of parts) {
        dispatchPayload(session, parseSsePayload(part) || part.trim());
      }
    }
    if (buffer.trim()) {
      dispatchPayload(session, parseSsePayload(buffer) || buffer.trim());
    }
    return session.finalizeOpenStream();
  }

  function renderAssistantEvents(events: OrchestratorStreamEvent[], assistantId: string) {
    const session = createRenderSession(assistantId);
    events.forEach((event) => {
      const normalized = parseNormalizedStreamEvent(JSON.stringify(event));
      if (normalized) {
        session.dispatchStreamEvent(normalized);
      }
    });
    return session.finalizeOpenStream();
  }

  function dispatchPayload(session: ReturnType<typeof createRenderSession>, content: string) {
    if (!content) return;
    const event = parseNormalizedStreamEvent(content);
    if (event) session.dispatchStreamEvent(event);
  }

  function parseSsePayload(part: string) {
    return part
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())
      .join('\n')
      .trim();
  }

  function fallbackOperation(event: Extract<NormalizedOrchestratorStreamEvent, { data: Recordable }>, status: AiSdkOperationLogItem['status']): AiSdkOperationLogItem {
    const toolName = getString(event.data.toolName) || event.event;
    return {
      id: getString(event.data.toolCallId) || `${event.event}-${event.sequence}`,
      icon: status === 'running' ? 'search' : 'tool',
      text: getString(event.data.title) || (status === 'running' ? `正在执行 ${toolName}` : `已完成 ${toolName}`),
      detail: getString(event.data.summary),
      status,
    };
  }

  function getToolProgressId(toolCallId: string | undefined, toolName: string) {
    return toolCallId || toolName;
  }

  function getSpecEventText(data: Extract<NormalizedOrchestratorStreamEvent, { event: 'SPEC_EVENT' }>['data']) {
    const stageText = getSpecStageText(data.stage);
    const skillName = data.template || data.skillName || 'spec-kit';
    if (data.status === 'failed') return data.message || `${stageText || skillName} 执行失败`;
    if (data.stage === 'completed') return data.message || `${skillName} 执行完成`;
    if (stageText) return `正在生成 ${stageText}`;
    if (data.message) return data.message;
    return `正在执行 ${skillName}`;
  }

  function getSpecStageText(stage: string) {
    if (stage === 'spec') return 'Spec';
    if (stage === 'plan') return 'Plan';
    if (stage === 'tasks') return 'Tasks';
    if (stage === 'start') return '';
    return stage;
  }

  function toOperationIcon(icon: unknown): AiSdkOperationLogItem['icon'] {
    if (icon === 'search' || icon === 'edit' || icon === 'terminal' || icon === 'tool') return icon;
    return 'tool';
  }

  function toOperationStatus(status: unknown): AiSdkOperationLogItem['status'] {
    if (status === 'running' || status === 'done' || status === 'error') return status;
    if (status === 'failed' || status === 'cancelled') return 'error';
    return 'done';
  }

  function normalizeSearchSources(result: Recordable): AiSdkSourceItem[] {
    const results = Array.isArray(result.results) ? result.results : [];
    return results
      .map((item) => {
        if (!isRecord(item)) return null;
        const url = getString(item.url);
        if (!url) return null;
        return {
          title: getString(item.title) || url,
          url,
          snippet: getString(item.snippet),
          source: getString(item.source),
        } satisfies AiSdkSourceItem;
      })
      .filter(Boolean) as AiSdkSourceItem[];
  }

  function normalizeSources(value: unknown): AiSdkSourceItem[] {
    const items = Array.isArray(value) ? value : [];
    return items
      .map((item) => {
        if (!isRecord(item)) return null;
        const url = getString(item.url);
        if (!url) return null;
        return {
          title: getString(item.title) || url,
          url,
          snippet: getString(item.snippet) || getString(item.content),
          source: getString(item.source),
        } satisfies AiSdkSourceItem;
      })
      .filter(Boolean) as AiSdkSourceItem[];
  }

  function normalizeFileChanges(value: unknown): AiSdkFileChangeItem[] {
    const items = Array.isArray(value) ? value : [];
    return items
      .map((item) => {
        if (!isRecord(item)) return null;
        const path = getString(item.path);
        if (!path) return null;
        return {
          path,
          additions: getNumber(item.additions),
          deletions: getNumber(item.deletions),
        } satisfies AiSdkFileChangeItem;
      })
      .filter((item): item is AiSdkFileChangeItem => !!item && hasLineDelta(item))
      .filter(Boolean) as AiSdkFileChangeItem[];
  }

  function hasLineDelta(item: AiSdkFileChangeItem) {
    return item.additions > 0 || item.deletions > 0;
  }

  function isRecord(value: unknown): value is Recordable {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  function getString(value: unknown) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function getNumber(value: unknown) {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }

  return {
    renderAssistantEvents,
    renderAssistantStream,
  };
}
