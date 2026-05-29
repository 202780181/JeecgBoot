import { h } from 'vue'
import { filterMultiDictText, getFileAccessHttpUrl } from '@/common/uitls'

const render = {
  /**
   * 渲染图片
   * @param text
   */
  renderImage: ({ text }) => {
    if (!text) {
      return ;
    }
    let avatarList = text.split(',')
    return h(
      'span',
      avatarList.map((item) => {
        return h(Image, {
          src: getFileAccessHttpUrl(item),
          width: 30,
          height: 30,
          style: { marginRight: '5px' },
        })
      }),
    )
    //update-end-author:taoyan date:2022-5-24 for:  VUEN-1084 【vue3】online表单测试发现的新问题 41、生成的代码，树默认图大小未改
  },
  /**
   * 渲染a标签
   * @param text
   */
  renderHref: ({ text }) => {
    if (!text) {
      return ''
    }
    const len = 20
    if (text.length > len) {
      text = text.substr(0, len)
    }
    return h('a', { href: text, target: '_blank' }, text)
  },
  /**
   * 根据字典渲染
   * @param v
   * @param array
   */
  renderDictNative: (v, array, renderTag = false) => {
    let text = ''
    let color = ''
    let obj = array.filter((item) => {
      return item.value == v
    })
    if (obj.length > 0) {
      text = obj[0].label
      color = obj[0].color
    }
    return h('span', text)
  },
  renderSwitch: (text, arr) => {
    return text ? filterMultiDictText(arr, text) : ''
  },
}

export { render }
