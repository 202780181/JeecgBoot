<template>
  <div class="ai-dev-page" :style="{ height: `${pageHeight}px` }">
    <AiSdkConversationSidebar
      :active-id="activeConversationId"
      :editing-id="editingHistoryId"
      :editing-title="editingHistoryTitle"
      :items="historyItems"
      @cancel-edit="cancelEditHistory"
      @delete="deleteHistoryItem"
      @new-conversation="startNewConversation"
      @save-title="saveHistoryTitle"
      @select="handleHistoryItemClick"
      @start-edit="startEditHistory"
      @title-input="handleHistoryTitleInput"
      @title-input-ref="setHistoryTitleInputRef"
    />

    <section class="chat-shell">
      <header class="chat-topbar">
        <div class="title-mark">
          <Icon icon="ant-design:thunderbolt-filled" />
        </div>
        <div class="title-block">
          <h2>AI 需求对话</h2>
          <p>基于 AI SDK Vue 的对话状态，优先调用 JeecgBoot 官方能力分析。</p>
        </div>
      </header>

      <main ref="messageBoxRef" class="message-list" @click="handleMessageListClick">
        <div v-for="message in chat.messages" :key="message.id" class="message-row" :class="message.role">
          <article class="message-bubble">
            <div v-if="message.role === 'assistant'" class="message-name">JeecgBoot AI 助手</div>
            <div v-if="message.role === 'user'" class="user-message-content">
              <span v-for="skill in getMessageSkills(message)" :key="skill.id" class="message-skill-chip">
                <span class="message-skill-icon">
                  <Icon icon="ant-design:thunderbolt-filled" />
                </span>
                <span>{{ skill.name }}</span>
              </span>
              <span class="user-message-text">{{ getMessageText(message) }}</span>
            </div>
            <template v-else v-for="(part, partIndex) in getMessageParts(message)" :key="partIndex">
              <VirtualMarkdownText
                v-if="part.type === 'text' && part.text"
                :text="part.text"
                :streaming="part.state === 'streaming'"
                :scroll-container="messageBoxRef"
              />
              <div v-else-if="part.type === 'data-thinking'" class="thinking-text" aria-live="polite">
                {{ part.data.text || '正在思考' }}
              </div>
              <AiSdkSourceList
                v-else-if="part.type === 'data-source' && part.data.items?.length"
                :items="part.data.items"
              />
              <AiSdkWeatherCard v-else-if="part.type === 'data-weather'" :data="part.data" />
            </template>
          </article>
        </div>
      </main>

      <AiSdkComposerBar
        :active-skill-category="activeSkillCategory"
        :add-menu-open="addMenuOpen"
        :attachments="attachments"
        :file-input-accept="fileInputAccept"
        :filtered-skill-options="filteredSkillOptions"
        :format-file-size="formatFileSize"
        :input="input"
        :loading="loading"
        :model-loading="modelLoading"
        :model-menu-open="modelMenuOpen"
        :model-options="modelOptions"
        :popup-motion="composerPopupMotion"
        :selected-model-id="selectedModelId"
        :selected-model-label="selectedModelLabel"
        :selected-skill-ids="selectedSkillIds"
        :selected-skills="selectedSkills"
        :skill-categories="skillCategories"
        :skills-loading="skillsLoading"
        :skills-menu-open="skillsMenuOpen"
        :web-search-enabled="webSearchEnabled"
        @composer-input="handleComposerInput"
        @composer-keydown="handleComposerKeydown"
        @composer-paste="handleComposerPaste"
        @file-input-ref="fileInputRef = $event"
        @file-select="handleFileSelect"
        @menu-ref="setComposerMenuRef"
        @open-file-picker="openFilePicker"
        @remove-attachment="removeAttachment"
        @remove-skill="removeSkill"
        @select-model="selectModel"
        @send="sendRequirement"
        @set-composer-ref="composerRef = $event"
        @toggle-add-menu="toggleAddMenu"
        @toggle-model-menu="toggleModelMenu"
        @toggle-skill="toggleSkill"
        @toggle-skills-menu="toggleSkillsMenu"
        @toggle-web-search="toggleWebSearch"
        @update-active-skill-category="activeSkillCategory = $event"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { type $Transition } from 'motion-v';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import Icon from '@/components/Icon';
