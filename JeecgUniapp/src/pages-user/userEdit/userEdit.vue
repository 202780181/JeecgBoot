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
  <PageLayout navTitle="编辑资料" backRouteName="userDetail">
    <wd-form custom-class="pt3" ref="form" :model="model">
      <wd-cell-group border>
        <wd-input
          label="姓名："
          prop="realname"
          clearable
          label-width="70px"
          v-model="model.realname"
          placeholder="请输入姓名"
          :rules="[{ validator: rules.realname }]"
        />
        <wd-input
          label="用户名："
          prop="username"
          clearable
          label-width="70px"
          v-model="model.username"
          :readonly="true"
          placeholder="请输入用户名"
        />
        <wd-cell title="头像：">
          <avatar v-model="model.avatar"></avatar>
        </wd-cell>
        <view class="pt15px pb15px">
          <wd-select-picker
            label="性别："
            type="radio"
            v-model="model.sex"
            :columns="columns"
            title="请选择性别"
            :safe-area-inset-bottom="false"
          ></wd-select-picker>
        </view>
        <view class="phone">
          <wd-input
            label="手机号："
            prop="phone"
            clearable
            label-width="70px"
            v-model="model.phone"
            placeholder="请输入手机号"
            :rules="[{ validator: rules.phone }]"
          />
          <view class="box">
            <view class="num">+86</view>
            <view class="text">中国大陆</view>
          </view>
        </view>
        <wd-input
          label="邮箱："
          prop="email"
          clearable
          label-width="70px"
          v-model="model.email"
          placeholder="请输入邮箱"
          :rules="[{ validator: rules.email }]"
        />
      </wd-cell-group>
      <view class="footer p5">
        <wd-button type="primary" size="large" @click="handleSubmit" block>提交</wd-button>
      </view>
    </wd-form>
  </PageLayout>
</template>

<script lang="ts" setup>
import { http } from '@/utils/http'
import { useToast, useMessage, useNotify, dayjs } from 'wot-design-uni'
import { useRouter } from '@/plugin/uni-mini-router'
import { useUserStore } from '@/store/user'
import avatar from './components/avatar.vue'
import { getFileAccessHttpUrl } from '@/common/uitls'

defineOptions({
  name: 'chatList',
  options: {
    styleIsolation: 'shared',
  },
})
const toast = useToast()
const router = useRouter()
const userStore = useUserStore()
const columns = [
  { label: '男', value: 1 },
  { label: '女', value: 2 },
]
const model = reactive({
  username: userStore.userInfo.username,
  realname: userStore.userInfo.realname,
  avatar: getFileAccessHttpUrl(userStore.userInfo.avatar),
  sex: userStore.userInfo.sex ?? 1,
  phone: userStore.userInfo.phone,
  email: userStore.userInfo.email,
})
const rules = {
  realname: (value) => {
    if (value?.trim()?.length) {
      return true
    } else {
      toast.warning('请输入名称')
      return false
    }
  },
  phone: (value) => {
    if (value?.trim()?.length) {
      if (/^1[3-9]\d{9}$/.test(value)) {
        return true
      } else {
        toast.warning('请输入正确的手机号')
        return false
      }
    } else {
      toast.warning('请输入手机号')
      return false
    }
  },
  email: (value) => {
    if (value?.trim()?.length) {
      if (/^[a-zA-Z0-9_%+-]+(\.[a-zA-Z0-9_%+-]+)*@([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/.test(value)) {
        return true
      } else {
        toast.warning('请输入正确的邮箱')
        return false
      }
    } else {
      toast.warning('请输入邮箱')
      return false
    }
  },
}
const form = ref()

function handleSubmit() {
  form.value
    .validate()
    .then(({ valid, errors }) => {
      if (valid) {
        if (!model.avatar) {
          toast.warning('上传头像')
          return
        }
        // toast.success('校验通过')
        const data = { ...model, id: userStore.userInfo.userid }
        delete data.username
        uni.showLoading()
        http
          .post('/sys/user/login/setting/userEdit', { ...data })
          .then((res: any) => {
            uni.hideLoading()
            if (res.success) {
              toast.success('修改成功~')
              setTimeout(() => {
                userStore.editUserInfo({ ...data })
                router.replaceAll({ name: 'people' })
              }, 1e3)
            } else {
              toast.warning(res.message)
            }
          })
          .catch(() => {
            toast.error('提交失败')
            uni.hideLoading()
          })
      }
    })
    .catch((error) => {
      console.log(error, 'error')
    })
}
</script>

<style lang="scss" scoped>
//
:deep(.wd-cell-group) {
  --wot-input-color: var(--color-grey);
  --wot-cell-value-color: var(--color-grey);
  background-color: transparent !important;
  --wot-cell-title-color: var(--UI-FG-0);
  .wd-input__label {
    --wot-cell-title-color: var(--UI-FG-0);
  }
  .wd-cell__left {
    color: var(--UI-FG-0);
  }
  .wd-select-picker__cell {
    --wot-cell-wrapper-padding: 14px;
  }
  .wd-select-picker {
    // margin: 15px 0;
  }
  .wd-cell-group__body {
    background-color: transparent;
  }
}
:deep(.wd-cell) {
  .wd-cell__wrapper {
    align-items: center;
  }
  .wd-cell__left {
    display: flex;
    align-items: center;
    width: 70px;
    flex: none;
  }
  .wd-cell__value {
    text-align: left;
  }
}
.phone {
  display: flex;
  align-items: center;
  background-color: #fff;
  .wd-input {
    flex: 1;
  }
  .box {
    margin-left: 10px;
    margin-right: 15px;
    display: flex;
    align-items: center;
    .num {
      color: #fff;
      background-color: var(--wot-color-theme);
      border-top-left-radius: 3px;
      border-bottom-left-radius: 3px;
      font-size: 12px;
      height: 24px;
      line-height: 24px;
      padding: 0 8px;
    }
    .text {
      position: relative;
      color: var(--wot-color-theme);
      font-size: 12px;
      height: 24px;
      line-height: 24px;
      padding: 0 8px;
      border-top-right-radius: 6px;
      border-bottom-right-radius: 6px;
      min-width: 70px;
      &::before {
        content: ' ';
        width: 200%;
        height: 200%;
        position: absolute;
        top: 0;
        left: 0;
        border: 1px solid currentColor;
        -webkit-transform: scale(0.5);
        transform: scale(0.5);
        -webkit-transform-origin: 0 0;
        transform-origin: 0 0;
        box-sizing: border-box;
        border-radius: inherit;
        z-index: 1;
        pointer-events: none;
      }
    }
  }
}
</style>
