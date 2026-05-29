<route lang="json5" type="page">
{
  layout: 'default',
  style: {
    navigationBarTitleText: '表单',
    navigationStyle: 'custom',
    disableScroll: true, // 微信禁止页面滚动
    'app-plus': {
      bounce: 'none', // 禁用 iOS 弹性效果
    },
  },
}
</route>

<template>
  <PageLayout navTitle="表单">
    <wd-form ref="form" :model="model">
      <wd-cell-group border class="mt-10px mb-10px">
        <wd-input
          label="姓名"
          label-width="80px"
          prop="value1"
          clearable
          v-model="model.value1"
          placeholder="姓名"
          :rules="[{ required: true, message: '请填写姓名' }]"
        />
        <wd-picker
            label="性别"
            label-width="80px"
            prop="value3"
            :columns="columns"
            v-model="model.value3"
            :rules="[{ required: true, message: '请选择性别' }]"
        />
      </wd-cell-group>
      <wd-cell-group border class="mb-10px">
        <wd-input
            label="密码"
            label-width="80px"
            prop="value2"
            show-password
            clearable
            v-model="model.value2"
            placeholder="请输入密码"
            :rules="[{ required: true, message: '请填写密码' }]"
        />

        <wd-select-picker
            label="爱好"
            label-width="80px"
            prop="value4"
            v-model="model.value4"
            :columns="selectColumns"
            :rules="[{ required: true, message: '请选择爱好' }]"
        ></wd-select-picker>
      </wd-cell-group class="mb-10px">

      <wd-cell-group border>
        <wd-calendar  label-width="80px" prop="value5" v-model="model.value5" label="&nbsp;&nbsp;&nbsp;出生" />
      </wd-cell-group>
      <view class="footer">
        <wd-button type="primary" size="large" @click="handleSubmit" block>提交</wd-button>
      </view>
    </wd-form>
  </PageLayout>
</template>

<script lang="ts" setup>
import { useToast } from 'wot-design-uni'
const { success: showSuccess } = useToast()
const columns = ref([
  { value: '1', label: '男' },
  { value: '2', label: '女' },
])
const selectColumns = ref<any>([
  {
    value: '101',
    label: '篮球',
  },
  {
    value: '102',
    label: '足球',
  },
  {
    value: '103',
    label: '棒球',
  },
])
const model = reactive<{
  value1: string
  value2: string
  value3: string
  value4: any
  value5: number
}>({
  value1: '',
  value2: '',
  value3: '',
  value4: [],
  value5: 0,
})

const form = ref()

function handleSubmit() {
  form.value
    .validate()
    .then(({ valid, errors }) => {
      if (valid) {
        console.log("model:",model)
        showSuccess({
          msg: '校验通过',
        })
      }
    })
    .catch((error) => {
      console.log(error, 'error')
    })
}
</script>

<style lang="scss" scoped>
.footer{
  margin: 10px;
}
</style>
