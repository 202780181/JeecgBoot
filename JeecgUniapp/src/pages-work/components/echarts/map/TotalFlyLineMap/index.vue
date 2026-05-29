<template>
  <view class="content">
    <statusTip v-if="pageTips.show" :status="pageTips.status"></statusTip>
    <!-- #ifdef  H5 -->
    <EchartsMap v-else v-model:option="option" v-model:map="mapObject" v-model:echartId="echartId" />
    <!-- #endif -->

    <!-- #ifdef MP-WEIXIN -->
    <echartsUniapp v-else :option="option" :mapName="mapName" :mapData="mapDataJson"  :chartData="dataSource" :config="config" :id="id"></echartsUniapp>
    <!-- #endif -->

    <!-- #ifdef APP-PLUS -->
    <view class="component-echarts">
      <view
          class="echarts"
          id="TotalFlyLineMap"
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
  options: [],
  geo:{
    label:{
      normal:{
        show:false
      }
    }
  },
  timeline: {
    data: [],
  },
});
const mapName = ref("");
let [{ dataSource, reload, pageTips, config,mapDataJson,getAreaCode,city_point }, { queryData,registerMap,setGeoAreaColor,handleTotalAndUnitMap,handleCommonOpt }] = useChartHook(props, initOption)
const echartId = ref("");
// 计算属性
const mapObject = computed(() => ({ code: 'totalFlyLine:'+getAreaCode.value, data: mapDataJson.value }));
let colors = [
  ['#1DE9B6', '#1DE9B6', '#FFDB5C', '#FFDB5C', '#04B9FF', '#04B9FF'],
  ['#1DE9B6', '#F46E36', '#04B9FF', '#5DBD32', '#FFC809', '#FB95D5', '#BDA29A', '#6E7074', '#546570', '#C4CCD3'],
  ['#37A2DA', '#67E0E3', '#32C5E9', '#9FE6B8', '#FFDB5C', '#FF9F7F', '#FB7293', '#E062AE', '#E690D1', '#E7BCF3', '#9D96F5', '#8378EA', '#8378EA'],
  ['#DD6B66', '#759AA0', '#E69D87', '#8DC1A9', '#EA7E53', '#EEDD78', '#73A373', '#73B9BC', '#7289AB', '#91CA8C', '#F49F42'],
];
let colorIndex = 0;
// 初始化配置选项
async function initOption(){
  let chartData = dataSource.value;
  if (!(chartData instanceof Object)) {
    chartData = JSON.parse(chartData);
  }
  //时间轴数据
  let xData = [];
  //分组数据
  let groupData = [];
  try {
    mapName.value = 'totalFlyLine:'+ await registerMap();
    // 使用 registerMap 注册的地图名称
    chartOption.value.geo.map = mapName.value;
    //数据分组处理
    groupData = itemGroupBy(chartData, 'group', xData);
    //时间轴数据
    chartOption.value.timeline.data = xData;
    chartOption.value.baseOption = {
      animation: true,
      animationDuration: 1000,
      animationEasing: 'cubicInOut',
      animationDurationUpdate: 1000,
      animationEasingUpdate: 'cubicInOut',
      grid: {
        right: '1%',
        top: '15%',
        bottom: '10%',
        width: '20%',
      },
      graphic: chartOption.value.graphic,
      tooltip: {
        trigger: 'axis', // hover触发器
        axisPointer: {
          // 坐标轴指示器，坐标轴触发有效
          type: 'shadow', // 默认为直线，可选为：'line' | 'shadow'
          shadowStyle: {
            color: 'rgba(150,150,150,0.1)', //hover颜色
          },
        },
      },
      geo: {
        map:  mapName.value,
        top: config.option.geo.top,
        left: config.option.geo.left,
        show: true,
        roam: config.option.geo.roam,
        zoom:config.option.geo.zoom,
        label: {
          emphasis: {
            show: false,
          },
          normal:{
            show: config.option.geo.label.normal.show,
            fontSize: config.option.geo.label.normal.fontSize,
            color: config.option.geo.label.normal.color
          }
        },
        itemStyle: {
          normal: {
            borderColor: config.option.geo.itemStyle.normal.borderColor,
            borderWidth: 1,
            areaColor: chartOption.value.geo.itemStyle?.normal?.areaColor,
            shadowColor: config.option.geo.itemStyle.normal.shadowColor,
            shadowOffsetX:  config.option.geo.itemStyle.normal.shadowOffsetX,
            shadowOffsetY:  config.option.geo.itemStyle.normal.shadowOffsetY,
            shadowBlur: config.option.geo.itemStyle.normal.shadowBlur,
          },
          emphasis: {
            areaColor: config.option.geo.itemStyle?.emphasis?.areaColor,
            borderWidth: 0,
          },
        },
      },
    };
    chartOption.value.options = [];
    groupData.forEach((item, index) => {
      chartOption.value.options.push({
        title: [
          {
            show: config.option.title.show,
            text: config.option.title.text,
            left: config.option.title.left+'px',
            top:config.option.title.top,
            textStyle: {
              color: config.option.title.textStyle.color,
              fontSize: config.option.title.textStyle.fontSize,
              fontWeight: config.option.title.textStyle.fontWeight,
            },
            subtext: config.option.title.subtext,
            subtextStyle: {
              color: config.option.title.subtextStyle.color,
              fontSize: config.option.title.subtextStyle.fontSize,
              fontWeight: config.option.title.subtextStyle.fontWeight,
            },
          }
        ],
        series: [
          {
            //文字和标志
            name: 'light',
            type: 'scatter',
            coordinateSystem: 'geo',
            data: convertData(item.data),
            symbolSize: function (val) {
              return val[2] / 10;
            },
            label: {
              normal: {
                formatter: '{b}',
                position: 'right',
                show: true,
              },
              emphasis: {
                show: true,
              },
            },
            itemStyle: {
              normal: {
                color: colors[colorIndex][index],
              },
            },
          },
          //地图？
          {
            type: 'map',
            map:  mapName.value,
            geoIndex: 0,
            aspectScale: 0.75, //长宽比
            showLegendSymbol: false, // 存在legend时显示
            label: {
              normal: {
                show: false,
              },
              emphasis: {
                show: false,
                textStyle: {
                  color: '#fff',
                },
              },
            },
            roam: true,

            animation: false,
            data: convertMapData(item.data),
          },
          //地图点的动画效果
          {
            type: 'effectScatter',
            coordinateSystem: 'geo',
            data: convertData(item.data),
            symbolSize: function (val) {
              return val[2] / 10;
            },
            showEffectOn: 'render',
            rippleEffect: {
              brushType: 'stroke',
            },
            hoverAnimation: true,
            label: {
              normal: {
                formatter: '{b}',
                position: 'right',
                show: true,
              },
            },
            itemStyle: {
              normal: {
                color: colors[colorIndex][index],
                shadowBlur: 10,
                shadowColor: colors[colorIndex][index],
              },
            },
            zlevel: 1,
          },
          //地图线的动画效果
          {
            type: 'lines',
            zlevel: 2,
            effect: {
              show: true,
              period: 4, //箭头指向速度，值越小速度越快
              trailLength: 0.02, //特效尾迹长度[0,1]值越大，尾迹越长重
              symbol: 'arrow', //箭头图标
              symbolSize: 3, //图标大小
            },
            lineStyle: {
              normal: {
                color: colors[colorIndex][index],
                width: 0.1, //尾迹线条宽度
                opacity: 0.5, //尾迹线条透明度
                curveness: 0.3, //尾迹线条曲直度
              },
            },
            data: convertToLineData(item.data),
          },
        ],
      });
    });
    // 合并配置
    if (props.config && props.config.option) {
      merge(chartOption.value, props.config.option);
      chartOption.value = handleTotalAndUnitMap(props.compName, chartOption.value, props.config, chartData);
      chartOption.value = handleCommonOpt(chartOption.value);
      setTimeout(() => {
        option.value = deepClone(chartOption.value);
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
/**
 * 数据分组计算出x轴数据
 * @param arr
 * @param key
 */
function itemGroupBy(arr, key, xData) {
  let newArr = [];
  let types = {};
  let i;
  let j;
  let cur;
  for (i = 0, j = arr.length; i < j; i++) {
    cur = arr[i];
    if (!(cur[key] in types)) {
      types[cur[key]] = { group: cur[key], data: [] };
      newArr.push(types[cur[key]]);
      xData.push(cur[key]);
    }
    types[cur[key]].data.push(cur);
  }
  return newArr;
}
/**
 * 散点数据转换
 * @param data
 */
let convertData = function (data) {
  let res = [];
  for (let i = 0; i < data.length; i++) {
    let dataItem = data[i];
    let geoCoord = dataItem.fromLng ? [dataItem.fromLng, dataItem.fromLat] : city_point.value[dataItem.fromName];
    if (geoCoord) {
      res.push({
        name: dataItem.fromName,
        value: geoCoord.concat(dataItem.value),
      });
    }
  }
  return res;
};
/**
 * 地图数据转换
 * @param data
 */
let convertMapData = function (data) {
  let res = [];
  for (let i = 0; i < data.length; i++) {
    let dataItem = data[i];
    let geoCoord = dataItem.fromLng ? [dataItem.fromLng, dataItem.fromLat] : city_point.value[dataItem.fromName];
    if (geoCoord) {
      res.push({
        name: dataItem.fromName,
        value: dataItem.value,
      });
    }
  }
  return res;
};

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
onMounted(() => {
  queryData();
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
      myChart: null,
      mapData: null,
      totalFlyEchart:null,
    };
  },
  methods: {
    // 初始化 ECharts
    initEchart() {
      if (this.myChart) return; // 避免重复初始化

      // 1. 获取 DOM 元素（APP 端可以直接用 document.getElementById）
      const dom = document.getElementById(this.echartId || 'TotalFlyLineMap');
      if (!dom) {
        console.error("TotalFlyLineMap DOM 元素未找到！");
        return;
      }

     if (this.mapData.code) {
      // 2. 初始化 ECharts
       this.myChart = echarts.init(dom);
		// 3. 注册地图数据（如果有）
       this.totalFlyEchart.registerMap(this.mapData.code, this.mapData.data);
	   // 4. 设置图表配置
	   this.myChart.setOption(this.option || {});

	   // 5. 监听窗口变化，自动调整大小
	   window.addEventListener('resize', () => this.myChart.resize());
     }
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
        this.totalFlyEchart.registerMap(this.mapData.code, this.mapData.data);
        this.myChart.setOption(this.option || {});
      }else{
		    this.initEchart();
	  }
    }
  },
  mounted() {
    // 确保 ECharts 已加载
    if (this.totalFlyEchart === null) {
      const script = document.createElement('script');
      script.src = 'uni_modules/lime-echart/static/echarts.js';
       script.onload = () => {
         this.totalFlyEchart = echarts; // 挂载到window
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
