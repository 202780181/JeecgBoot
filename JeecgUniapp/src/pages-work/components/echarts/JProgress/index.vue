<template>
  <view class="content">
    <statusTip v-if="pageTips.show" :status="pageTips.status"></statusTip>
      <div v-else class="progress-wrapper" :style="styleObject">
        <div @click="barHandleClick" class="progress-container" :style="{'flex-direction':titlePosition === 'middle'?'row':'column'}"
             :class="{ 'title-above': titlePosition === 'top', 'title-below': titlePosition === 'bottom' }">
          <div v-if="label" class="progress-title" :style="titleStyle">{{ label }}</div>
          <div class="progress-bar-wrapper" :style="progressStyle">
            <div class="progress-bar" :style="progressBarStyle"></div>
          </div>
          <div class="progress-value" :style="valueStyle"
               :class="{ 'value-top': valuePosition === 'top', 'value-middle': valuePosition === 'middle', 'value-bottom': valuePosition === 'bottom' }">
            {{ formatProgress }}
          </div>
        </div>
    </div>
  </view>
</template>

<script lang="ts" setup>
import { echartProps } from '@/pages-work/components/echarts/props'
import {deepMerge, handleTotalAndUnit, disposeGridLayout, setLegendTop, commonOption} from '../../common/echartUtil'
import { isNumber } from '@/utils/is'
import useChartHook from '@/pages-work/components/hooks/useEchart'
import { deepClone } from '@/uni_modules/da-tree/utils'
import echartsUniapp from '@/pages-work/components/echarts/index.vue'
import statusTip from '@/pages-work/components/statusTip.vue'
import {merge} from "lodash-es";
//组件传参
const props = defineProps({
  ...echartProps,
})

const progress = ref(0);
const label = ref('');

//图表数据查询
let [{ dataSource, reload, pageTips, config }, { queryData }] = useChartHook(
    props,
    initOptions,
)

// 格式化进度
const formatProgress = computed(() => {
  return `${progress.value.toFixed(0)}%`;
});
// 标题位置
const titlePosition = computed(() => {
  return config.option.titlePosition || 'top';
});
// 数值位置
const valuePosition = computed(() => {
  return config.option.valuePosition || 'middle';
});
// 进图样式
const progressStyle = computed(() => {
  return {
    flex: 1,
    height: config.option.barWidth || 19 + 'px',
    backgroundColor: config.option.backgroundColor || '#eee',
  };
});
// 标题样式
const titleStyle = computed(() => {
  return {
    color: config.option.titleColor,
    fontSize: config.option.titleFontSize || 16 + 'px',
  };
});
// 数值样式
const valueStyle = computed(() => {
  return {
    right: config.option.valueXOffset || 0 +'%',
    top: config.option.valueYOffset || 0 +'%',
    color: config.option.valueColor,
    fontSize: config.option.valueFontSize || 16 + 'px',
  };
});
// 间距
const styleObject = computed(() => {
  return {
    padding: config.option.padding || 12 + 'px',
  };
});
// 进图样式
const progressBarStyle = computed(() => {
  return {
    width: progress.value + '%',
    height: config.option.barWidth + 'px',
    backgroundColor: config.option.progressColor || '#56befa',
  };
});
/**
 * 初始化
 */
function initOptions(chartData) {
  console.log('基礎進度圖initOptions',chartData)
  if (typeof chartData === 'string') {
    chartData = JSON.parse(chartData);
  }
  if (chartData && chartData.length > 0) {
    label.value = chartData[0].name;
    progress.value = chartData[0].value;
    pageTips.show = false
  }
}
//TODO 进度点击
function barHandleClick(){
}

onMounted(() => {
  queryData()
})
defineExpose({
  queryData
});
</script>
<style scoped lang="scss">
.content {
  padding: 10px;

  .progress-container {
    display: flex;
    flex-direction: column; /* 默认垂直布局，标题和进度条垂直排列 */
  }

  .title-above .progress-title {
    order: -1; /* 将标题放在最上面 */
  }

  .title-below .progress-title {
    order: 1; /* 将进度条和数值放在标题下面（实际上这是默认行为，但为了清晰展示逻辑） */
  }

  .progress-title {
    margin-bottom: 8px; /* 默认与进度条有一点间距 */
  }

  .progress-bar-wrapper {
    display: flex;
    align-items: center; /* 进度条和数值水平居中 */
    position: relative; /* 为绝对定位的数值提供定位上下文 */
    width: 90%;
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-bar {
    height: 24px;
    width: 0; /* 初始宽度为0，由绑定的style动态设置 */
    transition: width 0.3s ease;
  }

  .progress-value {
    position: absolute;
    right: 10px; /* 默认在进度条右侧 */
    color: #fff;
    font-size: 14px;
    line-height: 24px; /* 与进度条高度相同，以便垂直居中 */
  }
  .value-top {
    transform: translateY(0%); /* 另一种实现上方显示的方式 */
  }
  .value-middle {
    transform: translateY(110%); /* 另一种实现上方显示的方式 */
  }
  .value-bottom {
    transform: translateY(210%); /* 另一种实现下方显示的方式，但通常不需要，因为bottom已经足够 */
  }
}
</style>
