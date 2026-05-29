<route lang="json5" type="page">
{
  layout: 'default',
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '联系人',
    disableScroll: true, // 微信禁止页面滚动
    'app-plus': {
      bounce: 'none', // 禁用 iOS 弹性效果
    },
  },
}
</route>

<template>
  <PageLayout navTitle="联系人" backRouteName="message" routeMethod="pushTab">
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
            placeholder="请输入姓名"
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
                clickable
                v-for="inItem in item.data"
                :key="item.username"
                @click="handleClick(item.index, inItem)"
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
                    <text>{{ inItem.realname }}</text>
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
        class="cuIcon-filter font-size-20px color-white"
        @click="() => (conditionFilter.show = true)"
      ></view>
    </template>
    <rightConditionFilter
      v-if="conditionFilter.show"
      v-bind="conditionFilter"
      @close="() => (conditionFilter.show = false)"
      @change="handleChange"
    ></rightConditionFilter>
  </PageLayout>
</template>

<script lang="ts" setup>
import { onLaunch, onShow, onHide, onLoad, onReady } from '@dcloudio/uni-app'
import { nextTick, onMounted, ref } from 'vue'
import { useUserStore } from '@/store/user'
import { http } from '@/utils/http'
import { useParamsStore } from '@/store/page-params'
import { useToast, useMessage, useNotify, dayjs } from 'wot-design-uni'
import { useRouter } from '@/plugin/uni-mini-router'
import { cache, getFileAccessHttpUrl, hasRoute } from '@/common/uitls'
import vPinyin from '../common/vue-py'
import rightConditionFilter from '@/components/RightConditionFilter/RightConditionFilter.vue'
import { TENANT_LIST } from '@/common/constants'
import defaultAvatar from '@/static/default-avatar.png'

const toast = useToast()
const userStore = useUserStore()
const paramsStore = useParamsStore()
const paging = ref(null)
const router = useRouter()
const dataList = ref([])
// 接口拿到的数据处理之后的
const originData = ref([])
const keyword = ref('')
const dataSource = ref([])
const conditionFilter = reactive({ show: false, checked: '', options: [] })
const systemInfo = getApp().globalData.systemInfo
const { height } = systemInfo.safeArea
const queryList = (pageNo, pageSize) => {
  const pararms = { pageNo, pageSize, tenantId: conditionFilter.checked }
  if (conditionFilter.checked === '') delete pararms.tenantId
  http
    .get('/sys/user/appQueryUser', pararms)
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
      let data = item.data.filter((inItem) => inItem.realname.indexOf(keyword.value) != -1)
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
        let data = item.data.filter((inItem) => inItem.realname.indexOf(keyword.value) != -1)
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

const handleClick = (index: string, data: any) => {
  paramsStore.setPageParams('personPage', { backRouteName: 'contacts', data })
  router.push({ name: 'personPage' })
}
const handleChange = ({ option }) => {
  conditionFilter.checked = option.key
  paging.value.reload()
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
    let { id, realname, avatar, username, phone, email, post, orgCodeTxt } = item
    //聊天通讯录把自己过滤掉
    if (username !== userStore.userInfo.username) {
      let pinYin = realname
      if (realname) {
        //TODO 判断汉字的位置
        if (/.*[\u4e00-\u9fa5]+.*$/.test(realname)) {
          pinYin = vPinyin.chineseToPinYin(realname)
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
        realname,
        avatar,
        username,
        phone,
        email,
        post,
        orgCodeTxt,
        szm: szm,
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
onLoad(() => {
  const tenantList = cache(TENANT_LIST) ?? []
  const result = tenantList?.map((item) => {
    return { key: item.id, title: item.name }
  })
  conditionFilter.options = [{ key: '', title: '全部' }, ...result]
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
