<route lang="json5" type="page">
{
  layout: 'default',
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '我的',
    disableScroll: false,
  },
}
</route>

<template>
  <PageLayout navTitle="我的" :navbarShow="true">
    <view class="page">
      <view class="profile">
        <wd-img width="72" height="72" :round="true" :radius="36" :src="avatar"></wd-img>
        <view class="profile-main">
          <view class="name">{{ userName }}</view>
          <view class="account">{{ accountText }}</view>
        </view>
      </view>

      <wd-cell-group custom-class="panel" border>
        <wd-cell title="当前租户" :value="tenantText" />
        <wd-cell title="登录状态" :value="loginStatus" />
      </wd-cell-group>

      <wd-button custom-class="logout-btn" block type="error" @click="exit">退出登录</wd-button>
    </view>
  </PageLayout>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useMessage } from 'wot-design-uni'
import { useRouter } from '@/plugin/uni-mini-router'
import { useUserStore } from '@/store/user'

defineOptions({
  name: 'people',
  options: {
    styleIsolation: 'shared',
  },
})

const userStore = useUserStore()
const router = useRouter()
const message = useMessage()

const avatar = computed(() => userStore.userInfo.avatar || '/static/default-avatar.png')
const userName = computed(() => userStore.userInfo.realname || userStore.userInfo.username || '未登录用户')
const accountText = computed(() => userStore.userInfo.username || '暂无账号信息')
const tenantText = computed(() => userStore.userInfo.tenantId || '-')
const loginStatus = computed(() => (userStore.isLogined ? '已登录' : '未登录'))

const exit = () => {
  message
    .confirm({
      title: '提示',
      msg: '确定退出登录吗？',
    })
    .then(() => {
      userStore.clearUserInfo()
      router.replaceAll({ name: 'login' })
    })
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100%;
  padding: 24rpx;
  background: #f5f7fb;
}

.profile {
  display: flex;
  gap: 24rpx;
  align-items: center;
  padding: 28rpx;
  margin-bottom: 24rpx;
  background: #ffffff;
  border: 1px solid #edf0f5;
  border-radius: 12rpx;
}

.profile-main {
  min-width: 0;
}

.name {
  font-size: 32rpx;
  font-weight: 700;
  color: #1f2937;
}

.account {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #6b7280;
}

:deep(.panel) {
  overflow: hidden;
  margin-bottom: 32rpx;
  border-radius: 12rpx;
}

:deep(.logout-btn) {
  height: 88rpx;
  border-radius: 12rpx;
}
</style>
