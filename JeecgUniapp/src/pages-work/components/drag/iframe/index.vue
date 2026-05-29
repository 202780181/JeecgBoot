<template>
  <view class="margin"  style="width:100%;height:300px;overflow: scroll;">
    <!-- #ifdef H5  -->
    <iframe v-if="iframeSrc" :src="iframeSrc" :style="styleObject"></iframe>
    <!-- #endif -->
    <!-- #ifdef APP-PLUS  -->
    <iframe v-if="iframeSrc" :src="iframeSrc" :style="styleObject"></iframe>
    <!-- #endif -->

    <!-- #ifdef MP-WEIXIN  -->
    <wd-status-tip image="content" tip="暂不支持" />
    <!-- #endif -->
  </view>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { echartProps } from '../props';

// 定义 props
const props = defineProps(echartProps);

// 计算属性：获取 iframe 的 src
const iframeSrc = computed(() => {
  return props.config?.option?.body?.url;
});

// 计算属性
const styleObject = computed(() => {
  let height = (props.config?.size?.height || 400) + 'px';
  return {
    width: '100%',
    height: height
  };
})
</script>
