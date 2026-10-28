// --- ELEMENTS ---
const searchBtn = document.getElementById('searchBtn');
const locationBtn = document.getElementById('locationBtn');
const cityInput = document.getElementById('cityInput');
const themeToggle = document.getElementById('themeToggle');
const unitToggle = document.getElementById('unitToggle');
const favBtn = document.getElementById('favBtn');
const favDropdown = document.getElementById('favDropdown');
const micBtn = document.getElementById('micBtn');
const body = document.body;

// Sections
const landingSection = document.getElementById('landingSection');
const dashboardContainer = document.getElementById('dashboardContainer');
const loadingOverlay = document.getElementById('loadingOverlay');
const greetingMsg = document.getElementById('greetingMsg');

// Data Elements
const currentSection = document.getElementById('currentWeatherSection');
const hourlyContainer = document.getElementById('hourlyContainer');
const weatherContainer = document.getElementById('weatherContainer');
const weatherScene = document.getElementById('weatherScene');
const smartText = document.getElementById('smartText');

// Event Planner Elements
const checkEventBtn = document.getElementById('checkEventBtn');
const eventActivity = document.getElementById('eventActivity');
const eventDay = document.getElementById('eventDay');
const eventResult = document.getElementById('eventResult');

// Time Travel Elements
const historyBtn = document.getElementById('historyBtn');
const historyDateInput = document.getElementById('historyDate');
const historyResult = document.getElementById('historyResult');

// Highlights
const windSpeedElem = document.getElementById('windSpeed');
const windDirElem = document.getElementById('windDir');
const aqiValueElem = document.getElementById('aqiValue');
const aqiStatusElem = document.getElementById('aqiStatus');
const aqiBarFill = document.getElementById('aqiBarFill');
const pm25Val = document.getElementById('pm25Value');
const so2Val = document.getElementById('so2Value');
const sunriseTimeElem = document.getElementById('sunriseTime');
const sunsetTimeElem = document.getElementById('sunsetTime');

// Atmosphere
const humidityVal = document.getElementById('humidityVal');
const visibilityVal = document.getElementById('visibilityVal');
const pressureVal = document.getElementById('pressureVal');

// Calendar
const calGrid = document.getElementById('calendarGrid');
const calMonthYear = document.getElementById('calMonthYear');

const apiKey = '8a5477b3602ec06446ebf7358da4be7f';
let currentUnit = 'metric';
let currentCity = 'Mumbai';

// Global coordinates for Time Travel
let currentLat = 19.0760;
let currentLon = 72.8777;

let isManualTheme = false;
let mapInstance = null;
let chartInstance = null;

// Store forecast data globally for Event Planner
let globalForecastList = [];

// --- INIT ---
window.addEventListener('load', () => {
   setGreeting();
   loadFavorites();
   updateMoonPhase();
   updateTrivia();
});

function setGreeting() {
   const hour = new Date().getHours();
   let msg = "Hello there!";
   if (hour < 12) msg = "Good Morning!";
   else if (hour < 18) msg = "Good Afternoon!";
   else msg = "Good Evening!";
   if(greetingMsg) greetingMsg.innerText = msg;
}

// --- 1. TOGGLES ---
themeToggle.addEventListener('click', () => {
 body.classList.toggle('dark');
 isManualTheme = true;
 updateThemeIcon();
 if(mapInstance) updateMapTiles();
});

function updateThemeIcon() {
 const isDark = body.classList.contains('dark');
 const iconSpan = themeToggle.querySelector('.icon');
 const textSpan = themeToggle.querySelector('.text');
 iconSpan.innerText = isDark ? '☀️' : '🌙';
 textSpan.innerText = isDark ? 'Light' : 'Dark';
}

unitToggle.addEventListener('click', () => {
   currentUnit = currentUnit === 'metric' ? 'imperial' : 'metric';
   unitToggle.innerText = currentUnit === 'metric' ? '°C / °F' : '°F / °C';
   fetchWeather(currentCity);
});

