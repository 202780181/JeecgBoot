declare module 'vue' {
  export interface GlobalComponents {
BottomOperate: typeof import('./BottomOperate/BottomOperate.vue')['default']
Breadcrumb: typeof import('./Breadcrumb/Breadcrumb.vue')['default']
CategorySelect: typeof import('./CategorySelect/CategorySelect.vue')['default']
DateTime: typeof import('./DateTime/DateTime.vue')['default']
Grid: typeof import('./Grid/Grid.vue')['default']
ImgPreview: typeof import('./ImgPreview/ImgPreview.vue')['default']
LFile: typeof import('./LFile/LFile.vue')['default']
PageLayout: typeof import('./PageLayout/PageLayout.vue')['default']
Popup: typeof import('./Popup/Popup.vue')['default']
PopupDict: typeof import('./PopupDict/PopupDict.vue')['default']
ProgressMap: typeof import('./ProgressMap/ProgressMap.vue')['default']
RightConditionFilter: typeof import('./RightConditionFilter/RightConditionFilter.vue')['default']
SelectDept: typeof import('./SelectDept/SelectDept.vue')['default']
SelectUser: typeof import('./SelectUser/SelectUser.vue')['default']
SelectUserByDepart: typeof import('./SelectUserByDepart/SelectUserByDepart.vue')['default']
TreeSelect: typeof import('./TreeSelect/TreeSelect.vue')['default']
  }
}

export {}