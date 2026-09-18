const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
const state = {
  lat: 30.0444,
  lon: 31.2357,
  name: "Cairo",
  country: "Egypt",
  unit: "celsius",
  data: null,
  places: [],
};

const icons = {
  0: ["☀", "Clear sky"],
  1: ["🌤", "Mainly clear"],
  2: ["⛅", "Partly cloudy"],
  3: ["☁", "Overcast"],
  45: ["🌫", "Fog"],
  48: ["🌫", "Rime fog"],
  51: ["🌦", "Light drizzle"],
  53: ["🌦", "Drizzle"],
  55: ["🌧", "Heavy drizzle"],
  56: ["🌧", "Freezing drizzle"],
  57: ["🌧", "Freezing drizzle"],
  61: ["🌦", "Light rain"],
  63: ["🌧", "Rain"],
  65: ["🌧", "Heavy rain"],
  66: ["🌧", "Freezing rain"],
  67: ["🌧", "Freezing rain"],
  71: ["🌨", "Light snow"],
  73: ["🌨", "Snow"],
  75: ["❄", "Heavy snow"],
  77: ["❄", "Snow grains"],
  80: ["🌦", "Rain showers"],
  81: ["🌧", "Rain showers"],
  82: ["⛈", "Heavy showers"],
  85: ["🌨", "Snow showers"],
  86: ["🌨", "Heavy snow showers"],
  95: ["⛈", "Thunderstorm"],
  96: ["⛈", "Thunderstorm + hail"],
  99: ["⛈", "Thunderstorm + hail"],
};
function icon(code) {
  return icons[code] || ["◌", "Weather"];
}

function fmtTemp(c) {
  return state.unit === "fahrenheit"
    ? Math.round((c * 9) / 5 + 32)
    : Math.round(c);
}
function tempLabel(c) {
  return `${fmtTemp(c)}°`;
}
function windVal(kmh) {
  return state.unit === "fahrenheit"
    ? `${Math.round(kmh / 1.609)} mph`
    : `${Math.round(kmh)} km/h`;
}
function timeLabel(iso) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function dayName(date) {
  return new Date(date + "T12:00").toLocaleDateString([], { weekday: "short" });
}
function dateLabel(date) {
  return new Date(date + "T12:00").toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}
function cToF(c) {
  return (c * 9) / 5 + 32;
}

