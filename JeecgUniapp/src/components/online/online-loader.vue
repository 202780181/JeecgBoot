<template>
  <view class="onlineLoader-container">
    <scroll-view class="scrollArea" scroll-y>
      <view class="form-container">
        <view class="load-area" v-if="loaded">
          <wd-skeleton v-for="item in 5" :key="item" :custom-style="{ marginTop: '20px' }" animation="gradient" theme="paragraph" />
        </view>
        <wd-form ref="form" :model="formData" >
          <wd-cell-group border>
            <view
              v-for="(item, index) in rootProperties"
              :key="index"
              :class="{ 'mt-14px': index % 2 == 0 }"
            >
              <!-- 图片 -->
              <wd-cell
                v-if="item.type == 'image'"
                :name="item.key"
                :title="get4Label(item.label)"
                :title-width="labelWidth"
                :required="fieldRequired(item)"
              >
                <online-image
                  v-model:value="formData[item.key]"
                  :name="item.key"
                  :disabled="componentDisabled(item)"
                  :key="index"
                  :maxNum="getFieldExtendJson(item, 'uploadnum')"
                ></online-image>
              </wd-cell>

              <!-- 文件 -->
              <wd-cell
                v-else-if="item.type == 'file'"
                :name="item.key"
                :title="get4Label(item.label)"
                :title-width="labelWidth"
                :required="fieldRequired(item)"
                center
              >
                <view style="text-align: left">
                  <!-- #ifndef APP-PLUS -->
                  <online-file
                    v-model:value="formData[item.key]"
                    :name="item.key"
                    :disabled="componentDisabled(item)"
                    :key="index"
                    :maxNum="getFieldExtendJson(item, 'uploadnum')"
                  ></online-file>
                  <!-- #endif -->

                  <!-- #ifdef APP-PLUS -->
                  <online-file-custom
                    v-model:value="formData[item.key]"
                    :name="item.key"
                    :disabled="componentDisabled(item)"
                    :key="index"
                    :maxNum="getFieldExtendJson(item, 'uploadnum')"
                  ></online-file-custom>
                  <!-- #endif -->
                </view>
              </wd-cell>

              <!-- 日期时间 -->
              <DateTime
                v-else-if="item.type === 'datetime'"
                :label="get4Label(item.label)"
                :labelWidth="labelWidth"
                startTime="1949-01-01 00:00:00"
                endTime="2050-01-01 00:00:00"
                :type="item.type"
                :name="item.key"
                format="YYYY-MM-DD HH:mm:ss"
                :disabled="componentDisabled(item)"
                v-model="formData[item.key]"
                :required="fieldRequired(item)"
              ></DateTime>

              <!-- 时间 -->
              <DateTime
                v-else-if="item.type === 'time'"
                :label="get4Label(item.label)"
                :labelWidth="labelWidth"
                format="HH:mm:ss"
                :type="item.type"
                :name="item.key"
                :disabled="componentDisabled(item)"
                v-model="formData[item.key]"
                :required="fieldRequired(item)"
              ></DateTime>

              <!-- 日期 -->
              <online-date
                v-else-if="item.type === 'date'"
                :label="get4Label(item.label)"
                :labelWidth="labelWidth"
                :name="item.key"
                :type="getDateExtendType(item.formSchema)"
                :disabled="componentDisabled(item)"
                v-model:value="formData[item.key]"
                :required="fieldRequired(item)"
              ></online-date>

              <!-- 时间 -->
              <online-time
                v-else-if="item.type === 'time'"
                :label="get4Label(item.label)"
                :labelWidth="labelWidth"
                :name="item.key"
                :disabled="componentDisabled(item)"
                v-model:value="formData[item.key]"
                :required="fieldRequired(item)"
              ></online-time>

              <!-- 下拉选择 -->
              <online-select
                v-else-if="item.type === 'list' || item.type === 'sel_search'"
                :label="get4Label(item.label)"
                :labelWidth="labelWidth"
                :name="item.key"
                :type="item.type"
                :dict="item.listSource"
                :dictStr="item.dictStr"
                :disabled="componentDisabled(item)"
                v-model="formData[item.key]"
                :required="fieldRequired(item)"
              ></online-select>

              <!-- checkbox   -->
              <online-checkbox
                v-else-if="item.type === 'checkbox'"
                :name="item.key"
                :type="item.type"
                :label="get4Label(item.label)"
                :labelWidth="labelWidth"
                :dict="item.listSource"
                :disabled="componentDisabled(item)"
                :required="fieldRequired(item)"
                v-model="formData[item.key]"
              ></online-checkbox>

              <!-- radio  -->
              <online-radio
                v-else-if="item.type === 'radio'"
                :name="item.key"
                :label="get4Label(item.label)"
                :labelWidth="labelWidth"
                :type="item.type"
                :dict="item.listSource"
                :disabled="componentDisabled(item)"
                :required="fieldRequired(item)"
                v-model="formData[item.key]"
              ></online-radio>

              <!-- 下拉多选  -->
              <online-multi
                v-else-if="item.type === 'list_multi'"
                :label="get4Label(item.label)"
                :labelWidth="labelWidth"
                :name="item.key"
                :dict="item.listSource"
                :disabled="componentDisabled(item)"
                :required="fieldRequired(item)"
                v-model="formData[item.key]"
              ></online-multi>

              <!-- 省市区   -->
              <online-pca
                v-else-if="item.type === 'pca'"
                :name="item.key"
                :label="get4Label(item.label)"
                :labelWidth="labelWidth"
                :disabled="componentDisabled(item)"
                :required="fieldRequired(item)"
                v-model:value="formData[item.key]"
              ></online-pca>

              <!-- 数字框 小数 -->
              <CustomInput
                v-else-if="
                  item.type === 'number' && (!item.onlyInteger || item.onlyInteger == false)
                "
                :label-width="labelWidth"
                v-model:value="formData[item.key]"
                :label="get4Label(item.label)"
                :name="item.key"
                type="digit"
                inputMode="decimal"
                :disabled="componentDisabled(item)"
                :placeholder="item.placeholder"
                :rules="item.rules"
              />

              <!-- 数字框 整数 -->
              <CustomInput
                v-else-if="item.type === 'number' && item.onlyInteger === true"
                :label-width="labelWidth"
                :label="get4Label(item.label)"
                :name="item.key"
                v-model:value="formData[item.key]"
                type="number"
                inputMode="numeric"
                :disabled="componentDisabled(item)"
                :placeholder="item.placeholder"
                :rules="item.rules"
              />

              <!-- 开关 -->
              <wd-cell
                v-else-if="item.type == 'switch'"
                :name="item.key"
                :title="get4Label(item.label)"
                :title-width="labelWidth"
                center
                :required="fieldRequired(item)"
              >
                <view style="text-align: left">
                  <wd-switch
                    :label="get4Label(item.label)"
                    :name="item.key"
                    size="18px"
                    :disabled="componentDisabled(item)"
                    v-model="formData[item.key]"
                    :active-value="switchOpt(item.formSchema?.extendOption, 0)"
                    :inactive-value="switchOpt(item.formSchema?.extendOption, 1)"
                  />
                </view>
              </wd-cell>

              <!-- 多行文本 -->
              <wd-textarea
                v-else-if="['textarea', 'markdown', 'umeditor'].includes(item.type)"
                :label-width="labelWidth"
                :label="get4Label(item.label)"
                :name="item.key"
                v-model="formData[item.key]"
                clearable
                :maxlength="300"
                :disabled="componentDisabled(item)"
                :placeholder="item.placeholder"
                :rules="item.rules"
              />
              <!-- 密码输入框 -->
              <CustomInput
                v-else-if="item.type === 'password'"
                :label-width="labelWidth"
                v-model:value="formData[item.key]"
                :disabled="componentDisabled(item)"
                :label="get4Label(item.label)"
                :name="item.key"
                :placeholder="item.placeholder"
                :rules="item.rules"
                show-password
              />
              <!-- popup字典 -->
              <PopupDict
                v-else-if="item.type === 'popup_dict'"
                :label-width="labelWidth"
                :label="get4Label(item.label)"
                :disabled="componentDisabled(item)"
                :required="fieldRequired(item)"
                v-model="formData[item.key]"
                :multi="item.formSchema.popupMulti"
                :dictCode="`${item.formSchema.code},${item.formSchema['destFields']},${item.formSchema['orgFields']}`"
              ></PopupDict>
              <!-- popup -->
              <Popup
                v-else-if="item.type === 'popup'"
                :label-width="labelWidth"
                :label="get4Label(item.label)"
                :disabled="componentDisabled(item)"
                :required="fieldRequired(item)"
                v-model="formData[item.key]"
                :multi="item.formSchema.popupMulti"
                :code="`${item.formSchema.code}`"
                :setFieldsValue="setFieldsValue"
                :fieldConfig="getPopupFieldConfig(item)"
              ></Popup>
              <!-- 关联记录 -->
              <online-popup-link-record
                v-else-if="item.type === 'link_table'"
                :label-width="labelWidth"
                :label="get4Label(item.label)"
                :name="item.key"
                v-model:formSchema="item.formSchema"
                :disabled="componentDisabled(item)"
                :required="fieldRequired(item)"
                v-model:value="formData[item.key]"
                @selected="linkRecordChange"
              ></online-popup-link-record>
              <!-- 他表字段 -->
              <wd-input
                v-else-if="item.type === 'link_table_field'"
                :label-width="labelWidth"
                v-model="formData[item.key]"
                :disabled="true"
                :label="get4Label(item.label)"
                :name="item.key"
              />
              <!-- 用户选择   -->
              <select-user
                v-else-if="item.type === 'sel_user'"
                :label-width="labelWidth"
                :name="item.key"
                :label="get4Label(item.label)"
                :disabled="componentDisabled(item)"
                :required="fieldRequired(item)"
                v-model="formData[item.key]"
              ></select-user>

              <!-- 部门选择   -->
              <select-dept
                v-else-if="item.type === 'sel_depart'"
                :label-width="labelWidth"
                :name="item.key"
                :label="get4Label(item.label)"
                labelKey="departName"
                :disabled="componentDisabled(item)"
                :required="fieldRequired(item)"
                v-model="formData[item.key]"
              ></select-dept>
              <!-- 分类字典树 -->
              <CategorySelect
                v-else-if="item.type === 'cat_tree'"
                :label-width="labelWidth"
                :label="get4Label(item.label)"
                :disabled="componentDisabled(item)"
                :required="fieldRequired(item)"
                v-model="formData[item.key]"
                :pid="`${item.formSchema.pidValue}`"
              ></CategorySelect>
              <!-- 自定义树 -->
              <TreeSelect
                v-else-if="item.type === 'sel_tree'"
                :label-width="labelWidth"
                :label="get4Label(item.label)"
                :disabled="componentDisabled(item)"
                :required="fieldRequired(item)"
                v-model="formData[item.key]"
                :dict="`${item.formSchema.dict}`"
                :pidField="`${item.formSchema.pidField}`"
                :pidValue="`${item.formSchema.pidValue}`"
                :hasChildField="`${item.formSchema.hasChildField}`"
              ></TreeSelect>
              <!-- 普通输入框 -->
              <CustomInput
                v-else-if="item.type !== 'hidden'"
                :label-width="labelWidth"
                v-model:value="formData[item.key]"
                :disabled="componentDisabled(item)"
                :label="get4Label(item.label)"
                :name="item.key"
                :placeholder="item.placeholder"
                :rules="item.rules"
                clearable
              />
            </view>
          </wd-cell-group>
        </wd-form>
        <wd-tabs v-if="!single && subTable && subTable.length>0" custom-class="mt-14px" animated :slidable-num="3" autoLineWidth>
          <block v-for="root in subTable" :key="root.key">
            <wd-tab :title="root.describe">
              <template v-if="root.relationType == 1">
                <online-sub-one
                  :ref="
                    (el) => {
                      if (el) dyRefs[root.key] = el
                    }
                  "
                  :tableInfo="root"
                  :dataInfo="formData[root.key]"
                  :edit="edit"
                  :disabled="disabled"
                  :showFooter="showFooter"
                ></online-sub-one>
              </template>
              <template v-if="root.relationType == 0">
                <online-sub-many
                  :ref="
                    (el) => {
                      if (el) dyRefs[root.key] = el
                    }
                  "
                  :tableInfo="root"
                  :dataInfo="formData[root.key]"
                  :edit="edit"
                  :disabled="disabled"
                  :showFooter="showFooter"
                ></online-sub-many>
              </template>
            </wd-tab>
          </block>
        </wd-tabs>
      </view>
    </scroll-view>
    <view class="footer" v-if="showFooter">
      <wd-button :disabled="loading" block :loading="loading" @click="formSubmit">提交</wd-button>
    </view>
  </view>
  <wd-toast></wd-toast>
