// 德州扑克胜率计算器

// 位置名称映射
const POSITION_NAMES = {
    0: '庄位 (BTN)',
    1: '小盲 (SB)',
    2: '大盲 (BB)',
    3: '枪口 (UTG)',
    4: '枪口+1 (UTG+1)',
    5: '中位 (MP)',
    6: '中位+1 (MP+1)',
    7: '关煞位 (CO)'
};



// 花色映射
const SUIT_SYMBOLS = {
    'h': '♥',
    'd': '♦',
    'c': '♣',
    's': '♠'
};

// 花色名称映射
const SUIT_NAMES = {
    'h': 'hearts',
    'd': 'diamonds',
    'c': 'clubs',
    's': 'spades'
};

// 全局状态
let gameState = {
    playerCount: 2,
    players: [],
    communityCards: {},
    currentStreet: 'preflop', // preflop, flop, turn, river
    usedCards: new Set(), // 已使用的牌
    lastGameState: null // 上一次计算时的状态，用于判断是否需要重新计算
};

// 卡牌选择器状态
let cardSelectorState = {
    targetId: null,
    maxSelect: 1,
    selectedCards: [],
    callback: null,
    args: []
};

// 序列化游戏状态，用于比较是否有变化
function serializeGameState() {
    return {
        playerCount: gameState.playerCount,
        players: gameState.players.map(player => ({
            id: player.id,
            positionIndex: player.positionIndex,
            hand: [...player.hand],
            status: player.status
        })),
        communityCards: {...gameState.communityCards},
        usedCards: Array.from(gameState.usedCards)
    };
}

// 重置游戏
function resetGame() {
    console.log('Resetting game...');
    
    // 重置游戏状态
    gameState = {
        playerCount: 2,
        players: [],
        communityCards: {
            flop1: '',
            flop2: '',
            flop3: '',
            turn: '',
            river: ''
        },
        currentStreet: 'preflop',
        usedCards: new Set(),
        lastGameState: null
    };
    
    // 重置玩家人数选择器
    const playerCountSelect = document.getElementById('player-count');
    if (playerCountSelect) {
        playerCountSelect.value = gameState.playerCount;
    }
    
    // 重置公共牌显示
    const communitySlots = document.querySelectorAll('.card-slot');
    communitySlots.forEach(slot => {
        slot.className = 'card-slot';
        slot.innerHTML = '';
    });
    
    // 重置胜率结果
    const results = document.getElementById('results');
    if (results) {
        results.innerHTML = '';
    }
    
    // 重新生成玩家位置
    generatePlayerPositions();
    
    // 重新初始化卡牌选择器
    initCardSelector();
    
    console.log('Game reset successfully!');
}

// 初始化应用
function init() {
    console.log('Initializing application...');
    
    // 获取玩家人数选择器
    const playerCountSelect = document.getElementById('player-count');
    if (!playerCountSelect) {
        console.error('Player count select not found!');
        return;
    }
    
    // 设置默认选中值
    playerCountSelect.value = gameState.playerCount;
    
    // 监听玩家人数变化
    playerCountSelect.addEventListener('change', (e) => {
        gameState.playerCount = parseInt(e.target.value);
        generatePlayerPositions();
    });

    // 监听计算按钮点击
    const calculateBtn = document.getElementById('calculate-btn');
    if (calculateBtn) {
        calculateBtn.addEventListener('click', calculateWinRates);
    }
    
    // 监听重置按钮点击
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetGame);
    }

    // 初始化公共牌
    gameState.communityCards = {
        flop1: '',
        flop2: '',
        flop3: '',
        turn: '',
        river: ''
    };

    // 初始生成玩家位置
    generatePlayerPositions();
    
    // 初始化卡牌选择器
    initCardSelector();
    
    console.log('Application initialized successfully!');
}

// 初始化卡牌选择器
function initCardSelector() {
    // 创建一副完整的扑克牌
    const deck = createDeck();
    renderCardsGrid(deck);
}

// 创建一副完整的扑克牌
function createDeck() {
    const values = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
    const suits = ['h', 'd', 'c', 's'];
    const deck = [];
    
    for (const value of values) {
        for (const suit of suits) {
            deck.push({
                value: value,
                suit: suit,
                symbol: SUIT_SYMBOLS[suit],
                name: `${value}${suit}`,
                suitName: SUIT_NAMES[suit]
            });
        }
    }
    
    return deck;
}

// 渲染卡牌网格
function renderCardsGrid(deck) {
    const grid = document.getElementById('cards-grid');
    grid.innerHTML = '';
    
    deck.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = `card ${card.suitName}`;
        cardElement.dataset.card = card.name;
        cardElement.innerHTML = `
            <div class="card-value">${card.value}</div>
            <div class="card-suit">${card.symbol}</div>
            <div class="card-value" style="transform: rotate(180deg)">${card.value}</div>
        `;
        
        // 检查卡牌是否已被使用
        if (gameState.usedCards.has(card.name)) {
            cardElement.classList.add('disabled');
        }
        
        // 添加点击事件
        cardElement.addEventListener('click', () => {
            if (!cardElement.classList.contains('disabled')) {
                toggleCardSelection(card);
            }
        });
        
        grid.appendChild(cardElement);
    });
}

