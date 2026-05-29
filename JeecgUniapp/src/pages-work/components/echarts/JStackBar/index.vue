<template>
  <view class="content">
    <statusTip v-if="pageTips.show" :status="pageTips.status"></statusTip>
    <echartsUniapp v-else :option="option" :chartData="dataSource" :config="config" :id="id"></echartsUniapp>
  </view>
</template>

<script lang="ts" setup>
import { echartProps } from '@/pages-work/components/echarts/props'
import {
  deepMerge,
  handleTotalAndUnit,
  disposeGridLayout,
  getCustomColor,
  getDataSet, setLegendTop, commonOption,
} from '../../common/echartUtil'
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
//最终图表配置项
const option = ref({})
let chartOption = {
  title: {
    show: true,
  },
  legend: {
    show: true,
    data: [],
  },
  xAxis: {
    type: 'category',
  },
  yAxis: {
    type: 'value',
  },
  series: [],
  dataset: {
    dimensions: [],
    source: [],
  },
}
//图表数据查询
let [{ dataSource, reload, pageTips, config }, { queryData }] = useChartHook(props, initOption)

//初始化图表配置项
function initOption(data) {
  let chartData: any = dataSource.value
  if (typeof chartData === 'string') {
    chartData = JSON.parse(chartData)
  }
  if (chartData && chartData.length > 0) {
    const colors = getCustomColor(config.option.customColor)
    let configOption = config.option
    let dataset = getDataSet(chartData, config)
    let label =
      configOption.series.length > 0 && configOption.series[0].label
        ? configOption.series[0].label
        : {}
    chartOption.dataset = dataset
    chartOption.series = []
    dataset.dimensions.forEach((series, index) => {
      if (index > 0) {
        let legengColor =
          configOption.series.length > 0 && configOption.series[0].color
            ? configOption.series[0].color[index - 1]
            : null
        let color = colors && colors[index - 1] ? colors[index - 1].color : ''
        chartOption.series.push({
          type: 'bar', //TODO 自定义图表类型
          stack: 'stack', //TODO 自定义堆叠分组
          color: legengColor || color, //TODO 自定义颜色
          series: series, //TODO 系列，冗余数据，只是table展示使用
          label: label,
        })
      }
    })
    chartOption.legend.data = chartOption.series.map((item) => item.series)
    //2.类目轴和数值轴赋值
    if (config.option.xAxis && config.option.xAxis.type) {
      let type = config.option.xAxis['type'] == 'value' ? 'category' : 'value'
      chartOption.yAxis['type'] = type
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

onMounted(() => {
  queryData()
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
