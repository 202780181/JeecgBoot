//仪表盘组件
export const compList = [
 	"JBar",
 	"JDynamicBar",
 	"JBackgroundBar",
 	"JStackBar",
 	"JMultipleBar",
 	"JNegativeBar",
	"JHorizontalBar",
	"JMixLineBar",
	"JProgress",

 	"JLine",
	"JArea",
 	"JMultipleLine",
 	"DoubleLineBar",
 	"JSmoothLine",
 	"JStepLine",

 	"JPie",
	"JRose",
 	"JRing",

 	"JFunnel",
 	"JPyramidFunnel",

 	"JRadar",
 	"JCircleRadar",

 	"JGauge",
 	"JColorGauge",

 	"JScatter",
 	"JBubble",

    "JPictorial",
    "JPictorialBar",

	"JDragEditor",
	"JCarousel",
	"JIframe",
	"JNumber",
	"JCustomButton",
	"JPivotTable",
	"JText",
	"JImg",
	"JCalendar",
	"JCurrentTime",
	"JList",
	"JRadioButton",
	"JCommonTable",
	"JQuickNav",
	"JFilterQuery",
	"JForm",

	"JBubbleMap",
	"JBarMap",
	"JHeatMap",
	"JAreaMap",
	"JFlyLineMap",
	"JTotalFlyLineMap",
	"JTotalBarMap",
 ];
 //不包含操作的组件
export const noActionList = [
    "JCustomButton",
	"JIframe",
	"JCarousel",
	"JDragEditor",
	"JText",
	"JNumber",
	"JFilterQuery",
];
/**
 * 组件名称前缀
 */
export const COMP_NAME_PREFIX = 'jeecg-drag';

/**
 *省略显示
 */
export const tableEllipsis = "--";
/**
 *下拉选择控件类型
 */
export const selectType = ['list','radio','list_multi','checkbox','sel_user','sel_depart','select-user','select-depart',"select-tree","table-dict","link-record"];

/**
 * 筛选条件
 */
export const conditionOptions = {
  text: [
    {
      label: '是',
      value: '1',
      expression:"="
    },
    {
      label: '不是',
      value: '2',
      expression:"!="
    },
    {
      label: '包含',
      value: '4',
      expression:"like"
    },
    {
      label: '开头为',
      value: '5',
      expression:"like"
    },
    {
      label: '结尾为',
      value: '6',
      expression:"like"
    },
    {
      label: '为空',
      value: '7',
      expression:"is null"
    },
    {
      label: '不为空',
      value: '8',
      expression:"is not null"
    },
  ],
  select:[
    {
      label: '包含',
      value: '3',
      expression:"in"
    },
    {
      label: '不包含',
      value: '4',
      expression:"not in"
    },
    {
      label: '为空',
      value: '7',
      expression:"is null"
    },
    {
      label: '不为空',
      value: '8',
      expression:"is not null"
    },
  ],
  number: [
    {
      label: '=',
      value: '1',
      expression:"="
    },
    {
      label: '≠',
      value: '2',
      expression:"!="
    },
    {
      label: '>',
      value: '3',
      expression:">"
    },
    {
      label: '<',
      value: '4',
      expression:"<"
    },
    {
      label: '≥',
      value: '5',
      expression:">="
    },
    {
      label: '≤',
      value: '6',
      expression:"<="
    },
    {
      label: '在范围内',
      value: '9',
      expression: 'between',
    },
    {
      label: '不在范围内',
      value: '10',
      expression: 'not between',
    },
    {
      label: '为空',
      value: '7',
      expression:"is null",
    },
    {
      label: '不为空',
      value: '8',
      expression:"is not null"
    },
  ],
  time:[
    {
      label: '是',
      value: '1',
      expression:"="
    },
    {
      label: '不是',
      value: '2',
      expression:"!="
    },
    {
      label: '在范围内',
      value: '9',
      expression: 'between',
    },
    {
      label: '不在范围内',
      value: '10',
      expression: 'not between',
    },
    {
      label: '为空',
      value: '7',
      expression:"is null",
    },
    {
      label: '不为空',
      value: '8',
      expression:"is not null",
    }
  ],
  pca:[
    {
      label: '是',
      value: '1',
      expression:"="
    },
    {
      label: '不是',
      value: '2',
      expression:"!="
    },
    {
      label: '为空',
      value: '7',
      expression:"is null",
    },
    {
      label: '不为空',
      value: '8',
      expression:"is not null",
    }
  ],
  'sub-table-design':[
    {
      label: '为空',
      value: '7',
      expression:"is null",
    },
    {
      label: '不为空',
      value: '8',
      expression:"is not null",
    }
  ],
  'link-record':[
    {
      label: '是 ',
      value: '1',
      expression:"=",
    },
    {
      label: '包含',
      value: '3',
      expression:"in",
    },
    {
      label: '为空',
      value: '7',
      expression:"is null",
    },
    {
      label: '不为空',
      value: '8',
      expression:"is not null",
    }
  ],
  date: [
    {
      label: '是',
      value: '1',
      expression:"="
    },
    {
      label: '不是',
      value: '2',
      expression:"!="
    },
    {
      label: '晚于',
      value: '3',
      expression:">"
    },
    {
      label: '早于',
      value: '4',
      expression:"<"
    },
    {
      label: '晚于等于',
      value: '5',
      expression:">="
    },
    {
      label: '早于等于',
      value: '6',
      expression:"<="
    },
    {
      label: '在范围内',
      value: '9',
      expression: 'between',
    },
    {
      label: '不在范围内',
      value: '10',
      expression: 'not between',
    },
    {
      label: '为空',
      value: '7',
      expression:"is null",
    },
    {
      label: '不为空',
      value: '8',
      expression:"is not null",
    }
  ],
};
/**
 * 颜色板
 * classic：经典
 * technology：科技
 * business：商务
 * botany：植物
 * natural：自然
 * colour：彩色
 */
