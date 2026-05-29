<route lang="json5" type="page">
{
  layout: 'default',
  style: {
    navigationBarTitleText: '',
    navigationStyle: 'custom',
    disableScroll: true, // 微信禁止页面滚动
    'app-plus': {
      bounce: 'none', // 禁用 iOS 弹性效果
    },
  },
}
</route>
<template>
  <PageLayout :navTitle="`${typeLabel}设置`" backRouteName="chat">
    <view class="wrap">
      <wd-cell-group>
        <view @click="handleRename">
          <wd-input
            :label="`${typeLabel}名称`"
            :placeholder="`请输入${typeLabel}`"
            v-model="dataSource.groupName"
            clearable
            readonly
          ></wd-input>
        </view>
        <wd-cell title="消息免打扰" center>
          <wd-switch
            v-model="messageNotDisturb"
            size="20px"
            @change="handleNotDisturbChange"
          ></wd-switch>
        </wd-cell>
        <wd-cell
          v-if="pageType == 'group' && groupLevel == 'leader'"
          title="仅允许群主及管理员邀请新成员"
          center
        >
          <wd-switch v-model="izInvitation" size="20px" @change="handleInvitation"></wd-switch>
        </wd-cell>
      </wd-cell-group>
      <chatTeam
        v-model="authList"
        :pageType="pageType"
        :izInvitation="izInvitation"
        :groupLevel="groupLevel"
        :chatto="chatto"
      ></chatTeam>
      <view class="btn-group">
        <wd-button @click="handleExit">退出{{ pageType == 'group' ? '群聊' : '聊天' }}</wd-button>
        <wd-button type="error" v-if="groupLevel == 'leader'" @click="handleDissolve">
          解散{{ pageType == 'group' ? '群聊' : '聊天' }}
        </wd-button>
      </view>
    </view>
    <wd-toast :selector="selector"></wd-toast>
  </PageLayout>
</template>

<script setup lang="ts">
import { onShow, onHide, onLoad, onReady } from '@dcloudio/uni-app'
import { http } from '@/utils/http'
import { useToast, useMessage, useNotify, dayjs } from 'wot-design-uni'
import { useUserStore } from '@/store/user'
import chatTeam from './components/chatTeam.vue'
import { uuid } from '@/common/uitls'
import { useRouter } from '@/plugin/uni-mini-router'
import { useParamsStore } from '@/store/page-params'

defineOptions({
  name: 'CreateShareFolder',
  options: {
    styleIsolation: 'shared',
  },
})
const selector = uuid()
const toast = useToast(selector)
const userStore = useUserStore()
const paramsStore = useParamsStore()
const router = useRouter()
const pageType = ref('add')
const myuid = ref(userStore.userInfo.userid)
const groupLevel = ref('')
const typeLabel = ref('群组')
// 群组：['member','admin','leader'] 聊天：['member','leader']
// 群组id 或 聊天id
const chatto = ref()
const api = {
  getGroupLevel: '/eoa/im/newApi/getGroupLevel',
  getMembers: '/eoa/im/api/getMembers',
  updateGroup: '/eoa/im/newApi/updateGroup',
  chatDisturb: '/eoa/im/newApi/chatDisturb',
  exitGroup: '/eoa/im/newApi/exitGroup',
  dismissGroup: '/eoa/im/newApi/dismissGroup',
}
const columns = ref([])
const folderName = ref('')
const tenantId = ref('')
const authList = ref([])
const dataSource: any = ref({})
const message = useMessage()

