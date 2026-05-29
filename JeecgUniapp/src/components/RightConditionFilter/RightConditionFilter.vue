<template>
  <wd-popup v-model="show" position="right" @close="handleClose">
    <view class="content">
      <wd-text v-if="title" :text="title"></wd-text>
      <wd-cell-group border>
        <wd-radio-group v-model="checked">
          <template v-for="(item, index) in options">
            <wd-cell :title="item.title" clickable @click="handleSelected(item)">
              <wd-radio :value="item.key"></wd-radio>
            </wd-cell>
          </template>
        </wd-radio-group>
      </wd-cell-group>
    </view>
  </wd-popup>
</template>

<script setup lang="ts">
import { hasRoute, cache } from '@/common/uitls'
import { ref } from 'vue'
const eimt = defineEmits(['change', 'close'])
const show = ref(true)
const props = defineProps(['title', 'data', 'options', 'checked'])
const checked = ref(props.checked)
const handleClose = () => {
  show.value = false
  setTimeout(() => {
    eimt('close')
  }, 300)
}
const handleSelected = (item) => {
  checked.value = item.key
  eimt('change', { option: item, data: props.data })
  handleClose()
}
</script>

<style lang="scss" scoped>
.content {
  max-width: 200px;
  padding: 10px;
  .wd-text.is-default {
    font-size: 14px;
    color: #666;
  }
  .wd-cell {
    padding-left: 0;
    --wot-cell-label-color: #444;
    --wot-cell-label-fs: 14px;
    &.red {
      color: red;
      --wot-cell-label-color: red;
    }
  }
  .wd-cell-group {
    :deep(.wd-cell__wrapper) {
      align-items: center;
      .wd-cell__right {
        flex: none;
        width: 24px;
      }
      .wd-radio {
        margin-top: 0;
      }
    }
  }
}
</style>
