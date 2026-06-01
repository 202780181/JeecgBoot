from typing import Any
from urllib.parse import urlparse

import httpx

from app.core.config import settings
from app.tools.base import BaseTool, ToolResult, ToolSpec


KNOWN_CITY_LOCATIONS: dict[str, dict[str, str]] = {
    "广州": {"name": "广州", "id": "101280101", "adm1": "广东省", "adm2": "广州"},
    "深圳": {"name": "深圳", "id": "101280601", "adm1": "广东省", "adm2": "深圳"},
    "北京": {"name": "北京", "id": "101010100", "adm1": "北京市", "adm2": "北京"},
    "上海": {"name": "上海", "id": "101020100", "adm1": "上海市", "adm2": "上海"},
    "杭州": {"name": "杭州", "id": "101210101", "adm1": "浙江省", "adm2": "杭州"},
    "南京": {"name": "南京", "id": "101190101", "adm1": "江苏省", "adm2": "南京"},
    "成都": {"name": "成都", "id": "101270101", "adm1": "四川省", "adm2": "成都"},
    "重庆": {"name": "重庆", "id": "101040100", "adm1": "重庆市", "adm2": "重庆"},
    "武汉": {"name": "武汉", "id": "101200101", "adm1": "湖北省", "adm2": "武汉"},
    "西安": {"name": "西安", "id": "101110101", "adm1": "陕西省", "adm2": "西安"},
}


