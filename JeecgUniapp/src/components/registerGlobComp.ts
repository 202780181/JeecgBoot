import type { App } from 'vue';
import StatusTip from '@/pages-work/components/statusTip.vue';
import JBar from '@/pages-work/components/echarts/JBar/index.vue';
import JBackgroundBar from '@/pages-work/components/echarts/JBackgroundBar/index.vue';
import JDynamicBar from '@/pages-work/components/echarts/JDynamicBar/index.vue';
import JStackBar from '@/pages-work/components/echarts/JStackBar/index.vue';
import JMultipleBar from '@/pages-work/components/echarts/JMultipleBar/index.vue';
import JNegativeBar from '@/pages-work/components/echarts/JNegativeBar/index.vue';
import JMixLineBar from '@/pages-work/components/echarts/JMixLineBar/index.vue';
import JProgress from '@/pages-work/components/echarts/JProgress/index.vue';
import JLine from '@/pages-work/components/echarts/JLine/index.vue';
import JMultipleLine from '@/pages-work/components/echarts/JMultipleLine/index.vue';
import JSmoothLine from '@/pages-work/components/echarts/JSmoothLine/index.vue';
import JStepLine from '@/pages-work/components/echarts/JStepLine/index.vue';
import JPie from '@/pages-work/components/echarts/JPie/index.vue';
import JRing from '@/pages-work/components/echarts/JRing/index.vue';
import JFunnel from '@/pages-work/components/echarts/JFunnel/index.vue';
import JPyramidFunnel from '@/pages-work/components/echarts/JPyramidFunnel/index.vue';
import JRadar from '@/pages-work/components/echarts/JRadar/index.vue';
import JCircleRadar from '@/pages-work/components/echarts/JCircleRadar/index.vue';
import JGauge from '@/pages-work/components/echarts/JGauge/index.vue';
import JColorGauge from '@/pages-work/components/echarts/JColorGauge/index.vue';
import JScatter from '@/pages-work/components/echarts/JScatter/index.vue';
import JBubble from '@/pages-work/components/echarts/JBubble/index.vue';
import DoubleLineBar from '@/pages-work/components/echarts/DoubleLineBar/index.vue';
import JRose from '@/pages-work/components/echarts/JRose/index.vue';
import JHorizontalBar from '@/pages-work/components/echarts/JHorizontalBar/index.vue';
import JArea from '@/pages-work/components/echarts/JArea/index.vue';
import JPictorial from '@/pages-work/components/echarts/JPictorial/index.vue';
import JPictorialBar from '@/pages-work/components/echarts/JPictorialBar/index.vue';
import JAreaMap from '@/pages-work/components/echarts/map/JAreaMap/index.vue';
import JBubbleMap from '@/pages-work/components/echarts/map/JBubbleMap/index.vue';
import JBarMap from '@/pages-work/components/echarts/map/JBarMap/index.vue';
import JHeatMap from '@/pages-work/components/echarts/map/JHeatMap/index.vue';
import JFlyLineMap from '@/pages-work/components/echarts/map/JFlyLineMap/index.vue';
import JTotalFlyLineMap from '@/pages-work/components/echarts/map/TotalFlyLineMap/index.vue';
import JTotalBarMap from '@/pages-work/components/echarts/map/TotalBarMap/index.vue';

//非echart组件
import JCarousel from '@/pages-work/components/drag/carousel/index.vue';
import JIframe from '@/pages-work/components/drag/iframe/index.vue';
import JDragEditor from '@/pages-work/components/drag/editor/index.vue';
import JImg from '@/pages-work/components/drag/img/index.vue';
import JNumber from '@/pages-work/components/drag/number/index.vue';
import JText from '@/pages-work/components/drag/text/index.vue';
import JCalendar from '@/pages-work/components/drag/calendar/index.vue';
import JCurrentTime from '@/pages-work/components/drag/currentTime/time.vue';
import JList from '@/pages-work/components/drag/list/index.vue';
import JRadioButton from '@/pages-work/components/drag/radiobutton/index.vue';
import JCommonTable from '@/pages-work/components/drag/table/index.vue';
import JQuickNav from '@/pages-work/components/drag/JQuickNav/index.vue';
import JForm from '@/pages-work/components/drag/form/index.vue';


// 全局注册组件
export function registerGlobComp(app: App) {
  app.component('statusTip', StatusTip)
  app.component('JBar', JBar)
  app.component('JMultipleBar', JMultipleBar)
  app.component('JNegativeBar', JNegativeBar)
  app.component('JLine', JLine)
  app.component('JMultipleLine', JMultipleLine)
  app.component('JPie', JPie)
  app.component('JRing', JRing)
  app.component('JFunnel', JFunnel)
  app.component('JPyramidFunnel', JPyramidFunnel)
  app.component('JRadar', JRadar)
  app.component('JCircleRadar', JCircleRadar)
  app.component('JGauge', JGauge)
  app.component('JColorGauge', JColorGauge)
  app.component('JScatter', JScatter)
  app.component('JBubble', JBubble)
  app.component('DoubleLineBar', DoubleLineBar)
  app.component('JRose', JRose)
  app.component('JHorizontalBar', JHorizontalBar)
  app.component('JArea', JArea)
  app.component('JBackgroundBar', JBackgroundBar)
  app.component('JDynamicBar', JDynamicBar)
  app.component('JMixLineBar', JMixLineBar)
  app.component('JStackBar', JStackBar)
  app.component('JStepLine', JStepLine)
  app.component('JSmoothLine', JSmoothLine)
  app.component('JProgress', JProgress)
  app.component('JPictorial', JPictorial)
  app.component('JPictorialBar', JPictorialBar)
  app.component('JAreaMap', JAreaMap)
  app.component('JBubbleMap', JBubbleMap)
  app.component('JBarMap', JBarMap)
  app.component('JHeatMap', JHeatMap)
  app.component('JFlyLineMap', JFlyLineMap)
  app.component('JTotalFlyLineMap', JTotalFlyLineMap)
  app.component('JTotalBarMap', JTotalBarMap)

  //非echart组件
  app.component('JCarousel', JCarousel)
  app.component('JIframe', JIframe)
  app.component('JDragEditor', JDragEditor)
  app.component('JImg', JImg)
  app.component('JNumber', JNumber)
  app.component('JText', JText)
  app.component('JCalendar', JCalendar)
  app.component('JCurrentTime', JCurrentTime)
  app.component('JList', JList)
  app.component('JRadioButton', JRadioButton)
  app.component('JCommonTable', JCommonTable)
  app.component('JQuickNav', JQuickNav)
  app.component('JForm', JForm)

}
