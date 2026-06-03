<template>
  <view class="SelectUser">
    <view class="inputArea" :class="{ clear: !!showText }" @click.stop="handleClick">
      <wd-input
        :placeholder="getPlaceholder($attrs)"
        v-bind="$attrs"
        readonly
        v-model="showText"
      ></wd-input>
      <view
        v-if="!!showText && !disabled"
        class="u-iconfont u-icon-close"
        @click.stop="handleClear"
      ></view>
    </view>
    <SelectUserModal
      v-if="modalShow"
      :selected="modelValue"
      :selectedUser="selectedUser"
      :modalTitle="modalTitle"
      :rowKey="rowKey"
      @change="handleChange"
      @close="() => (modalShow = false)"
    ></SelectUserModal>
  </view>
</template>

<script setup lang="ts">
import { ref, watch, useAttrs } from 'vue'
import { useToast, useMessage, useNotify, dayjs } from 'wot-design-uni'
import { http } from '@/utils/http'
import DaTree from '@/uni_modules/da-tree/index.vue'
import { isArray, isString, isNumber } from '@/utils/is'
import SelectUserModal from './components/SelectUserModal.vue'
import { getPlaceholder, getFileAccessHttpUrl } from '@/common/uitls'
import defaultAvatar from '@/static/default-avatar.png'

defineOptions({
  name: 'SelectUserByDepart',
  options: {
    styleIsolation: 'shared',
  },
})
const props = defineProps({
  modelValue: {
    type: [Array, String],
    default: '',
  },
  labelKey: {
    type: String,
    default: 'realname',
  },
  rowKey: {
    type: String,
    default: 'username',
  },
  modalTitle: {
    type: String,
    default: '选择用户',
  },
  disabled: {
    type: Boolean,
    required: false,
    default: false,
  },
})
const emit = defineEmits(['update:modelValue', 'change'])
const api = {
  list: '/sys/user/list',
}
const showText = ref('')
const modalShow = ref(false)
const selectedUser = ref([])
// 翻译
const transform = () => {
  let value = props.modelValue
  let len
  if (isArray(value) || isString(value)) {
    if (isArray(value)) {
      len = value.length
      value = value.join(',')
    } else {
      len = value.split(',').length
    }
    value = value.trim()
    if (value) {
      // 如果value的值在selectedUser中存在，则不请求翻译
      let isNotRequestTransform = false
      isNotRequestTransform = value
        .split(',')
        .every((value) => !!selectedUser.value.find((item) => item[props.rowKey] === value))
      if (isNotRequestTransform) {
        return
      }
      const params = { isMultiTranslate: true, pageSize: len, [props.rowKey]: value }
      http.get(api.list, params).then((res: any) => {
        if (res.success) {
          const records = res.result?.records ?? []
          showText.value = records.map((item) => item[props.labelKey]).join(',')
          selectedUser.value = records
        } else {
          console.log('翻译失败~')
        }
      })
    }
  } else {
    showText.value = ''
  }
}
// 打开popup
const handleClick = () => {
  console.log('handleClick', !props.disabled)
  console.log('handleClick', props)
  if (!props.disabled) {
    modalShow.value = true
  }
}

// 清空
const handleClear = () => {
  showText.value = ''
  handleChange([])
}

const handleChange = (data) => {
  const rowkey = data.map((item) => item[props.rowKey]).join(',')
  const labelKey = data.map((item) => item[props.labelKey]).join(',')
  showText.value = labelKey
  selectedUser.value = data
  emit('update:modelValue', rowkey)
  emit('change', rowkey)
}

watch(
  () => props.modelValue,
  () => {
    transform()
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped>
.inputArea {
  position: relative;
  .u-icon-close {
    position: absolute;
    right: 15px;
    top: calc(14px + 4px);
    color: #585858;
    font-size: 15px;
  }
  &.clear {
    :deep(.wd-input__body) {
      padding-right: 20px;
    }
  }
}
</style>
