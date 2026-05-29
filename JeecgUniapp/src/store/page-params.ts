import { defineStore } from 'pinia'
import { ref } from 'vue'

const initState = {}
// 持久化页面参数，h5刷新参数不见了
export const useParamsStore = defineStore(
  'page-params',
  () => {
    const params = ref({ ...initState })
    const setPageParams = (key, options) => {
      params.value = { ...params.value, ...{ [key]: options } }
    }
    const getPageParams = (key) => {
      return params.value[key]
    }
    const clearPageParams = (key) => {
      delete params.value[key]
    }
    const reset = () => {
      params.value = {}
    }
    return {
      params,
      setPageParams,
      clearPageParams,
      getPageParams,
      reset,
    }
  },
  {
    persist: true,
  },
)
