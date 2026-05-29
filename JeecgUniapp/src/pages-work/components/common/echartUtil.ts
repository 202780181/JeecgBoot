import {conditionOptions,colorPanel,tableEllipsis,selectType} from './concants.js'
import dayjs from 'dayjs';
import weekday from 'dayjs/plugin/weekday';
import localeData from 'dayjs/plugin/localeData';
import { cloneDeep } from 'lodash-es';
import {isNumber,isString,isNullOrUnDef,isArray} from '@/utils/is'
import { getEnvBaseUrl } from '@/utils'
dayjs.extend(weekday);
dayjs.extend(localeData);

export function parseTime(time, cFormat) {
    if (arguments.length === 0) {
        return null
    }

    let date
    const format = cFormat || '{y}-{m}-{d} {h}:{i}:{s}'

    if (typeof time === 'object') {
        date = time
    } else {
        if (typeof time === 'string' && /^[0-9]+$/.test(time)) {
            time = parseInt(time)
        }else{
            time = new Date(time)
        }
        //update-begin---author:wangshuai ---date:20220802  for：[VUEN-1755]集成 LumenIM：时间先转成字符串在替换------------
        date = new Date(time.toString().replace(/-/g, '/'))
        //update-end---author:wangshuai ---date:20220802  for：[VUEN-1755]集成 LumenIM：时间先转成字符串在替换------------
    }

    const formatObj = {
        y: date.getFullYear(),
        m: date.getMonth() + 1,
        d: date.getDate(),
        h: date.getHours(),
        i: date.getMinutes(),
        s: date.getSeconds(),
        a: date.getDay(),
    }

    const time_str = format.replace(/{([ymdhisa])+}/g, (result, key) => {
        const value = formatObj[key]
        // Note: getDay() returns 0 on Sunday
        if (key === 'a') {
            return ['日', '一', '二', '三', '四', '五', '六'][value]
        }

        return value.toString().padStart(2, '0')
    })

    return time_str
}

/**
 * 根据类型获取时间范围
 * @param type
 */
export function getRange(type) {
    let date = new Date();
    switch (type) {
        case 'today':
            return nowDay(date);
            break;
        case 'yesterday':
            return preDay(date);
            break;
        case 'befYesterday':
            return preDay(date, 2);
            break;
        case 'tomorrow':
            return nextDay(date);
            break;
        case 'week':
            return nowWeek(date);
            break;
        case 'preWeek':
            return preWeek(date);
            break;
        case 'befPreWeek':
            return preWeek(date, 2);
            break;
        case 'nextWeek':
            return nextWeek(date);
            break;
        case 'month':
            return nowMonth(date);
            break;
        case 'preMonth':
            return preMonth(date);
            break;
        case 'befPreMonth':
            return preMonth(date, 2);
            break;
        case 'nextMonth':
            return nextMonth(date);
            break;
        case 'year':
            return nowYear(date);
            break;
        case 'preYear':
            return preYear(date);
            break;
        case 'befPreYear':
            return preYear(date, 2);
            break;
        case 'nextYear':
            return nextYear(date);
            break;
        default:
            return null;
    }
}
/**
 * https://blog.csdn.net/hhhppj/article/details/122432517
 * 当前天
 * @param date
 */
export function nowDay(date) {
    let startDate = dayjs(date).startOf('days').format('YYYY-MM-DD HH:mm:ss');
    let endDate = dayjs(date).endOf('days').format('YYYY-MM-DD HH:mm:ss');
    return [startDate, endDate];
}
/**
 * 当前周
 * @param date
 */
export function nowWeek(date) {
    let startDate = dayjs(date).startOf('week').format('YYYY-MM-DD HH:mm:ss');
    let endDate = dayjs(date).endOf('week').format('YYYY-MM-DD HH:mm:ss');
    return [startDate, endDate];
}

/**
 * 当前月
 * @param date
 */
export function nowMonth(date) {
    let startDate = dayjs(date).startOf('month').format('YYYY-MM-DD HH:mm:ss');
    let endDate = dayjs(date).endOf('month').format('YYYY-MM-DD HH:mm:ss');
    return [startDate, endDate];
}

/**
 * 当前年
 * @param date
 */
export function nowYear(date) {
    let startDate = dayjs(date).startOf('year').format('YYYY-MM-DD HH:mm:ss');
    let endDate = dayjs(date).endOf('year').format('YYYY-MM-DD HH:mm:ss');
    return [startDate, endDate];
}
/**
 * 前一天
 * @param date
 */
function preDay(date, interval = 1) {
    let startDate = dayjs(date).subtract(interval, 'days').startOf('days').format('YYYY-MM-DD HH:mm:ss');
    let endDate = dayjs(date).subtract(interval, 'days').endOf('days').format('YYYY-MM-DD HH:mm:ss');
    return [startDate, endDate];
}

/**
 * 后一天
 * @param date
 */
function nextDay(date) {
    let startDate = dayjs(date).add(1, 'days').startOf('days').format('YYYY-MM-DD HH:mm:ss');
    let endDate = dayjs(date).add(1, 'days').endOf('days').format('YYYY-MM-DD HH:mm:ss');
    return [startDate, endDate];
}

/**
 * 前一周
 * @param date
 */
function preWeek(date, interval = 1) {
    let startDate = dayjs(date).subtract(interval, 'week').startOf('week').format('YYYY-MM-DD HH:mm:ss');
    let endDate = dayjs(date).subtract(interval, 'week').endOf('week').format('YYYY-MM-DD HH:mm:ss');
    return [startDate, endDate];
}

/**
 * 后一周
 * @param date
 */
function nextWeek(date) {
    let startDate = dayjs(date).add(1, 'week').startOf('week').format('YYYY-MM-DD HH:mm:ss');
    let endDate = dayjs(date).add(1, 'week').endOf('week').format('YYYY-MM-DD HH:mm:ss');
    return [startDate, endDate];
}

/**
 * 前一月
 * @param date
 */
function preMonth(date, interval = 1) {
    let startDate = dayjs(date).subtract(interval, 'month').startOf('month').format('YYYY-MM-DD HH:mm:ss');
    let endDate = dayjs(date).subtract(interval, 'month').endOf('month').format('YYYY-MM-DD HH:mm:ss');
    return [startDate, endDate];
}

/**
 * 后一月
 * @param date
 */
function nextMonth(date) {
    let startDate = dayjs(date).add(1, 'month').startOf('month').format('YYYY-MM-DD HH:mm:ss');
    let endDate = dayjs(date).add(1, 'month').endOf('month').format('YYYY-MM-DD HH:mm:ss');
    return [startDate, endDate];
}

/**
 * 前一年
 * @param date
 */
function preYear(date, interval = 1) {
    let startDate = dayjs(date).subtract(interval, 'year').startOf('year').format('YYYY-MM-DD HH:mm:ss');
    let endDate = dayjs(date).subtract(interval, 'year').endOf('year').format('YYYY-MM-DD HH:mm:ss');
    return [startDate, endDate];
}

/**
 * 后一年
 * @param date
 */
function nextYear(date) {
    let startDate = dayjs(date).add(1, 'year').startOf('year').format('YYYY-MM-DD HH:mm:ss');
    let endDate = dayjs(date).add(1, 'year').endOf('year').format('YYYY-MM-DD HH:mm:ss');
    return [startDate, endDate];
}

/**
 * mongodb字段翻译
 * @param chartData 数值
 * @param config 配置
 */
