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
              <a
                v-for="attachment in getMessageAttachments(message)"
                :key="attachment.id || attachment.path || attachment.url || attachment.name"
                class="message-attachment-chip"
                :href="attachment.url || attachment.path"
                target="_blank"
                rel="noopener noreferrer"
                @click.stop
              >
                <Icon :icon="getAttachmentIcon(attachment)" />
                <span>{{ attachment.name || '附件' }}</span>
                <em v-if="attachment.size">{{ formatFileSize(attachment.size) }}</em>
              </a>
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

      <AiSdkComposerBar :actions="composerActions" :state="composerState" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { type $Transition } from 'motion-v';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import Icon from '@/components/Icon';
import { usePageContext } from '@/hooks/component/usePageContext';
import { useMessage } from '@/hooks/web/useMessage';
import { debugAssistant, getOrchestratorSkills, uploadAiSdkAttachment, type AiSkillOption } from './api/AiSdkChat.api';
import { AI_SDK_SESSION_TYPE, type AiSdkMessageAttachment, type AiSdkMessageSkill, type AiSdkServerMessage, type AiSdkUIMessage } from './types';
import type { AiSdkComposerActions, AiSdkComposerState } from './types/composer';
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
const composerState = computed<AiSdkComposerState>(() => ({
  activeSkillCategory: activeSkillCategory.value,
  addMenuOpen: addMenuOpen.value,
  attachments: attachments.value,
  fileInputAccept: fileInputAccept.value,
  filteredSkillOptions: filteredSkillOptions.value,
  formatFileSize,
  input: input.value,
  loading: loading.value,
  modelLoading: modelLoading.value,
  modelMenuOpen: modelMenuOpen.value,
  modelOptions: modelOptions.value,
  popupMotion: composerPopupMotion,
  selectedModelId: selectedModelId.value,
  selectedModelLabel: selectedModelLabel.value,
  selectedSkillIds: selectedSkillIds.value,
  selectedSkills: selectedSkills.value,
  skillCategories: skillCategories.value,
  skillsLoading: skillsLoading.value,
  skillsMenuOpen: skillsMenuOpen.value,
  webSearchEnabled: webSearchEnabled.value,
}));
const {
  activeConversationId,
  cancelEditHistory,
  deleteHistoryItem,
  editingHistoryId,
  editingHistoryTitle,
  handleHistoryItemClick,
  handleHistoryTitleInput,
  historyItems,
  ensureActiveConversationId,
  loadConversation,
  loadHistoryItems,
  refreshHistoryItems,
  saveHistoryTitle,
  setHistoryTitleInputRef,
  startEditHistory,
  startNewConversation,
  syncActiveConversationSkills,
  upsertActiveConversationTitle,
} = useAiSdkConversationHistory({
  getConversationCreatePayload: () => ({
    title: '新建对话',
    appId: 'ai-sdk-dev',
    appName: 'JeecgBoot AI 助手',
    modelId: selectedModelId.value,
    sessionType: AI_SDK_SESSION_TYPE,
    skillIds: selectedSkillIds.value,
  }),
  onConversationLoaded: async (messages) => {
    addMenuOpen.value = false;
    skillsMenuOpen.value = false;
    clearComposer();
    clearAttachments();
    selectedSkillIds.value = getLastUserSkillIds(messages);
    chat.messages = messages.map(toUiMessage);
    await scrollToBottom();
  },
  onConversationCleared: () => {
    clearMessages();
  },
  onError: (message) => createMessage.warning(message),
});

function getMessageSkills(message: AiSdkUIMessage): AiSdkMessageSkill[] {
  const skills = message.metadata?.skills;
  return Array.isArray(skills) ? skills.filter((skill) => skill?.id && skill?.name) : [];
}

function getMessageAttachments(message: AiSdkUIMessage): AiSdkMessageAttachment[] {
  const messageAttachments = message.metadata?.attachments;
  return Array.isArray(messageAttachments)
    ? messageAttachments.filter((attachment) => attachment?.name || attachment?.url || attachment?.path)
    : [];
}

function getAttachmentIcon(attachment: AiSdkMessageAttachment) {
  const type = attachment.type || '';
  const name = attachment.name || attachment.path || '';
  if (type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(name)) {
    return 'ant-design:file-image-outlined';
  }
  if (/\.pdf$/i.test(name) || type.includes('pdf')) {
    return 'ant-design:file-pdf-outlined';
  }
  if (/\.(xlsx?|csv)$/i.test(name)) {
    return 'ant-design:file-excel-outlined';
  }
  if (/\.(docx?|md|txt|json)$/i.test(name)) {
    return 'ant-design:file-text-outlined';
  }
  return 'ant-design:file-outlined';
}

