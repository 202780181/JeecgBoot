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
      </header>

      <main ref="messageBoxRef" class="message-list">
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
                正在思考
              </div>
              <div v-else-if="part.type === 'data-tool'" class="tool-card" :class="{ running: part.data.status === 'running' }">
                <div class="tool-card-head">
                  <span class="tool-card-icon">
                    <Icon :icon="part.data.status === 'running' ? 'ant-design:loading-3-quarters-outlined' : 'ant-design:check-circle-filled'" />
                  </span>
                  <div>
                    <strong>{{ part.data.title || part.data.toolName || '工具调用' }}</strong>
                    <em>{{ part.data.status === 'running' ? '执行中' : '已完成' }}</em>
                  </div>
                </div>
                <pre v-if="part.data.input || part.data.result" class="tool-card-payload">{{ formatToolPayload(part.data.result || part.data.input) }}</pre>
              </div>
              <div v-else-if="part.type === 'data-spec'" class="spec-card" :class="`status-${part.data.status}`">
                <div class="spec-card-head">
                  <span class="spec-card-icon">
                    <Icon :icon="getSpecStatusIcon(part.data.status)" />
                  </span>
                  <div>
                    <strong>{{ part.data.template || part.data.skillName || 'spec-kit' }}</strong>
                    <em>{{ part.data.message }}</em>
                  </div>
                </div>
                <div class="spec-steps">
                  <div v-for="step in getSpecSteps(part.data)" :key="step.type" class="spec-step" :class="{ done: step.done, active: step.active }">
                    <span class="spec-step-dot">
                      <Icon v-if="step.done" icon="ant-design:check-outlined" />
                    </span>
                    <div>
                      <strong>{{ step.title }}</strong>
                      <em>{{ step.path || step.description }}</em>
                    </div>
                  </div>
                </div>
                <div v-if="part.data.result?.featureDir || part.data.result?.taskCount" class="spec-card-foot">
                  <span v-if="part.data.result?.taskCount">任务 {{ part.data.result.taskCount }} 个</span>
                  <span v-if="part.data.result?.source">来源 {{ part.data.result.source }}</span>
                  <span v-if="part.data.result?.featureDir">{{ part.data.result.featureDir }}</span>
                </div>
              </div>
              <div v-else-if="part.type === 'data-weather'" class="weather-card" :class="getWeatherSceneClass(part.data)">
                <div class="weather-scene" aria-hidden="true">
                  <span class="weather-scene-layer layer-a"></span>
                  <span class="weather-scene-layer layer-b"></span>
                  <span class="weather-scene-layer layer-c"></span>
                </div>
                <div class="weather-card-main">
                  <div class="weather-place">
                    <span>{{ part.data.city || '当前城市' }}</span>
                    <em>{{ part.data.adm2 || part.data.adm1 || '我的位置' }}</em>
                  </div>
                  <div class="weather-temp">
                    <span>{{ formatWeatherTemperature(part.data) }}</span>
                  </div>
                </div>
                <div class="weather-summary">
                  <div class="weather-alert">
                    <Icon icon="ant-design:warning-filled" />
                    <span>{{ part.data.weather || '天气预报' }}</span>
                  </div>
                  <div class="weather-range">
                    <span>最高 {{ part.data.high || '未知' }}</span>
                    <span>最低 {{ part.data.low || '未知' }}</span>
                  </div>
                </div>
                <div class="weather-metrics">
                  <div>
                    <span>湿度</span>
                    <strong>{{ part.data.humidity || '未知' }}</strong>
                  </div>
                  <div>
                    <span>降水</span>
                    <strong>{{ part.data.precip || '未知' }}</strong>
                  </div>
                  <div>
                    <span>风力</span>
                    <strong>{{ part.data.wind || '未知' }}</strong>
                  </div>
                  <div>
                    <span>紫外线</span>
                    <strong>{{ part.data.uvIndex || '未知' }}</strong>
                  </div>
                </div>
                <div v-if="part.data.daily?.length" class="weather-forecast">
                  <div v-for="item in part.data.daily" :key="item.date" class="weather-day">
                    <span>{{ formatWeatherDate(item.date) }}</span>
                    <Icon class="weather-day-icon" :icon="getWeatherIcon(item)" />
                    <em>{{ item.weather }}</em>
                    <strong>{{ item.low }} / {{ item.high }}</strong>
                  </div>
                </div>
                <div class="weather-footer">
                  <span>日出 {{ part.data.sunrise || '未知' }}</span>
                  <span>日落 {{ part.data.sunset || '未知' }}</span>
                  <a v-if="part.data.fxLink" :href="part.data.fxLink" target="_blank" rel="noopener noreferrer">和风天气</a>
                </div>
              </div>
            </template>
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

          <div v-if="selectedSkills.length" class="selected-skills">
            <button v-for="skill in selectedSkills" :key="skill.id" type="button" @click="removeSkill(skill.id)">
              <span class="skill-chip-action" aria-hidden="true">
                <Icon class="skill-chip-default-icon" icon="ant-design:thunderbolt-filled" />
                <Icon class="skill-chip-close-icon" icon="ant-design:close-outlined" />
              </span>
              <span>{{ skill.name }}</span>
            </button>
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
                    :initial="composerPopupMotion.initial"
                    :animate="composerPopupMotion.animate"
                    :exit="composerPopupMotion.exit"
                    :transition="composerPopupMotion.transition"
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
                    :initial="composerPopupMotion.initial"
                    :animate="composerPopupMotion.animate"
                    :exit="composerPopupMotion.exit"
                    :transition="composerPopupMotion.transition"
                  >
                    <h3>Skills</h3>
                    <div v-if="skillCategories.length > 1" class="skills-categories">
                      <button
                        v-for="category in skillCategories"
                        :key="category"
                        type="button"
                        :class="{ active: activeSkillCategory === category }"
                        @click="activeSkillCategory = category"
                      >
                        {{ category }}
                      </button>
                    </div>
                    <div v-if="skillsLoading" class="skills-empty">加载中</div>
                    <div v-else-if="!filteredSkillOptions.length" class="skills-empty">暂无技能</div>
                    <div v-else class="skills-list">
                      <button
                        v-for="skill in filteredSkillOptions"
                        :key="skill.id"
                        type="button"
                        class="skill-option"
                        :class="{ active: selectedSkillIds.includes(skill.id) }"
                        @click="toggleSkill(skill.id)"
                      >
                        <span>
                          <strong>{{ skill.name }}</strong>
                          <em>{{ skill.description }}</em>
                        </span>
                        <Icon v-if="selectedSkillIds.includes(skill.id)" icon="ant-design:check-circle-filled" />
                      </button>
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
                    :initial="composerPopupMotion.initial"
                    :animate="composerPopupMotion.animate"
                    :exit="composerPopupMotion.exit"
                    :transition="composerPopupMotion.transition"
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
import { AnimatePresence, Motion, type $Transition } from 'motion-v';
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import Icon from '@/components/Icon';
import { usePageContext } from '@/hooks/component/usePageContext';
import { useMessage } from '@/hooks/web/useMessage';
import { useUserStore } from '@/store/modules/user';
import { debugAssistant, getOrchestratorSkills, type AiSkillOption } from './AiSdkChat.api';
import { 
  cloneMessages, 
  createConversationId, 
  getConversationTitle, 
  loadHistoryItemsFromStorage, 
  saveHistoryItemsToStorage 
} from './historyStore';
import { AI_SDK_SESSION_TYPE, type AiSdkHistoryItem, type AiSdkMessageSkill, type AiSdkSpecData, type AiSdkUIMessage } from './types';
import { useAiSdkChatMessages } from './useAiSdkChatMessages';
import { useAiSdkModels } from './useAiSdkModels';
import { useAiSdkStreamRenderer } from './useAiSdkStreamRenderer';
import { useAutoScroll } from './useAutoScroll';
import { useComposerAttachments } from './useComposerAttachments';
import VirtualMarkdownText from './VirtualMarkdownText.vue';
// @ts-ignore
import { formatWeatherDate, formatWeatherTemperature, getWeatherIcon, getWeatherSceneClass } from './weather';

