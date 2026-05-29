<template>
  <view class="DateTime">
    <view class="inputArea" :class="{ clear: !!showText }" @click="handleClick">
      <wd-input
        :placeholder="getPlaceholder($attrs)"
        v-bind="$attrs"
        readonly
        v-model="showText"
      ></wd-input>
      <view v-if="!!showText && !disabled" class="u-iconfont u-icon-close" @click.stop="handleClear"></view>
    </view>
    <wd-popup v-if="popupShow" position="bottom" v-model="popupShow">
      <view class="content">
        <view class="operation">
          <view class="cancel text-gray-5" @click.stop="cancel">取消</view>
          <view class="confrim" @click.stop="confirm">确定</view>
        </view>
        <picker-view class="picker-view" :value="pickerValue" @change="handleChange">
          <!-- 年 -->
          <picker-view-column v-if="showYear">
            <view class="picker-item" v-for="(item, index) in years" :key="index">
              {{ item }}年
            </view>
          </picker-view-column>
          <!-- 月 -->
          <picker-view-column v-if="showMonth">
            <view class="picker-item" v-for="(item, index) in months" :key="index">
              {{ item }}月
            </view>
          </picker-view-column>
          <!-- 日 -->
          <picker-view-column v-if="showDay">
            <view class="picker-item" v-for="(item, index) in days" :key="index">{{ item }}日</view>
          </picker-view-column>
          <!-- 时 -->
          <picker-view-column v-if="showHour">
            <view class="picker-item" v-for="(item, index) in hours" :key="index">
              {{ item }}时
            </view>
          </picker-view-column>
          <!-- 分 -->
          <picker-view-column v-if="showMinute">
            <view class="picker-item" v-for="(item, index) in minutes" :key="index">
              {{ item }}分
            </view>
          </picker-view-column>
          <!-- 秒 -->
          <picker-view-column v-if="showSecond">
            <view class="picker-item" v-for="(item, index) in seconds" :key="index">
              {{ item }}秒
            </view>
          </picker-view-column>
        </picker-view>
      </view>
    </wd-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useToast } from 'wot-design-uni'
import dayjs from 'dayjs'
import { getPlaceholder } from '@/common/uitls'

defineOptions({
  name: 'DateTime',
  options: {
    styleIsolation: 'shared',
  },
})

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  // 显示格式：year/month/day/hour/minute/second
  format: {
    type: String,
    default: 'YYYY-MM-DD HH:mm:ss',
  },
  // 开始时间
  startTime: {
    type: String,
    default: '1970-01-01 00:00:00',
  },
  // 结束时间
  endTime: {
    type: String,
    default: '2100-12-31 23:59:59',
  },
  // 是否禁用
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['change', 'update:modelValue'])
const toast = useToast()

// 显示控制
const showYear = computed(() => props.format.includes('YYYY'))
const showMonth = computed(() => props.format.includes('MM'))
const showDay = computed(() => props.format.includes('DD'))
const showHour = computed(() => props.format.includes('HH'))
const showMinute = computed(() => props.format.includes('mm'))
const showSecond = computed(() => props.format.includes('ss'))

// 数据源
const years = ref<number[]>([])
const months = ref<number[]>([])
const days = ref<number[]>([])
const hours = ref<number[]>([])
const minutes = ref<number[]>([])
const seconds = ref<number[]>([])

// 当前选中的值
const pickerValue = ref<number[]>([])
const showText = computed(() => props.modelValue)
const popupShow = ref(false)

// 初始化数据
const initData = () => {
  const start = dayjs(props.startTime)
  const end = dayjs(props.endTime)

  // 初始化年份
  if (showYear.value) {
    years.value = Array.from({ length: end.year() - start.year() + 1 }, (_, i) => start.year() + i)
  }

  // 初始化月份
  if (showMonth.value) {
    months.value = Array.from({ length: 12 }, (_, i) => i + 1)
  }

  // 初始化日期
  if (showDay.value) {
    const currentYear = props.modelValue ? dayjs(props.modelValue).year() : start.year()
    const currentMonth = props.modelValue ? dayjs(props.modelValue).month() + 1 : 1
    const daysInMonth = dayjs(`${currentYear}-${currentMonth}`).daysInMonth()
    days.value = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  }

  // 初始化小时
  if (showHour.value) {
    hours.value = Array.from({ length: 24 }, (_, i) => i)
  }

  // 初始化分钟
  if (showMinute.value) {
    minutes.value = Array.from({ length: 60 }, (_, i) => i)
  }

  // 初始化秒
  if (showSecond.value) {
    seconds.value = Array.from({ length: 60 }, (_, i) => i)
  }
}

