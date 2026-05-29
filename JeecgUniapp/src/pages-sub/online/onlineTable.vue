<route lang="json5" type="page">
{
  layout: 'default',
  style: {
    navigationBarTitleText: '',
    navigationStyle: 'custom',
    disableScroll: true, // 微信禁止页面滚动
    'app-plus': {
      bounce: 'none', // 禁用 iOS 弹性效果
    },
  },
}
</route>

<template>
  <PageLayout backRouteName="onlineCard" :navTitle="navTitle">
    <wd-table :index="tableIndex" :data="dataList" @row-click="handleRow">
      <template v-for="(item, index) in columns" :key="item.prop">
        <wd-table-col
          :prop="item.prop"
          :label="item.label"
          :width="item.width"
          :fixed="item.fixed"
          :align="item.align"
          :sortable="item.sortable"
        >
          <template #value="{ row, index }">
            <onlineTableCell
              :columnsInfo="columnsInfo"
              :record="row"
              :column="item"
              @longpress.prevent="handleLongPress(row)"
            ></onlineTableCell>
          </template>
        </wd-table-col>
      </template>
    </wd-table>
    <wd-status-tip v-if="dataList.length == 0" image="content" tip="暂无内容" />
    <wd-pagination
      v-model="pageNo"
      :total="pageTotal"
      :page-size="pageSize"
      @change="handlePaginChange"
      show-icon
    ></wd-pagination>
    <view class="add u-iconfont u-icon-add" @click="handleGo"></view>
  </PageLayout>
  <BottomOperate
    v-if="bottomOperatePopup.show"
    v-bind="bottomOperatePopup"
    @close="() => (bottomOperatePopup.show = false)"
    @change="handleChange"
  ></BottomOperate>
</template>

<script lang="ts" setup>
import { http } from '@/utils/http'
import { useToast, useMessage, useNotify, dayjs } from 'wot-design-uni'
import { useRouter } from '@/plugin/uni-mini-router'
import { useUserStore } from '@/store/user'
import { useParamsStore } from '@/store/page-params'
import onlineTableCell from './components/onlineTableCell.vue'
import {ref} from "vue";
defineOptions({
  name: 'onlineTable',
  options: {
    styleIsolation: 'shared',
  },
})
const toast = useToast()
const router = useRouter()
const userStore = useUserStore()
const paramsStore = useParamsStore()
const globalData = getApp().globalData
const { systemInfo } = globalData
const { safeArea } = systemInfo

const columns = ref([])
const columnsInfo = ref({})
const tableIndex = ref(false)
const pageNo = ref(1)
const pageSize = ref(10)
const pageTotal = ref(1)
const navTitle = ref('online在线表单')
let pageParams: any = {}
let rowIndex: any = ref(0)
// 底部操作
const bottomOperatePopup = reactive({
  show: false,
  title: '操作',
  data: {},
  options: [
    { key: 'edit', icon: 'edit', label: '编辑' },
    { key: 'detail', icon: 'view', label: '查看' },
    { key: 'delete', icon: 'delete', label: '删除', color: 'red' },
  ],
})
const queryParams = () => {
  return {
    pageNo: pageNo.value,
    pageSize: pageSize.value,
    order: 'asc',
    column: 'id',
    hasQuery: true,
  }
}
const dataList = ref([])
const getColumns = () => {
  return new Promise<void>((resove, reject) => {
    const analysis = (data) => {
      const len = data.length
      const maxShowColumn = 3
      let space = 1
      if (len == 1) {
        space = 2
      }
      const width = safeArea.width / (len >= maxShowColumn ? maxShowColumn : len) - space
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
            setTimeout(() => {
              analysis(res.result.columns)
            }, 0);
          }
        } else {
          toast.warning(res.message)
        }
      })
      .catch((res) => {
        toast.error('加载列头失败~')
      })
  })
}
const getData = () => {
  http
    .get(`/online/cgform/api/getData/${pageParams.id}`, { ...queryParams() })
    .then((res: any) => {
      if (res.success) {
        dataList.value = res.result?.records ?? []
        pageTotal.value = res.result.total
      } else {
        toast.warning(res.message)
      }
    })
    .catch((res) => {
      toast.error('加载表格数据失败~')
    })
}
const handlePaginChange = ({ value }) => {
  pageNo.value = value
  getData()
}
//go 新增页
const handleGo = () => {
  router.push({
    name: 'onlineAdd',
    params: { desformCode: pageParams.tableName, desformName: pageParams.tableTxt },
  })
}
//go 编辑页
const handleEdit = (record) => {
  router.push({
    name: 'onlineEdit',
    params: {
      desformCode: pageParams.tableName,
      desformName: pageParams.tableTxt,
      dataId: record.id,
      backRouteName: 'onlineTable',
    },
  })
}
//go 编辑页
const handleView = (record) => {
  router.push({
    name: 'onlineDetail',
    params: { desformCode: pageParams.tableName, desformName: pageParams.tableTxt, id: record.id },
  })
}
//长按操作
const handleLongPress = (item) => {
  bottomOperatePopup.show = true
  bottomOperatePopup.data = item
}
//操作切换
const handleChange = ({ option, data }) => {
  if (option.key === 'edit') {
    handleEdit(data)
  } else if (option.key === 'delete') {
    uni.showModal({
      title: '提示',
      content: '确定要删除吗？',
      cancelText: '取消',
      confirmText: '确定',
      success: (res) => {
        if (res.confirm) {
          http.delete(`/online/cgform/api/form/${pageParams.id}/${data.id}`).then((res) => {
            toast.success('删除成功~')
            getData()
          })
        }
      },
      fail: (err) => {
        console.log(err)
      },
    })
  } else if (option.key === 'detail') {
    handleView(data)
  }
}
const handleRow = ({ rowIndex }) => {
  handleEdit(dataList.value[rowIndex])
}
const init = () => {
  pageParams = paramsStore.getPageParams('onlineTable')?.data ?? {}
  console.log('pageParams:', pageParams)
  getColumns()
  getData()
}
init()

onMounted(() => {
  //标题
  navTitle.value = pageParams?.tableTxt ||  'online在线表单';
  // 监听刷新列表事件
  uni.$on('refreshList', () => {
    getData()
  })
})
</script>

<style lang="scss" scoped>
//
.add {
  height: 70upx;
  width: 70upx;
  text-align: center;
  line-height: 70upx;
  background-color: #fff;
  border-radius: 50%;
  position: fixed;
  bottom: 80upx;
  right: 30upx;
  box-shadow: 0 0 5px 2px rgba(0, 0, 0, 0.1);
  color: #666;
}
:deep(.wd-table__content) {
  .wot-theme-light {
    // width: 100%;
    // height: 100%;
  }
}

:deep(.wd-table) {
  --wot-table-font-size: 14px;
  .wd-table__body {
    --wot-table-color: var(--color-grey);
  }
}
</style>
