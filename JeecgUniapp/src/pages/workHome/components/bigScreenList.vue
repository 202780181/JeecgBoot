<template>
  <z-paging ref="paging" :fixed="false" v-model="dataList" @query="queryList">
	<wd-row class="list-ul">
	  <wd-col  class="list-li" :span="6"  v-for="(item, index) in dataList" :key="index" @click="handleGo(item)">
		  <div class="li-img" @click="handleGo(item)"  :style="[{backgroundColor: getRandomColor()}]">
		    <wd-icon name="chart" size="22px" />
		  </div>
		  <div class="li-text">{{ item.name }}</div>
	  </wd-col>
	</wd-row>
  </z-paging>
  <wd-toast />
</template>

<script setup lang="ts">
import { http } from '@/utils/http'
import { useToast } from 'wot-design-uni'
import { useRouter } from '@/plugin/uni-mini-router'
import {getRandomColor} from '@/common/uitls'
import { useParamsStore } from '@/store/page-params'

defineOptions({
  name: 'bigScreenList',
  options: {
    styleIsolation: 'shared',
  },
})
const toast = useToast()
const router = useRouter()
const paramsStore = useParamsStore()
const paging = ref(null)
const dataList = ref([])

const queryList = (pageNo, pageSize) => {
  http
    .get('/drag/page/list', {
      izTemplate: 0,
	  pageNo,
	  pageSize,
      style: 'bigScreen'
    })
    .then((res: any) => {
      if (res.success) {
        paging.value.complete(res.result.records)
      } else {
        paging.value.complete(false)
      }
    })
    .catch((res) => {
      paging.value.complete(false)
    })
}


// 跳转
const handleGo = (item) => {
  console.log("handleGo",item);
  uni.navigateTo({
	  url: '/pages-work/dragPage/index?id=' + item.id,
	})
}
</script>

<style lang="scss" scoped>
.z-paging-content {
  background-color: #f1f1f1;
}

:deep(.wd-row) {
  display: flex;
  flex-wrap: wrap;
  list-style-type: none;
  background-color: #ffffff;

  .wd-col{
	  padding: 10px;
	  min-width: 80px;
	  display: flex;
	  flex-direction: column;
	  align-items: center;

	  .li-img {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 80upx;
		height: 80upx;
		background-color: #00bcd4;
		border-radius: 100%;
		color: #fff;
	  }

	  .li-text {
		color: #000;
		margin-top: 6px;
		text-align: center;
		font-size: 12px;
		width: 120upx; /* 设置元素宽度 */
		white-space: nowrap; /* 禁止文本换行 */
		overflow: hidden; /* 隐藏超出部分 */
		text-overflow: ellipsis; /* 超出部分显示为省略号 */
	  }
  }
}
</style>
