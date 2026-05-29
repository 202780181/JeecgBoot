<route lang="json5" type="page">
{
  layout: 'default',
  style: {
    navigationBarTitleText: '聊天',
    navigationStyle: 'custom',
    disableScroll: true, // 微信禁止页面滚动
    'app-plus': {
      bounce: 'none', // 禁用 iOS 弹性效果
    },
  },
}
</route>

<template>
  <PageLayout
    :navTitle="navTitle"
    :backRouteName="backRouteName"
    :routeMethod="routeMethod"
    @navBack="handleNavBack"
    navRightTextMp="设置"
    @navRightMp="handleGoChatSetting"
  >
    <view class="wrap">
      <!-- prettier-ignore -->
      <z-paging ref="paging" v-model="dataList" :fixed="false" use-chat-record-mode use-virtual-list cell-height-mode="dynamic" safe-area-inset-bottom bottom-bg-color="#e5e5e5" @query="queryList" @keyboardHeightChange="keyboardHeightChange" @hidedKeyboard="hidedKeyboard">
        <template #cell="{item,index}">
          <view style="transform: scaleY(-1)">
            <chat-item :item="item" :playMsgid="playMsgid" @playVoice="handlePlayVoice"></chat-item>
          </view>
        </template>
        <template #bottom>
          <chat-input-bar ref="inputBar" @send="doSend" />
        </template>
      </z-paging>
    </view>
  </PageLayout>
</template>

<script lang="ts" setup>
//
import { onLaunch, onShow, onHide, onLoad, onReady } from '@dcloudio/uni-app'
import { nextTick, onMounted, ref } from 'vue'
import { useUserStore } from '@/store/user'
import { http } from '@/utils/http'
import { useToast, useMessage, useNotify, dayjs } from 'wot-design-uni'
import { useRouter } from '@/plugin/uni-mini-router'
import { cache, getFileAccessHttpUrl, hasRoute, formatDate } from '@/common/uitls'
import { TENANT_LIST } from '@/common/constants'
import socket from '@/common/socket'
import { textReplaceEmoji, getEmojiImageUrl } from './emojis'
import chatInputBar from './components/chat-input-bar.vue'
import chatItem from './components/chat-item.vue'
import { getEnvBaseUrl } from '@/utils/index'
import { useParamsStore } from '@/store/page-params'

defineOptions({
  name: 'chat',
  options: {
    // apply-shared‌：当前页面样式会影响到子组件样式.(小程序)
    // shared‌：当前页面样式影响到子组件，子组件样式也会影响到当前页面.(小程序)
    styleIsolation: '‌apply-shared‌',
  },
})

const api = {
  chatlog_old: '/eoa/im/api/queryChatLogList',
  chatlog: '/eoa/im/newApi/records',
  sendMsg: '/eoa/im/newApi/sendMessage',
  sendFile: '/eoa/im/newApi/sendFile',
  creatFriendSession: '/eoa/im/newApi/creatFriendSession',
  uploadUrl: `${getEnvBaseUrl()}/eoa/im/newApi/sendImage`,
}

const toast = useToast()
const userStore = useUserStore()
const paging = ref(null)

// 信息
const chatObj = ref(null)
// 对方userid 或者 群id 或者 讨论组id
const chatto = ref()
const navTitle = ref('')
const myuid = ref(userStore.userInfo.userid)
const msgList = ref([])
// const pageNo = ref(1)
// const pageSize = ref(10)
const loadingShow = ref(false)
const hasRecord = ref(false)
const dataList = ref([])
const inputBar = ref(null)
const AUDIO = uni.createInnerAudioContext()
const playMsgid = ref('')
let stopWatch: any = null
const paramsStore = useParamsStore()
const backRouteName = ref('message')
const routeMethod = ref('pushTab')
const router = useRouter()
// 是否首次加载
let isFirstLoad = true
let chatItemData = {}

