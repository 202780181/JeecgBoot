<template>
  <view class="online-sub-many-container">
    <wd-button :disabled="componentDisabled" customClass="add" icon="add" size="small" @click="handleAdd">新增</wd-button>
    <wd-table :data="dataList" height="400px">
      <template v-for="(col,index) in columns" :key="index">
        <wd-table-col :prop="col.key" :label="col.title" align="center" :fixed="col.key == 'action'">
          <template #value="value" v-if="col.key == 'action'">
            <view class="custom-action">
              <wd-button size="small" type="icon" icon="edit" @click="handleEdit(value)"></wd-button>
              <wd-button size="small" type="icon" icon="delete" style="color:rgba(255,0,0,0.5)" @click="handleDel(value)"></wd-button>
            </view>
          </template>
          <template #value="{ row, index }" :key="index" v-else>
            <online-sub-table-cell
                :columnsInfo="columnsInfo"
                :record="row"
                :column="col"
            ></online-sub-table-cell>
          </template>
        </wd-table-col>
      </template>
    </wd-table>
  </view>
  <online-subform-popup
      v-if="popupShow"
      ref="subFormPop"
      :title="tableTxt"
      :schema="formSchema"
      :disabled="disabled"
      @close="handleClose"
      @change="handleChange"
  ></online-subform-popup>
</template>

<script lang="ts" setup>
import {useMessage, useToast} from 'wot-design-uni';
import OnlineSubformPopup from './components/online-subform-popup.vue'
import OnlineSubTableCell from './components/online-sub-table-cell.vue'
import { http } from '@/utils/http'
import {deepClone} from "wot-design-uni/components/common/util";
defineOptions({
  name: 'online-sub-many',
  options: {
    styleIsolation: 'shared',
  },
})
// 接收 props
const props = defineProps({
  tableInfo: {
    type: Object,
    required: true,
    default: () => ({} as any)
  },
  dataInfo: {
    type: Array,
    required: false,
    default: () => ([])
  },
  disabled: {
    type: Boolean,
    default: false,
    required: false
  },
  edit: {
    type: Boolean,
    default: false,
    required: false
  },
  showFooter: {
    type: Boolean,
    required: false,
    default: true,
  }
})

// 定义 emits
const emits = defineEmits(['back', 'success'])
//提示
const toast = useToast()
//pop弹窗
const subFormPop = ref(null)
//表ID
const tableId = ref('')
//表描述
const tableTxt = ref('')
//表名称
const tableName = ref('')
//列信息
const columns = ref([])
//表单配置信息
const formSchema = ref([])
//弹窗显示
const popupShow = ref(false)
//数据列表
const dataList = ref([])
//数据列表
const editIndex = ref(null)
//列信息
const columnsInfo = ref({})
/**
 *
 * @param item
 * @returns {*|boolean}
 */
const componentDisabled = computed(()=>{
  console.log("一对多many组件",props.disabled)
  console.log("一对多many组件",props.showFooter)
  if (props.disabled === true || !props.showFooter) {
    return true
  }
  return false
})
//监听配置修改
watchEffect(()=>{
  props.tableInfo && loadTableInfo(props.tableInfo)
})
/**
 * 根据配置动态加载表单
 * @param dataID
 */
function loadTableInfo(tableInfo: any){
  console.log('===子表many加载表单数据 schema===', tableInfo)
  formSchema.value = deepClone(tableInfo)
  tableId.value = tableInfo.id;
  tableName.value = tableInfo.key;
  tableTxt.value = tableInfo.describe;
  columns.value = tableInfo?.columns || [];
  http
    .get(`/online/cgform/api/getColumns/${tableId.value}`)
    .then((res: any) => {
      if (res.success) {
        if (res.result?.columns?.length) {
          columnsInfo.value = res.result;
        }
      }
    })
  let hasAction = columns.value.some(item=>item.key == 'action');
  !hasAction && columns.value.unshift({title:'操作', key:'action'});
  console.log("根据配置动态加载表单columns.value ",columns.value );
  if (props.edit === true) {
    initFormData(props.dataInfo)
  }
}

/**
 * 删除
 * @param row
 * @param index
 */
function handleDel({index}){
  if(componentDisabled.value){
    return;
  }
  uni.showModal({
    title: '提示',
    content: '确定要删除吗？',
    cancelText: '取消',
    confirmText: '确定',
    success: (res) => {
      if (res.confirm) {
        dataList.value.splice(index,1);
        toast.success('删除成功')
      }
    },
    fail: (err) => {
      console.log(err)
    },
  })
}

/**
 * 新增
 */
function handleAdd(){
  popupShow.value = true;
  nextTick(()=>{
    subFormPop.value.beforeOpen(null,false)
  })
}
/**
 * 编辑
 * @param row
 * @param index
 */
function handleEdit({row,index}){
  if(!componentDisabled.value){
    editIndex.value = index;
    popupShow.value = true;
    nextTick(()=>{
      subFormPop.value.beforeOpen(row,true)
    })
  }
}
/**
 * 关闭弹窗
 * @param row
 * @param index
 */
function handleClose(){
  popupShow.value = false;
}
/**
 * 表单内容修改
 * @param row
 * @param index
 */
function handleChange(record,isUpdate){
  if(isUpdate){
    dataList.value[unref(editIndex)] = record;
  }else{
    dataList.value.push(record);
  }
}

/**
 * 提交前处理
 */
function beforeSubmit(){
  console.log("一对多beforeSubmit",dataList.value);
  return {status:true,data:dataList.value}
}
/**
 * 初始化表单数据
 */
function initFormData(data) {
  if (data && data.length>0)
  dataList.value = deepClone(data)
}
defineExpose({
  beforeSubmit,
  initFormData
})
</script>

<style lang="scss" scoped>
.online-sub-many-container {
  min-height: 300px;
  .custom-action{
    display: flex;
  }
  :deep(.add) {
   margin: 10px;
  }
}
</style>
