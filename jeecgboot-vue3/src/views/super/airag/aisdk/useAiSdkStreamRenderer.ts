import { parseNormalizedStreamEvent } from './streamEventGuards';
import type { NormalizedOrchestratorStreamEvent } from './types';

interface UseAiSdkStreamRendererOptions {
  appendSpecPart: (id: string, data: Extract<NormalizedOrchestratorStreamEvent, { event: 'SPEC_EVENT' }>['data']) => void;
  appendToolPart: (id: string, data: Recordable) => void;
  appendWeatherPart: (id: string, data: Recordable) => void;
  finishMessage: (id: string) => void;
  updateMessage: (id: string, text: string) => void;
}

export function useAiSdkStreamRenderer(options: UseAiSdkStreamRendererOptions) {
  async function renderAssistantStream(readableStream: ReadableStream<Uint8Array>, assistantId: string) {
    if (!readableStream?.getReader) {
      options.updateMessage(assistantId, 'AI Orchestrator 没有返回有效的流式响应。');
      return;
    }
    const reader = readableStream.getReader();
    const decoder = new TextDecoder('UTF-8');
    let buffer = '';
    let text = '';
    let ended = false;

    function appendAssistantText(content: string) {
      if (!content) return;
      text += content;
      options.updateMessage(assistantId, text || '正在思考');
    }

    function appendStatusLine(content: string) {
      appendAssistantText(`${text ? '\n\n' : ''}${content}`);
    }

    function handleMessageEvent(event: Extract<NormalizedOrchestratorStreamEvent, { event: 'MESSAGE' }>) {
      appendAssistantText(event.data.message);
    }

    function handleToolCallEvent(event: Extract<NormalizedOrchestratorStreamEvent, { event: 'TOOL_CALL' }>) {
      options.appendToolPart(assistantId, {
        status: 'running',
        title: event.data.title,
        toolName: event.data.toolName,
        input: event.data.input,
        toolCallId: event.data.toolCallId,
      });
    }

    function handleToolResultEvent(event: Extract<NormalizedOrchestratorStreamEvent, { event: 'TOOL_RESULT' }>) {
      if (event.data.toolName === 'weather' && event.data.result) {
        options.appendWeatherPart(assistantId, event.data.result);
        return;
      }
      options.appendToolPart(assistantId, {
        status: 'completed',
        title: event.data.title,
        toolName: event.data.toolName,
        result: event.data.result,
        toolCallId: event.data.toolCallId,
      });
    }

    function handleSkillSelectedEvent(event: Extract<NormalizedOrchestratorStreamEvent, { event: 'SKILL_SELECTED' }>) {
      appendStatusLine(`已选择 Skill：${event.data.skillName}`);
    }

    function handleSpecEvent(event: Extract<NormalizedOrchestratorStreamEvent, { event: 'SPEC_EVENT' }>) {
      options.appendSpecPart(assistantId, event.data);
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
      options.updateMessage(assistantId, 'AI Orchestrator 已结束连接，但没有返回内容。');
    }
    if (!ended && text) {
      options.finishMessage(assistantId);
    }
  }

  return {
    renderAssistantStream,
  };
}
