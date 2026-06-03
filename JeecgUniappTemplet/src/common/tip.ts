/**
 * 提示与加载工具类
 */
export default class Tips {
  // 声明 isLoading 属性
  static isLoading: boolean

  // 移除无用的构造函数，因为静态属性不需要在构造函数中初始化
  /**
   * 弹出提示框
   */

  static success(title, duration = 1000) {
    setTimeout(() => {
      uni.showToast({
        title,
        icon: 'success',
        mask: true,
        duration,
      })
    }, 300)
    if (duration > 0) {
      return new Promise<void>((resolve, reject) => {
        setTimeout(() => {
          resolve()
        }, duration)
      })
    }
  }

  /**
   * 弹出确认窗口
   */
  static confirm(text, showCancel, payload = {}, title = '提示') {
    return new Promise((resolve, reject) => {
      uni.showModal({
        title,
        content: text,
        showCancel,
        success: (res) => {
          if (res.confirm) {
            resolve(payload)
          } else if (res.cancel) {
            reject(payload)
          }
        },
        fail: (res) => {
          reject(payload)
        },
      })
    })
  }

  static toast(title, onHide, icon = 'none') {
    setTimeout(() => {
      uni.showToast({
        title,
        // 确保 icon 的值是合法的
        icon: icon as 'success' | 'loading' | 'error' | 'none' | 'fail' | 'exception',
        mask: true,
        duration: 1000,
      })
    }, 300)

    // 隐藏结束回调
    if (onHide) {
      setTimeout(() => {
        onHide()
      }, 500)
    }
  }

  /**
   * 警告框
   */
  static alert(title) {
    uni.showToast({
      title,
      image: '/static/alert.png',
      mask: true,
      duration: 1500,
    })
  }

  /**
   * 错误框
   */

  static error(title, onHide) {
    uni.showToast({
      title,
      image: '/static/error.png',
      mask: true,
      duration: 1500,
    })
    // 隐藏结束回调
    if (onHide) {
      setTimeout(() => {
        onHide()
      }, 500)
    }
  }

  /**
   * 弹出加载提示
   */
  static loading(title = '加载中') {
    if (Tips.isLoading) {
      return
    }
    Tips.isLoading = true
    uni.showLoading({
      title,
      mask: true,
    })
  }

  /**
   * 加载完毕
   */
  static loaded() {
    if (Tips.isLoading) {
      Tips.isLoading = false
      uni.hideLoading()
    }
  }
}

/**
 * 静态变量，是否加载中
 */
Tips.isLoading = false
