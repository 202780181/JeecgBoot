<template>
  <view class="content">
    <statusTip v-if="pageTips.show" :status="pageTips.status"></statusTip>
    <!-- #ifdef H5 -->
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
          id="flyline-echart"
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

<script lang="ts" setup>
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
const option = ref<any>({})
//基础配置
const chartOption = ref<any>({
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
    getFromConvertData,
    getToConvertData,
  },
] = useChartHook(props, initOption)
const echartId = ref<any>('')
// 计算属性
const mapObject = computed(() => ({ code: 'flyline:'+getAreaCode.value, data: mapDataJson.value }))
// 初始化配置选项
async function initOption(data) {
  let chartData = dataSource.value
  let mapName = 'flyline:'+ await registerMap()
  try {
    chartOption.value.geo.map = mapName;
    let colorArr = getColors();
    let fromConvertData = getFromConvertData(chartData);
    //飞机的矢量图
    let planePath =
        'path://M1705.06,1318.313v-89.254l-319.9-221.799l0.073-208.063c0.521-84.662-26.629-121.796-63.961-121.491c-37.332-0.305-64.482,36.829-63.961,121.491l0.073,208.063l-319.9,221.799v89.254l330.343-157.288l12.238,241.308l-134.449,92.931l0.531,42.034l175.125-42.917l175.125,42.917l0.531-42.034l-134.449-92.931l12.238-241.308L1705.06,1318.313z';
    chartOption.value.series = [
      {
        name: '地图',
        type: 'map',
        map: mapName,
        geoIndex: 0,
        aspectScale: 0.75, //长宽比
        showLegendSymbol: false, // 存在legend时显示
        label: {
          label: {
            show: true,
          },
          normal: {
            show: true,
          },
          emphasis: {
            show: false,
            textStyle: {
              color: '#fff',
            },
          },
        },
        roam: true,
        itemStyle: {
          normal: {
            areaColor: '#3B5077',
            borderColor: '#3B5077',
          },
          emphasis: {
            areaColor: '#2B91B7',
          },
        },
        animation: true,
        data: chartData,
        zlevel: 1,
      },
      {
        name: 'lineData',
        type: 'lines',
        zlevel: 2,
        symbol: ['none', 'arrow'],
        symbolSize: 6,
        colorBy:"data",
        effect: {
          show: true,
          period: config?.commonOption?.effect?.period || 1,//动画时长
          trailLength: config?.commonOption?.effect?.trailLength,//特效尾迹
          symbolSize: config.commonOption?.effect?.symbolSize,//标记大小
          color: config?.commonOption?.effect?.markerColor || '#ffffff',//标记颜色
          symbol: config?.commonOption?.effect?.markerShape || planePath,//标记形状
        },
        lineStyle: {
          color: function (params) {
            let index = fromConvertData.findIndex(item=>item.name ==  params.data?.fromName);
            return colorArr[index] || colorArr[params.dataIndex];
          },
          width: 1,
          type: 'solid',
          opacity: 0.6,
          curveness: 0.2,
        },
        data: convertToLineData(chartData)
      },
      {
        name: '名称',
        type: 'effectScatter',
        coordinateSystem: 'geo',
        zlevel: 2,
        rippleEffect: {
          brushType: 'fill',
        },
        label: {
          show: true,
          position: 'top',
          formatter: '{b}',
          color: colorArr[0],
          fontSize: 14,
        },
        symbolSize: function (val) {
          return val[2] / 10;
        },
        data: fromConvertData.map((item,index)=>{
          return {...item,label:{color:colorArr[index]|| '#ffffff'}, itemStyle:{color:colorArr[index] || colorArr[2] || '#ffffff'}}
        }),
      },
      {
        name: 'test2',
        type: 'effectScatter',
        coordinateSystem: 'geo',
        zlevel: 4,
        rippleEffect: {
          brushType: 'fill',
        },
        label: {
          show: true,
          color: colorArr[0],
          position: 'top',
          formatter: '{b}',
          fontSize: 14,
        },
        symbolSize: function (val) {
          return val[2] / 10;
        },
        data: getToConvertData(chartData).map((item,index)=>{
          return {...item,label:{color:colorArr[index]|| '#ffffff'},itemStyle:{color:colorArr[index]|| colorArr[1]}}
        }),
      },
    ];
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
//颜色
function getColors() {
  if(config.option?.customColor && config.option?.customColor.length>0){
    return config.option?.customColor.map(item=>item.color)
  }
  return  ['#a6c84c', '#ffa022', '#46bee9', '#f569ef5', '#f7545f', '#ffa500', '#97ffff']
}

/**
 * 转换飞线数据
 * @param data
 */
let convertToLineData = function (data) {
  let res = [];
  for (let i = 0; i < data.length; i++) {
    let dataItem = data[i];
    let fromCoord = dataItem.fromLng ? [dataItem.fromLng, dataItem.fromLat] : city_point.value[dataItem.fromName];
    let toCoord = dataItem.toLng ? [dataItem.toLng, dataItem.toLat] : city_point.value[dataItem.toName];
    if (fromCoord && toCoord) {
      res.push([
        {
          coord: fromCoord,
          fromName: dataItem.fromName,
          value: dataItem.value,
        },
        {
          coord: toCoord,
        },
      ]);
    }
  }
  return res;
};
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
      flylineChart: null,
      mapData: null,
	    myflylineEchart: null
    };
  },
  methods: {
    // 初始化 ECharts
    initEchart() {
      if (this.flylineChart) return; // 避免重复初始化

      // 1. 获取 DOM 元素（APP 端可以直接用 document.getElementById）
      const dom = document.getElementById('flyline-echart');

      if (!dom) {
        console.error("ECharts DOM 元素未找到！");
        return;
      }

      if (this.mapData.code) {
	   // 2. 初始化 ECharts
	    this.flylineChart = this.myflylineEchart.init(dom);
		// 3. 注册地图数据（如果有）
        this.myflylineEchart.registerMap(this.mapData.code, this.mapData.data);
		// 4. 设置图表配置
		this.flylineChart.setOption(this.option || {});

		// 5. 监听窗口变化，自动调整大小
		window.addEventListener('resize', () => this.flylineChart.resize());
      }
    },
    // 更新 option
    setOption(newValue) {
      if (!this.flylineChart) {
        this.initEchart(); // 如果未初始化，先初始化
        return;
      }
      this.flylineChart.setOption(newValue || {});
    },

    // 设置地图数据
    setMap(newValue) {
      this.mapData = newValue;
      if (this.flylineChart && this.mapData) {
        this.myflylineEchart.registerMap(this.mapData.code, this.mapData.data);
        this.flylineChart.setOption(this.option || {});
      }else{
		this.initEchart();
	  }
    }
  },
  mounted() {
    if (this.myflylineEchart === null) {
      const script = document.createElement('script');
      script.src = 'uni_modules/lime-echart/static/echarts.js';
      script.onload = () => {
          this.myflylineEchart = echarts; // 挂载到window
          this.initEchart();
      };
      document.head.appendChild(script);
    } else {
      this.initEchart();
    }
  },
  beforeDestroy() {
    // 销毁图表，防止内存泄漏
    if (this.flylineChart) {
      this.flylineChart.dispose();
      window.removeEventListener('resize', () => this.flylineChart.resize());
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
