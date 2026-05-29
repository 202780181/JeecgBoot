<template>
  <div class="ai-dev-page" :style="{ height: `${pageHeight}px` }">
    <aside class="conversation-sidebar">
      <button class="new-chat-btn" type="button" @click="startNewConversation">
        <Icon icon="ant-design:plus-outlined" />
        <span>新建对话</span>
      </button>

      <div class="history-head">
        <span>对话历史</span>
        <button class="icon-btn" type="button" aria-label="搜索对话">
          <Icon icon="ant-design:search-outlined" />
        </button>
      </div>

      <nav class="history-list" aria-label="对话历史">
        <div
          v-for="item in historyItems"
          :key="item.id"
          class="history-item"
          :class="{ active: activeConversationId === item.id }"
          role="button"
          tabindex="0"
          @click="handleHistoryItemClick(item)"
          @keydown.enter.prevent="handleHistoryItemClick(item)"
        >
          <input
            v-if="editingHistoryId === item.id"
            :ref="setHistoryTitleInputRef"
            class="history-title-input"
            :value="editingHistoryTitle"
            maxlength="40"
            @click.stop
            @input="handleHistoryTitleInput"
            @keydown.enter.prevent.stop="saveHistoryTitle(item)"
            @keydown.esc.prevent.stop="cancelEditHistory"
            @blur="saveHistoryTitle(item)"
          />
          <span v-else class="history-title">{{ item.title }}</span>

          <div class="history-actions" @click.stop>
            <button class="history-action" type="button" aria-label="编辑对话名称" @click="startEditHistory(item)">
              <Icon icon="ant-design:edit-outlined" />
            </button>
            <a-popconfirm
              title="确定删除该历史对话吗？"
              ok-text="删除"
              cancel-text="取消"
              placement="right"
              @confirm="deleteHistoryItem(item.id)"
            >
              <button class="history-action danger" type="button" aria-label="删除对话">
                <Icon icon="ant-design:delete-outlined" />
              </button>
            </a-popconfirm>
          </div>
        </div>
        <div v-if="!historyItems.length" class="history-empty">暂无历史对话</div>
      </nav>
    </aside>

    <section class="chat-shell">
      <header class="chat-topbar">
        <div class="title-mark">
          <Icon icon="ant-design:thunderbolt-filled" />
        </div>
        <div class="title-block">
          <h2>AI 需求对话</h2>
          <p>基于 AI SDK Vue 的对话状态，优先调用 JeecgBoot 官方能力分析。</p>
        </div>
        <div class="status-pill" :class="{ loading }">
          <span></span>
          {{ serviceStatusText }}
        </div>
      </header>

      <main ref="messageBoxRef" class="message-list">
        <div v-for="message in chat.messages" :key="message.id" class="message-row" :class="message.role">
          <article class="message-bubble">
            <div v-if="message.role === 'assistant'" class="message-name">JeecgBoot AI 助手</div>
            <div class="message-text">{{ getMessageText(message) }}</div>

          </article>
        </div>
      </main>

      <footer class="composer-wrap">
        <div class="composer">
          <div v-if="attachments.length" class="attachment-list">
            <div v-for="file in attachments" :key="file.id" class="attachment-item">
              <template v-if="file.previewUrl">
                <img :src="file.previewUrl" :alt="file.name" />
              </template>
              <template v-else>
                <Icon icon="ant-design:file-outlined" />
                <span>{{ file.name }}</span>
                <em>{{ formatFileSize(file.size) }}</em>
              </template>
              <button type="button" aria-label="移除文件" @click="removeAttachment(file.id)">
                <Icon icon="ant-design:close-outlined" />
              </button>
            </div>
          </div>

          <div
            ref="composerRef"
            class="composer-input"
            contenteditable="true"
            data-placeholder="描述您的业务需求，或输入 @ 调用能力"
            role="textbox"
            aria-multiline="true"
            @input="handleComposerInput"
            @paste="handleComposerPaste"
            @keydown="handleComposerKeydown"
          ></div>

          <div class="composer-actions">
            <div class="composer-left">
              <div ref="addMenuWrapRef" class="add-menu-wrap">
                <button class="round-tool" type="button" aria-label="添加" @click="toggleAddMenu">
                  <Icon icon="ant-design:plus-outlined" />
                </button>
                <AnimatePresence>
                  <Motion
                    v-if="addMenuOpen"
                    as="div"
                    class="add-menu"
                    :initial="{ opacity: 0, scale: 0.96, y: 8 }"
                    :animate="{ opacity: 1, scale: 1, y: 0 }"
                    :exit="{ opacity: 0, scale: 0.96, y: 8 }"
                    :transition="{ duration: 0.16, ease: 'easeOut' }"
                  >
                    <button type="button" @click="openFilePicker('file')">
                      <Icon icon="ant-design:paper-clip-outlined" />
                      <span>上传文件</span>
                    </button>
                    <button type="button" @click="openFilePicker('image')">
                      <Icon icon="ant-design:picture-outlined" />
                      <span>上传图片</span>
                    </button>
                    <button class="menu-toggle" type="button" @click="toggleWebSearch">
                      <span class="menu-toggle-label">
                        <Icon icon="ant-design:global-outlined" />
                        <span>联网搜索</span>
                      </span>
                      <span class="switch-track" :class="{ active: webSearchEnabled }">
                        <i></i>
                      </span>
                    </button>
                  </Motion>
                </AnimatePresence>
              </div>
              <div ref="skillsMenuWrapRef" class="skills-menu-wrap">
                <button class="round-tool skills-trigger" type="button" aria-label="Skills" @click="toggleSkillsMenu">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="currentColor"
                      fill-opacity="0.9"
                      d="M21.5 6.75c0-.69-.56-1.25-1.25-1.25H15a2.25 2.25 0 0 0-2.25 2.25v11.52q.102-.071.206-.136c.713-.44 1.521-.634 2.321-.634h4.973c.69 0 1.25-.56 1.25-1.25zm-19 10.5c0 .69.56 1.25 1.25 1.25h4.973c.8 0 1.608.193 2.32.634q.107.066.207.136V7.75A2.25 2.25 0 0 0 9 5.5H3.75c-.69 0-1.25.56-1.25 1.25zm20.5 0A2.75 2.75 0 0 1 20.25 20h-4.973c-.56 0-1.087.135-1.532.41-.46.285-.832.691-1.074 1.175a.75.75 0 0 1-1.342 0 2.9 2.9 0 0 0-1.074-1.175A2.9 2.9 0 0 0 8.723 20H3.75A2.75 2.75 0 0 1 1 17.25V6.75A2.75 2.75 0 0 1 3.75 4H9c1.226 0 2.316.589 3 1.499A3.75 3.75 0 0 1 15 4h5.25A2.75 2.75 0 0 1 23 6.75z"
                    />
                  </svg>
                </button>
                <AnimatePresence>
                  <Motion
                    v-if="skillsMenuOpen"
                    as="div"
                    class="skills-panel"
                    :initial="{ opacity: 0, scale: 0.98, y: 10 }"
                    :animate="{ opacity: 1, scale: 1, y: 0 }"
                    :exit="{ opacity: 0, scale: 0.98, y: 10 }"
                    :transition="{ duration: 0.18, ease: 'easeOut' }"
                  >
                    <h3>Skills</h3>
                    <div class="skills-empty">
                      暂无技能
                    </div>
                  </Motion>
                </AnimatePresence>
              </div>
            </div>

            <div class="composer-right">
              <div ref="modelMenuWrapRef" class="model-menu-wrap">
                <button
                  class="model-trigger"
                  type="button"
                  :disabled="modelLoading || !modelOptions.length"
                  @click="toggleModelMenu"
                >
                  <span>{{ selectedModelLabel }}</span>
                  <Icon icon="ant-design:down-outlined" />
                </button>
                <AnimatePresence>
                  <Motion
                    v-if="modelMenuOpen"
                    as="div"
                    class="model-menu"
                    :initial="{ opacity: 0, scale: 0.96, y: 8 }"
                    :animate="{ opacity: 1, scale: 1, y: 0 }"
                    :exit="{ opacity: 0, scale: 0.96, y: 8 }"
                    :transition="{ duration: 0.16, ease: 'easeOut' }"
                  >
                    <button
                      v-for="model in modelOptions"
                      :key="model.id"
                      class="model-option"
                      :class="{ selected: selectedModelId === model.id }"
                      type="button"
                      @click="selectModel(model.id)"
                    >
                      <span>{{ model.displayName }}</span>
                      <Icon v-if="selectedModelId === model.id" icon="ant-design:check-outlined" />
                    </button>
                  </Motion>
                </AnimatePresence>
              </div>
              <button
                class="send-btn"
                type="button"
                :disabled="loading || !input.trim()"
                :aria-label="loading ? '发送中' : '发送'"
                @click="sendRequirement"
              >
                <Icon :icon="loading ? 'ant-design:loading-3-quarters-outlined' : 'material-symbols:arrow-upward-rounded'" />
              </button>
            </div>
          </div>
        </div>
        <input ref="fileInputRef" class="file-input" type="file" multiple :accept="fileInputAccept" @change="handleFileSelect" />
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { UIMessage } from 'ai';
import { Chat } from '@ai-sdk/vue';
import { AnimatePresence, Motion } from 'motion-v';
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import Icon from '@/components/Icon';
import { usePageContext } from '@/hooks/component/usePageContext';
import { useMessage } from '@/hooks/web/useMessage';
import { useUserStore } from '@/store/modules/user';
import { debugAssistant, getActiveLlmModels, type AiModelOption } from './AiSdkChat.api';

