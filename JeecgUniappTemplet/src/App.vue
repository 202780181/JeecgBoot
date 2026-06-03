<script lang="ts">
import { onLaunch, onShow, onHide, onLoad, onReady } from '@dcloudio/uni-app'
import 'abortcontroller-polyfill/dist/abortcontroller-polyfill-only'
import { beforEach } from '@/router/index'
 // #ifdef APP-PLUS
import appUpdate from "@/common/appUpdate";
// #endif
export default {
  onLaunch: function (options) {
    console.log('App Launch')
    console.log('应用启动路径：', options.path)
    // #ifdef APP-PLUS
    // 检测升级
    appUpdate()
    // #endif
  },
  onShow: function (options) {
    console.log('App Show')
    console.log('应用启动路径：', options.path)
    // 首次进入页面时路由拦截
    setTimeout(() => {
      const currentPage = options.path
      beforEach({ path: '/' }, { path: currentPage, fullPath: currentPage }, (data) => {
        if (data?.path) {
          uni.redirectTo({ url: data.path })
        }
      })
    }, 100)
  },
  onHide: function () {
    console.log('App Hide')
  },
  // 全局变量
  globalData: {
    isLocalConfig: true,
    systemInfo: uni.getSystemInfoSync(),
    // 导航的高度
    navHeight: 44,
  },
}
</script>

<style lang="scss">
:root,
page {
  font-size: 14px;
  color: #333333;
  font-family:
    Helvetica Neue,
    Helvetica,
    sans-serif;
}
uni-page-body {
  height: 100%;
  & > uni-view {
    height: 100%;
  }
}
.shadow-warp {
  position: relative;
  box-shadow: 0 0 5px rgba(168, 92, 92, 0.1);
}

/* stylelint-disable selector-type-no-unknown */
button::after {
  border: none;
}

swiper,
scroll-view {
  flex: 1;
  height: 100%;
  overflow: hidden;
}

image {
  width: 100%;
  height: 100%;
  vertical-align: middle;
}

// 单行省略，优先使用 unocss: text-ellipsis
.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

// 两行省略
.ellipsis-2 {
  display: -webkit-box;
  overflow: hidden;
  text-overflow: ellipsis;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-all;
}

// 三行省略
.ellipsis-3 {
  display: -webkit-box;
  overflow: hidden;
  text-overflow: ellipsis;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}
</style>
