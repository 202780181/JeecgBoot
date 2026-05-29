<template>
  <view class="SelectUser">
    <template v-if="showType === 'form'">
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
    </template>
    <template v-else>
      <view class="list">
        <template v-for="(item, index) in selectedUser" :key="item.id">
          <view
            v-if="maxShowUser === -1 || index < maxShowUser"
            class="user"
            @click="handleRemove(index)"
          >
            <view v-if="isDelUser" class="u-iconfont u-icon-close"></view>
            <wd-img
              v-if="getAvatar(item.avatar)"
              radius="50%"
              width="40px"
              height="40px"
              :src="getAvatar(item.avatar)"
            ></wd-img>
            <view class="name">{{ item.realname }}</view>
          </view>
        </template>
        <view v-if="isAddUser" class="u-iconfont u-icon-newAdd" @click="handleClick"></view>
      </view>
    </template>
    <SelectUserModal
      v-if="modalShow"
      :selected="modelValue"
      :defaultSelectedValue="defaultValue"
      :selectedUser="selectedUser"
      :modalTitle="modalTitle"
      :maxSelectCount="maxSelectCount"
      :multi="!isRadioSelection"
      :rowKey="rowKey"
      :readonlyUser="readonlyUser"
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
  name: 'SelectUser',
  options: {
    styleIsolation: 'shared',
  },
})
const props = defineProps({
  modelValue: {
    type: [Array, String],
    default: '',
  },
  defaultValue: {
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
  isRadioSelection: {
    type: Boolean,
    default: false,
  },
  modalTitle: {
    type: String,
    default: '选择用户',
  },
  maxSelectCount: {
    type: Number,
  },
  showType: {
    type: String,
    default: 'form', // form、card
  },
  // showType为card时有效
  isDelUser: {
    type: Boolean,
    default: true,
  },
  // showType为card时有效
  isAddUser: {
    type: Boolean,
    default: true,
  },
  // showType为card时有效
  maxShowUser: {
    type: Number,
    default: -1,
  },
  // 只读用户（添加的用户不可取消）
  readonlyUser: {
    type: Array,
    default: [],
  },
  disabled: {
    type: Boolean,
    required: false,
    default: false,
  },
})
const emit = defineEmits(['update:modelValue', 'change', 'getSelectdAllData'])
const api = {
  list: '/sys/user/list',
}
const showText = ref('')
const modalShow = ref(false)
const selectedUser = ref([])
const getAvatar = (url) => {
  let result = getFileAccessHttpUrl(url)
  if (result.length) {
    return result
  } else {
    return defaultAvatar
  }
}
const handleRemove = (index?) => {
  if (props.isDelUser) {
    if (isNumber(index)) {
      selectedUser.value.splice(index, 1)
    } else {
      selectedUser.value.pop()
    }
    handleChange(selectedUser.value)
  }
}
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
  emit('getSelectdAllData', data)
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
.list {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  color: #666;
  .user {
    padding: 7px;
    text-align: center;
    position: relative;
    .u-iconfont {
      font-size: 14px;
      position: absolute;
      right: 4px;
      top: 7px;
      z-index: 1;
      /* background: white; */
      width: 14px;
      height: 14px;
      border-radius: 50%;
      line-height: 1;
    }
    .name {
      font-size: 12px;
    }
  }
  .u-iconfont {
    font-size: 22px;
  }
  .u-icon-newAdd {
    margin-left: 8px;
  }
  .u-icon-remove {
    color: var(--color-red);
  }
}
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
