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
    r: 0,
    data: ['文综', '理综'],
  },
  radar: [
    {
      shape: 'circle',
      indicator: [],
    },
  ],
  series: [
    {
      type: 'radar',
      data: [
        {
          value: [],
          name: '',
        },
      ],
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
    //最大值
    const maxValue = Math.max(...chartData.map(({ value }) => value))
    //图例类型
    let typeArr = Array.from(new Set(chartData.map((item) => item.type)))
    //雷达数据
    let indicator = Array.from(
      new Set(
        chartData.map((item) => {
          let { name, max } = item
          return { name, max: max ? max : maxValue }
        }),
      ),
    )
    let data = []
    const colors = getCustomColor(config.option.customColor)
    //设置配色
    typeArr.forEach((type, index) => {
      let obj = { name: type, itemStyle: { color: colors[index].color || null } }
      let chartArr = chartData.filter((item) => type === item.type)
      obj['value'] = chartArr.map((item) => item.value)
      //data数据
      data.push(obj)
    })
    chartOption.radar[0].indicator = indicator
    chartOption.legend['data'] = typeArr
    chartOption.series[0]['data'] = data
    //中心坐标
    chartOption.radar[0].center = [
      (config.option.grid.left || 50) + '%',
      (config.option.grid.top || 50) + '%',
    ]

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