// 页面初始化
const init = () => {
  const localData = paramsStore.getPageParams('chat')
  const params = localData.data
  if (!params) {
    return
  }
  chatObj.value = { ...params }
  // 对方头像、群头像、讨论组头像
  navTitle.value = params.fromUserName
  // 对方userid 或者 群id 或者 讨论组id
  chatto.value = chatObj.value.msgTo
  chatItemData = params
  if (params.type == 'friend') {
    // 创建会话数据
    creatFriendSession(chatObj.value.msgTo)
  }
  // 启动webSocket
  onSocketOpen()
  // 接收消息
  onSocketReceive()
  // 加载初始页面消息
  getMsgList()
  if (localData.back) {
    backRouteName.value = localData.back
    routeMethod.value = localData.routeMethod
  }
}
// 创建会话数据
const creatFriendSession = (userId) => {
  http.post(api.creatFriendSession, {
    type: 'friend',
    userId,
  })
}
const onSocketOpen = () => {
  // console.log('启动webSocket')
  // socket.init('eoaNewChatSocket')
}
const onSocketReceive = () => {
  var _this = this
  socket.acceptMessage = function (res) {
    console.log('页面收到的消息=====》', res)
    if (res.event == 'event_talk_revoke') {
      // 撤回了消息
      removeMsg(res)
    } else {
      // event_chat_talk
      if (res.event.startsWith('event_chat')) {
        //聊天消息
        screenMsg(res)
        unreadClear()
      }
    }
  }
}
const removeMsg = (data) => {
  let arr = msgList.value.filter((item) => item.id != data.id)
  msgList.value = arr
}
const screenMsg = (msg) => {
  // 消息处理
  let reuslt = false
  if (chatObj.value.type == 'friend') {
    reuslt = msg.data.msgFrom == chatto.value && msg.data.msgTo == myuid.value
  } else if (['group', 'discussion'].includes(chatObj.value.type)) {
    reuslt = msg.data.msgFrom !== myuid.value && msg.data.msgTo == chatto.value
  }
  if (reuslt) {
    console.log('用户消息')
    let time = formatDate(msg.data.sendTime, 'yyyy-MM-dd hh:mm:ss')
    let id = time.replace(/\:/g, '').replace(/\-/g, '').replace(' ', '')
    paging.value?.addChatRecordData(
      analysis([
        {
          fromUserName: msg.data.fromUserName,
          msgTo: msg.data.msgTo,
          msgFrom: msg.data.msgFrom,
          msgData: msg.data.msgData,
          fromAvatar: msg.data.fromAvatar,
          sendTime: msg.data.sendTime,
          msgType: msg.data.msgType,
          sendTimeId: id,
          fileName: msg.data.fileName,
          id: msg.data.id,
        },
      ]),
    )
    //非自己的消息震动
    if (msg.msgFrom != myuid.value) {
      console.log('振动')
      uni.vibrateLong()
    }
  }
}
//替换表情符号为图片
const replaceEmoji = (str) => {
  let temp = textReplaceEmoji(str)
  return '<div style="display:inline-block">' + temp + '</div>'
}