// VOICE SEARCH
micBtn.addEventListener('click', () => {
   const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
   if (!SpeechRecognition) { alert("Voice search not supported."); return; }
   
   const recognition = new SpeechRecognition();
   recognition.lang = 'en-US';
   recognition.start();
   micBtn.style.color = '#f39c12';
   
   recognition.onresult = (event) => {
       const text = event.results[0][0].transcript;
       cityInput.value = text;
       fetchWeather(text);
       micBtn.style.color = '';
   };
   recognition.onend = () => { micBtn.style.color = ''; };
});

// FAVORITES
favBtn.addEventListener('click', () => {
   if (!currentCity) return;
   const favorites = JSON.parse(localStorage.getItem('weatherFavs')) || [];
   
   if (favorites.includes(currentCity)) {
       const newFavs = favorites.filter(c => c !== currentCity);
       localStorage.setItem('weatherFavs', JSON.stringify(newFavs));
       favBtn.classList.remove('active', 'fa-solid');
       favBtn.classList.add('fa-regular');
   } else {
       favorites.push(currentCity);
       localStorage.setItem('weatherFavs', JSON.stringify(favorites));
       favBtn.classList.add('active', 'fa-solid');
       favBtn.classList.remove('fa-regular');
   }
   loadFavorites();
});

function loadFavorites() {
   const favorites = JSON.parse(localStorage.getItem('weatherFavs')) || [];
   favDropdown.innerHTML = '<option value="" disabled selected>❤ Saved Cities</option>';
   if (favorites.length > 0) {
       favDropdown.style.display = 'block';
       favorites.forEach(city => {
           const option = document.createElement('option');
           option.value = city; option.innerText = city;
           favDropdown.appendChild(option);
       });
   } else {
       favDropdown.style.display = 'none';
   }
}

favDropdown.addEventListener('change', (e) => {
   if(e.target.value) {
       cityInput.value = e.target.value;
       fetchWeather(e.target.value);
   }
});

function checkFavorite(city) {
   const favorites = JSON.parse(localStorage.getItem('weatherFavs')) || [];
   if (favorites.includes(city)) {
       favBtn.classList.add('active', 'fa-solid');
       favBtn.classList.remove('fa-regular');
   } else {
       favBtn.classList.remove('active', 'fa-solid');
       favBtn.classList.add('fa-regular');
   }
}

// --- 2. SEARCH & LOCATION ---
searchBtn.addEventListener('click', () => {
 const city = cityInput.value.trim();
 if(city) fetchWeather(city);
});
cityInput.addEventListener('keypress', (e) => {
 if(e.key === 'Enter') searchBtn.click();
});

locationBtn.addEventListener('click', () => {
 if (navigator.geolocation) {
   navigator.geolocation.getCurrentPosition(
     (pos) => fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
     () => alert("Unable to retrieve location.")
   );
 } else {
   alert("Geolocation not supported.");
 }
});

// --- 3. FETCH DATA ---
async function fetchWeather(city) {
 // --- DATABASE LOGGING START ---
 fetch('http://localhost:3000/api/history', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ city: city })
 }).catch(err => console.log('History logging failed (is server running?):', err));
 // --- DATABASE LOGGING END ---
 
 const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=${currentUnit}&appid=${apiKey}`;
 processFetch(url);
}

async function fetchWeatherByCoords(lat, lon) {
   const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${currentUnit}&appid=${apiKey}`;
   processFetch(url);
}

function toggleSkeleton(show) {
   const elems = [windSpeedElem, humidityVal, visibilityVal, pressureVal, aqiValueElem, currentSection];
   elems.forEach(el => {
       if(show) el.classList.add('skeleton');
       else el.classList.remove('skeleton');
   });
}

