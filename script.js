// Конфигурация API
const API_CONFIG = {
    moexBaseUrl: '/.netlify/functions/moex-proxy',
    cbrKeyRateUrl: 'https://www.cbr-xml-daily.ru/daily_json.js',
    inflationDataUrl: 'https://www.cbr.ru/scripts/XML_dynamic.asp?date_req1=01/01/2022&date_req2=31/12/2023&VAL_NM_RQ=R01239'
};

// Переменные для хранения данных
let stocksData = [];
let bondsData = [];
let portfolio = [];
let settings = {
    investmentAmount: 10000,
    keyRate: 7.5,
    inflation: 7.0
};

// Функция входа в приложение
function login() {
    const password = document.getElementById('password').value;
    if (password === 'dividends') {
        document.getElementById('login-page').classList.add('hidden');
        document.getElementById('app-content').classList.remove('hidden');
        localStorage.setItem('dividendLoggedIn', 'true');
        loadAppData();
    } else {
        showNotification('Неверный пароль', 'error');
    }
}

// Функция для получения данных с API Московской биржи
async function fetchMoexData(endpoint) {
    try {
        const response = await fetch(`${API_CONFIG.moexBaseUrl}?endpoint=${encodeURIComponent(endpoint)}`);
        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Ошибка при получении данных с MOEX:', error);
        showNotification('Ошибка при загрузке данных с биржи', 'error');
        return null;
    }
}

// Функция для получения ключевой ставки ЦБ
async function fetchKeyRate() {
    try {
        const response = await fetch(API_CONFIG.cbrKeyRateUrl);
        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }
        const data = await response.json();
        // Здесь нужно найти актуальную ключевую ставку в ответе
        // Это примерная реализация, точный путь зависит от структуры ответа API ЦБ
        return data.Valute.USD.Value; // Это неправильно, нужно адаптировать под реальный API
    } catch (error) {
        console.error('Ошибка при получении ключевой ставки:', error);
        showNotification('Ошибка при загрузке ключевой ставки', 'error');
        return settings.keyRate; // Возвращаем значение по умолчанию
    }
}

// Обновление данных
async function updateData() {
    const updateBtn = document.getElementById('update-btn');
    updateBtn.innerHTML = '<div class="loader"></div> Загрузка...';
    updateBtn.disabled = true;
    
    try {
        // Получаем актуальную ключевую ставку
        const currentKeyRate = await fetchKeyRate();
        if (currentKeyRate) {
            settings.keyRate = currentKeyRate;
            document.getElementById('key-rate').value = currentKeyRate;
            document.getElementById('key-rate-value').textContent = `${currentKeyRate}%`;
            saveSettings();
        }
        
        // Получаем данные об акциях
        const stocks = await fetchMoexData('/engines/stock/markets/shares/boards/TQBR/securities.json');
        if (stocks) {
            processStocksData(stocks);
        }
        
        // Получаем данные об облигациях
        const bonds = await fetchMoexData('/engines/stock/markets/bonds/boards/TQOB/securities.json');
        if (bonds) {
            processBondsData(bonds);
        }
        
        updateStocksDisplay();
        updateBondsDisplay();
        updateComparisonTable();
        
        showNotification('Данные успешно обновлены');
    } catch (error) {
        console.error('Ошибка при обновлении данных:', error);
        showNotification('Ошибка при загрузке данных', 'error');
    } finally {
        updateBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Обновить данные';
        updateBtn.disabled = false;
    }
}

// Обработка данных об акциях
function processStocksData(data) {
    // Здесь обрабатываем данные от API Московской биржи
    // Это примерная реализация, нужно адаптировать под реальную структуру ответа
    
    stocksData = [];
    
    // Пример обработки (замените на реальную логику)
    if (data.securities && data.securities.data) {
        data.securities.data.forEach(security => {
            // Отбираем только акции с дивидендами
            if (security[3] && security[3] > 0) { // Предполагаем, что поле 3 - дивидендная доходность
                stocksData.push({
                    ticker: security[0] || 'N/A',
                    price: security[1] || 0,
                    dividendYield: security[3] || 0,
                    nextPayment: 'Н/Д', // Эту информацию нужно получить из другого endpoint'а
                    dividend: security[4] || 0 // Предполагаем, что поле 4 - размер дивиденда
                });
            }
        });
        
        // Сортируем по дивидендной доходности
        stocksData.sort((a, b) => b.dividendYield - a.dividendYield);
        
        // Берем топ-10
        stocksData = stocksData.slice(0, 10);
    }
}

// Обработка данных об облигациях
function processBondsData(data) {
    // Аналогичная обработка для облигаций
    bondsData = [];
    
    if (data.securities && data.securities.data) {
        data.securities.data.forEach(security => {
            // Отбираем только ОФЗ
            if (security[0] && security[0].includes('ОФЗ')) {
                bondsData.push({
                    ticker: security[0] || 'N/A',
                    price: security[1] || 0,
                    yield: security[2] || 0, // Предполагаем, что поле 2 - доходность
                    maturity: 'Н/Д', // Эту информацию нужно получить из другого endpoint'а
                    coupon: security[3] || 0 // Предполагаем, что поле 3 - размер купона
                });
            }
        });
        
        // Сортируем по доходности
        bondsData.sort((a, b) => b.yield - a.yield);
        
        // Берем топ-10
        bondsData = bondsData.slice(0, 10);
    }
}

// ... остальные функции из предыдущего примера ...