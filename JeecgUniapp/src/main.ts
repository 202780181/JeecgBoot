import '@/style/index.scss'
import '@/style/custom/main.css'
import '@/style/custom/icon.css'
import '@/style/custom/animation.css'
import { VueQueryPlugin } from '@tanstack/vue-query'
import 'virtual:uno.css'
import { createSSRApp } from 'vue'

import App from './App.vue'
import { prototypeInterceptor, requestInterceptor, routeInterceptor } from './interceptors'
import { registerGlobComp } from '@/components/registerGlobComp';
import store from './store'
import router from './router'

export function createApp() {
  const app = createSSRApp(App)
  app.use(store)
  app.use(router)
  app.use(routeInterceptor)
  app.use(requestInterceptor)
  app.use(prototypeInterceptor)
  app.use(VueQueryPlugin)
  //#ifndef MP-WEIXIN
  // 注册全局组件
  registerGlobComp(app);
  // #endif
  return {
    app,
  }
}