// 生成玩家位置
function generatePlayerPositions() {
    console.log('Generating player positions...');
    console.log('Player count:', gameState.playerCount);
    
    const container = document.getElementById('player-positions');
    if (!container) {
        console.error('Player positions container not found!');
        return;
    }
    
    container.innerHTML = '';
    gameState.players = [];
    
    // 位置顺序：庄位、小盲、大盲、枪口、枪口+1、中位、中位+1、关煞位
    const POSITION_ORDER = [0, 1, 2, 3, 4, 5, 6, 7];
    
    // 根据玩家人数生成位置
    for (let i = 0; i < gameState.playerCount; i++) {
        // 使用预定义的位置顺序
        const positionIndex = POSITION_ORDER[i];
        
        const player = {
            id: i,
            positionIndex: positionIndex,
            positionName: POSITION_NAMES[positionIndex],
            hand: ['', ''],
            chips: 1000,
            status: 'active',
            action: null
        };
        
        gameState.players.push(player);
        
        // 创建DOM元素
        const positionElement = document.createElement('div');
        positionElement.className = `player-position player-count-${gameState.playerCount}`;
        positionElement.dataset.playerId = player.id;
        positionElement.dataset.positionIndex = positionIndex;
        
        // 直接在函数中创建HTML，避免createPositionElement函数的问题
        positionElement.innerHTML = `
            <div class="position-header">
                <div class="position-name">${player.positionName}</div>
            </div>
            <div class="player-info">
                <div class="hand-section">
                    <label>起手牌:</label>
                    <div class="hand-slots">
                        <div class="hand-slot" data-hand-index="0" onclick="openCardSelector('player-${player.id}-hand', 2, updatePlayerHands, ${player.id})"></div>
                        <div class="hand-slot" data-hand-index="1" onclick="openCardSelector('player-${player.id}-hand', 2, updatePlayerHands, ${player.id})"></div>
                    </div>
                </div>
                <div class="win-rate-display" id="win-rate-${player.id}"></div>
                <div class="status-section">
                    <label>状态:</label>
                    <div class="status-toggle ${player.status}" onclick="togglePlayerStatus(${player.id})">
                        <div class="status-indicator"></div>
                        <span class="status-text">${player.status === 'active' ? '活跃' : '已弃牌'}</span>
                    </div>
                </div>
            </div>
        `;
        
        container.appendChild(positionElement);
        
        // 初始设置起手牌交互状态
        const handSlots = positionElement.querySelectorAll('.hand-slot');
        if (player.status === 'folded') {
            positionElement.classList.add('folded');
            handSlots.forEach(slot => {
                slot.style.pointerEvents = 'none';
                slot.style.opacity = '0.5';
            });
        }
        
        console.log('Added player position:', player.positionName);
    }
    
    // 根据玩家数量设置位置
    setPlayerPositionsByCount(gameState.playerCount);
    
    console.log('Player positions generated successfully!');
}

