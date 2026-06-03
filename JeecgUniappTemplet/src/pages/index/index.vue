<route lang="json5" type="home">
{
  layout: 'default',
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '首页',
    disableScroll: false,
  },
}
</route>

<template>
  <PageLayout navTitle="首页" :navbarShow="true">
    <view class="page">
      <view class="hero">
        <view class="hero-title">Jeecg Uniapp Template</view>
        <view class="hero-subtitle">基于 JeecgBoot 的移动端公共模板</view>
      </view>

      <view class="section">
        <view class="section-title">基础能力</view>
        <view class="feature-grid">
          <view v-for="item in features" :key="item.title" class="feature-item">
            <view class="feature-icon">{{ item.icon }}</view>
            <view class="feature-content">
              <view class="feature-title">{{ item.title }}</view>
              <view class="feature-desc">{{ item.desc }}</view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </PageLayout>
</template>

<script lang="ts" setup>
defineOptions({
  name: 'index',
  options: {
    styleIsolation: 'shared',
  },
})

const features = [
  { icon: 'A', title: '账号登录', desc: '已接入 JeecgBoot 移动端登录接口' },
  { icon: 'R', title: '请求封装', desc: '保留 token、租户、签名等通用请求能力' },
  { icon: 'U', title: 'Uniapp 多端', desc: '支持 H5、小程序、App 构建入口' },
  { icon: 'C', title: '组件基础', desc: '保留通用布局、上传、弹窗、选择器组件' },
]
</script>

<style lang="scss" scoped>
.page {
  min-height: 100%;
  padding: 24rpx;
  background: #f5f7fb;
}

.hero {
  padding: 40rpx 32rpx;
  color: #ffffff;
  background: #1677ff;
  border-radius: 16rpx;
}

.hero-title {
  font-size: 40rpx;
  font-weight: 700;
  line-height: 1.3;
}

.hero-subtitle {
  margin-top: 12rpx;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.86);
}

.section {
  margin-top: 28rpx;
}

.section-title {
  margin-bottom: 20rpx;
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2937;
}

.feature-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20rpx;
}

.feature-item {
  display: flex;
  gap: 20rpx;
  align-items: center;
  padding: 24rpx;
  background: #ffffff;
  border: 1px solid #edf0f5;
  border-radius: 12rpx;
}

.feature-icon {
  display: flex;
  flex: 0 0 64rpx;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
  font-size: 28rpx;
  font-weight: 700;
  color: #1677ff;
  background: #eaf3ff;
  border-radius: 12rpx;
}

.feature-content {
  min-width: 0;
}

.feature-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1f2937;
}

.feature-desc {
  margin-top: 8rpx;
  font-size: 24rpx;
  line-height: 1.5;
  color: #6b7280;
}
</style>
