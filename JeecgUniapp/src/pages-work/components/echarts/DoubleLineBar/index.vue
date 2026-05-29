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
  commonOption,
  setLegendTop,
} from '../../common/echartUtil'
import { isNumber } from '@/utils/is'
import useChartHook from '@/pages-work/components/hooks/useEchart'
import { deepClone } from '@/uni_modules/da-tree/utils'
import echartsUniapp from '@/pages-work/components/echarts/index.vue'
import statusTip from '@/pages-work/components/statusTip.vue'
import { merge } from 'lodash-es'
//组件传参
const props = defineProps({
  ...echartProps,
})
//最终图表配置项
const option = ref({})
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
    nameGap: 25,
    data: [],
  },
  yAxis: [
    { type: 'value', alignTicks: true, axisLine: { show: true } },
    { type: 'value', alignTicks: true, axisLine: { show: true } },
  ],
  graphic: {
    type: 'text',
    right: 0,
    top: 0,
    style: {
      text: '',
      fill: '#464646',
      font: 'bolder 18px "Microsoft YaHei", sans-serif',
    },
  },
  series: [],
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
    initChartDataAxis(chartData)
    const colors = getCustomColor(config.option.customColor)
    let configOption = config.option
    let leftChartType =
      configOption.yAxis && configOption.yAxis.length > 0 ? configOption.yAxis[0].chartType : 'bar'
    //@ts-ignore
    let legendData = [...new Set(chartData.map((item) => item.type))]
    chartOption.series = []
    legendData.forEach((legend, index) => {
      //图例颜色
      let legendColor =
        configOption.series.length > 0 && configOption.series[0].color
          ? configOption.series[0].color[index]
          : null
      //1.获取类型
      let allData = chartData.filter((item) => item.type == legend)
      //2.获取数据
      let leftData = allData.filter(
        (item) => !item.yAxisIndex || (item.yAxisIndex && item.yAxisIndex == '0'),
      )
      let rightData = allData.filter((item) => item.yAxisIndex && item.yAxisIndex == '1')
      //3.设置数据
      //左y轴
      let seriesType = config.seriesType.filter((item) => item.series == legend)
      let type = seriesType && seriesType.length > 0 ? seriesType[0]['type'] : 'bar'
      if (leftData && leftData.length > 0) {
        chartOption.series.push({
          name: legend,
          type: type || 'bar',
          data: leftData.map((item) => item['value']),
          color: legendColor || colors[index]?.color || '',
          yAxisIndex: 0,
        })
      }
      //右y轴
      if (rightData && rightData.length > 0) {
        chartOption.series.push({
          name: legend,
          type: type || 'line',
          data: rightData.map((item) => item['value']),
          color: legendColor || colors[index]?.color || '',
          yAxisIndex: 1,
        })
      }
    })
    //@ts-ignore
    chartOption.xAxis.data = [...new Set(chartData.map((item) => item.name))]
    chartOption.legend.data = legendData
    // 合并配置
    if (props.config && config.option) {
      merge(chartOption, config.option)
      // 同步标题配置
      if (props.config && props.config.option) {
        let title = props.config.option.title
        let color = title?.textStyle?.color || '#000'
        let weight = title?.textStyle?.fontWeight || 'normal'
        let fontSize = title?.textStyle?.fontSize || '14'
        let compStyleConfig = props.config?.compStyleConfig
        //update-begin-author:liusq---date:2025-01-10--for: QQYUN-10717 双轴图 右侧Y轴如何调整上下边距
        if (compStyleConfig && compStyleConfig?.assist && compStyleConfig?.assist?.summary) {
          let assistSummary = compStyleConfig?.assist?.summary
          chartOption.graphic.top = assistSummary?.top || 0
          chartOption.graphic.right = assistSummary?.right || 0
        }
        //update-end-author:liusq---date:2025-01-10--for:  QQYUN-10717 双轴图 右侧Y轴如何调整上下边距
        chartOption.graphic.style = {
          text: '',
          fill: color,
          font: `${weight} ${fontSize}px "Microsoft YaHei", sans-serif`,
        }
      }
      // 处理样式
      if (props.config?.option) {
        chartOption.series.forEach((item) => {
          if (item.type == 'bar') {
            Object.assign(item, {
              barWidth: config?.option?.barWidth || 15,
              itemStyle: {
                borderRadius: config?.option?.borderRadius || 0,
              },
            })
          } else {
            Object.assign(item, {
              symbol: config?.option?.symbol || 'emptyCircle',
              symbolSize: config?.option?.symbolSize || 4,
              lineStyle: {
                width: config?.option?.lineWidth || 1,
              },
              lineType: config?.option?.lineType || 'line',
              smooth: config?.option?.lineType && config?.option?.lineType !== 'line',
              areaStyle:
                config?.option?.lineType == 'area'
                  ? {
                      opacity:
                        config?.option?.areaStyleOpacity || config?.option?.areaStyleOpacity == 0
                          ? config?.option?.areaStyleOpacity
                          : 0.5,
                    }
                  : null,
            })
          }
        })
      }
      setLegendTop(chartOption, config)
      //临时数据赋值，方便后续计算辅助线
      chartOption['tempData'] = chartData
      chartOption['tempCompName'] = 'DoubleLineBar'
      commonOption(chartOption, config)
      chartOption = handleTotalAndUnit(props.compName, chartOption, config, chartData)
      chartOption = disposeGridLayout(props.compName, chartOption, config, chartData)
      let title = config.option.title
      let color = title.textStyle.color || '#000'
      let weight = title.textStyle.fontWeight || 'normal'
      let fontSize = title.textStyle.fontSize || '14'
      chartOption.graphic.style = {
        text: '',
        fill: color,
        font: `${weight} ${fontSize}px "Microsoft YaHei", sans-serif`,
      }
    }
    console.log('双轴图this.chartOption====>', chartOption)
    option.value = deepClone(chartOption)
    pageTips.show = false
  } else {
    pageTips.status = 1
    pageTips.show = true
  }
}
/**
 * 初始化数据坐标轴信息
 * @param chartData
 */
function initChartDataAxis(chartData) {
  let seriesTypeArr = props.config.seriesType || []
  if (seriesTypeArr && seriesTypeArr.length > 0) {
    chartData.forEach((data) => {
      if (!data?.yAxisIndex) {
        let find = seriesTypeArr.find((item) => item.series == data.type)
        if (find && find?.yIndex) {
          data['yAxisIndex'] = find.yIndex
        }
      }
    })
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
