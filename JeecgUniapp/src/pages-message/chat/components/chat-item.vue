<!-- z-paging聊天item -->

<template>
  <view class="chat-item">
    <text
      class="chat-time"
      v-if="item.sendTime && item.sendTime.length && !['systemMessage'].includes(item.msgType)"
    >
      {{ item.sendTime?.substring(0, 19) }}
    </text>
    <!--系统消息-->
    <template v-if="['systemMessage'].includes(item.msgType)">
      <view class="chat-systemMessage">{{ item.msgData }}</view>
    </template>
    <view v-else :class="{ 'chat-container': true, 'chat-location-me': isMe(item) }">
      <view class="chat-icon-container">
        <image class="chat-icon" :src="getFileAccessHttpUrl(item.fromAvatar)" mode="aspectFill" />
      </view>
      <view class="chat-content-container">
        <text :class="{ 'chat-user-name': true, 'chat-location-me': isMe(item) }">
          {{ item.fromUserName }}
        </text>
        <view
          :class="{
            'chat-text-container-super': true,
            'flex-end': isMe(item),
            'flex-start': !isMe(item),
          }"
        >
          <!---文字-->
          <template v-if="['text'].includes(item.msgType)">
            <view :class="{ 'chat-text-container': true, 'chat-text-container-me': isMe(item) }">
              <view :class="{ 'chat-text': true, 'chat-text-me': isMe(item) }">
                <rich-text :nodes="item.msgData"></rich-text>
              </view>
            </view>
          </template>
          <!--图片-->
          <template v-else-if="['image'].includes(item.msgType)">
            <wd-img
              width="200"
              height="200"
              :enable-preview="true"
              :radius="10"
              mode="widthFix"
              :src="getFileAccessHttpUrl(item.msgData)"
            ></wd-img>
          </template>
          <!--语音-->
          <template v-else-if="['voice'].includes(item.msgType)">
            <view
              :class="{
                'chat-voice-container': true,
                'chat-voice-container-me': isMe(item),
                play: playMsgid == item.id,
              }"
              @click="playVoice(item)"
            >
              <view class="length mr-2">{{ item.msgData.length }}</view>
              <view class="icon my-voice"></view>
            </view>
          </template>
          <!--文件-->
          <template v-else-if="['file'].includes(item.msgType)"></template>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { useUserStore } from '@/store/user'
import { cache, getFileAccessHttpUrl } from '@/common/uitls'

defineOptions({ name: 'chat-item' })

const userStore = useUserStore()
const emit = defineEmits(['playVoice'])
const props = defineProps({
  playMsgid: {
    type: String,
    default: '',
  },
  item: {
    type: Object,
    default: function () {
      return {
        sendTime: '',
        fromAvatar: '',
        fromUserName: '',
        msgData: '',
      }
    },
  },
})
const isMe = (item) => {
  return item.msgFrom == userStore.userInfo.userid
}
const playVoice = (item) => {
  emit('playVoice', item)
}
</script>

<style lang="scss" scoped>
.chat-item {
  display: flex;
  flex-direction: column;
  padding: 20upx;
}
.chat-time {
  padding: 4upx 0upx;
  text-align: center;
  font-size: 22upx;
  color: #aaaaaa;
}
.chat-systemMessage {
  padding: 4upx 0upx;
  text-align: center;
  font-size: 22upx;
  color: #979191;
}
.chat-container {
  display: flex;
  flex-direction: row;
}
.chat-location-me {
  flex-direction: row-reverse;
  text-align: right;
}
.chat-icon-container {
  margin-top: 12upx;
}
.chat-icon {
  width: 80upx;
  height: 80upx;
  border-radius: 8px;
  background-color: #eeeeee;
}
.chat-content-container {
  margin: 0upx 15upx;
}
.chat-user-name {
  font-size: 26upx;
  color: #888888;
}
.chat-text-container,
.chat-voice-container {
  text-align: left;
  background-color: #fff;
  border-radius: 8upx;
  padding: 7px 10px;
  margin-top: 10upx;
  /* #ifndef APP-NVUE */
  max-width: 500upx;
  /* #endif */
}
.chat-text-container-me,
.chat-voice-container {
  background-color: #55aaff;
}
.chat-voice-container {
  display: flex;
  align-items: center;
  color: #fff;
}
.chat-text-container-super {
  display: flex;
  flex-direction: row;
  &.flex-end {
    justify-content: flex-end;
  }
  &.flex-start {
    justify-content: flex-start;
  }
}
.chat-text {
  font-size: 28upx;
  /* #ifndef APP-NVUE */
  word-break: break-all;
  /* #endif */
  /* #ifdef APP-NVUE */
  max-width: 500upx;
  /* #endif */
}
.chat-text-me {
  color: white;
}
</style>