</template>

<script lang="ts" setup>
import FormProperty from './FormProperty'
import OnlineImage from '@/components/online/view/online-image.vue'
import OnlineFile from '@/components/online/view/online-file.vue'
import OnlineFileCustom from '@/components/online/view/online-file-custom.vue'
import OnlineSelect from '@/components/online/view/online-select.vue'
import OnlineTime from '@/components/online/view/online-time.vue'
import OnlineDatetime from '@/components/online/view/online-datetime.vue'
import OnlineDate from '@/components/online/view/online-date.vue'
import OnlineRadio from '@/components/online/view/online-radio.vue'
import OnlineCheckbox from '@/components/online/view/online-checkbox.vue'
import OnlineMulti from '@/components/online/view/online-multi.vue'
import CustomInput from '@/components/online/view/CustomInput.vue'
import OnlinePca from './view/online-pca.vue'
import OnlinePopupLinkRecord from '@/components/online/view/online-popup-link-record.vue'
import SelectDept from '@/components/SelectDept/SelectDept.vue'
import SelectUser from '@/components/SelectUser/SelectUser.vue'
import OnlineSubOne from './online-sub-one.vue'
import OnlineSubMany from './online-sub-many.vue'
import { loadOneFieldDefVal } from './defaultVal'
import { useToast } from 'wot-design-uni'
import { http } from '@/utils/http'
import { deepClone } from 'wot-design-uni/components/common/util'
import { isArray, isNumber, isString } from '@/utils/is'
import { formatDate } from '@/common/uitls'
import { duplicateCheck } from '@/service/api'
import { isMp } from '@/utils/platform';
defineOptions({
  name: 'online-loader',
  options: {
    // apply-shared‌：当前页面样式会影响到子组件样式.(小程序)
    // shared‌：当前页面样式影响到子组件，子组件样式也会影响到当前页面.(小程序)
    styleIsolation: 'shared',
  },
})
// 接收 props
const props = defineProps({
  showHeader: {
    type: Boolean,
    required: false,
    default: false,
  },
  table: {
    type: String,
    default: '',
    required: false,
  },
  taskId: {
    type: String,
    default: '',
    required: false,
  },
  showFooter: {
    type: Boolean,
    required: false,
    default: true,
  },
  edit: {
    type: Boolean,
    default: false,
    required: false,
  },
  flowEdit: {
    type: Boolean,
    default: false,
    required: false,
  },
  dataId: {
    type: String,
    default: '',
    required: false,
  },
  title: {
    type: String,
    default: '',
    required: false,
  },
  disabled: {
    type: Boolean,
    default: false,
    required: false,
  },
  onlyBackData: {
    type: Boolean,
    default: false,
    required: false,
  },
})