async function geocode(q) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=en&format=json`;
  const r = await fetch(url);
  if (!r.ok) throw Error("Location search failed");
  const j = await r.json();
  return j.results || [];
}
async function loadWeather() {
  setLoading();
  const hourly =
    "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,surface_pressure,visibility,wind_speed_10m,wind_direction_10m,wind_gusts_10m";
  const daily =
    "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max";
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${state.lat}&longitude=${state.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility&hourly=${hourly}&daily=${daily}&timezone=auto&forecast_days=7`;
  const r = await fetch(url);
  if (!r.ok) throw Error("Forecast request failed");
  state.data = await r.json();
  render();
}
function setLoading() {
  $("#updated").textContent = "Updating forecast…";
  $("#currentSummary").textContent = "Loading…";
}
function render() {
  const d = state.data,
    c = d.current,
    h = d.hourly,
    dy = d.daily;
  $("#placeName").textContent = `${state.name}, ${state.country}`;
  $("#coords").textContent =
    `${d.latitude.toFixed(2)}, ${d.longitude.toFixed(2)} · ${d.timezone}`;
  $("#updated").textContent = `Updated ${timeLabel(c.time)}`;
  $("#currentTemp").textContent = fmtTemp(c.temperature_2m);
  $("#tempUnit").textContent = state.unit === "fahrenheit" ? "°F" : "°C";
  const inf = icon(c.weather_code);
  $("#weatherIcon").textContent = inf[0];
  $("#currentSummary").textContent = inf[1];
  $("#feels").textContent =
    `${fmtTemp(c.apparent_temperature)}${state.unit === "fahrenheit" ? "°F" : "°C"}`;
  $("#humidity").textContent = `${c.relative_humidity_2m}%`;
  $("#wind").textContent = windVal(c.wind_speed_10m);
  $("#pressure").textContent = `${Math.round(c.surface_pressure)} hPa`;
  $("#visibility").textContent = `${(c.visibility / 1000).toFixed(1)} km`;
  const nextIndex = h.time.findIndex((t) => new Date(t) >= new Date(c.time));
  renderHourly(Math.max(0, nextIndex));
  renderDaily();
  renderChart(Math.max(0, nextIndex));
  renderWind();
  renderDetails();
  renderSun();
  const rain = Math.max(
    ...h.precipitation_probability.slice(
      Math.max(0, nextIndex),
      Math.max(0, nextIndex) + 6,
    ),
  );
  $("#rainChance").textContent = `${rain}%`;
  $("#insightFill").style.width = `${rain}%`;
  let title = "Mostly comfortable";
  let text = "Low precipitation risk over the next several hours.";
  if (rain >= 70) {
    title = "Rain likely";
    text =
      "High precipitation probability is showing in the near-term forecast. Plan outdoor activity accordingly.";
  } else if (c.wind_speed_10m >= 30) {
    title = "Windy conditions";
    text =
      "Wind speeds are elevated. Outdoor plans may feel noticeably cooler or gustier.";
  } else if (c.temperature_2m >= 32) {
    title = "High heat";
    text =
      "Temperatures are elevated. The apparent temperature is the better comfort indicator.";
  } else if (c.relative_humidity_2m >= 75) {
    title = "Humid air";
    text =
      "Humidity is high, so the air may feel warmer than the measured temperature.";
  }
  $("#insightTitle").textContent = title;
  $("#insightText").textContent = text;
}
function renderHourly(start) {
  const h = state.data.hourly;
  let html = "";
  for (let i = start; i < Math.min(start + 24, h.time.length); i++) {
    const ic = icon(h.weather_code[i]);
    html += `<div class="hour ${i === start ? "current" : ""}"><div class="t">${i === start ? "NOW" : timeLabel(h.time[i])}</div><div class="ico">${ic[0]}</div><div class="temp">${tempLabel(h.temperature_2m[i])}</div><div class="rain">${h.precipitation_probability[i]}% rain</div></div>`;
  }
  $("#hourly").innerHTML = html;
}
function renderDaily() {
  const d = state.data.daily;
  $("#daily").innerHTML = d.time
    .map((date, i) => {
      const ic = icon(d.weather_code[i]);
      return `<div class="day"><div class="day-name">${i === 0 ? "Today" : dayName(date)}</div><div class="day-date">${dateLabel(date)}</div><div class="ico">${ic[0]}</div><div><span class="hi">${tempLabel(d.temperature_2m_max[i])}</span><span class="lo">${tempLabel(d.temperature_2m_min[i])}</span></div><div class="rain-small">${d.precipitation_probability_max[i]}% · ${d.precipitation_sum[i].toFixed(1)} mm</div></div>`;
    })
    .join("");
}
function renderChart(start) {
  const canvas = $("#tempChart"),
    ctx = canvas.getContext("2d"),
    rect = canvas.getBoundingClientRect(),
    ratio = devicePixelRatio || 1;
  canvas.width = rect.width * ratio;
  canvas.height = 290 * ratio;
  ctx.scale(ratio, ratio);
  const w = rect.width,
    h = 290,
    pad = { l: 28, r: 14, t: 25, b: 35 },
    H = h - pad.t - pad.b,
    W = w - pad.l - pad.r;
  const hh = state.data.hourly,
    times = hh.time.slice(start, start + 48),
    temps = hh.temperature_2m.slice(start, start + 48),
    rain = hh.precipitation_probability.slice(start, start + 48);
  const min = Math.floor(Math.min(...temps) - 2),
    max = Math.ceil(Math.max(...temps) + 2);
  ctx.clearRect(0, 0, w, h);
  ctx.font = "9px DM Mono";
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--muted");
  for (let j = 0; j < 5; j++) {
    const y = pad.t + (H * j) / 4;
    ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue(
      "--line",
    );
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(w - pad.r, y);
    ctx.stroke();
    ctx.fillText(`${min + ((max - min) * (4 - j)) / 4}°`, 2, y + 3);
  }
  const pts = temps.map((v, i) => [
    pad.l + (W * i) / (temps.length - 1),
    pad.t + (H * (max - v)) / (max - min),
  ]);
  ctx.strokeStyle = "#70e1ff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p)));
  ctx.stroke();
  ctx.strokeStyle = "#b7ff88";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  rain.forEach((v, i) => {
    const y = pad.t + H * (1 - v / 100);
    const x = pad.l + (W * i) / (rain.length - 1);
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  });
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--muted");
  for (let i = 0; i < times.length; i += 6) {
    const x = pad.l + (W * i) / (times.length - 1);
    ctx.fillText(timeLabel(times[i]), x - 12, h - 12);
  }
}
function renderWind() {
  const h = state.data.hourly,
    start = Math.max(
      0,
      h.time.findIndex((t) => new Date(t) >= new Date(state.data.current.time)),
    );
  let rows = "";
  for (let i = start; i < Math.min(start + 8, h.time.length); i++) {
    const v = h.wind_speed_10m[i],
      deg = h.wind_direction_10m[i];
    rows += `<div class="wind-row"><span>${timeLabel(h.time[i])}</span><div class="wind-track"><i style="width:${Math.min(100, (v / 50) * 100)}%"></i></div><b>${windVal(v)} ${dir(deg)}</b></div>`;
  }
  $("#windPanel").innerHTML = rows;
}
function dir(d) {
  const x = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return x[Math.round(d / 45) % 8];
}
function renderSun() {
  const d = state.data.daily;
  $("#sunrise").textContent = timeLabel(d.sunrise[0]);
  $("#sunset").textContent = timeLabel(d.sunset[0]);
}
function renderDetails() {
  const c = state.data.current,
    h = state.data.hourly,
    idx = Math.max(
      0,
      h.time.findIndex((t) => new Date(t) >= new Date(c.time)),
    );
  const d = state.data.daily;
  const vals = [
    ["Wind gust", windVal(c.wind_gusts_10m)],
    [
      "Wind direction",
      `${Math.round(c.wind_direction_10m)}° ${dir(c.wind_direction_10m)}`,
    ],
    ["UV max", d.uv_index_max[0]],
    ["Rain today", `${d.precipitation_sum[0].toFixed(1)} mm`],
    ["Rain chance", `${d.precipitation_probability_max[0]}%`],
    ["Visibility", `${(c.visibility / 1000).toFixed(1)} km`],
    ["Dew point", "API-ready extension"],
    ["Weather code", c.weather_code],
  ];
  $("#details").innerHTML = vals
    .map((x) => `<div class="detail"><span>${x[0]}</span><b>${x[1]}</b></div>`)
    .join("");
}
async function chooseLocation(r) {
  state.lat = r.latitude;
  state.lon = r.longitude;
  state.name = r.name;
  state.country = r.country || r.country_code || "";
  $("#suggestions").classList.remove("show");
  $("#suggestions").innerHTML = "";
  $("#searchInput").value = r.name;
  saveFav(r);
  await loadWeather();
}
async function search(q) {
  if (!q || q.length < 2) return;
  try {
    const places = await geocode(q);
    state.places = places;
    $("#suggestions").innerHTML = places
      .slice(0, 6)
      .map(
        (x, i) =>
          `<div class="suggestion" data-i="${i}"><b>${x.name}</b> · ${x.admin1 || ""} · ${x.country || ""}</div>`,
      )
      .join("");
    $("#suggestions").classList.toggle("show", places.length > 0);
    $$(".suggestion").forEach(
      (el) => (el.onclick = () => chooseLocation(places[+el.dataset.i])),
    );
  } catch (e) {
    console.error(e);
  }
}
function saveFav(r) {
  const key = `weatherFavs`;
  let favs = JSON.parse(localStorage.getItem(key) || "[]");
  favs = favs.filter(
    (x) =>
      !(
        Math.abs(x.latitude - r.latitude) < 0.01 &&
        Math.abs(x.longitude - r.longitude) < 0.01
      ),
  );
  favs.unshift({
    name: r.name,
    country: r.country,
    latitude: r.latitude,
    longitude: r.longitude,
  });
  localStorage.setItem(key, JSON.stringify(favs.slice(0, 5)));
  renderFavs();
}
function renderFavs() {
  const favs = JSON.parse(localStorage.getItem("weatherFavs") || "[]");
  $("#favorites").innerHTML = favs
    .map((f, i) => `<button class="fav" data-i="${i}">★ ${f.name}</button>`)
    .join("");
  $$(".fav").forEach(
    (b) => (b.onclick = () => chooseLocation(favs[+b.dataset.i])),
  );
}
$("#searchInput").addEventListener("input", (e) => {
  clearTimeout(window.searchTimer);
  window.searchTimer = setTimeout(() => search(e.target.value.trim()), 300);
});
$("#searchForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = $("#searchInput").value.trim();
  const p = state.places[0];
  if (p && p.name.toLowerCase() === q.toLowerCase()) chooseLocation(p);
  else {
    const r = await geocode(q);
    if (r[0]) chooseLocation(r[0]);
  }
});
document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-area"))
    $("#suggestions").classList.remove("show");
});
$("#unitBtn").onclick = () => {
  state.unit = state.unit === "celsius" ? "fahrenheit" : "celsius";
  $("#unitBtn").textContent = state.unit === "celsius" ? "°C" : "°F";
  if (state.data) render();
};
$("#themeBtn").onclick = () => document.body.classList.toggle("light");
$("#locBtn").onclick = () => {
  if (!navigator.geolocation)
    return alert("Geolocation is not available in this browser.");
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      state.lat = pos.coords.latitude;
      state.lon = pos.coords.longitude;
      try {
        const r = await geocode(
          `${state.lat.toFixed(2)},${state.lon.toFixed(2)}`,
        );
        if (r[0]) {
          state.name = r[0].name;
          state.country = r[0].country || "";
        }
      } catch (e) {}
      await loadWeather();
    },
    () => alert("Location permission was not granted."),
  );
};
window.addEventListener("resize", () => {
  if (state.data)
    renderChart(
      Math.max(
        0,
        state.data.hourly.time.findIndex(
          (t) => new Date(t) >= new Date(state.data.current.time),
        ),
      ),
    );
});
renderFavs();
loadWeather().catch((e) => {
  $("#updated").textContent = "Could not load forecast";
  $("#currentSummary").textContent = "Please check your internet connection.";
  console.error(e);
});