async function processFetch(url) {
 try {
   loadingOverlay.style.display = 'flex';
   toggleSkeleton(true);

   const res = await fetch(url);
   const data = await res.json();

   if (data.cod !== "200" && data.cod !== 200) {
     alert("City not found!");
     loadingOverlay.style.display = 'none';
     return;
   }

   // Update Global Data
   globalForecastList = data.list;
   currentCity = data.city.name;
   currentLat = data.city.coord.lat;
   currentLon = data.city.coord.lon;

   // --- FETCH COMMUNITY VOTES ---
   fetchVoteCounts(currentCity);
   // -----------------------------

   landingSection.style.display = 'none';
   dashboardContainer.style.display = 'block';

   checkFavorite(currentCity);

   const current = data.list[0];
   const cityData = data.city;
   const dailyData = filterDailyForecast(data.list);

   updateScene(cityData);

   displayCurrent(current);
   displayHourly(data.list.slice(0, 8), cityData.timezone);
   displayDaily(dailyData);
   displayHighlights(current, cityData);
   generateSmartText(current, dailyData);
   
   renderChart(data.list.slice(0, 8), cityData.timezone);
   initMap(cityData.coord.lat, cityData.coord.lon);
   fetchAQI(cityData.coord.lat, cityData.coord.lon);
   
   if (!isManualTheme) {
       const now = Date.now() / 1000;
       const isNight = now > cityData.sunset || now < cityData.sunrise;
       if(isNight) body.classList.add('dark');
       else body.classList.remove('dark');
       updateThemeIcon();
   }
   
   generateCalendar(dailyData);
   
   setTimeout(() => {
       loadingOverlay.style.display = 'none';
       toggleSkeleton(false);
   }, 800);

 } catch (err) {
   console.error(err);
   alert("Error fetching data.");
   loadingOverlay.style.display = 'none';
 }
}

// --- 4. DISPLAY FUNCTIONS ---
function updateScene(city) {
   const now = Date.now() / 1000;
   const isNight = now > city.sunset || now < city.sunrise;
   
   if (isNight) {
       weatherScene.classList.add('is-night');
       weatherScene.classList.remove('is-day');
   } else {
       weatherScene.classList.add('is-day');
       weatherScene.classList.remove('is-night');
   }
}

function displayCurrent(data) {
   const icon = getIcon(data.weather[0].main);
   const temp = Math.round(data.main.temp);
   const unitSym = currentUnit === 'metric' ? '°C' : '°F';
   
   currentSection.innerHTML = `
       <div class="current-icon"><img src="${icon}" width="120" style="filter: drop-shadow(0 0 10px rgba(255,255,255,0.5));"></div>
       <div class="current-info">
           <div class="current-temp">${temp}${unitSym}</div>
           <div class="current-desc">${data.weather[0].description}</div>
       </div>
   `;
}

function generateSmartText(current, daily) {
   let msg = "";
   const temp = current.main.temp;
   const desc = current.weather[0].main.toLowerCase();
   const wind = current.wind.speed;
   
   if(desc.includes('rain')) msg = "Don't forget your umbrella, it's wet out there! ☔";
   else if(desc.includes('clear') && temp > 30) msg = "Sun's out! Wear sunscreen and sunglasses. 🕶️";
   else if(desc.includes('snow')) msg = "Bundle up! It's freezing. ❄️";
   else if(wind > 10) msg = "Hold onto your hat! It's pretty windy. 💨";
   else if(current.main.humidity > 80) msg = "High humidity detected. Hair might get frizzy! 🦁";
   else msg = "Looks like a great day to be outside! 🌳";
   
   smartText.innerText = msg;
}

function renderChart(hourlyData, offset) {
   const ctx = document.getElementById('tempChart').getContext('2d');
   if(chartInstance) chartInstance.destroy();

   const labels = hourlyData.map(item => {
       const date = new Date((item.dt + offset) * 1000);
       return date.toLocaleTimeString([], {hour: '2-digit', timeZone:'UTC'});
   });
   const temps = hourlyData.map(item => Math.round(item.main.temp));

   chartInstance = new Chart(ctx, {
       type: 'line',
       data: {
           labels: labels,
           datasets: [{
               label: 'Temp',
               data: temps,
               borderColor: 'rgba(255, 255, 255, 0.9)',
               backgroundColor: 'rgba(255, 255, 255, 0.2)',
               borderWidth: 2,
               pointBackgroundColor: '#fff',
               pointRadius: 4,
               tension: 0.4,
               fill: true
           }]
       },
       options: {
           responsive: true,
           maintainAspectRatio: false,
           plugins: { legend: { display: false } },
           scales: {
               x: { ticks: { color: 'rgba(255,255,255,0.8)', font: {size: 10} }, grid: { display: false } },
               y: { display: false }
           }
       }
   });
}