// 定义 emits
const emits = defineEmits(['back', 'success', 'formSuccess'])
const toast = useToast()
// 定义响应式数据
const onlinekey = ref(1)
//刷新状态
const reFresh = ref(false)
//请求地址
const url = ref({
  load: '/online/cgform/api/getFormItemBytbname/',
  optPre: '/online/cgform/api/form/',
})
// 表单ID
const code = ref('')
//表类型，1：单表，2：一对多
const single = ref(false)
//是否树表
const treeForm = ref(false)
//表描述
const tableTxt = ref('')
//表名称
const tableName = ref('')
//表名称
const tableType = ref(1)
//表数据Data
const formData = ref<any>({ name: '' })
//是否填值规则字段
const hasFillRuleFields = ref('')
//是否必填字段
const hasRequiredFields = ref([])
//字段属性
const rootProperties = ref<any>([])
//加载状态
const loading = ref(false);
//初始化加载状态
const loaded = ref(false);
//表单数据ID
const formDataId = ref('')
//------------------子表begin-----------------
const subTable = ref([])
// 使用对象存储动态 ref
const dyRefs = ref({})
//------------------子表end-------------------
uni.showLoading({ title: '正在加载中...' })
// 导航标题
const navTitle = computed(() => {
  if (!props.title || props.title.length === 0) {
    return tableTxt.value
  } else {
    return props.title
  }
})
// 标题宽度
const labelWidth = computed(() => {
  return '100px'
})
// 导航标题
const get4Label = computed(() => {
  return (lable) => {
    return `${lable && lable.length > 4 ? lable.substring(0, 4) : lable}：`
  }
})

