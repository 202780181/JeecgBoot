<template>
  <wd-datetime-picker :disabled="disabled" type="time" :labelWidth="labelWidth" v-model="currentTime" :label="label" @confirm="handleConfirm" />
</template>

<script setup>
// 定义 props
import dayjs from "dayjs";

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
    default: '',
    required: false,
  },
  value: {
    type: [String, Number,Date],
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
const currentTime = ref('')

// 监听 value 的变化
watch(
    () => props.value,
    (val) => {
        currentTime.value  = initData(val);
    },
    {
      immediate:true
    }
)

/**
 *
 * @param val
 * @returns {*|string}
 */
function initData(time){
  try {
    if(typeof time == 'object' ){
      time = dayjs(time).format('HH:mm:ss');
    }
  }catch (e) {
    console.log("initData>>e",e);
  }
  return time?time:'';
}
// 选择器改变事件处理函数
const handleConfirm = (e) => {
  emit('update:value', currentTime.value+':00')
  emit('change', currentTime.value+':00')
}
</script>

<style></style>