const AI_SDK_SESSION_TYPE = 'ai-sdk-dev';

function createWelcomeMessage(): UIMessage {
  return {
    id: 'welcome',
    role: 'assistant',
    parts: [
      {
        type: 'text',
        text: [
          '您好！我是 JeecgBoot AI 助手，',
          '请描述您的业务需求，我会帮您判断是否可以使用 JeecgBoot 官方能力，',
          '例如：Online 表单、报表、BPMN、Codegen 或 Admin API。',
        ].join('\n'),
      },
    ],
  } as UIMessage;
}

const chat = new Chat<UIMessage>({
  messages: [createWelcomeMessage()],
});

interface AiSdkHistoryItem {
  id: string;
  title: string;
  updatedAt: number;
  messages: UIMessage[];
  sessionType: typeof AI_SDK_SESSION_TYPE;
}

const input = ref('');
const loading = ref(false);
const historyItems = ref<AiSdkHistoryItem[]>([]);
const activeConversationId = ref('');
const editingHistoryId = ref('');
const editingHistoryTitle = ref('');
const modelOptions = ref<AiModelOption[]>([]);
const selectedModelId = ref('');
const modelLoading = ref(false);
const messageBoxRef = ref<HTMLElement>();
const composerRef = ref<HTMLElement>();
const historyTitleInputRef = ref<HTMLInputElement | null>(null);
const fileInputRef = ref<HTMLInputElement>();
const addMenuWrapRef = ref<HTMLElement>();
const skillsMenuWrapRef = ref<HTMLElement>();
const modelMenuWrapRef = ref<HTMLElement>();
const { createMessage } = useMessage();
const pageContext = usePageContext();
const userStore = useUserStore();