onMounted(() => {
  console.log('开始渲染online表单')
})

/**
 * 获取日期控件的扩展类型
 * @param formSchema
 * @returns {string}
 */
const getDateExtendType = (formSchema: any) => {
  if (formSchema.fieldExtendJson) {
    let fieldExtendJson = JSON.parse(formSchema.fieldExtendJson)
    let mapField = {
      month: 'year-month',
      year: 'year',
      quarter: 'quarter',
      week: 'week',
      day: 'date',
    }
    return fieldExtendJson?.picker && mapField[fieldExtendJson?.picker]
      ? mapField[fieldExtendJson?.picker]
      : 'date'
  }
  return 'date'
}
/**
 * 判断是否选中
 * @param opts
 * @param value
 * @returns {boolean|boolean}
 */
const isChecked = (opts: any, value: any) => {
  return opts && opts.length > 0 ? value === opts[0] : false
}
/**
 * 开关选项
 * @param opts
 * @param value
 * @returns {boolean|boolean}
 */
const switchOpt = (opts: any, index: any) => {
  const options = Array.isArray(opts) && opts.length > 0 ? opts : ['Y', 'N']
  return options[index] + ''
}
/**
 *
 * @param item
 * @returns {*|boolean}
 */
const componentDisabled = (item: any) => {
  if (props.disabled === true || (!props.showFooter && !props.onlyBackData)) {
    return true
  }
  return item.disabled
}

