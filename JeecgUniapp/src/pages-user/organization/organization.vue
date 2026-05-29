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
    navTitle="切换租户和部门"
    backRouteName="people"
    routeMethod="pushTab"
  >
    <wd-form custom-class="pt3" ref="form" :model="model" v-if="isMultiTenant || isMultiDepart">
      <wd-cell-group border>
        <wd-select-picker
            v-if="isMultiTenant"
            label="租户"
            filterable
            type="radio"
            v-model="model.tenantId"
            :columns="tenantColumns"
            placeholder="请选择租户"
            size="large"
            :show-confirm="false"
            :safe-area-inset-bottom="false"
        ></wd-select-picker>
        <wd-select-picker
            v-if="isMultiDepart"
            label="部门"
            type="radio"
            filterable
            v-model="model.departId"
            :columns="deptColumns"
            placeholder="请选择部门"
            size="large"
            :show-confirm="false"
            :safe-area-inset-bottom="false"
        ></wd-select-picker>
      </wd-cell-group>
      <view class="footer p5">
        <wd-button type="primary" @click="handleSubmit" block>提交</wd-button>
      </view>
    </wd-form>
    <view v-else>
      <wd-status-tip image="content" tip="暂无部门和租户配置" />
    </view>
  </PageLayout>
</template>

<script lang="ts" setup>
import { http } from '@/utils/http'
import { useToast, useMessage, useNotify, dayjs } from 'wot-design-uni'
import { useRouter } from '@/plugin/uni-mini-router'
import { useUserStore } from '@/store/user'

defineOptions({
  name: 'organization',
  options: {
    styleIsolation: 'shared',
  },
})
const toast = useToast();
const router = useRouter();
const userStore = useUserStore();

const isMultiTenant = ref(false);
const tenantColumns =  ref([])

const isMultiDepart = ref(false);
const deptColumns = ref([])

const model = ref({
  tenantId:0,
  departId:""
})
/**
 *加载部门信息
 */
async function loadDepartList() {
  const res:any = await http.get("/sys/user/getCurrentUserDeparts");
  let { result } = res;
  if (!result.list || result.list.length == 0) {
    return;
  }
  console.log("loadTenantList ***  deptColumns.value", deptColumns.value);
  deptColumns.value = result.list.map(item=>{
    return {
      label:item.departName,
      value:item.orgCode
    }
  });;
  model.value.departId = result.orgCode;
  isMultiDepart.value = true;
}

/**
 *加载租户信息
 */
async function loadTenantList() {
  const res:any = await http.get("/sys/tenant/getCurrentUserTenant");
  let { result } = res;
  if (!result.list || result.list.length == 0) {
    return;
  }
  tenantColumns.value = result.list.map(item=>{
    return {
      label:item.name,
      value:item.id
    }
  });
  model.value.tenantId = userStore.userInfo.tenantId as any;
  isMultiTenant.value = true;
}

/**
 *提交表单
 */
async function handleSubmit() {
  departResolve()
      .then(() => {
        let originalTenant = userStore.getTenant();
        if (unref(isMultiTenant) && originalTenant != unref(model).tenantId) {
          const data = http.put("/sys/user/changeLoginTenantId",{loginTenantId: unref(model).tenantId })
          userStore.setTenant(unref(model).tenantId);
        }
        toast.success('切换成功');
      })
      .catch((e) => {
        console.log('登录选择出现问题', e);
      })
}

/**
 *切换选择部门
 */
function departResolve() {
  return new Promise(async (resolve, reject) => {
    if (!unref(isMultiDepart)) {
      resolve(true);
    } else {
      const res:any = await http.put('/sys/selectDepart',{
        username: userStore.userInfo.username,
        orgCode: model.value.departId,
        loginTenantId: model.value.tenantId,
      });
      if (res.success && res.result.userInfo) {
        const userInfo =  res.result.userInfo;
        let currentUserInfo = userStore.getUserInfo();
        userStore.setUserInfo(Object.assign(currentUserInfo,userInfo));
        resolve(true);
      } else {
        reject();
      }
    }
  });
}
onMounted(async ()=>{
  //加载部门
  await loadDepartList();
  //加载租户
  await loadTenantList();
})
</script>

<style lang="scss" scoped>

</style>
