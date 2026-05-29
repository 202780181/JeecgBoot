<template>
  <view style="height:100%">
    <view class="form-container" :style="styleObject">
      <wd-form ref="form" :model="myFormData">
          <template v-for="(item, index) in [...dataSource]" :key="index">
            <wd-input label-width="80px" v-if="item.type === 'input'" v-model="myFormData[item.key]" :label="item.label"/>
            <template v-if="item.type === 'select'">
              <online-multi
                  v-if="item.searchMode === 'multi'"
                  :label="item.label"
                  type="list_multi"
                  :dict="item.dictCode"
                  v-model="myFormData[item.key]"
              ></online-multi>
              <online-select
                  v-else
                  :label="item.label"
                  type="list"
                  :dict="item.dictCode"
                  v-model="myFormData[item.key]"
              ></online-select>
            </template>
            <template v-if="item.type === 'date'">
              <wd-calendar
                v-if="item.searchMode === 'range'"
                label-width="80px"
                :type="getDateRangeType(item.format)"
                v-model="myFormData[item.key]"
                :label="item.label"/>
              <online-date
                v-else
                :label="item.label"
                :type="getDateType(item.format)"
                v-model:value="myFormData[item.key]"
              ></online-date>
            </template>
          </template>
        </wd-form>
    </view>
    <view class="flex justify-evenly mt-14px">
      <wd-button plain type="info" @click="handleReset">重置</wd-button>
      <wd-button @click="handleSubmit">查询</wd-button>
    </view>
  </view>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'
import { echartProps } from '../props'
import OnlineSelect from "@/components/online/view/online-select.vue";
import OnlineMulti from "@/components/online/view/online-multi.vue";
import OnlineDate from "@/components/online/view/online-date.vue";
import {cache} from "@/common/uitls";
import dayjs from 'dayjs';
import weekday from 'dayjs/plugin/weekday';
import localeData from 'dayjs/plugin/localeData';
import { cloneDeep } from 'lodash-es';
dayjs.extend(weekday);
dayjs.extend(localeData);
// 定义 props
const props = defineProps(echartProps)
// 定义响应式数据
const dataSource = ref([])
const myFormData = ref({})
//关联组件刷新
let refreshComp = inject<any>('refreshComp');

// 计算属性
const styleObject = computed(() => {
  return {
    width: '100%',
    height: '240px',
    overflow: 'auto'
  };
})
/**
 * 获取日期类型
 * @param format
 */
const getDateType=(format)=>{
  switch (format) {
    case 'YYYY':
      return 'year';
    case 'YYYY-MM':
      return 'year-month';
    default:
      return 'date';
  }
}
/**
 * 获取日期类型
 * @param format
 */
const getDateRangeType=(format)=>{
  switch (format) {
    case 'YYYY':
      return 'daterange';
    case 'YYYY-MM':
      return 'monthrange';
    default:
      return 'daterange';
  }
}
//监听表单配置修改
watch(
    () => dataSource.value,
    () => {
      console.log('form   dataSource',dataSource.value)
      initFormData();
    }
);
// 重置方法
 function handleReset(){
   initFormData();
   handleSubmit();
}
// 查询方法
function handleSubmit(){
  let queryFormData = {}
  dataSource.value.forEach((item) => {
    let value = myFormData.value[item.key];
    if(item.type == 'date'){
      if(item.searchMode === 'range' && value && value.length == 2){
        let begin = dayjs(value[0]).format('YYYY-MM-DD');
        let end = dayjs(value[1]).format('YYYY-MM-DD');
        queryFormData[item.key] = [begin,end]
        queryFormData[item.key+"_begin"] = begin;
        queryFormData[item.key+"_end"] = end;
      }else{
        queryFormData[item.key] = dayjs(value).format('YYYY-MM-DD');
      }
    }else{
      queryFormData[item.key] = value;
    }
  });
  console.log('form  handleSubmit',queryFormData)
  let linkageConfig = props.config.linkageConfig;
  //1.判断联动配置是否存在
  if (linkageConfig && linkageConfig.length > 0) {
    //2.将数据处理配置项成需求的格式[{id:'123,params:{sex:'1'.age:2}]}]
    let linkageParams = linkageConfig.map((item) => {
      let paramsObj = {};
      item.linkage.forEach((field) => {
        //获取点击的对象的数值
        paramsObj[field.target] = queryFormData[field.source];
      });
      //缓存联动信息
      let cachedData = cache(item.linkageId);
      if(cachedData){
        cache(item.linkageId,Object.assign(cachedData,paramsObj));
      }else{
        cache(item.linkageId,paramsObj);
      }
      return { id: item.linkageId, params: paramsObj };
    });
    refreshComp(linkageParams);
  }
}
/**
 * 获取日期
 * @param date
 * @param num
 * @returns
 */
