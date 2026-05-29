import {useToast} from "wot-design-uni";
import {useRouter} from "@/plugin/uni-mini-router";
import {useParamsStore} from "@/store/page-params";
import {ref} from "vue";
import {http} from "@/utils/http";


export default function usePageList<T = string>(list,params={}) {
  const toast = useToast()
  const router = useRouter()
  const paramsStore = useParamsStore()
  const paging = ref(null)
  const pageNo = ref(1)
  const pageSize = ref(10)
  const pageTotal = ref(1)
  const dataList = ref([])
  const queryParams = () => {
    return {
      pageNo: pageNo.value,
      pageSize: pageSize.value,
      order: 'desc',
      column: 'createTime',
      hasQuery: true,
    }
  }

  const queryList = (_pageNo, _pageSize) => {
    pageNo.value = _pageNo
    pageSize.value = _pageSize
    let allParams = { ...queryParams(),...params };
    http
      .get(list, allParams)
      .then((res: any) => {
        if (res.success) {
          paging.value.complete(res.result?.records ?? [])
        } else {
          toast.warning(res.message)
        }
      })
      .catch((res) => {
        toast.error('加载数据失败~')
      })
  }
  return { toast, router, paging,paramsStore, dataList, queryParams, queryList }
}
