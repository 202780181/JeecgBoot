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
  <PageLayout
    navTitle="我的群组"
    backRouteName="message"
    routeMethod="pushTab"
    navRightTextMp="创建"
    @navRightMp="() => (action.show = true)"
  >
    <view class="wrap">
      <z-paging
        ref="paging"
        :fixed="false"
        v-model="dataList"
        @query="queryList"
        :default-page-size="100"
      >
        <template #top>
          <wd-search
            hide-cancel
            placeholder="请输入群组名"
            v-model="keyword"
            @search="handleSearch"
            @clear="handleClear"
          />
        </template>
        <view :class="{ wraper: true, small: height < 700 }">
          <wd-index-bar v-if="dataSource.length">
            <view
              :class="{ box: true, emptyContent: !item.data.length }"
              v-for="item in dataSource"
              :key="item.index"
            >
              <wd-index-anchor :index="item.index" />
              <wd-cell
                border
                clickable
                v-for="inItem in item.data"
                :key="item.groupId"
                @click="handleClick(item.index, inItem, item)"
              >
                <template #icon>
                  <wd-img
                    customClass="avatar"
                    :width="50"
                    :height="50"
                    :src="getFileAccessHttpUrl(inItem.avatar) || defaultAvatar"
                  ></wd-img>
                </template>
                <template #title>
                  <view class="content text-gray-4">
                    <text>{{ inItem.groupName }}</text>
                    <text>{{ inItem.orgCodeTxt ?? '暂无' }}</text>
                  </view>
                </template>
              </wd-cell>
            </view>
          </wd-index-bar>
        </view>
      </z-paging>
    </view>
    <template #navRight>
      <view
        class="cuIcon-add font-size-20px color-white"
        @click="() => (action.show = true)"
      ></view>
    </template>
    <wd-action-sheet
      v-model="action.show"
      :actions="action.data"
      @close="() => (action.show = false)"
      @select="handleSelect"
    />
    <SelectUserModal
      v-if="selectUserModal.show"
      :readonlyUser="selectUserModal.readonlyUser"
      :defaultSelectedValue="selectUserModal.defaultSelectedValue"
      @close="() => (selectUserModal.show = false)"
      @change="handleUserChange"
    ></SelectUserModal>
  </PageLayout>
</template>

<script lang="ts" setup>
import { ref, reactive } from 'vue'
import { onShow, onHide, onLoad, onReady } from '@dcloudio/uni-app'
import { useMessage, useToast } from 'wot-design-uni'
import { useRouter } from '@/plugin/uni-mini-router'
import { useUserStore } from '@/store/user'
import { http } from '@/utils/http'
import vPinyin from '../common/vue-py'
import { cache, getFileAccessHttpUrl, hasRoute } from '@/common/uitls'
import { useParamsStore } from '@/store/page-params'
import defaultAvatar from '@/static/default-avatar.png'
import SelectUserModal from '@/components/SelectUser/components/SelectUserModal.vue'
defineOptions({
  name: 'myGroup',
  options: {
    styleIsolation: '‌shared‌',
  },
})
const api = {
  getMyGroupList: '/eoa/im/newApi/getMyGroupList',
}
const paramsStore = useParamsStore()
const userStore = useUserStore()
const toast = useToast()
const message = useMessage()

const paging = ref(null)
const router = useRouter()
const dataList = ref([])
// 接口拿到的数据处理之后的
const originData = ref([])
const keyword = ref('')
const dataSource = ref([])
const action = reactive({
  show: false,
  data: [
    { name: '创建讨论群组', color: '#0081ff' },
    { name: '创建个人群组', color: '#e54d42' },
  ],
})
const selectUserModal = reactive({
  show: false,
  defaultSelectedValue: [userStore.userInfo.username],
  readonlyUser: [userStore.userInfo.username],
})
const conditionFilter = reactive({ show: false, checked: '', options: [] })
const systemInfo = getApp().globalData.systemInfo
const { height } = systemInfo.safeArea
const queryList = (pageNo, pageSize) => {
  const pararms = { keyword: '', type: 'allGroup' }
  http
    .get(`${api.getMyGroupList}`, pararms)
    .then((res: any) => {
      if (res.success && res.result.length) {
        let result = res.result
        paging.value.complete(result)
      } else {
        paging.value.complete(false)
      }
    })
    .catch((res) => {
      paging.value.complete(false)
    })
}
// 监听接口数据
watch(dataList, () => {
  let result = handleResult(dataList.value)
  result = transformData(result)
  result.sort((a, b) => a.index.localeCompare(b.index))
  result = fillAZIndexes(result)
  originData.value = [...result]
  if (keyword.value) {
    let searchData = []
    originData.value.forEach((item) => {
      let data = item.data.filter((inItem) => inItem.groupName.indexOf(keyword.value) != -1)
      searchData.push({ index: item.index, data })
    })
    dataSource.value = searchData
  } else {
    dataSource.value = originData.value
  }
})

