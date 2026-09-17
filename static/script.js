const cityInput = document.getElementById("cityInput");
const searchButton = document.getElementById("searchButton");
const errorElement = document.getElementById("error");

const cityName = document.getElementById("cityName");
const dateLine = document.getElementById("dateLine");
const weatherIcon = document.getElementById("weatherIcon");
const temperature = document.getElementById("temperature");
const condition = document.getElementById("condition");
const humidity = document.getElementById("humidity");
const wind = document.getElementById("wind");
const pressure = document.getElementById("pressure");
const feels = document.getElementById("feels");

const hourlyStrip = document.getElementById("hourlyStrip");
const upcomingList = document.getElementById("upcomingList");
const forecastList = document.getElementById("forecastList");
const updatesList = document.getElementById("updatesList");
const tempChart = document.getElementById("tempChart");
const precipChart = document.getElementById("precipChart");
const windChart = document.getElementById("windChart");


/* ============================================================
   BOTTOM NAV
   ============================================================ */

document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => setActiveView(btn.dataset.view));
});

function setActiveView(viewName) {

    document.querySelectorAll(".view").forEach(view => {
        view.classList.toggle("active", view.id === `view-${viewName}`);
    });

    document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.view === viewName);
    });

}


/* ============================================================
   SEARCH
   ============================================================ */

searchButton.addEventListener("click", getWeather);

cityInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        getWeather();
    }
});


async function getWeather() {

    const city = cityInput.value.trim();

    errorElement.innerText = "";

    if (city === "") {
        errorElement.innerText = "Please enter a city name.";
        return;
    }

    cityName.innerText = "Loading...";
    condition.innerText = "Getting weather information...";
    weatherIcon.innerHTML = "";

    searchButton.disabled = true;

    try {

        const [weatherRes, forecastRes] = await Promise.all([
            fetch(`/weather?city=${encodeURIComponent(city)}`),
            fetch(`/forecast?city=${encodeURIComponent(city)}`)
        ]);

        const weatherData = await weatherRes.json();
        const forecastData = await forecastRes.json();

        if (!weatherRes.ok) {
            showError(weatherData.message || "Unable to find this city.");
            return;
        }

        if (!forecastRes.ok) {
            showError(forecastData.message || "Unable to load the forecast.");
            return;
        }

        const days = forecastData.days || [];

        renderHome(weatherData, days);
        renderForecastList(days);
        renderStatistics(days);
        renderUpdates(days);

        setActiveView("home");

    } catch (err) {

        showError("Network error. Please check your internet connection.");

    } finally {

        searchButton.disabled = false;

    }

}


function showError(message) {

    errorElement.innerText = message;
    cityName.innerText = "Weather unavailable";
    condition.innerText = "Please try again";

}


/* ============================================================
   SHARED HELPERS
   ============================================================ */

let glyphUid = 0;

/**
 * Renders a small flat/illustrated weather icon as inline SVG —
 * an original icon set (not OpenWeatherMap's stock PNGs) styled to
 * match the soft rounded sun + white clouds look: warm gradient
 * sun/moon, soft cloud shapes, blue rain, a bolt, snow, or mist
 * lines depending on the OWM icon code's condition prefix.
 */
