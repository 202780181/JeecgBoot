import pagesJson from '../pages.json'
// 引入uni-parse-pages
import pagesJsonToRoutes from 'uni-parse-pages'
import { colorPanel } from './constants'
import tip from './tip'
import { platform, isH5, isApp, isMp, isMpWeixin, isMpAplipay, isMpToutiao } from '@/utils/platform'
import { isString } from './is'

/**
 * 缓存,默认有效期2小时
 * @param key 缓存key
 * @param value  缓存值
 * @param seconds 缓存时间（秒）
 * @returns {*}
 */
export function cache(key, value = null, seconds = 2 * 3600) {
  const timestamp = +new Date() / 1000
  if (key && value === null) {
    // 获取缓存
    const val = uni.getStorageSync(key)
    if (val && val.length > 0) {
      const tmp = val.split('|')
      if (!tmp[2] || timestamp >= tmp[2]) {
        console.log('key已失效')
        // 删除缓存
        uni.removeStorageSync(key)
        return ''
      } else {
        console.log('key未失效')
        if (tmp[1] == 'json') {
          return JSON.parse(tmp[0])
        }
        return tmp[0]
      }
    }
  } else if (key && value) {
    // 设置缓存
    const expire = timestamp + seconds
    console.log('typeof value', typeof value)
    if (typeof value === 'object') {
      value = JSON.stringify(value) + '|json|' + expire
    } else {
      value = value + '|string|' + expire
    }
    uni.setStorageSync(key, value)
  } else {
    console.log('key不能空')
  }
}

// 获取静态文件地址
export const getStaticDomainURL = () => {
  return import.meta.env.VITE_SERVER_BASEURL + '/sys/common/static'
}

export const getFileAccessHttpUrl = function (avatar, subStr?) {
  if (!avatar) return ''
  if (!subStr) subStr = 'http'
  if (avatar) {
    avatar = avatar.replace(/user_imgs\\/, 'user_imgs/')
  }
  if (avatar && avatar.startsWith(subStr)) {
    return avatar
  } else {
    return getStaticDomainURL() + '/' + avatar
  }
}
interface hasRouteType {
  name?: string
  path?: string
  routeList?: any
}
// 判断路由是否存在
export const hasRoute = ({ name, path, routeList }: hasRouteType) => {
  routeList = routeList ?? pagesJsonToRoutes(pagesJson)
  if (path) {
    return !!routeList.find((item) => item.path === path)
  }
  if (name) {
    return !!routeList.find((item) => item.path.split('/').pop() === name)
  }
}

/**
 * 人性化显示时间
 *
 * @param {Object} datetime
 */
export function beautifyTime(datetime = '') {
  if (datetime == null) {
    return ''
  }
  datetime = datetime.toString().replace(/-/g, '/')
  const time = new Date()
  let outTime = new Date(datetime)
  if (/^[1-9]\d*$/.test(datetime)) {
    outTime = new Date(parseInt(datetime))
  }

  if (time.getTime() < outTime.getTime()) {
    return parseTime(outTime, '{y}/{m}/{d}')
  }

  if (time.getFullYear() != outTime.getFullYear()) {
    return parseTime(outTime, '{y}/{m}/{d}')
  }

  if (time.getMonth() != outTime.getMonth()) {
    return parseTime(outTime, '{m}/{d}')
  }

  if (time.getDate() != outTime.getDate()) {
    const day = outTime.getDate() - time.getDate()
    if (day == -1) {
      return parseTime(outTime, '昨天 {h}:{i}')
    }

    if (day == -2) {
      return parseTime(outTime, '前天 {h}:{i}')
    }

    return parseTime(outTime, '{m}-{d}')
  }

  if (time.getHours() != outTime.getHours()) {
    return parseTime(outTime, '{h}:{i}')
  }

  let minutes = outTime.getMinutes() - time.getMinutes()
  if (minutes == 0) {
    return '刚刚'
  }

  minutes = Math.abs(minutes)
  return `${minutes}分钟前`
}
/**
 * 格式化时间
 * @param {Object} time
 * @param {Object} cFormat
 */
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
    } else {
      time = new Date(time)
    }
    date = new Date(time.toString().replace(/-/g, '/'))
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
 * 随机生成字符串
 * @param length 字符串的长度
 * @param chats 可选字符串区间（只会生成传入的字符串中的字符）
 * @return string 生成的字符串
 */
