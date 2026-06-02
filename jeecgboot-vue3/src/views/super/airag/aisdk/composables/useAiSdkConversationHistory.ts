import { nextTick, ref, type ComputedRef } from 'vue';
import {
  cloneMessages,
  createConversationId,
  getConversationTitle,
  loadHistoryItemsFromStorage,
  saveHistoryItemsToStorage,
} from '../stores/historyStore';
import { AI_SDK_SESSION_TYPE, type AiSdkHistoryItem, type AiSdkUIMessage } from '../types';

interface UseAiSdkConversationHistoryOptions {
  getMessages: () => AiSdkUIMessage[];
  getSelectedSkillIds: () => string[];
  getTitleSeed: (message: AiSdkUIMessage) => string;
  onConversationCleared: () => void;
  onConversationLoaded: (item: AiSdkHistoryItem) => Promise<void> | void;
  storageKey: ComputedRef<string>;
}

export function useAiSdkConversationHistory(options: UseAiSdkConversationHistoryOptions) {
  const activeConversationId = ref('');
  const editingHistoryId = ref('');
  const editingHistoryTitle = ref('');
  const historyItems = ref<AiSdkHistoryItem[]>([]);
  const historyTitleInputRef = ref<HTMLInputElement | null>(null);

  function loadHistoryItems() {
    historyItems.value = loadHistoryItemsFromStorage(options.storageKey.value);
  }

  function saveHistoryItems() {
    saveHistoryItemsToStorage(options.storageKey.value, historyItems.value);
  }

  function setHistoryTitleInputRef(el: Element | null) {
    historyTitleInputRef.value = el instanceof HTMLInputElement ? el : null;
  }

  async function startEditHistory(item: AiSdkHistoryItem) {
    editingHistoryId.value = item.id;
    editingHistoryTitle.value = item.title;
    await nextTick();
    historyTitleInputRef.value?.focus();
    historyTitleInputRef.value?.select();
  }

  function handleHistoryTitleInput(event: Event) {
    editingHistoryTitle.value = (event.target as HTMLInputElement).value;
  }

  function cancelEditHistory() {
    editingHistoryId.value = '';
    editingHistoryTitle.value = '';
  }

  function saveHistoryTitle(item: AiSdkHistoryItem) {
    if (editingHistoryId.value !== item.id) return;
    const title = editingHistoryTitle.value.replace(/\s+/g, ' ').trim() || item.title;
    historyItems.value = historyItems.value.map((history) => (history.id === item.id ? { ...history, title, updatedAt: Date.now() } : history));
    saveHistoryItems();
    cancelEditHistory();
  }

  function syncActiveConversationSkills(skillIds = options.getSelectedSkillIds()) {
    if (!activeConversationId.value) return;
    let changed = false;
    historyItems.value = historyItems.value.map((item) => {
      if (item.id !== activeConversationId.value) return item;
      changed = true;
      return { ...item, skillIds: skillIds.slice(0, 1), updatedAt: Date.now() };
    });
    if (changed) {
      saveHistoryItems();
    }
  }

  function persistActiveConversation(titleSeed?: string) {
    const messages = options.getMessages();
    const hasUserMessage = messages.some((message) => message.role === 'user');
    if (!hasUserMessage) return;

    const id = activeConversationId.value || createConversationId();
    activeConversationId.value = id;
    const existed = historyItems.value.find((item) => item.id === id);
    const firstUserMessage = messages.find((message) => message.role === 'user');
    const item: AiSdkHistoryItem = {
      id,
      title: existed?.title || getConversationTitle(titleSeed || (firstUserMessage ? options.getTitleSeed(firstUserMessage) : '')),
      updatedAt: Date.now(),
      messages: cloneMessages(messages),
      skillIds: options.getSelectedSkillIds().slice(0, 1),
      sessionType: AI_SDK_SESSION_TYPE,
    };
    historyItems.value = [item, ...historyItems.value.filter((history) => history.id !== id)];
    saveHistoryItems();
  }

  async function loadConversation(id: string) {
    const target = historyItems.value.find((item) => item.id === id);
    if (!target) return;
    cancelEditHistory();
    activeConversationId.value = id;
    await options.onConversationLoaded(target);
  }

  function handleHistoryItemClick(item: AiSdkHistoryItem) {
    if (editingHistoryId.value === item.id) return;
    void loadConversation(item.id);
  }

  async function deleteHistoryItem(id: string) {
    const wasActive = activeConversationId.value === id;
    historyItems.value = historyItems.value.filter((item) => item.id !== id);
    saveHistoryItems();
    if (editingHistoryId.value === id) {
      cancelEditHistory();
    }
    if (!wasActive) return;
    if (historyItems.value.length) {
      await loadConversation(historyItems.value[0].id);
      return;
    }
    startNewConversation();
  }

  function startNewConversation() {
    activeConversationId.value = '';
    options.onConversationCleared();
  }

  return {
    activeConversationId,
    cancelEditHistory,
    deleteHistoryItem,
    editingHistoryId,
    editingHistoryTitle,
    handleHistoryItemClick,
    handleHistoryTitleInput,
    historyItems,
    loadConversation,
    loadHistoryItems,
    persistActiveConversation,
    saveHistoryTitle,
    setHistoryTitleInputRef,
    startEditHistory,
    startNewConversation,
    syncActiveConversationSkills,
  };
}
