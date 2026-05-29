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
  <PageLayout navTitle="定位" backRouteName="people" routeMethod="pushTab">
    <map
      style="width: 100%; height: 100%"
      :latitude="latitude"
      :longitude="longitude"
      :markers="marker"
      :scale="scale"
    ></map>
  </PageLayout>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { onShow, onHide, onLoad, onReady } from '@dcloudio/uni-app' 

const latitude = ref(40.009704)
const longitude = ref(116.374999)
const marker = reactive([
  {
    id: 0,
    latitude: latitude.value, //纬度
    longitude: longitude.value, //经度
    iconPath: '/static/location.png', //显示的图标
    rotate: 0, // 旋转度数
    width: 20, //宽
    height: 20, //高
    title: '你在哪了', //标注点名
    alpha: 0.5, //透明度
    /* label:{//为标记点旁边增加标签   //因背景颜色H5不支持
				  　　 content:'北京国炬公司',//文本
				　　　 color:'red',//文本颜色
					　 fontSize:24,//文字大小
					   x:5,//label的坐标，原点是 marker 对应的经纬度
					   y:1,//label的坐标，原点是 marker 对应的经纬度 
					   borderWidth:12,//边框宽度
					   borderColor:'pink',//边框颜色    
					　 borderRadius:20,//边框圆角                        
					　 bgColor:'black',//背景色
					　 padding:5,//文本边缘留白
					   textAlign:'right'//文本对齐方式。
			   }, */
    callout: {
      //自定义标记点上方的气泡窗口 点击有效
      content: '北京国炬公司', //文本
      color: '#ffffff', //文字颜色
      fontSize: 14, //文本大小
      borderRadius: 2, //边框圆角
      bgColor: '#00c16f', //背景颜色
      display: 'ALWAYS', //常显
    },
    // anchor:{//经纬度在标注图标的锚点，默认底边中点
    //     x:0,    原点为给出的经纬度
    //     y:0,
    // }
  },
])
const scale = 16

const getLocation = () => {
  uni.getLocation({
    type: 'gcj02',
    success: function (res) {
      console.log('当前位置的经度：' + res.longitude)
      console.log('当前位置的纬度：' + res.latitude)
    },
    fail: function (res) {
      console.log('当前位置的经度')
    },
  })
}
onLoad(() => {
  getLocation()
})
</script>

<style lang="scss" scoped>
//
</style>
