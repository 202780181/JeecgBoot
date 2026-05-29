<template>
	<l-echart ref="chartRef"></l-echart>
</template>

<script lang="ts" setup>

//#ifdef MP-WEIXIN
//const uniEchartsWx = require('../../../uni_modules/lime-echart/static/echarts.min');
import LEchart from '../lime-echart/components/l-echart/l-echart.vue'
const uniEchartsWx = require('../../../pages-work/static/echarts.min');
// #endif

//#ifndef MP-WEIXIN
import * as echarts from 'echarts'
// #endif
// 引入组件
import {setValueAxisUnit} from '../common/echartUtil';
import {isNumber,isString,isNullOrUnDef,isArray} from '@/utils/is'
import {cache} from "@/common/uitls";
import { useUserStore } from '@/store/user'
import { merge } from 'lodash-es';
// 引入组件props
const props = defineProps({
	option: {
      type: Object,
      default: () => {
          return {}
      }
	},
	mapName: {
	  type: String,
	  default:'china'
	},
	mapData: {
	  type: Object,
	  default: () => {
	      return {}
	  }
	},
  i: {
    type: [String,Number],
    default: ''
  },
  id: {
    type: String,
    default: ''
  },
  config: {
    type: Object,
    default: () => ({} as any),
  },
  chartData:{
    type: Array,
    default: () => {
      return [] as any
    }
  }
})
// 引入组件ref
const chartRef = ref(null)
//图表原始数据
let chartOriginalData = ref([]);
//关联组件刷新
let refreshComp = inject<any>('refreshComp');
//刷新钻取状态
let reloadDrillStatus = inject<any>('reloadDrillStatus');
//钻取参数
const lastDrillParams = ref({});
//获取用户信息
const userStore = useUserStore();
let dragData = inject('dragData');
// 监听option的变化
watchEffect(()=>{
	props.option && init(props.option)
})
// 初始化图表
function init(finalOption){
	if(finalOption){
    //记录原始数据
    chartOriginalData.value = props.chartData;
		// 组件能被调用必须是组件的节点已经被渲染到页面上
		setTimeout(async()=>{
			if(!chartRef.value) return
      // update-begin--author:liusq---date:20250429---for：【QQYUN-12261】【大屏】1.x轴和y轴数字看不清 2.面积图颜色和pc不一致。
      if (dragData.value?.style == 'bigScreen') {
        const defaultVal = {};
        if (finalOption?.tooltip) {
          defaultVal['tooltip'] = {
            textStyle: {
              color: '#000'
            }
          };
        }
        if (finalOption?.xAxis) {
          defaultVal['xAxis'] = {
            axisLabel: {
              color: '#9d9c9c'
            }
          };
        }
        if (finalOption?.yAxis) {
          defaultVal['yAxis'] = {
            axisLabel: {
              color: '#9d9c9c'
            }
          };
        }
        finalOption = merge(finalOption, defaultVal);
        console.log("finalOption",finalOption)
      }
      // update-end--author:liusq---date:20250429---for：【QQYUN-12261】【大屏】1.x轴和y轴数字看不清 2.面积图颜色和pc不一致。
      //设置数值坐标的单位显示
      setValueAxisUnit(finalOption);
      //#ifdef MP-WEIXIN
			const myChartWx = await chartRef.value.init(uniEchartsWx)
			if(props.mapName){
        uniEchartsWx.registerMap(props.mapName,props.mapData)
			}
      myChartWx.setOption(finalOption)
      //绑定点击事件
      bindClick(myChartWx);
      // #endif

      //#ifndef MP-WEIXIN
			const myChart = await chartRef.value.init(echarts)
			if(props.mapName){
        echarts.registerMap(props.mapName,props.mapData)
			}
      myChart.setOption(finalOption)
      //绑定点击事件
      bindClick(myChart);
      // #endif
		},300)
	}
}
/**
 * 绑定点击事件
 */