export function handleTranslate(chartData, config) {
    let {
        nameFields,
        typeFields,
        assistTypeFields
    } = config;
    let nameHasArea = nameFields.some(name => name.widgetType == 'area-linkage');
    let typeHasArea = typeFields.some(type => type.widgetType == 'area-linkage');
    let assistTypeHasDate = assistTypeFields.some(type => type.widgetType == 'area-linkage');
    if (nameHasArea || typeHasArea || assistTypeHasDate) {
        chartData.forEach((item) => {
            if (nameHasArea && item.name) {
                let cityName = getAreaTextByCode(item.name);
                item[nameFields[0].fieldName + '_dictVal'] = item.name;
                cityName && (item.name = cityName);
            }
            if (typeHasArea && item.type) {
                let cityName = getAreaTextByCode(item.type);
                item[typeFields[0].fieldName + '_dictVal'] = item.type;
                cityName && (item.type = cityName);
            }
            if (assistTypeHasDate && item.yAxisIndex == '1' && item.type) {
                let cityName = getAreaTextByCode(item.type);
                item[typeFields[0].fieldName + '_dictVal'] = item.type;
                cityName && (item.type = cityName);
            }
        });
    }
    return chartData;
}

/**
 *TODO 根据code获取地区名称
 */
function getAreaTextByCode(code){
return code
}
/**
 * 字符串计算
 * @param fn
 */
export function calcStr(fn) {
    try {
        const Fn = Function;
        return new Fn('return ' + fn)();
    } catch (e) {
        console.log('calcStr', e)
        return null
    }
}

/**
 * 根据条件获取查询时间范围
 * @param queryCondition
 */
export function getTimeRange(queryCondition) {
    let params = [];
    if(queryCondition.customTime && queryCondition.customTime.length==2){
        let startTime = `${queryCondition.customTime[0]} 00:00:00`;
        let endTime = `${queryCondition.customTime[1]} 23:59:59`;
        return [startTime,endTime]
    }
    if (queryCondition.queryRange != 'all') {
        let timeRange = getRange(queryCondition.queryRange);
        if (timeRange && timeRange.length > 0) {
            params[0] = timeRange[0];
            params[1] = timeRange[1];
        }
        return params
    }
    return params
}

/**
 * 获取筛选条件
 * @param ele
 */
export function getConditionOptions(ele) {
    if (ele.widgetType == 'pca') {
        return conditionOptions['pca']
    }
    if (ele.widgetType == 'sub-table-design') {
        return conditionOptions['sub-table-design']
    }
    if (ele.widgetType == 'link-record') {
        return conditionOptions['link-record']
    }
    if (ele.widgetType == 'table-dict' && ele.options.queryScope !== 'database') {
        return conditionOptions['link-record']
    }
    if (ele.widgetType == 'time') {
        return conditionOptions['time']
    }
    if (ele.fieldType == 'Date' || ele.fieldType == 'date') {
        return conditionOptions['date']
    }
    if (selectType.includes(ele.widgetType)) {
        return conditionOptions['select']
    }
    if (['int', 'double', 'BigDecimal', 'number'].includes(ele.fieldType) || ["money", "integer", "rate", "slider"]
        .includes(ele.widgetType)) {
        return conditionOptions['number']
    }
    return conditionOptions['text']
};
/**
 * 组装筛选条件
 * @param conditionFields
 */
export function packageConditionFields(conditionFields, formType) {
    let arr = [];
    conditionFields.forEach(fieldItem => {
        let obj = {};
        let condition = fieldItem.condition;
        let fieldName = fieldItem.fieldName;
        let fieldType = fieldItem.fieldType;
        let widgetType = fieldItem.widgetType;
        let fieldValue = fieldItem.fieldValue;
        obj['cType'] = condition;
        obj['field'] = fieldName;
        obj['type'] = fieldType;
        obj['wType'] = widgetType;
        obj['value'] = fieldValue;
        //获取表达式
        let conditionOption = getConditionOptions(fieldItem).filter(item => item.value == condition);
        obj['expression'] = `common_${condition}`;
        //关联记录和子表
        if (['link-record', 'sub-table-design'].includes(widgetType)) {
            obj['code'] = fieldItem.localField || fieldItem.sourceCode;
        }
        //表字典
        if ('table-dict' == widgetType && fieldItem.options.queryScope !== 'database') {
            obj['code'] = fieldName;
        }
        //开关
        if ('switch' == widgetType && !fieldValue) {
            fieldValue = fieldItem.options.defaultValue || fieldItem.options.inactiveValue;
            obj['value'] = fieldValue;
        }
        //判断非空和不为空
        if (condition == '7' || condition == '8') {
            arr.push(obj);
        } else {
            //是否有数值
            let hasValueFlag = fieldValue ? true : false;
            //1.数值条件
            if (["int", "integer", "double", "BigDecimal", "number"].includes(fieldType)) {
                obj['type'] = "number";
                //1.1数值条件范围查询
                if (condition == '9' || condition == '10') {
                    obj['begin'] = fieldItem.beginValue ? Number(fieldItem.beginValue) : fieldItem.beginValue;
                    obj['end'] = fieldItem.endValue ? Number(fieldItem.endValue) : fieldItem.endValue;
                    hasValueFlag = (obj['begin'] || obj['begin'] == 0) && (obj['end'] || obj['end'] == 0) ?
                        true : false;
                } else {
                    obj['value'] = Number(fieldValue);
                    hasValueFlag = obj['value'] || obj['value'] == 0 ? true : false;
                }
            } else if (fieldItem.widgetType == 'time') {
                obj['type'] = "time";
                if (condition == '9' || condition == '10') {
                    obj['begin'] = fieldItem.beginValue ? parseTime(fieldItem.beginValue,'HH:mm:ss'): null;
                    obj['end'] = fieldItem.endValue ? parseTime(fieldItem.endValue,'HH:mm:ss') : null;
                    hasValueFlag = (!obj['begin'] || !obj['end']) ? false : true
                } else {
                    obj['value'] = fieldValue ? fieldValue.format('HH:mm:ss') : null;
                    hasValueFlag = obj['value'] ? true : false;
                }
            } else if (fieldItem.widgetType == 'pca' || fieldItem.widgetType == 'area-linkage') {
                obj['type'] = "pca";
                obj['value'] = fieldValue && isArray(fieldValue) ? fieldValue[fieldValue.length - 1] : null;
                hasValueFlag = obj['value'] ? true : false;
            } else if (fieldType == 'Date' || fieldType == 'date') {
                //2.日期条件
                obj['type'] = "date";
                //2.1 日期条件范围查询
                if (condition == '9' || condition == '10') {
                    if (fieldItem.options && fieldItem.options.type == 'datetime') {
                        //日期时间
                        obj['begin'] = fieldItem.fieldValue[0] ? fieldItem.fieldValue[0] : null;
                        obj['end'] = fieldItem.fieldValue[1] ? fieldItem.fieldValue[1] : null;
                    } else {
                        //非日期时间
                        if (fieldItem.fieldValue[0]) {
                            const timeBegin = new Date(parseTime(fieldItem.fieldValue[0],`YYYY-MM-DD HH:mm:ss`));
                            timeBegin.setHours(0, 0, 0, 0);
                            obj['begin'] = parseTime(timeBegin.getTime(),`YYYY-MM-DD HH:mm:ss`);
                        }
                        if (fieldItem.fieldValue[1]) {
                            const timeEnd = new Date(parseTime(fieldItem.fieldValue[1],`YYYY-MM-DD HH:mm:ss`));
                            timeEnd.setHours(23, 59, 59, 999);
                            obj['end'] = parseTime(timeEnd.getTime(),`YYYY-MM-DD HH:mm:ss`);
                        }
                    }
                    hasValueFlag = (!obj['begin'] || !obj['end']) ? false : true;
                } else {
                    if (fieldItem.timeCondition == 'customTime') {
                        if (fieldValue) {
                            const timeBegin = new Date(fieldValue);
                            timeBegin.setHours(0, 0, 0, 0);
                            const timeEnd = new Date(fieldValue);
                            timeEnd.setHours(23, 59, 59, 999);
                            obj['begin'] = parseTime(timeBegin.getTime(),`YYYY-MM-DD HH:mm:ss`);
                            obj['end'] = parseTime(timeEnd.getTime(),`YYYY-MM-DD HH:mm:ss`);
                            hasValueFlag = (!obj['begin'] || !obj['end']) ? false : true;
                        }
                    } else {
                        let range = getRange(fieldItem.timeCondition);
                        obj['value'] = range && range.length > 0 ? range[0] : null;
                        obj['begin'] = range && range.length > 0 ? range[0] : null;
                        obj['end'] = range && range.length > 1 ? range[1] : null;
                        if (condition == '1' || condition == '2') {
                            hasValueFlag = (!obj['begin'] || !obj['end']) ? false : true;
                        }
                        //早于等于
                        if (condition == '4' || condition == '6') {
                            obj['value'] = range && range.length > 0 ? range[0] : null;
                            hasValueFlag = obj['value'] ? true : false;
                        }
                        //晚于等于
                        if (condition == '3' || condition == '5') {
                            obj['value'] = range && range.length > 0 ? range[1] : null;
                            hasValueFlag = obj['value'] ? true : false;
                        }
                    }
                }
            }
            //下拉多选
            if (selectType.includes(fieldItem.widgetType)) {
                obj['type'] = "select";
                obj['value'] = null;
                if (fieldValue) {
                    if (isArray(fieldValue)) {
                        obj['value'] = fieldValue.length > 0 ? JSON.stringify(fieldValue) : null;
                    } else {
                        obj['value'] = JSON.stringify(fieldValue.split(","));
                    }
                }
                hasValueFlag = obj['value'] ? true : false;
            }
            //3.设置条件表达式
            //表达式存在的情况下，才当作查询条件
            if (conditionOption && conditionOption.length > 0) {
                if (['string', 'text', 'Text'].includes(obj['type']) && ['4', '5', '6'].includes(condition)) {
                    obj['expression'] = `text_${condition}`;
                    //like条件设置查询值的前后缀
                    if (formType && formType == 'design') {
                        obj['value'] = `${fieldValue}`;
                    } else {
                        obj['value'] = conditionOption[0]['value'] == '5' ? `${fieldValue}%` : `%${fieldValue}`;
                    }
                }
                if (obj['type'] == 'select' && ['3', '4'].includes(condition)) {
                    obj['expression'] = `select_${condition}`;
                }
                hasValueFlag && arr.push(obj);
            }
        }
    });
    return arr
}
/**
 * 组装筛选条件
 * @param conditionFields
 */
