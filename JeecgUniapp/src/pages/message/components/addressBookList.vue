<template>
  <z-paging ref="paging" :fixed="false" v-model="dataList" @query="queryList">
    <view class="list" v-for="(item, index) in dataList" :key="index" @click="handleGo(item)">
      <view :class="['avatar', item.color]">
        <text :class="[`cuIcon-${item.icon}`]"></text>
      </view>
      <text class="content color-gray-4 text-ellipsis">{{ item.name }}</text>
    </view>
  </z-paging>
  <wd-toast />
</template>

<script setup lang="ts">
import { onLaunch, onShow, onHide, onLoad, onReady } from '@dcloudio/uni-app'
import { hasRoute, cache } from '@/common/uitls'
import { isArray } from '@/common/is'
import { TENANT_LIST } from '@/common/constants'
import { http } from '@/utils/http'
import { useToast, useMessage, useNotify, dayjs } from 'wot-design-uni'
import { useRouter } from '@/plugin/uni-mini-router'

const toast = useToast()
const router = useRouter()
const paging = ref(null)
const dataList = ref([])
const dataSource = [
  {
    name: '联系人',
    icon: 'addressbook',
    type: 'friend',
    color: 'blue',
    path: 'contacts',
    value: '1',
  },
  { name: '我的群组', icon: 'group', color: 'azure-green', path: 'myGroup', value: '2' },
  { name: '更多功能', icon: 'moreandroid', color: 'orange', path: 'moreFunction', value: '3' },
]
const queryList = () => {
  http
    .get('/sys/tenant/getCurrentUserTenant')
    .then((res: any) => {
      if (res.success) {
        let list = isArray(res?.result?.list) ? res?.result?.list : []
        let result = list.map((item) => {
          return {
            label: item.name,
            name: item.name,
            value: item.id,
            key: item.id,
            color: '',
            icon: 'list',
            path: 'tenant',
          }
        })
        result = [...dataSource, ...result]
        paging.value.complete(result)
        cache(TENANT_LIST, list)
      } else {
        paging.value.complete(false)
      }
    })
    .catch((res) => {
      paging.value.complete(false)
    })
}
const handleGo = (item) => {
  if (!hasRoute({ name: item.path })) {
    toast.warning('还未开发~')
    return
  }
  router.push({
    name: item.path,
    params: {
      id: item.value,
      title: item.name,
    },
  })
}
</script>

<style lang="scss" scoped>
.list {
  display: flex;
  align-items: center;
  padding: 10px 15px;
  border-bottom: 1px solid rgba(229, 229, 229, 0.5);
  .avatar {
    width: 45px;
    height: 45px;
    border-radius: 50%;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    margin-right: 10px;
    background-color: #617f89;
    flex: none;
    &.blue {
      background-color: #0081ff;
    }
    &.azure-green {
      background-color: #02bbd5;
    }
    &.orange {
      background-color: #f37b1d;
    }
  }
  .content {
    font-size: 15px;
  }
}
:deep(.zp-empty-view) {
  display: none;
}
</style>