function displayHourly(list, offset) {
   hourlyContainer.innerHTML = '';
   list.forEach(item => {
       const date = new Date((item.dt + offset) * 1000);
       const time = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', timeZone:'UTC'});
       hourlyContainer.innerHTML += `
           <div class="hourly-item">
               <div style="font-size:0.8rem; margin-bottom:5px;">${time}</div>
               <img src="${getIcon(item.weather[0].main)}" width="35">
               <div style="font-weight:bold; margin-top:5px;">${Math.round(item.main.temp)}°</div>
           </div>
       `;
   });
}

function displayHighlights(data, city) {
   const speedUnit = currentUnit === 'metric' ? 'km/h' : 'mph';
   const speed = currentUnit === 'metric' ? Math.round(data.wind.speed * 3.6) : Math.round(data.wind.speed);
   const distUnit = currentUnit === 'metric' ? 'km' : 'mi';
   const visibility = currentUnit === 'metric' ? (data.visibility / 1000).toFixed(1) : (data.visibility / 1609).toFixed(1);

   windSpeedElem.innerText = `${speed} ${speedUnit}`;
   windDirElem.innerText = `Direction: ${getDirection(data.wind.deg)}`;
   
   humidityVal.innerText = `${data.main.humidity}%`;
   pressureVal.innerText = `${data.main.pressure} hPa`;
   visibilityVal.innerText = `${visibility} ${distUnit}`;

   const sunrise = new Date((city.sunrise + city.timezone) * 1000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', timeZone:'UTC'});
   const sunset = new Date((city.sunset + city.timezone) * 1000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', timeZone:'UTC'});
   sunriseTimeElem.innerText = sunrise;
   sunsetTimeElem.innerText = sunset;
}

function displayDaily(list) {
   weatherContainer.innerHTML = '';
   list.forEach(day => {
       const date = new Date(day.dt * 1000);
       const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
       const div = document.createElement('div');
       div.classList.add('day-forecast');
       div.innerHTML = `
           <h3>${dayName}</h3>
           <img src="${getIcon(day.weather[0].main)}">
           <div class="temp">${Math.round(day.main.temp)}°</div>
           <div style="font-size:0.8rem; opacity:0.8">${day.weather[0].main}</div>
       `;
       weatherContainer.appendChild(div);
   });
}

async function fetchAQI(lat, lon) {
   const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;
   try {
       const res = await fetch(url);
       const data = await res.json();
       const aqi = data.list[0].main.aqi;
       const comps = data.list[0].components;

       aqiValueElem.innerText = aqi;
       pm25Val.innerText = comps.pm2_5.toFixed(1);
       so2Val.innerText = comps.so2.toFixed(1);

       let status = "Good", color = "#4caf50";
       if(aqi===2){ status="Fair"; color="#8bc34a"; }
       else if(aqi===3){ status="Mod"; color="#ffeb3b"; }
       else if(aqi===4){ status="Poor"; color="#ff9800"; }
       else if(aqi===5){ status="Bad"; color="#f44336"; }

       aqiStatusElem.innerText = status;
       aqiStatusElem.style.color = color;
       aqiBarFill.style.width = `${aqi * 20}%`;
       aqiBarFill.style.background = color;
   } catch(e) { console.log(e); }
}

function initMap(lat, lon) {
   if (mapInstance) {
       mapInstance.setView([lat, lon], 10);
       updateMapTiles();
       return;
   }

   mapInstance = L.map('map', { zoomControl: false }).setView([lat, lon], 10);
   L.marker([lat, lon]).addTo(mapInstance);
   updateMapTiles();
}

function updateMapTiles() {
   if(!mapInstance) return;
   mapInstance.eachLayer((layer) => {
       if (layer instanceof L.TileLayer) mapInstance.removeLayer(layer);
   });
   const isDark = body.classList.contains('dark');
   const tileUrl = isDark
       ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
       : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
   L.tileLayer(tileUrl, { attribution: '&copy; OpenStreetMap contributors' }).addTo(mapInstance);
}

function generateCalendar(dailyData) {
   calGrid.innerHTML = '';
   const now = new Date();
   const year = now.getFullYear();
   const month = now.getMonth();
   const today = now.getDate();

   const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
   calMonthYear.innerText = `${monthNames[month]} ${year}`;

   ['Su','Mo','Tu','We','Th','Fr','Sa'].forEach(d => calGrid.innerHTML += `<div class="cal-weekday">${d}</div>`);

   const firstDayIndex = new Date(year, month, 1).getDay();
   const daysInMonth = new Date(year, month + 1, 0).getDate();

   for(let i=0; i<firstDayIndex; i++) calGrid.innerHTML += `<div class="cal-day empty"></div>`;

   for(let d=1; d<=daysInMonth; d++) {
       let matchedData = dailyData.find(item => {
           const fDate = new Date(item.dt * 1000);
           return fDate.getDate() === d && fDate.getMonth() === month;
       });

       let content = `<div class="cal-date-num">${d}</div>`;
       if(matchedData) {
           const icon = getIcon(matchedData.weather[0].main);
           const temp = Math.round(matchedData.main.temp);
           content += `<div class="cal-weather-info"><img src="${icon}"><span>${temp}°</span></div>`;
       }
       calGrid.innerHTML += `<div class="cal-day ${d === today ? 'today' : ''}">${content}</div>`;
   }
}

function updateMoonPhase() {
   try {
       const now = new Date();
       const synmonth = 29.53058867;
       const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
       const epoch = new Date(2000, 0, 6);
       
       const diff = date.getTime() - epoch.getTime();
       const days = diff / (1000 * 60 * 60 * 24);
       
       const cycles = days / synmonth;
       const phaseIndex = cycles - Math.floor(cycles);
       
       let index = Math.round(phaseIndex * 8);
       if (index >= 8) index = 0; 

       const moonPhases = [
           { name: "New Moon", icon: "🌑" },
           { name: "Waxing Crescent", icon: "🌒" },
           { name: "First Quarter", icon: "🌓" },
           { name: "Waxing Gibbous", icon: "🌔" },
           { name: "Full Moon", icon: "🌕" },
           { name: "Waning Gibbous", icon: "🌖" },
           { name: "Last Quarter", icon: "🌗" },
           { name: "Waning Crescent", icon: "🌘" }
       ];

       const currentPhase = moonPhases[index];
       const age = Math.round(phaseIndex * 29.53);

       const iconEl = document.getElementById('moonIcon');
       const nameEl = document.getElementById('moonPhaseName');
       const ageEl = document.getElementById('moonAge');

       if(iconEl) iconEl.innerText = currentPhase.icon;
       if(nameEl) nameEl.innerText = currentPhase.name;
       if(ageEl) ageEl.innerText = `Age: ~${age} days`;

   } catch (e) {
       console.error("Moon Phase Error:", e);
   }
}

// TRIVIA
const weatherFacts = [
   "A bolt of lightning is five times hotter than the sun.",
   "Clouds look white because they reflect sunlight from above.",
   "Antarctica is technically the world's largest desert.",
   "Rain contains vitamin B12!",
   "A hurricane releases enough energy in one second to explode a 10-megaton nuclear bomb.",
   "You can tell the temperature by counting a cricket's chirps!",
   "The fastest wind ever recorded on Earth was 253 mph (408 km/h).",
   "Sandstorms can swallow up entire cities.",
   "Worms wiggle up from underground when it rains so they don't drown."
];

function updateTrivia() {
   const textElem = document.getElementById('triviaText');
   if(textElem) {
       const randomIndex = Math.floor(Math.random() * weatherFacts.length);
       textElem.innerText = weatherFacts[randomIndex];
   }
}

document.getElementById('newFactBtn').addEventListener('click', updateTrivia);

// --- UTILS ---
function filterDailyForecast(list) {
   const daily = [];
   const seen = new Set();
   list.forEach(item => {
       const date = new Date(item.dt * 1000).toLocaleDateString();
       if(!seen.has(date)) { seen.add(date); daily.push(item); }
   });
   return daily.slice(0, 6);
}

function getIcon(type) {
   type = type.toLowerCase();
   if(type.includes('clear')) return 'assets/weather/clear-day.svg';
   if(type.includes('cloud')) return 'assets/weather/cloudy.svg';
   if(type.includes('rain')) return 'assets/weather/rain.svg';
   if(type.includes('snow')) return 'assets/weather/snow.svg';
   if(type.includes('thunder')) return 'assets/weather/thunderstorm.svg';
   return 'assets/weather/cloudy.svg';
}

function getDirection(deg) {
   const dirs = ['N','NE','E','SE','S','SW','W','NW'];
   return dirs[Math.round(deg/45) % 8];
}

// --- EVENT PLANNER LOGIC ---
checkEventBtn.addEventListener('click', () => {
   const activity = eventActivity.value;
   const dayIndex = parseInt(eventDay.value);
   
   if (globalForecastList.length === 0) {
       eventResult.style.display = 'block';
       eventResult.innerText = "Please search for a city first!";
       return;
   }

   const today = new Date();
   const targetDate = new Date(today);
   targetDate.setDate(today.getDate() + dayIndex);
   const targetDayString = targetDate.getDate();

   let forecast = globalForecastList.find(f => {
       const fDate = new Date(f.dt * 1000);
       return fDate.getDate() === targetDayString && fDate.getHours() >= 11;
   });

   if (!forecast) {
       forecast = globalForecastList.find(f => {
           const fDate = new Date(f.dt * 1000);
           return fDate.getDate() === targetDayString;
       });
   }

   if (!forecast) {
       eventResult.style.display = 'block';
       eventResult.innerHTML = "No forecast data available for this day yet.";
       return;
   }

   const condition = forecast.weather[0].main.toLowerCase();
   const temp = forecast.main.temp;
   const wind = forecast.wind.speed;
   
   let status = "GO";
   let message = "Conditions look great!";
   let color = "#4caf50";

   if (activity === 'cricket' || activity === 'wedding' || activity === 'bbq') {
       if (condition.includes('rain') || condition.includes('snow') || condition.includes('thunder')) {
           status = "NO-GO";
           message = `Rain or bad weather detected (${condition}). Bad idea.`;
           color = "#ff4757";
       } else if (wind > 8) {
           status = "CAUTION";
           message = "It's quite windy, might disturb plans.";
           color = "#f39c12";
       }
   }
   
   if (activity === 'hiking') {
       if (condition.includes('rain') || condition.includes('thunder')) {
           status = "DANGEROUS";
           message = "Storms predicted. Do not go.";
           color = "#ff4757";
       } else if (temp > 35) {
           status = "CAUTION";
           message = "Very hot! Carry extra water.";
           color = "#f39c12";
       }
   }

   if (activity === 'drive') {
       if (condition.includes('snow') || condition.includes('fog') || condition.includes('mist')) {
           status = "CAUTION";
           message = "Low visibility expected. Drive carefully.";
           color = "#f39c12";
       }
   }

   eventResult.style.display = 'block';
   eventResult.style.background = `rgba(255,255,255,0.8)`;
   eventResult.style.borderLeft = `5px solid ${color}`;
   eventResult.style.color = "#333";
   eventResult.innerHTML = `
       <div style="font-size:1.2rem; color:${color}; margin-bottom:5px;">${status}</div>
       <div style="font-size:0.9rem;">${message}</div>
       <div style="font-size:0.8rem; opacity:0.6; margin-top:5px;">Forecast: ${Math.round(temp)}°, ${condition}</div>
   `;
});

// --- TIME TRAVEL (HISTORY) LOGIC ---
historyBtn.addEventListener('click', async () => {
   const dateStr = historyDateInput.value;
   if(!dateStr) {
       historyResult.style.display = 'block';
       historyResult.innerText = "Please select a date first!";
       return;
   }

   historyResult.style.display = 'block';
   historyResult.innerHTML = "Traveling through time... <i class='fa-solid fa-spinner fa-spin'></i>";

   const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${currentLat}&longitude=${currentLon}&start_date=${dateStr}&end_date=${dateStr}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;

   try {
       const res = await fetch(url);
       const data = await res.json();
       
       if(!data.daily || !data.daily.time || data.daily.time.length === 0) {
           historyResult.innerText = "No data found for this date. Try a different one.";
           return;
       }

       const max = data.daily.temperature_2m_max[0];
       const min = data.daily.temperature_2m_min[0];
       const rain = data.daily.precipitation_sum[0];

       historyResult.innerHTML = `
           <h4 style="margin-bottom:10px;">Weather on ${dateStr}</h4>
           <div style="display:flex; justify-content:space-around; align-items:center;">
               <div><i class="fa-solid fa-temperature-high" style="color:#ff6b81;"></i> Max: <strong>${max}°C</strong></div>
               <div><i class="fa-solid fa-temperature-low" style="color:#4facfe;"></i> Min: <strong>${min}°C</strong></div>
           </div>
           <div style="margin-top:10px;"><i class="fa-solid fa-droplet" style="color:#00d2d3;"></i> Rainfall: <strong>${rain} mm</strong></div>
       `;

   } catch(err) {
       console.error(err);
       historyResult.innerText = "Time Machine Malfunction! (Error fetching data)";
   }
});

// --- BACKEND CONNECTED FUNCTIONS ---
window.voteWeather = async function(vote) {
   if (!currentCity) {
       alert("Please search for a city first!");
       return;
   }
   
   const resEl = document.getElementById('voteResult');
   if(resEl) {
       resEl.innerText = "Saving vote...";
       resEl.style.opacity = '1';
   }

   try {
       const response = await fetch('http://localhost:3000/api/vote', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ city: currentCity, vote: vote })
       });
       
       if (response.ok) {
           resEl.innerText = `You voted: ${vote}. Thanks!`;
           resEl.style.color = '#4caf50';
           fetchVoteCounts(currentCity);
       } else {
           resEl.innerText = "Error saving vote.";
       }
   } catch (e) {
       console.error(e);
       resEl.innerText = "Server offline.";
   }
}