function weatherGlyph(iconCode, size = 40) {

    const uid = `wg${glyphUid++}`;
    const isDay = !iconCode || iconCode.endsWith("d");
    const prefix = (iconCode || "01").slice(0, 2);

    const sunGradId = `${uid}-sun`;
    const defs = `
        <radialGradient id="${sunGradId}" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stop-color="#fff6d8" />
            <stop offset="55%" stop-color="#ffd76b" />
            <stop offset="100%" stop-color="#ff9d3d" />
        </radialGradient>
    `;

    const cloud = (cx, cy, scale = 1, tone = "#eef1f7") => `
        <g transform="translate(${cx} ${cy}) scale(${scale})">
            <ellipse cx="-11" cy="2" rx="10" ry="8.5" fill="${tone}" />
            <ellipse cx="11" cy="3" rx="9" ry="7.5" fill="${tone}" />
            <ellipse cx="0" cy="-3" rx="15" ry="11" fill="${tone}" />
        </g>
    `;

    const sun = (cx, cy, r = 13, rays = true) => `
        ${rays ? Array.from({ length: 8 }).map((_, i) => {
            const angle = (i / 8) * Math.PI * 2;
            const x1 = cx + Math.cos(angle) * (r + 4);
            const y1 = cy + Math.sin(angle) * (r + 4);
            const x2 = cx + Math.cos(angle) * (r + 9);
            const y2 = cy + Math.sin(angle) * (r + 9);
            return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#ffc972" stroke-width="2.5" stroke-linecap="round" />`;
        }).join("") : ""}
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${sunGradId})" />
    `;

    const moon = (cx, cy, r = 12) => `
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="#eef2fb" />
        <circle cx="${cx + 4}" cy="${cy - 3}" r="2" fill="#cdd7ec" />
        <circle cx="${cx - 3}" cy="${cy + 4}" r="1.4" fill="#cdd7ec" />
    `;

    const drops = (cx, cy, count = 3) => Array.from({ length: count }).map((_, i) => {
        const x = cx - (count - 1) * 6 + i * 12;
        return `<path d="M ${x} ${cy} q 3 6 0 10 q -3 -4 0 -10 Z" fill="#5b9dfb" />`;
    }).join("");

    const bolt = (cx, cy) => `
        <path d="M ${cx + 3} ${cy - 10} L ${cx - 6} ${cy + 4} L ${cx} ${cy + 4} L ${cx - 3} ${cy + 14} L ${cx + 7} ${cy - 1} L ${cx + 1} ${cy - 1} Z"
              fill="#ffc94d" />
    `;

    const flakes = (cx, cy, count = 3) => Array.from({ length: count }).map((_, i) => {
        const x = cx - (count - 1) * 6 + i * 12;
        const y = cy + (i % 2 === 0 ? 0 : 5);
        return `<circle cx="${x}" cy="${y}" r="2.4" fill="#bcd4f5" />`;
    }).join("");

    const mistLines = (cx, cy) => [0, 1, 2].map(i =>
        `<rect x="${cx - 18}" y="${cy - 8 + i * 8}" width="${36 - i * 6}" height="3.4" rx="1.7" fill="#c3cbd6" />`
    ).join("");

    let body;

    switch (prefix) {

        case "01":
            body = isDay ? sun(32, 32, 14) : moon(32, 32, 13);
            break;

        case "02":
            body = `${isDay ? sun(23, 22, 10) : moon(23, 22, 10)} ${cloud(38, 38, 1)}`;
            break;

        case "03":
            body = cloud(32, 34, 1.15);
            break;

        case "04":
            body = `${cloud(24, 30, 0.85)} ${cloud(38, 37, 1.05)}`;
            break;

        case "09":
            body = `${cloud(32, 24, 1.05)} ${drops(32, 44, 3)}`;
            break;

        case "10":
            body = `${isDay ? sun(19, 16, 7) : ""} ${cloud(34, 27, 1)} ${drops(34, 45, 3)}`;
            break;

        case "11":
            body = `${cloud(32, 22, 1.05)} ${bolt(32, 38)}`;
            break;

        case "13":
            body = `${cloud(32, 24, 1)} ${flakes(32, 44, 3)}`;
            break;

        case "50":
            body = mistLines(32, 32);
            break;

        default:
            body = cloud(32, 34, 1.1);

    }

    return `
        <svg width="${size}" height="${size}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
            <defs>${defs}</defs>
            ${body}
        </svg>
    `;

}

function dayLabel(dateStr, index) {

    if (index === 0) return "Today";
    if (index === 1) return "Tomorrow";

    const d = new Date(`${dateStr}T00:00:00`);
    return d.toLocaleDateString("en-US", { weekday: "long" });

}

function shortWeekday(dateStr) {
    const d = new Date(`${dateStr}T00:00:00`);
    return d.toLocaleDateString("en-US", { weekday: "short" }).charAt(0);
}


/* ============================================================
   HOME VIEW
   ============================================================ */

function renderHome(data, days) {

    cityName.innerText = `${data.name}, ${data.sys.country}`;

    dateLine.innerText = `Today, ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

    weatherIcon.innerHTML = weatherGlyph(data.weather[0].icon, 90);

    temperature.innerText = `${Math.round(data.main.temp)}°C`;
    condition.innerText = data.weather[0].description;

    humidity.innerText = `${data.main.humidity}%`;
    wind.innerText = `${data.wind.speed} m/s`;
    pressure.innerText = `${data.main.pressure} hPa`;
    feels.innerText = `${Math.round(data.main.feels_like)}°C`;

    renderHourlyStrip(days[0] ? days[0].hourly : []);
    renderUpcoming(days);

}


