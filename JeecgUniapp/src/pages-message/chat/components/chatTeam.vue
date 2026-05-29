<template>
  <view class="wrap FolderTeam">
    <view class="titleArea">
      <view class="title">聊天成员</view>
      <view class="right" @click="() => (teamListShow = true)">
        <view class="num">{{ modelValue.length }}人</view>
        <wd-icon name="arrow-right" size="16px"></wd-icon>
      </view>
    </view>
    <view class="content">
      <SelectUser
        modalTitle="全部联系人"
        showType="card"
        :isDelUser="false"
        :isAddUser="getIsAddUser"
        :readonlyUser="readonlyUser"
        v-model="user"
        rowKey="id"
        @getSelectdAllData="getSelectdAllData"
      ></SelectUser>
    </view>
    <TeamList
      v-if="teamListShow"
      v-model="teamList"
      :pageType="pageType"
      :chatto="chatto"
      @close="() => (teamListShow = false)"
      @change="handleChange"
    ></TeamList>
    <wd-toast :selector="selector"></wd-toast>
  </view>
</template>

<script setup lang="ts">
import { useToast, useMessage, useNotify, dayjs } from 'wot-design-uni'
import { ref, watch } from 'vue'
import { http } from '@/utils/http'
import { useUserStore } from '@/store/user'
import { pick } from 'lodash-es'
import { uuid } from '@/common/uitls'
import TeamList from './TeamList.vue'

const api = {
  addAuthUser: '/eoa/im/newApi/invitationFriend',
}
defineOptions({
  name: 'chatTeam',
  options: {
    styleIsolation: 'shared',
  },
})

const props = defineProps(['modelValue', 'pageType', 'chatto', 'izInvitation', 'groupLevel'])
const emit = defineEmits(['update:modelValue'])
const selector = uuid()
const toast = useToast(selector)
const userStore = useUserStore()
const readonlyUser = ref([])
const teamList = ref([])
const teamListShow = ref(false)
const user = ref([])
const handleChange = (data) => {
  emit('update:modelValue', data)
}
const getIsAddUser = computed(() => {
  let result = true
  if (props.pageType === 'group') {
    if (props.izInvitation == 1 && props.groupLevel == 'member') {
      // 仅群主和admin可邀请用户
      result = false
    }
  }
  return result
})
const getSelectdAllData = (data) => {
  const newAddUser = getDifference(data, props.modelValue, 'id').map((item) => {
    return {
      ...pick(item, ['id', 'avatar']),
      username: item.realname,
      groupLevel: 'member',
    }
  })
  const auto = () => {
    user.value = props.modelValue
  }
  http
    .post(api.addAuthUser, {
      groupId: props.chatto,
      type: props.pageType,
      userIds: newAddUser.map((item) => item.id).join(','),
    })
    .then((res: any) => {
      if (res.success) {
        emit('update:modelValue', [...props.modelValue, ...newAddUser])
      } else {
        emit('update:modelValue', [...props.modelValue])
        auto()
      }
      toast.warning(`${res.message}`)
    })
    .catch((err) => {
      toast.warning('邀请用户失败~')
      auto()
    })
}

const getDifference = (b, a, key) => {
  // 将数组a转换为Set以便快速查找
  const aIds = new Set(a.map((item) => item[key]))
  // 过滤数组b中不在数组a中的元素
  return b.filter((item) => !aIds.has(item[key]))
}

const init = () => {
  const ids = props.modelValue.map((item) => item.id)
  user.value = ids
  readonlyUser.value = ids
}
watch(
  () => props.modelValue,
  () => {
    teamList.value = [...props.modelValue]
    init()
  },
  { deep: true, immediate: true },
)
</script>

<style lang="scss" scoped>
.wrap {
  background-color: #fff;
  padding: 14px;
  .titleArea {
    font-size: 15px;
    color: var(--color-grey);
    display: flex;
    justify-content: space-between;
    .right {
      display: flex;
      align-items: center;
    }
  }
}
</style>
