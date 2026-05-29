import {
  packageParams,
  handleCalcFields,
  handleDateFields,
  getGeoCoordMap,
  handleParam,
  checkUrlPrefix,
  dictTransform,
  getUrlParams
} from '../common/echartUtil'
import {
  fieldMappings
} from '../common/concants'
import {isFunction, isUrl} from '@/utils/is'
import { http } from '@/utils/http'
import { useToast, useMessage, useNotify, dayjs } from 'wot-design-uni'
import {isArray} from "@/common/is";
import {useUserStore} from "@/store";
import signMd5Utils from '@/utils/signMd5Utils'

/**
 *
 * @param props
 * @param initOption
 * @param echarts
 */
export default function useChartHook(props, initOption?, echarts?) {
  const config = props.config
  const dataSource = ref([])
  const reload = ref(true)
  const pageTips = reactive({
    show: true,
    status: 0, // 0:loading,1:暂无数据,2:网络超时
  })
  //关联组件刷新
  let refreshComp = inject<any>('refreshComp');
  const toast = useToast()
  //地图数据
  const areaCode = ref('')
  const mapDataJson = ref({})
  //操作图表配置项
  let chartOption = {
    title: {
      show: true,
    },
    card: {
      title: '',
    },
    tooltip: {
      formatter: '',
    },
    legend: {
      bottom: '5%',
      left: 'center',
    },
    xAxis: {
      type: 'category',
      data: [],
    },
    yAxis: {
      type: 'value',
    },
    series: [{}] as any,
  }
  //监听配置修改
  watch(
    props.config,
    (config) => {
      if (!props?.isView) {
        console.log('=======props.config============')
        queryData()
      }
    },
    { deep: true },
  )

  /**
   * 查询数据
   * @param compConfig
   * @param queryParams
   */
  function queryData(compConfig?, queryParams?) {
    let config = compConfig ? compConfig : { ...props.config };
    console.log("queryData*****>>>>>",queryParams)
    if (config.dataType == 2) {
      //判断是否走代理
      if (config.dataSetId && config.dataSetType == 'api' && config.dataSetIzAgent !== '1') {
        //不走代理直接请求接口  url参数处理
        let { url, dataMap } = handleParam(config)
        //TODO 联动钻取处理
        let linkParams = {}
        let params = Object.assign({}, dataMap, queryParams, linkParams)
        if (url.startsWith('#{api_base_path}') || url.startsWith('{{ domainURL }}')) {
          getAgentData(params, config)
        } else {
          let checkUrl = checkUrlPrefix(url)
          if (checkUrl.isDiffProtocol) {
            toast.warning('请求API地址需要https协议接口！')
            return
          }
          console.log("api请求地址",url, params)
          getCompData({ url, params }).then((res: any) => {
            console.log("api请求地址  返回值res",res)
            dataSource.value = res.data || res
            if (res?.result && isArray(res?.result)) {
              dataSource.value = res.result
            } else if (res?.result?.records && isArray(res?.result.records)) {
              dataSource.value = res.result.records
            }
            getDataCallBack()
          })
        }
      }else if (config.dataSetType == 'websocket'){
        //TODO websocket处理
      }else {
        let { dataMap } = handleParam(config)
        //TODO 联动钻取处理
        let linkParams = {}
        let params = Object.assign({}, dataMap, queryParams, linkParams)
        getAgentData(params,config);
      }
    } else if (config.dataType == 4) {
      //查询配置
      let params = getParams(config, queryParams)
      //查询数据
      http.post('/drag/onlDragDatasetHead/getTotalData', params).then((res: any) => {
        if (res.success) {
          let result = res.result.chartData
          if (result && result.length > 0) {
            try {
              let arr = JSON.parse(JSON.stringify(result))
              dataSource.value = handleDateFields(arr, config)
              dataSource.value = handleCalcFields(arr, config.valueFields, config.assistYFields)
              initOption && isFunction(initOption) && initOption()
            } catch (e) {
              console.log('查询数据报错', e)
            }
          } else {
            dataSource.value = []
            initOption && isFunction(initOption) && initOption()
          }
        }
      })
    } else {
      //静态数据
      let chartData = props.config.chartData
      if (typeof chartData === 'string') {
        try {
          chartData = JSON.parse(chartData as string)
        } catch (e) {}
      }
      dataSource.value = chartData
      initOption && initOption(chartData)
    }
  }
  /**
   * 根据接口获取组件数据
   * @param option
   */
   const getCompData = (option) => {
    //接口地址
    let { url, params:queryParams } = getUrlParams(option.url);
    if (!isUrl(url)) {
      console.info('url', option.url);
      console.info('请求地址有问题', option.url);
      return;
    }
    //请求类型默认get
    let method = option.method ? option.method : 'get';
    //请求参数
    let params = option.params ? option.params : {};
    Object.assign(params,queryParams)
    //是否使用服务的代理
    let serverAgent = option.serverAgent ? option.serverAgent : false;
    if (serverAgent) {
      //使用服务端代理是传递option到代理服务器
      params = option;
    }
    console.info('请求api---method', method);
    console.info('请求api---params', params);
    console.info('请求api---url', url);
    const userStore = useUserStore()
    return new Promise((resolve, reject) => {
      uni.request({
        method: method,
        data: params,
        header: {
          'X-Access-Token': userStore.userInfo.token,
          'X-Tenant-Id': userStore.userInfo.tenantId,
          'X-TIMESTAMP': signMd5Utils.getTimestamp(),
        },
        transformRequest: [
          function (data) {
            //格式化为字符串。
            return JSON.stringify({ ...data });
          },
        ],
        url: option.url,
      })
      .then((res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err.data);
      });
    });
  };
  /**
   * 获取后端接口请求的数据
   * @param params
   */
  function getAgentData(params, config) {
    http
      .post('/drag/onlDragDatasetHead/getAllChartData', {
        id: config.dataSetId,
        params,
        dataMapping: config.dataMapping,
      })
      .then((res: any) => {
        if (res.success) {
          let result = res.result
          let data = result.data || []
          dataSource.value = JSON.parse(JSON.stringify(data))
          //字典翻译
          dataSource.value = dictTransform(dataSource.value, result.dictOptions)
          config.dictOptions = result.dictOptions
          getDataCallBack()
        } else {
          dataSource.value = []
          toast.warning('查询失败')
        }
      })
  }

  /**
   * 获取数据后刷新图表
   * @param chartData
   */
  function getDataCallBack() {
    //映射转换
    dataSource.value = dataTransform(dataSource.value, config.dataMapping)
    //返回数据处理
    handleData()
    //渲染数据
    console.log("getDataCallBack",dataSource.value)
    initOption && initOption(dataSource.value)
  }
    /**
     * 数据处理 转换 条数过滤
     * @param chartData
     * @param dataMapping
     */
    function handleData() {
      //先处理数据过滤，再处理数据返回条数
      //数据过滤
      dataFilter();
      //数据条数过滤
      dataNumFilter();
    }

  /**
   * 过滤数据
   */
  function dataFilter() {
    if (config.dataFilter) {
      //执行数据过滤器
      try {
        const func = new Function('data', config.dataFilter);
        dataSource.value = func(dataSource.value);
        console.info('过滤后的数据:', dataSource.value);
      } catch (e) {
        console.info('过滤器异常:', e);
      }
    }
  }

  /**
   * 数据条数控制
   */
  function dataNumFilter() {
    let value = dataSource.value;
    if (value && isArray(value) && value.length > 0) {
      let totalNum = value.length;
      let dataNum = config.dataNum || 0;
      if (dataNum > 0 && dataNum < totalNum) {
        dataSource.value = dataSource.value.slice(0, dataNum);
      }
    }
  }
  /**
   * 图表的转换数据
   */
  function dataTransform(chartData, dataMapping) {
    if (dataMapping && Array.isArray(chartData)) {
      let newChartData = []
      chartData.forEach((data) => {
        let obj: any = { ...data }
        try {
          //执行数据转换
          dataMapping.forEach((item) => {
            //update-begin-author:liusq---date:2024-12-18--for:  issues/7554统计卡片，动态数据，某些数值、总数等无法展示，大小写导致
            let value =
              item['mapping'] != null
                ? data[item['mapping']] ??
                  data[
                    typeof item['mapping'] === 'string' ? item['mapping'].toUpperCase() : null
                  ] ??
                  null
                : null
            //update-end-author:liusq---date:2024-12-18--for:  issues/7554统计卡片，动态数据，某些数值、总数等无法展示，大小写导致
            fieldMappings.forEach((field) => {
              if (item['filed'] == field['label']) {
                //防止返回数据本身就有name、value、type等和映射字段冲突问题
                if (['name', 'type', 'value'].includes(field['key'])) {
                  obj[field['key']] = value || value == 0 ? value : ''
                } else {
                  obj[field['key']] =
                    value || value == 0
                      ? value
                      : data[field['key']] || data[field['key'].toUpperCase()]
                }
              }
            })
          })
        } catch (e) {
          console.info('转换异常:', e)
        }
        newChartData.push(obj)
      })
      console.info('转换后的数据:', newChartData)
      return newChartData
    }
    return chartData
  }
  /**
   * 获取参数
   * @param config
   * @param params
   */
  function getParams(config, params) {
    let queryParams = packageParams(config, params)
    return {
      tableName: config.tableName,
      compName: config.compName,
      config: {
        type: config.typeFields || [],
        name: config.nameFields || [],
        value: config.valueFields || [],
        assistValue: config.assistYFields || [],
        assistType: config.assistTypeFields || [],
        formType: config.formType,
      },
      condition: {
        ...queryParams,
      },
    }
  }
  /**
   * 点击事件
   * @param obj
   */
  function handleClick(obj) {
    //**********************跳转配置************************************************
    const turnConfig = props.config.turnConfig;
    const config = props.config;
    const linkType = props.config.linkType;
    const token = userStore.userInfo.token;
    if (turnConfig ) {
      if(linkType && linkType  !== 'url'){
        return
      }
      let { url,type:openType } = turnConfig;
      if (url) {
        if (url && url.indexOf('${name}') > -1) {
          url = url.replace('${name}', obj.name);
        }
        if (url && url.indexOf('${value}') > -1) {
          url = url.replace('${value}', obj.value);
        }
        if (url && url.indexOf('${type}') > -1) {
          url = url.replace('${type}', obj.type);
        }
        if (url && url.indexOf('${token}') > -1) {
          url = url.replace('${token}', token);
        }
        console.info('跳转地址:', url);
        //#ifdef H5
        if (url && url.indexOf('http') > -1) {
          window.open(url, openType || '_blank');
        }
        // #endif
      }
    }
    //**********************联动配置begin************************************************
    const linkageConfig = props.config.linkageConfig;
    //1.判断联动配置是否存在
    if (linkageConfig && linkageConfig.length > 0) {
      //2.点击图表的字段映射转换 TODO 表单有两种方式获取
      let fields = fieldTransform(config.dataMapping);
      //3.将数据处理配置项成需求的格式[{id:'123,params:{sex:'1'.age:2}]}]
      let linkageParams = linkageConfig.map((item) => {
        let paramsObj = {};
        item.linkage.forEach((field) => {
          let hasMap = fields && Object.keys(fields).length > 0;
          //获取点击的对象的数值
          paramsObj[field.target] = hasMap ? obj[fields[field.source]] : obj[field.source];
        });
        return { id: item.linkageId, params: paramsObj };
      });
      refreshComp && refreshComp(linkageParams);
      //**********************联动配置end************************************************
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
  return [
    { dataSource, reload, pageTips, config, chartOption, mapDataJson },
    { queryData,handleClick },
  ]
}
