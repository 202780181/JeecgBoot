<template>
  <view class="number-container" :style="{'width': horizontal ? '80vh' : '100%'}">
    <view v-if="cardTitle" class="title-area" :style="cardStyle">{{ cardTitle }}</view>
    <view class="number-div" style="min-height:200px">
      <!--数值-->
      <view class="content-wrapper">
        <view class="valignWrapper" style="display: flex; min-width: 0">
          <view class="count ellipsis" @tap="textClick(showValue)" :style="getTextStyle"> {{ showValue }}</view>
        </view>
      </view>
      <!--趋势-->
      <view :style="{ color: trend ? trendColor : 'gray' }" v-if="showTrend">
        <view class="valignWrapper">
          <view v-if="trend" :class="trendIcon" style="margin-right: 3px"></view>
          <text :style="getRatioTextStyle">{{ trendRatio }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';
import { echartProps } from '../props';
import {isObject} from "@/common/is";
import {calcUnit} from "@/pages-work/components/common/echartUtil";
import useChartHook from '@/pages-work/components/hooks/useEchart'
// 定义 props
const props = defineProps(echartProps);

// 使用 mixin
let [{ dataSource, reload, pageTips, config }, { queryData,handleClick }] = useChartHook(props, initOption)

// 定义响应式数据
const currentValue = ref(0);
const trendRatio = ref("");
const trend = ref("");
const cardStyle = ref({});

// 计算属性
const cardTitle = computed(() => {
  return props.config.option.card.title;
});

const showTrend = computed(() => {
  return props.config.analysis.isCompare || false;
});

const trendColor = computed(() => {
  // 绿升红降 or 红升绿降
  let trendType = props.config.analysis.trendType;
  if (trend.value == 'up') {
    return trendType == '1' ? 'green' : 'red';
  } else {
    return trendType == '1' ? 'red' : 'green';
  }
});
//趋势图标
const trendIcon = computed(() => {
  return trend.value == 'up' ? 'cuIcon-triangleupfill' : 'cuIcon-triangledownfill';
});
//显示数值
const showValue = computed(() => {
  let compConfig = props.config;
  if (compConfig.dataType == 4 && compConfig.compStyleConfig) {
    // 显示单位配置
    let showUnitConfig = compConfig.compStyleConfig.showUnit;
    let unit = showUnitConfig.unit ? showUnitConfig.unit : '';
    // 计算显示数值和添加前后缀
    return showUnitConfig.position == 'suffix' ? `${calcUnit(currentValue.value, showUnitConfig)}${unit}` : `${unit}${calcUnit(currentValue.value, showUnitConfig)}`;
  }
  return currentValue.value;
});
//文本样式
const getTextStyle = computed(() => {
  let fontSize = props.config.option.body.fontSize || 20;
  let color = props.config.option.body.color || '#000000';
  let fontWeight = props.config.option.body.fontWeight || 'normal';
  return {
    fontSize: `${fontSize}px`,
    color: `${color}`,
    fontWeight: `${fontWeight}`,
  };
});
// 趋势文本样式
const getRatioTextStyle = computed(() => {
  let fontSize = props.config.option.body.fontSize || 20;
  fontSize = fontSize - 20 > 12 ? fontSize - 20 : 12;
  return {
    fontSize: `${fontSize}px`,
  };
});
/**
 * 文本跳转
 */
function textClick(text) {
  handleClick({value:text});
}
// 生命周期钩子
onMounted(() => {
  queryData();
});

// 方法
function initOption(data){
  let chartData = dataSource.value;
  let compConfig = props.config;
  // 处理显示数值
  if (chartData) {
    console.log('===数值组件===', chartData)
    if (Array.isArray(chartData) && chartData.length > 0) {
      currentValue.value = chartData[0].value;
    } else if (isObject(chartData)) {
      currentValue.value = chartData.value;
    }
  }
  // 计算趋势比例
  if (showTrend.value) {
    let compareType = compConfig.analysis.compareType;
    // 比较值是提前算好的
    let compareValue = compConfig.analysis.compareValue;
    // 本月比上月增长百分比=（本月数据-上月数据）/上月数据*100%。
    trendRatio.value = '_ _';
    trend.value = '';
    if (compareValue != 0 && compareType) {
      trend.value = currentValue.value > compareValue ? 'up' : 'down';
      let growthRate = (((currentValue.value - compareValue) / compareValue) * 100).toFixed(2);
      trendRatio.value = trend.value == 'down' ? `${-growthRate}%` : `${growthRate}%`;
    }
  }
  // update-begin-author:liaozhiyang date:2023-12-1 for:【QQYUN-7230】数值组件加上标题极其样式
  const { card } = compConfig.option;
  if (card && card.title) {
    const { textStyle } = card;
    cardStyle.value = { 'background-color': `${card.headColor}`, 'color': `${textStyle.color}`, 'font-size': `${textStyle.fontSize}px`, 'font-weight': `${textStyle.fontWeight}` };
  }
  // update-end-author:liaozhiyang date:2023-12-1 for:【QQYUN-7230】数值组件加上标题极其样式
};

defineExpose({
  queryData
});
</script>

<style scoped lang="scss">
.title-area {
  padding: 10rpx 20rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
  border-bottom: 1px solid rgb(240, 240, 240);
}

.valignWrapper {
  -webkit-flex-align: center;
  -ms-flex-align: center;
  -webkit-align-items: center;
  align-items: center;
  display: -webkit-box;
  display: -moz-box;
  display: -ms-flexbox;
  display: -webkit-flex;
  display: flex;
}

.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: top;
  white-space: nowrap;
}

.number-div {
  padding: 0px 15px;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  -webkit-box-align: center;
  align-items: center;
  -webkit-box-pack: center;
  justify-content: center;
  font-size: 36px;

  .content-wrapper {
    width: 100%;
    min-height: 20px;
    display: flex;
    -webkit-box-align: center;
    align-items: center;
    -webkit-box-pack: center;
    justify-content: center;

    .count {
      width: 100%;
      color: rgb(51, 51, 51);
      font-weight: 500;
      font-family: system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
  }
}
</style>
