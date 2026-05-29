import { ref, computed } from 'vue'
import { http } from '@/utils/http'
import { useToast, useMessage, useNotify, dayjs } from 'wot-design-uni'
import { useRouter } from '@/plugin/uni-mini-router'
import { useUserStore } from '@/store/user'
import { useParamsStore } from '@/store/page-params'

export function useOnline() {
  const toast = useToast()
  const router = useRouter()
  const userStore = useUserStore()
  const globalData = getApp().globalData
  const { systemInfo } = globalData
  const { safeArea } = systemInfo
  const paramsStore = useParamsStore()
  const columns = ref([])
  const columnsInfo = ref({})
  const pageNo = ref(1)
  const pageSize = ref(10)
  const pageTotal = ref(1)
  let pageParams = paramsStore.getPageParams('onlineCard')?.data ?? {}
  const dataList = ref([])

  const queryParams = () => {
    return {
      pageNo: pageNo.value,
      pageSize: pageSize.value,
      order: 'asc',
      column: 'id',
      hasQuery: true,
    }
  }
  // 获取列字段
  const getColumns = () => {
    return new Promise<void>((resove, reject) => {
      if (columns.value.length) {
        resove()
        return
      }
      const analysis = (data) => {
        const len = data.length
        const maxShowColumn = 3
        let space = 1
        if (len == 1) {
          space = 2
        }
        const width = safeArea.width / (len > maxShowColumn ? maxShowColumn : len) - space
        columns.value = data.map((item) => {
          return {
            ...item,
            prop: item.dataIndex,
            align: item.align,
            label: item.title,
            width,
          }
        })
      }
      http
        .get(`/online/cgform/api/getColumns/${pageParams.id}`)
        .then((res: any) => {
          if (res.success) {
            if (res.result?.columns?.length) {
              columnsInfo.value = res.result
              analysis(res.result.columns)
              resove()
            }
          } else {
            toast.warning(res.message)
            reject()
          }
        })
        .catch((res) => {
          toast.error('加载列头失败~')
          reject()
        })
    })
  }
  return {
    toast,
    router,
    userStore,
    paramsStore,
    columns,
    columnsInfo,
  }
}
