// Global variables
let allNames = [];
let filteredNames = [];
let currentPage = 1;
const namesPerPage = 9;
let activeFilters = {};
let compareList = [];

// P5.js Background Animation
function setup() {
    let canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('p5-container');
    canvas.id('p5-canvas');
}

function draw() {
    clear();
    
    // Create floating particles
    for (let i = 0; i < 50; i++) {
        let x = (noise(i * 0.01, frameCount * 0.005) * width);
        let y = (noise(i * 0.01 + 100, frameCount * 0.005) * height);
        let size = noise(i * 0.01 + 200, frameCount * 0.005) * 4 + 1;
        
        fill(74, 222, 128, 30);
        noStroke();
        ellipse(x, y, size);
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    loadNamesData();
    setupEventListeners();
    initializeCharts();
});

// Load names data
async function loadNamesData() {
    try {
        const response = await fetch('resources/data-complete.json');
        const data = await response.json();
        allNames = data.names;
        filteredNames = [...allNames];
        renderNames();
        updateStatistics();
    } catch (error) {
        console.error('Error loading names data:', error);
        // Fallback data
        allNames = getFallbackData();
        filteredNames = [...allNames];
        renderNames();
        updateStatistics();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', debounce(handleSearch, 300));

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', handleFilterClick);
    });

    // Sort select
    document.getElementById('sortSelect').addEventListener('change', handleSort);

    // Hexagram filter
    document.getElementById('hexagramFilter').addEventListener('change', handleHexagramFilter);

    // Load more button
    document.getElementById('loadMoreBtn').addEventListener('click', loadMoreNames);
}

// Handle search
function handleSearch(event) {
    const query = event.target.value.toLowerCase().trim();
    
    if (query === '') {
        filteredNames = [...allNames];
    } else {
        filteredNames = allNames.filter(name => 
            name.name.toLowerCase().includes(query) ||
            name.pinyin.toLowerCase().includes(query) ||
            name.meaning.symbolism.toLowerCase().includes(query) ||
            name.meaning.interpretation.toLowerCase().includes(query) ||
            name.hexagram.name.toLowerCase().includes(query)
        );
    }
    
    applyFilters();
    renderNames();
}

// Handle filter clicks
function handleFilterClick(event) {
    const button = event.target;
    const filterType = button.dataset.filter;
    const filterValue = button.dataset.value;
    
    // Toggle active state
    button.classList.toggle('active');
    
    // Update active filters
    if (!activeFilters[filterType]) {
        activeFilters[filterType] = [];
    }
    
    if (button.classList.contains('active')) {
        if (!activeFilters[filterType].includes(filterValue)) {
            activeFilters[filterType].push(filterValue);
        }
    } else {
        activeFilters[filterType] = activeFilters[filterType].filter(v => v !== filterValue);
        if (activeFilters[filterType].length === 0) {
            delete activeFilters[filterType];
        }
    }
    
    applyFilters();
    renderNames();
}

// Apply all active filters
function applyFilters() {
    filteredNames = allNames.filter(name => {
        // Score filter
        if (activeFilters.score) {
            const scoreMatch = activeFilters.score.some(range => {
                const [min, max] = range.split('-').map(Number);
                return name.compatibility.score >= min && name.compatibility.score <= max;
            });
            if (!scoreMatch) return false;
        }
        
        // Luck filter
        if (activeFilters.luck) {
            const luckMatch = activeFilters.luck.some(luck => {
                return name.numerology.tian_ge.luck === luck ||
                       name.numerology.ren_ge.luck === luck ||
                       name.numerology.di_ge.luck === luck ||
                       name.numerology.zong_ge.luck === luck;
            });
            if (!luckMatch) return false;
        }
        
        // Strokes filter
        if (activeFilters.strokes) {
            const strokesMatch = activeFilters.strokes.some(range => {
                const [min, max] = range.split('-').map(Number);
                return name.total_strokes >= min && name.total_strokes <= max;
            });
            if (!strokesMatch) return false;
        }
        
        return true;
    });
    
    // Apply hexagram filter if active
    const hexagramValue = document.getElementById('hexagramFilter').value;
    if (hexagramValue) {
        filteredNames = filteredNames.filter(name => name.hexagram.name === hexagramValue);
    }
}

