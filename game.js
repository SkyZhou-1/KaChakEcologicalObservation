// game.js

// ======================
// 1. 难度设定
// ======================
const DIFFICULTY = {
    EASY: { rows: 9, cols: 9, mines: 10, cellSize: 32 },
    MEDIUM: { rows: 16, cols: 16, mines: 40, cellSize: 24 },
    HARD: { rows: 16, cols: 30, mines: 99, cellSize: 20 }
};

const config = DIFFICULTY.EASY;


// ======================
// 2. 游戏状态类
// ======================
class GameState {
    constructor(config) {
        this.config = config;
        this.grid = [];
        this.firstClick = true;
        this.gameOver = false;
        this.win = false;
        this.flagsPlaced = 0;

        this.hoveredCell = null;

        this.animalIcons = [
            '🐯','🐒','🐘','🐍','🦧','🦜',
            '🐻','🦛','🦋','🐜','🪲','🐢',
            '🐦','🐦‍⬛','🦣','🦧','🐿'
        ];

        this.victoryIconIndex = Math.floor(Math.random() * this.animalIcons.length);

        this.initGrid();
    }

    initGrid() {
        this.grid = Array.from({ length: this.config.rows }, () =>
            Array.from({ length: this.config.cols }, () => ({
                isMine: false,
                neighborMines: 0,
                isRevealed: false,
                isFlagged: false,
            }))
        );
    }

    generateMines(safeRow, safeCol) {
        const { rows, cols, mines } = this.config;
        const totalCells = rows * cols;
        const safeIdx = safeRow * cols + safeCol;

        const allIndices = Array.from({ length: totalCells }, (_, i) => i);
        allIndices.splice(safeIdx, 1);

        for (let i = allIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allIndices[i], allIndices[j]] = [allIndices[j], allIndices[i]];
        }

        const mineIndices = allIndices.slice(0, mines);

        mineIndices.forEach(idx => {
            const r = Math.floor(idx / cols);
            const c = idx % cols;
            this.grid[r][c].isMine = true;
        });

        this.calculateNeighborMines();
        this.firstClick = false;
    }

    calculateNeighborMines() {
        const { rows, cols } = this.config;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (this.grid[r][c].isMine) continue;

                let count = 0;

                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const nr = r + dr;
                        const nc = c + dc;

                        if (
                            nr >= 0 && nr < rows &&
                            nc >= 0 && nc < cols &&
                            this.grid[nr][nc].isMine
                        ) {
                            count++;
                        }
                    }
                }

                this.grid[r][c].neighborMines = count;
            }
        }
    }

    revealCell(row, col) {
        const cell = this.grid[row][col];

        if (cell.isRevealed || cell.isFlagged || this.gameOver) return;

        cell.isRevealed = true;

        if (cell.isMine) {
            this.gameOver = true;
            this.revealAllMines();
            return;
        }

        if (cell.neighborMines === 0) {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = row + dr;
                    const nc = col + dc;

                    if (
                        nr >= 0 && nr < this.config.rows &&
                        nc >= 0 && nc < this.config.cols
                    ) {
                        this.revealCell(nr, nc);
                    }
                }
            }
        }
    }

    revealAllMines() {
        this.grid.forEach(row => {
            row.forEach(cell => {
                if (cell.isMine) cell.isRevealed = true;
            });
        });
    }
}


// ======================
// 3. 渲染类
// ======================
class GameRenderer {
    constructor(canvas, gameState) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.state = gameState;

