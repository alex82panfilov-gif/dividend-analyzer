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

// Функция выхода
function logout() {
    document.getElementById('login-page').classList.remove('hidden');
    document.getElementById('app-content').classList.add('hidden');
    localStorage.removeItem('dividendLoggedIn');
}

// Показать уведомление
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const textElement = document.getElementById('notification-text');
    
    textElement.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Переключение между вкладками
function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('[id$="-tab"]').forEach(tab => tab.classList.add('hidden'));
    
    const tabIndex = tabName === 'recommendations' ? 0 : tabName === 'portfolio' ? 1 : 2;
    document.querySelectorAll('.tab')[tabIndex].classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.remove('hidden');
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
        // Используем курс USD как пример, в реальном приложении нужно найти ключевую ставку
        // Это временное решение для демонстрации
        return 7.5; // Возвращаем значение по умолчанию
    } catch (error) {
        console.error('Ошибка при получении ключевой ставки:', error);
        showNotification('Ошибка при загрузке ключевой ставки', 'error');
        return settings.keyRate; // Возвращаем значение по умолчанию
    }
}

// Загрузка данных приложения
function loadAppData() {
    // Загрузка сохраненных данных из localStorage
    const savedPortfolio = localStorage.getItem('dividendPortfolio');
    const savedSettings = localStorage.getItem('dividendSettings');
    
    if (savedPortfolio) {
        portfolio = JSON.parse(savedPortfolio);
        updatePortfolioDisplay();
    }
    
    if (savedSettings) {
        settings = JSON.parse(savedSettings);
        document.getElementById('investment-amount').value = settings.investmentAmount;
        document.getElementById('key-rate').value = settings.keyRate;
        document.getElementById('inflation').value = settings.inflation;
        
        // Обновляем значения в статистике
        document.getElementById('key-rate-value').textContent = `${settings.keyRate}%`;
        document.getElementById('inflation-value').textContent = `${settings.inflation}%`;
        document.getElementById('investment-value').textContent = `${settings.investmentAmount.toLocaleString('ru-RU')} ₽`;
    }
    
    // Загрузка данных с API
    updateData();
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
        
        // Используем мокированные данные в случае ошибки
        useMockData();
    } finally {
        updateBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Обновить данные';
        updateBtn.disabled = false;
    }
}

// Использование мокированных данных при ошибке API
function useMockData() {
    // Mock данные для акций
    stocksData = [
        { ticker: 'SBER', price: 250.50, dividendYield: 8.5, nextPayment: '20.12.2023', dividend: 21.3 },
        { ticker: 'GAZP', price: 158.20, dividendYield: 9.2, nextPayment: '15.01.2024', dividend: 14.6 },
        { ticker: 'LKOH', price: 5840.00, dividendYield: 7.8, nextPayment: '10.12.2023', dividend: 455.5 },
        { ticker: 'MGNT', price: 5420.50, dividendYield: 6.3, nextPayment: '05.02.2024', dividend: 341.5 },
        { ticker: 'VTBR', price: 0.0425, dividendYield: 10.1, nextPayment: '25.12.2023', dividend: 0.0043 },
        { ticker: 'ROSN', price: 485.30, dividendYield: 8.9, nextPayment: '18.01.2024', dividend: 43.2 },
        { ticker: 'NLMK', price: 182.40, dividendYield: 7.5, nextPayment: '12.12.2023', dividend: 13.7 },
        { ticker: 'TATN', price: 385.60, dividendYield: 9.5, nextPayment: '22.01.2024', dividend: 36.6 },
        { ticker: 'MOEX', price: 145.80, dividendYield: 6.8, nextPayment: '08.02.2024', dividend: 9.9 },
        { ticker: 'GMKN', price: 24850.00, dividendYield: 8.2, nextPayment: '30.12.2023', dividend: 2037.7 }
    ];
    
    // Mock данные для ОФЗ
    bondsData = [
        { ticker: 'ОФЗ-26240', price: 980.50, yield: 8.2, maturity: '15.05.2033', coupon: 80.4 },
        { ticker: 'ОФЗ-26235', price: 995.20, yield: 7.8, maturity: '17.11.2030', coupon: 77.6 },
        { ticker: 'ОФЗ-26230', price: 972.80, yield: 8.5, maturity: '22.03.2036', coupon: 82.7 },
        { ticker: 'ОФЗ-26225', price: 1001.50, yield: 7.5, maturity: '10.09.2028', coupon: 75.1 },
        { ticker: 'ОФЗ-26220', price: 987.60, yield: 8.1, maturity: '05.12.2034', coupon: 80.0 },
        { ticker: 'ОФЗ-26215', price: 979.30, yield: 8.3, maturity: '18.07.2032', coupon: 81.3 },
        { ticker: 'ОФЗ-26210', price: 992.40, yield: 7.9, maturity: '25.01.2029', coupon: 78.4 },
        { ticker: 'ОФЗ-26205', price: 983.70, yield: 8.2, maturity: '14.08.2031', coupon: 80.7 },
        { ticker: 'ОФЗ-26200', price: 976.90, yield: 8.4, maturity: '30.04.2035', coupon: 82.1 },
        { ticker: 'ОФЗ-26195', price: 989.50, yield: 7.7, maturity: '12.10.2027', coupon: 76.2 }
    ];
    
    updateStocksDisplay();
    updateBondsDisplay();
    updateComparisonTable();
}

