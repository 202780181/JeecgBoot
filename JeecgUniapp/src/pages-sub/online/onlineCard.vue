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
  <PageLayout backRouteName="online" :navTitle="navTitle">
    <view class="wrap">
      <z-paging
        ref="paging"
        :fixed="false"
        v-model="dataList"
        @query="queryList"
        :default-page-size="15"
      >
        <template v-for="(item, index) in dataList" :key="item.id">
          <wd-swipe-action>
            <view class="list" @click="handleEdit(item)">
              <template v-for="(cItem, cIndex) in columns" :key="cIndex">
                <view v-if="cIndex < 3" class="box" :style="getBoxStyle">
                  <view class="field ellipsis">{{ cItem['title'] }}</view>
                  <view class="value cu-text-grey">
                    <onlineTableCell
                      :columnsInfo="columnsInfo"
                      :record="item"
                      :column="cItem"
                      :key="item.id"
                    ></onlineTableCell>
                  </view>
                </view>
              </template>
            </view>
            <template #right>
              <view class="action">
                <view class="button" @click="handleAction('del', item)">删除</view>
                <view class="button" v-if="item.bpm_status && item.bpm_status == '1'" @click="handleAction('bpm', item)">提交流程</view>
              </view>
            </template>
          </wd-swipe-action>
        </template>
      </z-paging>
      <view class="add u-iconfont u-icon-add" @click="handleAdd"></view>
      <view class="goTable u-iconfont u-icon-table" @click="handleGoTable"></view>
    </view>
  </PageLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { http } from '@/utils/http'
import { useToast, useMessage, useNotify, dayjs } from 'wot-design-uni'
import { useRouter } from '@/plugin/uni-mini-router'
import { useUserStore } from '@/store/user'
import { useParamsStore } from '@/store/page-params'
import onlineTableCell from './components/onlineTableCell.vue'
defineOptions({
  name: 'onlineCard',
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
const paging = ref(null)
const columns = ref([])
const columnsInfo = ref({})
const pageNo = ref(1)
const pageSize = ref(10)
const pageTotal = ref(1)
const navTitle = ref('online在线表单')
let pageParams = paramsStore.getPageParams('onlineCard')?.data ?? {}
const dataList = ref([])
const getBoxStyle = computed(() => {
  let len = columns.value.length
  if (len > 3) len = 3
  return { width: `calc(${100 / len}% - 5px)` }
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
const getData = () => {
  http
    .get(`/online/cgform/api/getData/${pageParams.id}`, { ...queryParams() })
    .then((res: any) => {
      if (res.success) {
        paging.value.complete(res.result?.records ?? [])
      } else {
        toast.warning(res.message)
      }
    })
    .catch((res) => {
      toast.error('加载表格数据失败~')
    })
}
const handleAction = (val, item) => {
  if (val == 'del') {
    http.delete(`/online/cgform/api/form/${pageParams.id}/${item.id}`).then((res) => {
      toast.success('删除成功~')
      paging.value.reload()
    })
  }else if(val == 'bpm'){
    const url = '/act/process/extActProcess/startMutilProcess'
    const param = {
      flowCode: 'onl_'+pageParams.tableName,
      id: item.id,
      formUrl: 'modules/bpm/task/form/OnlineFormDetail',
      formUrlMobile: 'check/onlineForm/detail',
    }
    http.post(url, param).then((res: any) => {
      if (res.success) {
        toast.success('流程已发起~')
        paging.value.reload()
      }else{
        toast.warning(res.message)
      }
    })
  }
}
const queryList = (_pageNo, _pageSize) => {
  pageNo.value = _pageNo
  pageSize.value = _pageSize
  getColumns().then(() => {
    getData()
  })
}
// go 新增页
const handleAdd = () => {
  router.push({
    name: 'onlineAdd',
    params: {
      desformCode: pageParams.tableName,
      desformName: pageParams.tableTxt,
      backRouteName: 'onlineCard',
    },
  })
}
// go table页
const handleGoTable = (params) => {
  paramsStore.setPageParams('onlineTable', { data: pageParams })
  router.push({ name: 'onlineTable' })
}
//go 编辑页
const handleEdit = (record) => {
  router.push({
    name: 'onlineEdit',
    params: {
      desformCode: pageParams.tableName,
      desformName: pageParams.tableTxt,
      dataId: record.id,
      backRouteName: 'onlineCard',
    },
  })
}
onMounted(() => {
  navTitle.value = pageParams?.tableTxt ||  'online在线表单';
  // 监听刷新列表事件
  uni.$on('refreshList', () => {
    getData()
  })
})
</script>

<style lang="scss" scoped>
.wrap {
  height: 100%;
}
:deep(.wd-swipe-action) {
  margin-top: 10px;
  background-color: #fff;
}
.list {
  padding: 10px 10px;
  width: 100%;
  text-align: left;
  display: flex;
  justify-content: space-between;
  .box {
    width: 33%;
    .field {
      margin-bottom: 10px;
      line-height: 20px;
    }
  }
}
.action {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  .button {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    height: 100%;
    color: #fff;
    &:first-child {
      min-width: 60px;
      background-color: #fa4350;
    }
    &:last-child {
       min-width: 100px;
       background-color: #f0883a;
    }
  }
}
.add,
.goTable {
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
.goTable {
  bottom: 180upx;
}
</style>
