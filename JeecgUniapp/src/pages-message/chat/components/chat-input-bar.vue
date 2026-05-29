<!-- z-paging聊天输入框 -->

<template>
  <view class="chat-input-bar-container">
    <view class="chat-input-bar">
      <view class="add-container" @click="tooglePanl('more')">
        <view class="icon add"></view>
      </view>
      <view class="chat-input-container">
        <!-- :adjust-position="false"必须设置，防止键盘弹窗自动上顶，交由z-paging内部处理 -->
        <input
          :focus="focus"
          class="chat-input"
          v-model="msg"
          :adjust-position="false"
          confirm-type="send"
          type="text"
          placeholder="请输入内容"
          @confirm="sendClick"
        />
      </view>
      <!-- 表情图标（如果不需要切换表情面板则不用写） -->
      <view class="emoji-container">
        <image class="emoji-img" :src="getEmoji" @click="tooglePanl('emoji')"></image>
      </view>
      <view class="chat-input-send" @click="sendClick">
        <text class="chat-input-send-text">发送</text>
      </view>
    </view>
    <!--  表情面板，这里使用height控制隐藏显示是为了有高度变化的动画效果（如果不需要切换表情面板则不用写） -->
    <view
      class="emoji-panel-container"
      :style="[{ height: ['emoji', 'more'].includes(chatBarType) ? '320rpx' : '0px' }]"
    >
      <scroll-view scroll-y style="height: 100%; flex: 1">
        <template v-if="['emoji'].includes(chatBarType)">
          <!-- 表情 -->
          <view class="emoji-panel">
            <swiper class="emoji-swiper zdybq" :indicator-dots="true" :duration="150">
              <swiper-item class="swiperItem" v-for="(page, pid) in emojiArray" :key="pid">
                <view class="item" v-for="(em, eid) in page" :key="eid" @tap="emojiClick(em)">
                  <image mode="scaleToFill" :src="em.url" style="width: 28px; height: 28px"></image>
                </view>
              </swiper-item>
            </swiper>
          </view>
        </template>
        <template v-if="['more'].includes(chatBarType)">
          <!-- 相册、照相 -->
          <view class="more-panel">
            <view class="box" @tap="getImage('album')"><view class="icon tupian2"></view></view>
            <view class="box" @tap="getImage('camera')"><view class="icon paizhao"></view></view>
          </view>
        </template>
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { textReplaceEmoji, getEmojiImageUrl } from '../emojis'
import { computed } from 'vue'

defineOptions({
  name: 'chat-input-bar',
  options: {
    // apply-shared‌：当前页面样式会影响到子组件样式.(小程序)
    // shared‌：当前页面样式影响到子组件，子组件样式也会影响到当前页面.(小程序)
    styleIsolation: '‌apply-shared‌',
  },
})
const emit = defineEmits(['emojiTypeChange', 'send', 'image'])
let emojiArray = getEmojiImageUrl()
const msg = ref('')
// 当前input focus
const focus = ref(false)
// emoji、more
const chatBarType = ref('')

const getEmoji = computed(() => {
  let img
  if (['', 'more'].includes(chatBarType.value)) {
    img = 'emoji'
  } else if (['emoji'].includes(chatBarType.value)) {
    img = 'keyboard'
  }
  return `/static/chat/${img}.png`
})

const updateKeyboardHeightChange = (res) => {
  if (res.height > 0) {
    chatBarType.value = ''
  }
}
const hidedKeyboard = () => {
  if (['emoji', 'more'].includes(chatBarType.value)) {
    chatBarType.value = ''
  }
}
// 点击了切换表情面板/键盘（如果不需要切换表情面板则不用写）
const tooglePanl = (val) => {
  if (chatBarType.value == val) {
    // 点击了键盘，展示键盘
    focus.value = true
    chatBarType.value = ''
  } else {
    // 点击了切换表情面板
    focus.value = false
    // 隐藏键盘
    uni.hideKeyboard()
    chatBarType.value = val
  }
}
// 点击了某个表情，将其插入输入内容中（如果不需要切换表情面板则不用写）
const emojiClick = (em) => {
  msg.value += em.alt
}

// 点击了发送按钮
const sendClick = () => {
  if (!msg.value.length) return
  emit('send', msg.value)
  msg.value = ''
}
// 点击了发送按钮
const getImage = (type) => {
	emit('image', type)
}
defineExpose({
  updateKeyboardHeightChange,
  hidedKeyboard,
})
</script>

<style lang="scss" scoped>
.chat-input-bar {
  display: flex;
  flex-direction: row;
  align-items: center;
  border-top: solid 1px #f5f5f5;
  background-color: #f8f8f8;

  padding: 10rpx 20rpx;
}
.add-container {
  margin-right: 8px;
  .icon {
    font-size: 26px;
  }
}
.chat-input-container {
  flex: 1;
  /* #ifndef APP-NVUE */
  display: flex;
  /* #endif */
  padding: 15rpx;
  background-color: white;
  border-radius: 10rpx;
}
.chat-input {
  flex: 1;
  font-size: 28rpx;
}
.emoji-container {
  width: 54rpx;
  height: 54rpx;
  margin: 10rpx 0rpx 10rpx 20rpx;
}
.emoji-img {
  width: 54rpx;
  height: 54rpx;
}
.chat-input-send {
  background-color: #007aff;
  margin: 10rpx 10rpx 10rpx 20rpx;
  border-radius: 10rpx;
  width: 110rpx;
  height: 60rpx;
  /* #ifndef APP-NVUE */
  display: flex;
  /* #endif */
  justify-content: center;
  align-items: center;
}
.chat-input-send-text {
  color: white;
  font-size: 26rpx;
}
.emoji-panel-container {
  border-top: 1px solid #e8e8e8;
  background-color: #f8f8f8;
  overflow: hidden;
  transition-property: height;
  transition-duration: 0.15s;
}
.emoji-panel {
  height: 100%;
  padding: 0 8vw;
  .swiperItem {
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    .item {
      width: 12vw;
      height: 12vw;
      display: flex;
      justify-content: center;
      align-items: center;
    }
  }
}
.more-panel {
  display: flex;
  padding-top: 3vw;
  .box {
    width: 18vw;
    height: 18vw;
    border-radius: 10px;
    background-color: #fff;
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 0 3vw 2vw 3vw;
    .icon {
      font-size: 30px;
    }
  }
}
</style>
