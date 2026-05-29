<template>
  <wd-popup position="bottom" v-model="show">
    <PageLayout
      :navTitle="navTitle"
      type="popup"
      navRightText="确定"
      @navRight="handleConfirm"
      @navBack="handleCancel"
    >
      <view class="wrap">
        <z-paging
          ref="paging"
          :fixed="false"
          v-model="dataList"
          @query="queryList"
          :default-page-size="15"
        >
          <!--        <template #top>-->
          <!--          <wd-search-->
          <!--            hide-cancel-->
          <!--            :placeholder="search.placeholder"-->
          <!--            v-model="search.keyword"-->
          <!--            @search="handleSearch"-->
          <!--            @clear="handleClear"-->
          <!--          />-->
          <!--        </template>-->
          <template v-if="multi">
            <wd-checkbox-group shape="square" v-model="checkedValue">
              <template v-for="(item, index) in dataList" :key="index">
                <view class="list" @click="hanldeCheck(index, item)">
                  <view class="left text-gray-5">
                    <view class="cu-avatar lg mr-4" v-if="imageField" :style="[{ backgroundImage: 'url(' + getImage(item[imageField] )+ ')' }]"></view>
                    <view class="field-content">
                      <template v-for="(cItem, cIndex) in columns" :key="cIndex">
                        <view class="row">
                          <text class="label">{{ cItem.title }}：</text>
                          <text class="value">{{ item[cItem.dataIndex] }}</text>
                        </view>
                      </template>
                    </view>
                  </view>
                  <view class="right" @click.stop>
                    <wd-checkbox ref="checkboxRef" :modelValue="item.id"></wd-checkbox>
                  </view>
                </view>
              </template>
            </wd-checkbox-group>
          </template>
          <template v-else>
            <wd-radio-group shape="dot" v-model="checkedValue">
              <template v-for="(item, index) in dataList" :key="index">
                <wd-cell>
                  <view class="list" @click="hanldeCheck(index, item)">
                    <view class="left text-gray-5">
                      <view
                        class="cu-avatar lg mr-4"
                        v-if="imageField && item[imageField]"
                        :style="[{ backgroundImage: 'url(' + item[imageField] + ')' }]"
                      ></view>
                      <view class="field-content">
                        <template v-for="(cItem, cIndex) in columns" :key="cIndex">
                          <view class="row">
                            <text class="label">{{ cItem.title }}：</text>
                            <text class="value">{{ item[cItem.dataIndex] }}</text>
                          </view>
                        </template>
                      </view>
                    </view>
                    <view class="right" @click.stop>
                      <wd-radio :value="item.id"></wd-radio>
                    </view>
                  </view>
                </wd-cell>
              </template>
            </wd-radio-group>
          </template>
        </z-paging>
      </view>
    </PageLayout>
  </wd-popup>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useToast, useMessage, useNotify, dayjs } from 'wot-design-uni'
import { http } from '@/utils/http'
import { isArray, isString } from '@/utils/is'
import { getFileAccessHttpUrl } from '@/common/uitls'

defineOptions({
  name: 'popupReportModal',
  options: {
    styleIsolation: 'shared',
  },
})
const props = defineProps({
  selected: {
    type: String,
    default: '',
  },
  dictTable: {
    type: String,
    required: true,
  },
  dictCode: {
    type: String,
    required: true,
  },
  dictText: {
    type: String,
    required: true,
  },
  multi: {
    type: Boolean,
    required: false,
  },
  imageField: {
    type: String,
    required: false,
  },
})
const emit = defineEmits(['change', 'close'])
const toast = useToast()
const show = ref(true)
const api = {
  getColumns: '/online/cgform/api/getColumns',
  getData: '/online/cgform/api/getData',
}
console.log('props:::', props)
const navTitle = ref('')
const paging = ref(null)
const dataList = ref([])
// 报表id
let rpConfigId = null
let loadedColumns = false
const columns = ref([])
const selectArr = ref([])
const checkedValue: any = ref(props.multi ? [] : '')
const checkboxRef = ref(null)
const search = reactive({
  keyword: '',
  placeholder: '',
  field: '',
})

const handleClose = () => {
  setTimeout(() => {
    emit('close')
  }, 400)
}