// Обработка данных об акциях
function processStocksData(data) {
    stocksData = [];
    
    // В реальном приложении здесь будет обработка данных от API
    // Для демонстрации используем мокированные данные
    useMockData();
}

// Обработка данных об облигациях
function processBondsData(data) {
    bondsData = [];
    
    // В реальном приложении здесь будет обработка данных от API
    // Для демонстрации используем мокированные данные
    useMockData();
}

// Обновление таблицы акций
function updateStocksDisplay() {
    const tbody = document.querySelector('#stocks-table tbody');
    tbody.innerHTML = '';
    
    stocksData.forEach(stock => {
        const row = document.createElement('tr');
        
        // Расчет количества лотов для покупки
        const investmentAmount = settings.investmentAmount;
        const lots = Math.floor(investmentAmount / (stock.price * 10)); // 1 лот = 10 акций
        
        row.innerHTML = `
            <td>${stock.ticker}</td>
            <td>${stock.price.toFixed(2)} ₽</td>
            <td class="positive">${stock.dividendYield.toFixed(1)}%</td>
            <td>${stock.nextPayment}</td>
            <td>${lots} лотов</td>
        `;
        
        tbody.appendChild(row);
    });
}

// Обновление таблицы ОФЗ
function updateBondsDisplay() {
    const tbody = document.querySelector('#bonds-table tbody');
    tbody.innerHTML = '';
    
    bondsData.forEach(bond => {
        const row = document.createElement('tr');
        
        // Расчет количества облигаций для покупки
        const investmentAmount = settings.investmentAmount;
        const quantity = Math.floor(investmentAmount / bond.price);
        
        row.innerHTML = `
            <td>${bond.ticker}</td>
            <td>${bond.price.toFixed(2)} ₽</td>
            <td class="positive">${bond.yield.toFixed(1)}%</td>
            <td>${bond.maturity}</td>
            <td>${quantity} шт</td>
        `;
        
        tbody.appendChild(row);
    });
}

