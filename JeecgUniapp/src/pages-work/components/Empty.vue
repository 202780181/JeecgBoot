<template>
	<view class="empty-container">
		<image class="img" src="/static/nocontent-1.png"></image>
		<view class="text-center text-bold">
			{{title}}
		</view>
	</view>
</template>

<script setup>
const props = defineProps({
	title:{
		type:String,
		default:"暂无数据"
	}
})
</script>

<style lang="scss" scoped>
.empty-container{
	height: 100%;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	.img {max-width: 240upx;max-height: 240upx;}
}
</style>
