<template>
  <wd-upload
    v-model:file-list="fileList"
    accept="image"
    :upload-method="customUpload"
    :disabled="disabled"
    :limit="maxNum"
    :before-remove="delFile"
    :multiple="maxNum && maxNum > 1"
  ></wd-upload>
</template>

<script lang="ts" setup>
import type { UploadMethod } from 'wot-design-uni/components/wd-upload/types'
import { getEnvBaseUploadUrl, getEnvBaseUrl } from '@/utils'
import { useUserStore } from '@/store'
import { getFileAccessHttpUrl } from '@/common/uitls'
import { isString } from '@/utils/is'
import { useToast } from 'wot-design-uni'
const toast = useToast()
const VITE_UPLOAD_BASEURL = `${getEnvBaseUrl()}/sys/common/upload`
// 接收 props
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
  uploadFileType: {
    type: String,
    default: 'image',
    required: false,
  },
})

// 定义 emits
const emit = defineEmits(['change', 'update:value'])
// 定义响应式数据
const fileList = ref([])
/**
 * 自定义上传方法
 * @param file
 * @param formData
 * @param options
 */
const customUpload: UploadMethod = (file, formData, options) => {
  const userStore = useUserStore()
  const uploadTask = uni.uploadFile({
    url: VITE_UPLOAD_BASEURL,
    header: {
      'X-Access-Token': userStore.userInfo.token,
      'X-Tenant-Id': userStore.userInfo.tenantId,
      ...options.header,
    },
    name: options.name,
    fileName: options.name,
    fileType: options.fileType,
    formData,
    filePath: file.url,
    success(res: any) {
      if (res.statusCode === options.statusCode) {
        let data = res.data
        if (data && isString(data)) {
          data = JSON.parse(data)
        }
        // 设置上传成功
        if (data && data.success) {
          const file = {
            id: new Date().getTime(),
            name: options.name,
            path: data.message,
            url: getFileAccessHttpUrl(data.message),
          }
          fileList.value.unshift(file)
          changeOnlineFormValue()
        }
      } else {
        // 设置上传失败
        options.onError({ ...res, errMsg: res.errMsg || '' }, file, formData)
      }
    },
    fail(err) {
      console.info('upload fail', err)
      // 设置上传失败
      options.onError(err, file, formData)
    },
  })
  // 设置当前文件加载的百分比
  uploadTask.onProgressUpdate((res) => {
    options.onProgress(res, file)
  })
}

const changeOnlineFormValue = () => {
  console.log('changeOnlineFormValue fileList.value', fileList)
  const arr = fileList.value.map((item) => item['path'])
  const str = arr.join(',')
  emit('change', str)
  emit('update:value', str)
}

const delFile = ({ file, fileList, resolve }) => {
  uni.showModal({
    title: '提示',
    content: '确定要删除吗？',
    cancelText: '取消',
    confirmText: '确定',
    success: (res) => {
      if (res.confirm) {
        console.log('当前删除文件', file)
        changeOnlineFormValue()
        toast.success('删除成功')
        resolve(true)
      }
    },
    fail: (err) => {
      console.log(err)
      resolve(false)
    },
  })
}
const loadFile = () => {
  if (!props.value || props.value.length === 0) {
    return
  }
  const pathArr = props.value.split(',')
  const fileArray = []
  pathArr.forEach((path) => {
    const seg = path.lastIndexOf('/')
    fileArray.push({
      name: path.substr(seg < 0 ? 0 : seg),
      path: path,
      url: getFileAccessHttpUrl(path),
    })
  })
  console.log('当前图片回显数据', fileArray)
  fileList.value = [...fileArray]
}

// 监听 value 的变化
watch(
  () => props.value,
  () => {
    loadFile()
  },
  { immediate: true },
)

// 组件挂载时加载文件
onMounted(() => {
  loadFile()
})
</script>
