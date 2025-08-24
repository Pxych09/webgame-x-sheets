// Configuration - Replace with your Google Apps Script Web App URL
const API_URL = 'https://script.google.com/macros/s/AKfycbxGjGSaCx0tPHTnyGOPUr4QMW_5KAmjZxTwCPgSgcTqeCpe8giNZABZeUO6pBy8X0rS/exec';

// Global variables
let currentUser = null;
let gameData = {
    game1: { target: 0, attempts: 0, active: false },
    game2: { cards: [], flipped: [], matches: 0, timer: 0, active: false },
    game3: { score: 0, timeLeft: 30, active: false, targets: [] }
};

// Loading States Management
const LoadingManager = {
    hidePageLoader() {
        const loader = document.getElementById('pageLoader');
        if (loader) {
            setTimeout(() => {
                loader.classList.add('hidden');
            }, 500); // Small delay for better UX
        }
    },

    showButtonLoading(buttonId) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.classList.add('loading');
            button.disabled = true;
            
            // Disable form inputs if button is in a form
            const form = button.closest('form');
            if (form) {
                const inputs = form.querySelectorAll('input');
                inputs.forEach(input => input.disabled = true);
            }
        }
    },

    hideButtonLoading(buttonId) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.classList.remove('loading');
            button.disabled = false;
            
            // Re-enable form inputs
            const form = button.closest('form');
            if (form) {
                const inputs = form.querySelectorAll('input');
                inputs.forEach(input => input.disabled = false);
            }
        }
    },

    showScoreLoading() {
        // Show loading dots in score elements
        ['game1Score', 'game2Score', 'game3Score', 'totalScore'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.classList.add('loading-placeholder');
                element.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';
            }
        });
    },

    hideScoreLoading() {
        // Remove loading state from score elements
        ['game1Score', 'game2Score', 'game3Score', 'totalScore'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.classList.remove('loading-placeholder');
            }
        });
    },

    showLeaderboardLoading() {
        const leaderboard = document.getElementById('leaderboard');
        if (leaderboard) {
            leaderboard.innerHTML = `
                <div class="leaderboard-loading">
                    <div class="loading-skeleton">
                        ${Array(5).fill(0).map(() => `
                            <div class="skeleton-item">
                                <div class="skeleton-rank"></div>
                                <div class="skeleton-user"></div>
                                <div class="skeleton-scores"></div>
                                <div class="skeleton-total"></div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    },

    showScoreUpdateToast() {
        const toast = document.getElementById('scoreUpdateToast');
        if (toast) {
            toast.classList.add('show');
        }
    },

    hideScoreUpdateToast() {
        const toast = document.getElementById('scoreUpdateToast');
        if (toast) {
            toast.classList.remove('show');
        }
    },

    showGameLoading(gameNumber) {
        if (gameNumber === 2) {
            const memoryGrid = document.getElementById('memoryGrid');
            if (memoryGrid) {
                memoryGrid.innerHTML = `
                    <div class="game-loading">
                        <span class="spinner"></span>
                        <span>Setting up game...</span>
                    </div>
                `;
            }
        }
    }
};

// Enhanced API call with loading states
async function makeAPICall(payload, showToast = false) {
    try {
        console.log('Making API call:', payload);
        
        if (showToast) {
            LoadingManager.showScoreUpdateToast();
        }
        
        // First try regular fetch
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                const result = await response.json();
                console.log('API response:', result);
                return result;
            }
        } catch (fetchError) {
            console.log('Fetch failed, trying JSONP alternative...');
        }
        
        // Fallback to GET request with parameters (JSONP style)
        const params = new URLSearchParams();
        Object.entries(payload).forEach(([key, value]) => {
            params.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
        });
        
        const getUrl = `${API_URL}?${params.toString()}`;
        const getResponse = await fetch(getUrl, { method: 'GET' });
        
        if (getResponse.ok) {
            const result = await getResponse.json();
            console.log('GET API response:', result);
            return result;
        }
        
        throw new Error('Both POST and GET failed');

    } catch (error) {
        console.error('API call failed:', error);
        return {
            success: false,
            message: 'Network error: ' + error.message
        };
    } finally {
        if (showToast) {
            setTimeout(() => {
                LoadingManager.hideScoreUpdateToast();
            }, 1000);
        }
    }
}

