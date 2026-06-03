<template>
  <view class="CategorySelect">
    <view class="pickerArea" :class="{ clear: !!showText }" @click="handleClick">
      <wd-input
        :placeholder="`请选择${$attrs.label}`"
        v-bind="$attrs"
        readonly
        v-model="showText"
      ></wd-input>
      <view v-if="!!showText && !$attrs.disabled" class="u-iconfont u-icon-close" @click.stop="handleClear"></view>
    </view>
    <wd-popup v-if="popupShow" position="bottom" v-model="popupShow">
      <view class="content">
        <view class="operation">
          <view class="cancel text-gray-5" @click.stop="cancel">取消</view>
          <view class="confrim" @click.stop="confirm">确定</view>
        </view>
        <scroll-view class="flex-1" scroll-y>
          <DaTree
            :data="treeData"
            labelField="title"
            valueField="key"
            loadMode
            :showCheckbox="multiple"
            :showRadioIcon="false"
            :checkStrictly="true"
            :defaultCheckedKeys="defaultCheckedKeys"
            :loadApi="asyncLoadTreeData"
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
  name: 'CategorySelect',
})
const props = defineProps({
  modelValue: {
    type: [Array, String],
  },
  condition: {
    type: String,
    default: '',
    required: false,
  },
  // 是否支持多选
  multiple: {
    type: Boolean,
    default: false,
  },
  pid: {
    type: String,
    default: '',
    required: false,
  },
  pcode: {
    type: String,
    default: '',
    required: false,
  },
})
const emit = defineEmits(['change', 'update:modelValue'])
const toast = useToast()
const api = {
  loadDictItem: '/sys/category/loadDictItem/',
  loadTreeData: '/sys/category/loadTreeData',
}
const showText = ref('')
const popupShow = ref(false)
const treeData = ref<any[]>([])
const treeValue = ref([])
const attrs = useAttrs()
const defaultCheckedKeys: any = ref([])
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
      condition: props.condition,
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
    pid: props.pid,
    pcode: !props.pcode ? '0' : props.pcode,
    condition: props.condition,
  }
  http
    .get(api.loadTreeData, param)
    .then((res: any) => {
      if (res.success) {
        const { result } = res
        if (result && result.length > 0) {
          transformField(result)
          treeData.value = result
        }
      } else {
        toast.warning('分类字典书组件根节点数据加载失败~')
      }
    })
    .catch((err) => {
      toast.warning('分类字典书组件根节点数据加载失败~')
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
          .get(api.loadDictItem, { ids: value })
          .then((res: any) => {
            if (res.success) {
              const { result = [] } = res
              showText.value = result.join(',')
              defaultCheckedKeys.value = value
            } else {
            }
          })
          .catch((err) => {})
    }
  }
}
// 清空
const handleClear = () => {
  showText.value = ''
  treeValue.value = []
  confirm()
}

watch(
  () => props.modelValue,
  () => {
    loadItemByCode()
  },
  { deep: true, immediate: true },
)
watch(
  () => props.pcode,
  () => {
    loadRoot()
  },
  { deep: true, immediate: true },
)
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
