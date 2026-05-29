import {
  deepMerge,
  packageParams,
  handleCalcFields,
  handleDateFields,
  getGeoCoordMap,
  calcUnit,
  keepTwoDecimals,
} from '../common/echartUtil'

import { china } from '../common/china'
import { isFunction } from '@/utils/is'
import { http } from '@/utils/http'
export default function useChartHook(props, initOption, echarts?) {
  const config = props.config
  const dataSource = ref([])
  const reload = ref(true)
  const pageTips = reactive({
    show: true,
    status: 0, // 0:loading,1:暂无数据,2:网络超时
  })
  //地图数据
  const areaCode = ref('');
  const mapName = ref('');
  const mapDataJson = ref({})
  const city_center = ref([])
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
   * 获取区域编码
   */
  const getAreaCode = computed(() => {
    if (areaCode.value) {
      return areaCode?.value
    }
    return props.config.option?.area && props.config.option.area?.value
      ? props.config.option?.area?.value[props.config.option?.area?.value.length - 1]
      : 'china'
  })
  /**
   * 获取区域名称
   */
  let getAreaName: any = computed(() => {
    return (
      (config?.option?.area &&
        config?.option?.area?.name &&
        config?.option?.area?.name[config?.option?.area?.name.length - 1]) ||
      '中国'
    )
  })

  /**
   * 城市点位
   */
  const city_point = computed(() => {
    return city_center.value
  })
  /**
   * 查询数据
   * @param compConfig
   * @param queryParams
   */
  function queryData(compConfig?, queryParams?) {
    let config = compConfig ? compConfig : { ...props.config }
    if (config.dataType == 2) {
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
      let chartData = props.config?.chartData
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
   * 获取热力图数据
   * @param data
   */
  function getHeatMapData(data) {
    let res = []
    for (let i = 0; i < data.length; i++) {
      let geoCoord = unref(city_center)[data[i].name]
      if (geoCoord) {
        res.push(geoCoord.concat(data[i].value))
      }
    }
    return res
  }

  /**
   * 查询城市中心数据
   */
  async function queryCityCenter() {
    if (city_center.value.length == 0) {
      const res:any = await http.get('/drag/mock/json/city_center');
      city_center.value = res;
    }
  }
  /**
   * 注册地图
   */
  function registerMap() {
    let areaCode = getAreaCode.value;
    if (getAreaCode.value != 'china' && getAreaCode.value != '') {
      http
        .get('/drag/onlDragDatasetHead/getMapDataByCode', {
          code: getAreaCode.value,
          name: getAreaName.value,
        })
        .then((res: any) => {
          const { success, result } = res
          if (success) {
            mapDataJson.value = JSON.parse(result.mapData)
          }
        })
    } else {
      mapDataJson.value = china
    }
    //echarts.registerMap(getAreaCode.value, mapDataJson.value);
    //需要置空,避免清空区域选择无法恢复到中国地图模式
    //areaCode.value = null;
	mapName.value  = areaCode
    return areaCode
  }
  /**
   * 获取转换后的地图数据
   * @param chartData
   */
  function getConvertData(chartData) {
    let geoCoordMap = getGeoCoordMap(mapDataJson.value)
    let result = []
    if (geoCoordMap) {
      for (let i = 0; i < chartData.length; i++) {
        let geoCoord = geoCoordMap[chartData[i].name]
        if (geoCoord) {
          result.push({
            name: chartData[i].name,
            code: geoCoord.adcode,
            value: geoCoord.center.concat(chartData[i].value),
          })
        }
      }
    }
    return result
  }
  /**
   * 设置地图配色
   * @param options
   */
  function setGeoAreaColor(options, config) {
    //当视觉映射关闭时删除属性
    if (options.visualMap && options.visualMap.show == false) {
      delete options.visualMap
    }
    if (options.visualMap && options.visualMap.show == true) {
      options.visualMap.inRange = {
        color: config.commonOption.inRange.color,
      }
    }
    //不使用渐变色
    if (config.commonOption && config.commonOption.gradientColor == false) {
      options.geo.itemStyle.normal.areaColor = config.commonOption.areaColor.color1
    }

    //开启渐变色
    if (config.commonOption && config.commonOption.gradientColor == true) {
      options.geo.itemStyle.normal.areaColor = {
        type: 'radial',
        x: 0.5,
        y: 0.5,
        r: 0.8,
        colorStops: [
          {
            offset: 0,
            color: config.commonOption.areaColor.color1,
          },
          {
            offset: 1,
            color: config.commonOption.areaColor.color2,
          },
        ],
        globalCoord: false,
      }
    }
    return options
  }

  /**
   * 处理总计和显示单位
   * @param {Object} compName
   * @param {Object} chartOption
   * @param {Object} config
   * @param {Object} chartData
   */
  function handleTotalAndUnitMap(compName, chartOption, config, chartData) {
    //1.获取到label配置项
    if (config.compStyleConfig) {
      //显示单位配置
      let showUnitConfig = config.compStyleConfig.showUnit
      let unit = showUnitConfig.unit ? showUnitConfig.unit : '' //单位
      let numberLevel = showUnitConfig.numberLevel ? showUnitConfig.numberLevel : '' //数值数量级
      chartOption.series.forEach((item) => {
        if (item.name == '数据') {
          let labelConfig = {
            label: {
              normal: {
                show: unit ? true : false,
                formatter: (params) => {
                  let showLabel = `${params.name}: `
                  let value = 0
                  if (params.seriesType == 'effectScatter') {
                    if (Array.isArray(params.value)) {
                      value = params.value[2]
                    } else {
                      value = params.value
                    }
                  }
                  //计算显示数值和添加前后缀
                  if (unit) {
                    showLabel +=
                      showUnitConfig.position == 'suffix'
                        ? `${calcUnit(value, showUnitConfig)}${unit}`
                        : `${unit}${calcUnit(value, showUnitConfig)}`
                  }
                  return showLabel
                },
              },
            },
          }
          deepMerge(item, { ...labelConfig })
        }
      })
      //显示总计配置
      let summaryConfig = config.compStyleConfig.summary
      if (summaryConfig.showTotal && chartData && chartData.length > 0) {
        //左y轴
        let leftData = chartData.filter((item) => !item.yAxisIndex || item.yAxisIndex == '0')
        let totalTitle = summaryConfig.showY ? calcTotal(summaryConfig, leftData) : ''
        Object.assign(chartOption.title, { text: totalTitle })
      }
    }
    //设置内边距
    chartOption.geo.top = 20
    return chartOption
  }
  /**
   * 计算总计
   * @param series
   * @param summaryConfig
   */
  function calcTotal(summaryConfig, chartData) {
    let rawData = chartData
    if (rawData && rawData.length > 0) {
      let showField = summaryConfig.showField
      let showName = summaryConfig.showName || '总计'
      let totalType = summaryConfig.totalType || 'sum'
      let valueField = showField == 'all' ? 'value' : showField
      let valueArr = rawData.map((item) => (item[valueField] ? item[valueField] : 0))
      let total = 0
      if (valueArr.length > 0) {
        if (totalType == 'sum') {
          total = valueArr.reduce((prev, cur) => prev + cur, 0)
        } else if (totalType == 'max') {
          total = Math.max.apply(Math, valueArr)
        } else if (totalType == 'min') {
          total = Math.min.apply(Math, valueArr)
        } else if (totalType == 'average') {
          // @ts-ignore
          total = (valueArr.reduce((prev, cur) => prev + cur, 0) / valueArr.length).toFixed(2)
        }
      }
      //TODO 换算单位和数值级别
      return `${showName}: ${keepTwoDecimals(total)}`
    }
    return ''
  }
  /**
   * 设置常规配置
   * @param {Object} chartOption
   */
  function handleCommonOpt(chartOption) {
    if (chartOption.visualMap) {
      chartOption.visualMap.show = false
    }
    return chartOption
  }
  /**
   * 获取转换后的地图数据
   * @param chartData
   */
  function getFromConvertData(chartData) {
    let result = [];
    let names = [];
    for (let i = 0; i < chartData.length; i++) {
      let fromName = chartData[i].fromName;
      if (fromName && names.indexOf(fromName) == -1) {
        result.push({
          name: fromName,
          value: [chartData[i].fromLng, chartData[i].fromLat, chartData[i].value],
        });
        names.push(fromName);
      }
    }
    return result;
  }

  /**
   * 获取转换后的地图数据
   * @param chartData
   */
  function getToConvertData(chartData) {
    let result = [];
    let names = [];
    for (let i = 0; i < chartData.length; i++) {
      let toName = chartData[i].toName;
      if (toName && names.indexOf(toName) == -1) {
        result.push({
          name: toName,
          value: [chartData[i].toLng, chartData[i].toLat, chartData[i].value],
        });
        names.push(toName);
      }
    }
    return result;
  }
  return [
    { dataSource, reload, pageTips, config, chartOption, mapDataJson,mapName, getAreaCode,city_point,city_center },
    {
      queryData,
      registerMap,
      handleTotalAndUnitMap,
      handleCommonOpt,
      setGeoAreaColor,
      getConvertData,
      queryCityCenter,
      getHeatMapData,
      getFromConvertData,
      getToConvertData,
    },
  ]
}