// Utility Functions
function showMessage(message, type = 'info') {
    const messageDiv = document.getElementById('message');
    if (messageDiv) {
        messageDiv.textContent = message;
        messageDiv.className = `message ${type}`;
        messageDiv.classList.add('show');
        
        setTimeout(() => {
            messageDiv.classList.remove('show');
        }, 4000);
    }
}

// Authentication Functions
async function login(username, password) {
    console.log('Attempting login for:', username);
    
    LoadingManager.showButtonLoading('loginBtn');
    
    try {
        const result = await makeAPICall({
            action: 'login',
            username: username,
            password: password
        });
        
        if (result.success) {
            currentUser = username;
            localStorage.setItem('gameUser', username);
            showMessage('Login successful!', 'success');
            
            // Add a small delay to show the success message
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        } else {
            showMessage(result.message || 'Login failed', 'error');
        }
    } finally {
        LoadingManager.hideButtonLoading('loginBtn');
    }
}

async function register(username, password) {
    if (username.length < 3) {
        showMessage('Username must be at least 3 characters long', 'error');
        return;
    }
    
    if (password.length < 4) {
        showMessage('Password must be at least 4 characters long', 'error');
        return;
    }
    
    console.log('Attempting registration for:', username);
    
    LoadingManager.showButtonLoading('registerBtn');
    
    try {
        const result = await makeAPICall({
            action: 'register',
            username: username,
            password: password
        });
        
        if (result.success) {
            showMessage('Registration successful! You can now login.', 'success');
            // Clear register form
            document.getElementById('regUsername').value = '';
            document.getElementById('regPassword').value = '';
        } else {
            showMessage(result.message || 'Registration failed', 'error');
        }
    } finally {
        LoadingManager.hideButtonLoading('registerBtn');
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('gameUser');
    window.location.href = 'index.html';
}

// Dashboard Functions
async function loadUserStats() {
    if (!currentUser) return;
    
    console.log('Loading stats for:', currentUser);
    
    LoadingManager.showScoreLoading();
    
    try {
        const result = await makeAPICall({
            action: 'getScores',
            username: currentUser
        });
        
        if (result.success && result.data) {
            const scores = result.data;
            
            // Animate score updates
            setTimeout(() => {
                const game1El = document.getElementById('game1Score');
                const game2El = document.getElementById('game2Score');
                const game3El = document.getElementById('game3Score');
                const totalEl = document.getElementById('totalScore');
                
                if (game1El) {
                    game1El.textContent = scores.game1 || 0;
                    game1El.classList.add('fade-in');
                }
                if (game2El) {
                    game2El.textContent = scores.game2 || 0;
                    game2El.classList.add('fade-in');
                }
                if (game3El) {
                    game3El.textContent = scores.game3 || 0;
                    game3El.classList.add('fade-in');
                }
                
                const total = (scores.game1 || 0) + (scores.game2 || 0) + (scores.game3 || 0);
                if (totalEl) {
                    totalEl.textContent = total;
                    totalEl.classList.add('fade-in');
                }
                
                LoadingManager.hideScoreLoading();
            }, 800); // Small delay for better UX
        } else {
            console.error('Failed to load user stats:', result.message);
            LoadingManager.hideScoreLoading();
            
            // Show zeros if loading failed
            ['game1Score', 'game2Score', 'game3Score', 'totalScore'].forEach(id => {
                const element = document.getElementById(id);
                if (element) element.textContent = '0';
            });
        }
    } catch (error) {
        console.error('Error loading user stats:', error);
        LoadingManager.hideScoreLoading();
    }
}

async function loadLeaderboard() {
    console.log('Loading leaderboard...');
    
    LoadingManager.showLeaderboardLoading();
    
    try {
        const result = await makeAPICall({
            action: 'getLeaderboard'
        });
        
        const leaderboardDiv = document.getElementById('leaderboard');
        if (!leaderboardDiv) return;
        
        // Add delay for better UX
        setTimeout(() => {
            if (result.success && result.data && result.data.leaderboard && result.data.leaderboard.length > 0) {
                leaderboardDiv.innerHTML = '';
                
                result.data.leaderboard.forEach((player, index) => {
                    const item = document.createElement('div');
                    item.className = 'leaderboard-item';
                    item.style.animationDelay = `${index * 0.1}s`;
                    
                    let rankClass = '';
                    if (index === 0) rankClass = 'first';
                    else if (index === 1) rankClass = 'second';
                    else if (index === 2) rankClass = 'third';
                    
                    item.innerHTML = `
                        <div class="leaderboard-rank ${rankClass}">#${index + 1}</div>
                        <div class="leaderboard-user">${player.username}</div>
                        <div class="leaderboard-scores">
                            <span>Number Guessing: </span><b>${player.game1}</b>
                            <span>Memory Match:  </span><b>${player.game2}</b>
                            <span>Swift Click:  </span><b>${player.game3}</b>
                        </div>
                        <div class="leaderboard-total">${player.totalScore}</div>
                    `;
                    
                    leaderboardDiv.appendChild(item);
                });
            } else {
                leaderboardDiv.innerHTML = '<div class="loading">No scores available yet</div>';
                console.log('No leaderboard data available');
            }
        }, 600);
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        const leaderboardDiv = document.getElementById('leaderboard');
        if (leaderboardDiv) {
            leaderboardDiv.innerHTML = '<div class="loading">Failed to load leaderboard</div>';
        }
    }
}

async function refreshLeaderboard() {
    LoadingManager.showButtonLoading('refreshLeaderboard');
    
    try {
        await loadLeaderboard();
    } finally {
        setTimeout(() => {
            LoadingManager.hideButtonLoading('refreshLeaderboard');
        }, 1000);
    }
}

async function updateScore(gameNumber, score) {
    console.log(`Updating score for game ${gameNumber}: ${score}`);
    
    const result = await makeAPICall({
        action: 'updateScore',
        username: currentUser,
        game: gameNumber,
        score: score
    }, true); // Show toast
    
    if (result.success) {
        // Reload data with slight delay
        setTimeout(async () => {
            await loadUserStats();
            await loadLeaderboard();
        }, 500);
        
        if (result.data && result.data.newScore > result.data.previousScore) {
            showMessage(`New high score: ${score}!`, 'success');
        }
    } else {
        console.error('Failed to update score:', result.message);
        showMessage('Failed to update score', 'error');
    }
}

// Game Management Functions
function startGame(gameNumber) {
    const modal = document.getElementById(`game${gameNumber}Modal`);
    if (modal) {
        modal.style.display = 'block';
        
        switch(gameNumber) {
            case 1:
                setTimeout(() => initNumberGuessingGame(), 100);
                break;
            case 2:
                LoadingManager.showGameLoading(2);
                setTimeout(() => initMemoryGame(), 500);
                break;
            case 3:
                setTimeout(() => initQuickClickGame(), 100);
                break;
        }
    }
}

function closeGame(gameNumber) {
    const modal = document.getElementById(`game${gameNumber}Modal`);
    if (modal) {
        modal.style.display = 'none';
    }
    
    // Reset game states
    switch(gameNumber) {
        case 1:
            gameData.game1 = { target: 0, attempts: 0, active: false };
            break;
        case 2:
            gameData.game2 = { cards: [], flipped: [], matches: 0, timer: 0, active: false };
            if (gameData.game2.timerInterval) {
                clearInterval(gameData.game2.timerInterval);
            }
            break;
        case 3:
            gameData.game3 = { score: 0, timeLeft: 30, active: false, targets: [] };
            if (gameData.game3.gameInterval) {
                clearInterval(gameData.game3.gameInterval);
            }
            if (gameData.game3.timerInterval) {
                clearInterval(gameData.game3.timerInterval);
            }
            break;
    }
}

// Game 1: Number Guessing
function initNumberGuessingGame() {
    gameData.game1.target = Math.floor(Math.random() * 100) + 1;
    gameData.game1.attempts = 0;
    gameData.game1.active = true;
    
    const guessInput = document.getElementById('guessInput');
    const guessResult = document.getElementById('guessResult');
    const attemptsCount = document.getElementById('attemptsCount');
    
    if (guessInput) guessInput.value = '';
    if (guessResult) guessResult.textContent = '';
    if (attemptsCount) attemptsCount.textContent = 'Attempts: 0';
    
    // Focus on input
    if (guessInput) {
        guessInput.focus();
        
        // Add enter key listener
        guessInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !document.getElementById('guessBtn').classList.contains('loading')) {
                makeGuess();
            }
        });
    }
}