export const colorPanel = {
  classic:["#64b5f6","#4db6ac","#ffb74d","#e57373","#9575cd","#a1887f","#90a4ae","#4dd0e1","#81c784","#ff8a65"],
  technology:["#3a5b84","#4d6e98","#7594b9","#bfd7f2","#18619f","#408aca","#5ea8e9","#81c3fc","#71a5cb","#a1cae4"],
  business:["#ccedf7","#b9dcf0","#12a0e7","#0663a4","#458890","#97d9cd","#4bb8bf","#20899c","#f44336  ","#a2c7d9"],
  botany:["#34b392","#4ac2a6","#8ed1c0","#ccdec6","#61bdb5","#7993a1","#93a889","#5e8d83","#115040","#bcc5b4"],
  natural:["#85cacd","#a7d676","#fee159","#fbc78e","#ef918b","#a9b5ff","#e7daca","#fc803a","#fea1ac","#c2a3cd"],
  colour:["#fddb9c","#f9ae91","#f59193","#d47f97","#bd86a6","#f595a1","#624772","#fe7156","#ffbda3","#877fa8"]
};
/**
 * 映射关系数组
 */
export const fieldMappings = [
  {
    label: '分组',
    key: 'type',
  },
  {
    label: '维度',
    key: 'name',
  },
  {
    label: '名称',
    key: 'name',
  },
  {
    label: '文本',
    key: 'label',
  },
  {
    label: '数值',
    key: 'value',
  },
  {
    label: '标题',
    key: 'title',
  },
  {
    label: '时间',
    key: 'date',
  },
  {
    label: '年份',
    key: 'year',
  },
  {
    label: '头像',
    key: 'avatar',
  },
  {
    label: '封面',
    key: 'avatar',
  },
  {
    label: '描述',
    key: 'desc',
  },
  {
    label: '路径',
    key: 'src',
  },
  {
    label: '开始',
    key: 'start',
  },
  {
    label: '结束',
    key: 'end',
  },
  {
    label: '全天',
    key: 'allday',
  },
  {
    label: '颜色',
    key: 'color',
  },
  {
    label: '区域',
    key: 'name',
  },
  {
    label: '图标',
    key: 'icon',
  },
  {
    label: '总计',
    key: 'total',
  },
  {
    label: '前缀',
    key: 'prefix',
  },
  {
    label: '后缀',
    key: 'suffix',
  },
  {
    label: '背景色',
    key: 'backgroundColor',
  },
  {
    label: '单位',
    key: 'action',
  },
  {
    label: '描述',
    key: 'desc',
  },
  {
    label: '分组',
    key: 'group',
  },
  {
    label: '内容',
    key: 'content',
  },
  {
    label: '跳转',
    key: 'href',
  },
  {
    label: '男',
    key: 'man',
  },
  {
    label: '女',
    key: 'woman',
  },
  {
    label: '起点名称',
    key: 'fromName',
  },
  {
    label: '终点名称',
    key: 'toName',
  },
  {
    label: '起点经度',
    key: 'fromLng',
  },
  {
    label: '起点纬度',
    key: 'fromLat',
  },
  {
    label: '终点经度',
    key: 'toLng',
  },
  {
    label: '终点纬度',
    key: 'toLat',
  },
  {
    label: '经度',
    key: 'lng',
  },
  {
    label: '纬度',
    key: 'lat',
  }
];