export function packageConditionQuery(conditionFields) {
    let arr = [];
    conditionFields.forEach(fieldItem => {
        let obj = {};
        let condition = fieldItem.condition;
        let fieldName = fieldItem.fieldName;
        let fieldType = fieldItem.fieldType;
        let widgetType = fieldItem.widgetType;
        let fieldValue = fieldItem.fieldValue;
        obj['cType'] = condition;
        obj['field'] = fieldName;
        obj['type'] = fieldType;
        obj['wType'] = widgetType;
        obj['value'] = fieldValue;
        //获取表达式
        let conditionOption = getConditionOptions(fieldItem).filter(item => item.value == condition);
        obj['expression'] = `common_${condition}`;
        //关联记录和子表
        if (['link-record', 'sub-table-design'].includes(widgetType)) {
            obj['code'] = fieldItem.localField || fieldItem.sourceCode;
        }
        //表字典
        if ('table-dict' == widgetType && fieldItem.options.queryScope !== 'database') {
            obj['code'] = fieldName;
        }
        //开关
        if ('switch' == widgetType && !fieldValue) {
            obj['value'] = fieldValue;
        }
        //是否有数值
        let hasValueFlag = fieldValue ? true : false;
        //1.数值条件
        if (["int", "integer", "double", "BigDecimal", "number"].includes(fieldType)) {
            obj['type'] = "number";
            //1.1数值条件范围查询
            if (condition == '9') {
                obj['begin'] = fieldItem.beginValue ? Number(fieldItem.beginValue) : fieldItem.beginValue;
                obj['end'] = fieldItem.endValue ? Number(fieldItem.endValue) : fieldItem.endValue;
                hasValueFlag = (obj['begin'] || obj['begin'] == 0) && (obj['end'] || obj['end'] == 0) ?
                    true : false;
            } else {
                obj['value'] = fieldValue?Number(fieldValue):null;
                hasValueFlag = obj['value'] || obj['value'] == 0 ? true : false;
            }
        } else if (fieldItem.widgetType == 'time') {
            obj['type'] = "time";
            if (condition == '9') {
                obj['begin'] = fieldItem.beginValue ? parseTime(fieldItem.beginValue,'HH:mm:ss'): null;
                obj['end'] = fieldItem.endValue ? parseTime(fieldItem.endValue,'HH:mm:ss') : null;
                hasValueFlag = (!obj['begin'] || !obj['end']) ? false : true
            } else {
                obj['value'] = fieldValue;
                hasValueFlag = obj['value'] ? true : false;
            }
        } else if (fieldItem.widgetType == 'pca' || fieldItem.widgetType == 'area-linkage') {
            obj['type'] = "pca";
            obj['value'] = fieldValue && isArray(fieldValue) ? fieldValue[fieldValue.length - 1] : null;
            hasValueFlag = obj['value'] ? true : false;
        } else if (fieldType == 'Date' || fieldType == 'date') {
            //2.日期条件
            obj['type'] = "date";
            //2.1 日期条件范围查询
            if (condition == '9') {
                if (fieldItem.options && fieldItem.options.type == 'datetime') {
                    //日期时间
                    obj['begin'] = fieldItem.fieldValue[0] ? fieldItem.fieldValue[0] : null;
                    obj['end'] = fieldItem.fieldValue[1] ? fieldItem.fieldValue[1] : null;
                } else {
                    //非日期时间
                    if (fieldItem.beginValue) {
                        const timeBegin = new Date(fieldItem.beginValue);
                        timeBegin.setHours(0, 0, 0, 0);
                        obj['begin'] = dayjs(timeBegin.getTime()).format(`YYYY-MM-DD HH:mm:ss`);
                    }
                    if (fieldItem.endValue) {
                        const timeEnd = new Date(fieldItem.endValue);
                        timeEnd.setHours(23, 59, 59, 999);
                        obj['end'] = dayjs(timeEnd.getTime()).format(`YYYY-MM-DD HH:mm:ss`);
                    }
                }
                hasValueFlag = (!obj['begin'] || !obj['end']) ? false : true;
            } else {
                if (fieldValue) {
                    const timeBegin = new Date(fieldValue);
                    timeBegin.setHours(0, 0, 0, 0);
                    const timeEnd = new Date(fieldValue);
                    timeEnd.setHours(23, 59, 59, 999);
                    obj['begin'] = dayjs(timeBegin.getTime()).format(`YYYY-MM-DD HH:mm:ss`);
                    obj['end'] = dayjs(timeEnd.getTime()).format(`YYYY-MM-DD HH:mm:ss`);
                    hasValueFlag = (!obj['begin'] || !obj['end']) ? false : true;
                }
            }
        }
        //下拉多选
        if (selectType.includes(fieldItem.widgetType)) {
            obj['type'] = "select";
            obj['value'] = null;
            if (fieldValue) {
                if (isArray(fieldValue)) {
                    obj['value'] = fieldValue.length > 0 ? JSON.stringify(fieldValue) : null;
                } else {
                    obj['value'] = JSON.stringify(fieldValue.split(","));
                }
            }
            hasValueFlag = obj['value'] ? true : false;
        }
        //3.设置条件表达式
        //表达式存在的情况下，才当作查询条件
        if (conditionOption && conditionOption.length > 0) {
            if (obj['type'] == 'select' && ['3', '4'].includes(condition)) {
                obj['expression'] = `select_${condition}`;
            }
            hasValueFlag && arr.push(obj);
        }
    });
    console.log("arr****************>>>>>>",arr)
    return arr
}
/**
 * 组装查询数据
 * @param config
 * @param params
 */