/**
 * 判断字段是否必填
 * @param item
 * @returns {boolean}
 */
const fieldRequired = (item: any) => {
  return item?.key && hasRequiredFields.value.includes(item.key)
}
/**
 * 关联记录同步修改他表字段
 * @param linkRecord
 * @param key
 */
const linkRecordChange = (linkRecord, key) => {
  let linkFieldArr = rootProperties.value.filter(
    (item) => item.type === 'link_table_field' && item?.formSchema?.dictTable == key,
  )
  linkFieldArr.forEach((field) => {
    let value = linkRecord.map((record) => record[field.formSchema.dictText]).join(',')
    nextTick(() => {
      formData.value[field.key] = value
    })
  })
}
/**
 * 返回按钮点击事件
 */
const backRoute = () => {
  emits('back')
}

/**
 * 不是子表key
 * @param key
 */
function notSubKey(key: string) {
  let flag = true
  if (!single.value && subTable.value.length > 0) {
    flag = subTable.value.every((item) => item.key == key)
  }
  return flag
}

/**
 * 省市区获取最后一位
 * @param value
 */
function pcaValue(value) {
  if (value.includes(',')) {
    const parts = value.split(',')
    if (parts.length >= 3) {
      // 如果包含至少两个逗号，截取第三部分并去掉最后一位
      return parts[2]
    }
  }
  // 如果不包含逗号或不符合条件，返回原值
  return value
}
/**
 * 处理多选字段
 * @param value
 */
function handleMultiOrDateField() {
  let finalData = deepClone(formData.value)
  //日期字段
  let dateFieldArr = rootProperties.value.filter(
    (item) => item.type === 'date' || item.type === 'datetime',
  )
  //省市区字段
  let pcaArr = rootProperties.value.filter((item) => item.type === 'pca')
  finalData = Object.keys(finalData).reduce((acc, key) => {
    let value = finalData[key]
    //省市区获取最后一位
    if (value && pcaArr.length > 0 && pcaArr.map((item) => item.key).includes(key)) {
      value = isArray(value) ? value[2] : pcaValue(value)
    }
    //是数组的就转换成字符串
    if (value && isArray(value) && notSubKey(key)) {
      value = value.join(',')
    }
    //时间戳类型的日期转具体格式字符串
    if (dateFieldArr.length > 0) {
      const dateField = dateFieldArr.find((obj) => obj.key === key)
      if (dateField) {
        value =
          value && isNumber(value)
            ? formatDate(
                value,
                dateField.type === 'datetime' ? 'yyyy-MM-dd HH:mm:ss' : 'yyyy-MM-dd',
              )
            : value
      }
    }
    acc[key] = value
    return acc
  }, {})
  return finalData
}