        this.canvas.width = gameState.config.cols * gameState.config.cellSize;
        this.canvas.height = gameState.config.rows * gameState.config.cellSize;
        this.cellSize = gameState.config.cellSize;
    }

    render() {
        const { rows, cols } = this.state.config;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                this.drawCell(r, c);
            }
        }
    }

    drawCell(r, c) {
        const cell = this.state.grid[r][c];
        const x = c * this.cellSize;
        const y = r * this.cellSize;
        const cs = this.cellSize;
        const ctx = this.ctx;

        ctx.strokeStyle = '#96e465';
        ctx.strokeRect(x, y, cs, cs);

        if (cell.isRevealed) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x, y, cs, cs);

            if (cell.isMine) {
                ctx.fillStyle = '#e74c3c';
                ctx.font = `${cs * 0.7}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🐾', x + cs / 2, y + cs / 2);

            } else if (cell.neighborMines > 0) {
                ctx.fillStyle = this.getNumberColor(cell.neighborMines);
                ctx.font = `bold ${cs * 0.6}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(cell.neighborMines, x + cs / 2, y + cs / 2);
            }

        } else {
            ctx.fillStyle = '#2ecc71';
            ctx.fillRect(x, y, cs, cs);

            if (
                this.state.hoveredCell &&
                this.state.hoveredCell.r === r &&
                this.state.hoveredCell.c === c
            ) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.fillRect(x, y, cs, cs);
            }

            if (cell.isFlagged) {
                let icon = '📷';

                if (this.state.win) {
                    const animalIdx =
                        (r * this.state.config.cols + c) %
                        this.state.animalIcons.length;

                    icon = this.state.animalIcons[animalIdx];
                }

                ctx.fillStyle = '#f1c40f';
                ctx.font = `${cs * 0.7}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(icon, x + cs / 2, y + cs / 2);
            }
        }
    }

    getNumberColor(num) {
        const colors = [
            '',
            '#0c4c78',
            '#055b29',
            '#961b0e',
            '#550f72',
            '#9e4204',
            '#0b8068',
            '#011121',
            '#093033'
        ];

        return colors[num] || '#000';
    }
}


// ======================
// 4. 初始化
// ======================
const canvas = document.getElementById('gameCanvas');
const flagCounter = document.getElementById('flag-count');

let gameState = new GameState(DIFFICULTY.EASY);
let renderer = new GameRenderer(canvas, gameState);

flagCounter.innerText = gameState.config.mines;
renderer.render();


// ======================
// 5. 游戏核心操作
// ======================
function handleReveal(row, col) {
    if (gameState.firstClick) {
        gameState.generateMines(row, col);
    }

    gameState.revealCell(row, col);
    renderer.render();

    checkGameStatus();
}

function toggleFlag(row, col) {
    const cell = gameState.grid[row][col];
    if (cell.isRevealed) return;

    if (!cell.isFlagged && gameState.flagsPlaced < gameState.config.mines) {
        cell.isFlagged = true;
        gameState.flagsPlaced++;
    } else if (cell.isFlagged) {
        cell.isFlagged = false;
        gameState.flagsPlaced--;
    }

    flagCounter.innerText =
        gameState.config.mines - gameState.flagsPlaced;

    renderer.render();
}


// ======================
// 6. 胜负判断
// ======================
function checkGameStatus() {
    const messageDisplay = document.getElementById('message-display');

    if (gameState.gameOver) {
        messageDisplay.innerText =
            "Exploration failed: Disturbed the wild animals!";
        messageDisplay.style.backgroundColor = "#fadbd8";
        messageDisplay.style.color = "#e74c3c";
        messageDisplay.style.display = "block";
        return;
    }

    let safeCellsLeft = 0;

    gameState.grid.forEach(row => {
        row.forEach(cell => {
            if (!cell.isMine && !cell.isRevealed) safeCellsLeft++;
        });
    });

    if (safeCellsLeft === 0 && !gameState.win) {
        gameState.win = true;

        renderer.render();

        messageDisplay.innerText =
            "Congratulations! You have completed the exploration without disturbing the wild animals!";

        messageDisplay.style.backgroundColor = "#d4efdf";
        messageDisplay.style.color = "#27ae60";
        messageDisplay.style.display = "block";
    }
}


// ======================
// 7. 移动端交互
// ======================
let touchStartTime = 0;

canvas.addEventListener('touchstart', () => {
    touchStartTime = Date.now();
});

canvas.addEventListener('touchend', (e) => {
    if (gameState.gameOver) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.changedTouches[0];

    const clickX = touch.clientX - rect.left;
    const clickY = touch.clientY - rect.top;

    const col = Math.floor(clickX / gameState.config.cellSize);
    const row = Math.floor(clickY / gameState.config.cellSize);

    const touchDuration = Date.now() - touchStartTime;

    if (touchDuration > 300) {
        if (window.navigator.vibrate) window.navigator.vibrate(50); // 震动 50ms 提示插旗成功
        toggleFlag(row, col);
    } else {
        handleReveal(row, col);
    }
});


// ======================
// 8. 桌面端交互
// ======================
canvas.addEventListener('mousedown', (e) => {
    if (gameState.gameOver || gameState.win) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const col = Math.floor(x / gameState.config.cellSize);
    const row = Math.floor(y / gameState.config.cellSize);

    if (
        row < 0 || row >= gameState.config.rows ||
        col < 0 || col >= gameState.config.cols
    ) return;

    if (e.button === 0) {
        handleReveal(row, col);
    } else if (e.button === 2) {
        e.preventDefault();
        toggleFlag(row, col);
    }
});


// ======================
// 9. 难度切换
// ======================
function changeDifficulty(level) {
    const newConfig = DIFFICULTY[level];

    gameState = new GameState(newConfig);
    renderer = new GameRenderer(canvas, gameState);

    flagCounter.innerText = newConfig.mines;

    const messageDisplay = document.getElementById('message-display');
    messageDisplay.style.display = "none";
    messageDisplay.innerText = "";

    renderer.render();
}


// ======================
// 10. Hover 效果
// ======================
canvas.addEventListener('mousemove', (e) => {
    if (gameState.gameOver || gameState.win) {
        gameState.hoveredCell = null;
        return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const col = Math.floor(x / gameState.config.cellSize);
    const row = Math.floor(y / gameState.config.cellSize);

    if (
        !gameState.hoveredCell ||
        gameState.hoveredCell.r !== row ||
        gameState.hoveredCell.c !== col
    ) {
        if (
            row >= 0 && row < gameState.config.rows &&
            col >= 0 && col < gameState.config.cols
        ) {
            gameState.hoveredCell = { r: row, c: col };
        } else {
            gameState.hoveredCell = null;
        }

        renderer.render();
    }
});

canvas.addEventListener('mouseleave', () => {
    gameState.hoveredCell = null;
    renderer.render();
});

canvas.addEventListener('contextmenu', (e) => e.preventDefault());