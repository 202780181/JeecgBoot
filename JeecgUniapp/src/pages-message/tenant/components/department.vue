<template>
  <view class="wrap">
    <view class="content">
      <scroll-view class="scrollArea" scroll-y>
        <template v-if="dataSource.length">
          <template v-for="(item, index) in dataSource">
            <wd-cell border clickable @click="handleClick(item)">
              <template #icon>
                <wd-img
                  customClass="mr2"
                  :radius="getRadius(item)"
                  :width="30"
                  :height="30"
                  :src="getImg(item)"
                ></wd-img>
              </template>
              <template #title>
                <view class="content text-gray-4">
                  <text>{{ getName(item) }}</text>
                </view>
              </template>
            </wd-cell>
          </template>
        </template>
        <template v-else>
          <wd-status-tip image="content" tip="暂无内容" />
        </template>
      </scroll-view>
    </view>
  </view>
  <wd-toast />
</template>

<script lang="ts" setup>
import { onLaunch, onShow, onHide, onLoad, onReady } from '@dcloudio/uni-app'
import { nextTick, onMounted, ref } from 'vue'
import { useUserStore } from '@/store/user'
import { http } from '@/utils/http'
import { useToast, useMessage, useNotify, dayjs } from 'wot-design-uni'
import { useRouter } from '@/plugin/uni-mini-router'
import { useParamsStore } from '@/store/page-params'
import defaultAvatar from '@/static/default-avatar.png'
import folderImg from '@/static/folder.png'

const router = useRouter()
const userStore = useUserStore()
const toast = useToast()
const props = defineProps(['tenantId'])
const dataSource: any = ref([])
const paramsStore = useParamsStore()
const api = {
  depTree: '/sys/sysDepart/queryBookDepTreeSync',
  list: '/sys/user/list',
}
const getImg = (item) => {
  if (item.parentId != null) {
    return folderImg
  } else {
    return item.avatar
  }
}
const getName = (item) => {
  if (item.parentId != null) {
    return item.departName
  } else {
    return item.realname
  }
}
const getRadius = (item) => {
  return item.parentId != null ? null : '50%'
}

const handleClick = (item) => {
  if (item.parentId != null) {
    query({ id: item.id })
  } else {
    paramsStore.setPageParams('personPage', { data: item })
    router.push({ name: 'personPage' })
  }
}
const query = (params: any = {}) => {
  const pararms = { pid: params.id ?? '', departId: params.id, tenantId: props.tenantId }
  Promise.all([
    http.get(api.depTree, pararms),
    pararms.pid
      ? http.get(api.list, pararms)
      : Promise.resolve({ success: true, result: { records: [] } }),
  ])
    .then((res: any) => {
      if (res[0].success == true && res[1].success == true) {
        const result = res[0]?.result ?? []
        const records = res[1]?.result?.records ?? []
        const data = [...result, ...records]
        if (params.id) {
          // 证明是点击
          if (data.length) {
            dataSource.value = data
          } else {
            toast.warning('下一级无数据~')
          }
        } else {
          dataSource.value = data
        }
      }
    })
    .catch((res) => {})
}
query()
</script>

<style lang="scss" scoped>
:deep(.wd-cell) {
  .wd-cell__right {
    display: none;
  }
}
</style>
