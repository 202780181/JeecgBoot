<route lang="json5" type="page">
{
  layout: 'default',
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: 'Online表单新增',
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
        ref="online"
        :table="tableName"
        :title="navTitle"
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
import { http } from '@/utils/http'
import { useToast } from 'wot-design-uni'
import { onLoad } from '@dcloudio/uni-app'
const toast = useToast()
// 定义响应式数据
const tableName = ref('')
const navTitle = ref('')
const flow_code_pre = ref('onl_')
const process_url = ref('/act/process/extActProcess/startMutilProcess')
const backRouteName = ref('onlineTable')

// 引用组件
const online = ref(null)

// 定义 initForm 方法
const initForm = (item) => {
  // 表名
  tableName.value = item.desformCode
  // 表描述
  navTitle.value = `表单【${item.desformName}】`
  if (item.backRouteName === 'paper') {
    navTitle.value = `表单【${item.desformName}】发起申请`
  }
  // 返回上一页面
  item.backRouteName && (backRouteName.value = item.backRouteName)
  nextTick(() => {
    online.value.loadByTableName(tableName.value)
  })
}

const backRoute = () => {
  router.back()
}

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
      router.back()
    }
  })
}

// 定义 handleSuccess 方法
const handleSuccess = (id) => {
  if (backRouteName.value === 'paper') {
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
    callPrevPageMethod()
  }
}

// 定义一个方法来调用上一页的方法
const callPrevPageMethod = () => {
  uni.$emit('refreshList')
  router.back()
}
// onLoad 生命周期钩子
onLoad((option) => {
  initForm(option)
})
</script>

<style lang="scss" scoped>
//
</style>
