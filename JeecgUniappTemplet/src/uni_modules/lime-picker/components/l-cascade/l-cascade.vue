<template>
	<l-picker
		v-model="innerValue"
		:cancelBtn="cancelBtn" 
		:cancelStyle="cancelStyle" 
		:confirmBtn="confirmBtn"
		:confirmStyle="confirmStyle" 
		:title="title" 
		:titleStyle="titleStyle" 
		:loading="loading"
		:loadingColor="loadingColor" 
		:loadingMaskColor="loadingMaskColor" 
		:loadingSize="loadingSize"
		:itemHeight="itemHeight" 
		:itemColor="itemColor" 
		:itemFontSize="itemFontSize" 
		:itemActiveColor="itemActiveColor"
		:indicatorStyle="indicatorStyle" 
		:bgColor="bgColor" 
		:groupHeight="groupHeight" 
		:radius="radius"
		:resetIndex="resetIndex" 
		:columns="innerColumns" 
		@cancel="onCancel" 
		@confirm="onConfirm" 
		@pick="onPick">
	</l-picker>
</template>

<script lang="ts">
	// @ts-nocheck
	import { defineComponent, ref, computed} from '@/uni_modules/lime-shared/vue';
	import { PickerValue, PickerColumn, PickerColumnItem, PickerPickEvent} from '../l-picker/type';
	import { CascadeProps } from './type';
	import { parseKeys, formatCascadeColumns } from './utils';
	import cascadeProps from '../l-picker/props';
	export default defineComponent({
		name: 'l-cascade', 
		props:cascadeProps,
		emits: ['change', 'cancel', 'pick', 'confirm', 'update:modelValue', 'update:value', 'input'],
		setup(props, {emit}) {
			type UTSJSONObject = Record<string, any>
			
			const keys = parseKeys(props.keys)
			const curValueArray = ref(props.value || props.modelValue || props.defaultValue||[]);
			const innerValue = computed({
				set(value: PickerValue[]) {
					curValueArray.value = value;
					emit('update:modelValue', value)
					// #ifdef VUE2
					emit('input', value)
					// #endif
				},
				get(): PickerValue[]{
					return props.value || props.modelValue || curValueArray.value
				}
			} as WritableComputedOptions<PickerValue[]>)
			
			
			const innerColumns = computed((): PickerColumn[] => {
				return formatCascadeColumns(props.columns, keys, innerValue)
			})
			
			const onPick = ({values, column, index} : PickerPickEvent) => {
				innerValue.value = values
			}
			
			const onConfirm = (options: PickerConfirmEvent) => {
				emit('confirm', options)
			}
			const onCancel = () => {
				emit('cancel')
			}
			
			return {
				innerValue,
				innerColumns,
				onPick,
				onConfirm,
				onCancel
			}
		}
	})
	
	
</script>

<style>

</style>