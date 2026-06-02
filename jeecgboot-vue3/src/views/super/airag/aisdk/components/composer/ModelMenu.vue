<template>
  <div ref="modelMenuWrapRef" class="model-menu-wrap">
    <button class="model-trigger" type="button" :disabled="loading || !modelOptions.length" @click="$emit('toggleMenu')">
      <span>{{ selectedModelLabel }}</span>
      <Icon icon="ant-design:down-outlined" />
    </button>
    <AnimatePresence>
      <Motion
        v-if="open"
        as="div"
        class="model-menu"
        :initial="popupMotion.initial"
        :animate="popupMotion.animate"
        :exit="popupMotion.exit"
        :transition="popupMotion.transition"
      >
        <button
          v-for="model in modelOptions"
          :key="model.id"
          class="model-option"
          :class="{ selected: selectedModelId === model.id }"
          type="button"
          @click="$emit('select', model.id)"
        >
          <span>{{ getModelLabel(model) }}</span>
          <Icon v-if="selectedModelId === model.id" icon="ant-design:check-outlined" />
        </button>
      </Motion>
    </AnimatePresence>
  </div>
</template>

<script setup lang="ts">
import { AnimatePresence, Motion } from 'motion-v';
import { onMounted, ref } from 'vue';
import Icon from '@/components/Icon';
import type { AiModelOption } from '../../api/AiSdkChat.api';

defineProps<{
  loading: boolean;
  modelOptions: AiModelOption[];
  open: boolean;
  popupMotion: {
    animate: Recordable;
    exit: Recordable;
    initial: Recordable;
    transition: Recordable;
  };
  selectedModelId: string;
  selectedModelLabel: string;
}>();

const emit = defineEmits<{
  (event: 'menuRef', value: HTMLElement | undefined): void;
  (event: 'select', value: string): void;
  (event: 'toggleMenu'): void;
}>();

const modelMenuWrapRef = ref<HTMLElement>();

function getModelLabel(model: AiModelOption) {
  return model.displayName || model.name || model.modelName || model.id;
}

onMounted(() => {
  emit('menuRef', modelMenuWrapRef.value);
});
</script>

<style scoped lang="less">
.model-menu-wrap {
  position: relative;
}

.model-trigger {
  display: inline-flex;
  max-width: 154px;
  height: 30px;
  padding: 0 8px;
  color: #374151;
  font-size: 13px;
  background: transparent;
  border: 0;
  border-radius: 8px;
  align-items: center;
  gap: 4px;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: #f3f4f6;
  }

  &:disabled {
    color: #9ca3af;
    cursor: not-allowed;
  }

  span {
    overflow: hidden;
    min-width: 0;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :deep(.anticon),
  :deep(svg) {
    width: 10px;
    height: 10px;
    color: #6b7280;
    flex: 0 0 auto;
  }
}

.model-menu {
  position: absolute;
  right: 0;
  bottom: 42px;
  z-index: 5;
  width: 154px;
  max-height: 238px;
  padding: 6px;
  overflow-y: auto;
  background: #ffffff;
  border: 1px solid var(--ai-border);
  border-radius: 12px;
  box-shadow: 0 12px 34px rgba(15, 23, 42, 0.16);
  transform-origin: bottom right;
}

.model-option {
  display: grid;
  width: 100%;
  min-height: 34px;
  padding: 0 8px;
  color: var(--ai-text);
  font-size: 13px;
  text-align: left;
  background: transparent;
  border: 0;
  border-radius: 8px;
  grid-template-columns: minmax(0, 1fr) 14px;
  align-items: center;
  gap: 8px;
  cursor: pointer;

  &:hover {
    background: #f3f4f6;
  }

  &.selected {
    color: var(--ai-primary);
    font-weight: 600;
    background: var(--ai-primary-soft-strong);
  }

  span {
    overflow: hidden;
    min-width: 0;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :deep(.anticon),
  :deep(svg) {
    width: 13px;
    height: 13px;
    color: var(--ai-primary);
  }
}
</style>