const input = ref('');
const loading = ref(false);
const historyItems = ref<AiSdkHistoryItem[]>([]);
const activeConversationId = ref('');
const editingHistoryId = ref('');
const editingHistoryTitle = ref('');
const messageBoxRef = ref<HTMLElement>();
const composerRef = ref<HTMLElement>();
const historyTitleInputRef = ref<HTMLInputElement | null>(null);
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
const pageContext = usePageContext();
const userStore = useUserStore();
const { scrollToBottom, scheduleScrollToBottom } = useAutoScroll(messageBoxRef);
const { attachments, addAttachments, clearAttachments, formatFileSize, removeAttachment } = useComposerAttachments();
const { 
  addMessage, 
  addThinkingMessage, 
  appendSpecPart,
  appendToolPart,
  appendWeatherPart, 
  chat, 
  clearMessages: clearChatMessages, 
  finishMessage,
  getMessageParts, 
  getMessageText, 
  updateMessage 
} = useAiSdkChatMessages({ scheduleScrollToBottom });
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
  appendSpecPart,
  appendToolPart,
  appendWeatherPart,
  finishMessage,
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

function getMessageSkills(message: AiSdkUIMessage): AiSdkMessageSkill[] {
  const skills = message.metadata?.skills;
  return Array.isArray(skills) ? skills.filter((skill) => skill?.id && skill?.name) : [];
}