/**
 * 表单提交事件
 * @param e
 */
async function formSubmit() {
  console.log('表单提交事件', formData.value)
  // 判断字段必填和正则
  if (await fieldCheck(formData.value)) {
    return
  }
  // 处理特殊字段
  let finalData = await handleMultiOrDateField()
  //主子表的增加子表的校验和数据拉取
  if (!single.value && subTable.value.length) {
    let subPassFlag = true
    // 使用 Promise.all 处理所有异步操作
    const promises = subTable.value.map(async (sub) => {
      if (dyRefs.value[sub.key]) {
        // 假设 beforeSubmit 是异步方法
        let subData = await dyRefs.value[sub.key].beforeSubmit()
        console.log('subData', subData)
        if (!subData.status) {
          subPassFlag = subData.status
        }
        finalData[sub.key] = subData.data
      }
    })

    // 等待所有异步操作完成
    await Promise.all(promises)
    // 这里会等所有异步操作完成后再执行
    if (!subPassFlag) {
      return
    }
  }
  console.log('最终的表单finalData', finalData)
  // 判断是否只返回数据
  if (props.onlyBackData) {
    emits('success', finalData)
    return
  }
  if (props.flowEdit === true) {
    // 原代码未实现该逻辑，可按需补充
  } else if (props.edit === true) {
    //表单编辑
    await handleEdit(finalData)
  } else {
    //表单新增
    await handleSave(finalData)
  }
}
/**
 * 校验字段
 * @param values
 * @returns {boolean}
 */
async function fieldCheck(values: any) {
  // 校验字段
  let flag = false
  // 校验提示
  const tip = (msg) => {
    // 提示校验未通过
    toast.warning(msg)
    flag = true
  }
  for (const item of rootProperties.value) {
    // 校验必填
    if (fieldRequired(item) && !values[item.key]) {
      tip(`${item.label}不能为空！`)
      break
    }
    // 校验正则
    let pattern = item?.formSchema?.pattern
    if (pattern) {
      if (pattern == 'only') {
        const res: any = await duplicateCheck({
          tableName: tableName.value,
          fieldName: item.key,
          fieldVal: values[item.key],
          dataId: formDataId.value,
        })
        if (!res.success) {
          tip(`${item.label} ${res.message}`)
          break
        }
      } else {
        const regex = new RegExp(pattern)
        if (values[item.key] && !regex.test(values[item.key])) {
          let errorInfo = item?.formSchema?.errorInfo || '格式不正确!'
          tip(`${item.label}${errorInfo}`)
          break
        }
      }
    }
  }
  return flag
}
/**
 * 新增保存
 */
const handleSave = (finalData: any) => {
  if (finalData?.bpm_status) {
    finalData.bpm_status = '1'
  }
  console.log('===onlineForm表单组件走新增保存  handleSave===', finalData)
  loading.value = true
  http
    .post(`${url.value.optPre}${code.value}?tabletype=${tableType.value}`, finalData)
    .then((res: any) => {
      if (res.success) {
        emits('success', res.result)
      } else {
        toast.warning(res.message)
        loading.value = false
      }
    })
    .catch((err) => {
      loading.value = false
    })
}
/**
 * 编辑保存
 */
const handleEdit = (finalData: any) => {
  loading.value = true
  http
    .put(`${url.value.optPre}${code.value}?tabletype=${tableType.value}`, finalData)
    .then((res: any) => {
      loading.value = false
      if (res.success) {
        emits('success', formData.value.id)
      } else {
        toast.warning(res.message)
      }
    })
    .catch((err) => {
      loading.value = false
    })
}
/**
 * 根据表名加载表单数据
 * @param dataID
 */
