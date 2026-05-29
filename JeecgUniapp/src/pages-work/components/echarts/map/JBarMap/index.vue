<template>
  <view class="content">
    <statusTip v-if="pageTips.show" :status="pageTips.status"></statusTip>
    <!-- #ifdef H5 -->
    <EchartsH5 v-else :option="option" :map="mapObject" :echartId="echartId" />
    <!-- #endif -->

    <!-- #ifdef MP-WEIXIN -->
    <echartsUniapp v-else :option="option" :mapName="mapName" :mapData="mapDataJson" :chartData="dataSource" :config="config" :id="id"></echartsUniapp>
    <!-- #endif -->


    <!-- #ifdef APP-PLUS -->
    <view class="component-echarts">
      <view
          class="echarts"
          id="bar-map-chart"
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
import { ref, computed, onMounted } from 'vue';
import { echartProps } from '@/pages-work/components/echarts/props'
import EchartsH5 from "../mapIndex.vue";
import echartsUniapp from "../../index.vue";
import {deepMerge, handleTotalAndUnit, disposeGridLayout, getGeoCoordMap} from '../../../common/echartUtil'
import useChartHook from '@/pages-work/components/hooks/useEchartMap'
import {merge} from "lodash-es";
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
let [{ dataSource, reload, pageTips, config,mapDataJson,getAreaCode,city_point },
  { queryData,registerMap,setGeoAreaColor,handleTotalAndUnitMap,handleCommonOpt,queryCityCenter}] = useChartHook(props, initOption)
const echartId = ref("");
// 地图属性
const mapObject = computed(() => ({ code: 'barmap:'+getAreaCode.value, data: mapDataJson.value }));

// 初始化配置选项
let geoCoordMap = {};
async function initOption(data){
  let chartData = dataSource.value;
  mapName.value = 'barmap:'+ await registerMap();
  try {
    // 使用 registerMap 注册的地图名称
    geoCoordMap = getGeoCoordMap(mapDataJson.value);
    chartOption.value.geo.map = mapName.value;
    let barSize = config?.commonOption?.barSize || 17;
    let barColor = config?.commonOption?.barColor || '#F8E71C';
    let barColor2 = config?.commonOption?.barColor2 || '#F8E71C';
    chartOption.value.series = [
      {
        geoIndex: 0,
        // coordinateSystem: 'geo',
        showLegendSymbol: false,
        type: 'map',
        roam: true,
        label: {
          show: false,
          color: '#ffffff',
        },
        emphasis: {
          color: 'white',
          show: false,
          itemStyle:{
            areaColor: '#FA8C16',
            borderWidth: 0,
            color: 'green',
          }
        },
        itemStyle: {
          borderColor: '#2980b9',
          borderWidth: 1,
          areaColor: '#12235c',
        },
        map: mapName, // 使用
        animation: true,
        data: chartData,
      },
      {
        type: 'lines',
        zlevel: 5,
        geoIndex: 0,
        effect: {
          show: false,
          symbolSize: 5, // 图标大小
        },
        lineStyle: {
          width: barSize, // 尾迹线条宽度
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              {
                offset: 0,
                color: barColor, // 0% 处的颜色
              },
              {
                offset: 0.5,
                color: barColor, // 0% 处的颜色
              },
              {
                offset: 0.5,
                color: barColor2, // 0% 处的颜色
              },
              {
                offset: 1,
                color: barColor2, // 0% 处的颜色
              },
              {
                offset: 1,
                color: barColor, // 100% 处的颜色
              },
            ],
            global: false, // 缺省为 false
          },
          opacity: 1, // 尾迹线条透明度
          curveness: 0, // 尾迹线条曲直度
        },
        label: {
          show: 0,
          position: 'end',
          formatter: '245',
        },
        silent: true,
        data: lineData(chartData),
      },
      {
        type: 'scatter',
        coordinateSystem: 'geo',
        geoIndex: 0,
        zlevel: 2,
        label: {
          show: false,
          position: 'bottom',
          formatter: (params) => {
            return data[params.dataIndex]?.value
          },
          padding: [4, 8],
          backgroundColor: '#003F5E',
          borderRadius: 5,
          borderColor: '#67F0EF',
          borderWidth: 1,
          color: '#67F0EF',
        },
        symbol: 'diamond',
        symbolSize: [barSize - 1, 8],
        itemStyle: {
          color: barColor,
          opacity: 1,
        },
        silent: true,
        data: scatterData(chartData),
      },
      {
        type: 'scatter',
        coordinateSystem: 'geo',
        geoIndex: 0,
        zlevel: 1,
        label: {
          formatter: '{b}',
          position: 'bottom',
          color: '#fff',
          fontSize: 11,
          distance: 10,
          show: false,
        },
        symbol: 'diamond',
        symbolSize: [barSize - 1, 8],
        itemStyle: {
          // color: '#F7AF21',
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              {
                offset: 0,
                color: barColor, // 0% 处的颜色
              },
              {
                offset: 0.5,
                color: barColor, // 0% 处的颜色
              },
              {
                offset: 0.5,
                color: barColor2, // 0% 处的颜色
              },
              {
                offset: 1,
                color: barColor2, // 0% 处的颜色
              },
              {
                offset: 1,
                color: barColor, // 100% 处的颜色
              },
            ],
            global: false, // 缺省为 false
          },
          opacity: 1,
          // shadowColor: '#fff',
          // shadowBlur: 5,
          // shadowOffsetY: 2
        },
        silent: true,
        data: scatterData2(chartData),
      },
    ];
    // 合并配置
    if (props.config && props.config.option) {
      merge(chartOption.value, props.config.option);
      chartOption.value = setGeoAreaColor(chartOption.value, props.config);
      chartOption.value = handleTotalAndUnitMap(props.compName, chartOption.value, props.config, chartData);
      chartOption.value = handleCommonOpt(chartOption.value);
      setTimeout(() => {
        pageTips.show = false
        echartId.value = props.i
        option.value = { ...chartOption.value };
        console.log("柱形地图option.value", option.value);
      }, 300);
    }
    if (dataSource.value && dataSource.value.length === 0) {
      pageTips.status = 1;
      pageTips.show = true;
    }
  } catch (e) {
    console.log("柱形地图报错", e);
  }
};
// 动态计算柱形图的高度（定一个max）
function lineMaxHeight(chartData) {
  const maxValue = Math.max(...chartData.map((item) => item.value));
  return maxValue < 10 ? maxValue : 1 / maxValue;
}

