<template>
  <view class="content">
    <statusTip v-if="pageTips.show" :status="pageTips.status"></statusTip>
	<echartsUniapp v-else :option="option" :chartData="dataSource" :config="config" :id="id"></echartsUniapp>
  </view>
</template>

<script lang="ts" setup>
import { echartProps } from '@/pages-work/components/echarts/props';
import {deepMerge, handleTotalAndUnit, disposeGridLayout, addImgPrefix} from '../../common/echartUtil';
import { merge, omit } from 'lodash-es';
import useChartHook from '@/pages-work/components/hooks/useEchart';
import { deepClone } from '@/uni_modules/da-tree/utils';
import echartsUniapp from '@/pages-work/components/echarts/index.vue';
import statusTip from '@/pages-work/components/statusTip.vue';
//组件传参
const props = defineProps({
	...echartProps
})
//最终图表配置项
const option = ref({});
//获取默认配置
let chartOption: any = {
  title: {
    show: true,
  },
  xAxis: {
    data: [],
    axisTick: { show: false },
    axisLine: { show: false },
    axisLabel: {
      color: '#e54035',
    },
  },
  yAxis: {
    splitLine: { show: false },
    axisTick: { show: false },
    axisLine: { show: false },
    axisLabel: { show: false },
    nameTextStyle: {
      align:"right"
    },
  },
  color: ['#e54035'],
  series: [
    {
      name: 'hill',
      type: 'pictorialBar',
      barCategoryGap: '-150%',
      symbol: 'path://M0,10 L10,10 C5.5,10 5.5,5 5,0 C4.5,5 4.5,10 0,10 z',
      itemStyle: {
        opacity: 0.5,
      },
      emphasis: {
        itemStyle: {
          opacity: 1,
        },
      },
      data: [],
      z: 10,
    },
    {
      name: 'glyph',
      type: 'pictorialBar',
      barGap: '-100%',
      symbolPosition: 'end',
      symbolSize: 50,
      symbolOffset: [0, '-120%'],
      data: [],
    },
  ],
};


//图表数据查询
let [{ dataSource, reload, pageTips, config }, { queryData }] = useChartHook(
  props,
  initOption
)


//初始化图表配置项
function initOption(data) {
  let chartData: any = dataSource.value
  if (typeof chartData === 'string') {
    chartData = JSON.parse(chartData)
  }
  if (chartData && chartData.length > 0) {
    let seriesValueData = chartData.map((item) => {
      return item.value;
    });
    let seriesObjData = chartData.map((item) => {
      return { ...omit(item, ['name']) };
    });
    let xAxisData = chartData.map((item) => {
      return item.name;
    });
    chartOption.series[0].data = seriesValueData;
    chartOption.series[0].itemStyle.opacity = props.config.option.barOpacity || 0.5;
    chartOption.series[1].data = seriesObjData;
    chartOption.xAxis.data = xAxisData;
    chartOption.color = [props.config.option?.barColor || '#e54035'];
    chartOption.series[0].itemStyle.color = props.config.option?.barColor || '#e54035';
    // 合并配置
    if (props.config && config.option) {
      merge(chartOption, config.option)
      chartOption = handleTotalAndUnit(props.compName, chartOption, config, chartData)
      chartOption = disposeGridLayout(props.compName, chartOption, config, chartData)
		  option.value = deepClone(chartOption)
		  pageTips.show = false
    }
  } else {
    pageTips.status = 1
    pageTips.show = true
  }
}

onMounted(()=>{
	queryData();
})
defineExpose({
  queryData
});
</script>
<style scoped>
.content {
  padding: 10px;
}
</style>