interface ComposerAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  file: File;
  previewUrl?: string;
}

const attachments = ref<ComposerAttachment[]>([]);
const addMenuOpen = ref(false);
const skillsMenuOpen = ref(false);
const modelMenuOpen = ref(false);
const webSearchEnabled = ref(false);
const fileInputAccept = ref('');

const historyStorageKey = computed(() => {
  const username = userStore.getUserInfo?.username || userStore.getUserInfo?.id || 'anonymous';
  return `jeecg:airag:chat:${username}:${AI_SDK_SESSION_TYPE}:history`;
});
const serviceStatusText = computed(() => (loading.value ? '处理中' : '在线'));
const pageHeight = computed(() => Math.max((pageContext.contentHeight?.value || window.innerHeight) - 1, 560));
const latestAssistantId = computed(() => {
  const assistants = chat.messages.filter((message) => message.role === 'assistant');
  return assistants[assistants.length - 1]?.id;
});
const selectedModelLabel = computed(() => {
  if (modelLoading.value) return '加载模型';
  return modelOptions.value.find((model) => model.id === selectedModelId.value)?.displayName || '默认模型';
});

async function loadActiveLlmModels() {
  modelLoading.value = true;
  try {
    const res = await getActiveLlmModels();
    const records = res?.result?.records || res?.records || [];
    modelOptions.value = Array.isArray(records)
      ? records.map((model) => ({
          id: model.id,
          name: model.name || model.modelName || '未命名模型',
          displayName: model.modelName || model.name || '未命名模型',
          provider: model.provider,
          modelName: model.modelName,
          modelType: model.modelType,
          activateFlag: model.activateFlag,
        }))
      : [];
    if (!selectedModelId.value && modelOptions.value.length) {
      selectedModelId.value = modelOptions.value[0].id;
    }
  } catch (error: any) {
    modelOptions.value = [];
    createMessage.warning(error?.message || 'AI 模型配置读取失败');
  } finally {
    modelLoading.value = false;
  }
}

