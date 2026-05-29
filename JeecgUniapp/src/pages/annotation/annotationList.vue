<route lang="json5" type="page">
{
  layout: 'default',
  style: {
    navigationBarTitleText: '我的消息',
    navigationStyle: 'custom',
    disableScroll: true, // 微信禁止页面滚动
    'app-plus': {
      bounce: 'none', // 禁用 iOS 弹性效果
    },
  },
}
</route>

<template>
  <PageLayout
    navTitle="我的消息"
    :backRouteName="backRouteName"
    :routeMethod="routeMethod"
    navRightTextMp="筛选"
    @navRightMp="() => (conditionFilter.show = true)"
  >
    <view class="wrap">
      <z-paging ref="paging" :fixed="false" v-model="dataList" @query="queryList">
        <template v-for="(item, index) in dataList">
          <wd-swipe-action>
            <view class="list bg-white" @click="showDetail(item)">
              <view class="cIcon">
                <view
                  v-if="['email'].includes(item.busType)"
                  class="u-iconfont u-icon-email"
                ></view>
                <view
                  v-else-if="['bpm_task', 'bpm'].includes(item.busType)"
                  class="u-iconfont u-icon-bpm"
                ></view>
                <view
                  v-else-if="['msgCategory'].includes(item.busType)"
                  class="u-iconfont u-icon-message"
                ></view>
                <view v-else class="u-iconfont u-icon-msg"></view>
              </view>
              <view class="content">
                <text class="title ellipsis">{{ item.titile }}</text>
                <text class="desc">{{ getDesc(item) }}</text>
              </view>
              <view class="operate">
                <view class="star-area" @click.stop="changeStarFlag(item)">
                  <view
                    v-if="item.starFlag == '1'"
                    class="u-iconfont u-icon-star-fill"
                    style="color: #f7de2d"
                  ></view>
                  <view v-else class="u-iconfont u-icon-star" style="color: #777"></view>
                </view>
                <text class="time">{{ item.sendTime?.substring(0, 10) }}</text>
              </view>
            </view>
            <template #right>
              <view class="action">
                <view class="button" @click="handleAction('del', item)">删除</view>
              </view>
            </template>
          </wd-swipe-action>
        </template>
      </z-paging>
    </view>
    <template #navRight>
      <view
        class="cuIcon-filter font-size-20px color-white"
        @click="() => (conditionFilter.show = true)"
      ></view>
    </template>
    <rightConditionFilter
      v-if="conditionFilter.show"
      @close="() => (conditionFilter.show = false)"
      :starFlag="starFlag"
      :conditionStartDate="conditionStartDate"
      :conditionEndDate="conditionEndDate"
      @change="handleFilterChange"
    ></rightConditionFilter>
  </PageLayout>
</template>

<script lang="ts" setup>
//
import { onLaunch, onShow, onHide, onLoad, onReady } from '@dcloudio/uni-app'
import { http } from '@/utils/http'
import { useToast, useMessage, useNotify, dayjs } from 'wot-design-uni'
import { useRouter } from '@/plugin/uni-mini-router'
import rightConditionFilter from './components/rightConditionFilter.vue'
import { useParamsStore } from '@/store/page-params'
setTimeout(() => {
      uni.setNavigationBarColor({
        frontColor: '#ffffff',
        backgroundColor: '#000000',
      })
    }, 1e3)
defineOptions({
  name: 'annotationList',
  options: {
    styleIsolation: '‌shared‌',
  },
})
const toast = useToast()
const router = useRouter()
const paging = ref(null)
const dataList = ref([])
const starFlag = ref('')
const conditionFilter = reactive({ show: false })
const backRouteName = ref('index')
const routeMethod = ref('pushTab')
// 开始时间结束时间
const conditionStartDate = ref(null)
const conditionEndDate = ref(null)
const paramsStore = useParamsStore()
const getParams = ({ pageNo, pageSize }) => {
  let result: any = {
    pageNo,
    pageSize,
    starFlag: starFlag.value,
    rangeDateKey: 'zdy',
  }
  if (conditionStartDate.value) {
    result.beginDate = dayjs(conditionStartDate.value).format('YYYY-MM-DD') + ' 00:00:00'
  } else {
    result.beginDate = ''
  }
  if (conditionEndDate.value) {
    result.endDate = dayjs(conditionEndDate.value).format('YYYY-MM-DD') + ' 23:59:59'
  } else {
    result.endDate = ''
  }
  return result
}
// @query所绑定的方法不要自己调用！！需要刷新列表数据时，只需要调用paging.value.reload()即可
const queryList = (pageNo, pageSize) => {
  const params = getParams({ pageNo, pageSize })
  http
    .get('/sys/annountCement/vue3List', { ...params })
    .then((res: any) => {
      if (res.success) {
        paging.value.complete(res.result)
      } else {
        paging.value.complete(false)
      }
    })
    .catch((res) => {
      paging.value.complete(false)
    })
}
const showDetail = (record) => {
  if (record.busType == 'email') {
    goEmailDetailPage(record)
  } else if (record.busType == 'bpm') {
    goBpmList(record.busId)
  } else if (record.busType == 'bpm_task') {
    goBpmList(record.busId)
  } else {
    uni.navigateTo({
      url: '/pages/annotation/annotationDetail?item=' + encodeURIComponent(JSON.stringify(record)),
    })
  }
}
const goEmailDetailPage = (item) => {
  if (item.readFlag == '0') {
    paging.value.reload()
    let readUrl = '/sys/sysAnnouncementSend/editByAnntIdAndUserId'
    http.put(readUrl, { anntId: item.anntId })
  }
  uni.navigateTo({
    url: '/pages-super/mail/mailDetail?id=' + item.busId,
  })
}
// 去处理流程列表
const goBpmList = (taskId) => {
  const url = '/act/process/extActProcessNode/getProcessNodeInfo'
  let params = { taskId: taskId, datatimes: new Date().getTime() }
  http.get(url, params).then((res: any) => {
    const data = res.result
    console.log('goBpmList>>data>>', data)
    if (data.taskIsHandel == true) {
      toast.show('任务已经处理完成!')
    } else {
      let params = {
        id: taskId,
        taskId: taskId,
        instanceId: data.records.BPM_INST_ID,
      }
      console.log('goBpmList***********params>>', params)
      paramsStore.setPageParams('myTaskDetail', {
        data: params,
      })
      router.push({
        name: 'myTaskDetail',
      })
    }
  })
}

