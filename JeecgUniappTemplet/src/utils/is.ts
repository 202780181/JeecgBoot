const toString = Object.prototype.toString;

export function is(val: unknown, type: string) {
  return toString.call(val) === `[object ${type}]`;
}

export function isDef<T = unknown>(val?: T): val is T {
  return typeof val !== 'undefined';
}

export function isUnDef<T = unknown>(val?: T): val is T {
  return !isDef(val);
}

export function isObject(val: any): val is Record<any, any> {
  return val !== null && is(val, 'Object');
}

export function isEmpty<T = unknown>(val: T): val is T {
  if (isArray(val) || isString(val)) {
    return val.length === 0;
  }

  if (val instanceof Map || val instanceof Set) {
    return val.size === 0;
  }

  if (isObject(val)) {
    return Object.keys(val).length === 0;
  }

  return false;
}

export function isDate(val: unknown): val is Date {
  return is(val, 'Date');
}

export function isNull(val: unknown): val is null {
  return val === null;
}

export function isNullAndUnDef(val: unknown): val is null | undefined {
  return isUnDef(val) && isNull(val);
}

export function isNullOrUnDef(val: unknown): val is null | undefined {
  return isUnDef(val) || isNull(val);
}

export function isNumber(val: unknown): val is number {
  return is(val, 'Number');
}

export function isPromise<T = any>(val: any): val is Promise<T> {
  // update-begin--author:sunjianlei---date:20211022---for: 不能既是 Promise 又是 Object --------
  return is(val, 'Promise') && isFunction(val.then) && isFunction(val.catch);
  // update-end--author:sunjianlei---date:20211022---for: 不能既是 Promise 又是 Object --------
}

export function isString(val: unknown): val is string {
  return is(val, 'String');
}

export function isJsonObjectString(val: string): val is string {
  if (!val) {
    return false;
  }
  return val.startsWith('{') && val.endsWith('}');
}

export function isFunction(val: unknown): val is Function {
  return typeof val === 'function';
}

export function isBoolean(val: unknown): val is boolean {
  return is(val, 'Boolean');
}

export function isRegExp(val: unknown): val is RegExp {
  return is(val, 'RegExp');
}

export function isArray(val: any): val is Array<any> {
  return val && Array.isArray(val);
}

export function isWindow(val: any): val is Window {
  return typeof window !== 'undefined' && is(val, 'Window');
}

export function isElement(val: unknown): val is Element {
  return isObject(val) && !!val.tagName;
}

export function isMap(val: unknown): val is Map<any, any> {
  return is(val, 'Map');
}

export const isServer = typeof window === 'undefined';

export const isClient = !isServer;

export function isUrl(path: string): boolean {
  const reg =
    /(((^https?:(?:\/\/)?)(?:[-;:&=\+\$,\w]+@)?[A-Za-z0-9.-]+(?::\d+)?|(?:www.|[-;:&=\+\$,\w]+@)[A-Za-z0-9.-]+)((?:\/[\+~%\/.\w-_]*)?\??(?:[-\+=&;%@.\w_]*)#?(?:[\w]*))?)$/;
  return reg.test(path);
}

/**
 * URL地址
 * @param {*} s
 */
export function isURL (s) {
  return /^http[s]?:\/\/.*/.test(s)
}

/**
 * 转换成真实审批地址
 *
 * @param path
 * @param token
 * @param domainUrl
 * @param taskId
 */
export function getBpmFormUrl(path: string, token:string, domainUrl:string, taskId:string): string {
  console.log(' Original Bpm Form Url ：', path);
  console.log("TOKEN = ",token)
  console.log("DOMAIN_URL = ",domainUrl)
  console.log("TASKID = ",taskId)
  // URL支持{{ window.xxx }}占位符变量
  if(path){
    path = path.replace("{{TOKEN}}", token);
    path = path.replace("{{DOMAIN_URL}}", domainUrl);
    path = path.replace("{{TASKID}}", taskId);
    console.log(' NEW Bpm Form Url ：', path);
  }
  return path;
}
