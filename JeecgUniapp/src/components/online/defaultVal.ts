
// 移动端不支持自定义表达式设置的默认值
import {http} from "@/utils/http";
import {useUserStore} from "@/store";
import * as CustomExpression from './customExpression';
import dayjs from "dayjs";

// 获取所有用户自定义表达式的Key
const ceKeys = Object.keys(CustomExpression)
// 将key用逗号拼接，可以拼接成方法参数，例：a,b,c --> function(a,b,c){}
const ceJoin = ceKeys.join(',')
// 将用户自定义的表达式按key的顺序放到数组中，可以使用 apply 传递给方法直接调用
const $CE$ = ceKeys.map(key => CustomExpression[key])

/** 普通规则表达式 #{...} */
const normalRegExp = /#{([^}]+)?}/g
/** 用户自定义规则表达式 {{...}} */
const customRegExp = /{{([^}]+)?}}/g
/** 填值规则表达式 ${...} */
const fillRuleRegExp = /\${([^}]+)?}/g

/** action 类型 */
export const ACTION_TYPES = { ADD: 'add', EDIT: 'edit', DETAIL: 'detail', RELOAD: 'reload' }

/**
 * 获取单个字段的默认值-通过回调函数返回值
 * @param {Object} defVal
 * @param {Object} type
 * @param {Object} callback
 */
export async function loadOneFieldDefVal(defVal, type, callback) {
  if(hasEffectiveValue(defVal)){
    let value = await handleDefaultValue(defVal, ACTION_TYPES.ADD, {});
    if ('number' === type && value) {
      value = Number.parseFloat(value)
    }
	callback(value)
  }
}

/**
 * 判断给定的值是不是有效的
 */
function hasEffectiveValue(val) {
  if(val || val === 0){
    return true;
  }
  return false;
}

/**
 * 获取默认值
 * @param {Object} defVal
 * @param {Object} action
 * @param {Object} getFormData
 */
async function handleDefaultValue(defVal, action, getFormData) {
  if (defVal != null) {
    // 检查类型，如果类型错误则不继续运行
    if (checkExpressionType(defVal)) {
      let value = await getDefaultValue(defVal, action, getFormData)
      if (value != null) {
        return value
      }
    }
  }
  return defVal;
}

/**
 * 加载form组件默认值
 * @param form Form对象
 * @param properties 字段配置
 * @param action 操作类型（ACTION_TYPES），除填值规则外，其他表达式只在add下才执行
 * @param getFormData 获取数据的方法，用于填值规则向后台传值
 */
export function loadFieldDefVal({ form, properties, action, getFormData }) {
  if (Array.isArray(properties) && properties.length > 0) {
    properties.forEach(async prop => {
      let { defVal, type } = prop._formSchem
      // key取值错误导致 树形表 表单默认值未生效  【online】树列表不支持控件默认值表达式配置 （博威）
      let key = prop.key
      // 2021年5月21日 Tree类型表单，系统编码不生效。【issues/I3NR39】
      if (!key) {
        key = prop._propertyId
      }
      eachHandler(key, defVal, action, (value) => {
        // 处理数字类型，如果type=number并且value有值
        if ('number' === type && value) {
          // parseFloat() 可以直接处理字符串、整数、小数、null和undefined，
          // 非数字类型直接返回NaN，不必担心报错
          value = Number.parseFloat(value)
        }
        form.setFieldsValue({ [key]: value })
      }, getFormData)
    })
  }
}

/** 加载JEditableTable组件默认值 */
export function loadFieldDefValForSubTable({ subForms, subTable, row, action, getFormData }) {
  if (subTable && Array.isArray(subTable.columns) && subTable.columns.length > 0) {
    subTable.columns.forEach(async column => {
      let { key, fieldDefaultValue: defVal } = column
      eachHandler(key, defVal, action, (value) => {
        if (subForms.form) {
          subForms.form.setFieldsValue({ [key]: value })
        } else {
          // update-begin---author:sunjianlei  Date:20200725 for：online功能测试，行操作切换成新的行编辑-----------
          let v = [{rowKey: row.id, values: {[key]: value}}];
          (subForms.jvt || subForms.jet).setValues(v)
          // update-end---author:sunjianlei    Date:20200725 for：online功能测试，行操作切换成新的行编辑------------
        }
      }, getFormData)
    })
  }
}

async function eachHandler(key, defVal, action, callback, getFormData) {
  if (defVal != null) {
    // 检查类型，如果类型错误则不继续运行
    if (checkExpressionType(defVal)) {
      let value = await getDefaultValue(defVal, action, getFormData)
      if (value != null) {
        callback(value)
      }
    } else {
      // 不合法的表达式直接返回不解析
      callback(defVal)
    }
  }
}

/**
 * 检查表达式类型是否合法，规则：
 * 1、填值规则表达式不能和其他表达式混用
 * 2、每次只能填写一个填值规则表达式
 * 3、普通表达式和用户自定义表达式可以混用
 */
