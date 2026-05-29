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
    :backRouteName="backRouteName"
    navLeftText=""
    :navBgTransparent="true"
    :navFixed="true"
  >
    <view class="wrap">
      <view class="topArea"></view>
      <view class="middleArea bg-white">
        <wd-img
          custom-class="avatar"
          width="75px"
          height="75px"
          radius="50%"
          :src="getFileAccessHttpUrl(data.avatar)"
        ></wd-img>
        <view class="realname center ellipsis">{{ data.groupName }}</view>
        <wd-button :disabled="!dataSource.list" custom-class="btn" @click="handleGo">
          发消息
        </wd-button>
      </view>
      <view class="bottomArea bg-white">
        <template v-if="dataSource?.list?.length">
          <view class="avatar-box">
            <view class="box" v-for="(item, index) in dataSource.list" :key="index">
              <wd-img
                width="50px"
                height="50px"
                radius="50%"
                :src="getFileAccessHttpUrl(item.avatar)"
              ></wd-img>
            </view>
          </view>
          <p class="desc">{{ dataSource.list?.length }}个成员</p>
        </template>
      </view>
    </view>
  </PageLayout>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { useUserStore } from '@/store/user'
import { useParamsStore } from '@/store/page-params'
import { useRouter } from '@/plugin/uni-mini-router'
import { http } from '@/utils/http'
import { useMessage, useToast } from 'wot-design-uni'
import { cache, getFileAccessHttpUrl, hasRoute } from '@/common/uitls'
//
const toast = useToast()
const userStore = useUserStore()
const paramsStore = useParamsStore()
const router = useRouter()
const params = paramsStore.getPageParams('groupPage')
const backRouteName = ref(params.backRouteName) ?? ''
let data = params.data ?? {}
const dataSource: any = ref({})
const api = {
  getMembers: '/eoa/im/api/getMembers',
}
const handleGo = () => {
  const { eoaChatGroup } = dataSource.value
  var parmas = {
    fromAvatar: getFileAccessHttpUrl(eoaChatGroup.avatar),
    fromUserName: eoaChatGroup.groupName,
    msgFrom: userStore.userInfo.userid,
    msgTo: eoaChatGroup.id,
    type: eoaChatGroup.type,
  }
  paramsStore.setPageParams('chat', { back: 'myGroup', routeMethod: 'replace', data: parmas })
  router.replace({ name: 'chat' })
}

const init = () => {
  http.get(api.getMembers, { id: params.data.groupId }).then((res) => {
    if (res.code == 0) {
      dataSource.value = res.data
    } else {
      toast.warning(res.message)
    }
  })
}
init()
</script>

<style lang="scss" scoped>
//
.topArea {
  background: linear-gradient(45deg, #0081ff, #1cbbb4);
  min-height: 170px;
}
.middleArea {
  position: relative;
  display: flex;
  flex-direction: column;
  padding-bottom: 30px;
  :deep(.avatar) {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translate(-50%, -50%);
  }
  :deep(.realname) {
    width: 80%;
    padding-top: 50px;
    font-size: 18px;
    font-weight: 700;
    color: #333;
    margin: 0 auto;
    margin-bottom: 20px;
  }
  :deep(.btn) {
    width: 60%;
    margin: 0 auto;
  }
}
.bottomArea {
  .avatar-box {
    display: flex;
    justify-content: center;
    .box {
      height: 50px;
      width: 50px;
      border-radius: 50%;
      margin-left: -10px;
    }
  }
  .desc {
    padding: 10px;
    text-align: center;
    font-size: 15px;
    color: var(--grey);
  }
}
</style>