// 根据玩家数量设置位置
function setPlayerPositionsByCount(count) {
    const positions = document.querySelectorAll('.player-position');
    positions.forEach(pos => {
        pos.style.position = 'absolute';
        pos.style.width = '120px';
    });
    
    // 定义位置坐标（竖版布局：左侧和右侧垂直排列，中心吸附到桌子边沿）
    const positionsConfig = {
        2: [
            { index: 0, top: '100%', left: '50%', transform: 'translate(-50%, -100%)' },  // 庄位在底部边缘，向上显示
            { index: 1, top: '0%', left: '50%', transform: 'translate(-50%, 0%)' }   // 小盲在顶部边缘，向下显示
        ],
        3: [
            { index: 0, top: '100%', left: '50%', transform: 'translate(-50%, -100%)' },  // 庄位在底部边缘，向上显示
            { index: 1, top: '0%', left: '0%', transform: 'translate(0%, 0%)' },  // 小盲在左上角，向右下显示
            { index: 2, top: '0%', left: '100%', transform: 'translate(-100%, 0%)' }   // 大盲在右上角，向左下显示
        ],
        4: [
            { index: 0, top: '100%', left: '50%', transform: 'translate(-50%, -100%)' },  // 庄位在底部边缘，向上显示
            { index: 1, top: '50%', left: '0%', transform: 'translate(-100%, -50%)' },  // 小盲在桌子左侧外，上下对齐公共牌区域
            { index: 2, top: '0%', left: '50%', transform: 'translate(-50%, 0%)' },  // 大盲在桌面正上方，向下显示
            { index: 3, top: '50%', left: '100%', transform: 'translate(0%, -50%)' }   // 枪口在桌子右侧外，上下对齐公共牌区域
        ],
        5: [
            { index: 0, top: '100%', left: '50%', transform: 'translate(-50%, -100%)' },  // 庄位在底部边缘，向上显示
            { index: 1, top: '50%', left: '0%', transform: 'translate(-100%, -50%)' },  // 小盲在桌子左侧外，上下对齐公共牌区域
            { index: 2, top: '0%', left: '0%', transform: 'translate(0%, 0%)' },  // 大盲在桌面左上角
            { index: 3, top: '0%', left: '100%', transform: 'translate(-100%, 0%)' },  // 枪口在桌子右上角
            { index: 4, top: '50%', left: '100%', transform: 'translate(0%, -50%)' }   // 枪口+1在桌子右侧外，上下对齐公共牌区域
        ],
        6: [
            { index: 0, top: '100%', left: '50%', transform: 'translate(-50%, -100%)' },  // 庄位在底部边缘，向上显示
            { index: 1, top: '50%', left: '0%', transform: 'translate(-100%, -50%)' },  // 小盲在桌子左侧外，上下对齐公共牌区域
            { index: 2, top: '0%', left: '0%', transform: 'translate(0%, 0%)' },  // 大盲在桌面左上角
            { index: 3, top: '0%', left: '50%', transform: 'translate(-50%, 0%)' },  // 枪口在桌子正上方
            { index: 4, top: '0%', left: '100%', transform: 'translate(-100%, 0%)' },  // 枪口+1在桌子右上角
            { index: 5, top: '50%', left: '100%', transform: 'translate(0%, -50%)' }   // 中位在桌子右侧外，上下对齐公共牌区域
        ],
        7: [
            { index: 0, top: '100%', left: '50%', transform: 'translate(-50%, -100%)' },  // 庄位在底部边缘，向上显示
            { index: 1, top: '100%', left: '0%', transform: 'translate(0%, -100%)' },  // 小盲在桌子左下角
            { index: 2, top: '50%', left: '0%', transform: 'translate(-100%, -50%)' },  // 大盲在桌子左侧外，上下对齐公共牌区域
            { index: 3, top: '0%', left: '0%', transform: 'translate(0%, 0%)' },  // 枪口在桌子左上角
            { index: 4, top: '0%', left: '100%', transform: 'translate(-100%, 0%)' },  // 枪口+1在桌子右上角
            { index: 5, top: '50%', left: '100%', transform: 'translate(0%, -50%)' },  // 中位在桌子右侧外，上下对齐公共牌区域
            { index: 6, top: '100%', left: '100%', transform: 'translate(-100%, -100%)' }   // 中位+1在桌子右下角
        ],
        8: [
            { index: 0, top: '100%', left: '50%', transform: 'translate(-50%, -100%)' },  // 庄位在底部边缘，向上显示
            { index: 1, top: '100%', left: '0%', transform: 'translate(0%, -100%)' },  // 小盲在桌子左下角
            { index: 2, top: '50%', left: '0%', transform: 'translate(-100%, -50%)' },  // 大盲在桌子左侧外，上下对齐公共牌区域
            { index: 3, top: '0%', left: '0%', transform: 'translate(0%, 0%)' },  // 枪口在桌子左上角
            { index: 4, top: '0%', left: '50%', transform: 'translate(-50%, 0%)' },  // 枪口+1在桌子正上方
            { index: 5, top: '0%', left: '100%', transform: 'translate(-100%, 0%)' },  // 中位在桌子右上角
            { index: 6, top: '50%', left: '100%', transform: 'translate(0%, -50%)' },  // 中位+1在桌子右侧外，上下对齐公共牌区域
            { index: 7, top: '100%', left: '100%', transform: 'translate(-100%, -100%)' }   // 关煞位在桌子右下角
        ]
    };
    
    // 应用位置配置
    if (positionsConfig[count]) {
        positionsConfig[count].forEach(config => {
            const position = document.querySelector(`[data-position-index="${config.index}"]`);
            if (position) {
                position.style.top = config.top;
                position.style.left = config.left;
                position.style.transform = config.transform;
            }
        });
    }
}