export function randomString(length, chats?) {
  if (!length) length = 1
  if (!chats) chats = '0123456789qwertyuioplkjhgfdsazxcvbnm'
  let str = ''
  for (let i = 0; i < length; i++) {
    // @ts-ignore
    const num = randomNumber(0, chats.length - 1)
    str += chats[num]
  }
  return str
}

/**
 * 随机生成数字
 *
 * 示例：生成长度为 12 的随机数：randomNumber(12)
 * 示例：生成 3~23 之间的随机数：randomNumber(3, 23)
 *
 * @param1 最小值 | 长度
 * @param2 最大值
 * @return int 生成后的数字
 */
export function randomNumber() {
  // 生成 最小值 到 最大值 区间的随机数
  const random = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1) + min)
  }
  if (arguments.length === 1) {
    // @ts-ignore
    const [length] = arguments
    // 生成指定长度的随机数字，首位一定不是 0
    // @ts-ignore
    const nums = [...Array(length).keys()].map((i) => (i > 0 ? random(0, 9) : random(1, 9)))
    return parseInt(nums.join(''))
  } else if (arguments.length >= 2) {
    // @ts-ignore
    const [min, max] = arguments
    return random(min, max)
  } else {
    return Number.NaN
  }
}

/**
 * 时间格式化
 * @param value
 * @param fmt
 * @returns {*}
 */
export function formatDate(value, fmt) {
  const regPos = /^\d+(\.\d+)?$/
  if (regPos.test(value)) {
    // 如果是数字
    const getDate = new Date(value)
    const o = {
      'M+': getDate.getMonth() + 1,
      'd+': getDate.getDate(),
      'h+': getDate.getHours(),
      'H+': getDate.getHours(),
      'm+': getDate.getMinutes(),
      's+': getDate.getSeconds(),
      'q+': Math.floor((getDate.getMonth() + 3) / 3),
      S: getDate.getMilliseconds(),
    }
    if (/(y+)/.test(fmt)) {
      fmt = fmt.replace(RegExp.$1, (getDate.getFullYear() + '').substr(4 - RegExp.$1.length))
    }
    for (const k in o) {
      if (new RegExp('(' + k + ')').test(fmt)) {
        fmt = fmt.replace(
          RegExp.$1,
          RegExp.$1.length === 1 ? o[k] : ('00' + o[k]).substr(('' + o[k]).length),
        )
      }
    }
    return fmt
  } else {
    // TODO
    if (value && value.length > 0) {
      value = value.trim()
      return value.substr(0, fmt.length)
    }
    return value
  }
}

// 通过时间或者时间戳获取对应antd的年、月、周、季度。
export function getWeekMonthQuarterYear(date) {
  // 获取 ISO 周数的函数
  const getISOWeek = (date) => {
    const jan4 = new Date(date.getFullYear(), 0, 4)
    const oneDay = 86400000 // 一天的毫秒数
    return Math.ceil(((date - jan4.getTime()) / oneDay + jan4.getDay() + 1) / 7)
  }
  // 将时间戳转换为日期对象
  const dateObj = new Date(date)
  // 计算周
  const week = getISOWeek(dateObj)
  // 计算月
  const month = dateObj.getMonth() + 1 // 月份是从0开始的，所以要加1
  // 计算季度
  const quarter = Math.floor(dateObj.getMonth() / 3) + 1
  // 计算年
  const year = dateObj.getFullYear()
  return {
    year: `${year}`,
    month: `${year}-${month.toString().padStart(2, '0')}`,
    week: `${year}-${week}周`,
    quarter: `${year}-Q${quarter}`,
  }
}

// 生成 1 到 10 之间的随机整数
export function getRandomIntBetweenOneAndTen() {
  return Math.floor(Math.random() * 10) + 1
}
/**
 * 获取随机颜色
 * @param {any} color
 * 颜色板
 * classic：经典
 * technology：科技
 * business：商务
 * botany：植物
 * natural：自然
 * colour：彩色
 * @return
 */
