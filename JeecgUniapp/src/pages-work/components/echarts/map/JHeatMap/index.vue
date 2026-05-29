<template>
  <view class="content">
    <statusTip v-if="pageTips.show" :status="pageTips.status"></statusTip>
    <!-- #ifdef  H5 -->
    <EchartsMap
      v-else
      v-model:option="option"
      v-model:map="mapObject"
      v-model:echartId="echartId"
    />
    <!-- #endif -->

    <!-- #ifdef MP-WEIXIN -->
    <echartsUniapp v-else :option="option" :mapName="mapName" :mapData="mapDataJson"  :chartData="dataSource" :config="config" :id="id"></echartsUniapp>
    <!-- #endif -->

    <!-- #ifdef APP-PLUS -->
    <view class="component-echarts">
      <view
          class="echarts"
          id="heat-echart"
          :prop="option"
          :mapObj="mapObject"
          :change:prop="ModuleInstance.setOption"
          :change:mapObj="ModuleInstance.setMap"
          :style="{ height: `${height}rpx` }"
      ></view>
    </view>
    <!-- #endif -->
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { echartProps } from '@/pages-work/components/echarts/props'
import EchartsMap from '../mapIndex.vue'
import echartsUniapp from "../../index.vue";
import { merge } from 'lodash-es';
import {
  deepMerge,
  handleTotalAndUnit,
  disposeGridLayout,
  getGeoCoordMap,
} from '../../../common/echartUtil'
import useChartHook from '@/pages-work/components/hooks/useEchartMap'
// 定义 props
const props = defineProps({
  ...echartProps,
})
// 定义响应式数据
const option = ref({})
const chartOption = ref({
  geo: {
    map: '',
    itemStyle: {},
  },
  tooltip: {
    textStyle: {
      color: '#fff',
    },
    padding: 5,
    formatter: null,
  },
})
let [
  { dataSource, reload, pageTips, config, mapDataJson,mapName, getAreaCode, city_point },
  {
    queryData,
    registerMap,
    setGeoAreaColor,
    handleTotalAndUnitMap,
    handleCommonOpt,
    queryCityCenter,
    getHeatMapData,
  },
] = useChartHook(props, initOption)
//元素ID
const echartId = ref('')
// 计算属性
const mapObject = computed(() => ({ code: 'heatmap:'+getAreaCode.value, data: mapDataJson.value }))
// 初始化配置选项
async function initOption(data) {
  let chartData = dataSource.value
  let mapName = 'heatmap:'+ await registerMap()
  try {
    // 使用 registerMap 注册的地图名称
    //地图配置
    chartOption.value.tooltip = {
      enterable: true,
      transitionDuration: 1,
      textStyle: {
        color: '#000',
        decoration: 'none',
      },
      trigger: 'item',
      formatter: (params) => {
        let value = params.value || 0
        return `${params.name || '空'}:${value}`
      },
    }
    //使用 registerMap 注册的地图名称
    chartOption.value.geo.map = mapName;
    //配置项修改
    chartOption.value.series = [
      {
        name: '地图',
        type: 'map',
        map: mapName,
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
        data: chartData,
        zlevel: 1,
      },
      {
        name: '数据',
        type: 'heatmap',
        coordinateSystem: 'geo',
        blurSize: config.commonOption?.heat?.blurSize || 20,
        pointSize: config.commonOption?.heat?.pointSize || 15,
        maxOpacity: config.commonOption?.heat?.maxOpacity || 1,
        data: getHeatMapData(chartData),
      },
    ]
    // 合并配置
    if (props.config && props.config.option) {
      merge(chartOption.value, props.config.option)
      chartOption.value = setGeoAreaColor(chartOption.value, props.config)
      chartOption.value = handleTotalAndUnitMap(
        props.compName,
        chartOption.value,
        props.config,
        chartData,
      )
      chartOption.value = handleCommonOpt(chartOption.value)
    }

    //如果视觉映射未设置最大值，就计算数据的最大值并赋值
    if(chartOption.value?.visualMap?.max === 0 && chartData.length>0){
      let maxValue = chartData.reduce((max, data) => Math.max(max, data.value), chartData[0].value);
      chartOption.value.visualMap.max = maxValue;
    }
    if (chartOption.value?.visualMap?.top) {
      chartOption.value.visualMap.top = '1%';
      chartOption.value.visualMap.bottom = '1%';
    }
    setTimeout(() => {
      option.value = { ...chartOption.value }
      pageTips.show = false
      echartId.value = props.i
    }, 300)
    if (dataSource.value && dataSource.value.length === 0) {
      pageTips.status = 1
      pageTips.show = true
    }
  } catch (e) {
    console.log('热力地图报错', e)
  }
}

// 挂载时查询数据
onMounted(async () => {
  await queryCityCenter()
  await queryData()
})
defineExpose({
  queryData
});
</script>

<!-- #ifdef APP-PLUS -->
<script module="ModuleInstance" lang="renderjs">
export default {
  data() {
    return {
      myChart: null,
      heatEchart: null,
      mapData: null,
    };
  },
  methods: {
    // 初始化 ECharts
    initEchart() {
      if (this.myChart) return; // 避免重复初始化

      // 1. 获取 DOM 元素（APP 端可以直接用 document.getElementById）
      const dom = document.getElementById(this.echartId || 'heat-echart');

      if (!dom) {
        console.error("热力地图 DOM 元素未找到！");
        return;
      }

     if (this.mapData.code) {
      // 2. 初始化 ECharts
       this.myChart = echarts.init(dom);
		// 3. 注册地图数据（如果有）
       this.heatEchart.registerMap(this.mapData.code, this.mapData.data);
     }

      // 4. 设置图表配置
      this.myChart.setOption(this.option || {});

      // 5. 监听窗口变化，自动调整大小
      window.addEventListener('resize', () => this.myChart.resize());
    },
    // 更新 option
    setOption(newValue) {
      if (!this.myChart) {
        this.initEchart(); // 如果未初始化，先初始化
        return;
      }
      this.myChart.setOption(newValue || {});
    },

    // 设置地图数据
    setMap(newValue) {
      this.mapData = newValue;
      if (this.myChart && this.mapData) {
        this.heatEchart.registerMap(this.mapData.code, this.mapData.data);
        this.myChart.setOption(this.option || {});
      }else{
		this.initEchart();
	  }
    }
  },
  mounted() {
    // 确保 ECharts 已加载
    if (this.heatEchart === null) {
      const script = document.createElement('script');
      script.src = 'uni_modules/lime-echart/static/echarts.js';
      script.onload = () => {
         this.heatEchart = echarts; // 挂载到window
         this.initEchart();
	    };
      document.head.appendChild(script);
    } else {
      this.initEchart();
    }
  },
  beforeDestroy() {
    // 销毁图表，防止内存泄漏
    if (this.myChart) {
      this.myChart.dispose();
      window.removeEventListener('resize', () => this.myChart.resize());
    }
  }
};
</script>
<!-- #endif -->

<style  lang="scss"  scoped>
.content {
  margin: 5px;
}
.component-echarts {
  width: 100%;
  .echarts {
    width: 100%;
    min-height: 300px;
  }
}
</style>
