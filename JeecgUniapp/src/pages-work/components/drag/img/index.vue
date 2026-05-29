<template>
  <view class="number-container">
    <img :id="dynamicId" :class="{'rotate': config?.option?.izRotate }" :src="getFileAccessHttpUrl(config.option.body.url)" :style="getImgStyle"/>
  </view>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';
import { echartProps } from '../props';
import useChartHook from '@/pages-work/components/hooks/useEchart'
import {addImgPrefix} from "@/pages-work/components/common/echartUtil";
import {getFileAccessHttpUrl} from "@/common/uitls";
// 定义 props
const props = defineProps(echartProps);

// 使用 hook 获取数据
let [{ dataSource, reload, pageTips, config }, { queryData }] = useChartHook(props, initOption)
//图片地址
const imageSrc = ref<any>('');
/**
 * 图片ID
 */
const dynamicId = computed(() => {
  return props.id;
});
/**
 * 图片样式高度
 */
const getImgStyle = computed(() => {
  let width = props.size?.width;
  let height = props.size?.height || 300;
  let opacity = props.config?.option.opacity || props.config?.option.opacity === 0 ? props.config?.option.opacity : 1;
  let borderRadius = props.config?.option?.borderRadius || 0;
  let backgroundColor = props.config?.option?.backgroundColor || '';
  let rotateTime = props.config?.option?.rotateTime || 1000;
  let padding = props.config?.option?.padding || 0;
  return {
    width: width ? `${width}px` : '100%',
    height: `${height}px` ,
    opacity: `${opacity}`,
    borderRadius: `${borderRadius}px`,
    backgroundColor: `${backgroundColor}`,
    animationDuration: `${rotateTime / 1000}s`,
    padding: `${padding}px`
  };
});

/**
 * 主体样式
 */
const bodyStyle = computed(() => {
  let backgroundColor = props.config?.option?.backgroundColor || '';
  return {
    backgroundColor: `${backgroundColor}`,
    padding: `0px`,
  };
});

// 生命周期钩子
onMounted(() => {
  queryData();
});

// 初始化
async function initOption(data){
  let url = config.option.body.url;
  //1.内置图片
  if (url.startsWith('/img/')) {
    imageSrc.value = addImgPrefix(url);
  } else {
    //3.上传的图片地址
    imageSrc.value = getFileAccessHttpUrl(url);
  }
};
</script>

<style scoped lang="scss">
.mask {
  position: absolute;
  top: 0%;
  left: 0%;
  width: 100%;
  height: 100%;
  background-color: black;
  z-index: 33;
  -moz-opacity: 0.1;
  opacity: 0.1;
  filter: alpha(opacity=10);
}
.ant-card {
  background: inherit !important;
}
.rotate {
  -webkit-animation: rotating 0s linear infinite;
  animation: rotating 0s linear infinite;
}

@keyframes rotating {
  0% {
    -webkit-transform: rotate(0);
    transform: rotate(0);
  }

  100% {
    -webkit-transform: rotate(1turn);
    transform: rotate(1turn);
  }
}
</style>
