<template>
  <div class="weather-card" :class="getWeatherSceneClass(data)">
    <div class="weather-scene" aria-hidden="true">
      <span class="weather-scene-layer layer-a"></span>
      <span class="weather-scene-layer layer-b"></span>
      <span class="weather-scene-layer layer-c"></span>
    </div>
    <div class="weather-card-main">
      <div class="weather-place">
        <span>{{ data.city || '当前城市' }}</span>
        <em>{{ data.adm2 || data.adm1 || '我的位置' }}</em>
      </div>
      <div class="weather-temp">
        <span>{{ formatWeatherTemperature(data) }}</span>
      </div>
    </div>
    <div class="weather-summary">
      <div class="weather-alert">
        <Icon icon="ant-design:warning-filled" />
        <span>{{ data.weather || '天气预报' }}</span>
      </div>
      <div class="weather-range">
        <span>最高 {{ data.high || '未知' }}</span>
        <span>最低 {{ data.low || '未知' }}</span>
      </div>
    </div>
    <div class="weather-metrics">
      <div>
        <span>湿度</span>
        <strong>{{ data.humidity || '未知' }}</strong>
      </div>
      <div>
        <span>降水</span>
        <strong>{{ data.precip || '未知' }}</strong>
      </div>
      <div>
        <span>风力</span>
        <strong>{{ data.wind || '未知' }}</strong>
      </div>
      <div>
        <span>紫外线</span>
        <strong>{{ data.uvIndex || '未知' }}</strong>
      </div>
    </div>
    <div v-if="data.daily?.length" class="weather-forecast">
      <div v-for="item in data.daily" :key="item.date" class="weather-day">
        <span>{{ formatWeatherDate(item.date) }}</span>
        <Icon class="weather-day-icon" :icon="getWeatherIcon(item)" />
        <em>{{ item.weather }}</em>
        <strong>{{ item.low }} / {{ item.high }}</strong>
      </div>
    </div>
    <div class="weather-footer">
      <span>日出 {{ data.sunrise || '未知' }}</span>
      <span>日落 {{ data.sunset || '未知' }}</span>
      <a v-if="data.fxLink" :href="data.fxLink" target="_blank" rel="noopener noreferrer">和风天气</a>
    </div>
  </div>
</template>

<script setup lang="ts">
import Icon from '@/components/Icon';
import { formatWeatherDate, formatWeatherTemperature, getWeatherIcon, getWeatherSceneClass } from '../utils/weather';

defineProps<{
  data: Recordable;
}>();
</script>

