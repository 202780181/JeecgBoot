<template>
  <view class="number-container" :style="getBodyStyle">
    <view :style="getTextStyle" @tap="textClick(showText)" >{{ showText }}</view>
  </view>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';
import { echartProps } from '../props';
import useChartHook from '@/pages-work/components/hooks/useEchart'
import {isObject} from "@/common/is";
// 定义 props
const props = defineProps(echartProps);

// 使用 mixin
let [{ dataSource, reload, pageTips, config }, { queryData,handleClick }] = useChartHook(props, initOption)

const showText = computed(() => {
  return dataSource.value;
});

const getHeight = computed(() => {
  return config.size.height + 'px';
});


const getBodyStyle = computed(() => {
  let background = props.config.background || '#ffffff';
  return {
    width: props.horizontal ? '80vh' : '100%',
    height:config.size.height + 'px',
    background: `${background}`,
  };
});

const getTextStyle = computed(() => {
  let fontSize = props.config.option.body.fontSize || 20;
  let color = props.config.option.body.color || '#000000';
  let fontWeight = props.config.option.body.fontWeight || 'normal';
  let background = props.config.background || '#ffffff';
  let marginLeft = props.config.option.body.marginLeft || 0;
  let marginTop = props.config.option.body.marginTop || 0;
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
    fontSize: `${fontSize}px`,
    color: `${color}`,
    fontWeight: `${fontWeight}`,
    marginLeft: `${marginLeft}px`,
    marginTop: `${marginTop}px`,
    textAlign: `${textAlign}`,
    height: `${getHeight.value}`,
    ...lowAppStyle
  };
});

// 初始化
function initOption (data){
  console.log('===文本组件===initOption', data)
  // 处理显示数值
  if (dataSource.value) {
    if (Array.isArray(dataSource.value) && dataSource.value.length > 0) {
      dataSource.value = dataSource.value[0].value;
    }
  }
};
/**
 * 文本跳转
 */
function textClick(text) {
  let option = props.config.option;
  //配置超链接点击
  //#ifdef H5
  if(option?.isLink && option?.openUrl){
    window.open(option?.openUrl,option?.openType || "_blank")
  }
  // #endif
  //配置联动点击
  handleClick({value:text});
}
// 生命周期钩子
onMounted(() => {
  queryData();
});

defineExpose({
  queryData
});

</script>

<style scoped lang="scss">
.title-area {
  padding: 10rpx 20rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
  border-bottom: 1px solid rgb(240, 240, 240);
}

.valignWrapper {
  -webkit-flex-align: center;
  -ms-flex-align: center;
  -webkit-align-items: center;
  align-items: center;
  display: -webkit-box;
  display: -moz-box;
  display: -ms-flexbox;
  display: -webkit-flex;
  display: flex;
}

.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: top;
  white-space: nowrap;
}

.number-div {
  padding: 0px 15px;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  -webkit-box-align: center;
  align-items: center;
  -webkit-box-pack: center;
  justify-content: center;
  font-size: 36px;

  .content-wrapper {
    width: 100%;
    min-height: 20px;
    display: flex;
    -webkit-box-align: center;
    align-items: center;
    -webkit-box-pack: center;
    justify-content: center;

    .count {
      width: 100%;
      color: rgb(51, 51, 51);
      font-weight: 500;
      font-family: system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
  }
}
</style>
