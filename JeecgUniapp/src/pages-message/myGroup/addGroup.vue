<route lang="json5" type="page">
{
  layout: 'default',
  style: {
    navigationBarTitleText: '创建群组',
    navigationStyle: 'custom',
    disableScroll: true, // 微信禁止页面滚动
    'app-plus': {
      bounce: 'none', // 禁用 iOS 弹性效果
    },
  },
}
</route>

<template>
  <PageLayout navTitle="创建群组" backRouteName="myGroup">
    <view class="add-group-container">
      <view class="avatar-section">
        <view class="avatar-wrapper" @click="handleUploadAvatar">
          <wd-img
            v-if="groupAvatar"
            width="80px"
            radius="50%"
            height="80px"
            :src="groupAvatar"
          ></wd-img>
          <view v-else class="avatar-upload cuIcon-cameraadd"></view>
        </view>
      </view>

      <wd-form ref="form" :model="formData">
        <wd-cell-group border class="mt-10px mb-10px">
          <wd-input
            label="群组名称"
            label-width="80px"
            prop="groupName"
            clearable
            v-model="formData.groupName"
            placeholder="输入群组名称"
            :rules="[{ required: true, message: '请填写群组名称' }]"
          />
          <wd-input
            label="群组公告"
            label-width="80px"
            prop="groupIntroduce"
            clearable
            v-model="formData.groupIntroduce"
            placeholder="输入群组公告"
            :rows="3"
          />
        </wd-cell-group>
      </wd-form>

      <view class="footer">
        <wd-button type="primary" size="large" @click="handleSubmit" block>创建群组</wd-button>
      </view>
    </view>
  </PageLayout>
</template>

<script lang="ts" setup>
import { ref, reactive } from 'vue'
import { onShow, onHide, onLoad, onReady } from '@dcloudio/uni-app'
import { useMessage, useToast } from 'wot-design-uni'
import { useRouter } from '@/plugin/uni-mini-router'
import { useUserStore } from '@/store/user'
import { http } from '@/utils/http'
import { useParamsStore } from '@/store/page-params'
import { getEnvBaseUrl } from '@/utils/index'
import { cache, getFileAccessHttpUrl, hasRoute } from '@/common/uitls'
defineOptions({
  name: 'AddGroup',
  options: {
    styleIsolation: 'shared',
  },
})
const router = useRouter()
const paramsStore = useParamsStore()
const userStore = useUserStore()
const toast = useToast()
const message = useMessage()
const form = ref()
const groupAvatar = ref()
let stopWatch: any = null

const formData = reactive({
  groupName: '',
  groupIntroduce: '',
})
const handleUploadAvatar = (params) => {
  const { loading, data, error, run } = useUpload(
    { name: 'file' },
    { url: `${getEnvBaseUrl()}/sys/common/upload` },
  )
  if (stopWatch) stopWatch()
  run()
  stopWatch = watch(
    () => [loading.value, error.value, data.value],
    ([loading, err, data], oldValue) => {
      if (loading == false) {
        if (err) {
          // toast.warning('上传图片失败~')
        } else {
          // @ts-ignore
          groupAvatar.value = getFileAccessHttpUrl(data.message)
          // toast.success('上传图片成功~')
        }
      }
    },
  )
}
function handleSubmit() {
  form.value
    .validate()
    .then(({ valid, errors }) => {
      if (valid) {
        http
          .post(`/eoa/im/newApi/creatGroupSession`, {
            avatar: groupAvatar.value,
            groupIntroduce: formData.groupIntroduce,
            groupName: formData.groupName,
            type: 'group',
          })
          .then((res: any) => {
            if (res.success) {
              const { result } = res
              paramsStore.setPageParams('groupPage', {
                backRouteName: 'myGroup',
                data: {
                  groupId: result.msgTo,
                  groupName: result.fromUserName,
                  avatar: groupAvatar.value,
                },
              })
              router.push({ name: 'groupPage' })
              uni.$emit('myGroup:reload')
            } else {
              toast.warning(res.message)
            }
          })
      }
    })
    .catch((error) => {
      console.log(error, 'error')
      message.alert('表单验证失败')
    })
}
</script>

<style lang="scss" scoped>
.add-group-container {
  display: flex;
  flex-direction: column;
  height: 100%;

  .avatar-section {
    padding: 80px 0;
    display: flex;
    justify-content: center;
    background-image: linear-gradient(180deg, #0081ff, #1cbbb4);

    .avatar-wrapper {
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .avatar-upload {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background-color: rgba(0, 0, 0, 0.3);
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      font-size: 40px;
      color: #fff;
    }
  }

  .footer {
    margin: 20px;
    padding-bottom: calc(env(safe-area-inset-bottom) + 10px);
  }
}
</style>
