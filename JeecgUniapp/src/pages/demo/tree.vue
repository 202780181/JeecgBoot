<route lang="json5" type="page">
{
  layout: 'default',
  style: {
    navigationBarTitleText: '树示例',
    navigationStyle: 'custom',
    disableScroll: true, // 微信禁止页面滚动
    'app-plus': {
      bounce: 'none', // 禁用 iOS 弹性效果
    },
  },
}
</route>

<template>
  <PageLayout navTitle="树示例" backRouteName="demo">
    <view class="btnArea bg-white">
      <view class="group">
        <wd-button @click="doCheckedTree(['2'], true)">全选</wd-button>
        <wd-button @click="doCheckedTree(['2'], false)">取消全选</wd-button>
      </view>
      <view class="group">
        <wd-button @click="doExpandTree('all', true)">展开全部节点</wd-button>
        <wd-button @click="doExpandTree('all', false)">收起全部节点</wd-button>
      </view>
      <view class="group">
        <wd-button @click="doExpandTree(['22', '23'], true)">展开节点</wd-button>
        <wd-button @click="doExpandTree(['22', '23'], false)">收起节点</wd-button>
      </view>
      <view class="group">
        <wd-button @click="doCheckedTree(['211', '222'], true)">选中指定节点</wd-button>
        <wd-button @click="doCheckedTree(['211', '222'], false)">取消选中指定节点</wd-button>
      </view>
    </view>
    <scroll-view class="bg-gray-1" scroll-y>
      <view class="content p-2 mt-14px">
        <view class="title mt-5">多选</view>
        <DaTree
          ref="DaTreeRef"
          :data="roomTreeData"
          labelField="name"
          valueField="id"
          defaultExpandAll
          showCheckbox
          :defaultCheckedKeys="defaultCheckedKeysValue"
          @change="handleTreeChange"
          @expand="handleExpandChange"
        ></DaTree>
      </view>
      <view class="content p-2 mt-14px">
        <view class="title mt-5">单选</view>
        <DaTree
          :data="roomTreeData"
          labelField="name"
          valueField="id"
          defaultExpandAll
          :defaultCheckedKeys="defaultCheckedKeysValue2"
          @change="handleTreeChange"
          @expand="handleExpandChange"
        ></DaTree>
      </view>
      <view class="content p-2 mt-14px">
        <view class="title mt-5">默认展开指定节点</view>
        <DaTree
          :data="roomTreeData"
          labelField="name"
          valueField="id"
          showCheckbox
          :defaultExpandedKeys="defaultExpandKeysValue3"
          @change="handleTreeChange"
          @expand="handleExpandChange"
        ></DaTree>
      </view>
      <view class="content p-2 mt-14px mb-14px">
        <view class="title mt-5">异步加载数据</view>
        <DaTree
          :data="roomTreeData"
          labelField="name"
          valueField="id"
          showCheckbox
          loadMode
          :loadApi="GetApiData"
          defaultExpandAll
          @change="handleTreeChange"
          @expand="handleExpandChange"
        ></DaTree>
      </view>
    </scroll-view>
  </PageLayout>
</template>

<script lang="ts" setup>
//
import { defineComponent, ref } from 'vue'

/**
 * 模拟创建一个接口数据
 */
function GetApiData(currentNode) {
  const { key } = currentNode

  return new Promise((resolve) => {
    setTimeout(() => {
      // 模拟返回空数据
      if (key.indexOf('-') > -1) {
        return resolve(null)
        // return resolve([])
      }

      return resolve([
        {
          id: `${key}-1`,
          name: `行政部X${key}-1`,
        },
        {
          id: `${key}-2`,
          name: `财务部X${key}-2`,
          append: '定义了末项数据',
          leaf: true,
        },
        {
          id: `${key}-3`,
          name: `资源部X${key}-3`,
        },
        {
          id: `${key}-4`,
          name: `资源部X${key}-3`,
          append: '被禁用，无展开图标',
          disabled: true,
        },
      ])
    }, 2000)
  })
}

import DaTree from '@/uni_modules/da-tree/index.vue'
const DaTreeRef = ref()
// key的类型必须对应树数据key的类型
const defaultCheckedKeysValue = ref(['211', '222'])
const defaultCheckedKeysValue2 = ref('222')
const defaultExpandKeysValue3 = ref(['212', '231'])
const roomTreeData = ref([
  {
    id: '2',
    name: '行政中心',
    children: [
      {
        id: '21',
        name: '行政部',
        children: [
          {
            id: '211',
            name: '行政一部',
            children: null,
          },
          {
            id: '212',
            name: '行政二部',
            children: [],
            disabled: true,
          },
        ],
      },
      {
        id: '22',
        name: '财务部',
        children: [
          {
            id: '221',
            name: '财务一部',
            children: [],
            disabled: true,
          },
          {
            id: '222',
            name: '财务二部',
            children: [],
          },
        ],
      },
      {
        id: '23',
        name: '人力资源部',
        children: [
          {
            id: '231',
            name: '人力一部',
            children: [],
          },
          {
            id: '232',
            name: '人力二部',
            // append: '更多示例，请下载示例项目查看',
          },
        ],
      },
    ],
  },
])
function doExpandTree(keys, expand) {
  DaTreeRef.value?.setExpandedKeys(keys, expand)

  const gek = DaTreeRef.value?.getExpandedKeys()
  console.log('当前已展开的KEY ==>', gek)
}
function doCheckedTree(keys, checked) {
  DaTreeRef.value?.setCheckedKeys(keys, checked)

  const gek = DaTreeRef.value?.getCheckedKeys()
  console.log('当前已选中的KEY ==>', gek)
}
function handleTreeChange(allSelectedKeys, currentItem) {
  console.log('handleTreeChange ==>', allSelectedKeys, currentItem)
}
function handleExpandChange(expand, currentItem) {
  console.log('handleExpandChange ==>', expand, currentItem)
}
</script>

<style lang="scss" scoped>
//
.btnArea {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 10px;
  .group {
    margin-bottom: 10px;
  }
  :deep(.wd-button) {
    margin: 0 5px;
  }
}
.content {
  background-color: #fff;
  .title {
    font-size: 15px;
  }
}
</style>
