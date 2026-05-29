// mock/getChatLists.js
import Mock from 'mockjs'
import { readFileSync } from 'fs'
import path from 'path'
import { parse } from 'dotenv'
// 指定 .env 文件路径
const envPath = path.resolve(__dirname, '../env/.env')
const envContent = readFileSync(envPath, 'utf8')
const parsedEnv = parse(envContent)
const proxyPrefix = parsedEnv.VITE_APP_PROXY_PREFIX ?? '/api'

export default [
  {
    url: `${proxyPrefix}/eoa/im/newApi/getChatList`,
    method: 'get', // 或 post
    response: () => {
      return Mock.mock({
        code: 200,
        success: true,
        result: {
          'logVoList|8-10': [
            {
              'id|+1': 1,
              fromUserName: '@cname',
              sendTime: Mock.mock('@date("yyyy-MM-dd")'),
              fromAvatar: () => {
                const sentences = [
                  'https://picsum.photos/100/100',
                  'https://random.imagecdn.app/100/100',
                  'https://q1.qlogo.cn/g?b=qq&nk=190848757&s=100',
                  'https://dummyimage.com/100x100/000/fff&text=%E6%9D%8E%E5%9B%9B',
                  'https://dummyimage.com/100x100/f37b1d/fff&text=%E7%8E%8B%E4%BA%94',
                  'https://dummyimage.com/100x100/59c7b8/fff&text=%E5%85%AD%E5%AD%90',
                ]
                return sentences[Math.floor(Math.random() * sentences.length)]
              },
              'type|1': ['friend', 'discussion', 'group'],
              'izTop|1': [1, 0],
              'status|1': ['offline', 'online'],
              'msgFrom|+12': 4000,
              'msgTo|+34': 100,
            },
          ],
        },
      })
    },
  },
  {
    url: `${proxyPrefix}/eoa/im/newApi/creatFriendSession`,
    method: 'post', // 或 post
    response: () => {
      return Mock.mock({
        code: 200,
        success: true,
        result: {
          'accountId|+100': 4000,
          avatar: 'https://q1.qlogo.cn/g?b=qq&nk=190848757&s=100',
          email: '@email',
          'id|12': 112,
          'msgTo|+34': 100,
          'phone|9': 123,
        },
      })
    },
  },
  {
    url: '/api/eoa/im/newApi/records',
    method: 'get', // 或 post
    response: () => {
      return Mock.mock({
        code: 200,
        success: true,
        result: {
          'records|8-10': [
            {
              'id|+1': 1,
              fromUserName: '@cname',
              sendTime: Mock.mock('@date("yyyy-MM-dd")'),
              fromAvatar: 'https://dummyimage.com/100x100/000/fff&text=%E6%9D%8E%E5%9B%9B',
              'type|1': ['friend', 'discussion', 'group'],
              'izTop|1': [1, 0],
              'status|1': ['offline', 'online'],
              'msgFrom|+12': 4000,
              'msgTo|+34': 100,
              // msgData: Mock.mock('@cparagraph()'),
              msgData: () => Mock.mock('@cparagraph()'),
              userId: '1678948772039729154',
              msgType: 'text',
            },
          ],
        },
      })
    },
  },
  {
    url: `${proxyPrefix}/eoa/im/newApi/creatFriendSession`,
    method: 'post', // 或 post
    response: () => {
      return Mock.mock({
        code: 200,
        success: true,
        result: 'success',
      })
    },
  },
  {
    url: `${proxyPrefix}/eoa/im/newApi/sendMessage`,
    method: 'post', // 或 post
    response: () => {
      return Mock.mock({
        code: 200,
        success: true,
        result: 'success',
      })
    },
  },
]
