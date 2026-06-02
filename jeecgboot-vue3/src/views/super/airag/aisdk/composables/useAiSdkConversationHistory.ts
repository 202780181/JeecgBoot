import { nextTick, ref } from 'vue';
import {
  createAiSdkConversation,
  deleteAiSdkConversation,
  listAiSdkConversations,
  listAiSdkMessages,
  renameAiSdkConversation,
} from '../api/AiSdkChat.api';
import { AI_SDK_SESSION_TYPE, type AiSdkHistoryItem, type AiSdkServerConversation, type AiSdkServerMessage } from '../types';

interface UseAiSdkConversationHistoryOptions {
  getConversationCreatePayload: () => Recordable;
  onConversationCleared: () => void;
  onConversationLoaded: (messages: AiSdkServerMessage[], item: AiSdkHistoryItem) => Promise<void> | void;
  onError: (message: string) => void;
}

export function useAiSdkConversationHistory(options: UseAiSdkConversationHistoryOptions) {
  const activeConversationId = ref('');
  const editingHistoryId = ref('');
  const editingHistoryTitle = ref('');
  const historyItems = ref<AiSdkHistoryItem[]>([]);
  const historyTitleInputRef = ref<HTMLInputElement | null>(null);

  async function loadHistoryItems() {
    try {
      const conversations = await listAiSdkConversations(AI_SDK_SESSION_TYPE);
      historyItems.value = conversations.map(toHistoryItem);
    } catch (error: any) {
      options.onError(error?.message || '会话历史加载失败');
      historyItems.value = [];
    }
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

  async function saveHistoryTitle(item: AiSdkHistoryItem) {
    if (editingHistoryId.value !== item.id) return;
    const title = editingHistoryTitle.value.replace(/\s+/g, ' ').trim() || item.title;
    try {
      await renameAiSdkConversation(item.id, title);
      historyItems.value = historyItems.value.map((history) => (history.id === item.id ? { ...history, title, updatedAt: Date.now() } : history));
      cancelEditHistory();
    } catch (error: any) {
      options.onError(error?.message || '会话重命名失败');
    }
  }

  async function syncActiveConversationSkills() {
    await loadHistoryItems();
  }

  async function ensureActiveConversationId() {
    if (activeConversationId.value) {
      return activeConversationId.value;
    }
    const conversation = await createAiSdkConversation(options.getConversationCreatePayload());
    const item = toHistoryItem(conversation);
    activeConversationId.value = item.id;
    historyItems.value = [item, ...historyItems.value.filter((history) => history.id !== item.id)];
    return item.id;
  }

  async function loadConversation(id: string) {
    const target = historyItems.value.find((item) => item.id === id);
    if (!target) return;
    try {
      cancelEditHistory();
      activeConversationId.value = id;
      const messages = await listAiSdkMessages(id);
      await options.onConversationLoaded(messages, target);
    } catch (error: any) {
      options.onError(error?.message || '会话消息加载失败');
    }
  }

  function handleHistoryItemClick(item: AiSdkHistoryItem) {
    if (editingHistoryId.value === item.id) return;
    void loadConversation(item.id);
  }

  async function deleteHistoryItem(id: string) {
    try {
      const wasActive = activeConversationId.value === id;
      await deleteAiSdkConversation(id);
      historyItems.value = historyItems.value.filter((item) => item.id !== id);
      if (editingHistoryId.value === id) {
        cancelEditHistory();
      }
      if (!wasActive) return;
      if (historyItems.value.length) {
        await loadConversation(historyItems.value[0].id);
        return;
      }
      await startNewConversation();
    } catch (error: any) {
      options.onError(error?.message || '会话删除失败');
    }
  }

  async function startNewConversation() {
    try {
      cancelEditHistory();
      options.onConversationCleared();
      const conversation = await createAiSdkConversation(options.getConversationCreatePayload());
      const item = toHistoryItem(conversation);
      activeConversationId.value = item.id;
      historyItems.value = [item, ...historyItems.value.filter((history) => history.id !== item.id)];
    } catch (error: any) {
      options.onError(error?.message || '新建会话失败');
    }
  }

  function upsertActiveConversationTitle(titleSeed: string) {
    if (!activeConversationId.value) return;
    historyItems.value = historyItems.value.map((item) => {
      if (item.id !== activeConversationId.value || item.title !== '新建对话') {
        return item;
      }
      return { ...item, title: buildTitle(titleSeed), updatedAt: Date.now() };
    });
  }

  async function refreshHistoryItems() {
    await loadHistoryItems();
  }

  function toHistoryItem(conversation: AiSdkServerConversation): AiSdkHistoryItem {
    return {
      id: conversation.id,
      title: conversation.title || '新建对话',
      updatedAt: toTimestamp(conversation.updateTime || conversation.createTime),
      skillIds: Array.isArray(conversation.skillIds) ? conversation.skillIds.slice(0, 1) : [],
      sessionType: AI_SDK_SESSION_TYPE,
      appId: conversation.appId,
      appName: conversation.appName,
      modelId: conversation.modelId,
    };
  }

  function toTimestamp(value?: string) {
    if (!value) return Date.now();
    const time = new Date(value.replace(' ', 'T')).getTime();
    return Number.isFinite(time) ? time : Date.now();
  }

  function buildTitle(content: string) {
    const text = content.replace(/\s+/g, ' ').trim();
    return text.length > 18 ? `${text.slice(0, 18)}...` : text || '新建对话';
  }

  return {
    activeConversationId,
    cancelEditHistory,
    deleteHistoryItem,
    editingHistoryId,
    editingHistoryTitle,
    ensureActiveConversationId,
    handleHistoryItemClick,
    handleHistoryTitleInput,
    historyItems,
    loadConversation,
    loadHistoryItems,
    refreshHistoryItems,
    saveHistoryTitle,
    setHistoryTitleInputRef,
    startEditHistory,
    startNewConversation,
    syncActiveConversationSkills,
    upsertActiveConversationTitle,
  };
}