export function getRandomColor() {
  const colorType = ['classic', 'technology', 'business', 'botany', 'natural', 'colour']
  // 生成一个随机索引，范围是从 0 到数组长度减 1
  const randomIndex = Math.floor(Math.random() * colorType.length)
  // 根据随机索引从数组中获取一个随机类型
  const randomColorType = colorType[randomIndex]
  return colorPanel.natural[getRandomIntBetweenOneAndTen()] || '#00bcd4'
}

// 消除后缀：
export const getPlaceholder = (attrs: any = {}) => {
  let label = attrs.label
  if (label.endsWith('：') || label.endsWith(':')) {
    label = label.substr(0, label.length - 1)
  }
  return `请选择${label}`
}
/**
 * 日期格式化
 * @param text
 */
export function getFormatDate(text, column) {
  if (!text) {
    return ''
  }
  let a = text
  if (a.length > 10) {
    a = a.substring(0, 10)
  }
  let fieldExtendJson = column?.fieldExtendJson
  console.log('getFormat  Datetext', text)
  console.log('getFormatDate  fieldExtendJson', fieldExtendJson)
  if (fieldExtendJson) {
    fieldExtendJson = JSON.parse(fieldExtendJson)
    if (fieldExtendJson.picker && fieldExtendJson.picker != 'default') {
      const result = getWeekMonthQuarterYear(a)
      return result[fieldExtendJson.picker]
    }
  }
  return a
}

/**
 * 字典值替换文本通用方法(多选)
 * @param dictOptions  字典数组
 * @param text  字典值
 * @return String
 */
export function filterMultiDictText(dictOptions, text) {
  // js “!text” 认为0为空，所以做提前处理
  if (text === 0 || text === '0') {
    if (dictOptions) {
      for (const dictItem of dictOptions) {
        if (text == dictItem.value) {
          return dictItem.text
        }
      }
    }
  }

  if (!text || text == 'undefined' || text == 'null' || !dictOptions || dictOptions.length == 0) {
    return ''
  }
  let re = ''
  text = text.toString()
  const arr = text.split(',')
  dictOptions.forEach(function (option) {
    if (option) {
      for (let i = 0; i < arr.length; i++) {
        if (arr[i] === option.value) {
          re += option.text + ','
          break
        }
      }
    }
  })
  if (re == '') {
    return text
  }
  return re.substring(0, re.length - 1)
}

/** 获取url参数
 * @param {Object} url
 */
export function getQueryVariable(url) {
  if (!url) return
  let t
  let n
  let r
  const i = url.split('?')[1]
  const s = {}
  ;(t = i.split('&')), (r = null), (n = null)
  for (const o in t) {
    const u = t[o].indexOf('=')
    u !== -1 && ((r = t[o].substr(0, u)), (n = t[o].substr(u + 1)), (s[r] = n))
  }
  return s
}

/**
 * 是否oauth环境
 */
export function isOAuth2AppEnv() {
  let isOAuthEnv = false
  // #ifdef H5
  isOAuthEnv = /wxwork|dingtalk/i.test(navigator.userAgent)
  // #endif
  return isOAuthEnv
}

/**
 * 获取url中的参数
 * @param url
 */
export const getUrlParams = (url) => {
  const result = {
    url: '',
    params: {},
  }
  const list = url.split('?')
  result.url = list[0]
  const params = list[1]
  if (params) {
    const list = params.split('&')
    list.forEach((ele) => {
      const dic = ele.split('=')
      const label = dic[0]
      const value = dic[1]
      result.params[label] = value
    })
  }
  return result
}

/**
 * 判断文件地址是否支持存在
 * @param url
 * @returns {Promise<any>}
 */
