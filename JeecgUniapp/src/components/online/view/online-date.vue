<template>
    <view class="pickerArea" :class="{ clear: !!currentTime }">
      <!-- 周视图 -->
      <wd-calendar
          v-if="type == 'week'"
          v-model="currentTime"
          type="week"
          :disabled="disabled"
          :default-value="defaultValue"
          :labelWidth="labelWidth"
          :label="label"
          @confirm="handleConfirm" />
      <!-- 季度视图 -->
      <wd-picker
          v-else-if="type == 'quarter'"
          v-model="currentQuarter"
          :disabled="disabled"
          :labelWidth="labelWidth"
          :label="label"
          :columns="quarterColumns"
          @open="quarterOpen"
          @confirm="quarterConfirm"/>
      <!-- 其他视图 -->
      <wd-datetime-picker
        v-else
        :disabled="disabled"
        :minDate="-662716800000"
        :maxDate="4102416000000"
        :default-value="defaultValue"
        :type="type"
        :labelWidth="labelWidth"
        v-model="currentTime"
        :label="label"
        @confirm="handleConfirm"
      />
      <view v-if="!!currentTime && !disabled" class="u-iconfont u-icon-close" @click.stop="handleClear"></view>
    </view>
</template>

<script setup>
// 定义 props
import { isString } from '@/utils/is'
import dayjs from 'dayjs'
import {dateToQuarterStart} from "@/common/uitls";

defineOptions({
  name: 'online-date',
  options: {
    styleIsolation: 'shared',
  },
})

//props定义
const props = defineProps({
  label: {
    type: String,
    default: '',
    required: false,
  },
  labelWidth: {
    type: String,
    default: '80px',
    required: false,
  },
  name: {
    type: String,
    default: '',
    required: false,
  },
  type: {
    type: String,
    default: 'date',
    required: false,
  },
  value: {
    type: [String, Number, Date],
    required: false,
  },
  disabled: {
    type: Boolean,
    default: false,
    required: false,
  },
})

// 定义 emits
const emit = defineEmits(['input', 'change', 'update:value'])
// 定义响应式数据;
const currentQuarter  = ref('');
// 定义响应式数据;
const currentTime = ref(props.type == 'week' ? null : '');
// 默認
const defaultValue = ref(Date.now())
// 季度选择器列
const quarterColumns = ref([])

// 监听 value 的变化
watch(
  () => props.value,
  (val) => {
    if (val) {
      if (props.type == 'quarter' && quarterColumns.value.length == 0) {
        generateQuarterOptions()
      }
       initVal(val)
    }
  },
  { immediate: true },
)

// 初始化值
function initVal(val){
  if (props.type == 'quarter') {
    currentQuarter.value = dateToQuarterStart(val);
  }else{
    if (typeof val == 'object') {
      currentTime.value = dayjs(val).valueOf();
    } else {
      currentTime.value = isString(val) ? new Date(val).getTime() : val;
    }
  }
}
// 选择器改变事件处理函数
const handleConfirm = (e) => {
  emit('update:value', currentTime.value)
  emit('change', currentTime.value)
}
// 选择器改变事件处理函数
const quarterOpen = () => {
  !quarterColumns.value.length && generateQuarterOptions();
  if(!currentQuarter.value) {
    currentQuarter.value = dateToQuarterStart(new Date());
  }
}
// 选择器改变事件处理函数
const quarterConfirm = (e) => {
  emit('update:value', currentQuarter.value)
  emit('change', currentQuarter.value)
}
// 清空
const handleClear = () => {
  currentTime.value = null
  handleConfirm(null)
}
// 生成季度选择器列
function generateQuarterOptions(){
  const options = [];
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 40;
  const endYear = currentYear + 40;
  const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => endYear - i).reverse();
  years.forEach(year => {
    options.push({label: `${year}年 Q1`, value: `${year}-01-01`})
    options.push({label: `${year}年 Q2`, value: `${year}-04-01`})
    options.push({label: `${year}年 Q3`, value: `${year}-07-01`})
    options.push({label: `${year}年 Q4`, value: `${year}-10-01`})
  })
  quarterColumns.value = [...options];
}
</script>

<style lang="scss" scoped>
.pickerArea {
  position: relative;
  .u-icon-close {
    position: absolute;
    right: 15px;
    top: calc(10px + 4px);
    color: #585858;
    font-size: 15px;
  }
  &.clear {
    :deep(.wd-picker__arrow) {
      display: none;
    }
  }
}
</style>
