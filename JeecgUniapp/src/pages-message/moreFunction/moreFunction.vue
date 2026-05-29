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
  <PageLayout navTitle="更多功能" backRouteName="message" routeMethod="pushTab">
    <scroll-view sroll-y>
      <view class="content">
        <template v-for="(item, index) in dataSource" :key="index">
          <view class="list" @click="handleGo(item)">
            <view :class="['avatar', item.color]">
              <text :class="[`cuIcon-${item.icon}`]"></text>
            </view>
            <view class="tableTxt ellipsis">系统</view>
          </view>
        </template>
      </view>
    </scroll-view>
  </PageLayout>
</template>

<script lang="ts" setup>
import { ref, reactive } from 'vue'
import { onShow, onHide, onLoad, onReady } from '@dcloudio/uni-app'
import { useMessage, useToast } from 'wot-design-uni'
import { useRouter } from '@/plugin/uni-mini-router'
import { useUserStore } from '@/store/user'
import { http } from '@/utils/http'
import { useParamsStore } from '@/store/page-params'
defineOptions({
  name: 'moreFunction',
  options: {
    styleIsolation: 'shared',
  },
})
const router = useRouter()
const paramsStore = useParamsStore()
const userStore = useUserStore()
const toast = useToast()
const message = useMessage()
const dataSource = [
  { name: '系统', icon: 'notice', color: 'blue', path: 'annotationList', value: '3' },
]
const handleGo = (item) => {
  router.push({
    name: item.path,
    params: {
      backRouteName: 'moreFunction',
      routeMethod: 'push',
    },
  })
}
</script>

<style lang="scss" scoped>
//
.content {
  padding-top: 10px;
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
  .avatar {
    width: 45px;
    height: 45px;
    border-radius: 50%;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    margin-right: 10px;
    background-color: #617f89;
    flex: none;
    &.blue {
      background-color: #0081ff;
    }
    &.azure-green {
      background-color: #02bbd5;
    }
    &.orange {
      background-color: #f37b1d;
    }
    &.white {
      background-color: #fff;
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
</style>