export function packageParams(config,params) {
    console.log("config",config)
    console.log("params",params)
    //=====================================
    let sorts = {};
    if(config.sorts && config.sorts.name && config.sorts.name.indexOf("null") == -1){
        let lastIndexOf = config.sorts.name.lastIndexOf("_");
        sorts["name"] = config.sorts.name.substring(0,lastIndexOf);
        sorts["order"] = config.sorts.name.substring(lastIndexOf+1);
        sorts["type"] = config.sorts.type;
    }
    //=============筛选条件begin============
    let conditionFields = [];
    if (config && config.filter && config.filter.conditionFields && config.filter.conditionFields.length > 0) {
        conditionFields = packageConditionFields(config.filter.conditionFields, config.formType);
    }
    let filter = {
        field: config.filter.queryField,
        range: getTimeRange(config.filter),
        mode: config.filter.conditionMode,
        fields: conditionFields
    };
    //=============筛选条件end=====================

    //===========查询筛选条件begin=================
    if(params){
        if(params.type && params.type == 'fieldQuery'){
            //2.设置查询字段
            if(params.conditionFields && params.conditionFields.length>0){
                filter['mode'] = "and";
                filter['fields'] = packageConditionQuery(params.conditionFields);
            }
            console.log("筛选器筛选条件filter:::::>>>>>",filter)
        }
    }
    //===========查询筛选条件end=================
    return {
        sorts,
        filter
    }
}
/**
 * 格式化时间
 * @param dateStr
 * @param fmt
 */
export function formatDate(dateStr, fmt = 'YYYY-MM-D hh:mm:ss') {
    fmt = fmt.toUpperCase();
    if (fmt.indexOf('SS') != -1) {
        fmt = fmt.replace('SS', 'ss')
    }
    return dayjs(dateStr).format(fmt);
}
/**
 * mongodb类型格式化时间戳
 * @param chartData 数值
 * @param config 配置
 */
export function formatTimestamp(chartData, config) {
    let nameField = config.nameFields;
    let typeField = config.typeFields;
    let assistType = config.assistTypeFields;
    let nameHasDate = nameField.some(name => name.widgetType == 'date');
    let typeHasDate = typeField.some(type => type.widgetType == 'date');
    let assistTypeHasDate = assistType.some(type => type.widgetType == 'date');
    if (nameHasDate || typeHasDate || assistTypeHasDate) {
        chartData.forEach((item) => {
            if (nameHasDate) {
                let defVal = parseInt(item.name);
                let nameFormat = nameField[0]?.options?.format || 'YYYY-MM-DD';
                item.name = item.name ? formatDate(defVal, nameFormat) : "";
                item[nameField[0].fieldName + '_dictVal'] = defVal;
            }
            if (typeHasDate) {
                let defVal = parseInt(item.type);
                let typeFormat = typeField[0]?.options?.format || 'YYYY-MM-DD';
                item.type = item.type ? formatDate(defVal, typeFormat) : "";
                item[typeField[0].fieldName + '_dictVal'] = defVal;
            }
            if (assistTypeHasDate && item.yAxisIndex == '1' && item.type) {
                let defVal = parseInt(item.type);
                let typeFormat = assistType[0]?.options?.format || 'YYYY-MM-DD';
                item.type = item.type ? formatDate(defVal, typeFormat) : "";
                item[typeField[0].fieldName + '_dictVal'] = defVal;
            }
        });
    }
    return chartData;
}
/**
 * 处理计算字段
 * @param valueFields
 */
export function handleCalcFields(arr, valueFields, assistYFields) {
    let valField = valueFields.filter((item) => item.widgetType == 'calcVal');
    let assistYField = assistYFields.filter((item) => item.widgetType == 'calcVal');
    // @ts-ignore
    let calcField = [...new Set([...valField, ...assistYField])];
    if (calcField && calcField.length > 0) {
        calcField.forEach((field) => {
            let fieldName = field.fieldName;
            arr.forEach((item) => {
                if (Object.keys(item).includes(fieldName)) {
                    let formulaStr = fieldName.replace(/\$(.*?)\$/g, function(str) {
                        if (str) {
                            let field = str.replace(/\$/g, '');
                            if (field && isString(field) && !isNullOrUnDef(item[field])) {
                                return item[field];
                            }
                        }
                        return str;
                    });
                    item['value'] = keepTwoDecimals(calcStr(formulaStr));
                }
            });
        });
    }
    return arr;
}
/**
 * 处理计算字段
 * @param valueFields
 */
export function handleTableCalcFields(arr,valueFields) {
    let calcField = valueFields.filter((item) => item.widgetType == 'calcVal');
    if (calcField && calcField.length > 0) {
        calcField.forEach((field) => {
            let fieldName = field.fieldName;
            arr.forEach((item) => {
                if (Object.keys(item).includes(fieldName)) {
                    let formulaStr = fieldName.replace(/\$(.*?)\$/g, function (str) {
                        if (str) {
                            let field = str.replace(/\$/g, '');
                            if (field && isString(field) && !isNullOrUnDef(item[field])) {
                                return item[field];
                            }
                        }
                        return str;
                    });
                    item['value'] = keepTwoDecimals(calcStr(formulaStr));
                }
            });
        });
    }
    return arr;
}
/**
 * mongodb类型格式化时间戳
 * @param chartData 数值
 * @param config 配置
 */
export function handleDateFields(chartData,config) {
    let nameField = config.nameFields;
    let typeField = config.typeFields;
    let assistType = config.assistTypeFields;
    let nameHasDate = nameField.some(name=> name.widgetType== 'date');
    let typeHasDate = typeField.some(type=> type.widgetType== 'date');
    let assistTypeHasDate = assistType.some(type=> type.widgetType== 'date');
    if (nameHasDate || typeHasDate || assistTypeHasDate) {
        chartData.forEach((item) => {
            if (nameHasDate && !item[nameField[0].fieldName+'_dictVal']) {
                let defVal = item.name.indexOf("-")>=0?item.name:parseInt(item.name);
                let nameFormat = nameField[0].options && nameField[0].options.format?nameField[0].options.format:'YYYY-MM-DD'
                item.name = item.name ? formatDate(defVal, nameFormat) : "";
            }
            if (typeHasDate && !item[typeField[0].fieldName+'_dictVal']) {
                let defVal = item.type.indexOf("-")>=0?item.type:parseInt(item.type);
                let typeFormat = typeField[0].options && typeField[0].options.format?typeField[0].options.format:'YYYY-MM-DD'
                item.type = item.type ? formatDate(defVal, typeFormat) : "";
            }
            if (assistTypeHasDate && !item[assistType[0].fieldName+'_dictVal'] && item.yAxisIndex == '1' && item.type) {
                let defVal = item.type.indexOf("-")>=0?item.type:parseInt(item.type);
                let typeFormat = assistType[0].options && assistType[0].options.format?assistType[0].options.format:'YYYY-MM-DD'
                item.type = item.type ? formatDate(defVal, typeFormat) : "";
            }
        });
    }
    return chartData;
}
/**
 * 保留两位小数
 * @param fn
 */