// 柱状体的主干
function lineData(chartData) {
  let lineData = [];
  chartData.forEach((item) => {
    let geoCoord = city_point.value[item.name];
    if (geoCoord) {
      let coords = [geoCoord, [geoCoord[0], geoCoord[1] + item.value * lineMaxHeight(chartData)]];
      lineData.push({
        coords: coords,
      });
    }
  });
  return lineData;
}

// 柱状体的顶部
function scatterData(chartData) {
  let scatterData = [];
  chartData.forEach((item) => {
    let geoCoord = city_point.value[item.name];
    if (geoCoord) {
      scatterData.push([geoCoord[0], geoCoord[1] + item.value * lineMaxHeight(chartData)]);
    }
  });
  return scatterData;
}

// 柱状体的底部
function scatterData2(chartData) {
  let scatterData2 = [];
  chartData.forEach((item) => {
    let geoCoord = city_point.value[item.name];
    if (geoCoord) {
      scatterData2.push({
        name: item.name,
        value: geoCoord,
      })
    }
  });
  return scatterData2;
}

// 挂载时查询数据
onMounted(async () => {
  await queryCityCenter()
  await queryData();
});
defineExpose({
  queryData
});
</script>

<!-- #ifdef APP-PLUS -->
<script module="ModuleInstance" lang="renderjs">
export default {
  data() {
    return {
      barMapChart: null,
      mapData: null,
	  myBarEchart: null,
    };
  },
  methods: {
    // 初始化 ECharts
    initEchart() {
      if (this.barMapChart) return; // 避免重复初始化

      // 1. 获取 DOM 元素（APP 端可以直接用 document.getElementById）
      const dom = document.getElementById(this.echartId || 'bar-map-chart');
	  console.error("柱形图dom",dom);

      if (!dom) {
        console.error("JBarMap DOM 元素未找到！");
        return;
      }

     if (this.mapData.code) {
      // 2. 初始化 ECharts
       this.barMapChart = this.myBarEchart.init(dom);
		// 3. 注册地图数据（如果有）
       this.myBarEchart.registerMap(this.mapData.code, this.mapData.data);
	   // 4. 设置图表配置
	   this.barMapChart.setOption(this.option || {});

	   // 5. 监听窗口变化，自动调整大小
	   window.addEventListener('resize', () => this.barMapChart.resize());
     }
    },
    // 更新 option
    setOption(newValue) {
      if (!this.barMapChart) {
        this.initEchart(); // 如果未初始化，先初始化
        return;
      }
      this.barMapChart.setOption(newValue || {});
    },

    // 设置地图数据
    setMap(newValue) {
      this.mapData = newValue;
      if (this.barMapChart && this.mapData) {
        this.myBarEchart.registerMap(this.mapData.code, this.mapData.data);
        this.barMapChart.setOption(this.option || {});
      }else{
		this.initEchart();
	  }
    }
  },
  mounted() {
    // 确保 ECharts 已加载
    if (this.myBarEchart  === null) {
      const script = document.createElement('script');
      script.src = 'uni_modules/lime-echart/static/echarts.js';
      script.onload = () => {
          this.myBarEchart = echarts; // 挂载到window
          this.initEchart();
	  };
      document.head.appendChild(script);
    } else {
      this.initEchart();
    }
  },
  beforeDestroy() {
    // 销毁图表，防止内存泄漏
    if (this.barMapChart) {
      this.barMapChart.dispose();
      window.removeEventListener('resize', () => this.barMapChart.resize());
    }
  }
};
</script>
<!-- #endif -->

<style lang="scss" scoped>
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

