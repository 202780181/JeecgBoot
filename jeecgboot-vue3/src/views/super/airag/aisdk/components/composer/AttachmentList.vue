<template>
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
      <button type="button" aria-label="移除文件" @click="$emit('remove', file.id)">
        <Icon icon="ant-design:close-outlined" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import Icon from '@/components/Icon';
import type { ComposerAttachment } from '../../types';

defineProps<{
  attachments: ComposerAttachment[];
  formatFileSize: (size: number) => string;
}>();

defineEmits<{
  (event: 'remove', value: string): void;
}>();
</script>

<style scoped lang="less">
.attachment-list {
  display: flex;
  margin-bottom: 8px;
  overflow-x: auto;
  gap: 8px;
}

.attachment-item {
  position: relative;
  display: inline-flex;
  max-width: 260px;
  min-height: 34px;
  padding: 6px 8px;
  color: #374151;
  background: #f8fafc;
  border: 1px solid var(--ai-border);
  border-radius: 8px;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;

  img {
    display: block;
    width: 78px;
    height: 78px;
    object-fit: cover;
    border-radius: 6px;
  }

  span {
    overflow: hidden;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  em {
    color: var(--ai-muted);
    font-size: 12px;
    font-style: normal;
  }

  button {
    position: absolute;
    top: -6px;
    right: -6px;
    display: inline-flex;
    width: 22px;
    height: 22px;
    color: #4b5563;
    background: #ffffff;
    border: 1px solid var(--ai-border);
    border-radius: 50%;
    align-items: center;
    justify-content: center;
    cursor: pointer;

    &:hover {
      color: var(--ai-primary);
      background: var(--ai-primary-soft);
    }
  }
}
</style>