// 打开卡牌选择器
function openCardSelector(targetId, maxSelect, callback, ...args) {
    console.log('Opening card selector for:', targetId);
    
    // 初始化已选择的卡牌
    let selectedCards = [];
    
    // 根据目标ID获取当前已选择的卡牌
    if (targetId.startsWith('player-')) {
        // 玩家手牌
        const parts = targetId.split('-');
        const playerId = parseInt(parts[1]);
        const player = gameState.players.find(p => p.id === playerId);
        
        if (player && player.hand) {
            // 检查是否是同时选择2张手牌
            if (parts[3] === 'hand') {
                // 一次性选择2张手牌
                if (player.hand[0]) {
                    selectedCards.push({
                        value: player.hand[0][0],
                        suit: player.hand[0][1],
                        symbol: SUIT_SYMBOLS[player.hand[0][1]],
                        name: player.hand[0],
                        suitName: SUIT_NAMES[player.hand[0][1]]
                    });
                }
                if (player.hand[1]) {
                    selectedCards.push({
                        value: player.hand[1][0],
                        suit: player.hand[1][1],
                        symbol: SUIT_SYMBOLS[player.hand[1][1]],
                        name: player.hand[1],
                        suitName: SUIT_NAMES[player.hand[1][1]]
                    });
                }
            } else if (parts.length >= 4) {
                // 单个手牌槽
                const handIndex = parseInt(parts[3]);
                if (player.hand[handIndex]) {
                    // 解析卡牌信息
                    const cardName = player.hand[handIndex];
                    if (cardName) {
                        const value = cardName[0];
                        const suit = cardName[1];
                        selectedCards.push({
                            value: value,
                            suit: suit,
                            symbol: SUIT_SYMBOLS[suit],
                            name: cardName,
                            suitName: SUIT_NAMES[suit]
                        });
                    }
                }
            }
        }
    } else if (targetId.startsWith('flop')) {
        // 翻牌，对于单个翻牌槽
        if (targetId === 'flop1' || targetId === 'flop2' || targetId === 'flop3') {
            const cardName = gameState.communityCards[targetId];
            if (cardName) {
                const value = cardName[0];
                const suit = cardName[1];
                selectedCards.push({
                    value: value,
                    suit: suit,
                    symbol: SUIT_SYMBOLS[suit],
                    name: cardName,
                    suitName: SUIT_NAMES[suit]
                });
            }
        } else if (targetId === 'flop') {
            // 一次性选择3张翻牌
            const flop1 = gameState.communityCards.flop1;
            const flop2 = gameState.communityCards.flop2;
            const flop3 = gameState.communityCards.flop3;
            
            if (flop1) {
                selectedCards.push({
                    value: flop1[0],
                    suit: flop1[1],
                    symbol: SUIT_SYMBOLS[flop1[1]],
                    name: flop1,
                    suitName: SUIT_NAMES[flop1[1]]
                });
            }
            if (flop2) {
                selectedCards.push({
                    value: flop2[0],
                    suit: flop2[1],
                    symbol: SUIT_SYMBOLS[flop2[1]],
                    name: flop2,
                    suitName: SUIT_NAMES[flop2[1]]
                });
            }
            if (flop3) {
                selectedCards.push({
                    value: flop3[0],
                    suit: flop3[1],
                    symbol: SUIT_SYMBOLS[flop3[1]],
                    name: flop3,
                    suitName: SUIT_NAMES[flop3[1]]
                });
            }
        }
    } else if (targetId === 'turn' || targetId === 'river') {
        // 转牌或河牌
        const cardName = gameState.communityCards[targetId];
        if (cardName) {
            const value = cardName[0];
            const suit = cardName[1];
            selectedCards.push({
                value: value,
                suit: suit,
                symbol: SUIT_SYMBOLS[suit],
                name: cardName,
                suitName: SUIT_NAMES[suit]
            });
        }
    }
    
    cardSelectorState = {
        targetId: targetId,
        maxSelect: maxSelect,
        selectedCards: selectedCards,
        callback: callback,
        args: args
    };
    
    // 重新渲染卡牌网格，确保卡牌显示
    const deck = createDeck();
    renderCardsGrid(deck);
    
    // 显示模态框
    const modal = document.getElementById('card-selector-modal');
    if (modal) {
        modal.classList.add('show');
        
        // 更新已选择卡牌列表
        updateSelectedCardsList();
        
        // 更新卡牌选择UI
        updateCardSelectionUI();
    } else {
        console.error('Card selector modal not found!');
    }
}

// 关闭卡牌选择器
function closeCardSelector() {
    const modal = document.getElementById('card-selector-modal');
    modal.classList.remove('show');
    
    // 重置选择状态
    cardSelectorState = {
        targetId: null,
        maxSelect: 1,
        selectedCards: [],
        callback: null
    };
    
    // 更新已选择卡牌列表
    updateSelectedCardsList();
}

// 切换卡牌选择
function toggleCardSelection(card) {
    const index = cardSelectorState.selectedCards.findIndex(c => c.name === card.name);
    
    if (index > -1) {
        // 取消选择
        cardSelectorState.selectedCards.splice(index, 1);
    } else {
        // 选择卡牌
        if (cardSelectorState.selectedCards.length < cardSelectorState.maxSelect) {
            cardSelectorState.selectedCards.push(card);
        }
    }
    
    // 更新UI
    updateCardSelectionUI();
    updateSelectedCardsList();
}

