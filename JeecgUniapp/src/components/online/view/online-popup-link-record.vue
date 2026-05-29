<template>
  <view class="Popup">
    <view @click="handleClick">
      <wd-input
        :placeholder="`请选择${$attrs.label}`"
        type="text"
        readonly
        v-model="showText"
        clearable
        v-bind="$attrs"
      />
    </view>
    <LinkRecordsModal
      v-if="reportModal.show"
      :selected="value"
       ref="lrmRef"
      :dictCode="dictCode"
      :dictTable="dictTable"
      :dictText="dictText"
      :multi="multi"
      :imageField="imageField"
      @close="handleClose"
      @change="handleChange"
    ></LinkRecordsModal>
  </view>
</template>

<script setup lang="ts">
import { ref, watch, useAttrs } from 'vue'
import { useToast } from 'wot-design-uni'
import LinkRecordsModal from './link-records-modal.vue'
import {http} from "@/utils/http";
defineOptions({
  name: 'onlinePopupLinkRecord',
  options: {
    styleIsolation: 'shared',
  },
})
const props = defineProps({
  value: {
    type: String,
    required: false,
  },
  name: {
    type: String,
    required: false,
  },
  disabled: {
    type: Boolean,
    default: false,
    required: false,
  },
  required: {
    type: Boolean,
    default: true,
    required: false,
  },
  formSchema: {
    type: Object,
    required: true,
  },
})
const emit = defineEmits(['change', 'update:value','selected'])

const toast = useToast()
const lrmRef = ref()
const showText = ref('')
const selectVal = ref([])
const attrs: any = useAttrs()
const reportModal = reactive({
  show: false,
})
//字典code
const dictCode = computed(() => props.formSchema?.dictCode)
//字典table
const dictTable = computed(() => props.formSchema?.dictTable)
//字典文本
const dictText = computed(() => props.formSchema?.dictText)
//是否多选
const multi = computed(() => {
  if(props.formSchema?.fieldExtendJson){
    const extendJson = JSON.parse(props.formSchema.fieldExtendJson)
    return extendJson?.multiSelect
  }
  return false
})
//图片字段
const imageField = computed(() => {
  if(props.formSchema?.fieldExtendJson){
    const extendJson = JSON.parse(props.formSchema.fieldExtendJson)
    return extendJson?.imageField
  }
  return ''
})
//首次加载
const firstLoad = ref(true);
/**
 * 监听value数值
 */
watch(
  () => props.value,
  (val) => {
    val && loadValue()
  },
  { immediate: true },
)
//加载数据
function loadValue(){
  console.log('关联记录loadValue',firstLoad.value)
  if(!firstLoad.value){
    return
  }
  let linkTableSelectFields = dictCode.value + ',' + dictText.value;
  let superQueryParams = [{"field":"id","rule":"in","val": props.value}];
  let param = {
    linkTableSelectFields,
    superQueryMatchType:"and",
    superQueryParams: encodeURI(JSON.stringify(superQueryParams))
  };
  let titleField = props.formSchema?.dictText && props.formSchema?.dictText.split(",")[0];
  http.get(`/online/cgform/api/getData/${dictTable.value}`,param).then((res:any)=>{
    if(res.success){
      let selectedList = res.result.records || [];
      let labels = [];
      let values = [];
      selectedList.forEach(item=>{
        if(item.id){
          values.push(item.id);
          labels.push(item[titleField]);
        }
      })
      showText.value = labels.join(',');
      selectVal.value = values;
      emit('selected', selectedList,props.name);
    }
  })
  firstLoad.value = false;
}

//回显数值
function callBack(rows) {
  //匹配popup设置的回调值
  let values = []
  let labels = []
  let titleField = props.formSchema?.dictText && props.formSchema?.dictText.split(",")[0];
  rows.forEach(item=>{
    if(item.id){
      values.push(item.id);
      labels.push(item[titleField]);
    }
  })
  showText.value = labels.join(',')
  selectVal.value = values
  emit('selected', rows,props.name)
  emit('change', values.join(','))
  emit('update:value', values.join(','))
}
//点击事件
const handleClick = () => {
  if (!props.disabled) {
    reportModal.show = true
    //lrmRef.value.beforeOpen(selectVal.value)
  }
}
//关闭事件
const handleClose = () => {
  reportModal.show = false
}
const handleChange = (data) => {
  console.log('选中的值：', data)
  callBack(data)
}
</script>

<style scoped></style>
