<template>
  <view class="margin editor-content" :style="[setStyle]">
    <rich-text :nodes="text" preview></rich-text>
  </view>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';
import {isArray, isObject} from "@/common/is";

// 定义 props
const props = defineProps({
  id: {
    type: String,
    default: "",
    required: false
  },
  config: {
    type: Object,
    default: () => {},
    required: false
  },
  horizontal: {
    type: Boolean,
    default: false
  }
});

// 定义响应式数据
const text = ref("");

// 计算属性
const setStyle = computed(() => {
  return {
    maxHeight: `100vh`
  };
});

// 生命周期钩子
onMounted(() => {
  queryData();
});

// 方法
const queryData = () => {
  // 静态数据
  let chartData = props.config?.chartData;
  initOption(chartData);
};

const initOption = (chartData) => {
  if (isArray(chartData)) {
    text.value = chartData[0].value;
  } else if (isObject(chartData)) {
    text.value = chartData.value;
  } else {
    text.value = chartData;
  }
};
</script>

<style>
.editor-content {
  max-height: 600rpx;
  overflow: auto;
}
</style>