function bindClick(chartInstance) {
  if (chartInstance) {
    chartInstance.off('click');
    chartInstance.on('click', (params) => {
      console.log('echarts点击事件:params', params)
      let result = jsHandler(params);
      console.log('echarts点击事件:result', result)
      //脚本内容返回false时阻断后续执行
      if (result) {
        const config = props.config;
        let { name, value } = params;
        if (value && value instanceof Array) {
          value = value.join(',');
        }
        //执行自定义事件
        //**********************跳转配置************************************************
        const turnConfig = props.config.turnConfig;
        const linkType =  props.config.linkType;
        const token = userStore.userInfo.token;
        if (turnConfig) {
          //update-begin-author:liusq---date:2024-11-27--for: 大屏如果配置的联动方式是组件，就不走外部链接
          //#ifdef H5
          if((linkType && linkType == 'url') || !linkType){
            let { url,type:openType } = turnConfig;
            if (url) {
              console.info('echarts跳转地址:', url);
              if (url && url.indexOf('${name}') > -1) {
                url = url.replace('${name}', name);
              }
              if (url && url.indexOf('${value}') > -1) {
                url = url.replace('${value}', value);
              }
              if (url && url.indexOf('${token}') > -1) {
                url = url.replace('${token}', token);
              }
              if (url && url.indexOf('http') > -1) {
                window.open(url, openType || '_blank');
              }
            }
          }
          // #endif
          //update-end-author:liusq---date:2024-11-27--for: 大屏如果配置的联动方式是组件，就不走外部链接
        }
        //**********************联动配置begin************************************************
        const linkageConfig = props.config.linkageConfig;
        let linkageParams = {};
        //1.判断联动配置是否存在
        if (linkageConfig && linkageConfig.length > 0) {
          //update-begin-author:liusq---date:2024-11-27--for: 大屏如果配置的联动方式是外部链接，就不走联动组件
          if((linkType && linkType == 'comp') || !linkType){
            //2.点击图表的字段映射转换
            let fields = fieldTransform(config.dataMapping);
            //3.将数据处理配置项成需求的格式[{id:'123,params:{sex:'1'.age:2}]}]
            if(props.config.dataType == 4){
              console.info('联动:chartOriginalData', chartOriginalData.value);
              linkageParams = linkageConfig.map((item) => {
                let paramsObj = { queryMode:'link' };
                item.linkage.forEach((field) => {
                  //获取点击的对象的数值
                  let hasMap = fields && Object.keys(fields).length > 0;
                  let rawData = chartOriginalData.value[params.dataIndex];
                  let paramValue = params[field.source];
                  if(field.source == 'name' && rawData[config.nameFields[0].fieldName+'_dictText']){
                    paramValue = rawData[config.nameFields[0].fieldName+'_dictVal'] || paramValue;
                  }
                  if(field.source == 'type' && rawData[config.typeFields[0].fieldName+'_dictText']){
                    paramValue = rawData[config.typeFields[0].fieldName+'_dictVal'] || paramValue;
                  }
                  paramsObj[field.target] = hasMap ? params[fields[field.source]] : paramValue;
                });
                return { id: item.linkageId, params: paramsObj };
              });
            }
            else{
              linkageParams = linkageConfig.map((item) => {
                let paramsObj = {queryMode:'link' };
                item.linkage.forEach((field) => {
                  //获取点击的对象的数值
                  //TODO 注意字典翻译问题 fields存在，则配置了映射，取映射参数，否则取默认参数name/value/key
                  let hasMap = fields && Object.keys(fields).length > 0;
                  paramsObj[field.target] = hasMap ? params[fields[field.source]] : params[field.source];
                  //update-begin-author:liusq---date:2024-07-16--for:TV360X-1775online和sql数据源的表字典配置翻译问题
                  if(config.dictOptions && Object.keys(config.dictOptions).length>0){
                    let dictOption = config.dictOptions[field.source];
                    if(dictOption && dictOption.length>0){
                      let findObj = dictOption.find(item=>item.text === paramsObj[field.target]);
                      if (findObj && findObj.value){
                        paramsObj[field.target] = findObj.value;
                      }
                    }
                  }
                  //update-end-author:liusq---date:2024-07-16--for:TV360X-1775online和sql数据源的表字典配置翻译问题
                });
                return { id: item.linkageId, params: paramsObj};
              });
            }
            console.info('echarts点击事件:linkageParams', linkageParams);
            refreshComp(linkageParams);
          }
          //update-end-author:liusq---date:2024-11-27--for: 大屏如果配置的联动方式是外部链接，就不走联动组件

        }
        //******************************联动配置end***************************************************

        //**********************钻取配置begin************************************************
        const drillData = config.drillData;
        //1.判断钻取配置是否存在
        if (drillData && drillData.length > 0) {
          let drillParams = { id: props.i || props.id, pid: props.pid, tabId: props.tabId, params: {} };
          //2.点击图表的字段映射转换
          let fields = {};
          if(config.dataType == 4){
            fields = {};
          }else{
            fields = fieldTransform(config.dataMapping);
          }
          //3.将数据处理配置项成需求的格式[{id:'123,params:{sex:'1'.age:2}]}]
          drillData.forEach((item) => {
            //处理映射参数传递
            let hasMap = fields && Object.keys(fields).length > 0;
            let paramValue = params[item.source];
            if(config.dataType == 4){
              let rawData = chartOriginalData.value[params.dataIndex];
              if(item.source == 'name' && rawData[config.nameFields[0].fieldName+'_dictText']){
                paramValue = rawData[config.nameFields[0].fieldName+'_dictVal'] || paramValue;
              }
              if(item.source == 'type' && rawData[config.typeFields[0].fieldName+'_dictText']){
                paramValue = rawData[config.typeFields[0].fieldName+'_dictVal'] || paramValue;
              }
            }
            drillParams.params[item.target] = hasMap ? params[fields[item.source]] : paramValue;
          });
          if(config.dataType == 4){
            drillParams.params['queryMode'] = 'drill';
          }
          //保存层级
          try {
            let drillLocalParamArr = cache('drill:'+(props.i || props.id));
            //存在则表示已经钻取过,存在钻取数据
            if (drillLocalParamArr) {
              let drillArr = isString(drillLocalParamArr)? JSON.parse(drillLocalParamArr):drillLocalParamArr;
              //向缓存参数里面数据
              drillArr.push(toRaw(unref(lastDrillParams)));
              cache('drill:'+(props.i || props.id),JSON.stringify(drillArr))
              lastDrillParams.value = drillParams.params;
            } else {
              lastDrillParams.value = drillParams.params;
              cache('drill:'+(props.i || props.id),JSON.stringify([{}]))
            }
          } catch (e) {
            cache('drill:'+(props.i || props.id),[])
          }
          refreshComp([drillParams]);
          reloadDrillStatus()
        }
        //******************************钻取配置end***************************************************
      }
    });
  }
}

/**
 * 联动点击数据字段转换
 * @param dataMapping
 */
function fieldTransform(dataMapping) {
  if (dataMapping) {
    //执行字段转换
    let obj: any = {};
    dataMapping.forEach((data) => {
      if (data['mapping']) {
        if (data['filed'] == '分组') {
          obj[data['mapping']] = 'type';
        }
        if (data['filed'] == '维度' || data['filed'] == '名称') {
          obj[data['mapping']] = 'name';
        }
        if (data['filed'] == '数值') {
          obj[data['mapping']] = 'value';
        }
      }
    });
    return obj;
  }
}
/**
 * 执行自定义js脚本
 */
function jsHandler(params) {
  if (props.config?.jsConfig) {
    try {
      const execute = new Function('params', 'option', props.config.jsConfig);
      return execute(params, props.option);
    } catch (e) {
      console.info('自定义js脚本异常:', e);
      return true;
    }
  }
  return true;
}
</script>