<style scoped lang="less">
.weather-card {
  position: relative;
  width: min(430px, 100%);
  min-height: 132px;
  margin: 10px 0;
  padding: 16px 20px 14px;
  overflow: hidden;
  color: #ffffff;
  background: linear-gradient(145deg, #5f7183 0%, #8996a3 48%, #536171 100%);
  border: 1px solid rgb(255 255 255 / 20%);
  border-radius: 22px;
  box-shadow: 0 16px 34px rgb(15 23 42 / 20%);
}

.weather-scene {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.weather-scene-layer {
  position: absolute;
  display: block;
}

.weather-card::after {
  position: absolute;
  inset: 0;
  content: '';
  background:
    linear-gradient(90deg, rgb(0 0 0 / 14%) 0%, transparent 42%, rgb(255 255 255 / 8%) 100%),
    radial-gradient(circle at 84% 16%, rgb(255 255 255 / 18%) 0%, transparent 24%);
  pointer-events: none;
}

.scene-cloudy,
.scene-overcast {
  background: linear-gradient(145deg, #566777 0%, #8e9aa6 52%, #536171 100%);

  .layer-a,
  .layer-b,
  .layer-c {
    width: 82%;
    height: 52px;
    background:
      radial-gradient(ellipse at 18% 52%, rgb(255 255 255 / 42%) 0%, transparent 34%),
      radial-gradient(ellipse at 43% 42%, rgb(255 255 255 / 34%) 0%, transparent 42%),
      radial-gradient(ellipse at 72% 55%, rgb(255 255 255 / 28%) 0%, transparent 36%);
    filter: blur(13px);
  }

  .layer-a {
    top: 8px;
    left: -16%;
    opacity: 0.82;
  }

  .layer-b {
    top: 54px;
    right: -18%;
    opacity: 0.64;
  }

  .layer-c {
    bottom: 8px;
    left: 8%;
    opacity: 0.36;
  }
}

.scene-rain,
.scene-thunder {
  background: linear-gradient(145deg, #344253 0%, #6f7d89 50%, #313b49 100%);

  .layer-a {
    inset: -18px -12px auto;
    height: 82px;
    background:
      radial-gradient(ellipse at 20% 46%, rgb(255 255 255 / 32%) 0%, transparent 34%),
      radial-gradient(ellipse at 52% 38%, rgb(255 255 255 / 28%) 0%, transparent 40%),
      radial-gradient(ellipse at 82% 55%, rgb(255 255 255 / 20%) 0%, transparent 35%);
    filter: blur(16px);
  }

  .layer-b {
    inset: 0;
    background: repeating-linear-gradient(104deg, transparent 0 13px, rgb(255 255 255 / 22%) 14px 15px, transparent 16px 28px);
    opacity: 0.24;
    transform: translateX(22px);
  }

  .layer-c {
    right: 74px;
    bottom: 14px;
    width: 48px;
    height: 78px;
    background: linear-gradient(160deg, transparent 0 34%, rgb(255 241 138 / 88%) 35% 51%, transparent 52% 100%);
    filter: blur(1px);
    opacity: 0;
  }
}

.scene-thunder .layer-c {
  opacity: 0.76;
}

.scene-sunny {
  background: linear-gradient(145deg, #4c8fd8 0%, #78b9e6 48%, #f2b35a 100%);

  .layer-a {
    top: -38px;
    right: -28px;
    width: 126px;
    height: 126px;
    background: radial-gradient(circle, rgb(255 246 177 / 95%) 0%, rgb(255 196 73 / 60%) 34%, transparent 68%);
    filter: blur(4px);
  }

  .layer-b {
    inset: auto -12% -34px;
    height: 62px;
    background: radial-gradient(ellipse at 50% 50%, rgb(255 255 255 / 32%) 0%, transparent 64%);
    filter: blur(16px);
  }
}

.scene-fog {
  background: linear-gradient(145deg, #6a737c 0%, #a5abb1 52%, #68717a 100%);

  .layer-a,
  .layer-b,
  .layer-c {
    left: -10%;
    width: 120%;
    height: 34px;
    background: linear-gradient(90deg, transparent 0%, rgb(255 255 255 / 32%) 48%, transparent 100%);
    filter: blur(10px);
  }

  .layer-a {
    top: 28px;
  }

  .layer-b {
    top: 62px;
    opacity: 0.8;
  }

  .layer-c {
    bottom: 18px;
    opacity: 0.58;
  }
}

.scene-snow {
  background: linear-gradient(145deg, #71879d 0%, #b9c7d4 54%, #66788d 100%);

  .layer-a {
    inset: 0;
    background:
      radial-gradient(circle at 20% 28%, rgb(255 255 255 / 82%) 0 2px, transparent 3px),
      radial-gradient(circle at 48% 42%, rgb(255 255 255 / 74%) 0 2px, transparent 3px),
      radial-gradient(circle at 72% 24%, rgb(255 255 255 / 68%) 0 2px, transparent 3px),
      radial-gradient(circle at 84% 68%, rgb(255 255 255 / 66%) 0 2px, transparent 3px);
    background-size: 92px 72px;
    opacity: 0.7;
  }

  .layer-b {
    inset: auto -8% -18px;
    height: 78px;
    background: radial-gradient(ellipse at 50% 60%, rgb(255 255 255 / 44%) 0%, transparent 70%);
    filter: blur(12px);
  }
}

.weather-card-main {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 10px;
}

.weather-place {
  min-width: 0;

  span {
    display: block;
    overflow: hidden;
    font-size: 22px;
    font-weight: 800;
    line-height: 1.25;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  em {
    display: block;
    margin-top: 2px;
    color: rgb(255 255 255 / 86%);
    font-size: 13px;
    font-weight: 650;
    font-style: normal;
  }
}

.weather-temp {
  text-align: right;

  span {
    display: block;
    font-size: 54px;
    font-weight: 300;
    line-height: 0.82;
    letter-spacing: 0;
  }
}

.weather-summary {
  position: relative;
  z-index: 1;
  display: grid;
  margin-top: 24px;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 16px;
}

.weather-alert {
  display: grid;
  color: rgb(255 255 255 / 92%);
  font-size: 14px;
  font-weight: 750;
  grid-template-columns: 16px minmax(0, 1fr);
  gap: 6px;
  align-items: center;

  .app-iconify {
    font-size: 15px;
  }

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.weather-range {
  position: relative;
  display: flex;
  color: rgb(255 255 255 / 92%);
  font-size: 16px;
  font-weight: 650;
  gap: 10px;
}

.weather-metrics {
  position: relative;
  z-index: 1;
  display: grid;
  margin-top: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;

  div {
    min-width: 0;
    padding: 7px 7px;
    background: rgb(255 255 255 / 12%);
    border: 1px solid rgb(255 255 255 / 12%);
    border-radius: 12px;
  }

  span {
    display: block;
    color: rgb(255 255 255 / 68%);
    font-size: 11px;
    line-height: 1.2;
  }

  strong {
    display: block;
    margin-top: 4px;
    overflow: hidden;
    color: #ffffff;
    font-size: 12px;
    font-weight: 650;
    line-height: 1.25;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.weather-forecast {
  position: relative;
  z-index: 1;
  display: grid;
  margin-top: 10px;
  gap: 4px;
}

.weather-day {
  display: grid;
  min-height: 24px;
  color: rgb(255 255 255 / 86%);
  font-size: 12px;
  grid-template-columns: 38px 18px minmax(0, 1fr) auto;
  align-items: center;
  gap: 6px;

  .weather-day-icon {
    color: #ffffff;
    font-size: 16px;
    filter: drop-shadow(0 1px 3px rgb(0 0 0 / 24%));
  }

  em {
    overflow: hidden;
    font-style: normal;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    font-size: 12px;
    font-weight: 650;
    white-space: nowrap;
  }
}

.weather-footer {
  position: relative;
  z-index: 1;
  display: flex;
  margin-top: 10px;
  color: rgb(255 255 255 / 68%);
  font-size: 11px;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;

  a {
    color: #ffffff;
    text-decoration: none;
    border-bottom: 1px solid rgb(255 255 255 / 38%);
  }
}
</style>
