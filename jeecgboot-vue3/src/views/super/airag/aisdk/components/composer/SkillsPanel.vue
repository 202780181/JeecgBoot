<template>
  <div ref="skillsMenuWrapRef" class="skills-menu-wrap">
    <button class="round-tool skills-trigger" type="button" aria-label="Skills" @click="$emit('toggleMenu')">
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
        v-if="open"
        as="div"
        class="skills-panel"
        :initial="popupMotion.initial"
        :animate="popupMotion.animate"
        :exit="popupMotion.exit"
        :transition="popupMotion.transition"
      >
        <h3>Skills</h3>
        <div v-if="skillCategories.length > 1" class="skills-categories">
          <button
            v-for="category in skillCategories"
            :key="category"
            type="button"
            :class="{ active: activeSkillCategory === category }"
            @click="$emit('updateActiveCategory', category)"
          >
            {{ category }}
          </button>
        </div>
        <div v-if="loading" class="skills-empty">加载中</div>
        <div v-else-if="!filteredSkillOptions.length" class="skills-empty">暂无技能</div>
        <div v-else class="skills-list">
          <button
            v-for="skill in filteredSkillOptions"
            :key="skill.id"
            type="button"
            class="skill-option"
            :class="{ active: selectedSkillIds.includes(skill.id) }"
            @click="$emit('toggleSkill', skill.id)"
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
</template>

<script setup lang="ts">
import { AnimatePresence, Motion } from 'motion-v';
import { onMounted, ref } from 'vue';
import Icon from '@/components/Icon';
import type { AiSkillOption } from '../../api/AiSdkChat.api';

defineProps<{
  activeSkillCategory: string;
  filteredSkillOptions: AiSkillOption[];
  loading: boolean;
  open: boolean;
  popupMotion: {
    animate: Recordable;
    exit: Recordable;
    initial: Recordable;
    transition: Recordable;
  };
  selectedSkillIds: string[];
  skillCategories: string[];
}>();

const emit = defineEmits<{
  (event: 'menuRef', value: HTMLElement | undefined): void;
  (event: 'toggleMenu'): void;
  (event: 'toggleSkill', value: string): void;
  (event: 'updateActiveCategory', value: string): void;
}>();

const skillsMenuWrapRef = ref<HTMLElement>();

onMounted(() => {
  emit('menuRef', skillsMenuWrapRef.value);
});
</script>

<style scoped lang="less">
.skills-menu-wrap {
  position: relative;
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

.skills-trigger {
  color: #111827;
  background: #ffffff;

  &:hover {
    background: #f3f4f6;
  }

  svg {
    display: block;
  }
}

.skills-panel {
  position: absolute;
  bottom: 44px;
  left: 0;
  z-index: 6;
  display: flex;
  width: min(440px, calc(100vw - 112px));
  height: min(360px, calc(100vh - 220px));
  padding: 14px;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid var(--ai-border);
  border-radius: 12px;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.14);
  transform-origin: bottom left;
  flex-direction: column;

  h3 {
    flex: 0 0 auto;
    margin: 0 0 10px;
    color: #111827;
    font-size: 15px;
    font-weight: 700;
    line-height: 1.2;
  }
}

.skills-categories {
  display: flex;
  flex: 0 0 auto;
  margin-bottom: 10px;
  overflow-x: auto;
  gap: 6px;

  button {
    height: 26px;
    padding: 0 10px;
    color: #4b5563;
    font-size: 12px;
    white-space: nowrap;
    background: #f3f4f6;
    border: 0;
    border-radius: 999px;
    cursor: pointer;

    &.active,
    &:hover {
      color: var(--ai-primary);
      background: var(--ai-primary-soft);
    }
  }
}

.skills-empty {
  display: flex;
  min-height: 0;
  color: #9ca3af;
  font-size: 13px;
  background: #f9fafb;
  border: 1px dashed #e5e7eb;
  border-radius: 10px;
  align-items: center;
  justify-content: center;
  flex: 1 1 auto;
}

.skills-list {
  display: grid;
  min-height: 0;
  padding-right: 4px;
  overflow-y: auto;
  overflow-x: hidden;
  gap: 8px;
  flex: 1 1 auto;
  align-content: start;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 999px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }
}

.skill-option {
  display: grid;
  width: 100%;
  min-height: 62px;
  padding: 10px;
  color: #1f2937;
  text-align: left;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  cursor: pointer;

  &:hover {
    background: #f9fafb;
    border-color: var(--ai-primary-border);
  }

  &.active {
    background: var(--ai-primary-soft);
    border-color: var(--ai-primary-border);
  }

  strong {
    display: block;
    margin-bottom: 4px;
    overflow: hidden;
    color: #111827;
    font-size: 13px;
    line-height: 18px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  em {
    display: -webkit-box;
    overflow: hidden;
    color: #6b7280;
    font-size: 12px;
    font-style: normal;
    line-height: 18px;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }
}
</style>
