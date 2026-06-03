<template>
  <div class="breadcrumb">
    <template v-for="(item, index) in items" :key="index">
      <span
        class="breadcrumb-item"
        :class="{ 'is-link': index < items.length - 1 }"
        @click="handleClick(item, index)"
      >
        <slot :name="'item-' + index" :item="item">
          {{ item.title }}
        </slot>
      </span>
      <span v-if="index < items.length - 1" class="breadcrumb-separator">{{ separator }}</span>
    </template>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: 'Breadcrumb',
})

interface BreadcrumbItem {
  title: string
  [key: string]: any
}

const props = defineProps({
  items: {
    type: Array as PropType<BreadcrumbItem[]>,
    default: () => [],
  },
  separator: {
    type: String,
    default: '/',
  },
})

const emit = defineEmits(['click'])
const handleClick = (item: BreadcrumbItem, index: number) => {
  if (index < props.items.length - 1) {
    emit('click', item, index)
  }
}
</script>

<style lang="scss" scoped>
.breadcrumb {
  display: flex;
  align-items: center;
  font-size: 14px;
  line-height: 1.5;
  padding: 8px;
  &-item {
    &.is-link {
      color: rgba(0, 0, 0, 0.45);
      cursor: pointer;
      transition: color 0.3s;
    }
    &:last-child {
      color: rgba(0, 0, 0, 0.75);
    }
  }
  &-separator {
    margin: 0 8px;
    color: rgba(0, 0, 0, 0.45);
  }
}
</style>
