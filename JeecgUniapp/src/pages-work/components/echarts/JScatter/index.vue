<template>
  <view class="content">
    <statusTip v-if="pageTips.show" :status="pageTips.status"></statusTip>
    <echartsUniapp v-else :option="option" :chartData="dataSource" :config="config" :id="id"></echartsUniapp>
  </view>
</template>

<script lang="ts" setup>
import { echartProps } from '@/pages-work/components/echarts/props'
import { deepMerge, handleTotalAndUnit, disposeGridLayout } from '../../common/echartUtil'
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
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'shadow',
      label: {
        show: true,
        backgroundColor: '#333',
      },
    },
  },
  legend: {
    bottom: '5%',
  },
  xAxis: {},
  yAxis: {
    type: 'value',
  },
  series: [
    {
      type: 'scatter',
      data: [],
    },
  ],
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
    //显示坐标轴前几项
    if (config.dataFilterNum && isNumber(config.dataFilterNum)) {
      chartData = chartData.slice(0, config.dataFilterNum)
    }
    let seriesData = chartData.map((item) => {
      return item.value
    })
    let xAxisData = chartData.map((item) => {
      return item.name
    })
    chartOption.series[0].data = seriesData
    if (config.option.xAxis && config.option.xAxis.type) {
      let type = config.option.xAxis['type'] == 'value' ? 'category' : 'value'
      chartOption.yAxis['type'] = type
    }
    if (chartOption.yAxis.type == 'category') {
      chartOption.yAxis.data = xAxisData
    } else {
      chartOption.xAxis.data = xAxisData
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
