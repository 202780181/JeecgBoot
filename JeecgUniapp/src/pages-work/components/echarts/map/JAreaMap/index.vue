<template>
  <view class="content">
    <statusTip v-if="pageTips.show" :status="pageTips.status"></statusTip>
    <!-- #ifdef H5 -->
    <EchartsMap v-else v-model:option="option" v-model:map="mapObject" v-model:echartId="echartId" />
    <!-- #endif -->

    <!-- #ifdef MP-WEIXIN || APP-PLUS  -->
    <echartsUniapp v-else :option="option" :mapName="mapName" :mapData="mapDataJson" :chartData="dataSource" :config="config" :id="id"></echartsUniapp>
    <!-- #endif -->
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { echartProps } from '@/pages-work/components/echarts/props'
import EchartsMap from "../mapIndex.vue";
import echartsUniapp from "../../index.vue";
import { deepMerge, handleTotalAndUnit, disposeGridLayout } from '../../../common/echartUtil';
import useChartHook from '@/pages-work/components/hooks/useEchartMap'
import {merge} from "lodash-es";
import {deepClone} from "wot-design-uni/components/common/util";
// 定义 props
const props = defineProps({
  ...echartProps
});
// 定义响应式数据
const option = ref({});
const chartOption = ref({
  geo: {
    map: '',
    itemStyle: {},
  },
  tooltip: {
    textStyle: {
      color: "#fff"
    },
    padding: 5,
    formatter: null
  }
});
const mapName = ref("");
let [{ dataSource, reload, pageTips, config,mapDataJson,getAreaCode }, { queryData,registerMap,setGeoAreaColor,handleTotalAndUnitMap,handleCommonOpt }] = useChartHook(props, initOption)
const echartId = ref("");
// 计算属性
const mapObject = computed(() => ({ code: getAreaCode.value, data: mapDataJson.value }));
// 初始化配置选项
async function initOption(){
  let chartData = dataSource.value;
  mapName.value = await registerMap();
  try {
    // 使用 registerMap 注册的地图名称
    chartOption.value.geo.map = mapName.value;
    // series 配置数据顺序调整后需要调整视觉映射属性 seriesIndex, seriesIndex 对应数据配置
    chartOption.value.series = [
      {
        name: '地图',
        type: 'map',
        map: mapName.value,
        geoIndex: 0,
        aspectScale: 0.75, // 长宽比
        showLegendSymbol: false, // 存在 legend 时显示
        label: {
          show: true,
          color: '#000',
        },
        emphasis: {
          show: true,
          color: '#000',
          itemStyle: {
            areaColor: '#2B91B7',
          },
        },
        roam: true,
        itemStyle: {
          areaColor: '#3B5077',
          borderColor: '#3B5077',
        },
        animation: true,
        data: chartData && chartData.length > 0 ? chartData : [],
        zlevel: 1,
      }
    ];
    // 合并配置
    if (props.config && props.config.option) {
      merge(chartOption.value, props.config.option);
      chartOption.value = setGeoAreaColor(chartOption.value, props.config);
      chartOption.value = handleTotalAndUnitMap(props.compName, chartOption.value, props.config, chartData);
      chartOption.value = handleCommonOpt(chartOption.value);
      setTimeout(() => {
        // update-begin-author:liaozhiyang date:2023-11-30 for:【QQYUN-7226】地图数据不正确及 tooltip 颜色相近
        chartOption.value.tooltip.textStyle.color = '#fff';
        chartOption.value.tooltip.padding = 5;
        chartOption.value.tooltip.formatter = (data) => {
          if (data.data) {
            return `${data.name}<br>${data.value[data.value.length - 1]}`;
          } else {
            return null;
          }
        };
        // update-begin-author:liaozhiyang date:2023-11-30 for:【QQYUN-7226】地图数据不正确及 tooltip 颜色相近
        option.value = deepClone(chartOption.value);
        console.log("区域地图option.value", option.value);
        pageTips.show = false;
        echartId.value = props.i
      }, 300);
    }
    if (dataSource.value && dataSource.value.length === 0) {
      pageTips.status = 1;
      pageTips.show = true;
    }
  } catch (e) {
    console.log("区域地图报错", e);
  }
};

// 挂载时查询数据
onMounted(() => {
  queryData();
});
defineExpose({
  queryData
});
</script>

<style lang="scss"  scoped>
.content {
  margin: 5px;
}
</style>
