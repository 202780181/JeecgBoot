import { Chat } from '@ai-sdk/vue';
import type {
  AiSdkFileChangeItem,
  AiSdkFileChangesPart,
  AiSdkMessageMetadata,
  AiSdkMessagePart,
  AiSdkOperationLogItem,
  AiSdkOperationLogPart,
  AiSdkSourceItem,
  AiSdkSourcePart,
  AiSdkTextPart,
  AiSdkThinkingPart,
  AiSdkToolProgressItem,
  AiSdkToolProgressPart,
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

  function findMessageById(id: string) {
    return chat.messages.find((message) => message.id === id);
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

  function upsertToolProgressPart(id: string, item: AiSdkToolProgressItem) {
    chat.messages = chat.messages.map((message): AiSdkUIMessage => {
      if (message.id !== id) return message;
      return {
        ...message,
        parts: mergeToolProgressPart(getMessageParts(message), item),
      };
    });
  }

  function removeToolProgressPart(id: string, itemId: string) {
    chat.messages = chat.messages.map((message): AiSdkUIMessage => {
      if (message.id !== id) return message;
      return {
        ...message,
        parts: removeToolProgressItem(getMessageParts(message), itemId),
      };
    });
  }

  function clearToolProgressParts(id: string) {
    chat.messages = chat.messages.map((message): AiSdkUIMessage => {
      if (message.id !== id) return message;
      return {
        ...message,
        parts: removeToolProgressParts(getMessageParts(message)),
      };
    });
  }

  function appendFileChangesPart(id: string, items: AiSdkFileChangeItem[]) {
    if (!items.length) return;
    chat.messages = chat.messages.map((message): AiSdkUIMessage => {
      if (message.id !== id) return message;
      return {
        ...message,
        parts: mergeFileChangesPart(getMessageParts(message), items),
      };
    });
  }

  function appendOperationLogPart(id: string, item: AiSdkOperationLogItem) {
    if (!item.id || !item.text) return;
    chat.messages = chat.messages.map((message): AiSdkUIMessage => {
      if (message.id !== id) return message;
      return {
        ...message,
        parts: mergeOperationLogPart(getMessageParts(message), item),
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
    const insertIndex = getTextInsertIndex(nextParts);
    nextParts.splice(insertIndex, 0, createTextPart(text, state));
    return nextParts;
  }

  function getTextInsertIndex(parts: AiSdkMessagePart[]) {
    const operationIndex = parts.findIndex((part) => part.type === 'data-operationLog');
    if (operationIndex >= 0) return operationIndex + 1;
    const toolProgressIndex = parts.findIndex((part) => part.type === 'data-toolProgress');
    if (toolProgressIndex >= 0) return toolProgressIndex + 1;
    return 0;
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
      const nextParts = removeThinkingParts(getMessageParts(message));
      return {
        ...message,
        parts: [createThinkingPart(text), ...nextParts],
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

  function createToolProgressPart(items: AiSdkToolProgressItem[]): AiSdkToolProgressPart {
    return { type: 'data-toolProgress', data: { items } };
  }

  function createFileChangesPart(items: AiSdkFileChangeItem[]): AiSdkFileChangesPart {
    return { type: 'data-fileChanges', data: { items } };
  }

  function createOperationLogPart(items: AiSdkOperationLogItem[]): AiSdkOperationLogPart {
    return { type: 'data-operationLog', data: { items } };
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

  function mergeToolProgressPart(parts: AiSdkMessagePart[], item: AiSdkToolProgressItem): AiSdkMessagePart[] {
    const nextParts = removeThinkingParts(parts);
    const index = nextParts.findIndex((part) => part.type === 'data-toolProgress');
    if (index < 0) {
      return [...nextParts, createToolProgressPart([item])];
    }
    const current = nextParts[index] as AiSdkToolProgressPart;
    const items = [...(current.data.items || [])];
    const itemIndex = items.findIndex((currentItem) => currentItem.id === item.id);
    if (itemIndex >= 0) {
      items[itemIndex] = { ...items[itemIndex], ...item };
    } else {
      items.push(item);
    }
    nextParts[index] = createToolProgressPart(items.slice(-12));
    return nextParts;
  }

  function removeToolProgressItem(parts: AiSdkMessagePart[], itemId: string): AiSdkMessagePart[] {
    const nextParts = removeThinkingParts(parts);
    const index = nextParts.findIndex((part) => part.type === 'data-toolProgress');
    if (index < 0) return nextParts;
    const current = nextParts[index] as AiSdkToolProgressPart;
    const items = (current.data.items || []).filter((item) => item.id !== itemId);
    if (!items.length) {
      nextParts.splice(index, 1);
      return nextParts;
    }
    nextParts[index] = createToolProgressPart(items);
    return nextParts;
  }

  function removeToolProgressParts(parts: AiSdkMessagePart[]): AiSdkMessagePart[] {
    return removeThinkingParts(parts).filter((part) => part.type !== 'data-toolProgress') as AiSdkMessagePart[];
  }

  function mergeFileChangesPart(parts: AiSdkMessagePart[], items: AiSdkFileChangeItem[]): AiSdkMessagePart[] {
    const nextParts = removeThinkingParts(parts);
    const index = nextParts.findIndex((part) => part.type === 'data-fileChanges');
    const merged = dedupeFileChanges(index >= 0 ? [...((nextParts[index] as AiSdkFileChangesPart).data.items || []), ...items] : items);
    if (!merged.length) {
      if (index >= 0) {
        nextParts.splice(index, 1);
      }
      return nextParts;
    }
    if (index < 0) {
      return [...nextParts, createFileChangesPart(merged)];
    }
    nextParts[index] = createFileChangesPart(merged);
    return nextParts;
  }

  function mergeOperationLogPart(parts: AiSdkMessagePart[], item: AiSdkOperationLogItem): AiSdkMessagePart[] {
    const nextParts = removeThinkingParts(parts);
    const index = nextParts.findIndex((part) => part.type === 'data-operationLog');
    if (index < 0) {
      return [...nextParts, createOperationLogPart([item])];
    }
    const current = nextParts[index] as AiSdkOperationLogPart;
    const items = [...(current.data.items || [])];
    const itemIndex = items.findIndex((currentItem) => currentItem.id === item.id);
    if (itemIndex >= 0) {
      items[itemIndex] = item;
    } else {
      items.push(item);
    }
    nextParts[index] = createOperationLogPart(items.slice(-8));
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

  function dedupeFileChanges(items: AiSdkFileChangeItem[]) {
    const map = new Map<string, AiSdkFileChangeItem>();
    for (const item of items) {
      if (!item.path) continue;
      const current = map.get(item.path);
      map.set(item.path, {
        path: item.path,
        additions: (current?.additions || 0) + Math.max(0, item.additions || 0),
        deletions: (current?.deletions || 0) + Math.max(0, item.deletions || 0),
      });
    }
    return Array.from(map.values()).filter((item) => item.additions > 0 || item.deletions > 0);
  }

  return {
    addMessage,
    addThinkingMessage,
    appendOperationLogPart,
    appendSourcePart,
    appendFileChangesPart,
    upsertToolProgressPart,
    removeToolProgressPart,
    clearToolProgressParts,
    appendWeatherPart,
    chat,
    clearMessages,
    findMessageById,
    finishMessage,
    getMessageParts,
    getMessageText,
    updateThinkingMessage,
    updateMessage,
  };
}
