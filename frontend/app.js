const API_BASE = '/api';

// State
let currentSymbol = null;
let chartInstance = null;

// DOM Elements
const companyListEl = document.getElementById('company-list');
const stockTitleEl = document.getElementById('stock-title');
const gainersListEl = document.getElementById('gainers-list');
const losersListEl = document.getElementById('losers-list');
const timeRangeEl = document.getElementById('time-range');
const compareStockEl = document.getElementById('compare-stock');
const predictBtn = document.getElementById('predict-btn');
const predictionResultsEl = document.getElementById('prediction-results');
const predictionListEl = document.getElementById('prediction-list');

// Initialize
async function init() {
    await fetchCompanies();
    await fetchInsights();

    // Select first company by default
    const firstCompany = companyListEl.querySelector('li');
    if (firstCompany) {
        firstCompany.click();
    }

    // Setup Event Listeners
    timeRangeEl.addEventListener('change', () => loadStockData(currentSymbol));
    compareStockEl.addEventListener('change', () => loadStockData(currentSymbol));
    predictBtn.addEventListener('click', handlePrediction);
}

// Fetch Companies
async function fetchCompanies() {
    try {
        const res = await fetch(`${API_BASE}/companies`);
        const data = await res.json();

        companyListEl.innerHTML = '';
        compareStockEl.innerHTML = '<option value="">None</option>';

        data.companies.forEach(symbol => {
            // Sidebar list
            const li = document.createElement('li');
            li.textContent = symbol;
            li.dataset.symbol = symbol;
            li.addEventListener('click', () => selectCompany(symbol));
            companyListEl.appendChild(li);

            // Compare dropdown
            const option = document.createElement('option');
            option.value = symbol;
            option.textContent = symbol;
            compareStockEl.appendChild(option);
        });
    } catch (err) {
        console.error('Failed to fetch companies', err);
    }
}

// Fetch Insights
async function fetchInsights() {
    try {
        const res = await fetch(`${API_BASE}/insights`);
        const data = await res.json();

        renderInsightsList(gainersListEl, data.top_gainers, 'gainer');
        renderInsightsList(losersListEl, data.top_losers, 'loser');
    } catch (err) {
        console.error('Failed to fetch insights', err);
    }
}

function renderInsightsList(container, items, className) {
    container.innerHTML = '';
    items.forEach(item => {
        const li = document.createElement('li');
        const returnPct = (item['Daily Return'] * 100).toFixed(2);
        const sign = returnPct > 0 ? '+' : '';

        li.innerHTML = `
            <span>${item.Symbol}</span>
            <span class="${className}">${sign}${returnPct}%</span>
        `;
        container.appendChild(li);
    });
}

// Select Company
async function selectCompany(symbol) {
    currentSymbol = symbol;
    stockTitleEl.textContent = `${symbol} Overview`;

    // Update active state in sidebar
    document.querySelectorAll('#company-list li').forEach(li => {
        li.classList.toggle('active', li.dataset.symbol === symbol);
    });

    // Hide predictions
    predictionResultsEl.style.display = 'none';

    // Prevent comparing with self
    Array.from(compareStockEl.options).forEach(opt => {
        opt.disabled = (opt.value === symbol);
    });
    if (compareStockEl.value === symbol) compareStockEl.value = '';

    await Promise.all([
        fetchSummary(symbol),
        loadStockData(symbol)
    ]);
}

// Fetch Summary
async function fetchSummary(symbol) {
    try {
        const res = await fetch(`${API_BASE}/summary/${symbol}`);
        if (!res.ok) throw new Error('Summary not found');
        const data = await res.json();

        document.getElementById('latest-close').textContent = `$${data.latest_close.toFixed(2)}`;
        document.getElementById('avg-close').textContent = `$${data.average_close.toFixed(2)}`;
        document.getElementById('high-52w').textContent = `$${data["52_week_high"].toFixed(2)}`;
        document.getElementById('low-52w').textContent = `$${data["52_week_low"].toFixed(2)}`;
        document.getElementById('volatility').textContent = data.volatility_score.toFixed(4);
    } catch (err) {
        console.error('Failed to fetch summary', err);
    }
}