export function keepTwoDecimals(total) {
    if (total) {
        let dot = String(total).indexOf(".");
        if (dot != -1) {
            let dotCnt = String(total).substring(dot + 1, total.length);
            if (dotCnt.length > 2) {
                total = total.toFixed(2);
            }
        }
    }
    return total;
}
/**
 * 深度合并代码，思路来自 zepto.js 源代码
 * 切记不要对象递归引用，否则会陷入递归跳不出来，导致堆栈溢出
 * 作用是会合并 target 和 other 对应位置的值，冲突的会保留 target 的值
 */
export function deepMerge(target,other){
    const targetToString=Object.prototype.toString.call(target);
    const otherToString=Object.prototype.toString.call(target);
    if(targetToString==="[object Object]" && otherToString==="[object Object]"){
        for(let [key,val] of Object.entries(other)){
            if(!target[key]){
                target[key]=val;
            }else{
                target[key]=deepMerge(target[key],val);
            }
        }
    }else if(targetToString==="[object Array]" && otherToString==="[object Array]"){
        for(let [key,val] of Object.entries(other)){
            if(target[key]){
                target[key]=deepMerge(target[key],val);
            }else{
                target.push(val);
            }
        }
    }
    return target;
}
/**
 * 根据配置获取颜色
 * @param index
 */
export function getCustomColor(customColor) {
    let colors = colorPanel.classic.map(color=>({color}));
    return customColor ? customColor : colors;
}
/**
 * 计算多数据柱形图获取dataset
 */
export function getDataSet(chartData,config) {
    let dataObj = { dimensions: [], source: [] };
    let dataList = [];
    //获取系列
    // @ts-ignore
    let dimensions = ['stack', ...new Set(chartData.map((item) => item['type']))];
    //获取name集合
    // @ts-ignore
    let nameArr = [...new Set(chartData.map((item) => item['name']))];
    if(config.dataFilterNum && isNumber(config.dataFilterNum)){
        nameArr = nameArr.slice(0,config.dataFilterNum)
    }
    //遍历name获取value
    nameArr.forEach((name) => {
        //筛选出指定name的对象集合
        let arr = chartData.filter((item) => item['name'] == name);
        //获取对象集合的value
        let valueList = arr.map((item) => item['value']);
        //首位置存放的是当前name
        valueList.unshift(name);
        dataList.push(valueList);
    });
    dataObj.dimensions = dimensions;
    dataObj.source = dataList;
    return dataObj;
}
/**
 *计算显示单位
 * @param value 数值
 * @param calcConfig 计算配置
 */
export function calcUnit(value, calcConfig,defDecimal=0) {
    let numberLevel = calcConfig.numberLevel;
    let decimal = calcConfig.decimal||defDecimal;
    let mapping = {"0":1,"1":100, "2":1000, "3":1/1000, "4":1/10000, "5":1/1000000};
    let multiple = numberLevel?mapping[numberLevel]:1;
    value = (value * multiple).toFixed(decimal);
    return value
}
/**
 * 计算总计
 * @param series
 * @param summaryConfig
 */
export function calcTotal(summaryConfig,rawData,config){
    if(rawData && rawData.length>0){
        let showField = summaryConfig.showField;
        // 找单位
        const findItem = config.valueFields?.find(item => item.fieldName === showField);
        const unitText = findItem?.options?.unitText || "";
        let showName = summaryConfig.showName || '总计';
        let totalType = summaryConfig.totalType || 'sum';
        let valueField = showField=='all'?'value':showField;
        // update-begin-author:liaozhiyang date:2023-12-1 for:【QQYUN-7911】解决总计是0
        let valueArr = rawData.map(item=> {
            if(isNumber(item[valueField])){
                return item[valueField];
            }else{
                const value = Number(item[valueField].replace(unitText,""));
                if(Number.isNaN(value)){
                    return 0;
                }else{
                    return value;
                }
            }
        });
        // update-end-author:liaozhiyang date:2024-01-17 for:【QQYUN-7911】解决总计是0
        let total = 0;
        if(valueArr.length>0){
            if(totalType=='sum'){
                total = valueArr.reduce((prev,cur)=>prev + cur,0);
            }else if(totalType=='max'){
                total = Math.max.apply(Math,valueArr);
            }else if(totalType=='min'){
                total = Math.min.apply(Math,valueArr);
            }else if(totalType=='average'){
                // @ts-ignore
                total = ((valueArr.reduce((prev,cur)=>prev + cur,0))/ valueArr.length).toFixed(2);
            }
        }
        //TODO 换算单位和数值级别
        return `${showName}: ${keepTwoDecimals(total)}`;
    }
    return ''
}
/**
 * 设置图例距离(为了使用百分比需要特殊处理)
 */
export function setLegendTop(chartOption,config) {
    if (chartOption?.legend) {
        chartOption.legend.top = (config.option?.legend?.t || 2 ) + '%';
        chartOption.legend.right = (config.option?.legend?.r || 4) + '%';
        if(chartOption.legend?.data && isArray(chartOption.legend?.data ) && chartOption.legend?.data.length==0){
            chartOption.legend.data = null;
        }
    }
}
/**
 * 设置数值坐标轴的显示单位
 */
export function setValueAxisUnit(options) {
    if (options?.yAxis) {
        try {
            //双轴图
            if(isArray(options?.yAxis)){
                options?.yAxis.forEach(item=>{
                    if (item?.type && item?.type == 'value') {
                        if(item?.axisLabel){
                            item.axisLabel.formatter = (value)=>{
                                return getAxisUnit(value,item?.yUnit)
                            }
                        }
                    }
                })
            }else{
                if (options.yAxis?.type && options.yAxis?.type == 'value') {
                    if(options.yAxis?.axisLabel){
                        options.yAxis.axisLabel.formatter = (value)=>{
                            return getAxisUnit(value,options.yAxis?.yUnit)
                        }
                    }
                }
            }
        } catch (e) {
            console.info('数值坐标轴的显示单位异常:', e);
        }
    }
    return options;
}
/**
 *计算数值坐标单位
 * @param value
 * @param unit
 */
export function getAxisUnit(value,unit) {
    if(unit){
        if(unit=='K'){
            return (value / 1000) + 'K';
        }
        if(unit=='W'){
            return (value / 10000) + '万';
        }
        if(unit=='M'){
            return (value / 100000000) + '亿';
        }
    }
    return value;
}
/**
 * 自定义配置
 * @param option
 */
export function commonOption(option,config?){
    //内容格式化
    if(option?.label){
        if(isArray(option.series)){
            option.series.forEach((item,index)=>{
                if(option?.label?.format && item?.label){
                    item.label['formatter'] = option.label.format;
                }else{
                    item.label['formatter']= '{c}'
                }
            })
        }
    }
    //双轴图数值设置修改，只有第一个元素的数值显示
    //update-begin-author:liusq---date:2025-01-10--for: QQYUN-10716 表单设计器对接 大屏 双轴图显示数值 只有第一个显示了
    if(option?.tempCompName=='DoubleLineBar'){
        if(isArray(option.series)){
            option.series.forEach((item)=>{
                item['label'] = {...option.series[0]?.label};
            })
        }
    }
    //update-end-author:liusq---date:2025-01-10--for:  QQYUN-10716 表单设计器对接 大屏 双轴图显示数值 只有第一个显示了

    //显示辅助线的配置
    if(config && config?.markLineConfig){
        let data = [];
        if(config?.markLineConfig?.show){
            if(isArray(config?.markLineConfig?.markLine) && config?.markLineConfig?.markLine.length>0){
                data = config.markLineConfig.markLine.map(item=>{
                    //设置临时组件名，便于区分双轴图
                    item['compName'] = option?.tempCompName;
                    let markLineValue = getMarkLineValue(item,option.tempData);
                    let lineObj = {
                        yAxisType: item?.yAxis,
                        name: item.name,
                        lineStyle: {
                            type: item.auxiliaryLine || 'dashed',
                            color: item.auxiliaryLineColor || 'red'
                        },
                        label: {
                            position: 'insideEndTop',
                            fontSize: item.fontSize,
                            formatter: `${item.name}:${markLineValue}`
                        }
                    }
                    //计算辅助线数值
                    if(option?.yAxis && option?.yAxis?.type && option?.yAxis?.type=='category'){
                        lineObj['xAxis'] = markLineValue || 0;
                    }else{
                        lineObj['yAxis'] = markLineValue || 0;
                    }
                    return lineObj
                })
            }
        }
        option.series.forEach(item=>{
            //判断有没有坐标轴设置
            if(isNullOrUnDef(item?.yAxisIndex)){
                item['markLine'] = { symbol: ['none', 'none'],data}
            }else{
                let yAxisType = item?.yAxisIndex==1?'right':'left';
                let filterData = data.filter(a=>a.yAxisType==yAxisType);
                item['markLine'] = { symbol: ['none', 'none'],data:filterData}
            }
        })
    }
    option['tempData'] = null;
    option['tempCompName'] = null;
    return option
}
/**
 * 获取辅助线设置数值
 * @param item 配置
 * @param data 数值
 */