function renderHourlyStrip(hourly) {

    hourlyStrip.innerHTML = "";

    if (hourly.length === 0) {
        hourlyStrip.innerHTML = `<p class="muted small">No more data for today.</p>`;
        return;
    }

    hourly.forEach(point => {

        const chip = document.createElement("div");
        chip.className = "hour-chip";

        chip.innerHTML = `
            <div class="hour-time">${point.time}</div>
            ${weatherGlyph(point.icon, 34)}
            <div class="hour-temp">${point.temp}°</div>
        `;

        hourlyStrip.appendChild(chip);

    });

}


function renderUpcoming(days) {

    upcomingList.innerHTML = "";

    days.forEach((day, index) => {

        const row = document.createElement("div");
        row.className = "day-row";

        row.innerHTML = `
            ${weatherGlyph(day.icon, 36)}
            <div class="day-info">
                <div class="day-name">${dayLabel(day.date, index)}</div>
                <div class="day-desc">${day.description}</div>
            </div>
            <div class="day-temps">${day.max_temp}° <span class="low">${day.min_temp}°</span></div>
        `;

        upcomingList.appendChild(row);

    });

}


/* ============================================================
   FORECAST VIEW (expandable)
   ============================================================ */

function renderForecastList(days) {

    forecastList.innerHTML = "";

    days.forEach((day, index) => {

        const item = document.createElement("div");
        item.className = "forecast-item";

        const hourlyChips = day.hourly.map(point => `
            <div class="hour-chip">
                <div class="hour-time">${point.time}</div>
                ${weatherGlyph(point.icon, 34)}
                <div class="hour-temp">${point.temp}°</div>
            </div>
        `).join("");

        item.innerHTML = `
            <div class="day-row">
                ${weatherGlyph(day.icon, 36)}
                <div class="day-info">
                    <div class="day-name">${dayLabel(day.date, index)}</div>
                    <div class="day-desc">${day.description}</div>
                </div>
                <div class="day-temps">${day.max_temp}° <span class="low">${day.min_temp}°</span></div>
            </div>
            <div class="forecast-hourly">${hourlyChips}</div>
        `;

        item.querySelector(".day-row").addEventListener("click", () => {
            item.classList.toggle("expanded");
        });

        forecastList.appendChild(item);

    });

}


/* ============================================================
   STATISTICS VIEW (inline SVG charts)
   ============================================================ */

function renderStatistics(days) {

    tempChart.innerHTML = buildBarChart(days, d => d.max_temp, {
        gradientFrom: "#ffc36b",
        gradientTo: "#ff8a3d",
        suffix: "°"
    });

    precipChart.innerHTML = buildLineChart(days, d => d.max_pop, {
        color: "#5b9dfb",
        suffix: "%",
        maxDomain: 100
    });

    windChart.innerHTML = buildBarChart(days, d => d.avg_wind, {
        gradientFrom: "#a9c8ff",
        gradientTo: "#5b9dfb",
        suffix: "m/s"
    });

}


function buildBarChart(days, valueFn, opts) {

    const width = 300;
    const height = 150;
    const baseline = 122;
    const top = 34;

    const values = days.map(valueFn);
    const maxV = Math.max(...values);
    const minV = Math.min(...values);
    const range = Math.max(maxV - minV, 1);

    const slot = (width - 40) / days.length;
    const barWidth = Math.min(22, slot * 0.5);
    const gradId = `grad-${Math.random().toString(36).slice(2, 8)}`;

    let bars = "";

    days.forEach((day, i) => {

        const value = valueFn(day);
        const barHeight = 18 + ((value - minV) / range) * (baseline - top - 18);
        const x = 20 + i * slot + (slot - barWidth) / 2;
        const y = baseline - barHeight;

        bars += `
            <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}"
                  rx="${barWidth / 2}" fill="url(#${gradId})" />
            <text x="${x + barWidth / 2}" y="${y - 8}" text-anchor="middle"
                  font-size="11" font-weight="700" fill="#1f2430">${value}${opts.suffix}</text>
            <text x="${x + barWidth / 2}" y="${baseline + 18}" text-anchor="middle"
                  font-size="11" fill="#8a94a6">${shortWeekday(day.date)}</text>
        `;

    });

    return `
        <svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="${opts.gradientFrom}" />
                    <stop offset="100%" stop-color="${opts.gradientTo}" />
                </linearGradient>
            </defs>
            ${bars}
        </svg>
    `;

}


