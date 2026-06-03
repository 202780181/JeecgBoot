<route lang="json5" type="page">
{
  layout: 'default',
  style: {
    navigationBarTitleText: '',
    navigationStyle: 'custom',
  },
}
</route>

<template>
  <scroll-view scroll-y class="selected-user-container solid-top">
    <view class="user-container">
      <template v-if="selectedUsers.length">
        <view class="user-item" v-for="item in selectedUsers" :key="item.id">
          <view class="user-item-avatar" @click="handledelUser(item)">
            <wd-img
              width="36px"
              height="36px"
              radius="50%"
              :src="getFileAccessHttpUrl(item.avatar)"
            ></wd-img>
            <view class="u-iconfont u-icon-close"></view>
          </view>
          <view class="user-item-name ellipsis">{{ item.realname }}</view>
        </view>
      </template>
      <template v-else>
        <view class="empty-data">
          <wd-status-tip image="content" tip="无选中用户" />
        </view>
      </template>
    </view>
  </scroll-view>
</template>

<script lang="ts" setup>
import { ref, reactive } from 'vue'
import { onShow, onHide, onLoad, onReady } from '@dcloudio/uni-app'
import { useMessage, useToast } from 'wot-design-uni'
import { useRouter } from '@/plugin/uni-mini-router'
import { useUserStore } from '@/store/user'
import { http } from '@/utils/http'
import { useParamsStore } from '@/store/page-params'
import { cache, getFileAccessHttpUrl } from '@/common/uitls'
defineOptions({
  name: 'User',
  options: {
    styleIsolation: 'shared',
  },
})
const props = defineProps(['selectedUsers'])
const emit = defineEmits(['del'])
const router = useRouter()
const paramsStore = useParamsStore()
const userStore = useUserStore()
const toast = useToast()
const message = useMessage()
// 删除用户
const handledelUser = (item: any) => {
  emit('del', item)
}
// 获取用户名的最后一个字符
const getLastCharacterOfName = (name: string): string => {
  if (!name) return ''
  return name.charAt(name.length - 1)
}
</script>

<style lang="scss" scoped>
//
.selected-user-container {
  height: 100%;
}
.user-container {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  align-content: flex-start;
  padding: 10px;
  min-height: 100%;
  .user-item {
    position: relative;
    display: flex;
    width: 20%;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin-bottom: 10px;
    .user-item-avatar {
      position: relative;
      background-color: #f5f5f5;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 5px;
    }
    .u-icon-close {
      position: absolute;
      top: -3px;
      right: -5px;
      border-radius: 50%;
    }
  }
  .empty-data {
    width: 100%;
    min-height: 100%;
    display: flex;
    align-items: center;
  }
}
</style>
