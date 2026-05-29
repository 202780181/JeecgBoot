<template>
  <view class="content">
    <statusTip v-if="pageTips.show" :status="pageTips.status"></statusTip>
	<echartsUniapp v-else :option="option" :chartData="dataSource" :config="config" :id="id" ></echartsUniapp>
  </view>
</template>

<script lang="ts" setup>
import { echartProps } from '@/pages-work/components/echarts/props';
import {deepMerge, handleTotalAndUnit, disposeGridLayout, getRandomColor} from '../../common/echartUtil';
import {isNumber, isObject} from '@/utils/is';
import useChartHook from '@/pages-work/components/hooks/useEchart';
import { deepClone } from '@/uni_modules/da-tree/utils';
import echartsUniapp from '@/pages-work/components/echarts/index.vue';
import statusTip from '@/pages-work/components/statusTip.vue';
import {merge} from "lodash-es";
//组件传参
const props = defineProps({
	...echartProps
})

//最终图表配置项
const option = ref({});
let chartOption = {
    title: {
        show: true,
    },
    legend: {
        show: true,
        data: [],
        bottom: '5%',
    },
    xAxis: {
        type: 'category',
    },
    yAxis: {
        type: 'value',
    },
    series: []
}
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
      //1.将{name，type，value}转换成dataset
      let configOption = config.option;
      let dataset = getDataset(chartData);
      chartOption.series = [];
      let series = configOption.series&&configOption.series.length>0?JSON.parse(JSON.stringify(configOption.series[0])):{};
      dataset.dimensions.forEach((name, index) => {
          let hasCustom = configOption.customColor && configOption.customColor.length>0 && configOption.customColor[index];
          let color = hasCustom ? configOption.customColor[index].color : getRandomColor(index);
          let edgeColor = isObject(color) ? `rgb(${color.r},${color.g},${color.b})` : color;
          chartOption.series.push({
              type: 'scatter',
              name,
              data:dataset.source[index],
              symbolSize: 30,
              ...series,
              itemStyle: {
                  shadowBlur: 10,
                  shadowColor: 'rgba(25, 100, 150, 0.5)',
                  shadowOffsetY: 5,
                  color: {
                      type: 'radial',
                      x: 0.4,
                      y: 0.3,
                      r: 1,
                      colorStops: [
                          {
                              offset: 0,
                              color: 'rgb(255, 255, 255)', // 0% 处的颜色
                          },
                          {
                              offset: 1,
                              color: edgeColor, // 100% 处的颜色
                          },
                      ],
                  },
              },
          });
      });

      chartOption.legend.data = chartOption.series.map((item) => item.name);

      if(config.option.xAxis && config.option.xAxis.type){
          chartOption.yAxis['type'] = config.option.xAxis['type'] =='value'?'category':'value';
      }
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

function getDataset(chartData) {
    let dataObj = { dimensions: [], source: [] };
    let dataList = [];
    //获取系列
    let typeArr = new Set(chartData.map((item) => item['type']));
    let dimensions = [ ...typeArr];
    typeArr.forEach(type=>{
        let arr = chartData.filter((item) => item.type == type).map(item=>{
            return [item.name,item.value]
        });
        dataList.push(arr)
    })
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