// Обновление таблицы сравнения
function updateComparisonTable() {
    const tbody = document.getElementById('comparison-body');
    tbody.innerHTML = '';
    
    // Расчет средних значений
    const avgStockYield = stocksData.reduce((sum, stock) => sum + stock.dividendYield, 0) / stocksData.length;
    const avgBondYield = bondsData.reduce((sum, bond) => sum + bond.yield, 0) / bondsData.length;
    
    // Расчет реальной доходности
    const realStockYield = avgStockYield - settings.inflation;
    const realBondYield = avgBondYield - settings.inflation;
    
    const rows = [
        ['Доходность (после налогов)', `${(avgStockYield * 0.87).toFixed(2)}%`, `${(avgBondYield * 0.87).toFixed(2)}%`],
        ['Инфляция', `${settings.inflation}%`, `${settings.inflation}%`],
        ['Реальная доходность', 
         `<span class="${realStockYield >= 0 ? 'positive' : 'negative'}">${realStockYield.toFixed(2)}%</span>`, 
         `<span class="${realBondYield >= 0 ? 'positive' : 'negative'}">${realBondYield.toFixed(2)}%</span>`],
        ['Риск', 'Высокий', 'Низкий'],
        ['Волатильность', 'Высокая', 'Низкая']
    ];
    
    rows.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row[0]}</td>
            <td>${row[1]}</td>
            <td>${row[2]}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Добавление в портфель
function addToPortfolio() {
    const ticker = document.getElementById('new-ticker').value.toUpperCase();
    const quantity = parseInt(document.getElementById('new-quantity').value);
    
    if (ticker && quantity) {
        portfolio.push({ ticker, quantity });
        updatePortfolioDisplay();
        savePortfolio();
        
        document.getElementById('new-ticker').value = '';
        document.getElementById('new-quantity').value = '';
        
        showNotification('Актив добавлен в портфель');
    } else {
        showNotification('Заполните все поля', 'error');
    }
}

// Обновление отображения портфеля
function updatePortfolioDisplay() {
    const portfolioList = document.getElementById('portfolio-list');
    
    if (portfolio.length === 0) {
        portfolioList.innerHTML = '<p>Портфель пуст. Добавьте активы для отслеживания.</p>';
        return;
    }
    
    portfolioList.innerHTML = '';
    
    portfolio.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'portfolio-item';
        div.innerHTML = `
            <span>${item.ticker}</span>
            <span>${item.quantity} шт</span>
            <button class="btn btn-secondary" onclick="removeFromPortfolio(${index})">
                <i class="fas fa-trash"></i> Удалить
            </button>
        `;
        portfolioList.appendChild(div);
    });
}

// Удаление из портфеля
function removeFromPortfolio(index) {
    portfolio.splice(index, 1);
    updatePortfolioDisplay();
    savePortfolio();
    showNotification('Актив удален из портфеля');
}

// Сохранение портфеля
function savePortfolio() {
    localStorage.setItem('dividendPortfolio', JSON.stringify(portfolio));
}

// Сохранение настроек
function saveSettings() {
    const investmentAmount = parseFloat(document.getElementById('investment-amount').value);
    const keyRate = parseFloat(document.getElementById('key-rate').value);
    const inflation = parseFloat(document.getElementById('inflation').value);
    
    if (isNaN(investmentAmount) || isNaN(keyRate) || isNaN(inflation)) {
        showNotification('Проверьте правильность введенных данных', 'error');
        return;
    }
    
    settings.investmentAmount = investmentAmount;
    settings.keyRate = keyRate;
    settings.inflation = inflation;
    
    localStorage.setItem('dividendSettings', JSON.stringify(settings));
    
    // Обновляем значения в статистике
    document.getElementById('key-rate-value').textContent = `${settings.keyRate}%`;
    document.getElementById('inflation-value').textContent = `${settings.inflation}%`;
    document.getElementById('investment-value').textContent = `${settings.investmentAmount.toLocaleString('ru-RU')} ₽`;
    
    // Обновляем отображение данных с новыми настройками
    updateStocksDisplay();
    updateBondsDisplay();
    updateComparisonTable();
    
    showNotification('Настройки сохранены');
}

// Инициализация при загрузке страницы
window.onload = function() {
    // Проверяем, был ли пользователь ранее авторизован
    const isLoggedIn = localStorage.getItem('dividendLoggedIn');
    if (isLoggedIn) {
        document.getElementById('login-page').classList.add('hidden');
        document.getElementById('app-content').classList.remove('hidden');
        loadAppData();
    }
}