function loadHistoryItems() {
  historyItems.value = loadHistoryItemsFromStorage(historyStorageKey.value);
}

function saveHistoryItems() {
  saveHistoryItemsToStorage(historyStorageKey.value, historyItems.value);
}

function formatToolPayload(value: unknown) {
  if (!value) return '';
  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    return String(value);
  }
}

function getSpecStatusIcon(status: string) {
  if (status === 'failed') return 'ant-design:close-circle-filled';
  if (status === 'completed') return 'ant-design:check-circle-filled';
  return 'ant-design:loading-3-quarters-outlined';
}

function getSpecSteps(data: AiSdkSpecData) {
  const artifacts = data.artifacts || [];
  const artifactMap = new Map(artifacts.map((artifact) => [artifact.type, artifact]));
  const stageOrder = ['start', 'spec', 'plan', 'tasks', 'completed'];
  const activeIndex = Math.max(0, stageOrder.indexOf(data.stage));
  return [
    {
      type: 'spec',
      title: 'Spec',
      description: '需求规格',
    },
    {
      type: 'plan',
      title: 'Plan',
      description: '实现计划',
    },
    {
      type: 'tasks',
      title: 'Tasks',
      description: '任务拆分',
    },
  ].map((step) => {
    const artifact = artifactMap.get(step.type);
    const stepIndex = stageOrder.indexOf(step.type);
    return {
      ...step,
      path: artifact?.path || '',
      done: !!artifact || data.stage === 'completed',
      active: !artifact && activeIndex === stepIndex,
    };
  });
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

function syncActiveConversationSkills() {
  if (!activeConversationId.value) return;
  let changed = false;
  historyItems.value = historyItems.value.map((item) => {
    if (item.id !== activeConversationId.value) return item;
    changed = true;
    return { ...item, skillIds: [...selectedSkillIds.value], updatedAt: Date.now() };
  });
  if (changed) {
    saveHistoryItems();
  }
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
    messages: cloneMessages(chat.messages),
    skillIds: [...selectedSkillIds.value],
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
  selectedSkillIds.value = Array.isArray(target.skillIds) ? target.skillIds.slice(0, 1) : [];
  chat.messages = target.messages?.length ? cloneMessages(target.messages) : [];
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
  setSelectedSkillIds([]);
  skillsMenuOpen.value = false;
  addMessage('user', requirement, sentSkills.length ? { skills: sentSkills } : undefined);
  loading.value = true;
  await scrollToBottom();

  const assistantId = addThinkingMessage();
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
      enableSearch: webSearchEnabled.value,
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
    await scrollToBottom();
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

function startNewConversation() {
  activeConversationId.value = '';
  clearMessages();
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
});
</script>

<style scoped lang="less" src="./AiSdkChat.less"></style>