function getMarkLineValue(item,data){
    let value = item?.value || 0
    if(item.type == 'dynamic' && data && isArray(data)){
        let finalData = data.map(d=>d?.value || 0);
        if(item?.yAxis && item?.compName){
            if(item?.yAxis=='right'){
                finalData = data.filter(a=>a.yAxisIndex == '1').map(d=>d?.value || 0);
            }else{
                finalData = data.filter(a=>a.yAxisIndex == '0').map(d=>d?.value || 0);
            }
        }
        if(item.auxiliaryType =='avg'){
            const sum = finalData.reduce((acc, num) => acc + num, 0);
            value = Math.floor(sum / finalData.length);
        }
        if(item.auxiliaryType =='max'){
            value = Math.max(...finalData);
        }
        if(item.auxiliaryType =='min'){
            value = Math.min(...finalData);
        }
    }
    return value
}
/**
 * 处理总计和显示单位
 * @param {Object} compName
 * @param {Object} chartOption
 * @param {Object} config
 * @param {Object} chartData
 */
export function	handleTotalAndUnit(compName,chartOption,config,chartData){
    //1.获取到label配置项
    if (config.compStyleConfig) {
        //显示单位配置
        let showUnitConfig = config.compStyleConfig.showUnit;
        let unit = showUnitConfig.unit?showUnitConfig.unit:'';//单位
        let numberLevel = showUnitConfig.numberLevel?showUnitConfig.numberLevel:'';//数值数量级
        chartOption.series.forEach((item) => {
            if(item.yAxisIndex == '1'){
                showUnitConfig = config.compStyleConfig.assist.showUnit;
            }
            //数值显示位置
            let labelPosition = compName.indexOf('Pie')!=-1?chartOption.pieLabelPosition:"top";
            //数值配置
            let labelConfig;
            switch(compName){
                case "JColorGauge":
                case "JGauge":
                    delete item.detail.formatter;
                    labelConfig = {
                        detail:{
                            formatter: (value) => {
                                let showLabel = showUnitConfig.position == 'suffix' ? `${calcUnit(value, showUnitConfig)}${unit}` : `${unit}${calcUnit(value, showUnitConfig)}`;
                                return showLabel;
                            }
                        }
                    }
                    break;
                default:
                    labelConfig = {
                        label: {
                            position:compName.indexOf('Funnel')>=0?"inside":labelPosition,
                            formatter: (params) => {
                                let type = params.seriesType;
                                let showLabel = "";
                                if(type == 'pie'){
                                    showLabel = (`${params.name || '空'}:`);
                                }
                                if(type == 'funnel'){
                                    showLabel = (`${params.name || '空'}: `);
                                }
                                let value = 0;
                                if(Array.isArray(params.value)){
                                    value = type == 'scatter'?params.value[1]:params.value[params.seriesIndex + 1];
                                }else{
                                    value = params.value;
                                }
                                //计算显示数值和添加前后缀
                                showLabel += showUnitConfig.position == 'suffix' ? `${calcUnit(value, showUnitConfig)}${unit}` : `${unit}${calcUnit(value, showUnitConfig)}`;
                                return showLabel;
                            },
                        }
                    }
            };
            deepMerge(item, {...labelConfig});
        });
        //显示总计配置
        let summaryConfig = config.compStyleConfig.summary;
        if(summaryConfig.showTotal && chartData && chartData.length>0){
            //左y轴
            let leftData = chartData.filter(item=>(!item.yAxisIndex || item.yAxisIndex == '0'));
            let totalTitle = summaryConfig.showY?calcTotal(summaryConfig,leftData,config):'';
            Object.assign(chartOption.title, {text:totalTitle});
        }
    }

    //其他配置设置
    chartOption = otherConfig(chartOption)
    return chartOption
}
/**
 * 处理X轴和Y轴文字显示
 * @param {String} compName
 * @param {Object} chartOption
 * @param {Object} config
 * @param {Object} chartData
 */
export function disposeGridLayout(compName, chartOption, config, chartData) {
    // 柱形图（JBar[基础柱形图]、JStackBar[堆叠柱形图]、JMultipleBar[多数据对比柱形图]、JNegativeBar[正负条形图]）
    // 折线图 (JLine[基础折线图]、JMultipleLine[多数据对比折线图]、DoubleLineBar[双轴图])
    // 散点图（JScatter[基础散点图]、JBubble[气泡图]）
    chartOption.grid = {containLabel: true,top: 30,bottom: 60,left: 5,right: 5};
    const {xAxis, yAxis, series} = chartOption
    if(xAxis){
        const {name, nameTextStyle = {}} = xAxis;
        if(name){
            chartOption.grid.top += 30;
        }
    };
    if(yAxis){
        const {name, nameTextStyle = {} } = yAxis;
        if(name){
            const {fontSize = 12} = nameTextStyle;
            //15是轴到文字的距离
            chartOption.grid.right += name.length * (fontSize + 1) + 15;
        };
    };
    if(chartOption.title?.show){
        // 【QQYUN-7911】标题和图表会重叠
        // 有标题
        const {textStyle = {} } = chartOption.title;
        const { fontSize = 18 } = textStyle;
        chartOption.grid.top += fontSize;
        if(chartOption.grid.top > 200){
            chartOption.grid.top = 30;
        }
    }
    // series大于1说明有分组即有图例
    if(series.length <=1){
        chartOption.grid.bottom = 10;
        // 【QQYUN-7911】安卓底部间距小
        // #ifdef APP
        chartOption.grid.bottom = 30;
        // #endif
    }
    console.log('---chartOption--',chartOption);
    return chartOption;
}
/**
 * 配置设置
 * @param {Object} chartOption
 */
function otherConfig(chartOption){
    //设置内边距
    chartOption.grid = {
        left:30,
        right:30,
        top:30,
        bottom:60
    }
    //设置图例位置
    // chartOption.legend = {
    //     bottom:15
    // }
    //设置提示层级
    chartOption.tooltip && (chartOption.tooltip.extraCssText ='z-index:9');
    return chartOption
}
/**
 * 获取随机颜色
 * @param index
 */