const handleFilterChange = ([flag, startTime, endTime]) => {
  starFlag.value = flag
  conditionStartDate.value = startTime
  conditionEndDate.value = endTime
  paging.value.reload()
}
// 收藏与取消收藏
const changeStarFlag = (item) => {
  const url = '/sys/sysAnnouncementSend/edit'
  let starFlag = '1'
  if (item.starFlag == starFlag) {
    starFlag = '0'
  }
  const params = {
    starFlag,
    id: item.sendId,
  }
  http.put(url, params).then((res: any) => {
    if (res.success) {
      item.starFlag = starFlag
    } else {
      toast.warning(res.message)
    }
  })
}
// 滑动删除
const handleAction = (flag, item) => {
  http
    .delete(`/sys/sysAnnouncementSend/delete?id=${item.sendId}`)
    .then((res: any) => {
      if (res.success) {
        paging.value.reload()
      } else {
        toast.warning(res.message)
      }
    })
    .catch((e) => {
      console.log('al delUrl请求错误2', e)
    })
}
// 根据类型获取描述
const getDesc = (item) => {
  if (item.busType == 'email') {
    // 邮件提醒
    return '您收到一封新的邮件，请及时处理。'
  } else if (item.busType == 'bpm') {
    // 流程催办
    return '您收到一条流程催办，请及时处理。'
  } else if (item.busType == 'bpm_task') {
    // 流程任务
    return '您收到一条流程任务，请及时处理。'
  } else if (item.msgCategory == '2') {
    // 系统消息
    return '您收到一条系统消息，请及时处理。'
  } else if (item.msgCategory == '1') {
    // 通知公告
    return '您收到一条通知公告，请及查看。'
  }
}
onLoad((options) => {
  if (options?.backRouteName) {
    backRouteName.value = options.backRouteName
  }
  if (options?.routeMethod) {
    routeMethod.value = options.routeMethod
  }
})
</script>

<style lang="scss" scoped>
@import '../../static/iconfont/iconfont.css';
//
.wrap {
  height: 100%;
}
.wd-swipe-action {
  &:first-child {
    margin-top: 10px;
  }
}
.list {
  padding: 14px 14px;
  background-color: #fff;
  //border-bottom: 1px solid #eee;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  .cIcon {
    flex: none;
    text-align: center;
    line-height: 33px;
    width: 33px;
    height: 33px;
    background-color: #f37b1d;
    color: #fff;
    border-radius: 4px;
    margin-right: 10px;
  }
  .content {
    flex: 1;
    display: flex;
    flex-direction: column;
    margin-right: 20px;
    overflow: hidden;
    .title {
      font-size: 15px;
      margin-bottom: 2px;
    }
    .desc {
      font-size: 13px;
      color: rgb(153, 153, 153);
    }
  }
  .operate {
    text-align: right;
    width: 74px;
    .u-iconfont {
      font-size: 20px;
      margin-bottom: 8px;
    }
    .time {
      font-size: 12px;
      color: #aaa;
    }
  }
}
.action {
  width: 70px;
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
  }
}
// #ifdef MP-WEIXIN
:deep(.wd-cell-group) {
  width: 150px;
  .wd-cell {
    &.title {
      .wd-cell__title {
        font-size: 17px;
      }
    }
  }
  .wd-cell__wrapper {
    align-items: center;
    .wd-cell__right {
      flex: 0.5;
    }
    .wd-radio {
      margin-top: 0;
    }
  }
  .uni-calendar__header-text {
    font-size: 16px !important;
  }
  .wd-cell {
    &.date {
      &:last-child {
        .wd-cell__wrapper {
          border-bottom: 1px solid rgba(232, 232, 232, 0.5);
        }
      }
      .wd-cell__wrapper {
        .wd-calendar__value {
          margin-right: 0;
          text-align: center;
        }
        .wd-input::after {
          display: none;
        }
        .wd-icon-arrow-right {
          display: none;
        }
        .wd-calendar__cell {
          padding: 0;
        }
        .wd-cell__left {
          display: none;
        }
        .wd-cell__right {
          flex: 1;
        }
        .wd-cell__value {
          display: flex;
          align-items: center;
          .wd-picker {
            --wot-cell-wrapper-padding: 0;
            --wot-cell-padding: 0;
            flex: 1;
          }
        }
      }
    }
  }
}
// #endif
</style>
