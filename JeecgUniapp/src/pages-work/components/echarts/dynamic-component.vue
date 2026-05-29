<template>
  <view>
    <!-- echart组件 -->
    <JBar :compName="compName" :i="i"  :config="config" v-if="comp=='JBar'"></JBar>
    <JBackgroundBar :compName="compName" :i="i"  :config="config" v-else-if="comp=='JBackgroundBar'"></JBackgroundBar>
    <JDynamicBar :compName="compName" :i="i"  :config="config" v-else-if="comp=='JDynamicBar'"></JDynamicBar>
    <JMixLineBar :compName="compName" :i="i"  :config="config" v-else-if="comp=='JMixLineBar'"></JMixLineBar>
    <JStackBar :compName="compName" :i="i" :config="config" v-else-if="comp.indexOf('JStackBar')>=0"></JStackBar>
    <JMultipleBar :compName="compName" :i="i"  :config="config" v-else-if="comp.indexOf('JMultipleBar')>=0"></JMultipleBar>
    <JNegativeBar :compName="compName" :i="i"  :config="config" v-else-if="comp.indexOf('JNegativeBar')>=0"></JNegativeBar>
    <JLine :compName="compName" :i="i"  :config="config" v-else-if="comp.indexOf('JLine')>=0"></JLine>
    <JStepLine :compName="compName" :i="i"  :config="config" v-else-if="comp.indexOf('JStepLine')>=0"></JStepLine>
    <JSmoothLine :compName="compName" :i="i"  :config="config" v-else-if="comp.indexOf('JSmoothLine')>=0"></JSmoothLine>
    <JMultipleLine :compName="compName" :i="i"  :config="config" v-else-if="comp.indexOf('JMultipleLine')>=0"></JMultipleLine>
    <JPie :compName="compName" :i="i"  :config="config" v-else-if="comp.indexOf('JPie')>=0"></JPie>
    <JRing :compName="compName" :i="i"  :config="config" v-else-if="comp.indexOf('JRing')>=0"></JRing>
    <JFunnel :compName="compName" :i="i"  :config="config" v-else-if="comp.indexOf('JFunnel')>=0"></JFunnel>
    <JPyramidFunnel :compName="compName" :i="i"  :config="config" v-else-if="comp.indexOf('JPyramidFunnel')>=0"></JPyramidFunnel>
    <JRadar :compName="compName" :i="i"  :config="config" v-else-if="comp.indexOf('JRadar')>=0"></JRadar>
    <JCircleRadar :compName="compName" :i="i"  :config="config" v-else-if="comp.indexOf('JCircleRadar')>=0"></JCircleRadar>
    <JGauge :compName="compName" :i="i" :config="config" v-else-if="comp.indexOf('JGauge')>=0"></JGauge>
    <JColorGauge :compName="compName" :i="i" :config="config" v-else-if="comp.indexOf('JColorGauge')>=0"></JColorGauge>
    <JScatter :compName="compName" :i="i" :config="config" v-else-if="comp.indexOf('JScatter')>=0"></JScatter>
    <JBubble :compName="compName" :i="i" :config="config" v-else-if="comp=='JBubble'"></JBubble>
    <DoubleLineBar :compName="compName" :i="i"  :config="config" v-else-if="comp.indexOf('DoubleLineBar')>=0"></DoubleLineBar>
    <JRose :compName="compName" :i="i" :config="config" v-else-if="comp.indexOf('JRose')>=0"></JRose>
    <JHorizontalBar :compName="compName" :i="i"  :config="config" v-if="comp.indexOf('JHorizontalBar')>=0"></JHorizontalBar>
    <JArea :compName="compName" :i="i" :config="config" v-else-if="comp=='JArea'"></JArea>
    <JPictorial :compName="compName" :i="i" :config="config" v-else-if="comp=='JPictorial'"></JPictorial>
    <JPictorialBar :compName="compName" :i="i" :config="config" v-else-if="comp=='JPictorialBar'"></JPictorialBar>
    <JProgress :compName="compName" :i="i"  :config="config" v-else-if="comp=='JProgress'"></JProgress>
    <!-- echart地图组件 -->
    <JBubbleMap :compName="compName" :i="i" :config="config" v-else-if="comp=='JBubbleMap'"></JBubbleMap>
    <JBarMap :compName="compName" :i="i" :config="config" v-else-if="comp.indexOf('JBarMap')>=0"></JBarMap>
    <JHeatMap :compName="compName" :i="i" :config="config" v-else-if="comp.indexOf('JHeatMap')>=0"></JHeatMap>
    <JAreaMap :compName="compName" :i="i" :config="config" v-else-if="comp.indexOf('JAreaMap')>=0"></JAreaMap>
    <!-- echart复杂地图组件 -->
    <JFlyLineMap :compName="compName" :i="i" :config="config" v-else-if="comp.indexOf('JFlyLineMap')>=0"></JFlyLineMap>
    <JTotalFlyLineMap :compName="compName" :i="i" :config="config" v-else-if="comp.indexOf('JTotalFlyLineMap')>=0"></JTotalFlyLineMap>
    <JTotalBarMap :compName="compName" :i="i" :config="config" v-else-if="comp.indexOf('JTotalBarMap')>=0"></JTotalBarMap>


    <!-- 非echart 常规组件 -->
    <JCarousel :compName="compName" :id="i"  :config="config" v-if="comp.indexOf('JCarousel')>=0"></JCarousel>
    <JIframe :compName="compName" :id="i"  :config="config" v-else-if="comp.indexOf('JIframe')>=0"></JIframe>
    <JDragEditor :compName="compName" :id="i"  :config="config" v-else-if="comp.indexOf('JDragEditor')>=0"></JDragEditor>
    <JImg :compName="compName" :id="i"  :config="config" v-else-if="comp.indexOf('JImg')>=0"></JImg>
    <JNumber :compName="compName" :id="i"  :config="config" v-else-if="comp.indexOf('JNumber')>=0"></JNumber>
    <JText :compName="compName" :id="i"  :config="config" v-else-if="comp.indexOf('JText')>=0"></JText>
    <JCalendar :compName="compName" :id="i"  :config="config" v-else-if="comp.indexOf('JCalendar')>=0"></JCalendar>
    <JCurrentTime :compName="compName" :id="i"  :config="config" v-else-if="comp.indexOf('JCurrentTime')>=0"></JCurrentTime>
    <JList :compName="compName" :id="i"  :config="config" v-else-if="comp.indexOf('JList')>=0"></JList>
    <JRadioButton :compName="compName" :id="i"  :config="config" v-else-if="comp.indexOf('JRadioButton')>=0"></JRadioButton>
    <JCommonTable :compName="compName" :id="i"  :config="config" v-else-if="comp.indexOf('JCommonTable')>=0"></JCommonTable>
    <JQuickNav :compName="compName" :id="i"  :config="config" v-else-if="comp.indexOf('JQuickNav')>=0"></JQuickNav>
  </view>
