<template>
  <view class="wrap">
    <template v-if="imgSrc">
      <view class="showArea">
        <view class="iconBox" @click="handleDel">
          <view class="cuIcon-close"></view>
        </view>
        <wd-img
          :radius="4"
          enable-preview
          label="头像"
          width="60px"
          height="60px"
          :src="imgSrc"
        ></wd-img>
      </view>
    </template>
    <template v-else>
      <div class="uploadArea" @click="handleUpload">
        <view class="iconBox">
          <view class="cuIcon-cameraadd"></view>
        </view>
      </div>
    </template>
    <wd-message-box></wd-message-box>
  </view>
</template>

<script setup lang="ts">
import { useMessage, useToast } from 'wot-design-uni'
import { computed, watch } from 'vue'
import { getEnvBaseUrl } from '@/utils/index'

defineOptions({
  name: 'avatar',
  options: {
    // apply-shared‌：当前页面样式会影响到子组件样式.(小程序)
    // shared‌：当前页面样式影响到子组件，子组件样式也会影响到当前页面.(小程序)
    styleIsolation: 'shared',
  },
})
const props = defineProps(['modelValue'])
const emit = defineEmits(['update:modelValue'])

const toast = useToast()
const message = useMessage()
const api = {
  uploadUrl: `${getEnvBaseUrl()}/sys/common/upload`,
}
let stopWatch

const imgSrc = computed(() => {
  return props.modelValue
})
const handleDel = () => {
  message
    .confirm({
      msg: '确定要删除这个头像吗？',
      title: '提示',
    })
    .then(() => {
      emit('update:modelValue', '')
    })
    .catch(() => {
      console.log('点击了取消按钮')
    })
}
const handleUpload = () => {
  const { loading, data, error, run } = useUpload({ name: 'file' }, { url: api.uploadUrl })
  if (stopWatch) stopWatch()
  run()
  stopWatch = watch(
    () => [loading.value, error.value, data.value],
    ([loading, err, data], oldValue) => {
      if (loading == false) {
        if (err) {
          // toast.warning('修改失败')
        } else {
          if (data) {
            emit('update:modelValue', data.message)
          }
        }
      }
    },
  )
}
</script>

<style lang="scss" scoped>
.showArea {
  position: relative;
  width: fit-content;
  .iconBox {
    position: absolute;
    right: 0;
    top: 0;
    border-bottom-left-radius: 3px;
    padding: 3px 6px;
    height: auto;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 1;
    color: #fff;
    font-size: 12px;
    line-height: 1;
    border-radius: 2px;
  }
}
.uploadArea {
  width: 60px;
  height: 60px;
  .iconBox {
    height: 100%;
    width: 100%;
    border: 2px solid #eee;
    color: #8799a3;
    margin: auto;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    font-size: 27px;
  }
}
</style>