export function downloadAbled(url) {
  return new Promise((resolve, reject) => {
    let xmlHttp
    if (window.XMLHttpRequest) {
      xmlHttp = new XMLHttpRequest() // 其他浏览器
    } else if ((window as any).ActiveXObject) {
      // try {
      //   xmlHttp = new window.ActiveXObject("Microsoft.XMLHTTP");//IE
      // }catch (e) {
      //   console.log('创建xmlHttp失败',e)
      // }
    }
    if (!xmlHttp) {
      reject('创建xmlHttp失败')
    }
    xmlHttp.open('GET', url, false)
    xmlHttp.send()
    if (xmlHttp.readyState == 4) {
      if (xmlHttp.status == 200) {
        resolve(true)
      } else if (xmlHttp.status == 404) {
        reject('文件不存在!')
      } else {
        reject('请求失败，status：' + xmlHttp.status)
      }
    } else {
      reject('请求失败，readyState:' + xmlHttp.readyState)
    }
  })
}

/**
 * app获取url地址的传参问题
 * @param url
 * @returns {Object}
 */
export function appGetUrlParams(url) {
  const theRequest = new Object()
  const index = url.indexOf('?')
  if (index != -1) {
    const str = url.substring(index + 1)
    const strs = str.split('&')
    for (let i = 0; i < strs.length; i++) {
      theRequest[strs[i].split('=')[0]] = unescape(strs[i].split('=')[1])
    }
  }
  return theRequest
}
/**
 *
 * @param lat1  纬度1
 * @param lng1  经度1
 * @param lat2  纬度2
 * @param lng2  经度2
 * 返回 米
 */
export function geoDistance(lng1, lat1, lng2, lat2) {
  let radLat1 = rad(lat1)
  let radLat2 = rad(lat2)
  let a = radLat1 - radLat2
  let b = rad(lng1) - rad(lng2)
  let s =
    2 *
    Math.asin(
      Math.sqrt(
        Math.pow(Math.sin(a / 2), 2) +
          Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(b / 2), 2),
      ),
    )
  s = s * 6378.137 // EARTH_RADIUS;
  s = Math.round(s * 10000) / 10
  return s
}
//经纬度转换成三角函数中度分表形式。
function rad(d) {
  return (d * Math.PI) / 180.0
}

export function downloadFile(obj) {
  let url = ''
  if (isMp) {
    if (obj.currentTarget) {
      url = encodeURI(obj.currentTarget.dataset.url)
      downloadNH5(url)
    } else if (isString(obj)) {
      // 为字符串类型时，可认为就是url
      url = getFileAccessHttpUrl(obj)
      downloadNH5(url)
    }
  } else if (isApp) {
    url = encodeURI(obj)
    downloadNH5(url)
  } else if (isH5) {
    url = getFileAccessHttpUrl(obj)
    window.open(url)
  }
}
/**
 * 非H5文件下载地址
 * @param 文件路径 url
 */
function downloadNH5(url) {
  const image_arr = ['png', 'jpg', 'jpeg']
  const fileType = url.split('.').pop()
  uni.downloadFile({
    url,
    success: (res) => {
      if (res.statusCode == 200) {
        let filePath = res.tempFilePath
        const system = uni.getSystemInfoSync().platform
        if (system == 'ios') {
          filePath = encodeURI(filePath)
        }
        if (isMp) {
          const suffix = getSuffix(url).toLowerCase()
          if (image_arr.indexOf(suffix) != -1) {
            // 预览图片
            uni.previewImage({
              urls: [filePath],
            })
          } else {
            uni.openDocument({
              filePath,
              fileType,
              success: (res) => {
                console.log('打开文档成功')
              },
              fail: (res) => {
                console.log('打开文档失败')
                tip.error('不支持打开此格式', true)
              },
            })
          }
        } else if (isApp) {
          const suffix = getSuffix(url).toLowerCase()
          if (image_arr.indexOf(suffix) != -1) {
            // 预览图片
            uni.previewImage({
              urls: [filePath],
            })
          } else {
            uni.saveFile({
              tempFilePath: filePath,
              success: (res) => {
                // 保存成功并打开文件
                tip.success('保存成功')
                uni.openDocument({
                  filePath: res.savedFilePath,
                  success: function (res) {
                    console.log('openDocument', res)
                  },
                  fail() {
                    uni.showToast({
                      title: '暂不支持打开此类型',
                      duration: 2000,
                    })
                  },
                })
              },
              fail: () => tip.alert('保存失败'),
            })
          }
        }
      } else {
        tip.alert('文件异常')
      }
    },
    fail: (err) => {
      tip.alert('下载失败')
    },
  })
}
// 获取后缀
export function getSuffix(text) {
  if (text) {
    const arr = text.split('.')
    const suffix = arr[arr.length - 1]
    return suffix
  }
  return text
}
/**
 * 获取后缀图标
 * @param {Object} doctype
 */
