//APP更新
export default function appUpdate() {
	
 console.log('plus.runtime.appid', plus.runtime.appid)
 console.log('plus.runtime.version', plus.runtime.version)
 console.log('plus.device.imei', plus.device.imei)
 
  uni.request({
    url: 'http://app.myhjdc.cn/update.json', //检查更新的服务器地址
    data: {
      appid: plus.runtime.appid,
      version: plus.runtime.version,
      imei: plus.device.imei,
    },
    success: (res: any) => {
      plus.runtime.getProperty(plus.runtime.appid, function (wgtinfo) {
	    console.log('客户端版本信息 wgtinfo', wgtinfo)
	    console.log('服务端版本信息 res', res)
        // 客户端版本
        let client_version = wgtinfo.version

		//------------------------前两位大版本有改动-----------------------------------------------
        // 大版本是否一致 版本号1.1.0，前两位如果有改动，就是大版本更新；否则就是小版本热更新
        const flag_update =
          client_version.split('.').splice(0, 2).join('.') !=
          res.data.version.split('.').splice(0, 2).join('.')
		//------------------------前两位大版本有改动-----------------------------------------------

	    //------------------------第三位小版本有改动-热更新-----------------------------------------------
        // 客户端版本号
        let client_version_number = Number(client_version.split('.')[2])
        // 服务器版本号
        let current_version_number = Number(res.data.version.split('.')[2])
	   // 如果客户端版本号小于服务器版本号，则提醒用户更新
	    const flag_hot = !flag_update && client_version_number < current_version_number
		//------------------------第三位小版本有改动-热更新-----------------------------------------------


        console.log('客户端版本 client_version', client_version)
        console.log('客户端版本号 client_version_number', client_version_number)
        console.log('服务器版本号 current_version_number', current_version_number)
        console.log('升级更新 flag_update', flag_update)
        console.log('热更新 flag_hot', flag_hot)

        if (flag_update) {
		  console.log('*****开始大版本更新*****')
          // 提醒用户更新
          uni.showModal({
            title: '更新提示',
            content: res.data.note,
            success: (showResult) => {
              if (showResult.confirm) {
                plus.nativeUI.toast('正在准备环境，请稍后!')
                console.log(res.data.url)
                const downloadTask = plus.downloader.createDownload(
                  res.data.url,
                  {
                    method: 'GET',
                    filename: '_doc/update/',
                  },
                  function (d, status) {
                    if (status == 200) {
					  const path = d.filename; //下载apk
                      plus.runtime.install(path) // 自动安装apk文件
                    } else {
                      plus.nativeUI.alert('版本更新失败:' + status)
                    }
                  },
                )
			    downloadTask.start()
              }
            },
          })
        } else if (flag_hot) {
		  console.log('*****开始小版本热更新*****')
          uni.downloadFile({
            url: res.data.wgtUrl,
            success: (downloadResult) => {
              console.log("热更新downloadResult",downloadResult.tempFilePath)
              if (downloadResult.statusCode === 200) {
                plus.nativeUI.toast(`正在热更新!${res.data.versionCode}`)
                plus.runtime.install(
                  downloadResult.tempFilePath,
                  {
                    force: false,
                  },
                  function () {
                    plus.nativeUI.toast('热更新成功')
                    plus.runtime.restart()
                  },
                  function (e) {
                    console.log(e)
                    plus.nativeUI.toast(`热更新失败:${e.message}`)
                  },
                )
              }
            },
          })
        }
      })
    },
  })
}
