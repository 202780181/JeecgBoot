<template>
  <wd-popup v-model="show" position="bottom">
    <PageLayout navTitle="聊天成员" type="popup" @navBack="handleClose">
      <scroll-view scrollY>
        <template v-for="(item, index) in dataSource" :key="item.id">
          <view class="list solid-bottom">
            <view class="left">
              <view class="cIcon">
                <wd-img
                  height="40px"
                  mode="heightFix"
                  :src="getFileAccessHttpUrl(item.avatar)"
                ></wd-img>
              </view>
              <view class="text">
                <view class="realname">{{ item.username }}</view>
                <view class="desc">[{{ groupLevelLabel(item.groupLevel) }}]</view>
              </view>
            </view>
            <view
              v-if="editShow(item)"
              class="right cuIcon-moreandroid"
              @click="handleClick(item)"
            ></view>
          </view>
        </template>
      </scroll-view>
      <wd-toast :selector="selector"></wd-toast>
    </PageLayout>
    <BottomOperate
      v-if="bottomOperatePopup.show"
      v-bind="bottomOperatePopup"
      @close="() => (bottomOperatePopup.show = false)"
      @change="handleChange"
    ></BottomOperate>
  </wd-popup>
</template>

<script setup lang="ts">
import { cache, getFileAccessHttpUrl, hasRoute } from '@/common/uitls'
import { http } from '@/utils/http'
import { pick } from 'lodash-es'
import { useUserStore } from '@/store/user'
import { uuid } from '@/common/uitls'
import { useToast, useMessage, useNotify, dayjs } from 'wot-design-uni'

const api = {
  removeUser: '/eoa/im/newApi/removeUser',
  chatLevelChange: '/eoa/im/newApi/chatLevelChange',
}
const userStore = useUserStore()
const selector = uuid()
const toast = useToast(selector)
const show = ref(true)
const props = defineProps(['modelValue', 'pageType', 'chatto'])
const emit = defineEmits(['update:modelValue', 'close', 'change'])
const dataSource = ref([])
const currentUserGroupLevel = ref()
const options = [
  { key: 'admin', label: '设为管理员' },
  { key: 'member', label: '设为成员' },
  { key: 'delete', label: '移出群组' },
]
const bottomOperatePopup = reactive({
  show: false,
  title: '',
  data: {},
  options: [],
})
const handleClick = (item) => {
  bottomOperatePopup.title = item.username
  bottomOperatePopup.data = item
  let auth = [...options]
  if (props.pageType == 'discussion') {
    // 聊天只有 移出俩天
    auth = [{ key: 'delete', label: '移出俩天' }]
  } else {
    // 群组
    auth = [...options]
    if (currentUserGroupLevel.value == 'admin') {
      auth = auth.filter((item) => ['delete'].includes(item['key']))
    } else if (['member'].includes(currentUserGroupLevel.value)) {
      auth = []
    }
    // 去除当前已存在的权限
    auth = auth.filter((o) => item.groupLevel != o.key)
  }
  bottomOperatePopup.options = auth
  bottomOperatePopup.show = true
}
const handleChange = ({ option, data }) => {
  if (option.key === 'delete') {
    http
      .post(api.removeUser, {
        id: data.id,
        groupId: props.chatto,
        groupLevel: 'remove',
        type: props.pageType,
      })
      .then((res: any) => {
        if (res.success) {
          dataSource.value = dataSource.value.filter((item) => item.id != data.id)
          emit('change', dataSource.value)
          toast.success('移除成功~')
        } else {
          toast.success(`${res.message}`)
        }
      })
      .catch((err) => {})
  } else if (['member', 'admin'].includes(option.key)) {
    http
      .post(api.chatLevelChange, {
        id: data.id,
        groupId: props.chatto,
        groupLevel: option.key,
        type: props.pageType,
      })
      .then((res: any) => {
        if (res.success) {
          data.groupLevel = option.key
        }
        toast.success(`${res.message}`)
      })
      .catch((err) => {})
  }
}
const editShow = (item) => {
  if (item.groupLevel == 'leader') {
    return false
  } else {
    return ['leader', 'admin'].includes(currentUserGroupLevel.value)
  }
}
const groupLevelLabel = (val) => {
  let text = ''
  if (val == 'leader') {
    text = props.pageType === 'group' ? '群主' : '发起人'
  } else if (val == 'admin') {
    text = '管理员'
  } else if (val == 'member') {
    text = '成员'
  }
  return text
}
const handleClose = () => {
  show.value = false
  setTimeout(() => {
    emit('close')
  }, 400)
}
watch(
  () => props.modelValue,
  () => {
    const findItem = props.modelValue.find((item) => item.id === userStore.userInfo.userid)
    if (findItem) {
      currentUserGroupLevel.value = findItem.groupLevel
    }
    dataSource.value = [...props.modelValue]
  },
  { deep: true, immediate: true },
)
</script>

<style lang="scss" scoped>
.list {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px;
  background-color: #fff;
  .left {
    display: flex;
    align-items: center;
    .cIcon {
      background-color: #ccc;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      overflow: hidden;
    }
    .text {
      margin-left: 10px;
      .realname {
        color: var(--color-grey);
        font-size: 15px;
      }
      .desc {
        color: #aaa;
        font-size: 13px;
      }
    }
  }
  .right {
  }
}
</style>
