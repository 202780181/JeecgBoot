<template>
  <view>
    <template v-if="fileList && fileList.length > 0">
      <view class="cu-list menu-avatar ol-file-list">
        <view
          class="cu-item"
          :class="modalName == 'move-box-' + index ? 'move-cur' : ''"
          v-for="(item, index) in fileList"
          :key="index"
          @touchstart="ListTouchStart"
          @touchmove="ListTouchMove"
          @touchend="ListTouchEnd"
          :data-target="'move-box-' + index"
        >
          <view class="flex align-center">
            <text
              class="mr-4px text-blue"
              style="font-size: 18px"
              :class="fileType(item.name) ? 'cuIcon-text' : 'cuIcon-pic'"
            ></text>
            {{ item.name }}
          </view>
          <view class="move">
            <view @tap="DelFile" class="bg-red" :data-index="index">删除</view>
          </view>
        </view>
      </view>
    </template>
    <view class="cu-bar bg-white">
      <wd-button @tap="ChooseFile" size="small" :disabled="disabled" plain type="primary">
        <text class="cuIcon-upload"></text>
        上传
      </wd-button>
    </view>
    <LFile ref="customFile" @up-success="onSuccess"></LFile>
  </view>
</template>

<script lang="ts" setup>
import { ref, watch, onMounted } from 'vue';
import LFile from '@/components/LFile/LFile.vue';
import { useUserStore } from '@/store';
import { getEnvBaseUrl } from '@/utils';
import { useToast } from 'wot-design-uni';
import { getFileAccessHttpUrl } from '@/common/uitls';
//图片类型
const imgTypeArr = ['png', 'jpg', 'jpeg', 'bmp']
const userStore = useUserStore()
const props = defineProps({
  title: {
    type: String,
    default: '',
    required: false,
  },
  value: {
    type: String,
    required: false,
  },
  disabled: {
    type: Boolean,
    default: false,
    required: false,
  },
  name: {
    type: String,
    default: '',
    required: false,
  },
  maxNum: {
    type: Number,
    default: null,
  },
})
// 事件
const emits = defineEmits(['change', 'input', 'update:value'])
// 提示
const toast = useToast()
// 组件
const customFile = ref(null)
// 文件数据
const fileList = ref([])
// token
const token = ref(userStore.userInfo.token)
const modalName = ref(null)
const listTouchStart = ref(0)
const listTouchDirection = ref(null)

// ListTouch触摸开始
const ListTouchStart = (e) => {
  listTouchStart.value = e.touches[0].pageX
}

// ListTouch计算方向
const ListTouchMove = (e) => {
  listTouchDirection.value = e.touches[0].pageX - listTouchStart.value > 0 ? 'right' : 'left'
}

// ListTouch计算滚动
const ListTouchEnd = (e) => {
  if (listTouchDirection.value == 'left') {
    modalName.value = e.currentTarget.dataset.target
  } else {
    modalName.value = null
  }
  listTouchDirection.value = null
}
/**
 * 选择文件
 * @constructor
 */
const ChooseFile = () => {
  if (props.maxNum && fileList.value.length >= props.maxNum) {
    toast.warning('最多只能上传' + props.maxNum + '个文件')
    return
  }
  customFile.value.upload({
    // #ifdef APP-PLUS
    currentWebview: getCurrentPages()[getCurrentPages().length - 1].$getAppWebview(),
    // #endif
    header: {
      'X-Access-Token': token.value,
    },
    url: `${getEnvBaseUrl()}/sys/common/upload`,
  })
}

const onSuccess = (res) => {
  console.log('这是上传成功返回数值res:', res)
  let fileObj = res.data
  // #ifdef APP-PLUS
  fileObj = JSON.parse(res.data.id)
  // #endif
  if (fileObj.success) {
    let file = {
      name: res.fileName,
      path: fileObj.message,
      url: getFileAccessHttpUrl(fileObj.message),
    }
    fileList.value.unshift(file)
    changeOnlineFormValue()
  }
}
// 获取文件路径
const pathArr = (arg) => {
  return fileList.value.map((item) => item[arg])
}
// 改变表单值
const changeOnlineFormValue = () => {
  let arr = pathArr('path')
  let str = arr.join(',')
  emits('change', str)
  emits('input', str)
  emits('update:value', str)
}

const DelFile = (e) => {
  uni.showModal({
    title: '提示',
    content: '确定要删除吗？',
    cancelText: '取消',
    confirmText: '确定',
    success: (res) => {
      if (res.confirm) {
        fileList.value.splice(e.currentTarget.dataset.index, 1)
        changeOnlineFormValue()
      }
    },
  })
}

const loadFile = () => {
  if (!props.value || props.value.length == 0) {
    return
  }
  let pathArr = props.value.split(',')
  let fileArray = []
  pathArr.map((path) => {
    let seg = path.lastIndexOf('/')
    if (seg < 0) {
      seg = 0
    }
    fileArray.push({
      name: formatPath(seg == 0 ? path : path.substr(seg + 1)),
      path: path,
      url: getFileAccessHttpUrl(path),
    })
  })
  fileList.value = [...fileArray]
}

const formatPath = (path) => {
  let seg = path.lastIndexOf('.')
  if (seg < 0) {
    seg = 0
  }
  let pathSuffix = path.substr(seg)
  if (path.length > 20) {
    return path.substring(0, 15) + '(..)' + pathSuffix
  } else {
    return path
  }
}

const fileType = (name) => {
  let seg = name.lastIndexOf('.')
  if (seg < 0) {
    seg = 0
  }
  let pathSuffix = name.substr(seg + 1)
  return imgTypeArr.indexOf(pathSuffix) == -1
}

watch(
  () => props.value,
  () => {
    loadFile()
  },
  { immediate: true },
)
</script>

<style scoped>
.ol-file-block {
  display: block;
}
.ol-file-block .action {
  -webkit-justify-content: flex-start;
  justify-content: flex-start;
  height: 54px;
  line-height: 54px;
  color: #333333;
}

.ol-file-list > .cu-item {
  -webkit-justify-content: flex-start;
  justify-content: flex-start;
  height: 45px;
}
</style>
