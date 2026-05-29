<template>
  <view class="onlineTableCell">
    <!--图片-->
    <template v-if="column?.type === 'image'">
      <template v-if="record[column.key]">
        <wd-img
          width="30"
          height="30"
          :src="getFirstImg(record[column.key])"
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
    <template v-else-if="column?.type === 'file'">
      <template v-if="record[column.key]">
        <wd-button @click="handleDownload(record[column.key])">下载</wd-button>
      </template>
      <template v-else>
        <text>无文件</text>
      </template>
    </template>
    <template v-else-if="['markdown', 'umeditor'].includes(column?.type)">
        <rich-text :nodes="record[column.key]"></rich-text>
    </template>
    <template v-else-if="column?.type === 'pca'">
      <text class="ellipsis-2">{{ getPcaText(record[column.key])}}</text>
    </template>
    <template v-else-if="['datetime', 'date'].includes(column?.type)">
      <text class="ellipsis-2">{{ getFormatDate(record[column.key], column) }}</text>
    </template>
    <template v-else>
      <text class="ellipsis-2">{{ renderVal(record, column)}}</text>
    </template>
  </view>
</template>

<script setup lang="ts">
import { getFormatDate, filterMultiDictText } from '@/common/uitls'
import { isString } from '@/utils/is'
import { getFileAccessHttpUrl } from '@/common/uitls'
import { getAreaTextByCode } from '@/common/areaData/Area'
defineOptions({
  name: 'OnlineSubTableCell',
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
console.log("根据配置动态加载表单record ",props.record );
const imgPreview = ref({
  show: false,
  urls: [],
})
// 下载
const handleDownload = (text) => {
  uni.downloadFile({
    url: text,
    success: (res) => {
      if (res.statusCode === 200) {
        console.log('下载成功')
        console.log(res);
      }
    },
  })
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
  const { type , key } = column
  let text = record[key]
  if (['date', 'Date'].includes(type)) {
    if (!text) {
      return ''
    }
    if (text.length > 10) {
      return text.substring(0, 10)
    }
    return text
  } else if (['popup_dict'].includes(type)) {
    const dict = record[key + '_dictText']
    if (dict != undefined) {
      return record[key + '_dictText']
    }
    return text
  }
  //字典值翻譯
  if(props.columnsInfo?.dictOptions && props.columnsInfo?.dictOptions[key]){
    return filterMultiDictText(props.columnsInfo.dictOptions[key], text + '')
  }
  return text
}
// 初始化
const init = () => {
  const field = props.column.dataIndex
  if (props.column?.customRender === 'imgSlot') {
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