// Handle hexagram filter
function handleHexagramFilter(event) {
    applyFilters();
    renderNames();
}

// Handle sort
function handleSort(event) {
    const sortBy = event.target.value;
    
    switch (sortBy) {
        case 'score':
            filteredNames.sort((a, b) => b.compatibility.score - a.compatibility.score);
            break;
        case 'strokes':
            filteredNames.sort((a, b) => a.total_strokes - b.total_strokes);
            break;
        case 'name':
            filteredNames.sort((a, b) => a.name.localeCompare(b.name));
            break;
    }
    
    renderNames();
}

// Render names
function renderNames() {
    const grid = document.getElementById('namesGrid');
    const startIndex = 0;
    const endIndex = currentPage * namesPerPage;
    const namesToShow = filteredNames.slice(startIndex, endIndex);
    
    grid.innerHTML = namesToShow.map(name => createNameCard(name)).join('');
    
    // Update total count
    document.getElementById('totalCount').textContent = filteredNames.length;
    
    // Show/hide load more button
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (endIndex >= filteredNames.length) {
        loadMoreBtn.style.display = 'none';
    } else {
        loadMoreBtn.style.display = 'block';
    }
    
    // Animate cards
    anime({
        targets: '.name-card',
        opacity: [0, 1],
        translateY: [30, 0],
        delay: anime.stagger(100),
        duration: 600,
        easing: 'easeOutQuart'
    });
}

// Create name card HTML
function createNameCard(name) {
    const luckCount = [
        name.numerology.tian_ge.luck,
        name.numerology.ren_ge.luck,
        name.numerology.di_ge.luck,
        name.numerology.zong_ge.luck
    ].filter(luck => luck === '吉').length;
    
    const riskLevel = name.risks.length > 0 ? '有风险' : '无风险';
    const riskClass = name.risks.length > 0 ? 'text-yellow-400' : 'text-green-400';
    
    return `
        <div class="name-card glass-card rounded-2xl p-6" onclick="showNameDetail(${name.id})">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h3 class="text-2xl font-bold text-green-400 mb-1">${name.name}</h3>
                    <p class="text-sm text-gray-400">${name.pinyin}</p>
                </div>
                <div class="text-right">
                    <div class="text-2xl font-bold text-yellow-400">${name.compatibility.score}</div>
                    <div class="text-xs text-gray-400">适配度</div>
                </div>
            </div>
            
            <div class="mb-4">
                <div class="flex items-center space-x-2 mb-2">
                    <span class="element-tag element-${name.elements.character1.element}">${name.elements.character1.element}</span>
                    <span class="element-tag element-${name.elements.character2.element}">${name.elements.character2.element}</span>
                    <span class="text-xs text-gray-400">${name.total_strokes}画</span>
                </div>
                <p class="text-sm text-gray-300">${name.meaning.interpretation}</p>
            </div>
            
            <div class="border-t border-gray-600 pt-4">
                <div class="flex justify-between items-center text-sm">
                    <div>
                        <span class="text-gray-400">卦象:</span>
                        <span class="text-blue-400 ml-1">${name.hexagram.name}</span>
                    </div>
                    <div class="flex items-center space-x-2">
                        <span class="text-gray-400">吉凶:</span>
                        <span class="luck-${name.numerology.zong_ge.luck}">●</span>
                        <span class="${riskClass}">${riskLevel}</span>
                    </div>
                </div>
            </div>
            
            <div class="mt-4 flex justify-between items-center">
                <button onclick="event.stopPropagation(); addToCompare(${name.id})" 
                        class="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded-full transition-colors">
                    加入对比
                </button>
                <button onclick="event.stopPropagation(); showNameDetail(${name.id})" 
                        class="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 rounded-full transition-colors">
                    查看详情
                </button>
            </div>
        </div>
    `;
}