export function getFileIcon(doctype) {
  const file_doc_type_arr = ['doc', 'excel', 'file', 'folder', 'image', 'pdf', 'video']

  if (file_doc_type_arr.indexOf(doctype) >= 0) {
    return `/static/${doctype}.png`
  } else {
    return '/static/file.png'
  }
}
/**
 * 获取uuid
 */
export function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export const queryString = (params) => {
  return Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value as string)}`)
    .join('&')
}

/**
 * 将任意日期转换为对应季度的首日
 * @param {Date|string} date - 日期对象或日期字符串
 * @returns {string} 格式为'YYYY-MM-DD'的季度首日
 */
export function dateToQuarterStart(date) {
  if (!date){
    return ''
  }
  // 如果传入的是字符串，转换为Date对象
  if (typeof date === 'string') {
    date = new Date(date)
  }

  const year = date.getFullYear()
  const month = date.getMonth() // 0-11

  // 计算季度
  const quarter = Math.floor(month / 3)

  // 确定季度首月的月份 (0=1月, 3=4月, 6=7月, 9=10月)
  const quarterStartMonth = quarter * 3

  // 格式化为'YYYY-MM-DD'
  return `${year}-${String(quarterStartMonth + 1).padStart(2, '0')}-01`
}

//时间数组
export function timeData(startTime = '08:00', endTime = '18:30', timeInterval = 0.5) {
  const time = []
  const date = timeStamp(Date.now()).allDate
  const startDate = `${date} ${startTime}`
  const endDate = `${date} ${endTime}`
  const startTimeStamp = new Date(startDate).getTime()
  const endTimeStamp = new Date(endDate).getTime()
  const timeStr = 3600 * 1000 * timeInterval
  console.log(startTimeStamp)
  for (let i = startTimeStamp; i <= endTimeStamp; i = i + timeStr) {
    const timeObj:any = {}
    timeObj.time = timeStamp(i).hour
    timeObj.disable = 0
    time.push(timeObj)
  }
  return time
}
//字符串拼接
function strFormat(str) {
  return str < 10 ? `0${str}` : str
}
//时间戳转字符串
export function timeStamp(time) {
  const dates = new Date(time)
  const year = dates.getFullYear()
  const month = dates.getMonth() + 1
  const date = dates.getDate()
  const day = dates.getDay()
  const hour = dates.getHours()
  const min = dates.getMinutes()
  const days = ['日', '一', '二', '三', '四', '五', '六']
  return {
    allDate: `${year}/${strFormat(month)}/${strFormat(date)}`,
    date: `${strFormat(month)}-${strFormat(date)}`, //返回的日期 07-01
    day: `星期${days[day]}`, //返回的礼拜天数  星期一
    hour: strFormat(hour) + ':' + strFormat(min) //返回的时钟 08:00
  }
}
/**
 * 字符串转时间
 * @param {Object} dateString
 */
export function stringToDate(dateString) {
  var newDate = new Date();
  var yearNum = Number(dateString.substr(0,4));
  var monthNum = Number(dateString.substr(5,2))-1;
  var dayNum = Number(dateString.substr(8,2));
  var hourNum = Number(dateString.substr(11,2));
  var minuteNum = Number(dateString.substr(14,2));

  //var secondNum = Number(dateString.substr(12,2));
  newDate.setFullYear(yearNum);
  newDate.setMonth(monthNum);
  newDate.setDate(dayNum);
  newDate.setHours(hourNum);
  newDate.setMinutes(minuteNum);
  //newDate.setSeconds(secondNum);
  return newDate;
}

