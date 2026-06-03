/* eslint-disable */

export interface JeecgResult<T = unknown> {
  success?: boolean
  code?: number | string
  message?: string
  result?: T
  timestamp?: number
}
