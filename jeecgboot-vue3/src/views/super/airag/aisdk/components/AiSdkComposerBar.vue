<template>
  <footer class="composer-wrap">
    <div class="composer">
      <AttachmentList :attachments="attachments" :format-file-size="formatFileSize" @remove="$emit('removeAttachment', $event)" />

      <div v-if="selectedSkills.length" class="selected-skills">
        <button v-for="skill in selectedSkills" :key="skill.id" type="button" @click="$emit('removeSkill', skill.id)">
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
        @input="$emit('composerInput')"
        @paste="$emit('composerPaste', $event)"
        @keydown="$emit('composerKeydown', $event)"
      ></div>

      <div class="composer-actions">
        <div class="composer-left">
          <div ref="addMenuWrapRef" class="add-menu-wrap">
            <button class="round-tool" type="button" aria-label="添加" @click="$emit('toggleAddMenu')">
              <Icon icon="ant-design:plus-outlined" />
            </button>
            <AnimatePresence>
              <Motion
                v-if="addMenuOpen"
                as="div"
                class="add-menu"
                :initial="popupMotion.initial"
                :animate="popupMotion.animate"
                :exit="popupMotion.exit"
                :transition="popupMotion.transition"
              >
                <button type="button" @click="$emit('openFilePicker', 'file')">
                  <Icon icon="ant-design:paper-clip-outlined" />
                  <span>上传文件</span>
                </button>
                <button type="button" @click="$emit('openFilePicker', 'image')">
                  <Icon icon="ant-design:picture-outlined" />
                  <span>上传图片</span>
                </button>
                <button class="menu-toggle" type="button" @click="$emit('toggleWebSearch')">
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
          <SkillsPanel
            :active-skill-category="activeSkillCategory"
            :filtered-skill-options="filteredSkillOptions"
            :loading="skillsLoading"
            :open="skillsMenuOpen"
            :popup-motion="popupMotion"
            :selected-skill-ids="selectedSkillIds"
            :skill-categories="skillCategories"
            @menu-ref="$emit('menuRef', 'skills', $event)"
            @toggle-menu="$emit('toggleSkillsMenu')"
            @toggle-skill="$emit('toggleSkill', $event)"
            @update-active-category="$emit('updateActiveSkillCategory', $event)"
          />
        </div>

        <div class="composer-right">
          <ModelMenu
            :loading="modelLoading"
            :model-options="modelOptions"
            :open="modelMenuOpen"
            :popup-motion="popupMotion"
            :selected-model-id="selectedModelId"
            :selected-model-label="selectedModelLabel"
            @menu-ref="$emit('menuRef', 'model', $event)"
            @select="$emit('selectModel', $event)"
            @toggle-menu="$emit('toggleModelMenu')"
          />
          <button class="send-btn" type="button" :disabled="loading || !input.trim()" :aria-label="loading ? '发送中' : '发送'" @click="$emit('send')">
            <Icon :icon="loading ? 'ant-design:loading-3-quarters-outlined' : 'material-symbols:arrow-upward-rounded'" />
          </button>
        </div>
      </div>
    </div>
    <input ref="fileInputRef" class="file-input" type="file" multiple :accept="fileInputAccept" @change="$emit('fileSelect', $event)" />
  </footer>
</template>

<script setup lang="ts">
import { AnimatePresence, Motion } from 'motion-v';
import { onMounted, ref } from 'vue';
import Icon from '@/components/Icon';
import type { AiModelOption, AiSkillOption } from '../api/AiSdkChat.api';
import type { ComposerAttachment, AiSdkMessageSkill } from '../types';
import AttachmentList from './composer/AttachmentList.vue';
import ModelMenu from './composer/ModelMenu.vue';
import SkillsPanel from './composer/SkillsPanel.vue';

defineProps<{
  activeSkillCategory: string;
  addMenuOpen: boolean;
  attachments: ComposerAttachment[];
  fileInputAccept: string;
  filteredSkillOptions: AiSkillOption[];
  formatFileSize: (size: number) => string;
  input: string;
  loading: boolean;
  modelLoading: boolean;
  modelMenuOpen: boolean;
  modelOptions: AiModelOption[];
  popupMotion: {
    animate: Recordable;
    exit: Recordable;
    initial: Recordable;
    transition: Recordable;
  };
  selectedModelId: string;
  selectedModelLabel: string;
  selectedSkillIds: string[];
  selectedSkills: AiSdkMessageSkill[];
  skillCategories: string[];
  skillsLoading: boolean;
  skillsMenuOpen: boolean;
  webSearchEnabled: boolean;
}>();

