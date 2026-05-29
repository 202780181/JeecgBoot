<template>
  <view class="component-echarts">
    <!-- #ifdef APP-PLUS || H5 -->
    <view
        class="echarts"
        :prop="option"
        :id="echartId"
        :option="optionDeepCopy"
        :horizontal="horizontal"
        :map="map"
        :change:id="ModuleInstance.setID"
        :change:prop="ModuleInstance.setOption"
        :change:map="ModuleInstance.setMap"
        :style="{height:`${height}rpx`}"></view>
    <!-- #endif -->
	
    <!-- #ifdef MP-WEIXIN -->
	<view><l-echart ref="chartRef"></l-echart></view>
    <!-- #endif -->
  </view>
</template>

<script setup>
import { ref, reactive, onMounted, watch, nextTick } from 'vue';
//#ifdef MP-WEIXIN
import LEchart from '../../lime-echart/components/l-echart/l-echart.vue'
// #endif
// 定义 props
const props = defineProps({
  echartId: {
    type: String,
    default: ""
  },
  height: {
    type: Number,
    default: 600,
    required: false
  },
  option: {
    type: Object,
    default: () => ({}),
    required: false
  },
  map: {
    type: Object,
    default: () => ({}),
    required: false
  },
  horizontal: {
    type: Boolean,
    default: false
  }
});
// 定义响应式数据
const optionDeepCopy = ref('');
const optionWx = ref({});

// 监听 option 变化
watch(() => props.option, (newVal) => {
  deepCopy(newVal);
}, {
  deep: true,
  // #ifdef MP-WEIXIN
  immediate: true
  // #endif
});

// 深拷贝函数
const deepCopy = (option) => {
  const recursion = (option, resultObj = {}) => {
    for (const key in option) {
      if (Object.hasOwnProperty.call(option, key)) {
        const element = option[key];
        if (typeof element === 'object') {
          resultObj[key] = (Object.prototype.toString.call(element) === '[object Array]') ? [] : {};
          recursion(element, resultObj[key]);
        } else {
          if (Object.prototype.toString.call(element) === '[object Function]') {
            resultObj[key] = `${element.toString()}`;
          } else {
            resultObj[key] = element;
          }
        }
      }
    }
    return resultObj;
  };
  let obj = recursion(option, {});
  // #ifdef APP-PLUS
  optionDeepCopy.value = JSON.stringify(obj);
  //#endif
  // #ifdef H5
  optionDeepCopy.value = props.option;
  // #endif
};
</script>
<!-- #ifndef MP-WEIXIN -->
<script module="ModuleInstance" lang="renderjs">
export default {
  data() {
    return {
      loading:false,
      echartsID: '',
      myChart: null,
      mapObj: {},
      horizontalScreen: false
    };
  },
  methods: {
    // 初始化 ECharts
    initEchart() {
      if(this.echartsID && !this.loading){
        this.loading = true
        setTimeout(() => {
          this.myChart = echarts.init(document.getElementById(this.echartsID));
          if (this.mapObj) {
            echarts.registerMap(this.mapObj.code, this.mapObj.data);
          }
          this.myChart.setOption(this.option || {});
          this.checkEmptyData();
          window.addEventListener('resize', () => this.myChart.resize());
          this.loading = false
        }, 1000);
      }
    },
    // 接收 ID
    setID(id) {
      this.echartsID = id;
      this.initEchart()
    },
    // 设置地图
    setMap(obj) {
      this.mapObj = { ...obj };
      // #ifdef APP-PLUS
      this.initEchart();
      // #endif
    },
    // 设置选项
    setOption(newValue = '', oldValue, ownerInstance, instance) {
      if (!newValue) return;
      newValue = this.handleStringToFunction(newValue);
      if (this.myChart) {
        this.myChart.clear();
        this.myChart.setOption(newValue || {});
        if (this.horizontalScreen) {
          let width = document.documentElement.clientWidth - 50;
          let height = document.documentElement.clientHeight - 100;
          this.myChart.resize({ width: height, height: width });
        }
        this.checkEmptyData();
      }
    },
    // 将字符串函数转换为可调用的函数
    handleStringToFunction(option) {
      if (Object.prototype.toString.call(option) === '[object String]') {
		option = (new Function('return ' + option))();
      }
      const recursion = (option) => {
        for (const key in option) {
          if (Object.hasOwnProperty.call(option, key)) {
            const element = option[key];
            if (Object.prototype.toString.call(element) === '[object String]' && (element.includes('function') || element.includes('=>'))) {
              try {
				option[key] = (new Function('return ' + element))();
              } catch (error) {
                uni.showToast({
                  title: 'eval函数转换异常！',
                  duration: 2000,
                  icon: 'none'
                });
              }
            }
            if (Object.prototype.toString.call(element) === '[object Object]' || Object.prototype.toString.call(element) === '[object Array]') {
              recursion(element);
            }
          }
        }
      };
      recursion(option);
      return option;
    },
    // 检查空数据
    checkEmptyData() {
      if (!this.option || !this.option.series) {
        return;
      }
      let { series = [] } = this.option;
      if (series.length === 0) {
        this.myChart.showLoading({
          text: '加载中',
          showSpinner: false,
          textColor: '#aaa',
          maskColor: 'rgba(255, 255, 255, 0.8)',
          fontSize: '14px',
          fontWeight: 'normal',
          fontFamily: 'Microsoft YaHei'
        });
      } else {
        this.myChart.hideLoading();
      }
    }
  },
  created() {
    if (typeof window.echarts === 'function') {
      this.initEchart();
    } else {
      const script = document.createElement('script');
      // view 层的页面运行在 www 根目录，其相对路径相对于 www 计算
	  // #ifdef APP-PLUS
      script.src = 'uni_modules/lime-echart/static/echarts.js';
	  //#endif
	  
      //#ifdef H5
      script.src = '/uni_modules/lime-echart/static/echarts.js';
      //#endif
      script.onload = () => {
        this.initEchart();
      };
      document.head.appendChild(script);
    }
  },
  beforeUnmount() {
    window.removeEventListener('resize', () => this.myChart.resize());
    //this.myChart.dispose();
  }
};
</script>
<!-- #endif -->

<style lang="scss">
.component-echarts {
  .echarts {
    width: 100%;
    min-height: 300px;
  }
}
</style>
