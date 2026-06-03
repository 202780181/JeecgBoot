// TODO: 别忘加更改环境变量的 VITE_UPLOAD_BASEURL 地址。
import { getEnvBaseUploadUrl } from '@/utils'
import { useUserStore } from '@/store/user'

const VITE_UPLOAD_BASEURL = `${getEnvBaseUploadUrl()}`

/**
 * useUpload 是一个定制化的请求钩子，用于处理上传图片。
 * @param formData 额外传递给后台的数据，如{name: '张三'}。
 * @returns 返回一个对象{loading, error, data, run}，包含请求的加载状态、错误信息、响应数据和手动触发请求的函数。
 */
export default function useUpload<T = string>(
  formData: Record<string, any> = {},
  { url, sizeType = ['original', 'compressed'], sourceType = ['album', 'camera'] },
) {
  const loading = ref(false)
  const error = ref(false)
  const data = ref<T>()
  const run = () => {
    // #ifdef MP-WEIXIN
    // 微信小程序从基础库 2.21.0 开始， wx.chooseImage 停止维护，请使用 uni.chooseMedia 代替。
    // 微信小程序在2023年10月17日之后，使用本API需要配置隐私协议
    uni.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType,
      sizeType, //可以指定是原图还是压缩图，默认二者都有
      success: (res) => {
        loading.value = true
        const tempFilePath = res.tempFiles[0].tempFilePath
        const fileName = res.tempFiles[0].name || res.tempFiles[0].tempFilePath.substring(tempFilePath.lastIndexOf('/') + 1)
        formData.fileName = fileName;
        uploadFile<T>({ url, tempFilePath, formData, data, error, loading, fileName })
      },
      fail: (err) => {
        console.error('uni.chooseMedia err->', err)
        error.value = true
      },
    })
    // #endif
    // #ifndef MP-WEIXIN
    uni.chooseImage({
      count: 1,
      sourceType, //从相册选择
      sizeType, //可以指定是原图还是压缩图，默认二者都有
      success: (res) => {
        loading.value = true
        const tempFilePath = res.tempFilePaths[0]
        const fileName = res.tempFiles[0].name || tempFilePath.substring(tempFilePath.lastIndexOf('/') + 1)
        formData.fileName = fileName;
        uploadFile<T>({ url, tempFilePath, formData, data, error, loading })
      },
      fail: (err) => {
        console.error('uni.chooseImage err->', err)
        error.value = true
      },
    })
    // #endif
  }

  return { loading, error, data, run }
}

function uploadFile<T>({ url, tempFilePath, formData, data, error, loading }) {
  const userStore = useUserStore()
  uni.uploadFile({
    url: url ?? VITE_UPLOAD_BASEURL,
    filePath: tempFilePath,
    name: formData.name ?? 'file',
    formData,
    header: {
      'X-Access-Token': userStore.userInfo.token,
      'X-Tenant-Id': userStore.userInfo.tenantId,
    },
    success: (uploadFileRes) => {
      data.value = JSON.parse(uploadFileRes.data)
    },
    fail: (err) => {
      console.error('uni.uploadFile err->', err)
      error.value = true
    },
    complete: () => {
      loading.value = false
    },
  })
}
