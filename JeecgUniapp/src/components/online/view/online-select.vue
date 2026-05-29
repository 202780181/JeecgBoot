<template>
  <!-- 带搜索  -->
  <!-- #ifndef MP-WEIXIN -->
  <wd-select-picker
    :label-width="labelWidth"
    :label="label"
    type="radio"
    filterable
    v-model="selected"
    :columns="options"
    :disabled="disabled"
    :show-confirm="false"
    placeholder="请选择"
    @change="handleChange"
  ></wd-select-picker>
  <!-- #endif -->

  <!-- #ifdef MP-WEIXIN -->
  <!-- 常规下拉  -->
  <wd-picker
    :label-width="labelWidth"
    :label="label"
    filterable
    v-model="selected"
    :columns="options"
    :disabled="disabled"
    placeholder="请选择"
    @confirm="handleChange"
  ></wd-picker>
  <!-- #endif -->
</template>

<script lang="ts" setup>
import { ref, watch, onMounted } from 'vue'
import { isArray, isString } from 'lodash'
import { http } from '@/utils/http'
import { isNullOrUnDef } from '@/utils/is'

// 定义 props
const props = defineProps({
  dict: {
    type: [Array, String],
    default: () => [],
    required: true,
  },
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
  name: {
    type: String,
    default: '',
    required: false,
  },
  dictStr: {
    type: String,
    default: '',
    required: false,
  },
  type: {
    type: String,
    default: '',
    required: false,
  },
  modelValue: {
    type: [String, Number],
    required: false,
  },
  disabled: {
    type: Boolean,
    default: false,
    required: false,
  },
})

// 定义 emits
const emit = defineEmits(['input', 'change', 'update:modelValue'])

// 定义响应式数据
const selected = ref<any>('')
const options = ref<any>([])

// 初始化选项
const initSelections = async () => {
  options.value = []
  if (props.type === 'sel_search' && props.dictStr) {
    let temp = props.dictStr
    if (temp.indexOf(' ') > 0) {
      temp = encodeURI(props.dictStr)
    }
    try {
      const res: any = await http.get('/sys/dict/getDictItems/' + temp)
      if (res.success) {
        options.value = (res.result ?? []).filter((item) => item !== null)
      }
    } catch (error) {
      console.error('请求数据出错:', error)
    }
  } else {
    if (!props.dict || props.dict.length === 0) {
      return
    }
    if (isString(props.dict)) {
      try {
        let code = props.dict;
        if (code.indexOf(',') > 0 &&  code.indexOf(' ') > 0) {
          // 编码后类似sys_user%20where%20username%20like%20xxx' 是不包含空格的,这里判断如果有空格和逗号说明需要编码处理
          code = encodeURI(code);
        }
        const res: any = await http.get('/sys/dict/getDictItems/' + code)
        if (res.success) {
          options.value = res.result
        }
      } catch (error) {
        console.error('请求数据出错:', error)
      }
    } else {
      props.dict.forEach((item) => {
        options.value.push(item)
      })
    }
  }
}

// 选择器改变事件处理函数
const handleChange = ({value}) => {
  emit('update:modelValue', value)
  emit('change', value)
}

// 监听 dict 和 value 的变化
watch(
  () => props.dict,
  () => {
    initSelections()
  },
)
// 监听 value 的变化
watch(
  () => props.modelValue,
  (val) => {
    selected.value = isNullOrUnDef(props.modelValue) ? '' : val
  },
  { immediate: true },
)

// 组件挂载时初始化选项
onMounted(() => {
  initSelections()
})
</script>

<style lang="scss" scoped>
:deep(.wd-checkbox__shape) {
  border-radius: 0 !important;
}
</style>
