<template>
  <view>
    <wd-popup v-model="show" position="right" @close="handleClose">
      <wd-cell-group border>
        <wd-cell custom-class="title" title="筛选"></wd-cell>
        <wd-radio-group v-model="star">
          <wd-cell title="全部消息" clickable @click="handleSelected('')">
            <wd-radio value=""></wd-radio>
          </wd-cell>
          <wd-cell title="星标消息" clickable @click="handleSelected('1')">
            <wd-radio value="1"></wd-radio>
          </wd-cell>
        </wd-radio-group>
        <wd-cell custom-class="date">
          <uni-calendar
            ref="startCalendar"
            :insert="false"
            v-model:date="sartDate"
            @confirm="handleStartDateConfirm"
          />
          <wd-input v-model="sartDate" @click="open" placeholder="选择开始日期" readonly></wd-input>
          <view :class="getClass(sartDate)" @click="handleClear('sartDate', sartDate)"></view>
        </wd-cell>
        <wd-cell custom-class="date">
          <uni-calendar
            ref="endCalendar"
            :insert="false"
            v-model:date="endDate"
            @confirm="handleEndDateConfirm"
          />
          <wd-input
            v-model="endDate"
            @click="endOpen"
            placeholder="选择结束日期"
            readonly
          ></wd-input>
          <view :class="getClass(endDate)" @click="handleClear('endDate', endDate)"></view>
        </wd-cell>
      </wd-cell-group>
    </wd-popup>
  </view>
</template>

<script lang="ts" setup>
//
import { ref } from 'vue'
import { duplicateCheck } from '@/service/api'
import { isObject } from '@/common/is'

defineOptions({
  name: 'rightConditionFilter',
  options: {
    styleIsolation: 'apply-shared',
  },
})

const props = defineProps(['starFlag', 'conditionStartDate', 'conditionEndDate'])
const eimt = defineEmits(['change', 'close'])
const show = ref(true)
const star = ref(props.starFlag)
const sartDate = ref(props.conditionStartDate)
const endDate = ref(props.conditionEndDate)
//日历
const startCalendar = ref(null)
const endCalendar = ref(null)
const handleClose = () => {
  setTimeout(() => {
    eimt('close')
  }, 300)
}

const open = (val) => {
  startCalendar.value.open()
}
const endOpen = (val) => {
  endCalendar.value.open()
}

const getClass = (value) => {
  let className = 'hide'
  if (value) {
    className = value ? '' : 'hide'
  }
  return `u-iconfont u-icon-close ${className}`
}
const handleClear = (flag, value) => {
  if (flag == 'sartDate' && value) {
    sartDate.value = ''
    eimt('change', [star.value, sartDate.value, endDate.value])
  } else if (flag == 'endDate' && value) {
    endDate.value = ''
    eimt('change', [star.value, sartDate.value, endDate.value])
  }
}
const handleSelected = (val) => {
  star.value = val
  eimt('change', [star.value, sartDate.value, endDate.value])
}
const handleStartDateConfirm = (e) => {
  console.log('handleStartDateConfirm 返回:', e)
  sartDate.value = e.fulldate
  eimt('change', [star.value, sartDate.value, endDate.value])
}
const handleEndDateConfirm = (e) => {
  console.log('handleStartDateConfirm 返回:', e)
  endDate.value = e.fulldate
  eimt('change', [star.value, sartDate.value, endDate.value])
}
</script>

<style lang="scss" scoped>
//

:deep(.wd-cell-group) {
  width: 150px;
  .wd-cell {
    &.title {
      .wd-cell__title {
        font-size: 17px;
      }
    }
  }
  .wd-cell__wrapper {
    align-items: center;
    .wd-cell__right {
      flex: 0.5;
    }
    .wd-radio {
      margin-top: 0;
    }
  }
  .uni-calendar__header-text {
    font-size: 16px !important;
  }
  .wd-cell {
    &.date {
      &:last-child {
        .wd-cell__wrapper {
          border-bottom: 1px solid rgba(232, 232, 232, 0.5);
        }
      }
      .wd-cell__wrapper {
        .wd-calendar__value {
          margin-right: 0;
          text-align: center;
        }
        .wd-input::after {
          display: none;
        }
        .wd-icon-arrow-right {
          display: none;
        }
        .wd-calendar__cell {
          padding: 0;
        }
        .wd-cell__left {
          display: none;
        }
        .wd-cell__right {
          flex: 1;
        }
        .wd-cell__value {
          display: flex;
          align-items: center;
          .wd-picker {
            --wot-cell-wrapper-padding: 0;
            --wot-cell-padding: 0;
            flex: 1;
          }
        }
      }
    }
  }
}

.u-icon-close {
  color: var(--wot-input-clear-color, #585858);
  font-size: 15px;
  margin-left: 5px;
  &.hide {
    opacity: 0;
  }
}
</style>
