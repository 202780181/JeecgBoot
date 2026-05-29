<template>
  <div class="button-container" :style="getButtonStyle">
    <wd-button v-for="(item, index) in dataSource" :key="index" @click.stop="btnClick(item)" class="item-btn button" :style="getBtnDynamicStyle(index)">
      <span class="overflow_ellipsis" :style="getBtnTextStyle(index)">{{ getSimpText(item.title) }}</span>
    </wd-button>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';
import { echartProps } from '../props';
import useChartHook from '@/pages-work/components/hooks/useEchart'
import { useToast } from 'wot-design-uni'
// 定义 props
const props = defineProps(echartProps);
const toast = useToast()
// 使用 mixin
let [{ dataSource, reload, pageTips, config }, { queryData }] = useChartHook(props)
//定义事件
const emit = defineEmits(['compRouter']);
//配置项
const styleOption = computed(() => props.config.option);
//获取按钮动态样式
const getBtnDynamicStyle = computed(() => {
  return (index) => {
    let btnConfig = unref(styleOption)?.body && unref(styleOption)?.body;
    let customColor = unref(styleOption)?.customColor;
    let obj = {
      marginLeft: (props.config.option.body.spaceSize || 5) + 'px',
      marginRight: (props.config.option.body.spaceSize || 5) + 'px',
      borderRadius: btnConfig?.shape == 'circle' ? '18px' : 'inherit',
      backgroundColor: btnConfig?.shape == 'dashed' ? 'rgb(248, 248, 248)' : customColor && customColor[index] && customColor[index]?.color ? customColor[index].color : 'rgb(33, 150, 243)',
      color: btnConfig?.shape !== 'dashed' ? (customColor && customColor[index] && customColor[index]?.color ? customColor[index].color : '#ffffff') : '#ffffff',
    };
    return obj;
  };
});
//获取按钮字体动态样式
const getBtnTextStyle = computed(() => {
  return (index) => {
    let btnConfig = unref(styleOption)?.body && unref(styleOption)?.body;
    let customColor = unref(styleOption)?.customColor;
    let obj = {
      color: btnConfig?.shape == 'dashed' ? (customColor && customColor[index] && customColor[index]?.color ? customColor[index].color : 'rgb(33, 150, 243)') : '#ffffff',
    };
    return obj;
  };
});
/**
 * 按钮样式
 */
const getButtonStyle = computed(() => {
  let marginLeft = config.option.body?.marginLeft || '0px';
  let marginTop = config.option.body?.marginTop || '0px';
  return {
    backgroundColor:'inherit',
    marginLeft: `${marginLeft}px`,
    marginTop: `${marginTop}px`,
    overflow: 'auto'
  };
});

/**
 * 按钮点击
 * @param item
 */
async function btnClick(item) {
  if (props.isView) {
    //-----兼容积木-----
    if(typeof props.config.dataSetApi === 'string' && props.config.dataSetApi.indexOf('type=\'jimu\'')>=0){
      toast.warning("此功能为业务功能，当前仅为显示!");
      return false
    }
    //-----兼容积木-----
    let href = item?.href;
    if (href) {
      if (href && href.indexOf('http') > -1) {
        // #ifdef H5
        window.open(href, '_blank');
        // #endif
      } else {
        emit('compRouter', href, item);
      }
    } else if (props.config?.actionConfig?.operateType) {
      console.log('props.config?》》', props.config);
      let params = {
        type: props.config.actionConfig.modalName,
        action: props.config.actionConfig.operateType,
        url: props.config.actionConfig.url,
        records: { ...item },
      };
      let res = await pushSocketMsg(params);
      console.log('pushSocketMsg', res);
    }
  }
}

/**
 * 获取简单标题
 * @param title
 */
function getSimpText(title){
  if(title && title.length>4){
    title = title.substr(0,4)
  }
  return title
}

onMounted(() => {
  queryData(config);
});

defineExpose({
  queryData
});
</script>

<style scoped lang="scss">
.button-container {
  display: flex;
  flex-wrap: wrap;
  padding: 24px;
  justify-content: space-around;
  align-items: center;
}
.ant-card:not(.ant-card-bordered) {
  box-shadow: none !important;
}
button {
  margin: 5px;
}

.button {
  border: none;
  border-radius: 3px;
  box-sizing: border-box;
  color: #fff;
  cursor: pointer;
  display: inline-block;
  outline: none;
  text-shadow: none;
  transition: color 0.2s ease-in, border-color 0.2s ease-in, background-color 0.2s ease-in;
  user-select: none;
  vertical-align: middle;
}

.item-btn {
  font-size: 14px;
  line-height: 36px;
  min-height: 36px;
  min-width: 92px;

  .overflow_ellipsis {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
// update-begin--author:liaozhiyang---date:20241025---for：【TV360X-2800】大屏改造成暗黑效果
html[data-theme='dark'] {
  .ant-card {
    background-color: inherit;
  }
}
// update-end--author:liaozhiyang---date:20241025---for：【TV360X-2800】大屏改造成暗黑效果
</style>
