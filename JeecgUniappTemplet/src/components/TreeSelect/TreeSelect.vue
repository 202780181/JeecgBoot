<template>
  <view class="TreeSelect">
    <view class="pickerArea" :class="{ clear: !!showText }" @click="handleClick">
      <wd-input
        :placeholder="`请选择${$attrs.label}`"
        v-bind="$attrs"
        readonly
        v-model="showText"
      ></wd-input>
      <view v-if="!!showText && !$attrs.disabled" class="u-iconfont u-icon-close" @click.stop="handleClear"></view>
    </view>
    <wd-popup position="bottom" v-model="popupShow">
      <view class="content">
        <view class="operation">
          <view class="cancel text-gray-5" @click.stop="cancel">取消</view>
          <view class="confrim" @click.stop="confirm">确定</view>
        </view>
        <scroll-view class="flex-1" scroll-y>
          <DaTree
            v-if="popupShow"
            :data="treeData"
            labelField="title"
            valueField="key"
            loadMode
            :showCheckbox="multiple"
            :showRadioIcon="false"
            :checkStrictly="true"
            :loadApi="asyncLoadTreeData"
            :defaultCheckedKeys="defaultCheckedKeys"
            @change="handleTreeChange"
          ></DaTree>
        </scroll-view>
      </view>
    </wd-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, watch, useAttrs } from 'vue'
import { useToast, useMessage, useNotify, dayjs } from 'wot-design-uni'
import { http } from '@/utils/http'
import DaTree from '@/uni_modules/da-tree/index.vue'
import { isArray } from '@/utils/is'
defineOptions({
  name: 'TreeSelect',
  options: {
    styleIsolation: 'shared',
  },
})
const props = defineProps({
  modelValue: {
    type: [Array, String],
  },
  dict: {
    type: String,
    default: 'id',
  },
  pidValue: {
    type: String,
    default: '',
  },
  pidField: {
    type: String,
    default: 'pid',
  },
  hasChildField: {
    type: String,
    default: '',
  },
  condition: {
    type: String,
    default: '',
    required: false,
  },
  converIsLeafVal: {
    type: Number,
    default: 1,
  },
  // 是否支持多选
  multiple: {
    type: Boolean,
    default: true,
  },
  hiddenNodeKey: {
    type: String,
    default: '',
  },
  // url: {
  //   type: String,
  //   default: '',
  // },
  // params: {
  //   type: Object,
  //   default: () => ({}),
  // },
})
const emit = defineEmits(['change', 'update:modelValue'])
const toast = useToast()
const api = {
  loadTreeData: '/sys/dict/loadTreeData',
  view: '/sys/dict/loadDictItem/',
}
const showText = ref('')
const popupShow = ref(false)
const treeData = ref<any[]>([])
const treeValue = ref([])
const tableName = ref<any>('')
const text = ref<any>('')
const code = ref<any>('')
const attrs = useAttrs()
const defaultCheckedKeys: any = ref(props.multiple ? [] : '')