export function checkExpressionType(defVal) {
  // 获取各个表达式的数量
  let normalCount = 0, customCount = 0, fillRuleCount = 0
  defVal.replace(fillRuleRegExp, () => fillRuleCount++)
  if (fillRuleCount > 1) {
    logWarn(`表达式[${defVal}]不合法：只能同时填写一个填值规则表达式！`)
    return false
  }
  defVal.replace(normalRegExp, () => normalCount++)
  defVal.replace(customRegExp, () => customCount++)
  // 除填值规则外其他规则的数量
  let fillRuleOtherCount = normalCount + customCount
  if (fillRuleCount > 0 && fillRuleOtherCount > 0) {
    logWarn(`表达式[${defVal}]不合法：填值规则表达式不能和其他表达式混用！`)
    return false
  }
  return true
}

/** 获取所有匹配的表达式 */
function getRegExpMap(text, exp) {
  let map = new Map()
  if(text && text.length>0){
	text.replace(exp, function (match, param, offset, string) {
	   map.set(match, param.trim())
	   return match
	})
  }
  return map
}

/** 获取默认值，可以执行表达式，可以执行用户自定义方法，可以异步获取用户信息等 */
async function getDefaultValue(defVal, action, getFormData) {
  // 只有在 add 和 reload 模式下才执行填值规则
  if (action === ACTION_TYPES.ADD || action === ACTION_TYPES.RELOAD) {
    // 判断是否是填值规则表达式，如果是就执行填值规则
    if (fillRuleRegExp.test(defVal)) {
      return await executeRegExp(defVal, fillRuleRegExp, executeFillRuleExpression, [getFormData])
    }
  }
  // 只有在 add 模式下才执行其他表达式
  if (action === ACTION_TYPES.ADD) {
    // 获取并替换所有常规表达式
    defVal = await executeRegExp(defVal, normalRegExp, executeNormalExpression)
    // 获取并替换所有用户自定义表达式
    defVal = await executeRegExp(defVal, customRegExp, executeCustomExpression)
    return defVal
  }
  return null
}

async function executeRegExp(defVal, regExp, execFun, otherParams = []) {
  let map = getRegExpMap(defVal, regExp)
  // @ts-ignore
  for (let origin of map.keys()) {
    let exp = map.get(origin)
    let result = await execFun.apply(null, [exp, origin, ...otherParams])
    // 如果只有一个表达式，那么就不替换（因为一旦替换，类型就会被转成String），直接返回执行结果，保证返回的类型不变
    if (origin === defVal) {
      return result
    }
    defVal = replaceAll(defVal, origin, result)
  }
  return defVal
}

/** 执行【普通表达式】#{xxx} */
async function executeNormalExpression(expression, origin) {
  switch (expression) {
    case 'date':
      return dayjs().format('YYYY-MM-DD');
    case 'time':
      return dayjs().format('HH:mm:ss');
    case 'datetime':
      return dayjs().format('YYYY-MM-DD HH:mm:ss');
    default:
      // 获取当前登录用户的信息
      let result = getUserInfoByExpression(expression)
      if (result != null) {
        return result
      }
      // 没有符合条件的表达式，返回原始值
      return origin
  }
}

/** 根据表达式获取相应的用户信息 */
function getUserInfoByExpression(expression) {
  let userInfo:any = useUserStore().userInfo;
  if (userInfo) {
    switch (expression) {
      case 'sysUserId':
    return userInfo.id
    // 当前登录用户登录账号
  case 'sysUserCode':
    return userInfo.username
    // 当前登录用户真实名称
  case 'sysUserName':
    return userInfo.realname
    // 当前登录用户部门编号
  case 'sysOrgCode':
    return userInfo.orgCode
  }
  }
  return null
}
/**
 * 2023-09-04
 * liaozhiyang
 * 用new Function替换eval
 */
function _eval(str: string) {
  return new Function(`return ${str}`)();
}
/** 执行【用户自定义表达式】 {{xxx}} 移动端不支持 */
async function executeCustomExpression(expression, origin) {
  // 利用 eval 生成一个方法，这个方法的参数就是用户自定义的所有的表达式
  let fn = _eval(`(function (${ceJoin}){ return ${expression} })`);
  try {
    // 然后调用这个方法，并把表达式传递进去，从而完成表达式的执行
    return fn.apply(null, $CE$)
  } catch (e) {
    // 执行失败，输出错误并返回原始值
    logWarn(e)
    return origin
  }
}

/** 执行【填值规则表达式】 ${xxx} */
async function executeFillRuleExpression(expression, origin, getFormData) {
  let url = `/sys/fillRule/executeRuleByCode/${expression}`
  let formData = {}
  if (typeof getFormData === 'function') {
    formData = getFormData()
  }
  let res:any = await http.put(url, formData)
  let { success, message, result } = res;
  console.log(success, message, result)
  if (success) {
    return result
  } else {
    logError(`填值规则（${expression}）执行失败：${message}`)
    return origin
  }
}

function logWarn(message) {
  console.warn('[loadFieldDefVal]:', message)
}

function logError(message) {
  console.error('[loadFieldDefVal]:', message)
}

function replaceAll(text, checker, replacer) {
  let lastText = text
  text = text.replace(checker, replacer)
  if (lastText !== text) {
    return replaceAll(text, checker, replacer)
  }
  return text
}

