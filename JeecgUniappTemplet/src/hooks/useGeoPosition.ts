import { geoDistance } from '@/common/uitls'
// #ifdef MP-WEIXIN || APP-PLUS
import amap from '@/common/js-sdk/js-amap/amap-wx'
// #endif

// #ifdef H5
import H5Map from '@/common/js-sdk/js-amap/amap-h5'
// #endif

export default function useGeo<T>({ compLatitude, compLongitude }, emit?) {
  // 定义响应式数据
  const amapPlugin = ref(null)
  //高德地图微信key
  const wxMapKey = import.meta.env.VITE_GD_MAP_KEY__WEIXIN
  console.log('wxMapKey', wxMapKey)
  //打卡距离
  const distance = ref(0)
  //地址
  const address = ref('')
  //纬度
  const latitude = ref(compLatitude)
  //经度
  const longitude = ref(compLongitude)
  //地图缩放程度
  const scale = ref(16)
  //地图标记
  const marker = ref([])
  //在地图上显示圆
  const circles = ref([
    {
      latitude: compLatitude,
      longitude: compLongitude,
      radius: 80,
      fillColor: '#ffffffAA',
      color: '#55aaffAA',
      strokeWidth: 1,
    },
  ])
  //地图配置
  const resAmap = ref(null)

  // 在打卡范围内
  const inCircle = () => {
    return distance.value <= 80
  }

  //刷新定位
  const refreshLocation = () => {
    // #ifdef MP-WEIXIN
    getAuthorizeInfo()
    // #endif

    // #ifdef APP-PLUS
    getLocationInfo()
    // #endif

    // #ifdef H5
    initH5Map()
    // #endif
  }
  /**
   * 权限提示
   */
  const getAuthorizeInfo = () => {
    //1. uniapp弹窗弹出获取授权（地理，个人微信信息等授权信息）弹窗
    uni.authorize({
      scope: 'scope.userLocation',
      success() {
        //1.1 允许授权
        getLocationInfo()
      },
      fail() {
        console.log('你拒绝了授权，无法获得周边信息')
        openConfirm()
      },
    })
  }

  const getLocationInfo = () => {
    uni.showLoading({
      title: '定位中...',
      mask: true,
    })
    amapPlugin.value.getRegeo({
      type: 'gcj02',
      success: function (res) {
        setTimeout(() => {
          uni.hideLoading()
        }, 2000)
        latitude.value = res[0].latitude
        longitude.value = res[0].longitude
        address.value = res[0].name + res[0].desc
        distance.value = geoDistance(longitude.value, latitude.value, compLongitude, compLatitude)
        console.log('getLocationInfoWx***distance>>>', distance.value)
        let tipTextVal = (distance.value > 80 ? '不在' : '已在') + '打卡范围'
        let bgColorVal = distance.value > 80 ? '#ff0000' : '#00c16f'
        let markerVal = {
          id: 0,
          latitude: latitude.value,
          longitude: longitude.value,
          iconPath: '/static/location.png',
          width: 35,
          height: 35,
          // #ifdef MP-WEIXIN
          //为标记点旁边增加标签
          label: {
            content: tipTextVal, //文本
            color: '#ffffff', //文本颜色
            fontSize: 14, //文字大小
            borderWidth: 2, //边框宽度
            borderColor: bgColorVal, //边框颜色
            bgColor: bgColorVal, //背景颜色
            borderRadius: 2, //边框圆角
            padding: 5, //文本边缘留白
            textAlign: 'center', //文本对齐方式
            x: 0, //label的坐标，原点是 marker 对应的经纬度
            y: 0, //label的坐标，原点是 marker 对应的经纬度
          },
          // #endif

          // #ifdef APP-PLUS
          //自定义标记点上方的气泡窗口 点击有效
          callout: {
            content: tipTextVal, //文本
            color: '#ffffff', //文字颜色
            fontSize: 14, //文本大小
            bgColor: bgColorVal, //背景颜色
            display: 'ALWAYS', //常显
            textAlign: 'center',
          },
          // #endif
        }
        marker.value = [markerVal]
        emit && emit('success', {})
      },
      fail: (res) => {
        emit && emit('fail', res)
        setTimeout(() => {
          uni.hideLoading()
        }, 2000)
      },
    })
    //TODO  h5端可能因为非https域名会导致一直处在定位中的状态，因此设置10s后清除加载状态
    setTimeout(() => {
      uni.hideLoading()
    }, 10000)
  }
  /**
   * 获取地理授权
   */
  const openConfirm = () => {
    uni.showModal({
      title: '请求授权当前位置',
      content: '需要获取您的地理位置，请确认授权',
      success: (res) => {
        if (res.confirm) {
          uni.openSetting()
        } else if (res.cancel) {
          uni.showToast({
            title: '你拒绝了授权，无法获得位置信息',
            icon: 'none',
            duration: 1000,
          })
        }
      },
    })
  }
  /**
   * 获取地理位置信息
   */
  const getMyAddress = computed(()=>{
    return address.value
  })
  /**
   * 根据坐标返回地址(逆地理编码)
   * @param points
   * @returns {Promise<void>}
   */
  const getAddress = async (points) => {
    try {
      resAmap.value = await H5Map()
      resAmap.value.plugin('AMap.Geocoder', () => {
        const geocoder = new resAmap.value.Geocoder({
          radius: 1000,
        })
        geocoder.getAddress(points, (status, result) => {
          if (status === 'complete' && result.regeocode.formattedAddress) {
            address.value = result.regeocode.formattedAddress
          }
        })
      })
    } catch (e) {
      console.log(e)
    }
  }

  // #ifdef H5
  const initH5Map = async () => {
    try {
      uni.showLoading({
        title: '定位中...',
        mask: true,
      })
      setTimeout(() => {
        uni.hideLoading()
      }, 10000)
      resAmap.value = await H5Map()
      resAmap.value.plugin('AMap.Geolocation', () => {
        const geolocation = new resAmap.value.Geolocation({
          enableHighAccuracy: true,
          timeout: 10000,
          buttonPosition: 'RB',
          zoomToAccuracy: true,
        })
        geolocation.getCurrentPosition(function (status, result) {
          if (status == 'complete') {
            onComplete(result)
          } else {
            onError(result)
          }
        })
      })

      const onComplete = (data) => {
        console.log('H5高德定位', data)
        console.log('当前位置的经度：' + data.position.lat)
        console.log('当前位置的纬度：' + data.position.lng)
        distance.value = geoDistance(
          data.position.lng,
          data.position.lat,
          compLongitude,
          compLatitude,
        )
        console.log('打卡距离distance.value：' + distance.value)
        let tipTextVal = (distance.value > 80 ? '未在' : '已在') + '打卡范围内'
        let bgColorVal = distance.value > 80 ? '#ff0000' : '#00c16f'
        longitude.value = data.position.lng
        latitude.value = data.position.lat
        address.value = data?.formattedAddress
        let markerVal = {
          latitude: latitude.value,
          longitude: longitude.value,
          iconPath: '/static/location.png',
          callout: {
            content: tipTextVal,
            color: '#ffffff',
            fontSize: 14,
            borderRadius: 2,
            bgColor: bgColorVal,
            display: 'BYCLICK',
          },
        }
        marker.value = [markerVal]
        uni.hideLoading()
        getAddress([longitude.value, latitude.value])
        emit && emit('success', {})
      }

      const onError = (data) => {
        console.log(data)
        emit && emit('fail', data)
      }
    } catch (e) {
      console.log(e)
      uni.hideLoading()
    }
  }
  // #endif
  onBeforeMount(() => {
    // #ifdef MP-WEIXIN || APP-PLUS
    amapPlugin.value = new amap.AMapWX({
      key: wxMapKey,
    })
    // #endif
  })
  // 生命周期钩子函数
  onMounted(() => {
    // #ifdef MP-WEIXIN
    getAuthorizeInfo()
    // #endif

    // #ifdef H5
    initH5Map()
    // #endif

    // #ifdef APP-PLUS
    getLocationInfo()
    // #endif
  })

  return [
    { inCircle, distance, getAddress,getMyAddress,latitude,longitude,marker,scale,circles },
    { getAuthorizeInfo, getLocationInfo,refreshLocation },
  ]
}