const queryList = (pageNo, pageSize) => {
  //数据库查询消息列表
  let params = {
    type: chatObj.value.type,
    pageNo: pageNo,
    pageSize: pageSize,
    msgTo: chatto.value,
    // id: myuid.value,
    // sort: 'DESC',
  }
  console.log('params', params)
  const data = [
    {
      id: 1,
      fromUserName: '顾平',
      sendTime: '1977-11-13',
      fromAvatar: 'https://dummyimage.com/100x100/000/fff&text=%E6%9D%8E%E5%9B%9B',
      type: 'friend',
      izTop: 1,
      status: 'offline',
      msgFrom: 4000,
      msgTo: 100,
      userId: '1678948772039729154',
      msgType: 'text',
      msgData:
        '可半达办外将物起算置知空子。上题务点条界思清法导集马为和计。始在形计各强可求开去手先下识极级育专。形子民委想己给号全维精道应。斯适般不拉个世被资提达须之多关。己除约确元则次同风平维音毛听。少验且内果论治量军们活展观情面元越。',
    },
    {
      id: 2,
      fromUserName: '熊艳',
      sendTime: '1977-11-13',
      fromAvatar: 'https://dummyimage.com/100x100/000/fff&text=%E6%9D%8E%E5%9B%9B',
      type: 'friend',
      izTop: 0,
      status: 'online',
      msgFrom: 4012,
      msgTo: 134,
      userId: '1678948772039729154',
      msgType: 'text',
      msgData:
        '斗取写也展需会于儿次只三自到界民品因。只代装细打三管规这前千器她她入音即准。必象和长使南资几时明因米多交极须空。',
    },
    {
      id: 3,
      fromUserName: '康娜',
      sendTime: '1977-11-13',
      fromAvatar: 'https://dummyimage.com/100x100/000/fff&text=%E6%9D%8E%E5%9B%9B',
      type: 'discussion',
      izTop: 1,
      status: 'offline',
      msgFrom: 4024,
      msgTo: 168,
      userId: '1678948772039729154',
      msgType: 'text',
      msgData:
        '图步把单增利老何列力道何认象。子各交群容产识一界边先式声。被思务共是圆音少际指王元压没任内共。养作包京何铁历属信战族再线理却来情料。能周内家术向建满思书温音太装。时她切调它论族温中三关且与志千。',
    },
    {
      id: 4,
      fromUserName: '石平',
      sendTime: '1977-11-13',
      fromAvatar: 'https://dummyimage.com/100x100/000/fff&text=%E6%9D%8E%E5%9B%9B',
      type: 'group',
      izTop: 1,
      status: 'offline',
      msgFrom: 4036,
      msgTo: 202,
      userId: '1678948772039729154',
      msgType: 'text',
      msgData:
        '民高价般直素划达期矿身更价律或支今。争局便工争相算则参调信斯。把清得完别青院阶火老先位包回速变。意温太合为这来物只我非象专型又加军。至取拉方毛眼例着大你这每相亲该元风。',
    },
    {
      id: 5,
      fromUserName: '马杰',
      sendTime: '1977-11-13',
      fromAvatar: 'https://dummyimage.com/100x100/000/fff&text=%E6%9D%8E%E5%9B%9B',
      type: 'group',
      izTop: 1,
      status: 'offline',
      msgFrom: 4048,
      msgTo: 236,
      userId: '1678948772039729154',
      msgType: 'text',
      msgData:
        '除命市与命成型两口接在及民志提能。需参处空容感学长革段易给分。始真结红型图处技界党非青机山。广直声从老照如写中么省风但。论斗展就积信区北形大报达据把青要。',
    },
    {
      id: 6,
      fromUserName: '沈艳',
      sendTime: '1977-11-13',
      fromAvatar: 'https://dummyimage.com/100x100/000/fff&text=%E6%9D%8E%E5%9B%9B',
      type: 'friend',
      izTop: 0,
      status: 'offline',
      msgFrom: 4060,
      msgTo: 270,
      userId: '1678948772039729154',
      msgType: 'text',
      msgData:
        '规响用其江众器老也成等听节电西。系石教建还厂文气要际长中电今。情素他头资风矿象非这经格老包问过。史期带之走北形历值从所因断八技。红行没众说共史张在任千物今老。传队命做打此无直转术直其门公。',
    },
    {
      id: 7,
      fromUserName: '崔芳',
      sendTime: '1977-11-13',
      fromAvatar: 'https://dummyimage.com/100x100/000/fff&text=%E6%9D%8E%E5%9B%9B',
      type: 'discussion',
      izTop: 0,
      status: 'online',
      msgFrom: 4072,
      msgTo: 304,
      userId: '1678948772039729154',
      msgType: 'text',
      msgData:
        '识保住并非先严间眼马级点叫识只管。写信为每下数集被料前号变很整合。收业后局看并太能决来二府展建片活即体。给史求音很三动作目重因质除提。法关活量管集求公又再时共小明个自确。集提支很也规入并我基照计最要飞院面。',
    },
    {
      id: 8,
      fromUserName: '郝超',
      sendTime: '1977-11-13',
      fromAvatar: 'https://dummyimage.com/100x100/000/fff&text=%E6%9D%8E%E5%9B%9B',
      type: 'discussion',
      izTop: 1,
      status: 'online',
      msgFrom: 4084,
      msgTo: 338,
      userId: '1678948772039729154',
      msgType: 'text',
      msgData:
        '状断只派器新以真业强说部多确料。始矿认要联清才权况况法色式。引办研角且百国路里还计走中细位。或温作经人周复技常位交文共没运。',
    },
  ]
  const records = analysis(data)
  paging.value.complete(records)
  if (isFirstLoad) {
    uni.$emit('chatList:unreadClear', chatItemData)
    unreadClear()
  }
}
const analysis = (data) => {
  let arr = data
  if (arr.length > 0) {
    let list = arr.map((item) => {
      let id = String(item.sendTime).replace(/\:/g, '').replace(/\-/g, '').replace(' ', '')
      item.sendTimeId = id
      let content = item.msgData
      if (item.msgType == 'text') {
        content = replaceEmoji(content)
      }
      if (item.msgType == 'voice') {
        content = JSON.parse(content)
      }
      item.msgData = content
      return item
    })
    for (let i = 0; i < list.length; i++) {
      if (list[i].msgType == 'revoke') {
        continue
      }
      if (list[i].referenceMsgId) {
        list[i] = handleReplyMsg(list[i], list)
      }
    }
  }
  return data
}

