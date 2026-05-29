<template>
  <view class="content">
    <statusTip v-if="pageTips.show" :status="pageTips.status"></statusTip>
    <!-- #ifdef H5 -->
    <EchartsMap v-else v-model:option="option" v-model:map="mapObject" v-model:echartId="echartId" />
    <!-- #endif -->

    <!-- #ifdef MP-WEIXIN || APP-PLUS -->
    <echartsUniapp v-else :option="option" :mapName="mapName" :mapData="mapDataJson" :chartData="dataSource" :config="config" :id="id"></echartsUniapp>
    <!-- #endif -->
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { echartProps } from '@/pages-work/components/echarts/props'
import EchartsMap from "../mapIndex.vue";
import echartsUniapp from "../../index.vue";
import useChartHook from '@/pages-work/components/hooks/useEchartMap'
import { merge } from 'lodash-es';
import {isArray} from "@/utils/is";
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
let [{ dataSource, reload, pageTips, config,mapDataJson,getAreaCode },
  { queryData,registerMap,setGeoAreaColor,handleTotalAndUnitMap,handleCommonOpt,getConvertData }] = useChartHook(props, initOption)
const echartId = ref("");
// 计算属性
const mapObject = computed(() => ({ code: getAreaCode.value, data: mapDataJson.value }));
// 初始化配置选项
async function initOption(data){
  let chartData = dataSource.value;
  mapName.value = await registerMap();
  try {
    //地图配置
    chartOption.value.tooltip = {
      enterable: true,
      transitionDuration: 1,
      textStyle: {
        color: '#000',
        decoration: 'none',
      },
      trigger: 'item',
      formatter: (params)=>{
        let value = params?.value ?isArray(params.value)?params.value[2]:params.value : 0;
        return `${params.seriesName} <br/> ${params.name}:   ${value}`;
      },
    };
    //使用 registerMap 注册的地图名称
    chartOption.value.geo.map = mapName.value;
    // update-begin--author:liaozhiyang---date:20241029---for：【TV360X-2800】大屏改造成暗黑效果
    // 解决区域高亮颜色选择不生效
    merge(chartOption.value.geo, props.config.option.geo);
    // update-end--author:liaozhiyang---date:20241029---for：【TV360X-2800】大屏改造成暗黑效果
    //series配置数据顺序调整后需要调整视觉映射属性seriesIndex,seriesIndex对应数据配置
    chartOption.value.series = [
      {
        name: '数据',
        type: props.config.option?.area?.markerType,
        coordinateSystem: 'geo',
        data: chartData && chartData.length>0 ? getConvertData(
            chartData
                .sort(function (a, b) {
                  return b.value - a.value;
                })
                .slice(0, (config.option?.area?.markerCount || 0) > 0 ? config.option?.area.markerCount : chartData.length)
        ):[],
        symbol: config.option?.area?.markerShape || 'circle',
        symbolSize: function (val) {
          return  config.option?.area?.markerSize && config.option?.area?.markerSize>20 ? config.option?.area?.markerSize : 20;
        },
        showEffectOn: 'render',
        //涟漪配置
        rippleEffect: {
          brushType: 'stroke',
        },
        label: {
          position:  config.option?.area?.scatterLabelPosition || 'top',
          show:  config.option?.area?.scatterLabelShow || false,
          color: config.option?.area?.scatterLabelColor || '#ffffff',
          fontSize: config.option?.area?.scatterFontSize || 12,
          formatter: (params)=>{
            if (isArray(params.value)){
              return `${params.name || ''}:${params.value[2]}`;
            }
            return `${params.name || '空'}:${params.value}`;
          }
        },
        emphasis: {
          show: false,
        },
        animation: true,
        itemStyle: {
          color: config?.option?.area?.markerColor || 'auto',
          shadowColor: config?.option?.area?.shadowColor  || 'auto',
          opacity: config?.option?.area?.markerOpacity,
        },
      },
      {
        name: '地图',
        type: 'map',
        map: mapName.value,
        geoIndex: 0,
        aspectScale: 0.75, //长宽比
        showLegendSymbol: false, // 存在legend时显示
        label: {
          show: true,
          color: '#000',
        },
        emphasis: {
          show: true,
          color: '#000',
          itemStyle:{
            areaColor: '#2B91B7',
          }
        },
        roam: true,
        itemStyle: {
          areaColor: '#3B5077',
          borderColor: '#3B5077',
        },
        animation: true,
        data: chartData && chartData.length>0 ?chartData:[],
        zlevel: 1,
      },
    ];
    // 合并配置
    if (props.config && props.config.option) {
      merge(chartOption.value, props.config.option);
      chartOption.value = setGeoAreaColor(chartOption.value, props.config);
      chartOption.value = handleTotalAndUnitMap(props.compName, chartOption.value, props.config, chartData);
      chartOption.value = handleCommonOpt(chartOption.value);
      setTimeout(() => {
        option.value = { ...chartOption.value };
        console.log("散点地图最终的option.value", option.value);
        pageTips.show = false;
        echartId.value = props.i
      }, 300);
    }
    if (dataSource.value && dataSource.value.length === 0) {
      pageTips.status = 1;
      pageTips.show = true;
    }
  } catch (e) {
    // TODO handle the exception
    console.log("散点地图报错", e);
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

<style  lang="scss"  scoped>
.content {
  margin: 5px;
}
</style>
