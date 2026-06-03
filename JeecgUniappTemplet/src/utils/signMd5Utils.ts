import md5 from 'md5'
import { isString } from './is'
//签名密钥串(前后端要一致，正式发布请自行修改)
const signatureSecret = 'dd05f1c54d63749eda95f9fa6d49v442a'

export default class signMd5Utils {
  /**
   * json参数升序
   * @param jsonObj 发送参数
   */

  static sortAsc(jsonObj) {
    let arr = new Array()
    let num = 0
    for (let i in jsonObj) {
      arr[num] = i
      num++
    }
    let sortArr = arr.sort()
    let sortObj = {}
    for (let i in sortArr) {
      sortObj[sortArr[i]] = jsonObj[sortArr[i]]
    }
    return sortObj
  }

  /**
   * @param url 请求的url,应该包含请求参数(url的?后面的参数)
   * @param requestParams 请求参数(POST的JSON参数)
   * @returns {string} 获取签名
   */
  static getSign(url, requestParams,requestBodyParams?) {
    let urlParams = this.parseQueryString(url);
    let jsonObj = this.mergeObject(urlParams, requestParams);
    //update-begin---author:wangshuai---date:2024-04-16---for:【QQYUN-9005】发送短信加签---
    if(requestBodyParams){
      jsonObj = this.mergeObject(jsonObj, requestBodyParams)
    }
    //update-end---author:wangshuai---date:2024-04-16---for:【QQYUN-9005】发送短信加签---
    let requestBody:any = this.sortAsc(jsonObj);
    delete requestBody._t;
    console.log('sign requestBody:', requestBody);
    return md5(JSON.stringify(requestBody) + signatureSecret).toUpperCase();
  }
  /**
   * @param requestData 请求数据(POST的JSON参数)
   * @returns {string} 获取签名
   */
  static getVSign(data, sign) {
    try {
      let jsonObj = data ? (isString(data) ? JSON.parse(JSON.stringify(data)) : { ...data }) : {}
      jsonObj['sign'] = sign
      let signParamObj = {}
      Object.keys(jsonObj).forEach((key) => {
        let val = jsonObj[key]
        if (val && isString(val)) {
          signParamObj[key] = val
        }
      })
      let requestBody = this.sortAsc(signParamObj)
      return md5(JSON.stringify(requestBody) + signatureSecret).toUpperCase();
    } catch (e) {
      return ''
    }
  }

  /**
   * @param url 请求的url
   * @returns {{}} 将url中请求参数组装成json对象(url的?后面的参数)
   */
  static parseQueryString(url) {
    let urlReg = /^[^\?]+\?([\w\W]+)$/,
      paramReg = /([^&=]+)=([\w\W]*?)(&|$|#)/g,
      urlArray = urlReg.exec(url),
      result = {}

    // 获取URL上最后带逗号的参数变量 sys/dict/getDictItems/sys_user,realname,username
    //【这边条件没有encode】带条件参数例子：/sys/dict/getDictItems/sys_user,realname,id,username!='admin'%20order%20by%20create_time
    let lastpathVariable = url.substring(url.lastIndexOf('/') + 1)
    if (lastpathVariable.includes(',')) {
      if (lastpathVariable.includes('?')) {
        lastpathVariable = lastpathVariable.substring(0, lastpathVariable.indexOf('?'))
      }
      if (typeof lastpathVariable === 'string' && lastpathVariable.length > 0) {
        result['x-path-variable'] = decodeURIComponent(lastpathVariable);
      } else {
        result['x-path-variable'] = '';
      }
    }
    if (urlArray && urlArray[1]) {
      let paramString = urlArray[1],
        paramResult
      while ((paramResult = paramReg.exec(paramString)) != null) {
        //数字值转为string类型，前后端加密规则保持一致
        if (this.myIsNaN(paramResult[2])) {
          paramResult[2] = paramResult[2].toString()
        }
        result[paramResult[1]] = paramResult[2]
      }
    }
    return result
  }

  /**
   * @returns {*} 将两个对象合并成一个
   */
  static mergeObject(objectOne, objectTwo) {
    if (objectTwo && Object.keys(objectTwo).length > 0) {
      for (let key in objectTwo) {
        if (objectTwo.hasOwnProperty(key) === true) {
          //数字值转为string类型，前后端加密规则保持一致
          if (this.myIsNaN(objectTwo[key])) {
            objectTwo[key] = objectTwo[key].toString()
          }
          objectOne[key] = objectTwo[key]
        }
      }
    }
    return objectOne
  }

  static urlEncode(param, key, encode) {
    if (param == null) return ''
    let paramStr = ''
    let t = typeof param
    if (t == 'string' || t == 'number' || t == 'boolean') {
      paramStr += '&' + key + '=' + (encode == null || encode ? encodeURIComponent(param) : param)
    } else {
      for (let i in param) {
        let k = key == null ? i : key + (param instanceof Array ? '[' + i + ']' : '.' + i)
        paramStr += this.urlEncode(param[i], k, encode)
      }
    }
    return paramStr
  }

  /**
   * 接口签名用 生成header中的时间戳
   * @returns {number}
   */
  static getTimestamp() {
    return new Date().getTime()
  }

  static getDateTimeToString() {
    const date_ = new Date()
    const year:any = date_.getFullYear()
    let month:any = date_.getMonth() + 1
    let day:any = date_.getDate()
    if (month < 10) month = '0' + month
    if (day < 10) day = '0' + day
    let hours:any = date_.getHours()
    let mins:any = date_.getMinutes()
    let secs:any = date_.getSeconds()
    const msecs = date_.getMilliseconds()
    if (hours < 10) hours = '0' + hours
    if (mins < 10) mins = '0' + mins
    if (secs < 10) secs = '0' + secs
    if (msecs < 10) secs = '0' + msecs
    return year + '' + month + '' + day + '' + hours + '' + mins + '' + secs
  }
  // true:数值型的，false：非数值型
  static myIsNaN(value) {
    return typeof value === 'number' && !isNaN(value)
  }
}
