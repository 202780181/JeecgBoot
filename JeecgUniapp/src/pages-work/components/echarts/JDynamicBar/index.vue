<template>
  <view class="content">
    <statusTip v-if="pageTips.show" :status="pageTips.status"></statusTip>
	  <echartsUniapp v-else :option="option" :chartData="dataSource" :config="config" :id="id" ></echartsUniapp>
  </view>
</template>

<script lang="ts" setup>
import { echartProps } from '@/pages-work/components/echarts/props';
import {deepMerge, handleTotalAndUnit, disposeGridLayout} from '../../common/echartUtil';
import useChartHook from '@/pages-work/components/hooks/useEchart';
import { deepClone } from '@/uni_modules/da-tree/utils';
import echartsUniapp from '@/pages-work/components/echarts/index.vue';
import statusTip from '@/pages-work/components/statusTip.vue';
import { merge, pull, cloneDeep } from 'lodash-es';
//组件传参
const props = defineProps({
	...echartProps
})

//最终图表配置项
const option = ref({});
let chartOption: any = {
  title: {
    show: true,
  },
  legend: {
    show: true,
    data: [],
  },
  xAxis: {
    max: 'dataMax',
    type: 'value',
  },
  yAxis: {
    type: 'category',
    inverse: false,
    nameTextStyle: {
      align:"right"
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
  if (chartData && chartData.length > 0) {
    let configOption = props.config.option;
    let dataset = getDataSet(chartData);
    chartOption.dataset = dataset;
    chartOption.series = [];
    dataset.dimensions.forEach((series, index) => {
      if (index > 0) {
        chartOption.series.push({
          realtimeSort: true,
          type: 'bar', //TODO 自定义图表类型
          color: '', //TODO 自定义颜色
          series: series, //TODO 系列，冗余数据，只是table展示使用
          label: {
            show: true,
            position: 'right',
            valueAnimation: true,
          },
        });
      }
    });
    chartOption.legend.data = chartOption.series.map((item) => item.series).filter(type=>type);
    chartOption.yAxis.type = pull(['category', 'value'], configOption?.xAxis?.type)[0];
    // 合并配置
    if (props.config && config.option) {
      merge(chartOption, config.option)
      synchSeries(chartOption, props?.config?.option?.series);
		  option.value = deepClone(chartOption)
		  pageTips.show = false
    }
  } else {
    pageTips.status = 1
    pageTips.show = true
  }
}

/**
 * 同步图例和系列
 * @param chartOption
 * @param series
 */
function synchSeries (chartOption, series) {
  if (chartOption?.series?.length && series?.length) {
    const _series = cloneDeep(series);
    if (_series[0]?.itemStyle?.color) {
      // 不同步柱体颜色
      delete _series[0]?.itemStyle?.color;
    };
    chartOption.series.forEach(() => {
      _series.push(_series[0]);
    });
    merge(chartOption, { series: _series });
  }
};

/**
 * 获取数据集
 * @param chartData
 */
function getDataSet(chartData) {
  let dataObj = { dimensions: [], source: [] };
  let dataList = [];
  //获取系列
  let seriesArr:any = chartData.map((item:any) => item['type']);
  // @ts-ignore
  let dimensions = seriesArr && seriesArr.length > 0 ? ['dynamic', ...new Set(seriesArr)] : [];
  //获取name
  // @ts-ignore
  let nameArr = [...new Set(chartData.map((item:any) => item['name']))];
  //遍历name获取value
  nameArr.forEach((name, index) => {
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
