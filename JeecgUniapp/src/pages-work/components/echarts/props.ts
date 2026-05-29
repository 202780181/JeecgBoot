
/**
 * echart图表props
 */
export const echartProps = {
    i: {
        type: [String,Number],
        default: ''
    },
	id: {
	    type: String,
	    default: ''
	},
    config: {
        type: Object,
        default: () => ({} as any),
    },
    height:{
        type: Number,
    },
    compName:{
        type: String,
        default: ''
    },
    horizontal:{
        type: Boolean,
        default: false
    },
    appId:{
        type: String,
        default: ''
    },
    size: {
        type: Object,
        default: () => {
        }
    },
    params: {
        type: Object,
        default: () => {
        }
    },
    pid: {
        type: String,
        default: ''
    },
    tabId: {
        type: String,
        default: ''
    },
}
