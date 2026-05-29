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
  <PageLayout
    navTitle="用户详情"
    backRouteName="people"
    routeMethod="pushTab"
    navRightText="编辑"
    @navRight="handleNavRight"
  >
    <view class="list cu-text-grey">
      <template v-for="(item, index) in dataSource" :key="index">
        <view :class="['item', item.type ? item.type : '']">
          <view class="left">{{ item.label }}</view>
          <view class="right">
            <template v-if="item.type == 'avatar'">
              <wd-img width="24px" height="24px" :src="getAvater(item.value)"></wd-img>
            </template>
            <template v-else-if="item.type == 'sex'">
              {{ getSex(item.value) }}
            </template>
            <template v-else-if="item.type == 'phone'">
              {{ phone }}
            </template>
            <template v-else-if="item.type == 'email'">
              {{ email }}
            </template>
            <template v-else>
              {{ item.value }}
            </template>
          </view>
        </view>
      </template>
    </view>
  </PageLayout>
</template>

<script lang="ts" setup>
import { useToast, useMessage, useNotify, dayjs } from 'wot-design-uni'
import { useRouter } from '@/plugin/uni-mini-router'
import { useUserStore } from '@/store/user'
import defaultAvatar from './components/avatar.vue'
import { getFileAccessHttpUrl } from '@/common/uitls'

defineOptions({
  name: 'userDetail',
  options: {
    styleIsolation: 'shared',
  },
})
const toast = useToast()
const router = useRouter()
const userStore = useUserStore()
const columns = [
  { label: '男', value: 1 },
  { label: '女', value: 2 },
]
const handleNavRight = () => {
  router.push({ name: 'userEdit' })
}
const getSex = (val) => {
  return columns.find((item) => item.value === val)['label']
}
const getAvater = (avater) => {
  return getFileAccessHttpUrl(avater)
}
const phone = computed(()=>{
  return userStore.userInfo?.phone || '';
})
const email = computed(()=>{
  return userStore.userInfo?.email || '';
})
const getSubStringText = (text, len) => {
  if (!text || text.length == 0) {
    return ''
  }
  if (text.length < len) {
    return text
  }
  return text.substr(0, len) + '...'
}
const dataSource = ref([
  { type: 'avatar', label: '头像', value: userStore.userInfo.avatar },
  { label: '姓名', value: userStore.userInfo.realname },
  { type: 'sex', label: '性别', value: userStore.userInfo.sex ?? 1 },
  { label: '生日', value: userStore.userInfo?.birthday ||'' },
  {
    type: 'showInfo',
    label: '对外信息展示',
    value: getSubStringText(userStore.userInfo.realname + (userStore.userInfo?.orgCodeTxt?`@${userStore.userInfo.orgCodeTxt}`:''), 11),
  },
  { label: '手机', value: phone.value ,type: 'phone' },
  { label: '邮箱', value: email.value ,type: 'email'},
])
</script>

<style lang="scss" scoped>
//
.list {
  display: flex;
  flex-direction: column;
  .item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background-color: #fff;
    line-height: 24px;
    padding: 14px 15px;
    position: relative;
    &::before {
      position: absolute;
      top: 0;
      left: 0;
      box-sizing: border-box;
      width: 200%;
      height: 200%;
      border-bottom: 1px solid #ddd;
      border-radius: inherit;
      content: ' ';
      -webkit-transform: scale(0.5);
      transform: scale(0.5);
      -webkit-transform-origin: 0 0;
      transform-origin: 0 0;
      pointer-events: none;
    }
    &.showInfo {
      margin: 15px 0;
    }
  }
  .left {
    width: 30%;
    font-size: 15px;
  }
  .right {
    width: 50%;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }
}
</style>
