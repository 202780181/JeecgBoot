<template>
  <wd-popup v-model="show" position="bottom" @close="handleClose">
    <view class="contetn">
      <wd-text custom-class="title" v-if="title" :text="title"></wd-text>
      <wd-cell-group border>
        <wd-cell
          v-for="(item, index) in options"
          :icon="item.icon"
          :label="item.label"
          :custom-class="item.color"
          clickable
          @click="handleClick(item)"
        ></wd-cell>
      </wd-cell-group>
    </view>
  </wd-popup>
</template>

<script setup lang="ts">
import { ref } from 'vue'
defineOptions({
  name: 'BottomOperate',
  options: {
    styleIsolation: 'shared',
  },
})
const eimt = defineEmits(['change', 'close'])
const show = ref(true)
const props = defineProps(['title', 'data', 'options'])
const handleClose = () => {
  show.value = false
  setTimeout(() => {
    eimt('close')
  }, 300)
}
const handleClick = (item) => {
  eimt('change', { option: item, data: props.data })
  handleClose()
}
</script>

<style lang="scss" scoped>
.contetn {
  padding-top: 10px;
  :deep(.title) {
    padding-left: 10px;
    padding-right: 10px;
    font-size: 14px;
    color: #666;
    margin-bottom: 10px;
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  :deep(.wd-cell) {
    padding-left: 10px;
    --wot-cell-icon-size: 15px;
    --wot-cell-label-color: #444;
    --wot-cell-label-fs: 14px;
    .wd-icon {
      margin-right: 10px;
    }
    .wd-cell__label {
      margin-top: 0;
    }
    &.red {
      color: red;
      --wot-cell-label-color: red;
    }
  }
}
</style>