function buildLineChart(days, valueFn, opts) {

    const width = 300;
    const height = 150;
    const baseline = 122;
    const top = 40;

    const maxDomain = opts.maxDomain || Math.max(...days.map(valueFn), 1);
    const slot = (width - 40) / days.length;

    const points = days.map((day, i) => {
        const value = valueFn(day);
        const x = 20 + i * slot + slot / 2;
        const y = baseline - (value / maxDomain) * (baseline - top);
        return { x, y, value, date: day.date };
    });

    const linePath = points
        .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
        .join(" ");

    const areaPath = `M ${points[0].x} ${baseline} ` +
        points.map(p => `L ${p.x} ${p.y}`).join(" ") +
        ` L ${points[points.length - 1].x} ${baseline} Z`;

    const labels = points.map((p, i) => `
        <text x="${p.x}" y="${p.y - 10}" text-anchor="middle"
              font-size="11" font-weight="700" fill="#1f2430">${p.value}${opts.suffix}</text>
        <circle cx="${p.x}" cy="${p.y}" r="3.5" fill="${opts.color}" />
        <text x="${p.x}" y="${baseline + 18}" text-anchor="middle"
              font-size="11" fill="#8a94a6">${shortWeekday(days[i].date)}</text>
    `).join("");

    const gradId = `area-${Math.random().toString(36).slice(2, 8)}`;

    return `
        <svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="${opts.color}" stop-opacity="0.35" />
                    <stop offset="100%" stop-color="${opts.color}" stop-opacity="0" />
                </linearGradient>
            </defs>
            <path d="${areaPath}" fill="url(#${gradId})" />
            <path d="${linePath}" fill="none" stroke="${opts.color}" stroke-width="2.5"
                  stroke-linecap="round" stroke-linejoin="round" />
            ${labels}
        </svg>
    `;

}


/* ============================================================
   DAILY UPDATES VIEW
   ============================================================ */

function renderUpdates(days) {

    updatesList.innerHTML = "";

    days.forEach((day, index) => {

        const card = document.createElement("div");
        card.className = "update-card";

        card.innerHTML = `
            ${weatherGlyph(day.icon, 34)}
            <div class="update-text">
                <div class="update-label">${dayLabel(day.date, index)}</div>
                <div class="update-blurb">${buildBlurb(day)}</div>
            </div>
        `;

        updatesList.appendChild(card);

    });

}


function buildBlurb(day) {

    switch (day.main) {

        case "Clear":
            return `A clear day ahead with a high of ${day.max_temp}°C — good conditions to be outside.`;

        case "Clouds":
            return `Expect ${day.description} with temperatures around ${day.max_temp}°C.`;

        case "Rain":
        case "Drizzle":
            return `${day.max_pop}% chance of rain — an umbrella wouldn't hurt.`;

        case "Thunderstorm":
            return `Thunderstorms possible, with a ${day.max_pop}% chance of rain through the day.`;

        case "Snow":
            return `Snow expected, with lows dropping to ${day.min_temp}°C.`;

        default:
            return `Expect ${day.description}, with humidity around ${day.avg_humidity}%.`;

    }

}

// ==========================================
// THEME TOGGLE (LIGHT / DARK)
// ==========================================
const themeToggleBtn = document.getElementById('themeToggle');

// Load saved preference or check device setting
const savedTheme = localStorage.getItem('app-theme') || 
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

document.documentElement.setAttribute('data-theme', savedTheme);

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', nextTheme);
        localStorage.setItem('app-theme', nextTheme);
    });
}

// Automatically detect city on app startup
async function detectUserLocation() {
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        
        if (data && data.city) {
            cityInput.value = data.city;
            getWeather();
            return;
        }
    } catch (error) {
        console.warn('Auto-location detection failed:', error);
    }

    // Fallback if detection fails or is blocked
    cityInput.value = 'Dubai';
    getWeather();
}

// Run when the app opens
detectUserLocation();