const messageNotDisturb = ref(false)
const izInvitation = ref(false)
const handleNotDisturbChange = ({ value }) => {
  http
    .post(api.chatDisturb, {
      groupId: chatto.value,
      izDisturb: value ? '1' : '0',
      type: pageType.value,
    })
    .then((res: any) => {
      if (res.success) {
        toast.success(res.message)
      } else {
        toast.warning(res.message)
      }
    })
}
const handleInvitation = ({ value }) => {
  http
    .post(api.updateGroup, {
      id: chatto.value,
      izInvitation: value ? '1' : '0',
    })
    .then((res: any) => {
      toast.success(res.message)
    })
}
const handleRename = () => {
  // 群名 群公告仅允许 leader修改
  if (['leader'].includes(groupLevel.value)) {
    message
      .prompt({
        inputValue: dataSource.value.groupName,
        title: `修改${typeLabel.value}名称`,
      })
      .then(({ action, value }) => {
        http.post(api.updateGroup, { id: chatto.value, groupName: value }).then((res: any) => {
          if (res.success) {
            toast.success(`修改${typeLabel.value}名称成功~`)
            dataSource.value.groupName = value as string
            uni.$emit('chat:updateTile', value)
            uni.$emit('myGroup:reload')
          }
        })
      })
      .catch((err) => {})
  }
}
const handleExit = () => {
  message
    .confirm({
      msg: `退出${typeLabel.value}后，聊天列表会消失`,
      title: '是否确认退出？',
    })
    .then(({ action, value }) => {
      http
        .post(api.exitGroup, {
          groupId: chatto.value,
          id: myuid.value,
          type: pageType.value,
        })
        .then((res: any) => {
          if (res.success) {
            uni.$emit('chatList:reload')
            setTimeout(() => {
              router.pushTab({ name: 'message' })
            }, 100)
          } else {
            toast.warning(res.message)
          }
        })
        .catch((err) => {})
    })
}
const handleDissolve = () => {
  message
    .confirm({
      msg: `${typeLabel.value}解散后，将永久删除该聊天。不可恢复`,
      title: '是否确认解散？',
    })
    .then(({ action, value }) => {
      http
        .post(api.dismissGroup, {
          groupId: chatto.value,
          groupName: dataSource.value.groupName,
          id: myuid.value,
          username: userStore.userInfo.realname,
          type: pageType.value,
        })
        .then((res: any) => {
          if (res.success) {
            uni.$emit('chatList:reload')
            setTimeout(() => {
              router.pushTab({ name: 'message' })
            }, 100)
          } else {
            toast.warning(res.message)
          }
        })
        .catch((err) => {})
    })
}
const getGroupLevel = () => {
  http.get(api.getGroupLevel, { groupId: chatto.value, userId: myuid.value }).then((res: any) => {
    if (res.success) {
      groupLevel.value = res.result
    }
  })
}
const getMembers = () => {
  http.get(api.getMembers, { id: chatto.value }).then((res: any) => {
    if (res.code === 0) {
      const { data } = res
      const { eoaChatGroup, list, owner, izDisturb } = data
      authList.value = list
      dataSource.value = eoaChatGroup
      izInvitation.value = eoaChatGroup.izInvitation == '1' ? true : false
      messageNotDisturb.value = izDisturb == '1' ? true : false
    }
  })
}
const init = () => {
  const params = paramsStore.getPageParams('chatSetting')
  chatto.value = params.chatto
  pageType.value = params.type
  typeLabel.value = params.type == 'group' ? '群组' : '聊天'
  getGroupLevel()
  getMembers()
}
init()
</script>

<style lang="scss" scoped>
:deep(.wd-cell-group) {
  background-color: transparent;
  --wot-cell-title-fs: 15px;
  .wd-cell-group__body {
    background-color: transparent;
    padding-top: 15px;
  }
  .wd-input__label,
  .wd-select-picker__label {
    width: 70px !important;
    min-width: auto !important;
    max-width: auto !important;
    color: var(--color-grey);
  }
  .wd-input,
  .wd-cell {
    margin-bottom: 15px;
  }
  .wd-cell {
    --wot-cell-title-color: var(--color-grey);
    .wd-cell__left {
      flex: 2;
    }
    .wd-cell__value {
      display: flex;
      align-items: center;
      flex-direction: row-reverse;
    }
  }
  .wd-select-picker {
    margin: 15px 0;
    .wd-select-picker__cell {
      padding-block: 14px;
    }
  }
}
.btn-group {
  padding-block: 30px;
  display: flex;
  justify-content: space-between;
  width: 80%;
  margin: 0 auto;
  :deep(.wd-button) {
    display: block;
    width: 100%;
    &:nth-child(2) {
      margin-left: 10px;
    }
  }
}
</style>