// 更新卡牌选择UI
function updateCardSelectionUI() {
    const cards = document.querySelectorAll('.card');
    const maxReached = cardSelectorState.selectedCards.length >= cardSelectorState.maxSelect;
    
    cards.forEach(cardElement => {
        const cardName = cardElement.dataset.card;
        const isSelected = cardSelectorState.selectedCards.some(c => c.name === cardName);
        
        if (isSelected) {
            cardElement.classList.add('selected');
        } else {
            cardElement.classList.remove('selected');
            
            // 如果已达到最大选择数量，禁用未选择的卡牌
            if (maxReached) {
                cardElement.classList.add('disabled');
            } else {
                // 检查卡牌是否已被使用
                if (!gameState.usedCards.has(cardName)) {
                    cardElement.classList.remove('disabled');
                }
            }
        }
    });
}

// 更新已选择卡牌列表
function updateSelectedCardsList() {
    const list = document.getElementById('selected-cards-list');
    list.innerHTML = '';
    
    cardSelectorState.selectedCards.forEach((card, index) => {
        const cardItem = document.createElement('div');
        cardItem.className = 'selected-card-item ' + card.suitName;
        cardItem.innerHTML = `
            <div class="card-value">${card.value}</div>
            <div class="card-suit">${card.symbol}</div>
            <div class="card-value" style="transform: rotate(180deg)">${card.value}</div>
            <div class="remove-card" onclick="removeSelectedCard(${index})">×</div>
        `;
        list.appendChild(cardItem);
    });
}

// 移除已选择的卡牌
function removeSelectedCard(index) {
    cardSelectorState.selectedCards.splice(index, 1);
    updateCardSelectionUI();
    updateSelectedCardsList();
}

// 确认卡牌选择
function confirmCardSelection() {
    if (cardSelectorState.selectedCards.length === 0) {
        alert('请至少选择一张卡牌');
        return;
    }
    
    // 调用回调函数
    if (cardSelectorState.callback) {
        cardSelectorState.callback(cardSelectorState.targetId, cardSelectorState.selectedCards, ...cardSelectorState.args);
    }
    
    // 关闭模态框
    closeCardSelector();
}

// 更新公共牌
function updateCommunityCard(targetId, cards) {
    const card = cards[0];
    const oldCard = gameState.communityCards[targetId];
    
    // 移除旧卡牌
    if (oldCard) {
        gameState.usedCards.delete(oldCard);
    }
    
    // 添加新卡牌
    gameState.communityCards[targetId] = card.name;
    gameState.usedCards.add(card.name);
    
    // 更新显示
    updateCommunityCardDisplay(targetId, card);
    
    // 重新渲染卡牌网格
    const deck = createDeck();
    renderCardsGrid(deck);
}

// 更新公共牌显示
function updateCommunityCardDisplay(cardId, card) {
    const slot = document.querySelector(`[data-card-id="${cardId}"]`);
    if (slot) {
        slot.className = 'card-slot filled';
        slot.innerHTML = `
            <div class="card-slot-inner ${card.suitName}">
                <div class="card-value">${card.value}</div>
                <div class="card-suit">${card.symbol}</div>
                <div class="card-value" style="transform: rotate(180deg)">${card.value}</div>
            </div>
        `;
    }
}

// 一次性更新3张翻牌
function updateFlopCards(targetId, cards) {
    if (cards.length !== 3) {
        alert('请选择3张翻牌');
        return;
    }
    
    // 更新翻牌1
    updateCommunityCard('flop1', [cards[0]]);
    
    // 更新翻牌2
    updateCommunityCard('flop2', [cards[1]]);
    
    // 更新翻牌3
    updateCommunityCard('flop3', [cards[2]]);
}

// 一次性更新2张手牌
function updatePlayerHands(targetId, cards, playerId) {
    if (cards.length !== 2) {
        alert('请选择2张手牌');
        return;
    }
    
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return;
    
    // 移除旧卡牌
    if (player.hand[0]) {
        gameState.usedCards.delete(player.hand[0]);
    }
    if (player.hand[1]) {
        gameState.usedCards.delete(player.hand[1]);
    }
    
    // 添加新卡牌
    player.hand[0] = cards[0].name;
    player.hand[1] = cards[1].name;
    gameState.usedCards.add(cards[0].name);
    gameState.usedCards.add(cards[1].name);
    
    // 更新显示
    updatePlayerHandDisplay(playerId);
    
    // 重新渲染卡牌网格
    const deck = createDeck();
    renderCardsGrid(deck);
}



// 更新玩家手牌显示
function updatePlayerHandDisplay(playerId) {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return;
    
    const positionElement = document.querySelector(`[data-player-id="${playerId}"]`);
    const handSlots = positionElement.querySelectorAll('.hand-slot');
    
    handSlots.forEach((slot, index) => {
        const cardName = player.hand[index];
        if (cardName) {
            // 解析卡牌信息
            const value = cardName[0];
            const suit = cardName[1];
            const symbol = SUIT_SYMBOLS[suit];
            const suitName = SUIT_NAMES[suit];
            
            slot.className = 'hand-slot filled';
            slot.innerHTML = `
                <div class="card-slot-inner ${suitName}">
                    <div class="card-value">${value}</div>
                    <div class="card-suit">${symbol}</div>
                    <div class="card-value" style="transform: rotate(180deg)">${value}</div>
                </div>
            `;
        } else {
            slot.className = 'hand-slot';
            slot.innerHTML = '';
        }
    });
}