// Load more names
function loadMoreNames() {
    currentPage++;
    renderNames();
}

// Clear all filters
function clearFilters() {
    activeFilters = {};
    document.querySelectorAll('.filter-btn.active').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById('hexagramFilter').value = '';
    document.getElementById('searchInput').value = '';
    filteredNames = [...allNames];
    currentPage = 1;
    renderNames();
}

// Show name detail
function showNameDetail(nameId) {
    const name = allNames.find(n => n.id === nameId);
    if (name) {
        // Store selected name for detail page
        localStorage.setItem('selectedName', JSON.stringify(name));
        window.location.href = 'analysis.html';
    }
}

// Add to compare list
function addToCompare(nameId) {
    if (compareList.length >= 4) {
        alert('最多只能对比4个名字');
        return;
    }
    
    if (!compareList.includes(nameId)) {
        compareList.push(nameId);
        alert('已加入对比列表');
    } else {
        alert('该名字已在对比列表中');
    }
}

// Compare mode
function compareMode() {
    if (compareList.length < 2) {
        alert('请至少选择2个名字进行对比');
        return;
    }
    
    localStorage.setItem('compareList', JSON.stringify(compareList));
    window.location.href = 'comparison.html';
}

// Initialize charts
function initializeCharts() {
    initElementsChart();
    initLuckChart();
    initStrokesChart();
}

