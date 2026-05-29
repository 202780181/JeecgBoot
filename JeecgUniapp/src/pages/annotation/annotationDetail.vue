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
  <PageLayout navTitle="详情" backRouteName="annotationList">
    <scroll-view scroll-y>
      <view class="p-15px">
        <view class="mb-15px">
          <wd-text custom-class="title font-size-20px" :text="annotation.titile"></wd-text>
        </view>
        <view class="flex mb-24px">
          <wd-text custom-class="sender mr-20px" :text="annotation.sender"></wd-text>
          <wd-text class="sendTime" :text="annotation.sendTime"></wd-text>
        </view>
        <view class="content mb-24px">
          <view class="text-content">
            <mp-html :content="annotation.msgContent"></mp-html>
          </view>
        </view>
        <view class="flex">
          <wd-text
            custom-class="cIcon cuIcon-attentionfill mr-15px"
            text="10"
            @click="numberPlus"
          ></wd-text>
          <wd-text
            custom-class="cIcon cuIcon-appreciatefill"
            text="20"
            @click="numberPlus"
          ></wd-text>
        </view>
      </view>
    </scroll-view>
  </PageLayout>
</template>

<script lang="ts" setup>
import { reactive } from 'vue'
import { onLaunch, onShow, onHide, onLoad, onReady } from '@dcloudio/uni-app'
import { http } from '@/utils/http'
//
const annotation = reactive({
  id: '',
  titile: '',
  startTime: '',
  sender: '',
  msgContent: '',
  anntId: '',
  sendTime: '',
})
const goodNumber = ref(null)
const flg = ref(true)
const init = (option) => {
  const annItem = JSON.parse(decodeURIComponent(option.item))
  console.log('ann', annItem)
  Object.assign(annotation, annItem)
  readOk()
}
const readOk = () => {
  let param = { anntId: annotation.anntId }
  http.put('/sys/sysAnnouncementSend/editByAnntIdAndUserId', param)
}

const numberPlus = () => {
  if (flg.value) {
    goodNumber.value++
    flg.value = false
  } else {
    goodNumber.value--
    if (goodNumber.value == 0) {
      goodNumber.value = null
    }
    flg.value = true
  }
}
onLoad((option) => {
  init(option)
})
</script>

<style lang="scss" scoped>
//

:deep(.pageLayout) {
  .pageContent {
    background-color: #fff;
  }
}
:deep(.wd-text) {
  --wot-text-info-color: #999;
  &.sender {
    color: var(--color-blue);
  }
  &.sendTime {
    color: var(--color-gray);
  }
  &.cIcon {
    &::before {
      margin-right: 4px;
    }
  }
}
:deep(.title) {
  --wot-text-info-color: #333;
  margin-bottom: 10px;
  font-family: '宋体';
}
</style>