class WeatherTool(BaseTool):
    spec = ToolSpec(
        name="weather",
        description="通过和风天气查询城市按天天气预报。",
        input_schema={
            "type": "object",
            "properties": {
                "city": {"type": "string", "description": "城市名称"},
            },
            "required": ["city"],
        },
    )

    def __init__(
        self,
        api_host: str | None = None,
        geo_api_host: str | None = None,
        api_key: str | None = None,
        timeout: int | None = None,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self.api_host = settings.qweather_api_host if api_host is None else api_host
        configured_geo_api_host = settings.qweather_geo_api_host or self.api_host
        self.geo_api_host = configured_geo_api_host if geo_api_host is None else geo_api_host
        self.api_key = settings.qweather_api_key if api_key is None else api_key
        self.timeout = timeout or settings.qweather_timeout_seconds
        self.transport = transport
        self._location_cache: dict[str, dict[str, Any]] = {}

    def call_title(self, tool_input: dict[str, Any]) -> str:
        city = str(tool_input.get("city") or "城市").strip() or "城市"
        return f"查询{city}天气"

    async def run(self, tool_input: dict[str, Any]) -> ToolResult:
        city = str(tool_input.get("city") or "广州").strip() or "广州"
        location = await self._lookup_city(city)
        weather = await self._get_weather_daily(location["id"])
        daily = weather.get("daily") or []
        if not daily:
            raise ValueError(f"和风天气未返回每日预报：{city}")
        today = daily[0]
        return ToolResult(
            tool_name=self.spec.name,
            result={
                "city": location.get("name") or city,
                "adm1": location.get("adm1"),
                "adm2": location.get("adm2"),
                "locationId": location["id"],
                "date": today.get("fxDate"),
                "weather": self._format_weather_text(today),
                "weatherDay": today.get("textDay") or "未知",
                "weatherNight": today.get("textNight") or "未知",
                "iconDay": today.get("iconDay"),
                "iconNight": today.get("iconNight"),
                "high": self._with_unit(today.get("tempMax"), "°C"),
                "low": self._with_unit(today.get("tempMin"), "°C"),
                "humidity": self._with_unit(today.get("humidity"), "%"),
                "wind": self._format_wind(today),
                "windDay": self._format_wind(today, "Day"),
                "windNight": self._format_wind(today, "Night"),
                "precip": self._with_unit(today.get("precip"), "mm"),
                "pressure": self._with_unit(today.get("pressure"), "hPa"),
                "uvIndex": today.get("uvIndex") or "未知",
                "sunrise": today.get("sunrise") or "未知",
                "sunset": today.get("sunset") or "未知",
                "updateTime": weather.get("updateTime"),
                "fxLink": weather.get("fxLink"),
                "daily": [self._format_daily_item(item) for item in daily[:3]],
                "source": "QWeather",
            },
        )

    async def _lookup_city(self, city: str) -> dict[str, Any]:
        if city in self._location_cache:
            return self._location_cache[city]
        if city in KNOWN_CITY_LOCATIONS:
            self._location_cache[city] = KNOWN_CITY_LOCATIONS[city]
            return KNOWN_CITY_LOCATIONS[city]
        payload = await self._get_json(
            self.geo_api_host,
            "/geo/v2/city/lookup",
            {"location": city, "range": "cn", "number": "1", "lang": "zh"},
        )
        locations = payload.get("location") or []
        if not locations:
            raise ValueError(f"和风天气未找到城市：{city}")
        location = locations[0]
        self._location_cache[city] = location
        return location

    async def _get_weather_daily(self, location_id: str) -> dict[str, Any]:
        return await self._get_json(
            self.api_host,
            "/v7/weather/3d",
            {"location": location_id, "lang": "zh", "unit": "m"},
        )

    async def _get_json(self, api_host: str | None, path: str, params: dict[str, str]) -> dict[str, Any]:
        if not api_host:
            raise ValueError("请配置 QWEATHER_API_HOST")
        if not self.api_key:
            raise ValueError("请配置 QWEATHER_API_KEY")

        url = self._api_url(api_host, path)
        headers = {
            "X-QW-Api-Key": self.api_key,
            "Accept": "application/json",
            "Accept-Encoding": "gzip",
        }
        async with httpx.AsyncClient(timeout=self.timeout, transport=self.transport) as client:
            response = await client.get(url, params=params, headers=headers)
        if response.status_code == 404 and path.startswith("/geo/"):
            raise ValueError(
                "和风天气城市搜索接口返回 404，请在 QWEATHER_GEO_API_HOST 配置和风控制台项目里的 API Host，"
                "或确认该 Host 支持 GeoAPI。"
            )
        response.raise_for_status()
        payload = response.json()
        code = str(payload.get("code") or "")
        if not code.startswith("2"):
            raise ValueError(f"和风天气接口返回错误：code={code}")
        return payload

    def _api_url(self, api_host: str, path: str) -> str:
        if not urlparse(api_host).scheme:
            api_host = f"https://{api_host}"
        return f"{api_host.rstrip('/')}{path}"

    def _format_daily_item(self, item: dict[str, Any]) -> dict[str, str]:
        return {
            "date": item.get("fxDate") or "",
            "weather": self._format_weather_text(item),
            "weatherDay": item.get("textDay") or "未知",
            "weatherNight": item.get("textNight") or "未知",
            "iconDay": item.get("iconDay") or "",
            "iconNight": item.get("iconNight") or "",
            "high": self._with_unit(item.get("tempMax"), "°C"),
            "low": self._with_unit(item.get("tempMin"), "°C"),
            "humidity": self._with_unit(item.get("humidity"), "%"),
            "wind": self._format_wind(item),
        }

    def _format_weather_text(self, item: dict[str, Any]) -> str:
        text_day = item.get("textDay")
        text_night = item.get("textNight")
        if text_day and text_night and text_day != text_night:
            return f"{text_day}转{text_night}"
        return text_day or text_night or "未知"

    def _format_wind(self, weather: dict[str, Any], suffix: str = "Day") -> str:
        wind_dir = weather.get(f"windDir{suffix}") or "未知风向"
        wind_scale = weather.get(f"windScale{suffix}")
        return f"{wind_dir} {wind_scale}级" if wind_scale else wind_dir

    def _with_unit(self, value: Any, unit: str) -> str:
        return f"{value}{unit}" if value not in (None, "") else "未知"


def extract_city(text: str) -> str:
    for city in ("广州", "深圳", "北京", "上海", "杭州", "南京", "成都", "重庆", "武汉", "西安"):
        if city in text:
            return city
    return "广州"