const beforeOpen = (arr) => {
  selectArr.value = arr || []
}
const handleConfirm = () => {
  if (checkedValue.value.length == 0) {
    toast.warning('还没选择~')
    return
  }
  const result = []
  let value = checkedValue.value
  if (!Array.isArray(checkedValue.value)) {
    value = [checkedValue.value]
  }
  value.forEach((id, index) => {
    const findIndex = dataList.value.findIndex((item) => item.id === id)
    result.push(dataList.value[findIndex])
  })
  show.value = false
  emit('change', result)
  handleClose()
}
const handleCancel = () => {
  show.value = false
  handleClose()
  console.log('取消了~')
}
// 搜索
function handleSearch() {
  paging.value.reload()
}
// 图片
function getImage(src) {
  return src?src:'';
}
// 清除搜索条件
function handleClear() {
  search.keyword = ''
  handleSearch()
}
const hanldeCheck = (index, item) => {
  if (props.multi) {
    if (Array.isArray(checkboxRef.value)) {
      checkboxRef.value[index].toggle()
    }
  } else {
    checkedValue.value = item.id
  }
}

const getRpColumns = () => {
  return new Promise<void>((resolve, reject) => {
    if (loadedColumns) {
      resolve()
    } else {
      let linkTableSelectFields = props.dictCode + ',' + props.dictText
      http
        .get(`${api.getColumns}/${props.dictTable}?linkTableSelectFields=${linkTableSelectFields}`)
        .then((res: any) => {
          if (res.success) {
            loadedColumns = true
            const { result } = res
            navTitle.value = result.description
            rpConfigId = result.code
            result.columns?.forEach((item) => {
              if (linkTableSelectFields.includes(item.dataIndex)) {
                columns.value.push(item)
              }
            })
            resolve()
          } else {
            reject()
          }
        })
        .catch((err) => {
          reject()
        })
    }
  })
}

const queryList = (pageNo, pageSize) => {
  const pararms = { pageNo, pageSize, linkTableSelectFields: '' }
  if (search.keyword) {
    pararms[search.field] = `*${search.keyword}*`
  }
  getRpColumns()
    .then(() => {
      let linkTableSelectFields = props.dictCode + ',' + props.dictText
      if (props.imageField) {
        linkTableSelectFields = linkTableSelectFields + ',' + props.imageField
      }
      pararms.linkTableSelectFields = linkTableSelectFields
      http
        .get(`${api.getData}/${props.dictTable}`, pararms)
        .then((res: any) => {
          if (res.success && res.result.records) {
            let dataRecords = res.result.records
            if (dataRecords && dataRecords.length > 0) {
              let id = dataRecords[0]['id']
              for (let item of dataRecords) {
                if (!id) {
                  item.id = new Date().getTime()
                }
                if (props.imageField && item[props.imageField]) {
                  let imgUrlArr = item[props.imageField].split(',')
                  item[props.imageField] =
                    imgUrlArr.length > 0 ? getFileAccessHttpUrl(imgUrlArr[0]) : ''
                }
              }
            }
            //TODO
            if (selectArr.value && isArray(selectArr) && selectArr.length > 0) {
              //checkedValue.value = [...selectArr]
            }
            paging.value.complete(dataRecords ?? [])
          } else {
            paging.value.complete(false)
          }
        })
        .catch((err) => {})
    })
    .catch((err) => {})
}
const init = () => {
  if (props.selected.length) {
    if (props.multi) {
      if (isArray(props.selected)) {
        checkedValue.value = props.selected
      } else if (isString(props.selected)) {
        checkedValue.value = props.selected.split(',')
      }
    } else {
      if (isString(props.selected)) {
        checkedValue.value = props.selected
      } else if (isArray(props.selected)) {
        // @ts-ignore
        checkedValue.value = props.selected.join(',')
      }
    }
  }
}
init()
defineExpose({
  beforeOpen,
})
</script>

<style lang="scss" scoped>
.wrap {
  height: 100%;
  .mr-4 {
    margin-right: 10px;
  }
}
:deep(.wd-cell) {
  --wot-color-white: tranparent;
  --wot-cell-padding: 0;
  .wd-cell__wrapper {
    --wot-cell-wrapper-padding: 0;
  }
  .wd-cell__left {
    display: none;
  }
}
:deep(.wd-checkbox-group) {
  --wot-checkbox-bg: tranparent;
}
:deep(.wd-radio-group) {
  --wot-radio-bg: tranparent;
}
.list {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  padding: 16px;
  margin-top: 16px;
  .left {
    display: flex;
    justify-content: center;
    align-items: center;
    .field-content {
      .row {
        display: flex;
      }
    }
  }
  .right {
    :deep(.wd-checkbox) {
      margin-bottom: 0;
    }
  }
}
</style>