// 切换玩家状态
function togglePlayerStatus(playerId) {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return;
    
    // 切换状态
    player.status = player.status === 'active' ? 'folded' : 'active';
    
    // 更新DOM
    const element = document.querySelector(`[data-player-id="${playerId}"]`);
    const statusToggle = element.querySelector('.status-toggle');
    const statusText = element.querySelector('.status-text');
    const handSlots = element.querySelectorAll('.hand-slot');
    
    // 更新状态切换器样式
    statusToggle.className = `status-toggle ${player.status}`;
    statusText.textContent = player.status === 'active' ? '活跃' : '已弃牌';
    
    // 更新玩家信息框样式
    if (player.status === 'folded') {
        element.classList.add('folded');
        // 禁用起手牌修改
        handSlots.forEach(slot => {
            slot.style.pointerEvents = 'none';
            slot.style.opacity = '0.5';
        });
    } else {
        element.classList.remove('folded');
        // 启用起手牌修改
        handSlots.forEach(slot => {
            slot.style.pointerEvents = 'auto';
            slot.style.opacity = '1';
        });
    }
}



// 过滤活跃玩家
function getActivePlayers() {
    return gameState.players.filter(p => p.status === 'active');
}

// 获取公共牌
function getCommunityCards() {
    const cards = [];
    Object.values(gameState.communityCards).forEach(card => {
        if (card) cards.push(card);
    });
    return cards;
}

// 生成所有可能的剩余公共牌组合
function generateAllPossibleCommunityCards(currentCommunityCards) {
    // 复制当前公共牌
    const baseCards = { ...currentCommunityCards };
    
    // 计算需要填充的公共牌数量
    const missingCards = [];
    if (!baseCards.flop1) missingCards.push('flop1');
    if (!baseCards.flop2) missingCards.push('flop2');
    if (!baseCards.flop3) missingCards.push('flop3');
    if (!baseCards.turn) missingCards.push('turn');
    if (!baseCards.river) missingCards.push('river');
    
    // 如果没有缺失的公共牌，直接返回当前公共牌
    if (missingCards.length === 0) {
        return [baseCards];
    }
    
    // 创建一副完整的牌
    const deck = createDeck();
    
    // 移除已使用的牌
    const usedCards = new Set(gameState.usedCards);
    
    const availableCards = deck.filter(card => !usedCards.has(card.name));
    
    // 检查可用牌数量是否足够
    if (availableCards.length < missingCards.length) {
        console.error('可用牌数量不足，无法生成公共牌组合');
        return [];
    }
    
    // 计算组合数
    const n = availableCards.length;
    const k = missingCards.length;
    
    // 计算组合数 C(n, k)
    function combination(n, k) {
        if (k > n) return 0;
        if (k === 0 || k === n) return 1;
        k = Math.min(k, n - k); // 优化计算，C(n,k) = C(n,n-k)
        let result = 1;
        for (let i = 1; i <= k; i++) {
            result = result * (n - k + i) / i;
        }
        return result;
    }
    
    const totalCombinations = combination(n, k);
    
    const MONTE_CARLO_THRESHOLD = 1000000; // 100万，超过这个阈值使用蒙特卡洛模拟
    
    // 使用蒙特卡洛模拟，确保即使没有公共牌也能计算
    const monteCarloCount = totalCombinations > MONTE_CARLO_THRESHOLD ? 100000 : Math.min(totalCombinations, 100000);
    
    const allCombinations = [];
    
    for (let i = 0; i < monteCarloCount; i++) {
        // 复制当前公共牌
        const simulatedCards = { ...baseCards };
        
        // 洗牌可用牌
        const shuffledCards = [...availableCards];
        shuffleArray(shuffledCards);
        
        // 填充缺失的公共牌
        for (let j = 0; j < missingCards.length; j++) {
            simulatedCards[missingCards[j]] = shuffledCards[j].name;
        }
        
        allCombinations.push(simulatedCards);
    }
    
    return allCombinations;
}

