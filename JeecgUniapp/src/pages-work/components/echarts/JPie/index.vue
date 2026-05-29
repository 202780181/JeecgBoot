<template>
  <view class="content">
    <statusTip v-if="pageTips.show" :status="pageTips.status"></statusTip>
    <echartsUniapp v-else :option="option" :chartData="dataSource" :config="config" :id="id" ></echartsUniapp>
  </view>
</template>

<script lang="ts" setup>
import { echartProps } from '@/pages-work/components/echarts/props'
import {
  deepMerge,
  handleTotalAndUnit,
  setLegendTop,
  commonOption,
  disposeGridLayout,
  getCustomColor,
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
  legend: {
    show: true,
    data: [],
  },
  tooltip: {
    formatter: (params) => {
      return `${params.name || '空'}:${params.value}`
    },
  },
  series: [
    {
      type: 'pie',
      radius: '72%',
      center: ['50%', '55%'],
      data: [],
      labelLine: { show: true },
      label: {
        show: false,
        position: 'outside',
        formatter: '{b} \n ({d}%)',
        color: '#B1B9D3',
      },
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
    const colors = getCustomColor(config.option.customColor)
    //设置配色
    chartData = chartData.map((item, index) => {
      let legendColor = config.option?.series[0].color ? config.option?.series[0]?.color[index] : null
      return {
        ...item,
        itemStyle: { color: legendColor || colors[index]?.color || null },
      }
    })
    chartOption.series[0].data = chartData
    chartOption.series[0].roseType = config.option.isRose ? 'radius' : ''
    chartOption.series[0].label.position = config.option.pieLabelPosition || 'outside'
    chartOption.series[0].center = [
      (config.option.grid.left || 50) + '%',
      (config.option.grid.top || 50) + '%',
    ]
    // 合并配置
    if (props.config && config.option) {
      merge(chartOption, config.option)
      setLegendTop(chartOption, config)
      chartOption['tempData'] = chartData;
      chartOption = commonOption(chartOption, config)
      chartOption = handleTotalAndUnit(props.compName, chartOption, config, chartData)
      option.value = deepClone(chartOption)
      console.log("饼状图option",chartOption)
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
