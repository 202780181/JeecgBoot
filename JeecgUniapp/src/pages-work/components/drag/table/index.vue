<template>
  <view class="list-container" :style="styleObject">
    <wd-table :data="dataSource" :ellipsis="true" height="300px">
      <template v-for="(item, index) in columns" :key="index" >
        <wd-table-col :prop="item.dataIndex" :label="item.title" :width="item.width" />
      </template>
    </wd-table>
  </view>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';
import { echartProps } from '../props';
import useChartHook from '@/pages-work/components/hooks/useEchart'
import {cloneDeep} from "lodash-es";
// 定义 props
const props = defineProps(echartProps);
// 使用 mixin
let [{ dataSource, reload, pageTips, config }, { queryData }] = useChartHook(props, initOption);
//列配置
const columns = ref([]);
//绑定配置项
const option = computed(() => {
  return {
    ...props.config.option,
  };
});

// 初始化
function initOption (data){
  if (config.dataType == '2' || config.dataType == 2) {
    //选择数据集的时候已经把表格列计算好了放到了option里面
    let allCol = cloneDeep(config?.option?.columns);
    //获取要展示的列
    let showCol = allCol.filter((item) => item.izShow === 'Y');
    //判断是否显示操作列
    if(config?.btnOperateData && config?.btnOperateData.length > 0){
      showCol.push({
        title: '操作',
        key: 'action',
        fixed: 'right',
        width: '100px'
      })
    }
    //计算列宽
    columns.value = showCol.map((item) => {
      item['width'] = showCol.length<3?'200px':'150px';
      item['ellipsis'] = true;
      return item;
    });
  } else {
    //静态数据
    let chartData = props.config.chartData;
    chartData = typeof chartData === 'string' ? JSON.parse(chartData) : chartData;
    if (chartData && chartData.length > 0) {
      let keys = Object.keys(chartData[0]);
      columns.value = keys.map((item) => {
        return { title: item, dataIndex: item, izTotal: 'N', width: keys.length<3?'200px':'150px'};
      });
    }
  }
  // 添加序号列
  if(props.config?.showNumber){
    columns.value.unshift({
      title: '序号',
      dataIndex: 'rowIndex',
      isShow: 'Y',
      fixed: 'left',
      key: 'rowIndex',
      width: '100px',
    });
  }
  console.log("表格dataSource",dataSource)
  console.log("表格columns.value",columns.value)
};
// 计算属性：生成样式对象
const styleObject = computed(() => {
  return {
    width: '100%',
    height: '400px',
    overflow: 'auto'
  };
});
// 生命周期钩子
onMounted(() => {
  queryData();
});


</script>

<style scoped lang="scss">

</style>