// 搜索
function handleSearch() {
  dataSource.value = []
  nextTick(() => {
    if (keyword.value) {
      let searchData = []
      originData.value.forEach((item) => {
        let data = item.data.filter((inItem) => inItem.groupName.indexOf(keyword.value) != -1)
        searchData.push({ index: item.index, data })
      })
      dataSource.value = searchData
    } else {
      dataSource.value = originData.value
    }
  })
}
// 清除搜索条件
function handleClear() {
  keyword.value = ''
  handleSearch()
}

const handleClick = (index: string, data: any, item) => {
  paramsStore.setPageParams('groupPage', { backRouteName: 'myGroup', data: { ...data, ...item } })
  router.push({ name: 'groupPage' })
}
const handleChange = ({ option }) => {
  conditionFilter.checked = option.key
  paging.value.reload()
}
// 选用户之后
const handleUserChange = (data) => {
  if (data.length == 2) {
    const userInfo = data.find((item) => item['username'] !== userStore.userInfo.username)
    // 个人聊天界面
    var parmas = {
      fromAvatar: userInfo.avatar,
      fromUserName: userInfo.realname || userInfo.username,
      msgFrom: userStore.userInfo.userid,
      msgTo: userInfo.id,
      type: 'friend',
    }
    paramsStore.setPageParams('chat', { data: parmas, back: 'myGroup', routeMethod: 'replace' })
    router.push({ name: 'chat' })
  } else {
    // 讨论组
    data = data.filter((item) => item['username'] !== userStore.userInfo.username)
    let userIds = data.map((item) => item.id).join(',')
    let usernames = JSON.stringify(data)
    http
      .post('/eoa/im/newApi/createChatDiscussion', {
        type: 'discussion',
        userIds,
        usernames,
      })
      .then((res) => {
        if (res.success) {
          paging.value.reload()
          paramsStore.setPageParams('chat', {
            data: res.result,
            back: 'myGroup',
            routeMethod: 'replace',
          })
          router.push({ name: 'chat' })
        } else {
          toast.warning(res.message)
        }
      })
  }
}
//
const handleSelect = ({ item, index }) => {
  if (index == 0) {
    selectUserModal.show = true
  } else {
    router.push({ name: 'addGroup' })
  }
}
const transformData = (data) => {
  const grouped = data.reduce((acc, item) => {
    const key = item.szm
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(item)
    return acc
  }, {})

  return Object.entries(grouped)
    .map(([index, data]) => ({ index, data }))
    .sort((a, b) => b.index.localeCompare(a.index))
}
const handleResult = (arr) => {
  let newArr = []
  arr.forEach((item) => {
    let { id, groupName, avatar, username, phone, email, post, orgCodeTxt } = item
    //聊天通讯录把自己过滤掉
    if (username !== userStore.userInfo.username) {
      let pinYin = groupName
      if (groupName) {
        //TODO 判断汉字的位置
        if (/.*[\u4e00-\u9fa5]+.*$/.test(groupName)) {
          pinYin = vPinyin.chineseToPinYin(groupName)
        }
      }
      if (avatar) {
        avatar = getFileAccessHttpUrl(avatar)
      }
      let szm = pinYin.substr(0, 1)
      var numReg = /^[0-9]*$/
      var numRe = new RegExp(numReg)
      szm = !numRe.test(szm) ? szm.toUpperCase() : '#'
      newArr.push({
        id,
        groupName,
        avatar,
        username,
        phone,
        email,
        post,
        orgCodeTxt,
        szm: szm,
        ...item,
      })
    }
  })
  return newArr
}
const fillAZIndexes = (data) => {
  // 生成A-Z的字母数组
  const allIndexes = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))

  // 将原始数据转换为以index为键的对象
  const dataMap = {}
  data.forEach((item) => {
    dataMap[item.index] = item.data
  })

  // 遍历所有字母，生成完整数据
  return allIndexes.map((letter) => ({
    index: letter,
    data: dataMap[letter] || [], // 存在则用原始数据，否则用空数组
  }))
}
onMounted(() => {
  uni.$on('myGroup:reload', () => {
    paging.value.reload()
  })
})
onBeforeUnmount(() => {
  uni.$off('myGroup:reload')
})
</script>

<style lang="scss" scoped>
.wrap {
  height: 100%;
  .emptyContent {
    display: none;
  }
  .small {
    :deep(.wd-index-bar__index) {
      font-size: 11px;
      padding-top: 2px;
      padding-bottom: 3px;
    }
  }
}
:deep(.z-paging-content) {
  // :deep(.zp-paging-container) {
  //   flex: none;
  //   height: calc(100% - 42px);
  //   .zp-paging-container-content {
  //     height: 100%;
  //   }
  // }
  .zp-l-container-rpx {
    opacity: 0;
  }
}
:deep(.avatar) {
  border-radius: 50%;
  overflow: hidden;
  margin-right: 10px;
  background-color: #eee;
}
.content {
  display: flex;
  flex-direction: column;
  uni-text {
    &:first-child {
      font-size: 16px;
      color: #8799a3;
    }
    &:last-child {
      font-size: 12px;
    }
  }
}
.wraper {
  // height: 100%;
  height: calc(100vh - var(--window-top) - constant(safe-area-inset-bottom) - 140px);
  height: calc(100vh - var(--window-top) - env(safe-area-inset-bottom) - 140px);
  :deep(.wd-cell__right) {
    display: none;
  }
}
</style>