import { usePageContext } from '@/hooks/component/usePageContext';
import { useMessage } from '@/hooks/web/useMessage';
import { useUserStore } from '@/store/modules/user';
import { debugAssistant, getOrchestratorSkills, type AiSkillOption } from './api/AiSdkChat.api';
import { cloneMessages } from './stores/historyStore';
import { AI_SDK_SESSION_TYPE, type AiSdkContextMessage, type AiSdkMessageSkill, type AiSdkUIMessage } from './types';
import { useAiSdkChatMessages } from './composables/useAiSdkChatMessages';
import { useAiSdkConversationHistory } from './composables/useAiSdkConversationHistory';
import { useAiSdkModels } from './composables/useAiSdkModels';
import { useAiSdkStreamRenderer } from './composables/useAiSdkStreamRenderer';
import { useAutoScroll } from './composables/useAutoScroll';
import { useCodeBlockCopy } from './composables/useCodeBlockCopy';
import { useComposerAttachments } from './composables/useComposerAttachments';
import AiSdkComposerBar from './components/AiSdkComposerBar.vue';
import AiSdkConversationSidebar from './components/AiSdkConversationSidebar.vue';
import AiSdkSourceList from './components/AiSdkSourceList.vue';
import AiSdkWeatherCard from './components/AiSdkWeatherCard.vue';
import VirtualMarkdownText from './components/markdown/VirtualMarkdownText.vue';

const input = ref('');
const loading = ref(false);
const messageBoxRef = ref<HTMLElement>();
const composerRef = ref<HTMLElement>();
const fileInputRef = ref<HTMLInputElement>();
const addMenuWrapRef = ref<HTMLElement>();
const skillsMenuWrapRef = ref<HTMLElement>();
const modelMenuWrapRef = ref<HTMLElement>();
const addMenuOpen = ref(false);
const skillsMenuOpen = ref(false);
const modelMenuOpen = ref(false);
const skillsLoading = ref(false);
const activeSkillCategory = ref('全部');
const webSearchEnabled = ref(false);
const fileInputAccept = ref('');
const skillOptions = ref<AiSkillOption[]>([]);
const selectedSkillIds = ref<string[]>([]);
const composerPopupTransition: $Transition = {
  duration: 0.18,
  ease: [0.22, 1, 0.36, 1],
};
const composerPopupMotion = {
  initial: {
    opacity: 0,
    scale: 0.96,
    y: 10,
    filter: 'blur(8px)',
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    filter: 'blur(0px)',
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 10,
    filter: 'blur(8px)',
  },
  transition: composerPopupTransition,
};

const { createMessage } = useMessage();
const { clearCodeBlockCopyTimers, handleCodeBlockCopyClick } = useCodeBlockCopy({
  onError: (message) => createMessage.warning(message),
});
const pageContext = usePageContext();
const userStore = useUserStore();
const { scrollToBottom } = useAutoScroll(messageBoxRef);
const { attachments, addAttachments, clearAttachments, formatFileSize, removeAttachment } = useComposerAttachments();
const { 
  addMessage, 
  addThinkingMessage, 
  appendSourcePart,
  appendWeatherPart, 
  chat, 
  clearMessages: clearChatMessages, 
  finishMessage,
  getMessageParts, 
  getMessageText, 
  updateThinkingMessage,
  updateMessage 
} = useAiSdkChatMessages();
const { 
  loadActiveLlmModels,
   modelLoading, 
   modelOptions, 
   selectModel: setSelectedModel, 
   selectedModelId, 
   selectedModelLabel
   } = useAiSdkModels({
  onError: (message) => createMessage.warning(message),
});
const { renderAssistantStream } = useAiSdkStreamRenderer({
  appendSourcePart,
  appendWeatherPart,
  finishMessage,
  updateThinkingMessage,
  updateMessage,
});

