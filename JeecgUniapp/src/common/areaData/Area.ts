import {pcaa as REGION_DATA} from "./pcaUtils";

/**
 * Area 属性all的类型
 */
interface PlainPca {
  id: string;
  text: string;
  pid: string;
  index: Number;
}

/**
 * 省市区工具类 -解决列表省市区组件的翻译问题
 */
class Area {
  all: PlainPca[];

  /**
   * 构造器
   * @param pcaa
   */
  constructor(pcaa?) {
    if (!pcaa) {
      pcaa = REGION_DATA;
    }
    let arr: PlainPca[] = [];
    const province = pcaa['86'];
    Object.keys(province).map((key) => {
      arr.push({ id: key, text: province[key], pid: '86', index: 1 });
      const city = pcaa[key];
      Object.keys(city).map((key2) => {
        arr.push({ id: key2, text: city[key2], pid: key, index: 2 });
        const qu = pcaa[key2];
        if (qu) {
          Object.keys(qu).map((key3) => {
            arr.push({ id: key3, text: qu[key3], pid: key2, index: 3 });
          });
        }
      });
    });
    this.all = arr;
  }

  getPca() {
    return this.all;
  }

  getCode(text) {
    if (!text || text.length == 0) {
      return '';
    }
    for (let item of this.all) {
      if (item.text === text) {
        return item.id;
      }
    }
  }

//update-begin-author:liusq---date:20230404--for: [issue/382]省市区组件JAreaLinkage数据不回显---
  getText(code,index=3) {
    if (!code || code.length == 0) {
      return '';
    }
    let arr = [];
    this.getAreaBycode(code, arr, index);
    return arr.join('/');
  }
//update-end-author:liusq---date:20230404--for: [issue/382]省市区组件JAreaLinkage数据不回显---

  getRealCode(code) {
    let arr = [];
    this.getPcode(code, arr, 3);
    return arr;
  }

  getPcode(id, arr, index) {
    for (let item of this.all) {
      if (item.id === id && item.index == index) {
        arr.unshift(id);
        if (item.pid != '86') {
          this.getPcode(item.pid, arr, --index);
        }
      }
    }
  }

  getAreaBycode(code, arr, index) {
    for (let item of this.all) {
      if (item.id === code && item.index == index) {
        arr.unshift(item.text);
        if (item.pid != '86') {
          this.getAreaBycode(item.pid, arr, --index);
        }
      }
    }
  }
}
interface RegionItem {
  id: string;
  text: string;
  pid: string;
  index: number;
}

interface TransformedItem {
  label: string;
  value: string;
}

type TransformedData = Record<string, TransformedItem[]>;

export function transformRegionData(originalData: RegionItem[]): TransformedData {
  const result: TransformedData = {};

  // 首先处理省级数据 (pid 为 '86' 的项)
  const provinces = originalData.filter(item => item.pid === '86');
  result['0'] = provinces.map(province => ({
    label: province.text,
    value: province.id
  }));

  // 然后处理市级数据
  const cities = originalData.filter(item =>
      provinces.some(province => province.id === item.pid)
  );

  cities.forEach(city => {
    if (!result[city.pid]) {
      result[city.pid] = [];
    }
    result[city.pid].push({
      label: city.text,
      value: city.id
    });
  });

  // 最后处理区县级数据
  const districts = originalData.filter(item =>
      cities.some(city => city.id === item.pid)
  );

  districts.forEach(district => {
    if (!result[district.pid]) {
      result[district.pid] = [];
    }
    result[district.pid].push({
      label: district.text,
      value: district.id
    });
  });

  return result;
}

const jeecgAreaData = new Area();

// 根据code找文本
const getAreaTextByCode = function (code) {
  let index = 3;
  //update-begin-author:liusq---date:20220531--for: 判断code是否是多code逗号分割的字符串，是的话，获取最后一位的code ---
  if (code && code.includes(',')) {
    index = code.split(",").length;
    code = code.substr(code.lastIndexOf(',') + 1);
  }
  //update-end-author:liusq---date:20220531--for: 判断code是否是多code逗号分割的字符串，是的话，获取最后一位的code ---
  return jeecgAreaData.getText(code,index);
};
// 根据code找文本
const getAreaArrByCode = function (code) {
  return jeecgAreaData.getRealCode(code);
};
// 获取下拉地图option
const getPcaOptionData = function () {
  let pca:any = jeecgAreaData.getPca();
  return transformRegionData(pca);
};

export { getAreaTextByCode,getAreaArrByCode,getPcaOptionData };