function getMessageText(message: UIMessage) {
  return message.parts.map((part) => (part.type === 'text' ? part.text : '')).join('');
}

function addMessage(role: 'user' | 'assistant', text: string) {
  const id = `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  chat.messages = [
    ...chat.messages,
    {
      id,
      role,
      parts: [{ type: 'text', text }],
    } as UIMessage,
  ];
  return id;
}

function updateMessage(id: string, text: string) {
  chat.messages = chat.messages.map((message) =>
    message.id === id
      ? ({
          ...message,
          parts: [{ type: 'text', text }],
        } as UIMessage)
      : message
  );
}

function createConversationId() {
  return `${AI_SDK_SESSION_TYPE}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getConversationTitle(requirement: string) {
  const text = requirement.replace(/\s+/g, ' ').trim();
  return text.length > 18 ? `${text.slice(0, 18)}...` : text || '新建对话';
}

function loadHistoryItems() {
  try {
    const raw = localStorage.getItem(historyStorageKey.value);
    const list = raw ? JSON.parse(raw) : [];
    historyItems.value = Array.isArray(list)
      ? list.filter((item) => item?.sessionType === AI_SDK_SESSION_TYPE && item?.id && Array.isArray(item?.messages))
      : [];
  } catch {
    historyItems.value = [];
  }
}

function saveHistoryItems() {
  localStorage.setItem(historyStorageKey.value, JSON.stringify(historyItems.value));
}

function persistActiveConversation(titleSeed?: string) {
  const hasUserMessage = chat.messages.some((message) => message.role === 'user');
  if (!hasUserMessage) return;

  const id = activeConversationId.value || createConversationId();
  activeConversationId.value = id;
  const existed = historyItems.value.find((item) => item.id === id);
  const firstUserMessage = chat.messages.find((message) => message.role === 'user');
  const item: AiSdkHistoryItem = {
    id,
    title: existed?.title || getConversationTitle(titleSeed || (firstUserMessage ? getMessageText(firstUserMessage) : '')),
    updatedAt: Date.now(),
    messages: JSON.parse(JSON.stringify(chat.messages)),
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
  addMenuOpen.value = false;
  skillsMenuOpen.value = false;
  clearComposer();
  clearAttachments();
  chat.messages = target.messages?.length ? JSON.parse(JSON.stringify(target.messages)) : [createWelcomeMessage()];
  await scrollToBottom();
}

function handleHistoryItemClick(item: AiSdkHistoryItem) {
  if (editingHistoryId.value === item.id) return;
  loadConversation(item.id);
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

async function scrollToBottom() {
  await nextTick();
  if (messageBoxRef.value) {
    messageBoxRef.value.scrollTop = messageBoxRef.value.scrollHeight;
  }
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

function clearAttachments() {
  attachments.value.forEach((file) => {
    if (file.previewUrl) {
      URL.revokeObjectURL(file.previewUrl);
    }
  });
  attachments.value = [];
}

function addAttachments(files: FileList | File[]) {
  const nextFiles = Array.from(files).map((file) => ({
    id: `${file.name}-${file.lastModified}-${Math.random().toString(16).slice(2)}`,
    name: file.name,
    size: file.size,
    type: file.type,
    file,
    previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
  }));
  attachments.value = [...attachments.value, ...nextFiles];
}

function removeAttachment(id: string) {
  const target = attachments.value.find((file) => file.id === id);
  if (target?.previewUrl) {
    URL.revokeObjectURL(target.previewUrl);
  }
  attachments.value = attachments.value.filter((file) => file.id !== id);
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
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
  selectedModelId.value = id;
  modelMenuOpen.value = false;
}

function toggleWebSearch() {
  webSearchEnabled.value = !webSearchEnabled.value;
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
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
  event.preventDefault();
  sendRequirement();
}

async function sendRequirement() {
  syncComposerText();
  const requirement = input.value.trim();
  if (!requirement || loading.value) return;

  clearComposer();
  addMessage('user', requirement);
  loading.value = true;
  await scrollToBottom();

  try {
    const assistantId = addMessage('assistant', '思考中...');
    const stream = await debugAssistant({
      content: requirement,
      app: {
        id: 'ai-sdk-dev',
        name: 'JeecgBoot AI 助手',
        type: 'chatSimple',
        prompt: '你是 JeecgBoot AI 应用开发助手，请结合用户需求给出可执行的开发建议。',
        modelId: selectedModelId.value,
      },
      responseMode: 'streaming',
      enableSearch: webSearchEnabled.value,
      sessionType: AI_SDK_SESSION_TYPE,
    });
    await renderAssistantStream(stream, assistantId);
  } catch (error: any) {
    createMessage.error(error?.message || 'AI Orchestrator 服务调用失败');
    addMessage('assistant', '调用 AI Orchestrator 失败，请确认 Python 服务已在 9100 端口启动。');
  } finally {
    persistActiveConversation(requirement);
    loading.value = false;
    await scrollToBottom();
  }
}

async function renderAssistantStream(readableStream: ReadableStream<Uint8Array>, assistantId: string) {
  const reader = readableStream.getReader();
  const decoder = new TextDecoder('UTF-8');
  let buffer = '';
  let text = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() || '';

    for (const part of parts) {
      const content = part.startsWith('data:') ? part.replace('data:', '').trim() : part.trim();
      if (!content) continue;
      try {
        const event = JSON.parse(content);
        if (event.event === 'MESSAGE') {
          text += event.data?.message || '';
          updateMessage(assistantId, text || '思考中...');
        }
        if (event.event === 'ERROR') {
          updateMessage(assistantId, event.data?.message || '调用 AI Orchestrator 失败');
        }
      } catch (error) {
        console.log('AI SDK stream parse failed:', error);
      }
    }
  }
}

function handleEnter(event: KeyboardEvent) {
  if (event.shiftKey) return;
  event.preventDefault();
  sendRequirement();
}

function clearMessages() {
  chat.messages = chat.messages.slice(0, 1);
  clearAttachments();
  addMenuOpen.value = false;
  skillsMenuOpen.value = false;
  modelMenuOpen.value = false;
  clearComposer();
}

function startNewConversation() {
  activeConversationId.value = '';
  clearMessages();
  chat.messages = [createWelcomeMessage()];
}

onMounted(() => {
  loadHistoryItems();
  loadActiveLlmModels();
  if (historyItems.value.length) {
    loadConversation(historyItems.value[0].id);
  }
  document.addEventListener('pointerdown', handleDocumentPointerDown);
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown);
});
</script>

<style scoped lang="less" src="./AiSdkChat.less"></style>