// 计算胜率（基于所有可能的公共牌组合）
function calculateWinRates() {
    // 序列化当前游戏状态
    const currentState = serializeGameState();
    
    // 比较当前状态与上一次状态
    if (gameState.lastGameState) {
        const currentStateStr = JSON.stringify(currentState);
        const lastStateStr = JSON.stringify(gameState.lastGameState);
        
        if (currentStateStr === lastStateStr) {
            alert('牌局无变化，无需重新计算胜率');
            return;
        }
    }
    
    const activePlayers = getActivePlayers();
    if (activePlayers.length < 2) {
        alert('至少需要2个活跃玩家才能计算胜率');
        return;
    }
    
    // 验证所有活跃玩家都有完整的手牌
    const invalidPlayers = activePlayers.filter(p => !p.hand[0] || !p.hand[1]);
    if (invalidPlayers.length > 0) {
        alert('请为所有活跃玩家填写完整的起手牌');
        return;
    }
    
    // 生成所有可能的剩余公共牌组合
    const allPossibleCommunityCards = generateAllPossibleCommunityCards(gameState.communityCards);
    
    // 如果没有可能的组合，直接返回
    if (allPossibleCommunityCards.length === 0) {
        alert('无法生成可能的公共牌组合');
        return;
    }
    
    // 初始化胜率计数器
    const winCounts = activePlayers.map(() => 0);
    const totalCombinations = allPossibleCommunityCards.length;
    
    // 遍历所有可能的公共牌组合
    allPossibleCommunityCards.forEach(simulatedCards => {
        // 将模拟的公共牌转换为数组，用于evaluateHand函数
        const simulatedCardsArray = [];
        Object.values(simulatedCards).forEach(card => {
            if (card) simulatedCardsArray.push(card);
        });
        
        // 计算每个玩家的牌型强度
        const playerStrengths = activePlayers.map(player => {
            return {
                playerId: player.id,
                strength: evaluateHand(player.hand, simulatedCardsArray)
            };
        });
        
        // 找出最强的牌型
        const maxStrength = Math.max(...playerStrengths.map(ps => ps.strength));
        const winners = playerStrengths.filter(ps => ps.strength === maxStrength);
        
        // 更新胜率计数器
        if (winners.length === 1) {
            const winnerIndex = activePlayers.findIndex(p => p.id === winners[0].playerId);
            winCounts[winnerIndex]++;
        } else {
            // 平局，所有获胜玩家各获得1/获胜玩家数量的胜率
            const winShare = 1 / winners.length;
            winners.forEach(winner => {
                const winnerIndex = activePlayers.findIndex(p => p.id === winner.playerId);
                winCounts[winnerIndex] += winShare;
            });
        }
    });
    
    // 计算胜率
    const winRates = activePlayers.map((player, index) => {
        return {
            playerId: player.id,
            positionName: player.positionName,
            winRate: (winCounts[index] / totalCombinations) * 100
        };
    });
    
    // 显示结果
    displayResults(winRates);
}



// 洗牌函数
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// 显示胜率结果
function displayResults(winRates) {
    // 按胜率排序
    winRates.sort((a, b) => b.winRate - a.winRate);
    
    // 将胜率显示在玩家信息框内
    winRates.forEach(rate => {
        const winRateElement = document.getElementById(`win-rate-${rate.playerId}`);
        if (winRateElement) {
            winRateElement.innerHTML = `
                <div class="win-rate-info">
                    <div class="win-rate-label">胜率:</div>
                    <div class="win-rate-value">${rate.winRate.toFixed(1)}%</div>
                </div>
            `;
        }
    });
    
    // 保存当前状态，用于下次比较
    gameState.lastGameState = serializeGameState();
    
    // 清空旧的结果区域
    const container = document.getElementById('results');
    container.innerHTML = '';
}

// 牌型评估函数（返回牌型强度，用于比较）
function evaluateHand(hand, communityCards) {
    // 合并手牌和公共牌
    const allCards = [...hand, ...communityCards];
    
    // 解析牌值和花色
    const parsedCards = allCards.map(card => {
        return {
            value: getCardValue(card),
            suit: getCardSuit(card)
        };
    });
    
    // 按牌值排序
    parsedCards.sort((a, b) => b.value - a.value);
    
    // 计算牌型强度
    let handStrength = 0;
    
    // 检查皇家同花顺
    if (isRoyalFlush(parsedCards)) {
        handStrength = 1000000;
    }
    // 检查同花顺
    else if (isStraightFlush(parsedCards)) {
        handStrength = 900000 + parsedCards[0].value;
    }
    // 检查四条
    else if (isFourOfAKind(parsedCards)) {
        const valueCounts = getValueCounts(parsedCards);
        const fourValue = Object.keys(valueCounts).find(key => valueCounts[key] === 4);
        const kicker = Object.keys(valueCounts).find(key => valueCounts[key] === 1);
        handStrength = 800000 + parseInt(fourValue) * 100 + parseInt(kicker);
    }
    // 检查葫芦
    else if (isFullHouse(parsedCards)) {
        const valueCounts = getValueCounts(parsedCards);
        const threeValue = Object.keys(valueCounts).find(key => valueCounts[key] === 3);
        const pairValue = Object.keys(valueCounts).find(key => valueCounts[key] === 2);
        handStrength = 700000 + parseInt(threeValue) * 100 + parseInt(pairValue);
    }
    // 检查同花
    else if (isFlush(parsedCards)) {
        // 同花强度基于最大的5张牌
        handStrength = 600000 + parsedCards[0].value * 10000 + parsedCards[1].value * 100 + parsedCards[2].value;
    }
    // 检查顺子
    else if (isStraight(parsedCards)) {
        handStrength = 500000 + parsedCards[0].value;
    }
    // 检查三条
    else if (isThreeOfAKind(parsedCards)) {
        const valueCounts = getValueCounts(parsedCards);
        const threeValue = Object.keys(valueCounts).find(key => valueCounts[key] === 3);
        const kickers = Object.keys(valueCounts).filter(key => valueCounts[key] === 1).map(key => parseInt(key)).sort((a, b) => b - a);
        handStrength = 400000 + parseInt(threeValue) * 10000 + kickers[0] * 100 + kickers[1];
    }
    // 检查两对
    else if (isTwoPair(parsedCards)) {
        const valueCounts = getValueCounts(parsedCards);
        const pairs = Object.keys(valueCounts).filter(key => valueCounts[key] === 2).map(key => parseInt(key)).sort((a, b) => b - a);
        const kicker = Object.keys(valueCounts).find(key => valueCounts[key] === 1);
        handStrength = 300000 + pairs[0] * 10000 + pairs[1] * 100 + parseInt(kicker);
    }
    // 检查一对
    else if (isOnePair(parsedCards)) {
        const valueCounts = getValueCounts(parsedCards);
        const pairValue = Object.keys(valueCounts).find(key => valueCounts[key] === 2);
        const kickers = Object.keys(valueCounts).filter(key => valueCounts[key] === 1).map(key => parseInt(key)).sort((a, b) => b - a);
        handStrength = 200000 + parseInt(pairValue) * 10000 + kickers[0] * 1000 + kickers[1] * 100 + kickers[2];
    }
    // 高牌
    else {
        // 高牌强度基于最大的5张牌
        handStrength = parsedCards[0].value * 10000 + parsedCards[1].value * 1000 + parsedCards[2].value * 100 + parsedCards[3].value * 10 + parsedCards[4].value;
    }
    
    return handStrength;
}