const historyStorageKey = computed(() => {
  const username = userStore.getUserInfo?.username || userStore.getUserInfo?.id || 'anonymous';
  return `jeecg:airag:chat:${username}:${AI_SDK_SESSION_TYPE}:history`;
});
const pageHeight = computed(() => Math.max((pageContext.contentHeight?.value || window.innerHeight) - 1, 560));
const selectedSkills = computed(() => skillOptions.value.filter((skill) => selectedSkillIds.value.includes(skill.id)));
const skillCategories = computed(() => {
  const categories = skillOptions.value.map((skill) => skill.category || '通用');
  return ['全部', ...Array.from(new Set(categories))];
});
const filteredSkillOptions = computed(() => {
  return skillOptions.value.filter((skill) => {
    return activeSkillCategory.value === '全部' || (skill.category || '通用') === activeSkillCategory.value;
  });
});
const conversationContextMessages = computed<AiSdkContextMessage[]>(() => {
  return chat.messages
    .reduce<AiSdkContextMessage[]>((contextMessages, message) => {
      const content = getMessageText(message).replace(/\s+/g, ' ').trim();
      if (content && (message.role === 'user' || message.role === 'assistant')) {
        contextMessages.push({
          role: message.role,
          content,
        });
      }
      return contextMessages;
    }, [])
    .slice(-12);
});
const {
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
} = useAiSdkConversationHistory({
  getMessages: () => chat.messages,
  getSelectedSkillIds: () => selectedSkillIds.value,
  getTitleSeed: (message) => getMessageText(message),
  storageKey: historyStorageKey,
  onConversationLoaded: async (item) => {
    addMenuOpen.value = false;
    skillsMenuOpen.value = false;
    clearComposer();
    clearAttachments();
    selectedSkillIds.value = Array.isArray(item.skillIds) ? item.skillIds.slice(0, 1) : [];
    chat.messages = item.messages?.length ? cloneMessages(item.messages) : [];
    await scrollToBottom();
  },
  onConversationCleared: () => {
    clearMessages();
  },
});

function getMessageSkills(message: AiSdkUIMessage): AiSdkMessageSkill[] {
  const skills = message.metadata?.skills;
  return Array.isArray(skills) ? skills.filter((skill) => skill?.id && skill?.name) : [];
}

function handleMessageListClick(event: MouseEvent) {
  handleCodeBlockCopyClick(event);
}

async function loadSkills() {
  skillsLoading.value = true;
  try {
    const res = await getOrchestratorSkills();
    const skills = res?.skills || res?.result?.skills || [];
    skillOptions.value = Array.isArray(skills)
      ? skills.map((skill) => ({
          id: skill.id,
          name: skill.name || skill.id,
          description: skill.description || '',
          category: skill.category || '通用',
        }))
      : [];
  } catch (error: any) {
    createMessage.warning(error?.message || 'Skills 加载失败');
    skillOptions.value = [];
  } finally {
    skillsLoading.value = false;
  }
}

function toggleSkill(skillId: string) {
  const skill = skillOptions.value.find((item) => item.id === skillId);
  if (!skill) return;
  setSelectedSkillIds(selectedSkillIds.value.includes(skillId) ? [] : [skillId]);
}

function removeSkill(skillId: string) {
  setSelectedSkillIds(selectedSkillIds.value.filter((id) => id !== skillId));
}

function setSelectedSkillIds(skillIds: string[]) {
  selectedSkillIds.value = skillIds.slice(0, 1);
  syncActiveConversationSkills();
}

function syncComposerText() {
  input.value = composerRef.value?.innerText.replace(/\u00a0/g, ' ').trim() || '';
}

function clearComposer() {
  input.value = '';
  if (composerRef.value) {
    composerRef.value.innerText = '';
  }
}

function toggleAddMenu() {
  addMenuOpen.value = !addMenuOpen.value;
  if (addMenuOpen.value) {
    skillsMenuOpen.value = false;
    modelMenuOpen.value = false;
  }
}

function toggleSkillsMenu() {
  skillsMenuOpen.value = !skillsMenuOpen.value;
  if (skillsMenuOpen.value) {
    addMenuOpen.value = false;
    modelMenuOpen.value = false;
  }
}

function toggleModelMenu() {
  if (modelLoading.value || !modelOptions.value.length) return;
  modelMenuOpen.value = !modelMenuOpen.value;
  if (modelMenuOpen.value) {
    addMenuOpen.value = false;
    skillsMenuOpen.value = false;
  }
}

function selectModel(id: string) {
  setSelectedModel(id);
  modelMenuOpen.value = false;
}

function toggleWebSearch() {
  webSearchEnabled.value = !webSearchEnabled.value;
}

