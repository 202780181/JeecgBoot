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
          id="total-bar-echart"
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
import { ref, computed, onMounted } from 'vue';
import { echartProps } from '@/pages-work/components/echarts/props'
import EchartsMap from "../mapIndex.vue";
import echartsUniapp from "../../index.vue";
import { deepMerge, handleTotalAndUnit, disposeGridLayout } from '../../../common/echartUtil';
import useChartHook from '@/pages-work/components/hooks/useEchartMap'
import {merge} from "lodash-es";
import {deepClone} from "wot-design-uni/components/common/util";
import {isArray, isNullOrUnDef} from "@/common/is";
// 定义 props
const props = defineProps({
  ...echartProps
});
// 定义响应式数据
const option = ref({});
const chartOption = ref({
  options: [],
  geo: {
    map: '',
    itemStyle: {},
  },
  timeline: {
    data: [],
  },
});
const mapName = ref("");
const echartId = ref("");
let [{ dataSource, reload, pageTips, config,mapDataJson,getAreaCode,city_point }, { queryData,registerMap,setGeoAreaColor,handleTotalAndUnitMap,handleCommonOpt }] = useChartHook(props, initOption)
// 计算属性
const mapObject = computed(() => ({ code: 'total-bar:'+getAreaCode.value, data: mapDataJson.value }));
let categoryData = [];
let barData = [];
// 初始化配置选项
async function initOption(){
  let colors = getColors();
  /*柱子Y名称*/
  categoryData = [];
  barData = [];
  let chartData = dataSource.value;
  if (!(chartData instanceof Object)) {
    chartData = JSON.parse(chartData);
  }
  //时间轴数据
  let xData = [];
  //分组数据
  let groupData = [];
  try {
    mapName.value = 'total-bar:' + await registerMap();
    chartData = chartData.sort(function sortNumber(a, b) {
      return a.value - b.value;
    });
    //数据分组处理
    groupData = itemGroupBy(chartData, 'group', xData);
    for (let i = 0; i < groupData.length; i++) {
      groupData[i].data.sort(function sortNumber(a, b) {
        return a.value - b.value;
      });
      barData[i]=[];
      categoryData[i]=[];
      for (let j = 0; j < groupData[i].data.length; j++) {
        barData[i].push(groupData[i].data[j].value);
        categoryData[i].push(groupData[i].data[j].name);
      }
    }
    //时间轴数据
    chartOption.value.timeline.data = xData;
    //基础配置项
    chartOption.value.baseOption = {
      animation: true,
      animationDuration: 1000,
      animationEasing: 'cubicInOut',
      animationDurationUpdate: 1000,
      animationEasingUpdate: 'cubicInOut',
      title:{
        text:'',
        show:true
      },
      grid: {
        left: config.commonOption.grid.left+'%',
        top: config.commonOption.grid.top+'%',
        bottom: config.commonOption.grid.bottom+'%',
        width: '15%',
      },
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
        ...config.option.geo,
      },
    };
    chartOption.value.options = [];
    groupData.forEach((item, index) => {
      let dataTitle = config.commonOption.dataTitle;
      if(dataTitle && dataTitle.indexOf("{group}")!=-1){
        dataTitle = dataTitle.replace("{group}",item.group)
      }
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
            },
          },
          {
            id: 'statistic',
            text: dataTitle,
            left: config.commonOption.grid.left+'%',
            top: '8%',
            textStyle: {
              color: config.commonOption.dataTitleColor,
              fontSize: config.commonOption.dataTitleSize
            },
          },
        ],
        xAxis: {
          type: 'value',
          scale: true,
          position: 'top',
          min: 0,
          boundaryGap: false,
          splitLine: {
            show: false,
          },
          axisLine: {
            show: false,
          },
          axisTick: {
            show: false,
          },
          axisLabel: {
            margin: 2,
            textStyle: {
              color:  config.commonOption.dataValueColor
            },
          },
        },
        yAxis: {
          type: 'category',
          nameGap: 16,
          axisLine: {
            show: false,
            lineStyle: {
              color: '#ddd',
            },
          },
          axisTick: {
            show: false,
            lineStyle: {
              color: '#ffffff',
            },
          },
          axisLabel: {
            interval: 0,
            textStyle: {
              color: config.commonOption.dataNameColor
            },
          },
          data: categoryData[index],
        },

        series: [
          {
            //文字和标志
            name: 'light',
            type: 'scatter',
            coordinateSystem: 'geo',
            data: convertData(item.data),
            symbolSize: function (val) {
              return 10;//val[2] / 10;
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
              color:(params: any) => {
                if(!isNullOrUnDef(categoryData[index]) && isArray(categoryData[index])){
                  let finalIndex = deepClone(categoryData[index]).reverse().findIndex(category=>category == params.name);
                  return colors[finalIndex] || '#1DE9B6';
                }
                return '#1DE9B6'
              },
            },
          },
          {
            type: 'map',
            map: mapName.value,
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
            data: item.data,
          },
          {
            type: 'effectScatter',
            coordinateSystem: 'geo',
            data: convertData(item.data),
            symbolSize: function (val) {
              return 10;;
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
              color:(params: any) => {
                if(!isNullOrUnDef(categoryData[index]) && isArray(categoryData[index])){
                  let finalIndex = deepClone(categoryData[index]).reverse().findIndex(category=>category == params.name);
                  return colors[finalIndex] || '#1DE9B6';
                }
                return  '#1DE9B6'
              },
              shadowBlur: 10,
              shadowColor: colors[index]  || '#1DE9B6',
            },
            zlevel: 1,
          },
          //柱状图
          {
            zlevel: 1.5,
            type: 'bar',
            symbol: 'none',
            itemStyle: {
              color:(params: any) => {
                if(!isNullOrUnDef(categoryData[index]) && isArray(categoryData[index])){
                  let finalIndex = deepClone(categoryData[index]).reverse().findIndex(category=>category == params.name);
                  return colors[finalIndex] || '#1DE9B6';
                }
                return '#1DE9B6'
              },
            },
            data: barData[index],
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
        console.log("柱形排名chartOption",option.value)
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
 * 获取颜色
 * @returns {*|*[]}
 */
function getColors() {
  if(config.option?.customColor && config.option?.customColor.length>0){
    return config.option?.customColor.map(item=>item.color)
  }
  return [] //['#1DE9B6', '#FFDB5C', '#FFDB5C', '#04B9FF', '#04B9FF', '#1DE9B6']
}
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
    let geoCoord = dataItem.lnt ? [dataItem.lng, dataItem.lat] : city_point.value[dataItem.name];
    if (geoCoord) {
      res.push({
        name: dataItem.name,
        value: geoCoord.concat(dataItem.value),
      });
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
      totalBarEchart: null,
      mapData: null,
    };
  },
  methods: {
    // 初始化 ECharts
    initEchart() {
      if (this.myChart) return; // 避免重复初始化

      // 1. 获取 DOM 元素（APP 端可以直接用 document.getElementById）
      const dom = document.getElementById(this.echartId || 'total-bar-echart');

      if (!dom) {
        console.error("热力地图 DOM 元素未找到！");
        return;
      }

     if (this.mapData.code) {
      // 2. 初始化 ECharts
       this.myChart = echarts.init(dom);
		  // 3. 注册地图数据（如果有）
       this.totalBarEchart.registerMap(this.mapData.code, this.mapData.data);
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
        this.totalBarEchart.registerMap(this.mapData.code, this.mapData.data);
        this.myChart.setOption(this.option || {});
      }else{
		this.initEchart();
	  }
    }
  },
  mounted() {
    // 确保 ECharts 已加载
    if (this.totalBarEchart === null) {
      const script = document.createElement('script');
      script.src = 'uni_modules/lime-echart/static/echarts.js';
      script.onload = () => {
         this.totalBarEchart = echarts; // 挂载到window
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