// 更新日期
const updateDays = () => {
  if (!showYear.value || !showMonth.value) return

  const year = years.value[pickerValue.value[0] || 0]
  const month = months.value[pickerValue.value[1] || 0]
  const daysInMonth = dayjs(`${year}-${month}`).daysInMonth()
  days.value = Array.from({ length: daysInMonth }, (_, i) => i + 1)
}

// 初始化pickerValue
const initializePickerValue = () => {
  let newPickerValue = []
  if (
    [
      'YYYY-MM-DD HH:mm:ss',
      'YYYY-MM-DD HH:mm',
      'YYYY-MM-DD HH',
      'YYYY',
      'YYYY-MM',
      'YYYY-MM-DD',
    ].includes(props.format)
  ) {
    const dateTime = props.modelValue ? dayjs(props.modelValue) : dayjs()
    if (showYear.value) {
      const yearIndex = years.value.indexOf(dateTime.year())
      newPickerValue.push(yearIndex >= 0 ? yearIndex : 0)
    }

    if (showMonth.value) {
      const monthIndex = months.value.indexOf(dateTime.month() + 1)
      newPickerValue.push(monthIndex >= 0 ? monthIndex : 0)
    }

    if (showDay.value) {
      const dayIndex = days.value.indexOf(dateTime.date())
      newPickerValue.push(dayIndex >= 0 ? dayIndex : 0)
    }

    if (showHour.value) {
      newPickerValue.push(dateTime.hour())
    }

    if (showMinute.value) {
      newPickerValue.push(dateTime.minute())
    }
    if (showSecond.value) {
      newPickerValue.push(dateTime.second())
    }
  } else if (['HH:mm:ss', 'HH:mm', 'mm:ss', 'HH', 'mm', 'ss'].includes(props.format)) {
    const dateTime = props.modelValue
    if (dateTime) {
      newPickerValue = dateTime.split(':').map((item) => +item)
    } else {
      // 获取当前时间
      const now = dayjs()
      if (showHour.value) {
        newPickerValue.push(now.hour())
      }
      if (showMinute.value) {
        newPickerValue.push(now.minute())
      }
      if (showSecond.value) {
        newPickerValue.push(now.second())
      }
    }
  }
  pickerValue.value = newPickerValue
}

// 处理选择变化
const handleChange = (e: any) => {
  const values = e.detail.value
  pickerValue.value = values

  // 如果选择了年月，需要更新日期
  if (showYear.value && showMonth.value && showDay.value) {
    updateDays()
  }
}

// 点击确认
const confirm = () => {
  const values = pickerValue.value
  let selectedDate = dayjs()
  let index = 0

  // 只设置用户选择的时间部分，未选择的保持当前时间
  if (showYear.value && values[index] !== undefined) {
    selectedDate = selectedDate.year(years.value[values[index]])
    index++
  }
  if (showMonth.value && values[index] !== undefined) {
    selectedDate = selectedDate.month(months.value[values[index]] - 1)
    index++
  }
  if (showDay.value && values[index] !== undefined) {
    selectedDate = selectedDate.date(days.value[values[index]])
    index++
  }
  if (showHour.value && values[index] !== undefined) {
    selectedDate = selectedDate.hour(hours.value[values[index]])
    index++
  }
  if (showMinute.value && values[index] !== undefined) {
    selectedDate = selectedDate.minute(minutes.value[values[index]])
    index++
  }
  if (showSecond.value && values[index] !== undefined) {
    selectedDate = selectedDate.second(seconds.value[values[index]])
    index++
  }

  popupShow.value = false
  const output = selectedDate.format(props.format)
  emit('update:modelValue', output)
  emit('change', output)
}

// 点击取消
const cancel = () => {
  popupShow.value = false
}

// 清空选择
const handleClear = () => {
  emit('update:modelValue', '')
  emit('change', '')
}

// 点击输入框
const handleClick = () => {
  if (!props.disabled) {
    initData()
    initializePickerValue()
    popupShow.value = true
  }
}
</script>

<style lang="scss" scoped>
.DateTime {
  .picker-view {
    width: 100%;
    height: 400rpx;
  }
  .picker-item {
    line-height: 88rpx;
    text-align: center;
  }
  .operation {
    display: flex;
    justify-content: space-between;
    padding: 20rpx;
    border-bottom: 1rpx solid #eee;
    .cancel,
    .confrim {
      padding: 10rpx 30rpx;
    }
    .confrim {
      color: #2979ff;
    }
  }
  .inputArea {
    position: relative;
    .u-icon-close {
      position: absolute;
      right: 15px;
      top: calc(14px + 4px);
      color: #585858;
      font-size: 15px;
    }
    &.clear {
      :deep(.wd-input__body) {
        padding-right: 20px;
      }
    }
  }
}
</style>
