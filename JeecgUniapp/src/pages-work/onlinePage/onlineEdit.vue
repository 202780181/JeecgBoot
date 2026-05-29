<route lang="json5" type="page">
{
  layout: 'default',
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: 'Online表单编辑',
    disableScroll: true, // 微信禁止页面滚动
    'app-plus': {
      bounce: 'none', // 禁用 iOS 弹性效果
    },
  },
}
</route>

<template>
  <PageLayout :navTitle="navTitle" :backRouteName="backRouteName">
    <scroll-view scroll-y>
      <online-loader
        v-if="reload"
        ref="onlineEdit"
        :table="dynamicTableName"
        :dataId="dataId"
        :title="navTitle"
        :edit="true"
        show-footer
        @success="handleSuccess"
        @back="backRoute"
      ></online-loader>
    </scroll-view>
  </PageLayout>
</template>

<script lang="ts" setup>
import OnlineLoader from '@/components/online/online-loader.vue'
import router from '@/router'
import { onLoad } from '@dcloudio/uni-app'
import { http } from '@/utils/http'
import { useToast } from 'wot-design-uni'
import { isMp, isH5 } from '@/utils/platform'
import {getRefPromise} from "@/utils";
defineOptions({
  name: 'onlineEdit',
  options: {
    styleIsolation: 'shared',
  },
})
const toast = useToast()
// 定义响应式数据
const tableName = ref('')
const navTitle = ref('')
const dataId = ref('')
const backRouteName = ref('')
const process_url = ref('/act/process/extActProcess/startMutilProcess')
const flow_code_pre = ref('onl_')
const flowEdit = ref(false)
const edit = ref(true)
const reload = ref(true)

// 引用组件
const onlineEdit = ref(null)
// 定义 initForm 方法
const initForm = (item) => {
  console.log('initForm item', item)
  // 表描述
  navTitle.value = `表单【${item.desformName}】`
  flowEdit.value = item.backRouteName == 'draft' ? true : false
  // 返回上一页面
  item.backRouteName && (backRouteName.value = item.backRouteName)
  reload.value = false
  nextTick(() => {
    reload.value = true
    // 表名
    tableName.value = item.desformCode
    // 数据ID
    dataId.value = item.dataId
    console.log('onlineEdit.value', onlineEdit.value)
    console.log('onlineEdit.value', onlineEdit.value)
    let delay = 0
    if (isH5 === false) {
      // 小程序端需要延时下，否则不显示
      delay = 300
    }
    setTimeout(() => {
     getRefPromise(onlineEdit).then(() => {
       onlineEdit.value?.loadByTableName(item.dataId, item.desformCode)
     })
    }, delay)
  })
}
const dynamicTableName = computed(() => {
  return tableName.value
})
// 开启流程
const startProcess = (id) => {
  const param = {
    flowCode: flow_code_pre.value + tableName.value,
    id: id,
    formUrl: 'modules/bpm/task/form/OnlineFormDetail',
    formUrlMobile: 'check/onlineForm/detail',
  }
  console.log('提交流程参数', param)
  http.post(process_url.value, param).then((res: any) => {
    toast.info(res.message)
    if (res.success) {
      uni.$emit('draft:reload')
      router.back()
    }
  })
}

const backRoute = () => {
  router.back()
}

// 定义 handleSuccess 方法
const handleSuccess = (id) => {
  if (backRouteName.value === 'draft') {
    uni.showModal({
      title: '提示',
      content: '确认提交流程吗?',
      cancelText: '取消',
      confirmText: '确认',
      success: (res) => {
        if (res.confirm) {
          startProcess(id)
          uni.showToast({
            title: '发起流程成功~',
            icon: 'none',
          })
        } else {
          router.back()
        }
      },
    })
  } else {
    uni.$emit('refreshList')
    backRoute()
  }
}

// onLoad 生命周期钩子
onLoad((option) => {
  initForm(option)
})
</script>

<style lang="scss" scoped>
//
</style>
