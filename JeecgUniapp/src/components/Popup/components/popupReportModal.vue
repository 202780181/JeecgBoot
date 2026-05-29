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
          <template #top>
            <wd-search
              hide-cancel
              :placeholder="search.placeholder"
              v-model="search.keyword"
              @search="handleSearch"
              @clear="handleClear"
            />
          </template>
          <template v-if="multi">
            <wd-checkbox-group shape="square" v-model="checkedValue">
              <template v-for="(item, index) in dataList" :key="index">
                <view class="list" @click="hanldeCheck(index)">
                  <view class="left text-gray-5">
                    <template v-for="(cItem, cIndex) in columns" :key="cIndex">
                      <view class="row">
                        <text class="label">{{ cItem.title }}：</text>
                        <text class="value">{{ item[cItem.dataIndex] }}</text>
                      </view>
                    </template>
                  </view>
                  <view class="right" @click.stop>
                    <wd-checkbox ref="checkboxRef" :modelValue="index"></wd-checkbox>
                  </view>
                </view>
              </template>
            </wd-checkbox-group>
          </template>
          <template v-else>
            <wd-radio-group shape="dot" v-model="checkedValue">
              <template v-for="(item, index) in dataList" :key="index">
                <wd-cell>
                  <view class="list" @click="hanldeCheck(index)">
                    <view class="left text-gray-5">
                      <template v-for="(cItem, cIndex) in columns" :key="cIndex">
                        <view class="row">
                          <text class="label">{{ cItem.title }}：</text>
                          <text class="value">{{ item[cItem.dataIndex] }}</text>
                        </view>
                      </template>
                    </view>
                    <view class="right" @click.stop>
                      <wd-radio :value="index"></wd-radio>
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
import { isArray } from '@/utils/is'
defineOptions({
  name: 'popupReportModal',
  options: {
    styleIsolation: 'shared',
  },
})
const props = defineProps({
  code: {
    type: String,
    default: '',
    required: true,
  },
  showFiled: {
    type: String,
    default: '',
    required: true,
  },
  multi: {
    type: Boolean,
    default: true,
  },
})
const emit = defineEmits(['change', 'close'])
const toast = useToast()
const show = ref(true)
const api = {
  getColumns: '/online/cgreport/api/getRpColumns',
  getData: '/online/cgreport/api/getData',
  getQueryInfo: '/online/cgreport/api/getQueryInfo',
}
console.log('props:::', props)
const navTitle = ref('')
const paging = ref(null)
const dataList = ref([])
// 报表id
let rpConfigId = null
let loadedColumns = false
const dictOptions = ref([])
const columns = ref([])
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
  value.forEach((index) => {
    result.push(dataList.value[index])
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
// 清除搜索条件
function handleClear() {
  search.keyword = ''
  handleSearch()
}
const hanldeCheck = (index) => {
  if (props.multi) {
    if (Array.isArray(checkboxRef.value)) {
      checkboxRef.value[index].toggle()
    }
  } else {
    checkedValue.value = index
  }
}
const getQueryInfo = () => {
  const analysis = (data = []) => {
    if (data.length) {
      search.placeholder = `请输入${data[0].label}`
      search.field = data[0].field
    } else {
      const item = columns[0] ?? {}
      search.placeholder = `请输入${item.title}`
      search.field = item.dataIndex
    }
  }
  http
    .get(`${api.getQueryInfo}/${rpConfigId}`)
    .then((res: any) => {
      if (res.success) {
        analysis(res.result)
      } else {
        analysis()
      }
    })
    .catch((err) => {
      analysis()
    })
}
const getRpColumns = () => {
  return new Promise<void>((resolve, reject) => {
    if (loadedColumns) {
      resolve()
    } else {
      http
        .get(`${api.getColumns}/${props.code}`)
        .then((res: any) => {
          if (res.success) {
            loadedColumns = true
            const { result } = res
            navTitle.value = result.cgRpConfigName
            dictOptions.value = result.dictOptions
            rpConfigId = result.cgRpConfigId
            const fileds = props.showFiled.split(',')[0]
            result.columns?.forEach((item) => {
              if (fileds.includes(item.dataIndex)) {
                columns.value.push(item)
              }
            })
            // 最少展示三个字段（字段够多时）
            const minNum = 3
            if (columns.value.length < minNum) {
              result.columns?.forEach((item) => {
                const findItem = columns.value.find((o) => o.dataIndex == item.dataIndex);
                if (!findItem) {
                  if (columns.value.length < minNum) {
                    columns.value.push(item)
                  }
                }
              })
            }
            getQueryInfo()
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
  const pararms = { pageNo, pageSize }
  if (search.keyword) {
    pararms[search.field] = `*${search.keyword}*`
  }
  getRpColumns()
    .then(() => {
      http
        .get(`${api.getData}/${rpConfigId}`, pararms)
        .then((res: any) => {
          if (res.success && res.result.records) {
            paging.value.complete(res.result.records ?? [])
          } else {
            paging.value.complete(false)
          }
        })
        .catch((err) => {})
    })
    .catch((err) => {})
}
</script>

<style lang="scss" scoped>
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
  line-height: 1.8;
  padding: 16px;
  margin-top: 16px;
  .left {
    display: flex;
    justify-content: center;
    flex-direction: column;
    .row {
      display: flex;
    }
  }
  .right {
    :deep(.wd-checkbox) {
      margin-bottom: 0;
    }
  }
}
.wrap {
  height: 100%;
}
</style>
