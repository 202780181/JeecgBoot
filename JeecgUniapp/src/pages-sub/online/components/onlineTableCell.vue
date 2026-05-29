<template>
  <view class="onlineTableCell">
    <!--图片-->
    <template v-if="column?.scopedSlots?.customRender === 'imgSlot'">
      <template v-if="record[column.dataIndex]">
        <wd-img
          width="30"
          height="30"
          :src="getFirstImg(record[column.dataIndex])"
          @click="handleClickImg"
        ></wd-img>
        <ImgPreview
          v-if="imgPreview.show"
          :urls="imgPreview.urls"
          @close="() => (imgPreview.show = false)"
        ></ImgPreview>
      </template>
      <template v-else>
        <text>无图片</text>
      </template>
    </template>
    <!--下载-->
    <template v-else-if="column?.scopedSlots?.customRender === 'fileSlot'">
      <template v-if="record[column.dataIndex]">
        <wd-button @click.stop="handleDownload(record[column.dataIndex])">下载</wd-button>
      </template>
      <template v-else>
        <text>无文件</text>
      </template>
    </template>
    <template v-else-if="column?.scopedSlots?.customRender === 'htmlSlot'">
      <!-- 增加富文本控件配置href跳转 -->
      <template v-if="column.fieldHref">
        <text class="ellipsis-2">暂不支持</text>
      </template>
      <template v-else>
        <rich-text :nodes="record[column.dataIndex]"></rich-text>
      </template>
    </template>
    <template v-else-if="column?.scopedSlots?.customRender === 'pcaSlot'">
      <text class="ellipsis-2">
        {{
          getPcaText(record[column.dataIndex]) ||
          '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'
        }}
      </text>
    </template>
    <template v-else-if="column?.scopedSlots?.customRender === 'dateSlot'">
      <text class="ellipsis-2">
        {{
          getFormatDate(record[column.dataIndex], column) ||
          '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'
        }}
      </text>
    </template>
    <template v-else>
      <text class="ellipsis-2">
        {{
          renderVal(record, column) ||
          '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'
        }}
      </text>
    </template>
  </view>
</template>

<script setup lang="ts">
import { getFormatDate, filterMultiDictText } from '../utils/index'
import { isString } from '@/utils/is'
import { getFileAccessHttpUrl } from '@/common/uitls'
import { getAreaTextByCode } from '@/common/areaData/Area'
import { downloadFile } from '@/common/uitls';
defineOptions({
  name: 'onlineTableCell',
  options: {
    styleIsolation: 'shared',
  },
})
const props = defineProps({
  columnsInfo: {
    type: Object,
    default: () => {},
  },
  column: {
    type: Object,
    default: () => {},
  },
  record: {
    type: Object,
    default: () => {},
  },
})
const imgPreview = ref({
  show: false,
  urls: [],
})
// 下载
const handleDownload = (text) => {
  downloadFile(text)
}
// 省市区
const getPcaText = (code) => {
  if (!code) {
    return ''
  }
  return getAreaTextByCode(code)
}
// 列表只显示第一张图
const getFirstImg = (text) => {
  if (isString(text)) {
    var imgs = text.split(',')
    return getFileAccessHttpUrl(imgs[0])
  } else {
    return ''
  }
}
// 点击图时
const handleClickImg = () => {
  imgPreview.value.show = true
}
// 渲染值
const renderVal = (record, column) => {
  const { customRender, hrefSlotName, dataIndex, fieldType } = column
  let text = record[dataIndex]
  if (['date', 'Date'].includes(column['fieldType'])) {
    // online报表中类型配置为日期（yyyy-MM-dd ），但是实际展示为日期时间格式(yyyy-MM-dd HH:mm:ss)
    if (!text) {
      return ''
    }
    if (text.length > 10) {
      return text.substring(0, 10)
    }
    return text
  } else if (fieldType == 'link_table') {
    const dict = record[dataIndex + '_dictText']
    if (dict != undefined) {
      return record[dataIndex + '_dictText']
    }
    return text
  } else if (['popup_dict'].includes(column['fieldType'])) {
    const dict = record[dataIndex + '_dictText']
    if (dict != undefined) {
      return record[dataIndex + '_dictText']
    }
    return text
  } else if (customRender) {
    // 字典
    let dictCode = customRender as string
    let replaceFlag = '_replace_text_'
    let value = text
    // 如果 dictCode 有值，就进行字典转换
    if (dictCode) {
      if (dictCode.startsWith(replaceFlag)) {
        let textFieldName = dictCode.replace(replaceFlag, '')
        value = record[textFieldName]
      } else {
        value = filterMultiDictText(unref(props.columnsInfo.dictOptions)[dictCode], text + '')
      }
    }
    // 扩展参数设置列的内容长度
    if (column.showLength) {
      if (value && value.length > column.showLength) {
        value = value.substr(0, column.showLength) + '...'
      }
    }
    return value
  } else {
    return text
  }
}
// 初始化
const init = () => {
  const field = props.column.dataIndex
  if (props.column?.scopedSlots?.customRender === 'imgSlot') {
    const text = props.record[field]
    if (isString(text)) {
      imgPreview.value.urls = text.split(',').map((item) => getFileAccessHttpUrl(item))
    } else {
      return ''
    }
  }
}
init()
</script>

<style lang="scss" scoped>
:deep(.wd-button) {
  --wot-button-medium-height: 30px;
  --wot-button-medium-fs: 12px;
  --wot-button-medium-padding: 8px;
  &.is-medium.is-round {
    min-width: 80px;
  }
}
</style>
