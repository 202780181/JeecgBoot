<template>
  <view class="content">
    <statusTip v-if="pageTips.show" :status="pageTips.status"></statusTip>
	<echartsUniapp v-else :option="option" :chartData="dataSource" :config="config" :id="id"></echartsUniapp>
  </view>
</template>

<script lang="ts" setup>
import { echartProps } from '@/pages-work/components/echarts/props';
import {
  deepMerge,
  handleTotalAndUnit,
  disposeGridLayout,
  getCustomColor,
  getDataSet,
  setLegendTop, commonOption
} from '../../common/echartUtil';
import { isNumber } from '@/utils/is';
import useChartHook from '@/pages-work/components/hooks/useEchart';
import { deepClone } from '@/uni_modules/da-tree/utils';
import echartsUniapp from '@/pages-work/components/echarts/index.vue';
import statusTip from '@/pages-work/components/statusTip.vue';
import {merge, pull} from "lodash-es";
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
  legend: {
    show: true,
    data: [],
  },
  xAxis: {
    type: 'category',
    axisLabel:{
      formatter:function(value){
        return value;
      }
    }
  },
  yAxis: {
    type: 'value',
    nameTextStyle: {
      align:"right"
    },
    axisLabel:{
      formatter:function(value, index){
        return value;
      }
    },
    axisLine: {
      show: true
    }
  },
  series: [],
  dataset: {
    dimensions: [],
    source: [],
  },
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
  const colors = getCustomColor(config.option?.customColor);
  if (chartData && chartData.length > 0) {
      let configOption = config.option;
      let dataset = handleDataSet(chartData);
      chartOption.dataset = dataset;
      chartOption.series = [];
      dataset.dimensions.forEach((series, index) => {
        if (index > 0) {
          let legengColor = null
          let barSty = {label:{}};
          if(configOption?.series && configOption?.series?.length>0){
            let optSeries = configOption.series[0];
            legengColor = configOption.series[0]?.color?configOption.series[0]?.color[index-1]:null;
            barSty['label'] = {...optSeries?.label || {}};
            barSty['barWidth'] = optSeries?.barWidth || 15;
          }
          chartOption.series.push({
            type: 'bar', //TODO 自定义图表类型
            color: legengColor || colors[index-1]?.color ||'',
            series: series,
            ...barSty
          });
        }
      });
    chartOption.legend.data = chartOption.series.map((item) => item.series).filter(type=>type);
    //2.类目轴和数值轴赋值
    chartOption.yAxis.type = pull(['value', 'category'], configOption?.xAxis?.type)[0];
    if (chartOption.yAxis.type == 'category') {
      chartOption.yAxis.average = dataset.average;
    } else {
      chartOption.xAxis.average = dataset.average;
    }
    // 合并配置
    if (props.config && config.option) {
      merge(chartOption, config.option)
      setLegendTop(chartOption, config)
      chartOption['tempData'] = chartData;
      chartOption = commonOption(chartOption, config)
      chartOption = handleTotalAndUnit(props.compName, chartOption, config, chartData)
      chartOption = disposeGridLayout(props.compName, chartOption, config, chartData)
      console.log("对比柱形图chartOption",chartOption)
		  option.value = deepClone(chartOption)
		  pageTips.show = false
    }
  } else {
    pageTips.status = 1
    pageTips.show = true
  }
}
/**
 * 计算获取dataset
 */
function handleDataSet(chartData) {
  let dataObj = { dimensions: [], source: [],average:0 };
  let dataList = [];
  //获取系列
  //@ts-ignore
  let dimensions = ['stack', ...new Set(chartData.map((item) => item['type']))];
  //获取name集合
  //@ts-ignore
  let nameArr = [...new Set(chartData.map((item) => item['name']))];
  if(props.config?.dataFilterNum && isNumber(props.config?.dataFilterNum)){
    nameArr = nameArr.slice(0,props.config.dataFilterNum)
  }
  //遍历name获取value
  nameArr.forEach((name) => {
    //筛选出指定name的对象集合
    let arr = chartData.filter((item) => item['name'] == name);
    //获取对象集合的value
    let valueList = arr.map((item) => item['value']);
    //首位置存放的是当前name
    valueList.unshift(name);
    dataList.push(valueList);
  });
  dataObj.dimensions = dimensions;
  dataObj.source = dataList;
  let allValue = chartData.filter(chart=>chart.value>0).map((item) => item['value']);
  dataObj.average =  allValue.length>0?allValue.reduce((a, b) => a + b) / allValue.length:0;
  return dataObj;
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
