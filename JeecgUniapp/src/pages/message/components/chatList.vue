<template>
  <z-paging
    ref="paging"
    :fixed="false"
    v-model="dataList"
    @query="queryList"
    :default-page-size="100"
  >
    <uni-list>
      <template v-for="(item, index) in dataList" :key="index">
        <view
          :class="{ list: true, isTop: item.izTop == 1 }"
          @longpress.prevent="handleLongPress(item)"
          @click="handleGo(item)"
        >
          <template v-if="['systemNotice'].includes(item.type)">
            <view class="avatar">
              <text class="cuIcon-notice text-white"></text>
            </view>
          </template>
          <template v-if="['group'].includes(item.type) && !item.fromAvatar">
            <view class="group avatar">
              <text class="text-white">{{ getFirstStr(item.fromUserName) }}</text>
            </view>
          </template>
          <view class="listWrap" :class="curPlatform">
            <uni-list-chat
              avatarCircle
              clickable
              :title="item.fromUserName"
              :avatar="getAvatar(item)"
              :note="getChatType(item)"
              :time="beautifyTime(item.sendTime)"
              badge-positon="left"
              :badge-text="item.unreadNum"
              @click="handleGo(item)"
            ></uni-list-chat>
          </view>
        </view>
      </template>
    </uni-list>
  </z-paging>
  <BottomOperate
    v-if="bottomOperatePopup.show"
    v-bind="bottomOperatePopup"
    @close="() => (bottomOperatePopup.show = false)"
    @change="handleChange"
  ></BottomOperate>
  <wd-toast />
</template>

<script setup lang="ts">
import { onLaunch, onShow, onHide, onLoad, onReady } from '@dcloudio/uni-app'
import { http } from '@/utils/http'
import { useToast, useMessage, useNotify, dayjs } from 'wot-design-uni'
import { useRouter } from '@/plugin/uni-mini-router'
import { beautifyTime } from '@/common/uitls'
import { useParamsStore } from '@/store/page-params'
import { cache, getFileAccessHttpUrl, hasRoute } from '@/common/uitls'
import socket from '@/common/socket'
import { platform } from '@/utils/platform'
console.log('platform:::', platform)
defineOptions({
  name: 'chatList',
  options: {
    styleIsolation: 'shared',
  },
})
const toast = useToast()
const router = useRouter()
const paramsStore = useParamsStore()
const paging = ref(null)
const avatarList = ref()
const dataList = ref([])
const curPlatform = ref<string>(platform)
// #ifdef APP-IOS
curPlatform.value = 'ios'
// #endif
const options = [
  { key: 'backtop', icon: 'backtop', label: '置顶' },
  { key: 'cancelbacktop', icon: 'translate-bold', label: '取消置顶' },
  { key: 'delete', icon: 'delete', label: '删除', color: 'red' },
]
const bottomOperatePopup = reactive({
  show: false,
  title: '',
  data: {},
  options: [],
})