const emit = defineEmits<{
  (event: 'composerInput'): void;
  (event: 'composerKeydown', value: KeyboardEvent): void;
  (event: 'composerPaste', value: ClipboardEvent): void;
  (event: 'fileInputRef', value: HTMLInputElement | undefined): void;
  (event: 'fileSelect', value: Event): void;
  (event: 'menuRef', key: 'add' | 'skills' | 'model', value: HTMLElement | undefined): void;
  (event: 'openFilePicker', value: 'file' | 'image'): void;
  (event: 'removeAttachment', value: string): void;
  (event: 'removeSkill', value: string): void;
  (event: 'selectModel', value: string): void;
  (event: 'send'): void;
  (event: 'setComposerRef', value: HTMLElement | undefined): void;
  (event: 'toggleAddMenu'): void;
  (event: 'toggleModelMenu'): void;
  (event: 'toggleSkill', value: string): void;
  (event: 'toggleSkillsMenu'): void;
  (event: 'toggleWebSearch'): void;
  (event: 'updateActiveSkillCategory', value: string): void;
}>();

const addMenuWrapRef = ref<HTMLElement>();
const composerRef = ref<HTMLElement>();
const fileInputRef = ref<HTMLInputElement>();

onMounted(() => {
  emit('fileInputRef', fileInputRef.value);
  emit('menuRef', 'add', addMenuWrapRef.value);
  emit('setComposerRef', composerRef.value);
});
</script>

<style scoped lang="less">
.composer-wrap {
  padding: 10px 32px 12px;
  background: #ffffff;
}

.composer {
  padding: 10px;
  background: #ffffff;
  border: 1px solid var(--ai-border);
  border-radius: 12px;
  box-shadow: none;
}

.composer-input {
  min-height: 40px;
  max-height: 120px;
  padding: 4px 2px 0;
  overflow-y: auto;
  color: var(--ai-text);
  font-size: 14px;
  line-height: 1.7;
  outline: none;
  white-space: pre-wrap;
  word-break: break-word;

  &:empty::before {
    color: #9ca3af;
    content: attr(data-placeholder);
    pointer-events: none;
  }
}

.composer-actions {
  display: flex;
  margin-top: 10px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.composer-left {
  position: relative;
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.composer-right {
  position: relative;
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.round-tool {
  display: inline-flex;
  width: 34px;
  height: 34px;
  color: var(--ai-muted);
  background: transparent;
  border: 0;
  border-radius: 50%;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:hover {
    background: #f3f4f6;
  }
}

.add-menu-wrap {
  position: relative;
}

.add-menu {
  position: absolute;
  bottom: 44px;
  left: 0;
  z-index: 5;
  width: 168px;
  padding: 6px;
  background: #ffffff;
  border: 1px solid var(--ai-border);
  border-radius: 12px;
  box-shadow: 0 12px 34px rgba(15, 23, 42, 0.16);
  transform-origin: bottom left;

  button {
    display: flex;
    width: 100%;
    height: 38px;
    padding: 0 10px;
    color: var(--ai-text);
    font-size: 14px;
    text-align: left;
    background: transparent;
    border: 0;
    border-radius: 8px;
    align-items: center;
    gap: 10px;
    cursor: pointer;

    &:hover {
      background: #f3f4f6;
    }
  }

  .menu-toggle {
    justify-content: space-between;
  }
}

.menu-toggle-label {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
}

.switch-track {
  position: relative;
  display: inline-flex;
  width: 34px;
  height: 20px;
  padding: 2px;
  background: #d1d5db;
  border-radius: 999px;
  flex: 0 0 auto;
  transition: background-color 0.16s ease;

  i {
    display: block;
    width: 16px;
    height: 16px;
    background: #ffffff;
    border-radius: 50%;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.2);
    transition: transform 0.16s ease;
  }

  &.active {
    background: var(--ai-primary);

    i {
      transform: translateX(14px);
    }
  }
}

.selected-skills {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 7px;
  gap: 5px;

  button {
    display: inline-flex;
    max-width: 100%;
    height: 24px;
    padding: 0 8px 0 6px;
    color: #202124;
    font-size: 12px;
    font-weight: 400;
    background: #f3f4f6;
    border: 0;
    border-radius: 999px;
    align-items: center;
    gap: 5px;
    cursor: pointer;
    transition:
      background-color 0.16s ease,
      color 0.16s ease;

    &:hover {
      background: #eef2ff;
      color: var(--ai-primary);

      .skill-chip-default-icon {
        opacity: 0;
        transform: scale(0.72);
      }

      .skill-chip-close-icon {
        opacity: 1;
        transform: scale(1);
      }
    }

    span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

.skill-chip-action {
  position: relative;
  display: inline-flex;
  width: 16px;
  height: 16px;
  color: #ffffff;
  background: var(--ai-primary);
  border-radius: 5px;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;

  :deep(.anticon),
  :deep(svg) {
    position: absolute;
    width: 11px;
    height: 11px;
    transition:
      opacity 0.14s ease,
      transform 0.14s ease;
  }
}

.skill-chip-close-icon {
  opacity: 0;
  transform: scale(0.72);
}

.send-btn {
  display: flex;
  width: 34px;
  height: 34px;
  color: #ffffff;
  font-size: 21px;
  background: var(--ai-primary);
  border: 0;
  border-radius: 50%;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    transform 0.16s ease,
    background-color 0.16s ease,
    opacity 0.16s ease;

  &:hover:not(:disabled) {
    background: var(--ai-primary-hover);
    transform: translateY(-1px);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
}

.file-input {
  display: none;
}
</style>
