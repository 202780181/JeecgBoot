<route lang="json5" type="page">
{
  layout: 'default',
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: 'Online表单详情',
    disableScroll: true, // 微信禁止页面滚动
    'app-plus': {
      bounce: 'none', // 禁用 iOS 弹性效果
    },
  },
}
</route>

<template>
  <PageLayout :navTitle="navTitle" backRouteName="onlineTable">
      <scroll-view scroll-y >
        <online-loader
          ref="online"
          :table="tableName"
          :title="navTitle"
          :dataId="dataId"
          edit
          :show-footer="false"
          @success="handleSuccess"
          @back="backRoute"
        ></online-loader>
      </scroll-view>
  </PageLayout>
</template>

<script lang="ts" setup>
import OnlineLoader from '@/components/online/online-loader.vue'
import router from '@/router'
import {onLoad} from "@dcloudio/uni-app";
import {getRefPromise} from "@/utils";
import { isMp, isH5 } from '@/utils/platform'
// 定义响应式数据
const tableName = ref('');
const navTitle = ref('');
const dataId = ref('');
const online = ref(null);

// 定义 initForm 方法
const initForm = (item) => {
  console.log('initForm item', item);
  // 表名
  tableName.value = item.desformCode
  // 表描述
  navTitle.value = `表单【${item.desformName}】`
  // 数据ID
  dataId.value = item.id
  let delay = 0
  if (isH5 === false) {
    // 小程序端需要延时下，否则不显示
    delay = 1000
  }
 setTimeout(() => {
  getRefPromise(online).then(() => {
    online.value?.loadByTableName(item.dataId, item.desformCode)
  })
 }, delay)
}

const backRoute = () => {
  router.back()
}


// 定义 handleSuccess 方法
const handleSuccess = (id) => {
  uni.$emit('refreshList');
  backRoute()
}

// onLoad 生命周期钩子
onLoad((option) => {
  initForm(option)
})

</script>

<style lang="scss" scoped>
//
</style>
