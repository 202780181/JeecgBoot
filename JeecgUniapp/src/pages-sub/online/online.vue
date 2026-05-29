<route lang="json5" type="page">
{
  layout: 'default',
  style: {
    navigationBarTitleText: 'online',
    navigationStyle: 'custom',
    disableScroll: true, // 微信禁止页面滚动
    'app-plus': {
      bounce: 'none', // 禁用 iOS 弹性效果
    },
  },
}
</route>

<template>
  <PageLayout navTitle="online表单开发" backRouteName="index" routeMethod="pushTab">
    <view class="wrap">
      <z-paging
        ref="paging"
        :fixed="false"
        v-model="dataList"
        @query="queryList"
        :default-page-size="20"
      >
        <template #top>
          <wd-search
            hide-cancel
            placeholder="请输入表描述"
            v-model.trim="keyword"
            @search="handleSearch"
            @clear="handleClear"
          />
        </template>
        <template v-for="(item, index) in dataList" :key="item.id">
          <template v-if="item.tableType != 3">
            <wd-swipe-action>
              <view class="list" :data-tableName="item.tableName" @click="handleGo(item)">
                <view
                  class="cIcon"
                  :style="{ 'background-color': getBackgroundColor(item, index) }"
                >
                  <view class="u-iconfont u-icon-table"></view>
                </view>
                <view class="tableTxt ellipsis">{{ item.tableTxt }}</view>
                <view class="createTime ellipsis">{{ item.createTime.substring(0, 10) }}</view>
              </view>
              <template #right>
                <view class="action">
                  <view class="button" @click="handleAction('del', item)">删除</view>
                  <view class="button" @click="handleAction('remove', item)">移除</view>
                </view>
              </template>
            </wd-swipe-action>
          </template>
        </template>
      </z-paging>
    </view>
  </PageLayout>
</template>

<script lang="ts" setup>
import { http } from '@/utils/http'
import { useToast, useMessage, useNotify, dayjs } from 'wot-design-uni'
import { useRouter } from '@/plugin/uni-mini-router'
import { useUserStore } from '@/store/user'
import { useParamsStore } from '@/store/page-params'
import { getRandomColor } from '@/common/uitls'

defineOptions({
  name: 'online',
  options: {
    styleIsolation: 'shared',
  },
})

const toast = useToast()
const router = useRouter()
const userStore = useUserStore()
const paramsStore = useParamsStore()
const paging = ref(null)
const dataList: any = ref([])
const keyword = ref('')
const itemBgColor = []
const message = useMessage()
// 接口拿到的数据处理之后的

const handleGo = (item) => {
  if (item.tableType === 3) {
    toast.warning('附表无列表页~')
  } else {
    paramsStore.setPageParams('onlineCard', { data: item })
    router.push({ name: 'onlineCard' })
  }
}
// 清除搜索条件
function handleClear() {
  keyword.value = ''
  handleSearch()
}
// 搜索
function handleSearch() {
  queryList(1, 10)
}
const handleAction = (val, item) => {
  if (val === 'del') {
    message
      .confirm({
        msg: '同时删除数据库表，不可恢复！',
        title: '提示',
      })
      .then(() => {
        http
          .delete(`/online/cgform/head/delete?id=${item.id}`)
          .then((res: any) => {
            if (res.success) {
              toast.success('删除成功~')
              paging.value.reload()
            } else {
              toast.warning('删除失败~')
            }
          })
          .catch((res) => {
            toast.error('删除失败~')
          })
      })
  } else if (val === 'remove') {
    message
      .confirm({
        msg: '只删除表单配置，数据库表保留！',
        title: '提示',
      })
      .then(() => {
        http
          .delete(`/online/cgform/head/removeRecord?id=${item.id}`)
          .then((res: any) => {
            if (res.success) {
              toast.success('移除成功~')
              paging.value.reload()
            } else {
              toast.warning('移除失败~')
            }
          })
          .catch((res) => {
            toast.error('移除失败~')
          })
      })
  }
}
const getParams = ({ pageNo, pageSize }) => {
  const params: any = {
    pageNo,
    pageSize,
    order: 'desc',
    column: 'createTime',
    copyType: 0,
  }
  if (keyword.value.length) {
    params.tableTxt = `*${keyword.value}*`
  }
  return params
}
const queryList = (pageNo, pageSize) => {
  const params = getParams({ pageNo, pageSize })
  http
    .get('/online/cgform/head/list', { ...params })
    .then((res: any) => {
      if (res.success && res.result?.records) {
        if (pageNo === 1) {
          dataList.value = []
        }
        paging.value.complete(res.result.records)
      } else {
        paging.value.complete(false)
      }
    })
    .catch((res) => {
      paging.value.complete(false)
    })
}
const getType = (record) => {
  const type = { 1: '单表', 2: '主表', 3: '附表' }
  let tbTypeText = type[record.tableType]
  // if (record.isTree === 'Y') {
  //   tbTypeText += '(树)'
  // }
  // if (record.themeTemplate === 'innerTable') {
  //   tbTypeText += '(内嵌)'
  // } else if (record.themeTemplate === 'erp') {
  //   tbTypeText += '(ERP)'
  // } else if (record.themeTemplate === 'tab') {
  //   tbTypeText += '(TAB)'
  // }
  return tbTypeText
}
const getBackgroundColor = (item, index) => {
  return itemBgColor[index % itemBgColor.length]
}
for (let i = 0; i < 50; i++) {
  itemBgColor.push(getRandomColor())
}
</script>

<style lang="scss" scoped>
//
:deep(.wd-search) {
  border-bottom: 1px solid #f4f2f2;
}
:deep(.wd-swipe-action) {
  &:first-child {
    margin-top: 10px;
  }
}
.list {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #fff;
  border-bottom: 1px solid #eee;
  padding: 16px 12px;
  line-height: 20px;
  margin-bottom: 10px;
  .cIcon {
    text-align: center;
    line-height: 24px;
    color: #fff;
    margin-right: 8px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    .u-iconfont {
      font-size: 14px;
    }
  }
  .tableTxt {
    flex: 1;
    margin-right: 40px;
  }
  .createTime {
    text-align: right;
    width: 75px;
    font-size: 12px;
    color: #919191;
  }
}
.action {
  width: 100px;
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
      background-color: #fa4350;
    }
    &:last-child {
      background-color: #f0883a;
    }
  }
}
.wrap {
  height: 100%;
}
</style>
