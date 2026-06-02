<template>
  <aside class="conversation-sidebar">
    <button class="new-chat-btn" type="button" @click="$emit('newConversation')">
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
        v-for="item in items"
        :key="item.id"
        class="history-item"
        :class="{ active: activeId === item.id }"
        role="button"
        tabindex="0"
        @click="$emit('select', item)"
        @keydown.enter.prevent="$emit('select', item)"
      >
        <input
          v-if="editingId === item.id"
          :ref="setTitleInputRef"
          class="history-title-input"
          :value="editingTitle"
          maxlength="40"
          @click.stop
          @input="$emit('titleInput', $event)"
          @keydown.enter.prevent.stop="$emit('saveTitle', item)"
          @keydown.esc.prevent.stop="$emit('cancelEdit')"
          @blur="$emit('saveTitle', item)"
        />
        <span v-else class="history-title">{{ item.title }}</span>

        <div class="history-actions" @click.stop>
          <button class="history-action" type="button" aria-label="编辑对话名称" @click="$emit('startEdit', item)">
            <Icon icon="ant-design:edit-outlined" />
          </button>
          <a-popconfirm title="确定删除该历史对话吗？" ok-text="删除" cancel-text="取消" placement="right" @confirm="$emit('delete', item.id)">
            <button class="history-action danger" type="button" aria-label="删除对话">
              <Icon icon="ant-design:delete-outlined" />
            </button>
          </a-popconfirm>
        </div>
      </div>
      <div v-if="!items.length" class="history-empty">暂无历史对话</div>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import Icon from '@/components/Icon';
import type { AiSdkHistoryItem } from '../types';

defineProps<{
  activeId: string;
  editingId: string;
  editingTitle: string;
  items: AiSdkHistoryItem[];
}>();

const emit = defineEmits<{
  (event: 'cancelEdit'): void;
  (event: 'delete', id: string): void;
  (event: 'newConversation'): void;
  (event: 'saveTitle', item: AiSdkHistoryItem): void;
  (event: 'select', item: AiSdkHistoryItem): void;
  (event: 'startEdit', item: AiSdkHistoryItem): void;
  (event: 'titleInput', value: Event): void;
  (event: 'titleInputRef', value: Element | null): void;
}>();

function setTitleInputRef(el: Element | null) {
  emit('titleInputRef', el);
}
</script>

<style scoped lang="less">
.conversation-sidebar {
  display: flex;
  min-width: 0;
  padding: 12px 10px;
  overflow: hidden;
  background: #ffffff;
  border-right: 1px solid var(--ai-border);
  flex-direction: column;
}

.new-chat-btn {
  display: flex;
  width: 100%;
  height: 40px;
  padding: 0 12px;
  color: #ffffff;
  font-size: 15px;
  font-weight: 600;
  background: var(--ai-primary);
  border: 0;
  border-radius: 6px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  box-shadow: none;
}

.history-head {
  display: flex;
  margin: 16px 4px 8px;
  color: var(--ai-muted);
  font-size: 13px;
  font-weight: 600;
  align-items: center;
  justify-content: space-between;
}

.icon-btn {
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

.history-list {
  display: flex;
  min-height: 0;
  overflow: auto;
  flex-direction: column;
  gap: 6px;
}

.history-item {
  display: grid;
  width: 100%;
  min-height: 38px;
  padding: 6px 6px 6px 10px;
  color: var(--ai-text);
  text-align: left;
  background: transparent;
  border: 0;
  border-radius: 8px;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 6px;
  cursor: pointer;

  &:hover {
    background: #f3f4f6;

    .history-actions {
      opacity: 1;
    }
  }

  &.active {
    background: var(--ai-primary-soft);

    .history-title {
      color: var(--ai-primary);
      font-weight: 600;
    }

    .history-actions {
      opacity: 1;
    }
  }
}

.history-title {
  overflow: hidden;
  font-size: 14px;
  line-height: 24px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-title-input {
  width: 100%;
  height: 28px;
  min-width: 0;
  padding: 0 7px;
  color: var(--ai-text);
  font-size: 14px;
  line-height: 28px;
  background: #ffffff;
  border: 1px solid var(--ai-primary-border);
  border-radius: 6px;
  outline: none;
}

.history-actions {
  display: inline-flex;
  opacity: 0;
  align-items: center;
  gap: 2px;
  transition: opacity 0.14s ease;
}

.history-action {
  display: inline-flex;
  width: 26px;
  height: 26px;
  padding: 0;
  color: #6b7280;
  font-size: 14px;
  background: transparent;
  border: 0;
  border-radius: 6px;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:hover {
    color: var(--ai-primary);
    background: #ffffff;
  }

  &.danger:hover {
    color: #dc2626;
    background: #fef2f2;
  }
}

.history-empty {
  display: flex;
  min-height: 120px;
  color: #9ca3af;
  font-size: 13px;
  align-items: center;
  justify-content: center;
}
</style>