</template>
<script setup>
//echart
import JBar from '@/pages-work/components/echarts/JBar/index.vue'
import JBackgroundBar from '@/pages-work/components/echarts/JBackgroundBar/index.vue'
import JDynamicBar from '@/pages-work/components/echarts/JDynamicBar/index.vue'
import JStackBar from '@/pages-work/components/echarts/JStackBar/index.vue'
import JMultipleBar from '@/pages-work/components/echarts/JMultipleBar/index.vue'
import JNegativeBar from '@/pages-work/components/echarts/JNegativeBar/index.vue'
import JMixLineBar from '@/pages-work/components/echarts/JMixLineBar/index.vue'
import JProgress from '@/pages-work/components/echarts/JProgress/index.vue'
import JLine from '@/pages-work/components/echarts/JLine/index.vue'
import JMultipleLine from '@/pages-work/components/echarts/JMultipleLine/index.vue'
import JSmoothLine from '@/pages-work/components/echarts/JSmoothLine/index.vue'
import JStepLine from '@/pages-work/components/echarts/JStepLine/index.vue'
import JPie from '@/pages-work/components/echarts/JPie/index.vue'
import JRing from '@/pages-work/components/echarts/JRing/index.vue'
import JFunnel from '@/pages-work/components/echarts/JFunnel/index.vue'
import JPyramidFunnel from '@/pages-work/components/echarts/JPyramidFunnel/index.vue'
import JRadar from '@/pages-work/components/echarts/JRadar/index.vue'
import JCircleRadar from '@/pages-work/components/echarts/JCircleRadar/index.vue'
import JGauge from '@/pages-work/components/echarts/JGauge/index.vue'
import JColorGauge from '@/pages-work/components/echarts/JColorGauge/index.vue'
import JScatter from '@/pages-work/components/echarts/JScatter/index.vue'
import JBubble from '@/pages-work/components/echarts/JBubble/index.vue'
import DoubleLineBar from '@/pages-work/components/echarts/DoubleLineBar/index.vue'
import JRose from '@/pages-work/components/echarts/JRose/index.vue'
import JHorizontalBar from '@/pages-work/components/echarts/JHorizontalBar/index.vue'
import JArea from '@/pages-work/components/echarts/JArea/index.vue'
import JPictorial from '@/pages-work/components/echarts/JPictorial/index.vue'
import JPictorialBar from '@/pages-work/components/echarts/JPictorialBar/index.vue'
import JAreaMap from '@/pages-work/components/echarts/map/JAreaMap/index.vue'
import JBubbleMap from '@/pages-work/components/echarts/map/JBubbleMap/index.vue'
import JBarMap from '@/pages-work/components/echarts/map/JBarMap/index.vue'
import JHeatMap from '@/pages-work/components/echarts/map/JHeatMap/index.vue'
import JFlyLineMap from '@/pages-work/components/echarts/map/JFlyLineMap/index.vue'
import JTotalFlyLineMap from '@/pages-work/components/echarts/map/TotalFlyLineMap/index.vue'
import JTotalBarMap from '@/pages-work/components/echarts/map/TotalBarMap/index.vue'

//非echart组件
import JCarousel from '@/pages-work/components/drag/carousel/index.vue'
import JIframe from '@/pages-work/components/drag/iframe/index.vue'
import JDragEditor from '@/pages-work/components/drag/editor/index.vue'
import JImg from '@/pages-work/components/drag/img/index.vue'
import JNumber from '@/pages-work/components/drag/number/index.vue'
import JText from '@/pages-work/components/drag/text/index.vue'
import JCalendar from '@/pages-work/components/drag/calendar/index.vue'
import JCurrentTime from '@/pages-work/components/drag/currentTime/time.vue'
import JList from '@/pages-work/components/drag/list/index.vue'
import JRadioButton from '@/pages-work/components/drag/radiobutton/index.vue'
import JCommonTable from '@/pages-work/components/drag/table/index.vue'
import JQuickNav from '@/pages-work/components/drag/JQuickNav/index.vue'
//接收参数
const props = defineProps({
  compName: {
    type: String,
    default: '',
  },
  i: {
    type: [String, Number],
    default: '',
  },
  config: {
    type: Object,
    default: () => {
      return {}
    },
  },
})
//动态的组件名称
const comp = computed(() => {
  console.log('组件名称：compName:', props.compName)
  console.log('组件数据：config:', props.config)
  return props.compName
})
</script>