const loadByTableName = (dataID: any, table?: string) => {
  formDataId.value = props.dataId
  loaded.value = true;
  // #ifdef MP-WEIXIN
  if (dataID && dataID.length > 0) {
    formDataId.value = dataID
  }
  // #endif
  let urlStr = url.value.load + (props.table || table)
  http.get(urlStr, { taskId: props.taskId }).then(async (res: any) => {
    if (res.success) {
      uni.hideLoading()
      console.log('===onlineForm加载表单数据 schema===', res.result.schema)
      let config = res.result
      code.value = config.head.id
      single.value = config.head.tableType === 1
      tableType.value = config.head.tableType
      await createRootProperties(config.schema)
      console.log('===createRootProperties结束结束结束===')
      treeForm.value = config.head.isTree === 'Y'
      tableTxt.value = config.head.tableTxt
      if (props.edit === true || props.flowEdit === true) {
        await loadFormData()
      } else {
        // 新增页面处理表单默认值
        await handleDefaultValue()
      }
    } else {
      // 假设 $tip 是全局方法，可按需修改
      toast.info(res.message)
    }
  })
}
/**
 * 创建根属性
 * @param formSchema
 */
const createRootProperties = async (formSchema: any) => {
  console.log('===createRootProperties开始===')
  tableName.value = formSchema.table
  formData.value = {}
  hasFillRuleFields.value = formSchema.hasFillRuleFields
  hasRequiredFields.value = formSchema?.required ?? []
  const properties = formSchema.properties
  let rootProps = [],
    subInfo = []
  Object.keys(properties).map((key) => {
    if (key) {
      const item = properties[key]
      //TODO 配置主子表的
      if (item.view === 'tab') {
        subInfo.push({ ...item, isLoad: false })
      } else {
        formData.value[key] = ''
        if (key != 'bpm_status') {
          let fp = FormProperty(key, item, formSchema.required)
          rootProps.push(fp)
        }
      }
    }
  })
  rootProps.sort((one, next) => {
    return one.formSchema.order - next.formSchema.order
  })
  rootProperties.value = [...rootProps]
  console.log('--rootProperties--', rootProps)
  //子表的配置信息
  if (subInfo.length > 0) {
    console.log('--subInfo--', subInfo)
    subTable.value = deepClone(subInfo).sort((a, b) => a.order - b.order)
  }
  nextTick(() => {
    reFresh.value = true
    onlinekey.value += 1
    loaded.value = false
  })
  emits('formSuccess', true)
}
/**
 * 获取字段类型
 * @param item
 * @returns {string}
 */
const getFieldNumberType = (item: any) => {
  return item.onlyInteger === true ? 'digit' : 'number'
}

/**
 * 初始化子表单信息
 */