async function makeGuess() {
    if (!gameData.game1.active) return;
    
    const guessInput = document.getElementById('guessInput');
    const resultDiv = document.getElementById('guessResult');
    const attemptsDiv = document.getElementById('attemptsCount');
    
    if (!guessInput || !resultDiv || !attemptsDiv) return;
    
    const guess = parseInt(guessInput.value);
    
    if (!guess || guess < 1 || guess > 100) {
        resultDiv.textContent = 'Please enter a number between 1 and 100';
        resultDiv.className = 'incorrect shake';
        return;
    }
    
    LoadingManager.showButtonLoading('guessBtn');
    
    // Add small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500));
    
    gameData.game1.attempts++;
    attemptsDiv.textContent = `Attempts: ${gameData.game1.attempts}`;
    
    if (guess === gameData.game1.target) {
        resultDiv.textContent = `🎉 Correct! You found ${gameData.game1.target}!`;
        resultDiv.className = 'correct bounce';
        gameData.game1.active = false;
        
        // Calculate score (fewer attempts = higher score)
        const score = Math.max(0, 110 - gameData.game1.attempts * 10);
        
        setTimeout(async () => {
            await updateScore(1, score);
            showMessage(`Game completed! Score: ${score}`, 'success');
        }, 1500);
        
    } else if (guess < gameData.game1.target) {
        resultDiv.textContent = '📈 Too low! Try a higher number.';
        resultDiv.className = 'incorrect';
    } else {
        resultDiv.textContent = '📉 Too high! Try a lower number.';
        resultDiv.className = 'incorrect';
    }
    
    LoadingManager.hideButtonLoading('guessBtn');
    guessInput.value = '';
    if (gameData.game1.active) {
        guessInput.focus();
    }
}

