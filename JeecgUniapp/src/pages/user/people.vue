<route lang="json5" type="page">
{
  layout: 'default',
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '个人',
    disableScroll: true, // 微信禁止页面滚动
    'app-plus': {
      bounce: 'none', // 禁用 iOS 弹性效果
    },
  },
}
</route>

<template>
  <PageLayout :navbarShow="false">
    <view class="avatar-area">
      <!-- prettier-ignore -->
      <wd-img width="100" height="100" :round="true" :radius="50" :src="personalList.avatar ? personalList.avatar : defAvatar" @click="ChooseImage"></wd-img>
    </view>
    <view class="info-area shadow-warp mb-5">
      <view class="user">
        <wd-text
          custom-class="title"
          :text="personalList.realname ? personalList.realname : realname"
        ></wd-text>
        <view class="tag">
          <view class="cuIcon-people mr-1"></view>
          <wd-text text="用户"></wd-text>
        </view>
      </view>
      <view class="job">
        <!-- prettier-ignore -->
        <wd-text custom-class="title":text="personalList.post ? personalList.post : '员工'"></wd-text>
        <view class="tag">
          <view class="cuIcon-news mr-1"></view>
          <wd-text text="职务"></wd-text>
        </view>
      </view>
    </view>
    <scroll-view scroll-y>
      <wd-cell-group custom-class="shadow-warp" border clickable>
        <template v-for="(item, index) in dataSource" :key="index">
          <wd-cell :title="item.title" is-link @click="handleCell(item)">
            <template #icon>
              <view :class="item.class" class="mr-2"></view>
            </template>
          </wd-cell>
        </template>
      </wd-cell-group>
    </scroll-view>
  </PageLayout>
</template>

<script lang="ts" setup>
import { ref, reactive, watch, onBeforeUnmount } from 'vue'
import { cache, getFileAccessHttpUrl, hasRoute } from '@/common/uitls'
import { onLaunch, onShow, onHide, onLoad, onReady } from '@dcloudio/uni-app'
import { useToast, useMessage, useNotify } from 'wot-design-uni'
import { useRouter } from '@/plugin/uni-mini-router'
import {
  ACCESS_TOKEN,
  USER_NAME,
  USER_INFO,
  APP_ROUTE,
  APP_CONFIG,
  HOME_CONFIG_EXPIRED_TIME,
} from '@/common/constants'
import { http } from '@/utils/http'
import { useUserStore } from '@/store/user'
import useUpload from '@/hooks/useUpload'
import { getEnvBaseUrl } from '@/utils/index'

//
const userStore = useUserStore()
const toast = useToast()
const router = useRouter()
const message = useMessage()
const defAvatar = 'https://static.jeecg.com/upload/test/login4_1595818039175.png'
const personalList = reactive({
  avatar: '',
  realname: '',
  username: '',
  post: '',
  depart: '',
})
const userId = ref(userStore.userInfo.userid)
const realname = ref(userStore.userInfo.realname)
const id = ref('')
let stopWatch: any = null
const api = {
  positionUrl: '/sys/position/list',
  departUrl: '/sys/user/userDepartList',
  userUrl: '/sys/user/queryById',
  postUrl: '/sys/position/queryByCode',
  uploadUrl: `${getEnvBaseUrl()}/sys/common/upload`,
}
const dataSource = [
  { key: 'organization', title: '组织', class: 'cuIcon-taoxiaopu text-cyan' },
  { key: 'scan', title: '扫码', class: 'cuIcon-scan text-red' },
  { key: 'location', title: '定位', class: 'cuIcon-location text-cyan' },
  { key: 'setttings', title: '设置', class: 'cuIcon-settingsfill text-cyan' },
  { key: 'exit', title: '退出', class: 'cuIcon-exit text-yellow' },
]

const load = () => {
  if (!userId.value) {
    return
  }
  http
    .get(api.userUrl, { id: userId.value })
    .then((res: any) => {
      if (res.success) {
        let perArr = res.result
        let avatar =
          perArr.avatar && perArr.avatar.length > 0
            ? getFileAccessHttpUrl(perArr.avatar)
            : '/static/avatar_boy.png'
        personalList.avatar = avatar
        personalList.realname = perArr.realname
        personalList.username = perArr.username
        personalList.depart = perArr.departIds
        getpost(perArr.post)
      }
    })
    .catch((err) => {
      console.log(err)
    })
}
const getpost = (code) => {
  if (!code || code.length == 0) {
    personalList.post = '员工'
    return false
  }
  http
    .get(api.postUrl, { params: { code: code } })
    .then((res: any) => {
      console.log('postUrl', res)
      if (res.success) {
        personalList.post = res.result.name
      }
    })
    .catch((err) => {
      console.log(err)
    })
}

