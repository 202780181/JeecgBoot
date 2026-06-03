<template>
  <view class="CategorySelect">
    <view class="pickerArea" :class="{ clear: !!showText }" @click.stop="handleClick">
      <wd-input
        :placeholder="getPlaceholder($attrs)"
        v-bind="$attrs"
        v-model="showText"
        clearable
        readonly
      ></wd-input>
      <view v-if="!!showText  && !disabled" class="u-iconfont u-icon-close" @click.stop="handleClear"></view>
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
            :labelField="labelKey"
            :valueField="rowKey"
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
import { getPlaceholder } from '@/common/uitls'
defineOptions({
  name: 'SelectDept',
})
const props = defineProps({
  modelValue: {
    type: [Array, String],
  },
  // 是否支持多选
  multiple: {
    type: Boolean,
    default: true,
  },
  rowKey: {
    type: String,
    default: 'key',
  },
  labelKey: {
    type: String,
    default: 'title',
  },
  disabled: {
    type: Boolean,
    required: false,
    default: false,
  },
})
const emit = defineEmits(['change', 'update:modelValue'])
const toast = useToast()
const api = {
  loadDictItem: '/sys/category/loadDictItem/',
  queryDepartTreeSync: '/sys/sysDepart/queryDepartTreeSync',
}
const showText = ref('')
const popupShow = ref(false)
const treeData = ref<any[]>([])
const treeValue = ref([])
const defaultCheckedKeys: any = ref(props.multiple ? [] : '')
const handleClick = () => {
  if (!props.disabled) {
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
  if (checkedStatus) {
    // 选中
    if (props.multiple) {
      treeValue.value.push({ key: originItem[props.rowKey], title: originItem[props.labelKey] })
    } else {
      treeValue.value = [{ key: originItem[props.rowKey], title: originItem[props.labelKey] }]
    }
  } else {
    // 取消
    if (props.multiple) {
      const findIndex = treeValue.value.findIndex(
        (item) => item[props.rowKey] == originItem[props.rowKey],
      )
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
    if (i.isLeaf == false) {
      i.leaf = false
    } else if (i.isLeaf == true) {
      i.leaf = true
    }
  }
}
// 异步加载
const asyncLoadTreeData = ({ originItem }) => {
  return new Promise<void>((resolve) => {
    let param = {
      pid: originItem.key,
      primaryKey: props.rowKey,
    }
    http
      .get(api.queryDepartTreeSync, param)
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
    primaryKey: props.rowKey,
  }
  http
    .get(api.queryDepartTreeSync, param)
    .then((res: any) => {
      if (res.success) {
        const { result } = res
        if (result && result.length > 0) {
          transformField(result)
          treeData.value = result
        }
      } else {
        console.error('部门组件加载根节点数据失败~')
      }
    })
    .catch((err) => {
      console.error('部门组件加载根节点数据失败~')
    })
}
// 翻译input内的值
function loadItemByCode() {
  let value = props.modelValue
  if(value){
    console.log('部门组件翻译props.modelValue', props.modelValue)
    if (isArray(props.modelValue)) {
      // @ts-ignore
      value = value.join(',')
    }
    if (value === treeData.value.map((item) => item.key).join(',')) {
      // 说明是刚选完，内部已有翻译。不需要再请求
      return
    }
    value = (value as string).trim()
    if (value) {
      http
          .get(api.queryDepartTreeSync, { ids: value })
          .then((res: any) => {
            if (res.success) {
              const { result = [] } = res
              showText.value = result.map((item) => item[props.labelKey]).join(',')
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
loadRoot()
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
