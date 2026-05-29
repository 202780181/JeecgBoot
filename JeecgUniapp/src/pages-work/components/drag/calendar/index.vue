<template>
  <view class="calendar-container" :style="styleObject">
    <uni-calendar :showMonth="true" @change="change" @monthChange="monthChange" :selected="selected"/>
  </view>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';
import { echartProps } from '../props';
import useChartHook from '@/pages-work/components/hooks/useEchart'
import {isArray} from "@/common/is";
// 定义 props
const props = defineProps(echartProps);

// 使用 mixin
let [{ dataSource, reload, pageTips, config }, { queryData }] = useChartHook(props, initOption)
const selected = ref([])
const monthChange = () => {}
// 初始化
function initOption (data){
  if(data && isArray(data)){
    selected.value = data.map(item=>{
      return {
        date: getDate(item.start).fullDate,
        info: item.title
      }
    })
  }
};
/**
 * 获取任意时间
 */
function getDate(date, AddDayCount = 0) {
  if (!date) {
    date = new Date()
  }
  if (typeof date !== 'object') {
    date = date.replace(/-/g, '/')
  }
  const dd = new Date(date)

  dd.setDate(dd.getDate() + AddDayCount) // 获取AddDayCount天后的日期

  const y = dd.getFullYear()
  const m = dd.getMonth() + 1 < 10 ? '0' + (dd.getMonth() + 1) : dd.getMonth() + 1 // 获取当前月份的日期，不足10补0
  const d = dd.getDate() < 10 ? '0' + dd.getDate() : dd.getDate() // 获取当前几号，不足10补0
  return {
    fullDate: y + '-' + m + '-' + d,
    year: y,
    month: m,
    date: d,
    day: dd.getDay()
  }
}
/**
 * 日历修改
 * @param e
 */
function change(e) {
  console.log('日历修改change 返回:', e)

}
// 计算属性：生成样式对象
const styleObject = computed(() => {
  return {
    width: '100%',
    height: '500px',
  };
});
// 生命周期钩子
onMounted(() => {
  queryData();
});


</script>

<style scoped lang="scss">
.example-body {
  /* #ifndef APP-NVUE */
  display: flex;
  /* #endif */
  flex-direction: row;
}
.calendar-button {
  flex: 1;
  font-weight: bold;
  font-size: 32rpx;
}
</style>
