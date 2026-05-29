<template>
  <view class="time-container" :style="[bodyStyle]">
    <view :style="getTextStyle">{{ dataSource }} &nbsp;{{ weekday }}</view>
  </view>
</template>
<script lang="ts"  setup>
  import { computed, onMounted, ref, watchEffect,unref } from 'vue';
  import dayjs from 'dayjs';
  // 引入组件
  const props = defineProps({
    size: {
      type: Object,
      default: () => {},
    },
    fontSize: {
      type: Number,
      default: 20,
    },
    isView: {
      type: Boolean,
      default: false,
    },
    config: {
      type: Object,
      default: () => ({}),
    },
    isLowApp: {
      type: Boolean,
      default: false,
    }
  });
  //定时
  const timeInterval = ref(null);
  //每天刷新
  const dayTimeInterval = ref(null);
  //定义事件
  const emit = defineEmits(['compRouter']);
  //当前星期
  const weekday = ref('');
  //当前数据
  const dataSource = ref('');

  //监听配置变化
  watchEffect(() => {
    props.config && initData(props.config);
  });

  //加载数据
  function initData(config) {
    initTimeData(config);
    unref(timeInterval) && clearInterval(timeInterval.value);
    timeInterval.value = setInterval(() => {
      initTimeData(config);
    }, 1000);
  }
  //初始化数据
  function initTimeData(config){
    let format = config.option?.format || 'YYYY-MM-DD HH:mm:ss';
    weekday.value = config.option?.showWeek == 'show' ? weekdaysConversion(dayjs().day()) : '';
    dataSource.value = format == 'day'?weekdaysConversion(dayjs().day()):dayjs(new Date()).format(format);
  }

  /**
   * 文本主体样式
   */
  const bodyStyle = computed(() => {
    let height = props.size?.height || 200;
    let textAlign = props.config.option?.body?.textAlign || 'center';
    let lowAppStyle;
    switch (textAlign) {
      case 'center':
        lowAppStyle = { display: 'flex', justifyContent: 'center', alignItems: 'center' };
      break;
      case 'center-left':
        lowAppStyle = { display: 'flex', justifyContent: 'left', alignItems: 'center' };
      break;
      case 'center-right':
        lowAppStyle = { display: 'flex', justifyContent: 'right', alignItems: 'center' };
      break;
      default:
      lowAppStyle = {};
    }
    return {
      width: '100%',
      height: `${height}px`,
      padding: props.isLowApp?`0px`:'0 10px',
      ...lowAppStyle,
    };
  });
  /**
   * 文字样式
   */
  const getTextStyle = computed(() => {
    let fontSize = props.config.option.body?.fontSize || props.fontSize;
    let color = props.config.option.body?.color || '#000000';
    let fontWeight = props.config.option.body?.fontWeight || 'normal';
    let textAlign = props.config.option.body?.textAlign || 'center';
    let marginLeft = props.config.option.body?.marginLeft || 0;
    let marginTop = props.config.option.body?.marginTop || 0;
    let letterSpacing = props.config.option.body?.letterSpacing || 0;
    return {
      fontSize: `${fontSize}px`,
      marginLeft: `${marginLeft}px`,
      marginTop: `${marginTop}px`,
      color: color,
      fontWeight: `${fontWeight}`,
      textAlign: `${textAlign}`,
      letterSpacing:`${letterSpacing}px`
    };
  });
  //星期转换
  function weekdaysConversion(day){
    const weeks = {
      0:"星期日",
      1:"星期一",
      2:"星期二",
      3:"星期三",
      4:"星期四",
      5:"星期五",
      6:"星期六",
    }
    return weeks[day]
  }
  onMounted(() => {
   unref(timeInterval) && clearInterval(timeInterval.value);
   initData(props.config);
  });
  //清除定时
  onUnmounted(() => {
    unref(timeInterval) && clearInterval(timeInterval.value);
    unref(dayTimeInterval) && clearInterval(dayTimeInterval.value);
  });
</script>

<style scoped lang="scss"></style>