export function getRandomColor(index) {
    let naturalColors = ['rgb(133, 202, 205)','rgb(167, 214, 118)','rgb(254, 225, 89)','rgb(251, 199, 142)','rgb(239, 145, 139)','rgb(169, 181, 255)','rgb(231, 218, 202)','rgb(252, 128, 58)','rgb(254, 161, 172)','rgb(194, 163, 205)']
    let colors = ['rgb(100, 181, 246)','rgb(77, 182, 172)','rgb(255, 183, 77)','rgb(229, 115, 115)','rgb(149, 117, 205)','rgb(161, 136, 127)','rgb(144, 164, 174)','rgb(77, 208, 225)','rgb(129, 199, 132)','rgb(255, 138, 101)',...naturalColors]
    return index && index<19?colors[index]: colors[Math.floor((Math.random()*(colors.length-1)))];
}

/**
 * 处理参数
 */
export function handleParam(config) {
    let paramList = config.paramOption;
    let url = cloneDeep(config.dataSetApi);
    //获得原数据Map
    let dataMap = {};
    if (paramList && paramList.length > 0) {
        paramList.forEach((item) => {
            dataMap[item.label] = item.defaultVal || '';
        });
    }
    let reg = /\$\{[^}]*\}/g;
    //包含参数则去处理参数配置
    if (reg.test(config.dataSetApi)) {
        url = url.split('?')[0];
    }
    return { dataMap, url };
}

/**
 * 获取地图数据地理坐标信息
 */
export function getGeoCoordMap(mapDataJson) {
    if(mapDataJson.features){
        /*获取地图数据*/
        let mapFeatures = mapDataJson.features;
        //地理坐标信息
        let geoCoordMap = {};
        mapFeatures.forEach((v) => {
            // 地区名称
            let name = v.properties.name;
            // 地区经纬度
            geoCoordMap[name] = {
                center: v.properties.cp,
                adcode: v.properties.adcode,
            };
        });
        return geoCoordMap;
    }
    return null;
}
/**
 * 设置地图配色
 * @param options
 */
export function setGeoAreaColor(options,config) {
    //当视觉映射关闭时删除属性
    if (options.visualMap && options.visualMap.show == false) {
        delete options.visualMap;
    }
    if (options.visualMap && options.visualMap.show == true) {
        options.visualMap.inRange = {
            color: config.commonOption.inRange.color,
        };
    }
    //不使用渐变色
    if (config.commonOption && config.commonOption.gradientColor == false) {
        options.geo.itemStyle.normal.areaColor = config.commonOption.areaColor.color1;
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
        };
    }
    return options;
}
/**
 * 处理总计和显示单位
 * @param {Object} compName
 * @param {Object} chartOption
 * @param {Object} config
 * @param {Object} chartData
 */
export function	handleTotalAndUnitMap(compName,chartOption,config,chartData){
    //1.获取到label配置项
    if (config.compStyleConfig) {
        //显示单位配置
        let showUnitConfig = config.compStyleConfig.showUnit;
        let unit = showUnitConfig.unit?showUnitConfig.unit:'';//单位
        let numberLevel = showUnitConfig.numberLevel?showUnitConfig.numberLevel:'';//数值数量级
        chartOption.series.forEach((item) => {
            if(item.name == "数据"){
                let labelConfig = {
                    label: {
                        normal:{
                            show:unit?true:false,
                            formatter: (params) => {
                                let showLabel = `${params.name}: `;
                                let value = 0;
                                if(params.seriesType=="effectScatter"){
                                    if(Array.isArray(params.value)){
                                        value = params.value[2];
                                    }else{
                                        value = params.value;
                                    }
                                }
                                //计算显示数值和添加前后缀
                                if(unit){
                                    showLabel += showUnitConfig.position == 'suffix' ? `${calcUnit(value, showUnitConfig)}${unit}` : `${unit}${calcUnit(value, showUnitConfig)}`;
                                }
                                return showLabel;
                            }
                        }
                    }
                };
                deepMerge(item, {...labelConfig});
            }
        });
        //显示总计配置
        let summaryConfig = config.compStyleConfig.summary;
        if(summaryConfig.showTotal && chartData && chartData.length>0){
            //左y轴
            let leftData = chartData.filter(item=>(!item.yAxisIndex || item.yAxisIndex == '0'));
            let totalTitle = summaryConfig.showY?calcTotal(summaryConfig,leftData,config):'';
            Object.assign(chartOption.title, {text:totalTitle});
        }
    }
    //设置内边距
    chartOption.geo.top = 20;
    return chartOption
}
/**
 * 设置常规配置
 * @param {Object} chartOption
 */
export function handleCommonOpt(chartOption){
    if(chartOption.visualMap){
        chartOption.visualMap.show = false
    }
    return chartOption
}
/**
 * 数组等拆分子数组
 * @param array
 * @param subGroupLength
 */
export function arrDivide(array = [], subGroupLength = 0){
    let index = 0;
    const newArray = [];
    while (index < array.length) {
        newArray.push(array.slice(index, index += subGroupLength));
    }
    return newArray;
}
/**
 * 重新拼接URL，将参数自动拼接在现有URL后面
 * @param url string
 * @param query
 */
export function urlAssign(url, paramList) {
    if (!url) return '';
    if (paramList && paramList.length > 0) {
        let queryArr = []
        paramList.forEach(param=>{
            queryArr.push(`${param['label']}=${param['value']}`)
        })
        if (url.indexOf('?') !== -1) {
            url =`${url}&${queryArr.join('&')}`
        } else {
            url =`${url}?${queryArr.join('&')}`
        }
    }
    return url.trim()
}
/**
 * 数据处理成模板结构
 * @param data
 */
export function dataToTemplate(rawData,config) {
    let nameFields = config.nameFields;
    let typeFields = config.typeFields;
    let valueFields = config.valueFields;
    let pivotTable = config.pivotTable;
    let tempObj = {
        x: [],
        data: [],
    };
    //处理x数据
    nameFields.forEach((obj) => {
        let nameArr = rawData.map((item) => item[obj.fieldName]);
        if(obj.fieldType == 'date'){
            nameArr = rawData.map((item) => {
                //数据兼容处理
                return item[obj.fieldName]?item[obj.fieldName]:item[obj.fieldName.substring(0,obj.fieldName.length - 1)]
            });
        }
        let nameObj = {};
        nameObj[obj.fieldName] = nameArr;
        tempObj.x.push(nameObj);
    });
    //处理y数据
    let dataArr = [];
    //包含列数据的情况
    if (typeFields.length > 0) {
        let typeArr = [];
        rawData.forEach((item) => {
            let arr = [];
            typeFields.forEach((obj) => {
                arr.push(item[obj.fieldName]);
            });
            let hasType = typeArr.filter((item) => item.toString() == arr.toString());
            hasType.length == 0 && typeArr.push(arr);
        });
        typeArr.forEach((type) => {
            valueFields.forEach((value) => {
                let obj = { key: value.fieldName };
                obj['y'] = type;
                obj['data'] = rawData.map((item) => {
                    let arr = [];
                    typeFields.forEach((obj) => {
                        arr.push(item[obj.fieldName]);
                    });
                    let existVal = type.toString() === arr.toString();
                    return existVal ? item[value.fieldName] : null;
                });
                let summaryConfig = pivotTable.lineSummary.controlList.filter((control) => control.key == value.fieldName);
                let totalType = summaryConfig && summaryConfig.length > 0 ? summaryConfig[0].totalType : 'sum';
                let sum = calcSummary(obj['data'], totalType);
                obj['sum'] = sum?sum:tableEllipsis;
                obj['summary_col'] = false;
                dataArr.push(obj);
            });
        });
        //处理列汇总信息
        let showColumnTotal = pivotTable?.showColumnTotal;
        if (showColumnTotal) {
            let length = rawData.length;
            valueFields.forEach((value) => {
                let obj = { key: value.fieldName };
                obj['y'] = [];
                let dataMap = dataArr.filter((item) => item.key == value.fieldName).map((a) => a.data);
                let summaryConfig = pivotTable.columnSummary.controlList.filter((control) => control.key == value.fieldName);
                let totalType = summaryConfig && summaryConfig.length > 0 ? summaryConfig[0].totalType : 'sum';
                let show = summaryConfig && summaryConfig.length > 0 ? summaryConfig[0].show : false;
                let data = [];
                for (let i = 0; i < length; i++) {
                    let map = dataMap.map((item) => item[i]);
                    let val = show ? calcSummary(map, totalType) : tableEllipsis;
                    let number = val;
                    data.push(number);
                }
                obj['data'] = data;
                //处理数值翻译的情况
                let originalData = getOriginalVal(value,data);
                let sum = calcSummary(originalData, totalType);
                obj['sum'] = sum?sum:tableEllipsis;
                obj['summary_col'] = true;
                dataArr.push(obj);
            });
        }
        tempObj.data = dataArr;
    } else {
        //没有type的情况下的处理
        valueFields.forEach((value) => {
            let obj = { key: value.fieldName };
            obj['y'] = [];
            obj['data'] = rawData.map((item) => {
                return item[value.fieldName];
            });
            let summaryConfig = pivotTable.lineSummary.controlList.filter((control) => control.key == value.fieldName);
            let type = summaryConfig && summaryConfig.length > 0 ? summaryConfig[0].totalType : 'sum';
            //处理数值翻译的情况
            let originalData = getOriginalVal(value,obj['data']);
            obj['sum'] = calcSummary(originalData, type)? calcSummary(originalData, type):tableEllipsis;
            obj['summary_col'] = false;
            dataArr.push(obj);
        });
        tempObj.data = dataArr;
    }
    return { ...tempObj };
}