async function fetchVoteCounts(city) {
   try {
       const response = await fetch(`http://localhost:3000/api/votes/${city}`);
       if (!response.ok) return;

       const data = await response.json();
       const commStatus = document.getElementById('communityCurrentStatus');
       
       if (data.length > 0 && commStatus) {
           let maxVotes = 0;
           let topWeather = '...';
           let totalVotes = 0;
           
           data.forEach(item => {
               totalVotes += item.count;
               if (item.count > maxVotes) {
                   maxVotes = item.count;
                   topWeather = item.vote_type;
               }
           });
           commStatus.innerText = `${topWeather} (based on ${totalVotes} reports)`;
       } else if (commStatus) {
           commStatus.innerText = "No reports yet";
       }
   } catch (error) {
       console.log('Backend not active.');
   }
}

async function submitContact() {
   const name = document.getElementById('contactName').value;
   const email = document.getElementById('contactEmail').value;
   const message = document.getElementById('contactMessage').value;
   const resEl = document.getElementById('contactResult');

   if(!name || !email || !message) {
       resEl.innerText = "Please fill in all fields!";
       resEl.style.color = "#ff4757";
       return;
   }

   resEl.innerText = "Sending...";
   resEl.style.color = "#333";

   try {
       const response = await fetch('http://localhost:3000/api/contact', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ name, email, message })
       });

       if (response.ok) {
           resEl.innerText = "Message sent successfully! We'll be in touch.";
           resEl.style.color = "#4caf50";
           document.getElementById('contactName').value = '';
           document.getElementById('contactEmail').value = '';
           document.getElementById('contactMessage').value = '';
       } else {
           resEl.innerText = "Error sending message.";
           resEl.style.color = "#ff4757";
       }
   } catch (e) {
       console.error(e);
       resEl.innerText = "Server is offline.";
       resEl.style.color = "#ff4757";
   }
}