const ChooseImage = (params) => {
  const { loading, data, error, run } = useUpload({ name: 'file' }, { url: api.uploadUrl })
  if (stopWatch) stopWatch()
  run()
  stopWatch = watch(
    () => [loading.value, error.value, data.value],
    ([loading, err, data], oldValue) => {
      if (loading == false) {
        if (err) {
          // toast.warning('修改失败')
          uni.hideLoading()
        } else {
          if (data) {
            editAvatar(data.message)
          }
        }
      }
    },
  )
}
const editAvatar = (avatar) => {
  http
    .put('/sys/user/appEdit', { id: userId.value, avatar })
    .then((res: any) => {
      if (res.success) {
        toast.success('修改成功~')
        userStore.editUserInfo({ avatar: getFileAccessHttpUrl(avatar) })
        personalList.avatar = getFileAccessHttpUrl(avatar)
      } else {
        toast.warning(res.message)
      }
      uni.hideLoading()
    })
    .catch((err) => {
      uni.hideLoading()
      toast.warning('修改失败')
    })
}
const scan = () => {
  // #ifndef H5
  uni.scanCode({
    success: function (res) {
      console.log('条码res：' + res)
      console.log('条码类型：' + res.scanType)
      console.log('条码内容：' + res.result)
      //条码内容包含QRCODELOGIN则是去扫码登录的逻辑
      if (res.result.indexOf('QRCODELOGIN') != -1) {
        const data = {
          qrcodeId: res.result,
          token: userStore.userInfo.token,
        }
        http({
          url: '/sys/scanLoginQrcode',
          data,
          header: { 'content-type': 'application/x-www-form-urlencoded' },
          method: 'POST',
        }).then((res: any) => {
          console.log('扫码接口返回内容res：', res)
          if (res.success) {
            toast.success(res.result)
          } else {
            toast.warning(res.result)
          }
        })
      }
    },
  })
  // #endif
  // #ifdef H5
  toast.warning('H5暂不支持')
  // #endif
}
const exit = () => {
  message
    .confirm({
      title: '提示',
      msg: '确定退出吗？',
    })
    .then(() => {
      userStore.clearUserInfo()
      router.replaceAll({ name: 'login' })
    })
}
const handleCell = (item) => {
  switch (item.key) {
    case 'scan':
      scan()
      break
    case 'location':
      router.push({ name: 'location' })
      break
    case 'organization':
      router.push({ name: 'organization' })
      break
    case 'setttings':
      router.push({ name: 'userDetail' })
      break
    case 'exit':
      exit()
      break
    default:
      toast.show('功能暂未开发~')
  }
}
onBeforeUnmount(() => {
  stopWatch?.()
})
onLoad(() => {
  load()
})
</script>

<style lang="scss" scoped>
//
.avatar-area {
  /* #ifdef MP-WEIXIN */
  background-image: url('https://static.jeecg.com/upload/test/blue_1595818030310.png');
  /* #endif */
  /* #ifndef MP-WEIXIN */
  background-image: url('@/static/blue.png');
  /* #endif */
  background-size: cover;
  height: 400upx;
  display: flex;
  justify-content: center;
  padding-top: 40upx;
  overflow: hidden;
  position: relative;
  flex-direction: column;
  align-items: center;
  color: #fff;
  font-weight: 300;
  text-shadow: 0 0 3px rgba(0, 0, 0, 0.3);
}
.info-area {
  display: flex;
  padding: 30upx;
  background-color: #fff;
  color: #8799a3;
  :deep(.wd-text.is-default) {
    color: var(--color-grey);
  }
  .user,
  .job {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    .tag {
      display: flex;
      align-items: center;
    }
    :deep(.wd-text.title) {
      font-size: 18px;
      min-height: 18px;
      margin-bottom: 16upx;
    }
  }
  .user {
    border-right: 0.5px solid rgba(0, 0, 0, 0.1);
    :deep(.wd-text.title) {
      color: #f37b1d;
    }
  }
  .job {
    :deep(.wd-text.title) {
      color: #39b54a;
    }
  }
}
:deep(.wd-cell-group) {
  margin: 0 26upx;
  border-radius: 18upx;
  overflow: hidden;
  --wot-cell-line-height: 32px;
  .wd-cell {
    --wot-cell-title-fs: 15px;
    --wot-cell-title-color: var(--color-grey);
    .wd-cell__left {
      font-size: 15px;
    }
  }
}
</style>
