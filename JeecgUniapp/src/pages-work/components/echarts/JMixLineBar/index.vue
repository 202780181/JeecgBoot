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
  setLegendTop,
  commonOption
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
      formatter:function(value, index){
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
  initSeriesType(chartData);
  if (chartData && chartData.length > 0) {
    //1.将{name，type，value}转换成dataset
    const colors = getCustomColor(config.option?.customColor);
    let configOption = props.config.option;
    let dataset = getDataSet(chartData);
    chartOption.dataset = dataset;
    chartOption.series = [];
    dataset.dimensions.forEach((series, index) => {
      if (index > 0) {
        let seriesType = props.config.seriesType.filter((item) => item.series == series);
        chartOption.series.push({
          type: seriesType && seriesType.length > 0 ? seriesType[0]['type'] : 'bar',
          color: colors[index-1]?.color?colors[index-1]?.color:"",
          series: series,
        });
      }
    });
    //update-begin-author:liusq---date:20230517--for: 图表切换报错，因为type类型图表，字段未设置，导致echart报错，所有包含type图表类似 ---
      chartOption.legend.data = chartOption.series.map((item) => item.series).filter(type=>type);
    //update-end-author:liusq---date:20230517--for: 图表切换报错，因为type类型图表，字段未设置，导致echart报错，所有包含type图表类似 ---
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
		  option.value = deepClone(chartOption)
		  pageTips.show = false
    }
  } else {
    pageTips.status = 1
    pageTips.show = true
  }
}
/**
 * 获取图表系列，设置图例类型
 * @param chartData
 */
function initSeriesType(chartData) {
  //获取数据系列
  //@ts-ignore
  let seriesArr = [...new Set(chartData.map((item) => item['type']))];
  //当前配置项的数据系列
  let configSeriesArr = props.config.seriesType || [];
  //@ts-ignore
  let oldSeriesArr = [...new Set(configSeriesArr.map((item) => item['series']))];
  //判断是否相等，不相等才赋新值
  if (!isArrayEqual(seriesArr, oldSeriesArr)) {
    let newSeriesType = seriesArr.map((series) => {
      return { series, type: 'bar' };
    });
    props.config.seriesType = newSeriesType;
  }
}
/**
 * 计算获取dataset
 */
function getDataSet(chartData) {
  let dataObj = { dimensions: [], source: [],average:0  };
  let dataList = [];
  //获取系列
  //@ts-ignore
  let dimensions = ['stack', ...new Set(chartData.map((item) => item['type']))];
  //获取name集合
  //@ts-ignore
  let nameArr = [...new Set(chartData.map((item) => item['name']))];
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

/**
 * 判断两个数组是否相等
 * @param arr1
 * @param arr2
 */
function isArrayEqual(arr1, arr2) {
  const a1 = arr1.map((i) => i);
  let a2 = arr2.map((i) => i);
  let tempArr = [];
  if (a1.length !== a2.length) {
    return false;
  } else {
    for (let i = 0; i < a1.length; i++) {
      if (a2.indexOf(a1[i]) !== -1) {
        a2.splice(a2.indexOf(a1[i]), 1);
        tempArr.push(a1[i]);
      } else {
        tempArr = [];
        break;
      }
    }
    return tempArr.length === arr2.length;
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
