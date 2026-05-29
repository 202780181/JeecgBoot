<template>
  <view class="list-container" :style="styleObject">
    <uni-list :border="true">
      <template v-for="(item,index) in dataSource" :key="index">
        <uni-list-item :title="item.title" :thumb="item.avatar" :note="contentFilter(item.desc)" :rightText="item.date" ></uni-list-item>
      </template>
    </uni-list>
  </view>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';
import { echartProps } from '../props';
import useChartHook from '@/pages-work/components/hooks/useEchart'
// 定义 props
const props = defineProps(echartProps);

// 使用 mixin
let [{ dataSource, reload, pageTips, config }, { queryData }] = useChartHook(props, initOption)
//绑定配置项
const option = computed(() => {
  return {
    ...props.config.option,
  };
});

//内容过滤
function contentFilter(content) {
  if (content) {
    let reg2 = /<\/?.+?\/?>/g;
    content = content.replace(reg2, '').replace(new RegExp('&nbsp;', 'gm'), '').replace(new RegExp('&darr;', 'gm'), '');
    if (content.length > 100) {
      content = content.slice(0, 100) + '......';
    }
    return content;
  } else {
    return '';
  }
}
// 初始化
function initOption (data){
  console.log("列表initOption",dataSource.value)
};
// 计算属性：生成样式对象
const styleObject = computed(() => {
  let height = props.config?.size?.height || 400 + 'px';
  return {
    width: '100%',
    height: height,
    overflow: 'auto'
  };
});
// 计算属性：生成样式对象
const customStyle = computed(() => {
  return {
    fontSize: '35px',
  };
});
// 生命周期钩子
onMounted(() => {
  queryData();
});

defineExpose({
  queryData
});
</script>

<style scoped lang="scss">

</style>