// Game 2: Memory Match
function initMemoryGame() {
    gameData.game2.active = true;
    gameData.game2.matches = 0;
    gameData.game2.flipped = [];
    gameData.game2.timer = 0;
    
    // Create card pairs
    const symbols = ['🎮', '🎯', '🎲', '🎪', '🎨', '🎭', '🎸', '🎺'];
    gameData.game2.cards = [...symbols, ...symbols];
    
    // Shuffle cards
    for (let i = gameData.game2.cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [gameData.game2.cards[i], gameData.game2.cards[j]] = [gameData.game2.cards[j], gameData.game2.cards[i]];
    }
    
    // Create grid with animation
    const grid = document.getElementById('memoryGrid');
    if (grid) {
        // Clear loading state first
        setTimeout(() => {
            grid.innerHTML = '';
            grid.className = 'memory-grid';
            
            gameData.game2.cards.forEach((symbol, index) => {
                const card = document.createElement('div');
                card.className = 'memory-card';
                card.dataset.index = index;
                card.dataset.symbol = symbol;
                card.style.animationDelay = `${index * 0.05}s`;
                card.addEventListener('click', flipCard);
                
                // Add appear animation
                setTimeout(() => {
                    card.classList.add('fade-in');
                }, index * 50);
                
                grid.appendChild(card);
            });
        }, 200);
    }
    
    // Start timer
    updateMemoryDisplay();
    gameData.game2.timerInterval = setInterval(() => {
        gameData.game2.timer++;
        updateMemoryDisplay();
    }, 1000);
}

function flipCard(e) {
    if (!gameData.game2.active) return;
    
    const card = e.target;
    const index = parseInt(card.dataset.index);
    
    // Can't flip already flipped or matched cards
    if (card.classList.contains('flipped') || card.classList.contains('matched')) return;
    
    // Can't flip more than 2 cards at once
    if (gameData.game2.flipped.length >= 2) return;
    
    // Flip card with animation
    card.classList.add('flipped');
    card.textContent = card.dataset.symbol;
    gameData.game2.flipped.push(index);
    
    if (gameData.game2.flipped.length === 2) {
        setTimeout(checkMatch, 1000);
    }
}

