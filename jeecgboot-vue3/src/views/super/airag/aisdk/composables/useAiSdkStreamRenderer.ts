import { parseNormalizedStreamEvent } from '../utils/streamEventGuards';
import type { AiSdkSourceItem, NormalizedOrchestratorStreamEvent } from '../types';

interface UseAiSdkStreamRendererOptions {
  appendSourcePart: (id: string, items: AiSdkSourceItem[]) => void;
  appendWeatherPart: (id: string, data: Recordable) => void;
  finishMessage: (id: string) => void;
  updateThinkingMessage: (id: string, text: string) => void;
  updateMessage: (id: string, text: string) => void;
}

export function useAiSdkStreamRenderer(options: UseAiSdkStreamRendererOptions) {
  async function renderAssistantStream(readableStream: ReadableStream<Uint8Array>, assistantId: string) {
    if (!readableStream?.getReader) {
      options.updateMessage(assistantId, 'AI Orchestrator 没有返回有效的流式响应。');
      return { hasText: false };
    }
    const reader = readableStream.getReader();
    const decoder = new TextDecoder('UTF-8');
    let buffer = '';
    let text = '';
    let statusText = '正在思考';
    let pendingSources: AiSdkSourceItem[] = [];
    let ended = false;

    function appendAssistantText(content: string) {
      if (!content) return;
      text += content;
      options.updateMessage(assistantId, text || '正在思考');
    }

    function updateStatus(content: string) {
      if (!content || text) return;
      statusText = content;
      options.updateThinkingMessage(assistantId, statusText);
    }

    function handleMessageEvent(event: Extract<NormalizedOrchestratorStreamEvent, { event: 'MESSAGE' }>) {
      appendAssistantText(event.data.message);
    }

    function handleToolCallEvent(event: Extract<NormalizedOrchestratorStreamEvent, { event: 'TOOL_CALL' }>) {
      updateStatus(getToolRunningText(event.data.toolName, event.data.input, event.data.title));
    }

    function handleToolResultEvent(event: Extract<NormalizedOrchestratorStreamEvent, { event: 'TOOL_RESULT' }>) {
      updateStatus(getToolCompletedText(event.data.toolName));
      if (event.data.toolName === 'web_search' && event.data.result) {
        pendingSources = [...pendingSources, ...normalizeSearchSources(event.data.result)];
      }
      if (event.data.toolName === 'weather' && event.data.result) {
        options.appendWeatherPart(assistantId, event.data.result);
      }
    }

    function handleSkillSelectedEvent(event: Extract<NormalizedOrchestratorStreamEvent, { event: 'SKILL_SELECTED' }>) {
      updateStatus(`正在执行 Skill：${event.data.skillName}`);
    }

    function handleSpecEvent(event: Extract<NormalizedOrchestratorStreamEvent, { event: 'SPEC_EVENT' }>) {
      updateStatus(getSpecEventText(event.data));
    }

    function dispatchStreamEvent(event: NormalizedOrchestratorStreamEvent) {
      switch (event.event) {
        case 'INIT_REQUEST_ID':
          return;
        case 'MESSAGE':
          handleMessageEvent(event);
          return;
        case 'TOOL_CALL':
          handleToolCallEvent(event);
          return;
        case 'TOOL_RESULT':
          handleToolResultEvent(event);
          return;
        case 'SKILL_SELECTED':
          handleSkillSelectedEvent(event);
          return;
        case 'SPEC_EVENT':
          handleSpecEvent(event);
          return;
        case 'MESSAGE_END':
          ended = true;
          options.finishMessage(assistantId);
          flushPendingSources();
          return;
        case 'ERROR':
          ended = true;
          options.updateMessage(assistantId, event.data.message);
          options.finishMessage(assistantId);
          return;
        default:
          return;
      }
    }

    function parseSsePayload(part: string) {
      return part
        .split(/\r?\n/)
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trim())
        .join('\n')
        .trim();
    }

    function handleEventPayload(content: string) {
      if (!content) return;
      const event = parseNormalizedStreamEvent(content);
      if (event) dispatchStreamEvent(event);
    }

    function getToolRunningText(toolName: string, input?: Recordable | null, title?: string) {
      if (toolName === 'web_search') {
        const query = getToolInputText(input, ['query', 'q', 'keyword']);
        return query ? `正在搜索 ${query}` : '正在搜索网页';
      }
      if (toolName === 'weather') {
        const city = getToolInputText(input, ['city', 'location']);
        return city ? `正在查询${city}天气` : '正在查询天气';
      }
      return title || `正在调用 ${toolName}`;
    }

    function getToolCompletedText(toolName: string) {
      if (toolName === 'web_search') return '搜索完成，正在整理结果';
      if (toolName === 'weather') return '天气查询完成，正在整理结果';
      return '工具执行完成，正在整理结果';
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

    function getToolInputText(input: Recordable | null | undefined, keys: string[]) {
      if (!input) return '';
      for (const key of keys) {
        const value = input[key];
        if (typeof value === 'string' && value.trim()) return value.trim();
      }
      return '';
    }

    function flushPendingSources() {
      if (!pendingSources.length) return;
      options.appendSourcePart(assistantId, pendingSources);
      pendingSources = [];
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

    function isRecord(value: unknown): value is Recordable {
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    }

    function getString(value: unknown) {
      return typeof value === 'string' ? value.trim() : '';
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split(/\r?\n\r?\n/);
      buffer = parts.pop() || '';

      for (const part of parts) {
        handleEventPayload(parseSsePayload(part) || part.trim());
      }
    }
    if (buffer.trim()) {
      handleEventPayload(parseSsePayload(buffer) || buffer.trim());
    }
    if (!ended && !text) {
      options.updateMessage(assistantId, statusText || 'AI Orchestrator 已结束连接，但没有返回内容。');
    }
    if (!ended && text) {
      options.finishMessage(assistantId);
      flushPendingSources();
    }
    return { hasText: !!text };
  }

  return {
    renderAssistantStream,
  };
}
