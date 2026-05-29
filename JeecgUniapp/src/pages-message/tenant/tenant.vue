<route lang="json5" type="page">
{
  layout: 'default',
  style: {
    navigationBarTitleText: '',
    navigationStyle: 'custom',
    disableScroll: true, // 微信禁止页面滚动
    'app-plus': {
      bounce: 'none', // 禁用 iOS 弹性效果
    },
  },
}
</route>
<template>
  <PageLayout
    :navTitle="title"
    backRouteName="message"
    routeMethod="pushTab"
    navRightTextMp="筛选"
    @navRightMp="() => (conditionFilter.show = true)"
  >
    <wd-tabs customClass="" v-model="tabActive">
      <template v-for="(item, index) in tabList" :key="index">
        <wd-tab :title="item.title" :name="item.key">
          <workmate
            v-if="tabActive == '1'"
            :tenantId="tenantId"
            :key="reloadKey"
            :workType="workType"
          ></workmate>
          <department v-if="tabActive == '2'" :tenantId="tenantId"></department>
        </wd-tab>
      </template>
    </wd-tabs>
    <template #navRight>
      <view
        class="cuIcon-filter font-size-20px color-white"
        @click="() => (conditionFilter.show = true)"
      ></view>
    </template>
    <rightConditionFilter
      v-if="conditionFilter.show"
      v-bind="conditionFilter"
      @close="() => (conditionFilter.show = false)"
      @change="handleChange"
    ></rightConditionFilter>
  </PageLayout>
</template>

<script setup lang="ts">
import { onShow, onHide, onLoad, onReady } from '@dcloudio/uni-app'
import { ref } from 'vue'
import workmate from './components/workmate.vue'
import department from './components/department.vue'
import rightConditionFilter from '@/components/RightConditionFilter/RightConditionFilter.vue'

defineOptions({
  name: 'tenant',
  options: {
    // apply-shared‌：当前页面样式会影响到子组件样式.(小程序)
    // shared‌：当前页面样式影响到子组件，子组件样式也会影响到当前页面.(小程序)
    styleIsolation: '‌shared‌',
  },
})
const reloadKey = ref(1)
const tabList = ref([
  { key: '1', title: '全部' },
  { key: '2', title: '按部门' },
])
const conditionFilter = reactive({
  show: false,
  checked: 'all',
  options: [
    { key: 'all', title: '所有同事' },
    { key: 'group', title: '群组' },
  ],
})
const tabActive = ref('2')
const tenantId = ref()
const title = ref()
const workType = ref('')
const handleChange = ({ option }) => {
  conditionFilter.checked = option.key
  if (option.key == 'all') {
    tabList.value[1]['title'] = '按部门'
    workType.value = ''
  } else if (option.key == 'group') {
    tabList.value[1]['title'] = '我创建的'
    if (tabActive.value == '1') {
      workType.value = 'allGroup'
    } else {
      workType.value = 'createdGroup'
    }
  }
  tabList.value = [...tabList.value]

  // 重新加载
  reloadKey.value = Math.random()
}
const init = () => {}
init()
onLoad((options) => {
  tenantId.value = options.id
  title.value = options.title
})
</script>

<style lang="scss" scoped>
:deep(.wd-tabs) {
  height: 100%;
  display: flex;
  flex-direction: column;
  .wd-tabs__nav {
    border-bottom: 1px solid #f1f1f1;
  }
  .wd-tabs__container {
    flex: 1;
    width: 100%;
  }
  .wd-tabs__body {
    position: relative;
  }
}
:deep(.wd-tab) {
  .wd-tab__body {
    position: absolute;
    height: 100%;
    width: 100%;
    top: 0;
    left: 0;
    background-color: #f1f1f1;
  }
}
</style>
