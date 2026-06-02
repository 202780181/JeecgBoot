import { Chat } from '@ai-sdk/vue';
import type {
  AiSdkMessageMetadata,
  AiSdkMessagePart,
  AiSdkSourceItem,
  AiSdkSourcePart,
  AiSdkTextPart,
  AiSdkThinkingPart,
  AiSdkUIMessage,
  AiSdkWeatherPart,
} from '../types';

export function useAiSdkChatMessages() {
  const chat = new Chat<AiSdkUIMessage>({
    messages: [],
  });

  function getMessageText(message: AiSdkUIMessage) {
    return message.parts.map((part) => (part.type === 'text' ? part.text : '')).join('');
  }

  function getMessageParts(message: AiSdkUIMessage) {
    return message.parts;
  }

  function addMessage(role: 'user' | 'assistant', text: string, metadata?: AiSdkMessageMetadata) {
    const id = `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const message: AiSdkUIMessage = {
      id,
      role,
      parts: [createTextPart(text, 'done')],
      ...(metadata ? { metadata } : {}),
    };
    chat.messages = [...chat.messages, message];
    return id;
  }

  function addThinkingMessage() {
    const id = `assistant-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const message: AiSdkUIMessage = {
      id,
      role: 'assistant',
      parts: [createThinkingPart()],
    };
    chat.messages = [...chat.messages, message];
    return id;
  }

  function updateMessage(id: string, text: string) {
    chat.messages = chat.messages.map((message): AiSdkUIMessage => {
      if (message.id !== id) return message;
      return {
        ...message,
        parts: mergeTextPart(getMessageParts(message), text, 'streaming'),
      };
    });
  }

  function finishMessage(id: string) {
    chat.messages = chat.messages.map((message): AiSdkUIMessage => {
      if (message.id !== id) return message;
      return {
        ...message,
        parts: getMessageParts(message).map((part): AiSdkMessagePart => (part.type === 'text' ? { ...part, state: 'done' } : part)),
      };
    });
  }

  function appendWeatherPart(id: string, data: Recordable) {
    chat.messages = chat.messages.map((message): AiSdkUIMessage => {
      if (message.id !== id) return message;
      return {
        ...message,
        parts: [...removeThinkingParts(getMessageParts(message)), createWeatherPart(data)],
      };
    });
  }

  function appendSourcePart(id: string, items: AiSdkSourceItem[]) {
    if (!items.length) return;
    chat.messages = chat.messages.map((message): AiSdkUIMessage => {
      if (message.id !== id) return message;
      return {
        ...message,
        parts: mergeSourcePart(getMessageParts(message), items),
      };
    });
  }

  function clearMessages() {
    chat.messages = [];
  }

  function mergeTextPart(parts: AiSdkMessagePart[], text: string, state: AiSdkTextPart['state']): AiSdkMessagePart[] {
    const nextParts = removeThinkingParts(parts);
    const firstTextPartIndex = nextParts.findIndex((part) => part.type === 'text');
    if (firstTextPartIndex >= 0) {
      nextParts[firstTextPartIndex] = createTextPart(text, state);
      return nextParts;
    }
    return [createTextPart(text, state), ...nextParts];
  }

  function removeThinkingParts(parts: AiSdkMessagePart[]): AiSdkMessagePart[] {
    return parts.filter((part) => part.type !== 'data-thinking') as AiSdkMessagePart[];
  }

  function createTextPart(text: string, state: AiSdkTextPart['state']): AiSdkTextPart {
    return { type: 'text', text, state };
  }

  function updateThinkingMessage(id: string, text: string) {
    chat.messages = chat.messages.map((message): AiSdkUIMessage => {
      if (message.id !== id) return message;
      return {
        ...message,
        parts: [createThinkingPart(text)],
      };
    });
  }

  function createThinkingPart(text = '正在思考'): AiSdkThinkingPart {
    return { type: 'data-thinking', data: { text } };
  }

  function createWeatherPart(data: Recordable): AiSdkWeatherPart {
    return { type: 'data-weather', data };
  }

  function createSourcePart(items: AiSdkSourceItem[]): AiSdkSourcePart {
    return { type: 'data-source', data: { items } };
  }

  function mergeSourcePart(parts: AiSdkMessagePart[], items: AiSdkSourceItem[]): AiSdkMessagePart[] {
    const nextParts = removeThinkingParts(parts);
    const index = nextParts.findIndex((part) => part.type === 'data-source');
    if (index < 0) {
      return [...nextParts, createSourcePart(dedupeSources(items))];
    }
    const current = nextParts[index] as AiSdkSourcePart;
    nextParts[index] = createSourcePart(dedupeSources([...(current.data.items || []), ...items]));
    return nextParts;
  }

  function dedupeSources(items: AiSdkSourceItem[]) {
    const seen = new Set<string>();
    const result: AiSdkSourceItem[] = [];
    for (const item of items) {
      if (!item.url || seen.has(item.url)) continue;
      seen.add(item.url);
      result.push(item);
    }
    return result.slice(0, 6);
  }

  return {
    addMessage,
    addThinkingMessage,
    appendSourcePart,
    appendWeatherPart,
    chat,
    clearMessages,
    finishMessage,
    getMessageParts,
    getMessageText,
    updateThinkingMessage,
    updateMessage,
  };
}