// 加载初始页面消息
const getMsgList = () => {}
const handleReplyMsg = (item, list) => {
  let tempId = item.referenceMsgId
  item.reply = true
  let replyContent = ''
  for (let i = 0; i < list.length; i++) {
    if (list[i].id == tempId) {
      replyContent = '"' + list[i].fromUserName + ':' + list[i].msgData + '"'
      break
    }
  }
  item.replyContent = replyContent
  return item
}
const unreadClear = () => {}
// 播放语音
const handlePlayVoice = (item) => {
  if (item.id == playMsgid.value) {
    AUDIO.stop()
    playMsgid.value = ''
  } else {
    playMsgid.value = item.id
    AUDIO.src = item.msgData.url
    nextTick(function () {
      AUDIO.play()
    })
  }
}
// 播放语音结束
AUDIO.onEnded((res) => {
  playMsgid.value = ''
})

// 监听键盘高度改变，请不要直接通过uni.onKeyboardHeightChange监听，否则可能导致z-paging内置的键盘高度改变监听失效（如果不需要切换表情面板则不用写）
const keyboardHeightChange = (res) => {
  inputBar.value.updateKeyboardHeightChange(res)
}
// 用户尝试隐藏键盘，此时如果表情面板在展示中，应当通知chatInputBar隐藏表情面板（如果不需要切换表情面板则不用写）
const hidedKeyboard = () => {
  inputBar.value.hidedKeyboard()
}
const doSend = (textMsg) => {
  let content = replaceEmoji(textMsg)
  //let msg = {'text':content}
  //content = (content||'').replace(/&(?!#?[a-zA-Z0-9]+;)/g, '&amp;')
  console.log('content', content)
  let msg = textMsg
  //发送
  sendMsg(msg, 'text')
  send({ msgData: content, msgType: 'text' })
}

const sendMsg = (content, type) => {
  //实际应用中，此处应该提交长连接，模板仅做本地处理。
  var nowDate = new Date()
  // 发送消息
  var obj = {
    mine: {
      avatar: userStore.userInfo.avatar,
      content: content,
      id: myuid.value,
      mine: true,
      username: userStore.userInfo.username,
    },
    to: {
      avatar: chatObj.value.avatar,
      id: chatObj.value.msgTo,
      type: chatObj.value.type,
      username: chatObj.value.username,
    },
  }

  let sendData = {
    type: 'chatMessage',
    data: obj,
  }
  console.log('sendData======>', sendData)
  let params = {
    type: chatObj.value.type,
    msgTo: chatObj.value.msgTo,
    text: content,
    msgType: 'text',
  }
  // http.post(api.sendMsg, params).then((res: any) => {
  //   console.log('消息发送结果：', res)
  //   if (!res.success) {
  //     toast.error(res.message)
  //   }
  // })
}

const handleImage = (type) => {
  let time = formatDate(new Date().getTime(), 'yyyy-MM-dd hh:mm:ss')
  let id = time.replace(/\:/g, '').replace(/\-/g, '').replace(' ', '')
  let formData = {
    type: 'friend',
    msgTo: chatto.value,
    fileId: id,
    msgType: 'images',
    fileName: '',
  }
  const { loading, data, error, run } = useUpload(
    { ...formData, name: 'image' },
    { url: api.uploadUrl, sourceType: [type] },
  )
  if (stopWatch) stopWatch()
  run()
  stopWatch = watch(
    () => [loading.value, error.value, data.value],
    ([loading, err, data]: any, oldValue) => {
      if (loading === false) {
        if (err) {
          // toast.warning('修改失败')
          uni.hideLoading()
        } else {
          if (data.code === 200) {
            send({ msgData: data.result.text, msgType: 'image' })
          } else {
            toast.warning(data.message)
          }
        }
      }
    },
  )
}
const send = ({ msgData, msgType }) => {
  let time = formatDate(new Date().getTime(), 'yyyy-MM-dd hh:mm:ss')
  let id = time.replace(/\:/g, '').replace(/\-/g, '').replace(' ', '')
  //发送
  paging.value.addChatRecordData(
    analysis([
      {
        fromUserName: userStore.userInfo.realname,
        msgTo: chatto.value,
        msgFrom: myuid.value,
        msgData: msgData,
        fromAvatar: userStore.userInfo.avatar,
        sendTime: time,
        sendTimeId: id,
        msgType,
      },
    ]),
  )
}
init()

const handleNavBack = () => {
  uni.$emit('chatList:unreadClear', chatItemData)
  uni.$emit('chatList:reload')
}
const handleGoChatSetting = () => {
  paramsStore.setPageParams('chatSetting', {
    type: chatObj.value.type,
    chatto: chatto.value,
  })
  router.push({
    name: 'chatSetting',
  })
}
onMounted(() => {
  uni.$on('chat:updateTile', (title) => {
    navTitle.value = title
  })
})
onBeforeUnmount(() => {
  // socket?.closeSocket()
  uni.$off('chat:updateTile')
})
</script>

<style lang="scss" scoped>
//
.wrap {
  height: 100%;
}
</style>
