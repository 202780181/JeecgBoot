import { CustomRequestOptions } from '@/interceptors/request'
import { useUserStore } from '@/store/user'
import signMd5Utils from '@/utils/signMd5Utils'
import { isH5 } from '@/utils/platform'
import {getEnvBaseUrl} from "@/utils/index";
import {buildURL,buildFullPath} from "@/utils/helpers/buildURL";

export const http = <T>(options: CustomRequestOptions) => {
  // 1. 返回 Promise 对象
  return new Promise<IResData<T>>((resolve, reject) => {
    const userStore = useUserStore()
    //update-begin-author:liusq date:20240422 for: post请求接口加签参数设置
    let params = options.query
    if (options.data && Object.keys(options.data).length > 0) {
      params = Object.assign({}, options?.query, options?.data)
    }
    let sign = signMd5Utils.getSign(options.url, params)
    let vSign = signMd5Utils.getVSign(options.data, sign)
    if ( JSON.parse(import.meta.env.VITE_APP_PROXY) && isH5 && import.meta.env.MODE === 'development') {
      // 开启了代理须加前缀。仅支持 H5 端
      options.url = import.meta.env.VITE_APP_PROXY_PREFIX + options.url
    }
    uni.request({
      dataType: 'json',
      // #ifndef MP-WEIXIN
      responseType: 'json',
      // #endif
      header: {
        'X-Access-Token': userStore.userInfo.token,
        'X-Tenant-Id': userStore.userInfo.tenantId,
        'X-Sign': sign,
        'V-Sign': vSign,
        'X-TIMESTAMP': signMd5Utils.getTimestamp(),
      },
      ...options,
      // 响应成功
      success(res) {
        // 状态码 2xx，参考 axios 的设计
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // 2.1 提取核心数据 res.data
          resolve(res.data as IResData<T>)
        } else {
          switch (res.statusCode) {
            case 401:
              // 401错误  -> 清理用户信息，跳转到登录页
              userStore.clearUserInfo()
              uni.navigateTo({ url: '/pages/login/login' })
              break
            // case 500:
            //   break
            default:
              // 其他错误 -> 根据后端错误信息轻提示
              !options.hideErrorToast &&
                uni.showToast({
                  icon: 'none',
                  title: (res.data as IResData<T>).msg || '请求错误',
                })
          }
          // 使用z-paging，在底层的网络请求抛出异常时uni.$emit('z-paging-error-emit')，业务中可不写
          uni.$emit('z-paging-error-emit')
          reject(res)
        }
      },
      // 响应失败
      fail(err) {
        uni.showToast({
          icon: 'none',
          title: '网络错误，换个网络试试',
        })
        reject(err)
      },
    })
  })
}

/**
 * GET 请求
 * @param url 后台地址
 * @param query 请求query参数
 * @returns
 */
export const httpGet = <T>(url: string, query?: Record<string, any>, header?: any) => {
  return http<T>({
    url,
    query,
    method: 'GET',
  })
}

/**
 * POST 请求
 * @param url 后台地址
 * @param data 请求body参数
 * @param query 请求query参数，post请求也支持query，很多微信接口都需要
 * @returns
 */
export const httpPost = <T>(
  url: string,
  data?: Record<string, any>,
  query?: Record<string, any>,
) => {
  return http<T>({
    url,
    query,
    data,
    method: 'POST',
  })
}
/**
 * PUT 请求
 * @param url 后台地址
 * @param data 请求body参数
 * @param query 请求query参数，post请求也支持query，很多微信接口都需要
 * @returns
 */
export const httpPUT = <T>(
  url: string,
  data?: Record<string, any>,
) => {
  return http<T>({
    url,
    data,
    method: 'PUT',
  })
}
/**
 * DELETE 请求
 * @param url 后台地址
 * @param query 请求query参数
 * @returns
 */
export const httpDelete = <T>(url: string, data?: Record<string, any>, header?: any) => {
  return http<T>({
    url,
    data,
    method: 'DELETE',
  })
}

const requestComFun = (response) => {
  return response
}

const requestComFail = (response) => {
  return response
}
/**
 * 上传 请求
 * @param url 后台地址
 * @param query 请求query参数
 * @returns
 */
export const httpUpload = <T>(url: string, {
  // #ifdef APP-PLUS || H5
  files,
  // #endif
  filePath,
  name,
  // #ifdef H5
  file,
  // #endif
  header = {},
  formData = {},
  custom = {},
  params = {},
  getTask
}: any) => {
  return new Promise((resolve, reject) => {
    let next = true;
    const userStore = useUserStore();
    const globalHeader = {
      'X-Access-Token': userStore.userInfo.token,
      'X-Tenant-Id': userStore.userInfo.tenantId,
      'X-TIMESTAMP': signMd5Utils.getTimestamp(),
    }
    const pubConfig = {
      baseUrl: getEnvBaseUrl(),
      url,
      filePath,
      method: 'UPLOAD',
      name,
      header: {...globalHeader, ...header},
      formData,
      params,
      custom: { ...custom},
      getTask: getTask
    } as any
    // #ifdef APP-PLUS || H5
    if (files) {
      pubConfig.files = files
    }
    // #endif
    // #ifdef H5
    if (file) {
      pubConfig.file = file
    }
    // #endif
    const requestBeforeFun = (config) => {
      return config
    }
    //校验状态码
    const validateStatus= (statusCode) => {
      return statusCode === 200
    }
    const handleRe = {...pubConfig}
    const _config = {
      url: buildURL(buildFullPath(handleRe.baseUrl, handleRe.url), handleRe.params),
      filePath: handleRe.filePath,
      name: handleRe.name,
      header: handleRe.header,
      formData: handleRe.formData,
      complete: (response) => {
        response.config = handleRe
        try {
          // 对可能字符串不是json 的情况容错
          if (typeof response.data === 'string') {
            response.data = JSON.parse(response.data)
          }
        } catch (e) {
        }
        if (validateStatus(response.statusCode)) {
          // 成功
          response = requestComFun(response)
          resolve(response)
        } else {
          response = requestComFail(response)
          reject(response)
        }
      }
    } as any

    // #ifdef APP-PLUS || H5
    if (handleRe.files) {
      _config.files = handleRe.files
    }
    // #endif

    // #ifdef H5
    if (handleRe.file) {
      _config.file = handleRe.file
    }
    // #endif

    if (!next) return
    const requestTask = uni.uploadFile(_config)
    if (handleRe.getTask) {
      handleRe.getTask(requestTask, handleRe)
    }
  })
}

http.get = httpGet
http.post = httpPost
http.put = httpPUT
http.delete = httpDelete
http.upload = httpUpload
