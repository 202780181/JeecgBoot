<template>
	<view class="l-class l-loading" :class="['l-loading--' + type, {'is-vertical': vertical}]" :style="{color: inheritColor ? 'inherit': ''}">
		<!-- #ifdef APP-NVUE -->
		<loading-indicator class="l-loading__circular" :style="[spinnerStyle]" :animating="true"/>
		<!-- #endif -->
		<!-- #ifndef APP-NVUE -->
		<view class="l-loading__ball" v-if="type == 'ball'" :style="[spinnerStyle]"></view>
		<view class="l-loading__circular" v-if="type == 'circular'" :style="[spinnerStyle]"></view>
		<view class="l-loading__spinner" v-if="type == 'spinner'" :style="[spinnerStyle]">
			<view class="l-loading__dot" v-for="item in 12" :key="item" :style="{'--l-loading-dot': item}"></view>
		</view>
		<!-- #endif -->
		<text class="l-loading__text" v-if="$slots['default']||text" :style="[textStyle]">
			{{text}}<slot></slot>
		</text>
	</view>
</template>
<script lang="ts">
	import {computed, defineComponent} from '@/uni_modules/lime-shared/vue';
	import {addUnit} from '@/uni_modules/lime-shared/addUnit';
	import {unitConvert} from '@/uni_modules/lime-shared/unitConvert';
	import LoadingProps from './props';
	const name = 'l-loading';
	/**
	 * LimeLoading 加载
	 * @description 加载
	 * @tutorial https://ext.dcloud.net.cn/plugin?name=lime-loading
	 * @property {String} color loading颜色
	 * @property {String} type loading类型，默认circular
	 * @value circular 圆环
	 * @value spinner  菊花
	 * @property {String} size 尺寸
	 * @property {String} text 文案 
	 * @property {String} textColor 文案颜色
	 * @property {String} textSize 文案字体大小 
	 * @property {Boolean} vertical 是否垂直
	 * @property {Boolean} inheritColor 是否继续颜色
	 */
	export default defineComponent({
		name,
		props:LoadingProps,
		setup(props) {
			const classes = computed(() => {
				const {type, vertical} = props
				return {
					[name + '--' + type]: type,
					['is-vertical']: vertical,
				}
			})
			const spinnerStyle = computed(() => {
				const size = unitConvert(props.size ?? 0) * (props.type == 'ball' ? 0.6 : 1);
				return {
					color: props.color,
					width: size != 0 && (props.type == 'ball' ? addUnit(size * 2.1) : addUnit(size)),
					height: size != 0 && addUnit(size),
					'--l-loadding-ball-size': size != 0 && addUnit(size)
				}
			})
			const textStyle = computed(() => {
				return {
					color: props.textColor,
					fontSize: props.textSize,
				}
			})
			return {
				classes,
				spinnerStyle,
				textStyle
			}
		}
	})
</script>

<style lang="scss">
	@import './index.scss';
</style>