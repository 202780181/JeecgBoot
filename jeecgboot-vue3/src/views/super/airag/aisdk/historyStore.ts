import { AI_SDK_SESSION_TYPE, type AiSdkHistoryItem, type AiSdkUIMessage } from './types';

export function createConversationId() {
  return `${AI_SDK_SESSION_TYPE}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getConversationTitle(requirement: string) {
  const text = requirement.replace(/\s+/g, ' ').trim();
  return text.length > 18 ? `${text.slice(0, 18)}...` : text || '新建对话';
}

export function loadHistoryItemsFromStorage(storageKey: string) {
  try {
    const raw = localStorage.getItem(storageKey);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list)
      ? list
          .filter((item) => item?.sessionType === AI_SDK_SESSION_TYPE && item?.id && Array.isArray(item?.messages))
          .map((item) => ({
            ...item,
            skillIds: Array.isArray(item.skillIds) ? item.skillIds : [],
          }))
      : [];
  } catch {
    return [];
  }
}

export function saveHistoryItemsToStorage(storageKey: string, items: AiSdkHistoryItem[]) {
  localStorage.setItem(storageKey, JSON.stringify(items));
}

export function cloneMessages(messages: AiSdkUIMessage[]) {
  return JSON.parse(JSON.stringify(messages)) as AiSdkUIMessage[];
}