const queryList = () => {
  const data = [
    {
      id: 1,
      fromUserName: '廖秀兰',
      sendTime: '2018-12-08',
      type: 'discussion',
      izTop: 0,
      status: 'offline',
      msgFrom: 4000,
      msgTo: 100,
      fromAvatar: 'https://random.imagecdn.app/100/100',
    },
    {
      id: 2,
      fromUserName: '廖强',
      sendTime: '2018-12-08',
      type: 'discussion',
      izTop: 1,
      status: 'online',
      msgFrom: 4012,
      msgTo: 134,
      fromAvatar: 'https://q1.qlogo.cn/g?b=qq&nk=190848757&s=100',
    },
    {
      id: 3,
      fromUserName: '许强',
      sendTime: '2018-12-08',
      type: 'group',
      izTop: 0,
      status: 'online',
      msgFrom: 4024,
      msgTo: 168,
      fromAvatar: 'https://dummyimage.com/100x100/f37b1d/fff&text=%E7%8E%8B%E4%BA%94',
    },
    {
      id: 4,
      fromUserName: '孙静',
      sendTime: '2018-12-08',
      type: 'friend',
      izTop: 1,
      status: 'online',
      msgFrom: 4036,
      msgTo: 202,
      fromAvatar: 'https://random.imagecdn.app/100/100',
    },
    {
      id: 5,
      fromUserName: '白艳',
      sendTime: '2018-12-08',
      type: 'discussion',
      izTop: 0,
      status: 'offline',
      msgFrom: 4048,
      msgTo: 236,
      fromAvatar: 'https://picsum.photos/100/100',
    },
    {
      id: 6,
      fromUserName: '尹芳',
      sendTime: '2018-12-08',
      type: 'discussion',
      izTop: 0,
      status: 'offline',
      msgFrom: 4060,
      msgTo: 270,
      fromAvatar: 'https://q1.qlogo.cn/g?b=qq&nk=190848757&s=100',
    },
    {
      id: 7,
      fromUserName: '侯娜',
      sendTime: '2018-12-08',
      type: 'group',
      izTop: 0,
      status: 'offline',
      msgFrom: 4072,
      msgTo: 304,
      fromAvatar: 'https://q1.qlogo.cn/g?b=qq&nk=190848757&s=100',
    },
    {
      id: 8,
      fromUserName: '邹涛',
      sendTime: '2018-12-08',
      type: 'group',
      izTop: 0,
      status: 'offline',
      msgFrom: 4084,
      msgTo: 338,
      fromAvatar: 'https://dummyimage.com/100x100/59c7b8/fff&text=%E5%85%AD%E5%AD%90',
    },
    {
      id: 9,
      fromUserName: '吴洋',
      sendTime: '2018-12-08',
      type: 'discussion',
      izTop: 0,
      status: 'offline',
      msgFrom: 4096,
      msgTo: 372,
      fromAvatar: 'https://random.imagecdn.app/100/100',
    },
  ]
  paging.value.complete(data)
  nextTick(() => {
    setTimeout(() => {
      sortByIzTop(dataList.value)
      dataList.value = [...dataList.value]
    }, 10)
  })
}
const sortByIzTop = (arr) => {
  return arr.sort((a, b) => {
    if (a.izTop && !b.izTop) {
      return -1 // a 排在 b 前面
    } else if (!a.izTop && b.izTop) {
      return 1 // b 排在 a 前面
    } else {
      return 0 // 保持原有顺序
    }
  })
}
const getFirstStr = (val) => {
  return val ? val.substr(0, 1) : val
}
const getAvatar = (item) => {
  if (['systemNotice'].includes(item.type)) {
  } else if (['group'].includes(item.type)) {
  }
  return getFileAccessHttpUrl(item.fromAvatar) ?? ''
}
const getChatType = (item) => {
  switch (item.type) {
    case 'discussion':
      return '[聊天消息]'
    case 'systemNotice':
      return '[系统消息]'
    case 'friend':
      return item.status == 'offline' ? '[离线]' : '[在线]'
    case 'group':
      return '[群消息]'
    default:
      return ''
  }
}
const handleLongPress = (item) => {
  bottomOperatePopup.show = true
  bottomOperatePopup.title = item.fromUserName
  bottomOperatePopup.data = item
  bottomOperatePopup.options = options.filter((o) => {
    if (o.key == 'backtop' && item.izTop == 1) {
      return false
    } else if (o.key == 'cancelbacktop' && item.izTop == 0) {
      return false
    }
    return true
  })
}
const handleChange = ({ option, data }) => {
  if (['cancelbacktop', 'backtop'].includes(option.key)) {
    let izTop = 1
    if (option.key === 'cancelbacktop') {
      izTop = 0
    }
    http
      .post('/eoa/im/newApi/chatToTop', {
        id: data.id,
        izTop,
      })
      .then((res: any) => {
        if (res.success) {
          paging.value.reload()
        }
      })
  } else if (option.key === 'delete') {
    http
      .post('/eoa/im/newApi/removeChat', {
        id: data.id,
      })
      .then((res: any) => {
        if (res.success) {
          paging.value.reload()
        }
      })
  }
}
// 跳转
const handleGo = (item) => {
  if (['systemNotice'].includes(item.type)) {
    //1.系统消息
    router.push({ name: 'annotationList', params: { backRouteName: 'message' } })
  } else if (['friend'].includes(item.type)) {
    //2.聊天
    paramsStore.setPageParams('chat', { data: item })
    router.push({ name: 'chat' })
  } else {
    ///3.群组和讨论组
    // TODO
    paramsStore.setPageParams('chat', { data: item })
    router.push({ name: 'chat' })
  }
}
const onSocketOpen = () => {
  // console.log('启动webSocket')
  // socket.init('eoaNewChatSocket')
}
const onSocketReceive = () => {
  socket.acceptMessage = function (res) {
    if (['event_talk_revoke', 'event_chat_online'].includes(res.event)) {
      const findItem = dataList.value.find((item) => item.id === res.data.id)
      if (findItem) {
        Object.assign(findItem, { ...res.data })
      }
    } else if (['event_chat_talk'].includes(res.event)) {
      const findItem = dataList.value.find((item) => {
        if (item.type == 'friend') {
          return item.msgTo === res.data.msgFrom
        } else if (item.type == 'group') {
          return item.msgTo === res.data.msgTo
        } else if (item.type == 'discussion') {
          return item.msgTo === res.data.msgTo
        }
      })
      findItem.unreadNum = findItem.unreadNum ?? 0
      findItem.unreadNum++
      if (findItem.unreadNum > 99) {
        findItem.unreadNum = 99
      }
    } else if (['event_chat_add_list'].includes(res.event)) {
      // 把当前用户加入组或者聊天
      const findItem = dataList.value.find((item) => item.id === res.data.id)
      if (!findItem) {
        dataList.value.unshift(res.data)
      }
    } else if (['event_chat_delete_list'].includes(res.event)) {
      // 把当前用户删除群组或者聊天 或者当前用户所在群组或聊天被解散
      const findIndex = dataList.value.findIndex((item) => (item.msgTo = res.data.msgTo))
      if (findIndex != -1) {
        dataList.value.splice(findIndex, 1)
      }
    }
  }
}
onShow(() => {
  onSocketOpen()
  onSocketReceive()
})
onHide(() => {
  // socket?.closeSocket()
})
onMounted(() => {
  uni.$on('chatList:unreadClear', (chatItemData) => {
    const findItem = dataList.value.find((item) => item.id === chatItemData.id)
    if (findItem) {
      findItem.unreadNum = 0
    }
  })
  uni.$on('chatList:reload', () => {
    paging.value?.reload()
  })
})
onBeforeUnmount(() => {
  uni.$off('chatList:unreadClear')
  uni.$off('chatList:reload')
})
</script>

<style lang="scss" scoped>
.z-paging-content {
  background-color: #f1f1f1;
}
.list {
  &.isTop {
    :deep(.uni-list-chat) {
      background-color: #eee;
    }
  }
  position: relative;
  .avatar {
    &.group {
      background-color: #f37b1d;
      font-size: 18px;
    }
    position: absolute;
    top: 10px;
    left: 15px;
    background-color: #0081ff;
    font-size: 24px;
    width: 45px;
    height: 45px;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
  }
}
.listWrap {
  :deep(.uni-list-chat) {
    .uni-list-chat__badge {
      z-index: 2;
    }
    .uni-list-chat__content-title {
      color: #9ca3af;
    }
    .uni-list-chat__content-title {
      font-size: 15px;
    }
    .uni-list-chat__header {
      background-color: #eee;
    }
  }
  &.app {
    :deep(.uni-list--border) {
      &:after {
        transform: scaleY(0.3);
        background-color: rgba(0, 0, 0, 0.1);
        height: 0.5px;
      }
    }
  }
}

:deep(.wd-popup) {
  &.wd-popup--bottom {
    bottom: 50px;
  }
}
</style>
