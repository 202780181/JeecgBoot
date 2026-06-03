<template>
  <view class="PopupDict">
    <view class="inputArea" :class="{ clear: !!showText }" @click.stop="handleClick">
      <wd-select-picker
        v-model="showText"
        :columns="options"
        readonly
        :type="multi ? 'checkbox' : 'radio'"
        @click="handleClick"
        v-bind="$attrs"
      ></wd-select-picker>
      <view v-if="!!showText && !disabled" class="u-iconfont u-icon-close" @click.stop="handleClear"></view>
    </view>
    <popupReportModal
      v-if="reportModal.show"
      :code="code"
      :showFiled="labelFiled"
      :multi="multi"
      @close="handleClose"
      @change="handleChange"
    ></popupReportModal>
  </view>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue'
import { useToast, useMessage, useNotify, dayjs } from 'wot-design-uni'
import { http } from '@/utils/http'
import popupReportModal from '@/components/Popup/components/popupReportModal.vue'
defineOptions({
  name: 'PopupDict',
  options: {
    styleIsolation: 'shared',
  },
})
const props = defineProps({
  dictCode: {
    type: String,
    required: true,
    default: '',
  },
  modelValue: {
    type: String,
    default: '',
  },
  multi: {
    type: Boolean,
    default: false,
  },
  spliter: {
    type: String,
    default: ',',
  },
  disabled: {
    type: Boolean,
    default: false,
    required: false,
  },
})
const emit = defineEmits(['change', 'update:modelValue'])

const toast = useToast()
const showText = ref<any>(props.multi ? [] : '')
const options = ref<any>([])
const cgRpConfigId = ref('')
const code = ref(props.dictCode.split(',')[0])
const labelFiled = ref(props.dictCode.split(',')[1])
const valueFiled = ref(props.dictCode.split(',')[2])
const reportModal = reactive({
  show: false,
})
//定义请求url信息
const configUrl = reactive({
  getColumns: '/online/cgreport/api/getRpColumns/',
  getData: '/online/cgreport/api/getData/',
})

if (!code.value || !valueFiled.value || !labelFiled.value) {
  toast.error('popupDict参数未正确配置!')
}

/**
 * 监听value数值
 */
watch(
  () => props.modelValue,
  (val) => {
    const callBack = () => {
      if (props.multi) {
        showText.value = val && val.length > 0 ? val.split(props.spliter) : []
      } else {
        showText.value = val ?? ''
      }
    }
    if (props.modelValue) {
      if (cgRpConfigId.value) {
        loadData({ callBack })
      } else {
        loadColumnsInfo({ callBack })
      }
    } else {
      callBack()
    }
  },
  { immediate: true },
)
watch(
  () => showText.value,
  (val) => {
    let result
    if (props.multi) {
      result = val.join(',')
    } else {
      result = val
    }
    nextTick(() => {
      emit('change', result)
      emit('update:modelValue', result)
    })
  },
)

/**
 * 加载列信息
 */
function loadColumnsInfo({ callBack }) {
  let url = `${configUrl.getColumns}${code.value}`
  http
    .get(url)
    .then((res: any) => {
      if (res.success) {
        cgRpConfigId.value = res.result.cgRpConfigId
        loadData({ callBack })
      }
    })
    .catch((err) => {
      callBack?.()
    })
}
function loadData({ callBack }) {
  let url = `${configUrl.getData}${unref(cgRpConfigId)}`
  http
    .get(url, { ['force_' + valueFiled.value]: props.modelValue })
    .then((res: any) => {
      let data = res.result
      if (data.records?.length) {
        options.value = data.records.map((item) => {
          return { value: item[valueFiled.value], label: item[labelFiled.value] }
        })
      }
    })
    .finally(() => {
      callBack?.()
    })
}
/**
 * 传值回调
 */
function callBack(rows) {
  const dataOptions: any = []
  const dataValue: any = []
  let result
  rows.forEach((item) => {
    dataOptions.push({ value: item[valueFiled.value], label: item[labelFiled.value] })
    dataValue.push(item[valueFiled.value])
  })
  options.value = dataOptions
  if (props.multi) {
    showText.value = dataValue
    result = dataValue.join(props.spliter)
  } else {
    showText.value = dataValue[0]
    result = dataValue[0]
  }
  nextTick(() => {
    emit('change', result)
    emit('update:modelValue', result)
  })
}

// 清空
const handleClear = () => {
  if (!props.disabled) {
    showText.value = ''
    handleChange([])
  }
}

const handleClick = () => {
  if (!props.disabled) {
    reportModal.show = true
  }
}
const handleClose = () => {
  reportModal.show = false
}
const handleChange = (data) => {
  console.log('选中的值：', data)
  callBack(data)
}
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
