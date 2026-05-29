<template>
  <view class="statusTip-container">
    <view class="loading" v-if="status == 0">{{ text || '加载中...' }}</view>
    <view class="noData" v-else-if="status == 1">
      <image class="img" src="/static/nocontent-1.png"></image>
      <text class="text">{{ text || '暂无数据！' }}</text>
    </view>
    <view class="timeout" v-else="status == 2">{{ text || '网络超时，请点击重试！' }}</view>
  </view>
</template>

<script setup>
const props = defineProps({
  status: {
    type: Number,
    default: 0,
  },
  text: {
    type: String,
    default: '',
  },
})
</script>

<style lang="scss">
.statusTip-container {
  position: relative;
  /* #ifdef MP-WEIXIN */
  min-height: 300px;
  /* #endif */

  /* #ifndef MP-WEIXIN */
  min-height: 30px;
  /* #endif */
  height: 100%;
  width: 100%;
  .loading,
  .noData,
  .timeout {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: #333;
  }
  .loading {
    padding-left: 20px;
    line-height: 1.5;
  }
  .noData {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    white-space: nowrap;
    .img {
      height: 240rpx;
      width: 240rpx;
    }
  }
}
</style>
