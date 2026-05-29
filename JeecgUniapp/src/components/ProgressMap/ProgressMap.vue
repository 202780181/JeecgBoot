<template>
  <view class="ProgressMap">
    <view v-if="title.length" class="title">{{ title }}</view>
    <view
      :class="{
        stepBox: true,
        active: item.activeStep,
        'u-iconfont': true,
        'u-icon-clock': !item.activeStep,
        'u-icon-success': item.activeStep,
      }"
      v-for="(item, index) in dataSource"
      :key="index"
    >
      <view :class="{ stepContent: true, active: item.activeStep }">
        <template v-for="(inItem, inIndex) in item.data" :key="inIndex">
          <view v-if="inItem.label" class="item">
            {{ inItem.label }}
          </view>
        </template>
      </view>
      <view v-if="item.file" class="file">
        <template v-for="(file, inIndex) in item.file" :key="inIndex">
          <view :data-url="file.filePath" class="item" @click="handClick(file)">
            <view class="u-iconfont u-icon-link"></view>
            <view class="text ellipsis">{{ file.fileName }}</view>
          </view>
        </template>
      </view>
    </view>
    <ImgPreview
      v-if="imgPreview.show"
      :urls="imgPreview.urls"
      @close="() => (imgPreview.show = false)"
    ></ImgPreview>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { downloadFile } from '@/common/uitls'
import { getFileAccessHttpUrl } from '@/common/uitls'

const props: any = defineProps({
  title: {
    type: String,
    default: '',
  },
  dataSource: {
    type: Array,
    default: () => [{ activeStep: false, data: [] }],
  },
})
const imgPreview = reactive({
  show: false,
  urls: [],
})
const handClick = (file) => {
  const suffix = file.filePath.split('.').pop()
  if (['gif', 'png', 'jpg', 'jpeg'].includes(suffix)) {
    imgPreview.urls = [getFileAccessHttpUrl(file.filePath)]
    imgPreview.show = true
  } else {
    downloadFile(file.filePath)
  }
}
</script>

<style lang="scss" scoped>
.ProgressMap {
  background-color: #fff;
}
.title {
  padding: 20upx;
  font-weight: bold;
}
.stepBox {
  position: relative;
  line-height: 1;
  padding: 32upx 32upx 32upx 120upx;
  color: #aaaaaa;
  &.active {
    color: #39b54a;
  }
  &::before {
    position: absolute;
    left: 38upx;
    background-color: #fff;
    z-index: 9;
    top: 50upx;
    border-radius: 50%;
    margin: 8upx;
  }
  &::after {
    content: '';
    display: block;
    position: absolute;
    width: 0.5px;
    background-color: #ddd;
    left: 60upx;
    height: 100%;
    top: 0;
    z-index: 8;
  }
  .stepContent {
    padding: 10upx 50upx 10upx 30upx;
    border-radius: 8upx;
    background-color: #f0f0f0;
    color: #333333;
    font-size: 13px;
    line-height: 1.6;
    &.active {
      font-weight: 500;
      background-color: #39b54a;
      color: #fff;
      box-shadow: 0 0 5px #39b54a;
    }
  }
  .file {
    padding-top: 10px;
    .item {
      margin-bottom: 5px;
      display: flex;
      font-size: 14px;
      align-items: center;
      color: var(--color-blue);
      line-height: 1.2;
      .u-iconfont {
        font-size: 14px;
        margin-right: 5px;
        color: #666;
      }
    }
  }
}
</style>