function toUiMessage(message: AiSdkServerMessage): AiSdkUIMessage {
  const role = message.role === 'user' ? 'user' : 'assistant';
  const skillIds = Array.isArray(message.skillIds) ? message.skillIds : [];
  const metadata = message.metadata || {};
  const messageAttachments = normalizeMessageAttachments(metadata.attachments);
  const skills =
    role === 'user'
      ? skillIds
          .map((id) => {
            const skill = skillOptions.value.find((item) => item.id === id);
            return skill ? { id, name: skill.name } : { id, name: id };
          })
          .filter((skill) => skill.id)
      : [];
  const uiMetadata = {
    ...(skills.length ? { skills } : {}),
    ...(messageAttachments.length ? { attachments: messageAttachments } : {}),
  };
  return {
    id: message.id,
    role,
    parts: [
      {
        type: 'text',
        text: message.content || '',
        state: 'done',
      },
    ],
    ...(Object.keys(uiMetadata).length ? { metadata: uiMetadata } : {}),
  };
}

function normalizeMessageAttachments(value: unknown): AiSdkMessageAttachment[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Recordable => !!item && typeof item === 'object')
    .map((item) => ({
      id: typeof item.id === 'string' ? item.id : undefined,
      name: typeof item.name === 'string' ? item.name : undefined,
      size: typeof item.size === 'number' ? item.size : undefined,
      type: typeof item.type === 'string' ? item.type : undefined,
      path: typeof item.path === 'string' ? item.path : undefined,
      url: typeof item.url === 'string' ? item.url : undefined,
    }))
    .filter((item) => item.name || item.path || item.url);
}

function getLastUserSkillIds(messages: AiSdkServerMessage[]) {
  const userMessage = [...messages].reverse().find((message) => message.role === 'user' && Array.isArray(message.skillIds));
  return userMessage?.skillIds?.slice(0, 1) || [];
}

async function buildAttachmentPayload() {
  return Promise.all(attachments.value.map((attachment) => uploadAiSdkAttachment(attachment.file, attachment.id)));
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
  void syncActiveConversationSkills();
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

function updateActiveSkillCategory(value: string) {
  activeSkillCategory.value = value;
}

function setComposerRef(value: HTMLElement | undefined) {
  composerRef.value = value;
}

function setFileInputRef(value: HTMLInputElement | undefined) {
  fileInputRef.value = value;
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

const composerActions: AiSdkComposerActions = {
  handleComposerInput,
  handleComposerKeydown,
  handleComposerPaste,
  handleFileSelect,
  openFilePicker,
  removeAttachment,
  removeSkill,
  selectModel,
  send: sendRequirement,
  setComposerRef,
  setFileInputRef,
  setMenuRef: setComposerMenuRef,
  toggleAddMenu,
  toggleModelMenu,
  toggleSkill,
  toggleSkillsMenu,
  toggleWebSearch,
  updateActiveSkillCategory,
};

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
  if (!selectedModelId.value) {
    createMessage.warning(modelLoading.value ? '模型配置加载中，请稍后再发送' : '请先配置并选择一个可用模型');
    return;
  }

  loading.value = true;
  const sentSkillIds = [...selectedSkillIds.value];
  const sentSkills = selectedSkills.value.map((skill) => ({ id: skill.id, name: skill.name }));
  let sentAttachments: Awaited<ReturnType<typeof buildAttachmentPayload>> = [];
  let conversationId = '';
  try {
    sentAttachments = await buildAttachmentPayload();
    conversationId = await ensureActiveConversationId();
  } catch (error: any) {
    createMessage.error(error?.message || '附件上传或新建会话失败');
    loading.value = false;
    return;
  }
  clearComposer();
  upsertActiveConversationTitle(requirement);
  setSelectedSkillIds([]);
  clearAttachments();
  skillsMenuOpen.value = false;
  addMessage('user', requirement, {
    ...(sentSkills.length ? { skills: sentSkills } : {}),
    ...(sentAttachments.length ? { attachments: sentAttachments } : {}),
  });

  const assistantId = addThinkingMessage();
  await scrollToBottom();
  try {
    const stream = await debugAssistant({
      conversationId,
      content: requirement,
      skillIds: sentSkillIds,
      modelId: selectedModelId.value,
      enableSearch: webSearchEnabled.value,
      attachments: sentAttachments,
      sessionType: AI_SDK_SESSION_TYPE,
    });
    await renderAssistantStream(stream, assistantId);
  } catch (error: any) {
    createMessage.error(error?.message || 'AI Orchestrator 服务调用失败');
    updateMessage(assistantId, '调用 AI Orchestrator 失败，请确认 Python 服务已启动，并检查 JeecgBoot 的 ai-orchestrator 地址配置。');
  } finally {
    await refreshHistoryItems();
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

onMounted(async () => {
  await loadHistoryItems();
  loadActiveLlmModels();
  loadSkills();
  if (historyItems.value.length) {
    await loadConversation(historyItems.value[0].id);
  }
  document.addEventListener('pointerdown', handleDocumentPointerDown);
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown);
  clearCodeBlockCopyTimers();
});
</script>

<style scoped lang="less" src="./AiSdkChat.less"></style>