/**
 * 获取原始数值数据
 * @param value
 * @param data
 */
function getOriginalVal(value,data){
    if(value.options && value.options.unitText){
        let originalData = data.map(d=>{
            return d?Number(d.replace(value.options.unitText,'')):0;
        })
        return originalData;
    }
    return data
}

/**
 * 计算合计
 * @param valueArr
 * @param type
 */
function calcSummary(valueArr, type) {
    valueArr = valueArr.filter((value) => value && value != null);
    let total = 0;
    if (valueArr.length > 0) {
        if (type == 'sum') {
            total = valueArr.reduce((prev, cur) => prev + cur, 0);
        } else if (type == 'max') {
            total = Math.max.apply(Math, valueArr);
        } else if (type == 'min') {
            total = Math.min.apply(Math, valueArr);
        } else if (type == 'average') {
            // @ts-ignore
            total = (valueArr.reduce((prev, cur) => prev + cur, 0) / valueArr.length).toFixed(2);
        }
    }
    return isNumber(total)?Number(keepTwoDecimals(total)):null;
}
/**
 * 数据处理
 * @param chartData
 */
function handleData(props,rawData,chartData) {
    let nameFields = props.config.nameFields;
    let typeFields = props.config.typeFields;
    let showLineTotal = props.config.pivotTable.showLineTotal;
    let lineSummary = props.config.pivotTable.lineSummary;
    let columnSummary = props.config.pivotTable.columnSummary;
    //表格数据
    let dataSource = [];
    //行总计数据
    let lineTotalObj = {};
    nameFields.forEach((name, index) => {
        chartData.x[index][name.fieldName].forEach((item, xindex) => {
            if (dataSource[xindex]) {
                dataSource[xindex][name.fieldName] = item;
            } else {
                let obj = {};
                obj[name.fieldName] = item;
                dataSource.push(obj);
            }
        });
        //配置行总计
        if (showLineTotal && index==0) {
            lineTotalObj[name.fieldName] = lineSummary.name ? lineSummary.name : '行汇总';
        }
    });
    chartData.data.forEach((item, xindex) => {
        let key = typeFields && typeFields.length > 0 ? item.key + xindex : item.key;
        item.data.forEach((val, index) => {
            dataSource[index][key] = val;
        });
        if (showLineTotal) {
            if (!item.summary_col) {
                let control = lineSummary.controlList.filter((control) => control.key == item.key);
                let show = control[0].show;
                let showName = control[0].showName;
                lineTotalObj[key] = show ? `${showName}${item.sum}` : tableEllipsis;
            } else {
                //合计列的数据处理
                let control = columnSummary.controlList.filter((control) => control.key == item.key);
                let show = control[0].show;
                lineTotalObj[key] = show ? item.sum : tableEllipsis;
            }
        }
    });
    //显示行汇总
    if (showLineTotal && rawData.value.length>0) {
        lineTotalObj['colSpan'] = nameFields.length;
        if (lineSummary?.location == '1') {
            dataSource.unshift(lineTotalObj);
        } else {
            dataSource.push(lineTotalObj);
        }
    }
    //处理单位显示
    return dataSource;
}
/**
 * 添加图片前缀
 * @param imgUrl
 */
export function addImgPrefix (imgUrl){
    if(imgUrl){
        if (imgUrl.startsWith('http://') || imgUrl.startsWith('https://')) {
            return imgUrl;
        }
        if (imgUrl.startsWith('data:image/png;base64')) {
            return imgUrl;
        } else {
            imgUrl = imgUrl.indexOf('/img/bg/source/')>=0?imgUrl.replaceAll('/img/bg/source/',"/img/"):imgUrl;
            imgUrl = imgUrl.indexOf('/img/bg/border/')>=0?imgUrl.replaceAll('/img/bg/border/',"/img/"):imgUrl;
            let url = imgUrl && imgUrl.indexOf('/img/bg/')>=0?imgUrl.replaceAll('/img/bg/',"/img/"):imgUrl;
            return `${getEnvBaseUrl()}/drag/lib${url}`;
        }
    }
};
/**
 * 校验协议
 * @param url
 */
export function checkUrlPrefix(url) {
    let currentProtocol = 'https'
    let urlProtocol;
    //#ifdef H5
    // 获取当前页面的协议
    currentProtocol = window.location.protocol;
    // 获取传入 url 的协议
    const urlObj = new URL(url);
    urlProtocol = urlObj.protocol;
    //#endif

    //#ifndef H5
    urlProtocol = getProtocolWithRegex(url)
    //#endif
    // 判断协议是否一致
    const isDiffProtocol = currentProtocol.startsWith('https') &&  currentProtocol != urlProtocol;
    // 返回当前页面的协议
    return {
        isDiffProtocol: isDiffProtocol,
        currentProtocol: currentProtocol
    };
}

/**
 * 获取协议
 * @param urlString
 */
function getProtocolWithRegex(urlString) {
    const protocolMatch = urlString.match(/^([a-zA-Z]+):\/\//);
    return protocolMatch ? protocolMatch[1] : null;
}
/**
 * 字典转换
 */
export function dictTransform(chartData,dictOptions) {
    if (dictOptions && Object.keys(dictOptions).length > 0) {
        Object.keys(dictOptions).forEach((code) => {
            if( dictOptions[code] && isArray(dictOptions[code])){
                chartData.forEach((item) => {
                    let obj = dictOptions[code].filter((dict) => dict.value === item[code] + '');
                    item[code] = obj && obj.length > 0 ? obj[0]['text'] : item[code];
                });
            }
        });
    }
    return chartData;
}
// 获取url中的参数
export const getUrlParams = (url) => {
    let result = {
        url: '',
        params: {}
    };
    let list = url.split('?');
    result.url = list[0];
    let params = list[1];
    if (params) {
        let list = params.split('&');
        list.forEach(ele => {
            let dic = ele.split('=');
            let label = dic[0];
            let value = dic[1];
            result.params[label] = decodeURIComponent(value);
        });
    }
    return result;
};