async function initSubTableData() {
  // 使用 Promise.all 处理所有异步操作
  console.log('====初始化子表单信息======')
  if (isMp) {
    // 小程序需要延迟下，否则获取不到 dyRefs 示例上面的方法
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const promises = subTable.value.map(async (sub) => {
    if (dyRefs.value[sub.key] && !sub.isLoad) {
      await dyRefs.value[sub.key].initFormData(formData.value[sub.key])
    }
  })
  // 等待所有异步操作完成
  await Promise.all(promises)
}
/**
 * 获取表单数据
 */
const loadFormData = async () => {
  console.log('===loadFormData初始化数据开始===')
  let urlStr = url.value.optPre + code.value + '/' + formDataId.value
  urlStr = urlStr.replace(/"/g, '')
  const res: any = await http.get(urlStr)
  if (res.success) {
    formData.value = { ...res.result }
    if (single.value) {
      // 过滤单表的富文本和markdown标签
      for (const field in res.result) {
        const findItem = rootProperties.value.find((item) => item['key'] == field)
        if (findItem?.type === 'umeditor') {
          const result = filterUmeditor(res.result[field])
          formData.value[field] = result
        } else if (findItem?.type === 'markdown') {
          const result = filterMarkdown(res.result[field])
          formData.value[field] = result
        }
      }
    }
    if (!single.value && subTable.value.length) {
      await initSubTableData()
    }
    reFresh.value = false
    nextTick(() => {
      reFresh.value = true
      loaded.value = false
      onlinekey.value += 1
    })
  }
}
/**
 * 获取默认值
 */
function handleDefaultValue() {
  console.log('===onlineForm表单组件走默认值 handleDefaultValue===')
  rootProperties.value.forEach((item) => {
    let field = item.key
    let { defVal, type } = item.formSchema
    loadOneFieldDefVal(defVal, type, (value) => {
      formData.value[field] = value
    })
  })
}
const setFieldsValue = (data) => {
  formData.value = { ...formData.value, ...data }
}
const getPopupFieldConfig = (item) => {
  const { formSchema } = item
  const { destFields = '', orgFields = '' } = formSchema
  const result = orgFields.split(',').map((oField, index) => {
    return {
      source: oField,
      target: destFields.split(',')[index],
    }
  })
  return result
}
const getFieldExtendJson = (item, field) => {
  let json = item.formSchema.fieldExtendJson ?? '{}'
  if (isString(json) && json.trim().length === 0) {
    json = '{}'
  }
  json = JSON.parse(json)
  const result = json[field]
  return result
}
function filterMarkdown(md) {
  return (
    md
      // 移除标题（#、##、### 等）
      .replace(/^#{1,6}\s+/gm, '')
      // 移除代码块（```code``` 和缩进代码块）
      .replace(/`{3}[\s\S]*?`{3}/g, '')
      // 移除行内代码（`code`）
      .replace(/`([^`]+)`/g, '$1')
      // 移除图片（![alt](url)）
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
      // 移除链接（[text](url)）
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // 移除粗体（**text** 或 __text__）
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      // 移除斜体（*text* 或 _text_）
      .replace(/(\*|_)(.*?)\1/g, '$2')
      // 移除删除线（~~text~~）
      .replace(/~~(.*?)~~/g, '$1')
      // 移除引用块（> text）
      .replace(/^>\s+/gm, '')
      // 移除水平分割线（---、***）
      .replace(/^[-*]{3,}\s*$/gm, '')
      // 移除无序列表符号（*, -, +）
      .replace(/^[\s]*[-*+]\s+/gm, '')
      // 移除有序列表符号（1.、2.）
      .replace(/^[\s]*\d+\.\s+/gm, '')
      // 移除表格符号（| 和 ---）
      .replace(/(\|[-:\s]*)+\|/g, '')
      .replace(/[|-]{2,}/g, '')
      // 合并多余空行
      .replace(/\n{2,}/g, '\n\n')
      // 移除首尾空白
      .trim()
  )
}
const filterUmeditor = (richText) => {
  return richText.replace(/<[^>]+>/g, '')
}

defineExpose({
  navTitle,
  getDateExtendType,
  isChecked,
  componentDisabled,
  fieldRequired,
  backRoute,
  formSubmit,
  loadByTableName,
  getFieldNumberType,
})
</script>

<style lang="scss" scoped>
.onlineLoader-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  .form-container {
    .load-area{
      margin-top: 14px;
      background: #ffffff;
      height: 80vh;
      overflow: hidden;
    }
    :deep(.wd-cell-group__body) {
      background-color: #f1f1f1;
    }
    .onlineLoader-form {
      :deep(.wd-input__label-inner) {
        font-size: 16px;
      }
      :deep(.wd-picker__label) {
        font-size: 16px;
      }
      :deep(.wd-select-picker__label) {
        font-size: 16px;
      }
      :deep(.wd-cell__title) {
        font-size: 16px;
      }
      :deep(.wd-textarea__label-inner) {
        font-size: 16px;
      }
      :deep(.wd-input__label.is-required) {
        padding-left: 0px;
      }
      :deep(.wd-input__label.is-required::after) {
        left: -10px;
      }
      :deep(.wd-textarea__clear) {
        color: #bfbfbf;
      }
      :deep(.wd-select-picker__clear) {
        color: #bfbfbf;
      }
      :deep(.wd-input__clear) {
        color: #bfbfbf;
      }
      :deep(.wd-upload__close) {
        color: #bfbfbf;
      }
    }
  }
  .footer {
    width: 100%;
    padding: 10px 20px;
    padding-bottom: calc(constant(safe-area-inset-bottom) + 10px);
    padding-bottom: calc(env(safe-area-inset-bottom) + 10px);
  }
}
</style>
