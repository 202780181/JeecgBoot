<template>
  <wd-popup position="bottom" v-model="show">
    <PageLayout
      :navTitle="navTitle"
      type="popup"
      navRightText="确定"
      @navRight="handleConfirm"
      @navBack="handleCancel"
    >
      <scroll-view scroll-y class="wrap">
        <wd-form ref="form" :model="formData">
          <wd-cell-group class="mb-14px" border>
            <view
              class="onlineLoader-form"
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
                ></online-image>
              </wd-cell>

              <!-- 文件 -->
              <wd-cell
                v-else-if="item.type == 'file'"
                :name="item.key"
                :title="get4Label(item.label)"
                :title-width="labelWidth"
                :required="fieldRequired(item)"
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
              <!-- 开关 -->
              <wd-cell
                v-else-if="['switch', 'checkbox'].includes(item.type)"
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
                :dict="item.options"
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
                :dict="item.options"
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
                :dict="item.options"
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
                :dict="item.options"
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
              <wd-input
                v-else-if="
                  item.type === 'number' && (!item.onlyInteger || item.onlyInteger == false)
                "
                :label-width="labelWidth"
                v-model="formData[item.key]"
                :label="get4Label(item.label)"
                :name="item.key"
                inputMode="decimal"
                :disabled="componentDisabled(item)"
                :placeholder="item.placeholder"
                :rules="item.validateRules"
              />

              <!-- 数字框 整数 -->
              <wd-input
                v-else-if="item.type === 'number' && item.onlyInteger === true"
                :label-width="labelWidth"
                :label="get4Label(item.label)"
                :name="item.key"
                v-model="formData[item.key]"
                inputMode="numeric"
                :disabled="componentDisabled(item)"
                :placeholder="item.placeholder"
                :rules="item.validateRules"
              />

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
                :rules="item.validateRules"
              />
              <!-- 密码输入框 -->
              <wd-input
                v-else-if="item.type === 'password'"
                :label-width="labelWidth"
                v-model="formData[item.key]"
                :disabled="componentDisabled(item)"
                :label="get4Label(item.label)"
                :name="item.key"
                :placeholder="item.placeholder"
                :rules="item.validateRules"
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
                :multi="!!item.formSchema?.popupMulti"
                :code="`${item.formSchema.popupCode}`"
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
              <wd-input
                v-else-if="item.type !== 'hidden'"
                :label-width="labelWidth"
                v-model="formData[item.key]"
                :disabled="componentDisabled(item)"
                :label="get4Label(item.label)"
                :name="item.key"
                :placeholder="item.placeholder"
                :rules="item.validateRules"
                clearable
              />
            </view>
          </wd-cell-group>
        </wd-form>
      </scroll-view>
    </PageLayout>
  </wd-popup>
  <wd-toast></wd-toast>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useToast } from 'wot-design-uni'
