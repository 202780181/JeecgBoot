<template>
	<view :style="[{backgroundColor:backgroundColor}]">
		<map
      v-if="latitude && longitude"
      class="map-content"
			:latitude="latitude"
			:longitude="longitude"
			:markers="marker"
			:scale="scale"
			:circles="circles"
		>
		</map>
	</view>
</template>

<script setup>

 import useGeo from '@/hooks/useGeoPosition'
  // 定义 props
  const props = defineProps({
    compLatitude: {
      type: Number,
      default: 40.009390,
      required: false
    },
    compLongitude: {
      type: Number,
      default: 116.374322,
      required: false
    }
  });
 const emit = defineEmits(['success','fail']);
 const backgroundColor = 'transparent';
 // 引入地理定位逻辑
 let [{inCircle,getAddress,getMyAddress,latitude,longitude,marker,scale,circles},{refreshLocation}] = useGeo({ compLatitude: props.compLatitude, compLongitude: props.compLongitude }, emit);

  defineExpose({
    inCircle,
    getAddress,
    getMyAddress,
    refreshLocation
  });
</script>
<style lang="scss" scoped>
.map-content {
  width: 100%;
  height: 250px;
}
</style>
