import { Chat } from '@ai-sdk/vue';
import type {
  AiSdkMessageMetadata,
  AiSdkMessagePart,
  AiSdkSpecArtifact,
  AiSdkSpecData,
  AiSdkSpecPart,
  AiSdkTextPart,
  AiSdkThinkingPart,
  AiSdkToolPart,
  AiSdkUIMessage,
  AiSdkWeatherPart,
} from './types';

interface UseAiSdkChatMessagesOptions {
  scheduleScrollToBottom: () => void;
}

export function useAiSdkChatMessages(options: UseAiSdkChatMessagesOptions) {
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
    options.scheduleScrollToBottom();
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
    options.scheduleScrollToBottom();
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
    options.scheduleScrollToBottom();
  }

  function finishMessage(id: string) {
    chat.messages = chat.messages.map((message): AiSdkUIMessage => {
      if (message.id !== id) return message;
      return {
        ...message,
        parts: getMessageParts(message).map((part): AiSdkMessagePart => (part.type === 'text' ? { ...part, state: 'done' } : part)),
      };
    });
    options.scheduleScrollToBottom();
  }

  function appendWeatherPart(id: string, data: Recordable) {
    chat.messages = chat.messages.map((message): AiSdkUIMessage => {
      if (message.id !== id) return message;
      return {
        ...message,
        parts: [...removeThinkingParts(getMessageParts(message)), createWeatherPart(data)],
      };
    });
    options.scheduleScrollToBottom();
  }

  function appendToolPart(id: string, data: Recordable) {
    chat.messages = chat.messages.map((message): AiSdkUIMessage => {
      if (message.id !== id) return message;
      return {
        ...message,
        parts: [...removeThinkingParts(getMessageParts(message)), createToolPart(data)],
      };
    });
    options.scheduleScrollToBottom();
  }

  function appendSpecPart(id: string, data: AiSdkSpecData) {
    chat.messages = chat.messages.map((message): AiSdkUIMessage => {
      if (message.id !== id) return message;
      return {
        ...message,
        parts: mergeSpecPart(getMessageParts(message), data),
      };
    });
    options.scheduleScrollToBottom();
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

  function createThinkingPart(): AiSdkThinkingPart {
    return { type: 'data-thinking', data: {} };
  }

  function createWeatherPart(data: Recordable): AiSdkWeatherPart {
    return { type: 'data-weather', data };
  }

  function createToolPart(data: Recordable): AiSdkToolPart {
    return { type: 'data-tool', data };
  }

  function createSpecPart(data: AiSdkSpecData): AiSdkSpecPart {
    return { type: 'data-spec', data };
  }

  function mergeSpecPart(parts: AiSdkMessagePart[], data: AiSdkSpecData): AiSdkMessagePart[] {
    const nextParts = removeThinkingParts(parts);
    const index = nextParts.findIndex((part) => part.type === 'data-spec');
    if (index < 0) {
      return [...nextParts, createSpecPart({ ...data, artifacts: normalizeSpecArtifacts(data) })];
    }
    const current = nextParts[index] as AiSdkSpecPart;
    nextParts[index] = createSpecPart({
      ...current.data,
      ...data,
      artifacts: mergeSpecArtifacts(current.data.artifacts, data),
    });
    return nextParts;
  }

  function normalizeSpecArtifacts(data: AiSdkSpecData): AiSdkSpecArtifact[] {
    return data.artifact ? [data.artifact] : [];
  }

  function mergeSpecArtifacts(current: AiSdkSpecArtifact[] | undefined, data: AiSdkSpecData): AiSdkSpecArtifact[] {
    const artifacts = [...(current || [])];
    if (!data.artifact?.type) return artifacts;
    const index = artifacts.findIndex((artifact) => artifact.type === data.artifact?.type);
    if (index >= 0) {
      artifacts[index] = data.artifact;
      return artifacts;
    }
    return [...artifacts, data.artifact];
  }

  return {
    addMessage,
    addThinkingMessage,
    appendSpecPart,
    appendToolPart,
    appendWeatherPart,
    chat,
    clearMessages,
    finishMessage,
    getMessageParts,
    getMessageText,
    updateMessage,
  };
}