const handleClick = () => {
  if (!attrs.disabled) {
    popupShow.value = true
  }
}
const cancel = () => {
  popupShow.value = false
}
const confirm = () => {
  const titles = treeValue.value.map((item) => item.title)
  const keys = treeValue.value.map((item) => item.key).join(',')
  showText.value = titles.join(',')
  popupShow.value = false
  emit('update:modelValue', keys)
  emit('change', keys)
}
const handleTreeChange = (value, record) => {
  const { originItem, checkedStatus } = record
  const { key, title } = originItem
  if (checkedStatus) {
    // 选中
    if (props.multiple) {
      treeValue.value.push({ key, title })
    } else {
      treeValue.value = [{ key, title }]
    }
  } else {
    // 取消
    if (props.multiple) {
      const findIndex = treeValue.value.findIndex((item) => item.key == key)
      if (findIndex != -1) {
        treeValue.value.splice(findIndex, 1)
      }
    } else {
      treeValue.value = []
    }
  }
}
const transformField = (result) => {
  for (let i of result) {
    i.value = i.key
    if (i.leaf == false) {
      i.isLeaf = false
    } else if (i.leaf == true) {
      i.isLeaf = true
    }
  }
}
// 异步加载
const asyncLoadTreeData = ({ originItem }) => {
  return new Promise<void>((resolve) => {
    let param = {
      pid: originItem.key,
      pidField: props.pidField,
      hasChildField: props.hasChildField,
      converIsLeafVal: props.converIsLeafVal,
      condition: props.condition,
      tableName: unref(tableName),
      text: unref(text),
      code: unref(code),
    }
    http
      .get(api.loadTreeData, param)
      .then((res: any) => {
        if (res.success) {
          const { result } = res
          transformField(result)
          resolve(result)
        } else {
          resolve(null)
        }
      })
      .catch((err) => resolve(null))
  })
}
// 加载根节点
function loadRoot() {
  let param = {
    pid: props.pidValue,
    pidField: props.pidField,
    hasChildField: props.hasChildField,
    condition: props.condition,
    converIsLeafVal: props.converIsLeafVal,
    tableName: unref(tableName),
    text: unref(text),
    code: unref(code),
  }
  http
    .get(api.loadTreeData, param)
    .then((res: any) => {
      if (res.success) {
        const { result } = res
        if (result && result.length > 0) {
          transformField(result)
          handleHiddenNode(result)
          treeData.value = result
        }
      } else {
        toast.warning('自定义树组件根节点数据加载失败~')
      }
    })
    .catch((err) => {
      toast.warning('自定义树组件根节点数据加载失败~')
    })
}
// 翻译input内的值
function loadItemByCode() {
  let value = props.modelValue
  if(value){
    if (isArray(props.modelValue)) {
      // @ts-ignore
      value = value.join()
    }
    if (value === treeData.value.map((item) => item.key).join(',')) {
      // 说明是刚选完，内部已有翻译。不需要再请求
      return
    }
    value = (value as string).trim()
    if (value) {
      http
        .get(`${api.view}${props.dict}`, { key: value })
        .then((res: any) => {
          if (res.success) {
            const { result = [] } = res
            showText.value = result.join(',')
            if (props.multiple) {
              defaultCheckedKeys.value = typeof value === 'string' ? value.split(',') : [value]
            } else {
              defaultCheckedKeys.value = value
            }
          } else {
          }
        })
        .catch((err) => {})
    }
  }
}
const initDictInfo = () => {
  let arr = props.dict?.split(',')
  tableName.value = arr[0]
  text.value = arr[1]
  code.value = arr[2]
}
const handleHiddenNode = (data) => {
  if (props.hiddenNodeKey && data?.length) {
    for (let i = 0, len = data.length; i < len; i++) {
      const item = data[i]
      if (item.key == props.hiddenNodeKey) {
        data.splice(i, 1)
        i--
        len--
        return
      }
    }
  }
}
const validateProp = () => {
  let mycondition = props.condition
  return new Promise<void>((resolve, reject) => {
    if (!mycondition) {
      resolve()
    } else {
      try {
        let test = JSON.parse(mycondition)
        if (typeof test == 'object' && test) {
          resolve()
        } else {
          toast.error('组件TreeSelect-condition传值有误，需要一个json字符串!')
          reject()
        }
      } catch (e) {
        toast.error('组件TreeSelect-condition传值有误，需要一个json字符串!')
        reject()
      }
    }
  })
}

// 清空
const handleClear = () => {
  showText.value = ''
  treeValue.value = []
  confirm()
}

watch(
  () => props.modelValue,
  () => loadItemByCode(),
  { deep: true, immediate: true },
)
watch(
  () => props.dict,
  () => {
    initDictInfo()
    loadRoot()
  },
)
watch(
  () => props.hiddenNodeKey,
  () => {
    if (treeData.value?.length && props.hiddenNodeKey) {
      handleHiddenNode(treeData.value)
      treeData.value = [...treeData.value]
    }
  },
)
// 初始化
validateProp().then(() => {
  initDictInfo()
  loadRoot()
  loadItemByCode()
})
</script>

<style lang="scss" scoped>
:deep(.wd-popup-wrapper) {
  .wd-popup {
    border-top-left-radius: 10px;
    border-top-right-radius: 10px;
  }
}
.content {
  height: 50vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  .operation {
    display: flex;
    justify-content: space-between;
    line-height: 40px;
    padding: 0 5px;
    position: relative;
    &::before {
      content: ' ';
      position: absolute;
      bottom: 0;
      left: 8px;
      right: 8px;
      height: 1px;
      background-color: #e5e5e5;
    }
    .cancel,
    .confrim {
      font-size: 15px;
      height: 40px;
      min-width: 40px;
      text-align: center;
    }
    .confrim {
      color: var(--wot-color-theme);
    }
  }
  :deep(.da-tree) {
    .da-tree-item__checkbox {
      // display: none;
    }
  }
}
.pickerArea {
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
