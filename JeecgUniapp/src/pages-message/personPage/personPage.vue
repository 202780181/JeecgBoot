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
    :backRouteName="backRouteName"
    navLeftText=""
    :navBgTransparent="true"
    :navFixed="true"
  >
    <view class="wrap">
      <view class="topArea"></view>
      <view class="middleArea bg-white">
        <wd-img
          custom-class="avatar"
          width="75px"
          height="75px"
          radius="50%"
          :src="data.avatar"
        ></wd-img>
        <wd-text custom-class="realname center" :text="data.realname"></wd-text>
        <wd-button custom-class="btn" @click="handleGo">发消息</wd-button>
      </view>
      <view class="bottomArea bg-white">
        <view class="list">
          <view class="iconBox">
            <view class="cuIcon-mobile text-gray-4"></view>
          </view>
          <view class="content" @click="handleClick">
            <view class="label text-gray-4">手机</view>
            <view class="value text-blue-5">{{ data.phone || '未填写' }}</view>
          </view>
        </view>
        <view class="list">
          <view class="iconBox">
            <view class="cuIcon-mail text-gray-4"></view>
          </view>
          <view class="content">
            <view class="label text-gray-4">邮箱</view>
            <view class="value text-blue-5 email">{{ data.email || '未填写' }}</view>
          </view>
        </view>
      </view>
    </view>
    <BottomOperate
      v-if="bottomOperatePopup.show"
      v-bind="bottomOperatePopup"
      @close="() => (bottomOperatePopup.show = false)"
      @change="handleChange"
    ></BottomOperate>
  </PageLayout>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { useUserStore } from '@/store/user'
import { useParamsStore } from '@/store/page-params'
import { useRouter } from '@/plugin/uni-mini-router'
import { isApp } from '@/utils/platform'
import { useMessage, useToast } from 'wot-design-uni'
//
const userStore = useUserStore()
const paramsStore = useParamsStore()
const router = useRouter()
const params = paramsStore.getPageParams('personPage')
const backRouteName = ref(params.backRouteName) ?? ''
let data = params.data ?? {}
const toast = useToast()
const options = [
  { key: 'call', label: '打电话' },
  { key: 'message', label: '发短信' },
  { key: 'add', label: '加入本地通讯录' },
]
const bottomOperatePopup = reactive({
  show: false,
  title: '',
  data: {},
  options: [],
})
const handleChange = ({ option }) => {
  const phone = data.phone
  if (['call'].includes(option.key)) {
    let platform = uni.getSystemInfoSync().platform
    switch (platform) {
      case 'android':
        uni.showActionSheet({
          itemList: [phone, '呼叫'],
          success: function (res) {
            if (res.tapIndex == 1) {
              plus.device.dial(phone, true)
            }
          },
          complete: function (res) {
            console.log('安卓失败', res)
          },
        })
        break
      case 'ios':
        //使用uni-app提供的借口
        uni.makePhoneCall({
          phoneNumber: phone,
        })
        break
      default:
        break
    }
    //导入Activity、Intent类
    //var Intent = plus.android.importClass("android.content.Intent");
    //var Uri = plus.android.importClass("android.net.Uri");
    //获取主Activity对象的实例
    //var main = plus.android.runtimeMainActivity();
    //创建Intent
    //var uri = Uri.parse("tel:"+phone); // 这里可修改电话号码
    //var call = new Intent("android.intent.action.CALL", uri);
    //调用startActivity方法拨打电话
    //main.startActivity(call);
  } else if (['message'].includes(option.key)) {
    //发短信
    //https://www.html5plus.org/doc/zh_cn/messaging.html
    let message = plus.messaging.createMessage(plus.messaging.TYPE_SMS)
    message.to = [phone] //这里数组中需要是字符串,否则ios会出现空白bug
    //message.body = "5011"
    plus.messaging.sendMessage(message)
  } else if (['add'].includes(option.key)) {
    //加入通讯录
    uni.addPhoneContact({
      nickName: '',
      lastName: '',
      firstName: data.realname,
      remark: '',
      mobilePhoneNumber: phone,
      weChatNumber: '',
      success: function () {
        console.log('success')
        toast.warning('添加成功~')
      },
      fail: function (err) {
        console.log('fail::',err)
        toast.warning('添加失败~')
      },
    })
  }
}
const handleClick = () => {
  if (isApp && data.phone) {
    bottomOperatePopup.options = options
    bottomOperatePopup.show = true
  }
}
const handleGo = () => {
  var parmas = {
    fromAvatar: data.avatar,
    fromUserName: data.realname || data.username,
    msgFrom: userStore.userInfo.userid,
    msgTo: data.id,
    type: 'friend',
  }
  paramsStore.setPageParams('chat', { back: 'personPage', routeMethod: 'replace', data: parmas })
  router.push({ name: 'chat' })
}
</script>

<style lang="scss" scoped>
//
.topArea {
  background: linear-gradient(45deg, #0081ff, #1cbbb4);
  min-height: 170px;
}
.middleArea {
  position: relative;
  display: flex;
  flex-direction: column;
  padding-bottom: 30px;
  :deep(.avatar) {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translate(-50%, -50%);
  }
  :deep(.realname) {
    padding-top: 50px;
    font-size: 18px;
    font-weight: 700;
    color: #333;
    margin-bottom: 20px;
  }
  :deep(.btn) {
    width: 60%;
    margin: 0 auto;
  }
}
.bottomArea {
  .list {
    border-top: 1px solid #f1f1f1;
    display: flex;
    align-items: center;
    padding: 10px;
    .iconBox {
      font-size: 28px;
      margin-right: 10px;
    }
    .label {
      font-size: 15px;
      margin-bottom: 4px;
    }
  }
  .value {
    color: #637eab;
    &.email {
      color: #939393;
    }
  }
}
</style>