// Format Date
function formatDate(dateString) {
    const d = new Date(dateString);
    return `${d.getMonth()+1}/${d.getDate()}`;
}

// Load Stock Data & Chart
async function loadStockData(symbol) {
    const days = timeRangeEl.value;
    const compareSymbol = compareStockEl.value;

    try {
        if (compareSymbol) {
            // Compare mode
            const res = await fetch(`${API_BASE}/compare?symbol1=${symbol}&symbol2=${compareSymbol}&days=${days}`);
            if (!res.ok) throw new Error('Compare data not found');
            const data = await res.json();
            renderCompareChart(data, symbol, compareSymbol);
        } else {
            // Single stock mode
            const res = await fetch(`${API_BASE}/data/${symbol}?days=${days}`);
            if (!res.ok) throw new Error('Data not found');
            const data = await res.json();
            renderChart(data, symbol);
        }
    } catch (err) {
        console.error('Failed to load chart data', err);
    }
}

function renderChart(data, symbol) {
    const ctx = document.getElementById('stockChart').getContext('2d');

    const labels = data.map(d => formatDate(d.Date));
    const closePrices = data.map(d => d.Close);
    const movingAvgs = data.map(d => d['7-day MA']);

    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: `${symbol} Close Price`,
                    data: closePrices,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.1,
                    pointRadius: 0,
                    pointHitRadius: 10
                },
                {
                    label: `7-Day MA`,
                    data: movingAvgs,
                    borderColor: '#f59e0b',
                    borderWidth: 1.5,
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0
                }
            ]
        },
        options: getChartOptions()
    });
}

function renderCompareChart(data, symbol1, symbol2) {
    const ctx = document.getElementById('stockChart').getContext('2d');

    // Assuming data arrays are sorted and aligned (best effort based on API)
    // Create unified label set based on symbol1
    let s1Data = data[symbol1];
    let s2Data = data[symbol2];

    // simple sync for this demo
    const labels = s1Data.map(d => formatDate(d.Date));

    // Normalize prices to percentage change from start
    const startPrice1 = s1Data[0].Close;
    const normData1 = s1Data.map(d => ((d.Close - startPrice1) / startPrice1) * 100);

    const startPrice2 = s2Data[0].Close;
    // Map S2 data onto S1's labels where possible, otherwise just use length matching (simplification)
    const normData2 = s2Data.slice(0, s1Data.length).map(d => ((d.Close - startPrice2) / startPrice2) * 100);

    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: `${symbol1} % Change`,
                    data: normData1,
                    borderColor: '#2563eb',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0
                },
                {
                    label: `${symbol2} % Change`,
                    data: normData2,
                    borderColor: '#10b981',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0
                }
            ]
        },
        options: {
            ...getChartOptions(),
            scales: {
                y: {
                    title: { display: true, text: 'Percentage Change (%)' }
                }
            }
        }
    });
}

function getChartOptions() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            tooltip: {
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += context.dataset.label.includes('%')
                                ? context.parsed.y.toFixed(2) + '%'
                                : '$' + context.parsed.y.toFixed(2);
                        }
                        return label;
                    }
                }
            }
        }
    };
}

// Handle Prediction
async function handlePrediction() {
    if (!currentSymbol) return;

    predictBtn.textContent = 'Predicting...';
    predictBtn.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/predict/${currentSymbol}?days=7`);
        if (!res.ok) throw new Error('Prediction failed');
        const data = await res.json();

        predictionListEl.innerHTML = '';
        data.predictions.forEach(p => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="pred-date">${formatDate(p.Date)}</span>
                <span class="pred-price">$${p.Predicted_Close.toFixed(2)}</span>
            `;
            predictionListEl.appendChild(li);
        });

        predictionResultsEl.style.display = 'block';
    } catch (err) {
        console.error('Prediction error', err);
        alert('Failed to generate prediction');
    } finally {
        predictBtn.textContent = 'Predict Next 7 Days';
        predictBtn.disabled = false;
    }
}

// Start
document.addEventListener('DOMContentLoaded', init);