function getDay(date,num) {
  return dayjs(date).add(num, 'days').startOf('days').format('YYYY-MM-DD HH:mm:ss');
}
/**
 * 设置modal初始默认值
 */
function initFormData() {
  myFormData.value = {}
  dataSource.value.forEach((item) => {
    try {
      //日期默认值支持昨天、今天，明天
      if(!item?.format){
        item.format = 'YYYY-MM-DD';
      }
      if(item.value && item.type == 'date'){
        let value = item.value;
          if(item.value.startsWith("=dateStr")){
            let regex = /\(([^)]+)\)/; // 匹配括号及其内容，捕获括号内的内容
            let match = item.value.match(regex);
            if (match) {
              let day = match[1]; // match[1] 是捕获组的内容
              value = getDay(new Date(),day)
            }
          }
        myFormData.value[item.key] = dayjs(value).valueOf();
      }
      else{
        myFormData.value[item.key] = item.value ? item.value : null;
      }
    }catch (e) {
      console.log("初始化表单数据失败",e)
    }
  });
}
async function queryData() {
  if (!props.config.dataSetId) {
    //静态数据处理字典编码
    dataSource.value = handleData();
  }
}
/**
 * 处理数据成需求格式
 * @param result
 */
function handleData() {
  let fields = cloneDeep(props.config.option?.fields) || [];
  let arr = [];
  if (fields && fields.length > 0) {
    //判断有code的情况下，设置成select
    fields.forEach((field) => {
      if (field.izSearch == '1') {
        arr.push({
          label: field['fieldTxt'],
          key: field['fieldName'],
          type: field['widgetType'],
          dictCode: field['dictCode'],
          searchMode: field['searchMode'],
          value: field['defaultValue'],
          format:field['dateFormat']
        });
      }
    });
  }
  return arr;
}
// 生命周期钩子
onMounted(() => {
  queryData()
})
</script>

<style scoped lang="scss">
.form-container {
  :deep(.wd-cell-group__body) {
    background-color: #f1f1f1;
  }
  .onlineLoader-form {
    :deep(.wd-input__label-inner) {
      font-size: 16px;
    }
    :deep(.wd-picker__label) {
      font-size: 16px;
    }
    :deep(.wd-select-picker__label) {
      font-size: 16px;
    }
    :deep(.wd-cell__title) {
      font-size: 16px;
    }
    :deep(.wd-textarea__label-inner) {
      font-size: 16px;
    }
    :deep(.wd-input__label.is-required) {
      padding-left: 0px;
    }
    :deep(.wd-input__label.is-required::after) {
      left: -10px;
    }
    :deep(.wd-textarea__clear) {
      color: #bfbfbf;
    }
    :deep(.wd-select-picker__clear) {
      color: #bfbfbf;
    }
    :deep(.wd-input__clear) {
      color: #bfbfbf;
    }
    :deep(.wd-upload__close) {
      color: #bfbfbf;
    }
  }
}
</style>
