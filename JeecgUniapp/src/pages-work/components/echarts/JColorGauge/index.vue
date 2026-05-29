<template>
  <view class="content">
    <statusTip v-if="pageTips.show" :status="pageTips.status"></statusTip>
    <echartsUniapp v-else :option="option" :chartData="dataSource" :config="config" :id="id" ></echartsUniapp>
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
  title: {
    show: true,
  },
  series: [
    {
      type: 'gauge',
      anchor: {
        show: true,
        showAbove: true,
        size: 18,
        itemStyle: {
          color: '#FAC858',
        },
      },
      pointer: {
        icon: 'path://M2.9,0.7L2.9,0.7c1.4,0,2.6,1.2,2.6,2.6v115c0,1.4-1.2,2.6-2.6,2.6l0,0c-1.4,0-2.6-1.2-2.6-2.6V3.3C0.3,1.9,1.4,0.7,2.9,0.7z',
        width: 8,
        length: '80%',
        offsetCenter: [0, '8%'],
        itemStyle: {
          color: 'auto',
        },
      },
      axisLine: {
        roundCap: true,
        lineStyle: {
          width: 10,
          color: [
            [0.25, '#FF6E76'],
            [0.5, '#FDDD60'],
            [1, '#58D9F9'],
          ],
        },
      },
      data: [],
      title: {
        fontSize: 14,
      },
      detail: {
        width: 40,
        height: 14,
        fontSize: 14,
        color: '#fff',
        backgroundColor: 'inherit',
        borderRadius: 3,
        formatter: '{value}%',
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
    chartOption.series[0].data = chartData
    // 合并配置
    if (props.config && config.option) {
      merge(chartOption, config.option)
      chartOption = handleTotalAndUnit(props.compName, chartOption, config, chartData)
      chartOption.tooltip.formatter = '{b} : {c}'
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