// 辅助函数：检查皇家同花顺
function isRoyalFlush(cards) {
    return isStraightFlush(cards) && cards[0].value === 14 && cards[1].value === 13 && cards[2].value === 12 && cards[3].value === 11 && cards[4].value === 10;
}

// 辅助函数：检查同花顺
function isStraightFlush(cards) {
    return isFlush(cards) && isStraight(cards);
}

// 辅助函数：检查四条
function isFourOfAKind(cards) {
    const valueCounts = getValueCounts(cards);
    return Object.values(valueCounts).includes(4);
}

// 辅助函数：检查葫芦
function isFullHouse(cards) {
    const valueCounts = getValueCounts(cards);
    const counts = Object.values(valueCounts).sort((a, b) => b - a);
    return counts[0] === 3 && counts[1] === 2;
}

// 辅助函数：检查同花
function isFlush(cards) {
    const suitCounts = getSuitCounts(cards);
    return Object.values(suitCounts).some(count => count >= 5);
}

// 辅助函数：检查顺子
function isStraight(cards) {
    // 去重并排序
    const uniqueValues = [...new Set(cards.map(card => card.value))].sort((a, b) => b - a);
    
    // 检查是否有5张连续的牌
    for (let i = 0; i <= uniqueValues.length - 5; i++) {
        if (uniqueValues[i] - uniqueValues[i + 4] === 4) {
            return true;
        }
    }
    
    // 检查A-2-3-4-5的情况
    if (uniqueValues.includes(14) && uniqueValues.includes(2) && uniqueValues.includes(3) && uniqueValues.includes(4) && uniqueValues.includes(5)) {
        return true;
    }
    
    return false;
}

// 辅助函数：检查三条
function isThreeOfAKind(cards) {
    const valueCounts = getValueCounts(cards);
    return Object.values(valueCounts).includes(3);
}

// 辅助函数：检查两对
function isTwoPair(cards) {
    const valueCounts = getValueCounts(cards);
    const pairs = Object.values(valueCounts).filter(count => count >= 2);
    return pairs.length >= 2;
}

// 辅助函数：检查一对
function isOnePair(cards) {
    const valueCounts = getValueCounts(cards);
    return Object.values(valueCounts).includes(2);
}

// 辅助函数：获取牌值计数
function getValueCounts(cards) {
    const counts = {};
    cards.forEach(card => {
        counts[card.value] = (counts[card.value] || 0) + 1;
    });
    return counts;
}

// 辅助函数：获取花色计数
function getSuitCounts(cards) {
    const counts = {};
    cards.forEach(card => {
        counts[card.suit] = (counts[card.suit] || 0) + 1;
    });
    return counts;
}

// 初始化应用
document.addEventListener('DOMContentLoaded', init);

// 辅助函数：获取牌的数值
function getCardValue(card) {
    if (!card) return 0;
    const value = card[0];
    switch (value) {
        case 'A': return 14;
        case 'K': return 13;
        case 'Q': return 12;
        case 'J': return 11;
        case 'T': return 10;
        default: return parseInt(value);
    }
}

// 辅助函数：获取牌的花色
function getCardSuit(card) {
    if (!card) return '';
    return card[1];
}

