<template>
  <view
    class="wrap"
    :style="{
      '--borderColor': borderColor,
      '--imgWidth': imgWidth,
      '--imgHeight': imgHeight,
    }"
  >
    <wd-grid :clickable="clickable" :column="column">
      <template v-for="(item, index) in modelValue" :key="item[itemKey]">
        <wd-grid-item
          :custom-class="getClass(index)"
          use-icon-slot
          :text="item.text"
          @itemclick="handleClik(item, index)"
        >
          <template #icon>
            <wd-img :width="imgWidth" :height="imgHeight" :src="item.img"></wd-img>
          </template>
        </wd-grid-item>
      </template>
    </wd-grid>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
defineOptions({
  name: 'Grid',
  options: {
    styleIsolation: 'shared',
  },
})
const props = defineProps({
  modelValue: {
    type: Array,
    default: () => [],
  },
  column: {
    type: Number,
    default: 4,
  },
  itemKey: {
    type: String,
    default: 'id',
  },
  imgWidth: {
    type: String,
    default: '28px',
  },
  imgHeight: {
    type: String,
    default: '28px',
  },
  clickable: {
    type: Boolean,
    default: true,
  },
  borderColor: {
    type: String,
    default: 'rgba(165, 165, 165, 0.1)',
  },
})
const emit = defineEmits(['itemClik'])
const getClass = (index) => {
  let className = ''
  if (index < props.column) {
    className = 'first-row'
  }
  if ((index + 1) % props.column == 0) {
    className += ` lastCol`
  }
  return className
}
const handleClik = (item, index) => {
  emit('itemClik', item, index)
}
</script>

<style lang="scss" scoped>
:deep(.wd-grid-item) {
  box-sizing: border-box;
  border-right: 1px solid var(--borderColor, rgba(165, 165, 165, 0.1));
  border-bottom: 1px solid var(--borderColor, rgba(165, 165, 165, 0.1));
  &.first-row {
    border-top: 1px solid var(--borderColor, rgba(165, 165, 165, 0.1));
  }
  &.lastCol {
    border-right: none;
  }
  .wd-grid-item__text {
    margin-top: 10px;
  }
  .wd-grid-item__wrapper {
    width: var(--imgWidth, 28px) !important;
    height: var(--imgHeight, 28px) !important;
  }
}
</style>