import OnlineCheckbox from '@/components/online/view/online-checkbox.vue'
import OnlineMulti from '@/components/online/view/online-multi.vue'
import SelectUser from '@/components/SelectUser/SelectUser.vue'
import OnlinePopupLinkRecord from '@/components/online/view/online-popup-link-record.vue'
import OnlineSelect from '@/components/online/view/online-select.vue'
import OnlineDate from '@/components/online/view/online-date.vue'
import OnlineTime from '@/components/online/view/online-time.vue'
import OnlineRadio from '@/components/online/view/online-radio.vue'
import SelectDept from '@/components/SelectDept/SelectDept.vue'
import OnlineImage from '@/components/online/view/online-image.vue'
import OnlineFile from '@/components/online/view/online-file.vue'
import OnlineFileCustom from '@/components/online/view/online-file-custom.vue'
import OnlinePca from '../view/online-pca.vue'
import { loadOneFieldDefVal } from '../defaultVal'
import { isArray, isNumber, isString } from '@/utils/is'
import { formatDate } from '@/common/uitls'
import { deepClone } from 'wot-design-uni/components/common/util'
import { duplicateCheck } from '@/service/api'
import { isObject } from '@/common/is'
defineOptions({
  name: 'OnlineSubformPopup',
  options: {
    styleIsolation: 'shared',
  },
})
const props = defineProps({
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
  schema: {
    type: Object,
    default: () => ({}) as any,
    required: true,
  },
})
const emit = defineEmits(['change', 'close'])
const toast = useToast()
const show = ref(true)
//表数据Data
const formData = ref<any>({})
//是否填值规则字段
const hasFillRuleFields = ref([])
//是否必填字段
const hasRequiredFields = ref([])
//字段属性
const rootProperties = ref<any>([])
//表描述
const tableTxt = ref('')
//表名
const tableName = ref('')
//数据Id
const dataId = ref('')
//是否已加载
const loaded = ref(false)
//是否编辑
const isUpdate = ref(false)
//临时数据
const tempData = ref({})
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
// 导航标题
const navTitle = computed(() => {
  if (!props.title || props.title.length === 0) {
    return tableTxt.value
  } else {
    return props.title
  }
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
  if (props.disabled === true) {
    return true
  }
  return item.disabled
}
/**
 * 获取扩展字段
 * @param item
 * @param field
 */
const getFieldExtendJson = (item, field) => {
  let json = item.formSchema.fieldExtendJson ?? '{}'
  if (isString(json) && json.trim().length === 0) {
    json = '{}'
  }
  json = JSON.parse(json)
  const result = json[field]
  return result
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
  console.log('linkRecordChange****》》》》', linkRecordChange)
  linkFieldArr.forEach((field) => {
    let value = linkRecord.map((record) => record[field.formSchema.dictText]).join(',')
    nextTick(() => {
      formData.value[field.key] = value
    })
  })
}
/**
 * 校验字段
 * @param values
 * @returns {boolean}
 */
const fieldCheck = async (values: any) => {
  // 校验字段
  let flag = false
  console.log('一对多子表rootProperties.value', rootProperties.value)
  console.log('一对多子表values', values)
  for (const item of rootProperties.value) {
    // 校验提示
    const tip = (msg) => {
      // 提示校验未通过
      toast.warning(`${msg}`)
      flag = true
    }
    // 校验必填
    if (fieldRequired(item) && !values[item.key]) {
      tip(`${item.label}不能为空！`)
      break
    }
    // 校验正则
    let pattern = item?.formSchema?.pattern || item?.pattern
    if (pattern) {
      //可能存在是一个对象的情况，把正则表达式赋值一下
      if (isObject(pattern)) {
        pattern = pattern?.pattern
      }
      if (pattern == 'only') {
        const res: any = await duplicateCheck({
          tableName: tableName.value,
          fieldName: item.key,
          fieldVal: values[item.key],
          dataId: dataId.value,
        })
        if (!res.success) {
          tip(`${item.label} ${res.message}`)
          break
        }
      } else {
        const regex = compilePattern(pattern)
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
    if (value && isArray(value)) {
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
//打开弹窗前
function beforeOpen(row, edit) {
  isUpdate.value = edit
  tempData.value = row
  formData.value = { ...row }
}
/**
 * 关闭
 */
const handleClose = () => {
  setTimeout(() => {
    emit('close')
  }, 400)
}
/**
 * 提交
 */
const handleConfirm = async () => {
  // 判断字段必填和正则
  if (await fieldCheck(formData.value)) {
    return
  }
  // 处理特殊字段
  let finalData = await handleMultiOrDateField()
  emit('change', finalData, isUpdate.value)
  //关闭弹窗
  handleClose()
}
/**
 * 取消
 */
const handleCancel = () => {
  show.value = false
  loaded.value = false
  handleClose()
  console.log('取消了~')
}
/**
 * 设置pop组件数值
 * @param data
 */
const setFieldsValue = (data) => {
  formData.value = { ...formData.value, ...data }
}
/**
 * popup组件配置
 * @param item
 */
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
//监听配置变化
watchEffect(() => {
  props.schema && !loaded.value && loadTableInfo(props.schema)
})
/**
 * 初始化表单数据
 */
function initFormData(row) {
  dataId.value = row?.id
  formData.value = deepClone(row)
}
/**
 * 根据配置动态加载表单
 * @param dataID
 */
function loadTableInfo(formSchema: any) {
  console.log('===子表many加载表单数据 schema===', formSchema)
  createRootProperties(formSchema)
  tableTxt.value = formSchema?.describe
  if (isUpdate.value) {
    initFormData(tempData.value)
  } else {
    // 新增页面处理表单默认值
    handleDefaultValue()
  }
  loaded.value = true
}
/**
 * 创建根属性
 * @param formSchema
 */
function createRootProperties(formSchema: any) {
  console.log('===子表配置项 formSchema===', formSchema)
  formData.value = {}
  hasRequiredFields.value = []
  hasFillRuleFields.value = formSchema?.hasFillRuleFields ?? []
  tableName.value = formSchema.key
  const properties = formSchema.columns
  let rootProps = []
  properties.forEach((item) => {
    if (item?.key && item?.key != 'action') {
      formData.value[item?.key] = ''
      let patternInfo = null
      if (item?.validateRules && item?.validateRules.length > 0) {
        //字段是否必填
        let isRequired = item?.validateRules.some((valid) => valid?.required)
        isRequired && hasRequiredFields.value.push(item.key)
        //正则校验其他配置信息
        patternInfo = item?.validateRules.find((valid) => valid.pattern)
        if (patternInfo && patternInfo?.pattern && patternInfo.pattern == '*') {
          hasRequiredFields.value.push(item.key)
        }
      }
      rootProps.push({
        ...item,
        type: item?.view || item.type,
        label: item.title,
        pattern: patternInfo,
        formSchema: { ...item, pattern: patternInfo?.pattern, errorInfo: patternInfo?.message },
      })
    }
  })
  rootProperties.value = [...rootProps]
  console.log('--子表 rootProperties--', rootProps)
}
/**
 * 获取默认值
 */
function handleDefaultValue() {
  rootProperties.value.forEach((item) => {
    let field = item.key
    let { defaultValue, type, fieldDefaultValue } = item.formSchema
    let defVal = defaultValue || fieldDefaultValue
    loadOneFieldDefVal(defVal, type, (value) => {
      formData.value[field] = value
    })
  })
}
/**
 * 根据规则表将 value 转换为对应的正则表达式
 * @param {string} value 输入的值（如 "n6-16", "s6-18", "*6-16", "url", "e" 等）
 * @returns {RegExp} 返回对应的正则表达式
 */
function compilePattern(value) {
  let builtIn = patternArr.some((item) => item.value == value)
  if (!builtIn) {
    return new RegExp(value)
  }
  // 数字类型（n）
  if (value.startsWith('n')) {
    const rangeMatch = value.match(/^n(\d+)-(\d+)$/)
    if (rangeMatch) {
      const min = rangeMatch[1]
      const max = rangeMatch[2]
      return new RegExp(`^\\d{${min},${max}}$`)
    }
    return /^\d+$/ // 默认：纯数字
  }

  // 字母类型（s）
  if (value.startsWith('s')) {
    const rangeMatch = value.match(/^s(\d+)-(\d+)$/)
    if (rangeMatch) {
      const min = rangeMatch[1]
      const max = rangeMatch[2]
      return new RegExp(`^[a-zA-Z]{${min},${max}}$`)
    }
    return /^[a-zA-Z]+$/ // 默认：纯字母
  }

  // 任意字符（*）
  if (value.startsWith('*')) {
    if (value === '*') return /^.+$/ // 非空
    const rangeMatch = value.match(/^\*(\d+)-(\d+)$/)
    if (rangeMatch) {
      const min = rangeMatch[1]
      const max = rangeMatch[2]
      return new RegExp(`^.{${min},${max}}$`)
    }
  }

  // 其他预定义规则
  const predefinedPatterns = {
    url: /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i,
    e: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    m: /^1[3-9]\d{9}$/,
    p: /^[1-9]\d{5}$/,
    z: /^-?\d+$/,
    money: /^-?\d+(\.\d{1,2})?$/,
  }

  return predefinedPatterns[value] || new RegExp(`^${escapeRegExp(value)}$`)
}

// 辅助函数：转义正则特殊字符
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const patternArr = [
  { label: '6到16位数字', value: 'n6-16' },
  { label: '6到18位字母', value: 's6-18' },
  { label: '6到16位任意字符', value: '*6-16' },
  { label: '网址', value: 'url' },
  { label: '电子邮件', value: 'e' },
  { label: '手机号码', value: 'm' },
  { label: '邮政编码', value: 'p' },
  { label: '字母', value: 's' },
  { label: '数字', value: 'n' },
  { label: '整数', value: 'z' },
  { label: '非空', value: '*' },
  { label: '金额', value: 'money' },
]

defineExpose({
  beforeOpen,
})
</script>

<style lang="scss" scoped></style>
