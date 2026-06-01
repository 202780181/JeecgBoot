export function formatWeatherTemperature(data: Recordable) {
  if (data.high && data.low) {
    return formatWeatherDegree(data.high);
  }
  return data.temperature || '未知';
}

export function formatWeatherDegree(value: string) {
  return String(value || '').replace('°C', '°');
}

export function formatWeatherDate(date: string) {
  if (!date) return '未来';
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const sameDay = (target: Date) =>
    parsed.getFullYear() === target.getFullYear() &&
    parsed.getMonth() === target.getMonth() &&
    parsed.getDate() === target.getDate();
  if (sameDay(today)) return '今天';
  if (sameDay(tomorrow)) return '明天';
  return `${parsed.getMonth() + 1}/${parsed.getDate()}`;
}

export function getWeatherSceneClass(data: Recordable) {
  const icon = String(data.iconDay || data.iconNight || '');
  const text = String(data.weather || data.weatherDay || '');
  if (/雷/.test(text) || ['302', '303', '304'].includes(icon)) return 'scene-thunder';
  if (/雪/.test(text) || icon.startsWith('4')) return 'scene-snow';
  if (/雨|阵雨/.test(text) || icon.startsWith('3')) return 'scene-rain';
  if (/雾|霾|沙|尘/.test(text) || ['500', '501', '502', '503', '504', '507', '508', '509', '510', '511', '512', '513', '514', '515'].includes(icon)) {
    return 'scene-fog';
  }
  if (/阴/.test(text) || icon === '104') return 'scene-overcast';
  if (/云/.test(text) || ['101', '102', '103'].includes(icon)) return 'scene-cloudy';
  if (/晴/.test(text) || icon === '100' || icon === '150') return 'scene-sunny';
  return 'scene-cloudy';
}

export function getWeatherIcon(data: Recordable) {
  const scene = getWeatherSceneClass(data);
  if (scene === 'scene-thunder') return 'fluent-emoji-high-contrast:cloud-with-lightning-and-rain';
  if (scene === 'scene-rain') return 'fluent-emoji-high-contrast:cloud-with-rain';
  if (scene === 'scene-snow') return 'fluent-emoji-high-contrast:cloud-with-snow';
  if (scene === 'scene-fog') return 'fluent-emoji-high-contrast:fog';
  if (scene === 'scene-overcast') return 'fluent-emoji-high-contrast:cloud';
  if (scene === 'scene-cloudy') return 'fluent-emoji-high-contrast:sun-behind-cloud';
  return 'fluent-emoji-high-contrast:sun';
}