// Initialize elements chart
function initElementsChart() {
    const chart = echarts.init(document.getElementById('elementsChart'));
    
    const elementCounts = {};
    allNames.forEach(name => {
        const elem1 = name.elements.character1.element;
        const elem2 = name.elements.character2.element;
        elementCounts[elem1] = (elementCounts[elem1] || 0) + 1;
        if (elem1 !== elem2) {
            elementCounts[elem2] = (elementCounts[elem2] || 0) + 1;
        }
    });
    
    const data = Object.entries(elementCounts).map(([name, value]) => ({
        name,
        value,
        itemStyle: {
            color: getElementColor(name)
        }
    }));
    
    const option = {
        tooltip: {
            trigger: 'item',
            backgroundColor: 'rgba(45, 45, 45, 0.9)',
            borderColor: '#4ade80',
            textStyle: { color: '#e5e5e5' }
        },
        series: [{
            type: 'pie',
            radius: '70%',
            data: data,
            emphasis: {
                itemStyle: {
                    shadowBlur: 10,
                    shadowOffsetX: 0,
                    shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
            },
            label: {
                color: '#e5e5e5'
            }
        }]
    };
    
    chart.setOption(option);
}

// Initialize luck chart
function initLuckChart() {
    const chart = echarts.init(document.getElementById('luckChart'));
    
    const luckCounts = { '吉': 0, '半吉': 0, '凶': 0 };
    allNames.forEach(name => {
        const zongGeLuck = name.numerology.zong_ge.luck;
        luckCounts[zongGeLuck]++;
    });
    
    const option = {
        tooltip: {
            trigger: 'item',
            backgroundColor: 'rgba(45, 45, 45, 0.9)',
            borderColor: '#4ade80',
            textStyle: { color: '#e5e5e5' }
        },
        xAxis: {
            type: 'category',
            data: ['大吉', '半吉', '凶'],
            axisLabel: { color: '#e5e5e5' },
            axisLine: { lineStyle: { color: '#4ade80' } }
        },
        yAxis: {
            type: 'value',
            axisLabel: { color: '#e5e5e5' },
            axisLine: { lineStyle: { color: '#4ade80' } },
            splitLine: { lineStyle: { color: '#2d2d2d' } }
        },
        series: [{
            data: [
                { value: luckCounts['吉'], itemStyle: { color: '#4ade80' } },
                { value: luckCounts['半吉'], itemStyle: { color: '#fbbf24' } },
                { value: luckCounts['凶'], itemStyle: { color: '#ef4444' } }
            ],
            type: 'bar',
            barWidth: '60%'
        }]
    };
    
    chart.setOption(option);
}

// Initialize strokes chart
function initStrokesChart() {
    const chart = echarts.init(document.getElementById('strokesChart'));
    
    const strokeRanges = {
        '10-15画': 0,
        '16-20画': 0,
        '21-25画': 0,
        '26-30画': 0
    };
    
    allNames.forEach(name => {
        const strokes = name.total_strokes;
        if (strokes >= 10 && strokes <= 15) strokeRanges['10-15画']++;
        else if (strokes >= 16 && strokes <= 20) strokeRanges['16-20画']++;
        else if (strokes >= 21 && strokes <= 25) strokeRanges['21-25画']++;
        else if (strokes >= 26 && strokes <= 30) strokeRanges['26-30画']++;
    });
    
    const option = {
        tooltip: {
            trigger: 'item',
            backgroundColor: 'rgba(45, 45, 45, 0.9)',
            borderColor: '#4ade80',
            textStyle: { color: '#e5e5e5' }
        },
        xAxis: {
            type: 'category',
            data: Object.keys(strokeRanges),
            axisLabel: { color: '#e5e5e5' },
            axisLine: { lineStyle: { color: '#4ade80' } }
        },
        yAxis: {
            type: 'value',
            axisLabel: { color: '#e5e5e5' },
            axisLine: { lineStyle: { color: '#4ade80' } },
            splitLine: { lineStyle: { color: '#2d2d2d' } }
        },
        series: [{
            data: Object.values(strokeRanges),
            type: 'line',
            smooth: true,
            lineStyle: { color: '#4ade80', width: 3 },
            itemStyle: { color: '#4ade80' },
            areaStyle: {
                color: {
                    type: 'linear',
                    x: 0, y: 0, x2: 0, y2: 1,
                    colorStops: [
                        { offset: 0, color: 'rgba(74, 222, 128, 0.3)' },
                        { offset: 1, color: 'rgba(74, 222, 128, 0.1)' }
                    ]
                }
            }
        }]
    };
    
    chart.setOption(option);
}

// Update statistics
function updateStatistics() {
    // Charts will be updated automatically when data changes
    initializeCharts();
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function getElementColor(element) {
    const colors = {
        '金': '#e5e5e5',
        '木': '#4ade80',
        '水': '#3b82f6',
        '火': '#ef4444',
        '土': '#fbbf24'
    };
    return colors[element] || '#6b7280';
}

function scrollToNames() {
    document.getElementById('namesSection').scrollIntoView({ 
        behavior: 'smooth' 
    });
}

// Fallback data in case JSON loading fails
function getFallbackData() {
    return [
        {
            id: 1,
            name: "李垣岩",
            pinyin: "li yuan yan",
            elements: {
                character1: { char: "垣", strokes: 9, element: "土", radical: "土部" },
                character2: { char: "岩", strokes: 8, element: "土", radical: "山部" }
            },
            compatibility: {
                zodiac: "蛇",
                favorable_roots: ["山", "土"],
                score: 95
            },
            numerology: {
                tian_ge: { value: 8, element: "金", luck: "吉" },
                ren_ge: { value: 16, element: "土", luck: "吉" },
                di_ge: { value: 17, element: "金", luck: "吉" },
                zong_ge: { value: 24, element: "火", luck: "吉" },
                san_cai: "金土金"
            },
            hexagram: {
                name: "山地剥卦",
                meaning: "厚积薄发",
                calculation: "总笔画17÷8余1→乾卦"
            },
            meaning: {
                symbolism: "垣表坚固，岩喻稳重",
                interpretation: "象征意志坚定、根基深厚"
            },
            risks: [],
            notes: "岩书写需注意结构规范",
            total_strokes: 17
        }
    ];
}