function checkMatch() {
    const [index1, index2] = gameData.game2.flipped;
    const card1 = document.querySelector(`[data-index="${index1}"]`);
    const card2 = document.querySelector(`[data-index="${index2}"]`);
    
    if (gameData.game2.cards[index1] === gameData.game2.cards[index2]) {
        // Match found
        card1.classList.add('matched');
        card2.classList.add('matched');
        gameData.game2.matches++;
        
        if (gameData.game2.matches === 8) {
            // Game complete
            gameData.game2.active = false;
            clearInterval(gameData.game2.timerInterval);
            
            // Calculate score (faster = higher score)
            const score = Math.max(0, 300 - gameData.game2.timer * 2);
            
            setTimeout(async () => {
                await updateScore(2, score);
                showMessage(`Memory game completed! Time: ${gameData.game2.timer}s, Score: ${score}`, 'success');
            }, 500);
        }
    } else {
        // No match - add shake animation
        card1.classList.add('shake');
        card2.classList.add('shake');
        
        setTimeout(() => {
            card1.classList.remove('flipped', 'shake');
            card2.classList.remove('flipped', 'shake');
            card1.textContent = '';
            card2.textContent = '';
        }, 300);
    }
    
    gameData.game2.flipped = [];
    updateMemoryDisplay();
}

function updateMemoryDisplay() {
    const matchesEl = document.getElementById('matchesFound');
    const timerEl = document.getElementById('gameTimer');
    
    if (matchesEl) matchesEl.textContent = `Matches: ${gameData.game2.matches}/8`;
    if (timerEl) timerEl.textContent = `Time: ${gameData.game2.timer}s`;
}

// Game 3: Quick Click
function initQuickClickGame() {
    gameData.game3 = { score: 0, timeLeft: 30, active: false, targets: [] };
    
    const gameArea = document.getElementById('clickGameArea');
    if (gameArea) {
        gameArea.innerHTML = '<button class="btn btn-primary pulse" onclick="startClickGame()">Start Game</button>';
    }
    
    const clickScore = document.getElementById('clickScore');
    const clickTimer = document.getElementById('clickTimer');
    
    if (clickScore) clickScore.textContent = 'Score: 0';
    if (clickTimer) clickTimer.textContent = 'Time: 30s';
}

function startClickGame() {
    gameData.game3.active = true;
    gameData.game3.score = 0;
    gameData.game3.timeLeft = 30;
    
    const gameArea = document.getElementById('clickGameArea');
    if (gameArea) {
        gameArea.innerHTML = '';
    }
    
    // Start spawning targets
    gameData.game3.gameInterval = setInterval(spawnTarget, 800);
    
    // Start countdown timer
    gameData.game3.timerInterval = setInterval(() => {
        gameData.game3.timeLeft--;
        const clickTimer = document.getElementById('clickTimer');
        if (clickTimer) {
            clickTimer.textContent = `Time: ${gameData.game3.timeLeft}s`;
            
            // Add urgency visual cues
            if (gameData.game3.timeLeft <= 10) {
                clickTimer.classList.add('pulse');
                clickTimer.style.color = '#f44336';
            }
        }
        
        if (gameData.game3.timeLeft <= 0) {
            endClickGame();
        }
    }, 1000);
}

