<template>
  <view :style="styleObject">
    <swiper
      style="width:100%;min-height: 300px"
      class="screen-swiper square-dot"
      :indicator-dots="option.dots"
      :circular="true"
      :autoplay="option.autoplay"
      :interval="5000"
      :duration="500"
    >
      <swiper-item v-for="(item, index) in dataSource" :key="index">
        <img :src="getFileAccessHttpUrl(item.src)" style="width: 100%; height: 100%" />
      </swiper-item>
    </swiper>
  </view>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'
import { echartProps } from '../props'
import { handleParam } from '../../common/echartUtil'
import { isUrl } from '@/utils/is'
import { http } from '@/utils/http'
import {getFileAccessHttpUrl} from "@/common/uitls";

// 定义 props
const props = defineProps(echartProps)

// 定义响应式数据
const dataSource = ref([])

// 计算属性
const option = computed(() => props.config?.option)

// 计算属性
const styleObject = computed(() => {
  let height = (props.config?.size?.height || 300) + 'px';
  return {
    width: '100%',
    height: height
  };
})

// 生命周期钩子
onMounted(() => {
  queryData()
})

const queryData = () => {
  // 判断是否是数据集
  let config: any = props.config
  let chartData = []
  if (config.dataType === 2) {
    // 判断是否走代理
    if (config.dataSetId && config.dataSetType === 'api' && config.dataSetIzAgent !== '1') {
      isApi(config)
    } else {
      let params = {} // 原代码中未定义 params，这里简单初始化为空对象
      http
        .post('/drag/onlDragDatasetHead/getAllChartData', { id: config.dataSetId, params })
        .then((res:any) => {
          if (res.success) {
            let result = res.result
            let data = result.data || []
            chartData = JSON.parse(JSON.stringify(data))
          } else {
            dataSource.value = []
          }
        })
    }
  } else {
    // 静态数据
    chartData = config.chartData
    if (typeof chartData === 'string') {
      try {
        chartData = JSON.parse(chartData)
      } catch (e) {
        console.log(e)
      }
    }
  }
  // 设置数据
  dataSource.value = chartData
}
//是否api
const isApi = (config) => {
  let params = {} // 原代码中未定义 params，这里简单初始化为空对象
  // 不走代理直接请求接口
  // url 参数处理
  let { url, dataMap } = handleParam(config)
  let option:any = Object.assign({}, dataMap, params)
  // 接口地址
  if (!isUrl(option.url)) {
    return
  }
  // 请求类型默认 get
  let method = option.method ? option.method : 'get'
  // 请求参数
  let reqParams = option.params ? option.params : {}
  // 是否使用服务的代理
  let serverAgent = option.serverAgent ? option.serverAgent : false
  if (serverAgent) {
    // 使用服务端代理是传递 option 到代理服务器
    reqParams = option
  }
  if (method === 'get') {
    http.get(url, { params: reqParams }).then((res:any) => {
      dataSource.value = res
    })
  } else {
    http.post(url, reqParams).then((res:any) => {
      dataSource.value = res
    })
  }
}
</script>

<style></style>
