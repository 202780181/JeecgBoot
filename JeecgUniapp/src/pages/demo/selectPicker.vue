<route lang="json5" type="page">
{
  layout: 'default',
  style: {
    navigationBarTitleText: '单选多选',
    navigationStyle: 'custom',
    disableScroll: true, // 微信禁止页面滚动
    'app-plus': {
      bounce: 'none', // 禁用 iOS 弹性效果
    },
  },
}
</route>

<template>
  <PageLayout navTitle="单复选择器" backRouteName="demo">
    <wd-select-picker
      label="多选"
      v-model="value"
      :columns="columns"
      @change="handleChange"
    ></wd-select-picker>
    <wd-select-picker
      label="单选"
      type="radio"
      v-model="radioValue"
      :columns="columns"
      @change="handleRadioChange"
    ></wd-select-picker>
  </PageLayout>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { useToast } from 'wot-design-uni'
const { show: showToast } = useToast()
const columns = ref<any>([
  {
    value: '101',
    label: '男装',
  },
  {
    value: '102',
    label: '奢侈品',
  },
  {
    value: '103',
    label: '女装',
  },
])
const value = ref<string[]>(['101'])
const radioValue = ref<string>('101')
const handleRadioChange = ({ value }) => {}
function handleChange({ value }) {
  showToast('选择了' + value)
}
</script>

<style lang="scss" scoped>
//
</style>