function spawnTarget() {
    if (!gameData.game3.active) return;
    
    const gameArea = document.getElementById('clickGameArea');
    if (!gameArea) return;
    
    const target = document.createElement('div');
    target.className = 'click-target';
    target.textContent = '🎯';
    
    // Random position
    const maxX = gameArea.offsetWidth - 50;
    const maxY = gameArea.offsetHeight - 50;
    target.style.left = Math.random() * maxX + 'px';
    target.style.top = Math.random() * maxY + 'px';
    
    target.addEventListener('click', () => {
        if (gameData.game3.active) {
            gameData.game3.score += 10;
            const clickScore = document.getElementById('clickScore');
            if (clickScore) {
                clickScore.textContent = `Score: ${gameData.game3.score}`;
                clickScore.classList.add('bounce');
                setTimeout(() => clickScore.classList.remove('bounce'), 500);
            }
            
            // Add hit animation
            target.classList.add('hit');
            
            setTimeout(() => {
                if (target.parentNode) {
                    target.remove();
                }
            }, 300);
        }
    });
    
    gameArea.appendChild(target);
    
    // Remove target after 2 seconds if not clicked
    setTimeout(() => {
        if (target.parentNode && !target.classList.contains('hit')) {
            target.style.animation = 'targetDisappear 0.3s ease-in forwards';
            setTimeout(() => target.remove(), 300);
        }
    }, 2000);
}

async function endClickGame() {
    gameData.game3.active = false;
    
    if (gameData.game3.gameInterval) {
        clearInterval(gameData.game3.gameInterval);
    }
    if (gameData.game3.timerInterval) {
        clearInterval(gameData.game3.timerInterval);
    }
    
    const gameArea = document.getElementById('clickGameArea');
    if (gameArea) {
        // Clear all targets
        gameArea.innerHTML = `
            <div style="color: white; font-size: 1.5rem; text-align: center;" class="fade-in">
                <h3>Game Over!</h3>
                <p>Final Score: ${gameData.game3.score}</p>
                <button class="btn btn-primary pulse" onclick="startClickGame()" style="margin-top: 20px;">Play Again</button>
            </div>
        `;
    }
    
    // Reset timer color
    const clickTimer = document.getElementById('clickTimer');
    if (clickTimer) {
        clickTimer.classList.remove('pulse');
        clickTimer.style.color = '#667eea';
    }
    
    await updateScore(3, gameData.game3.score);
    showMessage(`Quick Click completed! Score: ${gameData.game3.score}`, 'success');
}

// Event Listeners and Initialization
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the login page
    if (document.getElementById('loginForm')) {
        // Hide page loader
        setTimeout(() => {
            LoadingManager.hidePageLoader();
        }, 800);
        
        // Check if user is already logged in
        const savedUser = localStorage.getItem('gameUser');
        if (savedUser) {
            window.location.href = 'dashboard.html';
            return;
        }
        
        // Login form handler
        document.getElementById('loginForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            
            if (username && password) {
                login(username, password);
            } else {
                showMessage('Please enter both username and password', 'error');
            }
        });
        
        // Register form handler
        document.getElementById('registerForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const username = document.getElementById('regUsername').value.trim();
            const password = document.getElementById('regPassword').value;
            
            if (username && password) {
                register(username, password);
            } else {
                showMessage('Please enter both username and password', 'error');
            }
        });
    }
    
    // Check if we're on the dashboard page
    if (document.getElementById('welcomeUser')) {
        // Check authentication
        currentUser = localStorage.getItem('gameUser');
        if (!currentUser) {
            window.location.href = 'index.html';
            return;
        }
        
        // Initialize dashboard
        const welcomeEl = document.getElementById('welcomeUser');
        const logoutBtn = document.getElementById('logoutBtn');
        
        if (welcomeEl) welcomeEl.textContent = `Welcome, ${currentUser}!`;
        if (logoutBtn) logoutBtn.addEventListener('click', logout);
        
        // Load data with staggered loading for better UX
        setTimeout(async () => {
            await loadUserStats();
            await loadLeaderboard();
            LoadingManager.hidePageLoader();
        }, 500);
        
        // Close modals when clicking outside
        window.addEventListener('click', function(e) {
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });
        
        // Refresh leaderboard every 30 seconds
        setInterval(loadLeaderboard, 30000);
    }
});

// Add CSS for target disappear animation
const style = document.createElement('style');
style.textContent = `
    @keyframes targetDisappear {
        from {
            transform: scale(1);
            opacity: 1;
        }
        to {
            transform: scale(0);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Make functions globally available
window.startGame = startGame;
window.closeGame = closeGame;
window.makeGuess = makeGuess;
window.startClickGame = startClickGame;
window.refreshLeaderboard = refreshLeaderboard;