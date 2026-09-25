const weatherComponents = document.querySelectorAll('[data-weather-component]');

const weatherConditions = {
  0: ['Despejado', '☀'],
  1: ['Mayormente despejado', '☀'],
  2: ['Parcialmente nublado', '⛅'],
  3: ['Nublado', '☁'],
  45: ['Niebla', '≋'],
  48: ['Niebla con escarcha', '≋'],
  51: ['Llovizna leve', '☂'],
  53: ['Llovizna moderada', '☂'],
  55: ['Llovizna intensa', '☂'],
  61: ['Lluvia leve', '☂'],
  63: ['Lluvia moderada', '☂'],
  65: ['Lluvia intensa', '☂'],
  71: ['Nevada leve', '❄'],
  73: ['Nevada moderada', '❄'],
  75: ['Nevada intensa', '❄'],
  80: ['Chaparrones leves', '☂'],
  81: ['Chaparrones moderados', '☂'],
  82: ['Chaparrones intensos', '☂'],
  95: ['Tormentas', '⚡'],
  96: ['Tormentas con granizo', '⚡'],
  99: ['Tormentas con granizo', '⚡']
};

const weatherIconCodes = {
  '☀': '01d',
  '⛅': '02d',
  '☁': '03d',
  '≋': '50d',
  '☂': '10d',
  '❄': '13d',
  '⚡': '11d'
};
const weatherIconUrl = (weatherSymbol) =>
  `https://openweathermap.org/img/wn/${weatherIconCodes[weatherSymbol] || '03d'}@2x.png`;

const formatToday = () =>
  new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

const updateComponent = (component, current) => {
  const [description, icon] = weatherConditions[current.weather_code] || [
    'Condiciones variables',
    '◌'
  ];
  component.querySelector('[data-weather-date]').textContent = formatToday();
  component.querySelector('[data-weather-temperature]').textContent = Math.round(
    current.temperature_2m
  );
  component.querySelector('[data-weather-description]').textContent = description;
  component.querySelector('[data-weather-icon]').src = weatherIconUrl(icon);
  component.querySelector('[data-weather-icon]').alt = description;
  component.querySelector('[data-weather-feels-like]').textContent =
    `${Math.round(current.apparent_temperature)} °C`;
  component.querySelector('[data-weather-wind]').textContent =
    `${Math.round(current.wind_speed_10m)} km/h`;
};

const showUnavailableWeather = (component) => {
  component.querySelector('[data-weather-date]').textContent = formatToday();
  component.querySelector('[data-weather-description]').textContent =
    'El clima no está disponible en este momento.';
  component.querySelector('[data-weather-icon]').src = weatherIconUrl('◌');
  component.querySelector('[data-weather-icon]').alt = 'Condición meteorológica no disponible';
};

const loadWeather = async () => {
  if (!weatherComponents.length) return;

  try {
    const response = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=-34.444&longitude=-58.557&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=America%2FArgentina%2FBuenos_Aires'
    );
    if (!response.ok) throw new Error('No se pudo consultar el clima');
    const { current } = await response.json();
    if (!current) throw new Error('Respuesta de clima incompleta');
    weatherComponents.forEach((component) => updateComponent(component, current));
  } catch {
    weatherComponents.forEach(showUnavailableWeather);
  }
};

loadWeather();