function setComposerMenuRef(key: 'add' | 'skills' | 'model', value: HTMLElement | undefined) {
  if (key === 'add') {
    addMenuWrapRef.value = value;
    return;
  }
  if (key === 'skills') {
    skillsMenuWrapRef.value = value;
    return;
  }
  modelMenuWrapRef.value = value;
}

function handleDocumentPointerDown(event: PointerEvent) {
  if (!addMenuOpen.value && !skillsMenuOpen.value && !modelMenuOpen.value) return;
  const target = event.target as Node | null;
  if (target && addMenuWrapRef.value?.contains(target)) {
    return;
  }
  if (target && skillsMenuWrapRef.value?.contains(target)) {
    return;
  }
  if (target && modelMenuWrapRef.value?.contains(target)) {
    return;
  }
  if (addMenuOpen.value) addMenuOpen.value = false;
  if (skillsMenuOpen.value) skillsMenuOpen.value = false;
  if (modelMenuOpen.value) modelMenuOpen.value = false;
}

function openFilePicker(type: 'file' | 'image') {
  fileInputAccept.value = type === 'image' ? 'image/*' : '';
  addMenuOpen.value = false;
  fileInputRef.value?.click();
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files?.length) {
    addAttachments(target.files);
    target.value = '';
  }
}

function handleComposerInput() {
  syncComposerText();
}

function handleComposerPaste(event: ClipboardEvent) {
  const files = event.clipboardData?.files;
  if (files?.length) {
    event.preventDefault();
    addAttachments(files);
    return;
  }
  window.setTimeout(syncComposerText);
}

function handleComposerKeydown(event: KeyboardEvent) {
  if ((event.key === 'Backspace' || event.key === 'Delete') && !event.isComposing) {
    syncComposerText();
    if (!input.value && selectedSkillIds.value.length) {
      event.preventDefault();
      setSelectedSkillIds(selectedSkillIds.value.slice(0, -1));
      return;
    }
  }
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
  event.preventDefault();
  sendRequirement();
}

async function sendRequirement() {
  syncComposerText();
  const requirement = input.value.trim();
  if (!requirement || loading.value) return;

  clearComposer();
  const sentSkillIds = [...selectedSkillIds.value];
  const sentSkills = selectedSkills.value.map((skill) => ({ id: skill.id, name: skill.name }));
  const contextMessages = conversationContextMessages.value;
  setSelectedSkillIds([]);
  skillsMenuOpen.value = false;
  addMessage('user', requirement, sentSkills.length ? { skills: sentSkills } : undefined);
  loading.value = true;

  const assistantId = addThinkingMessage();
  await scrollToBottom();
  try {
    const stream = await debugAssistant({
      content: requirement,
      app: {
        id: 'ai-sdk-dev',
        name: 'JeecgBoot AI 助手',
        type: 'chatSimple',
        prompt: '你是 JeecgBoot AI 应用开发助手，请结合用户需求给出可执行的开发建议。',
        modelId: selectedModelId.value,
        model_id: selectedModelId.value,
      },
      responseMode: 'streaming',
      conversationId: activeConversationId.value || undefined,
      enableSearch: webSearchEnabled.value,
      messages: contextMessages,
      skillIds: sentSkillIds,
      sessionType: AI_SDK_SESSION_TYPE,
    });
    await renderAssistantStream(stream, assistantId);
  } catch (error: any) {
    createMessage.error(error?.message || 'AI Orchestrator 服务调用失败');
    updateMessage(assistantId, '调用 AI Orchestrator 失败，请确认 Python 服务已启动，并检查 JeecgBoot 的 ai-orchestrator 地址配置。');
  } finally {
    persistActiveConversation(requirement);
    loading.value = false;
  }
}

function clearMessages() {
  clearChatMessages();
  clearAttachments();
  setSelectedSkillIds([]);
  addMenuOpen.value = false;
  skillsMenuOpen.value = false;
  modelMenuOpen.value = false;
  clearComposer();
}

onMounted(() => {
  loadHistoryItems();
  loadActiveLlmModels();
  loadSkills();
  if (historyItems.value.length) {
    loadConversation(historyItems.value[0].id);
  }
  document.addEventListener('pointerdown', handleDocumentPointerDown);
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown);
  clearCodeBlockCopyTimers();
});
</script>

<style scoped lang="less" src="./AiSdkChat.less"></style>
