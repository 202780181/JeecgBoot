import { ref, getCurrentInstance, provide,} from 'vue';
import {cache} from "@/common/uitls";
import {COMP_NAME_PREFIX} from '@/common/constants'
import {isString} from "@/common/is";
export function useLinkage(currentIndex?) {
  //是否显示头部操作栏
  const hiddenTop = ref(true);
  //图表关联的id
  const relationCompList = ref([]);
  //当前操作图表
  const currentLinkageComp = ref<any>({});
  //是否钻取
  const hasDrill = ref(false);

  //************************************刷新图表begin***********************************
  //获取实例
  const instance: any = getCurrentInstance();

  /**
   * 刷新图表
   */
  function refreshComp(compList) {
    if (compList && compList.length > 0) {
      compList.forEach((comp) => {
        try {
            let $chartInstance = null;
            if(comp.tabId && comp.pid){
                //tabs嵌套栅格的情况
                //获取tabs图表实例
                const $tabsInstance = instance.refs[COMP_NAME_PREFIX + comp.tabId];
                //获取父级图表实例
                const $parentInstance = $tabsInstance[0].$refs[COMP_NAME_PREFIX + comp.pid];
                //获取当前图表实例
                 $chartInstance = $parentInstance[0].$refs[COMP_NAME_PREFIX + comp.id];
            }else if(comp.pid){
                //tabs和栅格嵌套组件的情况
                //获取父id图表实例
                const $parentInstance = instance.refs[COMP_NAME_PREFIX + comp.pid];
                //获取当前图表实例
                $chartInstance = $parentInstance[0].$refs[COMP_NAME_PREFIX + comp.id];
            }else{
                $chartInstance = instance.refs[COMP_NAME_PREFIX + comp.id];
                console.log('instance', instance);
                console.log('COMP_NAME_PREFIX', COMP_NAME_PREFIX);
                console.log('comp.id', comp.id);
                // 没找到实例时，再查找是否有组合组件
                if (!$chartInstance && instance.refs) {
                  const allGroupInstances = [];
                  // 所有组合组件内的组件实例
                  let allGroupInInstances: any = {};
                  Object.values(instance.refs).forEach((item: any) => {
                    if (Array.isArray(item) && item[0]) {
                      const _item = item[0];
                      if (_item?.groupInstance) {
                        allGroupInstances.push(_item.groupInstance);
                        if (_item.groupInstance?.refs) {
                          allGroupInInstances = {...allGroupInInstances, ..._item.groupInstance.refs};
                        }
                      }
                    };
                  });
                  $chartInstance = allGroupInInstances[COMP_NAME_PREFIX + comp.id];
                }
            }
            console.log('联动刷新params', comp.params);
            console.log('联动刷新$chartInstance', $chartInstance);
            $chartInstance && $chartInstance[0] && $chartInstance[0].queryData(null, comp.params);
        } catch (e) {
          console.log('图表联动刷新异常', e);
        }
      });
    }
  }

  //下发刷新事件
  provide('refreshComp', refreshComp);
  //************************************刷新图表end***********************************

  //*************************************钻取逻辑begin*********************************
  provide('reloadDrillStatus', reloadDrillStatus);
  //钻取返回
  provide('drillBack', drillBack);
  /**
   * 钻取返回上一级
   */
  function drillBack(config) {
    let drillLocalJson = cache('drill:'+currentIndex.value);
    let drillParamArr = JSON.parse(drillLocalJson);
    let $chartInstance = instance.refs[COMP_NAME_PREFIX + currentIndex.value];
    if (drillParamArr && drillParamArr.length > 0) {
      //返回时获取参数数组最后一项的数据
      let params = drillParamArr.pop();
      $chartInstance && $chartInstance[0] && $chartInstance[0].queryData(config, params);
    } else {
      $chartInstance && $chartInstance[0] && $chartInstance[0].queryData(config);
    }
    //修改缓存参数数据
    if (drillParamArr && drillParamArr.length > 0 && drillParamArr[0] && Object.keys(drillParamArr[0]).length > 0) {
      //存在参数就证明还可以向上返回了，修改缓存数据
      cache('drill:'+currentIndex.value,JSON.stringify(drillParamArr));
    } else {
      console.log('drillBack 不存在参数就证明在顶层了，移除缓存数据')
      //不存在参数就证明在顶层了，移除缓存数据
      cache('drill:'+currentIndex.value,[]);
    }
    reloadDrillStatus();
  }

  //当前移入组件是否下钻状态
  function reloadDrillStatus(state?) {
    let drillLocalJson = cache('drill:'+currentIndex.value);
    if (drillLocalJson) {
      let drillParamArr = isString(drillLocalJson)?JSON.parse(drillLocalJson):drillLocalJson;
      if (drillParamArr && drillParamArr.length > 0) {
        hasDrill.value = true;
        return;
      }
    }
    hasDrill.value = state?state:false;
  }
  //*************************************钻取逻辑end*********************************
  return { relationCompList, currentLinkageComp, hiddenTop,hasDrill,drillBack };
}
