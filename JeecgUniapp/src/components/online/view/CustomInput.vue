<template>
  <wd-input
      v-bind="$attrs"
      :label-width="labelWidth"
      v-model="currentText"
      :disabled="disabled"
      :label="label"
      :inputMode="inputMode"
      :placeholder="placeholder"
      @input="debouncedInput"
  />
</template>

<script lang="ts" setup>
import { debounce } from 'lodash-es'
const props = defineProps({
  label: {
    type: String,
    default: '',
    required: false,
  },
  labelWidth: {
    type: String,
    default: '80px',
    required: false,
  },
  inputMode: {
    type: String,
    default: 'text',
    required: false,
  },
  placeholder: {
    type: String,
    default: '',
    required: false,
  },
  value: {
    type: [String, Number],
    required: false,
  },
  disabled: {
    type: Boolean,
    default: false,
    required: false,
  }
})

// 定义 emits
const emit = defineEmits(['input', 'update:value'])
// 定义响应式数据;
const currentText = ref(null)

// 监听 value 的变化
watch(
    () => props.value,
    (val) => {
      currentText.value  = val;
    },
    {
      immediate:true
    }
)

// 更新 value 的方法
const updateValue = () => {
  emit('update:value', currentText.value)
}

// 创建防抖函数
const debouncedInput = debounce(updateValue, 1000)

// 记得在组件卸载时取消防抖
onBeforeUnmount(() => {
  debouncedInput.cancel()
})
</script>

<style></style>
