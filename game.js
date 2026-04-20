/* ========================================
   PAC-MAN — Game Engine
   BFS Ghost AI | Canvas Renderer
   ======================================== */

// ── Constants ──
const TILE = 28;
const COLS = 21;
const ROWS = 21;

const CELL_PELLET = 0;
const CELL_WALL = 1;
const CELL_EMPTY = 2;
const CELL_POWER = 3;
const CELL_DOOR = 4;
const CELL_GHOST_HOUSE = 5;

const DIR = {
    NONE:  { x: 0, y: 0 },
    UP:    { x: 0, y:-1 },
    DOWN:  { x: 0, y: 1 },
    LEFT:  { x:-1, y: 0 },
    RIGHT: { x: 1, y: 0 }
};

// ── Maze Template (21×21) ──
const MAZE_TEMPLATE = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,1,0,1],
    [1,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,1],
    [1,0,1,1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,1],
    [1,1,1,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,1,1,1],
    [1,1,1,1,1,0,1,2,2,2,2,2,2,2,1,0,1,1,1,1,1],
    [1,1,1,1,1,0,1,2,1,1,4,1,1,2,1,0,1,1,1,1,1],
    [2,2,2,2,2,0,2,2,1,5,5,5,1,2,2,0,2,2,2,2,2],
    [1,1,1,1,1,0,1,2,1,1,1,1,1,2,1,0,1,1,1,1,1],
    [1,1,1,1,1,0,1,2,2,2,2,2,2,2,1,0,1,1,1,1,1],
    [1,1,1,1,1,0,1,2,1,1,1,1,1,2,1,0,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,1,0,1],
    [1,3,0,1,0,0,0,0,0,0,2,0,0,0,0,0,0,1,0,3,1],
    [1,1,0,1,0,1,1,0,1,1,1,1,1,0,1,1,0,1,0,1,1],
    [1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

// ══════════════════════════════════════════════════════════════
// ── BFS Pathfinding (Breadth-First Search) ──
// ══════════════════════════════════════════════════════════════
// HOW IT WORKS:
//   1. Start from the ghost's current position
//   2. Explore ALL neighbors at distance 1 first (using a QUEUE — FIFO)
//   3. Then explore all neighbors at distance 2, then 3, etc.
//   4. The FIRST time we reach the target, we've found the SHORTEST path
//
// WHY BFS FOR CHASE/SCATTER:
//   BFS guarantees the shortest path because it explores level-by-level.
//   Ghosts in Chase and Scatter modes need optimal routes to their targets.
//
// DATA STRUCTURE: Queue (First-In, First-Out)
// TIME COMPLEXITY:  O(V + E) where V = walkable tiles, E = connections
// SPACE COMPLEXITY: O(V) for the visited set and queue
// GUARANTEES: Always finds the shortest path (if one exists)
// ──────────────────────────────────────────────────────────────
function bfs(maze, sx, sy, tx, ty, isGhost) {
    if (sx === tx && sy === ty) return DIR.NONE;

    // QUEUE: nodes to explore, processed in FIFO order
    const queue = [{ x: sx, y: sy, firstDir: null }];
    const visited = new Set();
    visited.add(`${sx},${sy}`);
    const dirs = [DIR.UP, DIR.LEFT, DIR.DOWN, DIR.RIGHT];

    while (queue.length > 0) {
        // Dequeue from FRONT — this is what makes it BFS (level-by-level)
        const cur = queue.shift();

        // Try all 4 directions from current position
        for (const d of dirs) {
            let nx = cur.x + d.x;
            let ny = cur.y + d.y;

            // Handle tunnel wrapping (left edge ↔ right edge)
            if (nx < 0) nx = COLS - 1;
            if (nx >= COLS) nx = 0;

            const key = `${nx},${ny}`;
            if (visited.has(key)) continue;         // Skip already visited
            if (ny < 0 || ny >= ROWS) continue;     // Out of bounds

            // Check if tile is walkable
            const cell = maze[ny][nx];
            const walkable = isGhost
                ? (cell !== CELL_WALL)  // Ghosts can pass through doors & ghost house
                : (cell !== CELL_WALL && cell !== CELL_DOOR && cell !== CELL_GHOST_HOUSE);
            if (!walkable) continue;

            visited.add(key);

            // Remember the FIRST direction taken from start
            // This is the move the ghost should make right now
            const firstDir = cur.firstDir || d;

            // If we reached the target, return the first step of the shortest path
            if (nx === tx && ny === ty) return firstDir;

            // Enqueue at BACK — later positions are explored later (level order)
            queue.push({ x: nx, y: ny, firstDir });
        }
    }
    return DIR.NONE; // No path found
}


// ══════════════════════════════════════════════════════════════
// ── DFS Pathfinding (Depth-First Search) ──
// ══════════════════════════════════════════════════════════════
// HOW IT WORKS:
//   1. Start from the ghost's current position
//   2. Pick ONE direction and go as DEEP as possible (using a STACK — LIFO)
//   3. Only backtrack when hitting a dead end
//   4. Returns the first path found (NOT necessarily the shortest!)
//
// WHY DFS FOR FRIGHTENED MODE:
//   DFS does NOT guarantee the shortest path — it takes unpredictable,
//   winding routes. This makes frightened ghosts move erratically,
//   which is exactly the behavior we want when they're scared!
//
// DATA STRUCTURE: Stack (Last-In, First-Out)
// TIME COMPLEXITY:  O(V + E) where V = walkable tiles, E = connections
// SPACE COMPLEXITY: O(V) for the visited set and stack
// GUARANTEES: Finds A path (but NOT necessarily the shortest)
// ──────────────────────────────────────────────────────────────
function dfs(maze, sx, sy, tx, ty, isGhost) {
    if (sx === tx && sy === ty) return DIR.NONE;

    // STACK: nodes to explore, processed in LIFO order
    const stack = [{ x: sx, y: sy, firstDir: null }];
    const visited = new Set();
    visited.add(`${sx},${sy}`);
    const dirs = [DIR.UP, DIR.LEFT, DIR.DOWN, DIR.RIGHT];

    while (stack.length > 0) {
        // Pop from TOP — this is what makes it DFS (depth-first, not level-by-level)
        const cur = stack.pop();

        // Try all 4 directions from current position
        for (const d of dirs) {
            let nx = cur.x + d.x;
            let ny = cur.y + d.y;

            // Handle tunnel wrapping
            if (nx < 0) nx = COLS - 1;
            if (nx >= COLS) nx = 0;

            const key = `${nx},${ny}`;
            if (visited.has(key)) continue;         // Skip already visited
            if (ny < 0 || ny >= ROWS) continue;     // Out of bounds

            // Check if tile is walkable
            const cell = maze[ny][nx];
            const walkable = isGhost
                ? (cell !== CELL_WALL)
                : (cell !== CELL_WALL && cell !== CELL_DOOR && cell !== CELL_GHOST_HOUSE);
            if (!walkable) continue;

            visited.add(key);

            // Remember the FIRST direction taken from start
            const firstDir = cur.firstDir || d;

            // If we reached the target, return the first step (may not be shortest!)
            if (nx === tx && ny === ty) return firstDir;

            // Push onto TOP of stack — this neighbor will be explored NEXT
            // (goes deeper before exploring siblings — opposite of BFS)
            stack.push({ x: nx, y: ny, firstDir });
        }
    }
    return DIR.NONE; // No path found
}


// ══════════════════════════════════════════════════════════════
// BFS vs DFS — KEY DIFFERENCES SUMMARY
// ══════════════════════════════════════════════════════════════
//  ┌──────────────┬───────────────────┬───────────────────────┐
//  │   Property   │       BFS         │         DFS           │
//  ├──────────────┼───────────────────┼───────────────────────┤
//  │ Data Struct  │ Queue (FIFO)      │ Stack (LIFO)          │
//  │ Explores     │ Level by level    │ As deep as possible   │
//  │ Shortest?    │ ✅ YES guaranteed │ ❌ NO, any path       │
//  │ Used for     │ Chase & Scatter   │ Frightened mode       │
//  │ Ghost feel   │ Smart, optimal    │ Erratic, unpredictable│
//  └──────────────┴───────────────────┴───────────────────────┘
// ══════════════════════════════════════════════════════════════

// ── Pac-Man ──
class PacMan {
    constructor() { this.reset(); }
    reset() {
        this.gx = 10; this.gy = 15;
        this.px = this.gx * TILE; this.py = this.gy * TILE;
        this.dir = DIR.NONE; this.nextDir = DIR.NONE;
        this.speed = 2; this.mouthAngle = 0; this.mouthDir = 1;
        this.angle = 0; this.alive = true;
    }
    get aligned() { return this.px % TILE === 0 && this.py % TILE === 0; }

    update(maze) {
        if (!this.alive) return;
        // mouth animation
        this.mouthAngle += 0.12 * this.mouthDir;
        if (this.mouthAngle > 0.9) this.mouthDir = -1;
        if (this.mouthAngle < 0.05) this.mouthDir = 1;

        if (this.aligned) {
            this.gx = this.px / TILE; this.gy = this.py / TILE;
            if (this.canMove(maze, this.nextDir)) this.dir = this.nextDir;
            else if (!this.canMove(maze, this.dir)) { this.dir = DIR.NONE; return; }
        }
        if (this.dir === DIR.NONE) return;
        this.px += this.dir.x * this.speed;
        this.py += this.dir.y * this.speed;
        // tunnel wrap
        if (this.px < -TILE) this.px = COLS * TILE;
        if (this.px > COLS * TILE) this.px = -TILE;
        // update angle for rendering
        if (this.dir === DIR.RIGHT) this.angle = 0;
        else if (this.dir === DIR.DOWN) this.angle = Math.PI / 2;
        else if (this.dir === DIR.LEFT) this.angle = Math.PI;
        else if (this.dir === DIR.UP) this.angle = -Math.PI / 2;
    }

    canMove(maze, dir) {
        if (!dir || (dir.x === 0 && dir.y === 0)) return false;
        let nx = this.gx + dir.x, ny = this.gy + dir.y;
        if (nx < 0) nx = COLS - 1; if (nx >= COLS) nx = 0;
        if (ny < 0 || ny >= ROWS) return false;
        const c = maze[ny][nx];
        return c !== CELL_WALL && c !== CELL_DOOR && c !== CELL_GHOST_HOUSE;
    }

    draw(ctx) {
        if (!this.alive) return;
        const cx = this.px + TILE / 2, cy = this.py + TILE / 2, r = TILE / 2 - 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this.angle);
        ctx.beginPath();
        ctx.arc(0, 0, r, this.mouthAngle, 2 * Math.PI - this.mouthAngle);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fillStyle = '#ffe135';
        ctx.shadowColor = 'rgba(255,225,53,0.6)';
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.restore();
    }
}

// ── Ghost ──
class Ghost {
    constructor(name, gx, gy, color, scatterTarget) {
        this.name = name; this.homeX = gx; this.homeY = gy;
        this.color = color; this.scatterTarget = scatterTarget;
        this.reset();
    }
    reset() {
        this.gx = this.homeX; this.gy = this.homeY;
        this.px = this.gx * TILE; this.py = this.gy * TILE;
        this.dir = DIR.UP; this.speed = 2;
        this.mode = 'scatter'; this.prevMode = 'scatter';
        this.frightenedTimer = 0; this.inHouse = this.gy === 9;
        this.exitTimer = 0; this.eaten = false;
    }
    get aligned() { return this.px % TILE === 0 && this.py % TILE === 0; }

    getTarget(pacman, blinky) {
        if (this.eaten) return { x: 10, y: 7 };
        if (this.mode === 'frightened') return null;
        if (this.mode === 'scatter') return this.scatterTarget;
        // chase targets
        switch (this.name) {
            case 'blinky': return { x: pacman.gx, y: pacman.gy };
            case 'pinky': return { x: pacman.gx + pacman.dir.x * 4, y: pacman.gy + pacman.dir.y * 4 };
            case 'inky': {
                const ax = pacman.gx + pacman.dir.x * 2, ay = pacman.gy + pacman.dir.y * 2;
                return { x: ax + (ax - blinky.gx), y: ay + (ay - blinky.gy) };
            }
            case 'clyde': {
                const dist = Math.abs(pacman.gx - this.gx) + Math.abs(pacman.gy - this.gy);
                return dist > 8 ? { x: pacman.gx, y: pacman.gy } : this.scatterTarget;
            }
        }
    }

    update(maze, pacman, blinky, dt) {
        if (this.inHouse) {
            this.exitTimer += dt;
            const delays = { blinky: 0, pinky: 3, inky: 6, clyde: 9 };
            if (this.exitTimer >= (delays[this.name] || 0)) {
                // move to door and exit
                const doorDir = bfs(maze, this.gx, this.gy, 10, 7, true);
                if (doorDir && !(doorDir.x === 0 && doorDir.y === 0)) {
                    this.dir = doorDir;
                } else { this.inHouse = false; }
            } else return;
        }
        if (this.eaten) {
            this.speed = 4;
            if (this.aligned) {
                this.gx = this.px / TILE; this.gy = this.py / TILE;
                if (this.gx === 10 && this.gy === 7) {
                    this.eaten = false; this.speed = 2;
                    this.mode = this.prevMode; return;
                }
                this.dir = bfs(maze, this.gx, this.gy, 10, 7, true);
            }
            this.px += this.dir.x * this.speed;
            this.py += this.dir.y * this.speed;
            return;
        }

        if (this.aligned) {
            this.gx = this.px / TILE; this.gy = this.py / TILE;
            if (this.inHouse && this.gx === 10 && this.gy === 7) { this.inHouse = false; }
            const target = this.getTarget(pacman, blinky);
            if (this.mode === 'frightened') {
                // random valid direction, prefer not reversing
                const dirs = [DIR.UP, DIR.LEFT, DIR.DOWN, DIR.RIGHT]
                    .filter(d => this.canMove(maze, d));
                const nonReverse = dirs.filter(d =>
                    !(d.x === -this.dir.x && d.y === -this.dir.y));
                const choices = nonReverse.length > 0 ? nonReverse : dirs;
                this.dir = choices[Math.floor(Math.random() * choices.length)] || DIR.NONE;
            } else if (target) {
                const best = bfs(maze, this.gx, this.gy, 
                    Math.max(0, Math.min(COLS-1, target.x)),
                    Math.max(0, Math.min(ROWS-1, target.y)), true);
                if (best && !(best.x === 0 && best.y === 0)) this.dir = best;
            }
        }
        this.px += this.dir.x * this.speed;
        this.py += this.dir.y * this.speed;
        if (this.px < -TILE) this.px = COLS * TILE;
        if (this.px > COLS * TILE) this.px = -TILE;
    }

    canMove(maze, dir) {
        let nx = this.gx + dir.x, ny = this.gy + dir.y;
        if (nx < 0) nx = COLS - 1; if (nx >= COLS) nx = 0;
        if (ny < 0 || ny >= ROWS) return false;
        return maze[ny][nx] !== CELL_WALL;
    }

    draw(ctx, tick) {
        const cx = this.px + TILE / 2, cy = this.py + TILE / 2, r = TILE / 2 - 2;
        ctx.save();
        if (this.eaten) {
            // draw only eyes
            this.drawEyes(ctx, cx, cy, r); ctx.restore(); return;
        }
        const isFright = this.mode === 'frightened';
        const flashing = isFright && this.frightenedTimer < 2;
        const bodyColor = isFright
            ? (flashing && Math.floor(tick / 8) % 2 ? '#ffffff' : '#2020cc')
            : this.color;

        // body
        ctx.beginPath();
        ctx.arc(cx, cy - 2, r, Math.PI, 0);
        // wavy bottom
        const wave = Math.sin(tick * 0.3) * 2;
        const bottom = cy + r - 2;
        ctx.lineTo(cx + r, bottom);
        for (let i = 3; i >= -3; i--) {
            const wx = cx + (i / 3) * r;
            const wy = bottom + (i % 2 === 0 ? wave : -wave);
            ctx.lineTo(wx, wy);
        }
        ctx.lineTo(cx - r, cy - 2);
        ctx.closePath();
        ctx.fillStyle = bodyColor;
        ctx.shadowColor = bodyColor;
        ctx.shadowBlur = isFright ? 6 : 10;
        ctx.fill();

        if (isFright) {
            // frightened face
            ctx.fillStyle = '#fff';
            ctx.fillRect(cx - 5, cy - 5, 3, 3);
            ctx.fillRect(cx + 3, cy - 5, 3, 3);
            // wavy mouth
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
            ctx.beginPath();
            for (let i = -5; i <= 5; i++) {
                const mx = cx + i, my = cy + 3 + (i % 2 === 0 ? -1 : 1);
                i === -5 ? ctx.moveTo(mx, my) : ctx.lineTo(mx, my);
            }
            ctx.stroke();
        } else {
            this.drawEyes(ctx, cx, cy, r);
        }
        ctx.restore();
    }

    drawEyes(ctx, cx, cy, r) {
        // white sclera
        const eyeOffX = r * 0.3, eyeR = r * 0.28, pupilR = r * 0.14;
        for (const side of [-1, 1]) {
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.ellipse(cx + side * eyeOffX, cy - 3, eyeR, eyeR * 1.2, 0, 0, Math.PI * 2);
            ctx.fill();
            // pupil follows direction
            const px = this.dir.x * pupilR * 0.5, py = this.dir.y * pupilR * 0.5;
            ctx.fillStyle = '#2020aa';
            ctx.beginPath();
            ctx.arc(cx + side * eyeOffX + px, cy - 3 + py, pupilR, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// ── Main Game ──
class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = COLS * TILE;
        this.canvas.height = ROWS * TILE;
        this.overlay = document.getElementById('overlay');
        this.overlayTitle = document.getElementById('overlay-title');
        this.overlayMsg = document.getElementById('overlay-message');
        this.scoreEl = document.getElementById('score-value');
        this.livesEl = document.getElementById('lives-value');
        this.levelEl = document.getElementById('level-value');

        this.pacman = new PacMan();
        this.ghosts = [
            new Ghost('blinky', 10, 7, '#ff0000', { x: COLS - 2, y: 1 }),
            new Ghost('pinky',  9,  9, '#ffb8ff', { x: 1, y: 1 }),
            new Ghost('inky',  10,  9, '#00ffff', { x: COLS - 2, y: ROWS - 2 }),
            new Ghost('clyde', 11,  9, '#ffb852', { x: 1, y: ROWS - 2 })
        ];
        this.score = 0; this.lives = 3; this.level = 1;
        this.state = 'ready'; // ready | playing | paused | won | lost
        this.maze = []; this.totalPellets = 0; this.pelletsEaten = 0;
        this.tick = 0; this.modeTimer = 0; this.ghostMode = 'scatter';
        this.frightenedTimer = 0; this.ghostsEatenCombo = 0;
        this.lastTime = 0;
        this.resetMaze();
        this.showOverlay('READY!', 'Press ENTER to Start');
        this.setupInput();
        requestAnimationFrame(t => this.loop(t));
    }

    resetMaze() {
        this.maze = MAZE_TEMPLATE.map(r => [...r]);
        this.totalPellets = 0;
        this.pelletsEaten = 0;
        for (let y = 0; y < ROWS; y++)
            for (let x = 0; x < COLS; x++)
                if (this.maze[y][x] === CELL_PELLET || this.maze[y][x] === CELL_POWER)
                    this.totalPellets++;
    }

    resetPositions() {
        this.pacman.reset();
        this.ghosts.forEach(g => g.reset());
        this.modeTimer = 0; this.ghostMode = 'scatter';
        this.frightenedTimer = 0; this.ghostsEatenCombo = 0;
    }

    startGame() {
        this.score = 0; this.lives = 3; this.level = 1;
        this.resetMaze(); this.resetPositions();
        this.state = 'playing'; this.hideOverlay(); this.updateHUD();
    }

    nextLevel() {
        this.level++;
        this.resetMaze(); this.resetPositions();
        this.state = 'playing'; this.hideOverlay(); this.updateHUD();
    }

    showOverlay(title, msg) {
        this.overlayTitle.textContent = title;
        this.overlayMsg.textContent = msg;
        this.overlay.classList.remove('hidden');
    }
    hideOverlay() { this.overlay.classList.add('hidden'); }

    updateHUD() {
        this.scoreEl.textContent = this.score;
        this.livesEl.textContent = '♥'.repeat(this.lives);
        this.levelEl.textContent = this.level;
    }

    setupInput() {
        document.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                if (this.state === 'ready' || this.state === 'won' || this.state === 'lost') this.startGame();
                return;
            }
            if (e.key === 'p' || e.key === 'P') {
                if (this.state === 'playing') { this.state = 'paused'; this.showOverlay('PAUSED', 'Press P to Resume'); }
                else if (this.state === 'paused') { this.state = 'playing'; this.hideOverlay(); }
                return;
            }
            if (this.state !== 'playing') return;
            switch (e.key) {
                case 'ArrowUp':    e.preventDefault(); this.pacman.nextDir = DIR.UP; break;
                case 'ArrowDown':  e.preventDefault(); this.pacman.nextDir = DIR.DOWN; break;
                case 'ArrowLeft':  e.preventDefault(); this.pacman.nextDir = DIR.LEFT; break;
                case 'ArrowRight': e.preventDefault(); this.pacman.nextDir = DIR.RIGHT; break;
            }
        });
    }

    // ── Game Loop ──
    loop(timestamp) {
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
        this.lastTime = timestamp;
        if (this.state === 'playing') { this.update(dt); }
        this.render();
        requestAnimationFrame(t => this.loop(t));
    }

    update(dt) {
        this.tick++;
        // mode timer
        this.modeTimer += dt;
        if (this.frightenedTimer > 0) {
            this.frightenedTimer -= dt;
            if (this.frightenedTimer <= 0) {
                this.ghosts.forEach(g => { if (g.mode === 'frightened') g.mode = g.prevMode; });
                this.ghostsEatenCombo = 0;
            }
        } else {
            // scatter/chase cycle: 7s scatter, 20s chase, repeat
            const cycle = this.modeTimer % 27;
            const newMode = cycle < 7 ? 'scatter' : 'chase';
            if (newMode !== this.ghostMode) {
                this.ghostMode = newMode;
                this.ghosts.forEach(g => {
                    if (g.mode !== 'frightened' && !g.eaten) g.mode = newMode;
                });
            }
        }

        this.pacman.update(this.maze);
        const blinky = this.ghosts[0];
        this.ghosts.forEach(g => g.update(this.maze, this.pacman, blinky, dt));

        // pellet eating
        if (this.pacman.aligned) {
            const gx = this.pacman.gx, gy = this.pacman.gy;
            if (gy >= 0 && gy < ROWS && gx >= 0 && gx < COLS) {
                const cell = this.maze[gy][gx];
                if (cell === CELL_PELLET) {
                    this.maze[gy][gx] = CELL_EMPTY;
                    this.score += 10; this.pelletsEaten++; this.updateHUD();
                } else if (cell === CELL_POWER) {
                    this.maze[gy][gx] = CELL_EMPTY;
                    this.score += 50; this.pelletsEaten++; this.updateHUD();
                    this.frightenedTimer = 8; this.ghostsEatenCombo = 0;
                    this.ghosts.forEach(g => {
                        if (!g.eaten && !g.inHouse) {
                            g.prevMode = g.mode; g.mode = 'frightened';
                            g.frightenedTimer = 8;
                        }
                    });
                }
            }
            // win check
            if (this.pelletsEaten >= this.totalPellets) {
                this.state = 'won';
                this.showOverlay('YOU WIN!', 'Press ENTER for Next Level');
                return;
            }
        }

        // ghost collision
        for (const g of this.ghosts) {
            if (g.inHouse || g.eaten) continue;
            const dx = Math.abs(this.pacman.px - g.px);
            const dy = Math.abs(this.pacman.py - g.py);
            if (dx < TILE * 0.7 && dy < TILE * 0.7) {
                if (g.mode === 'frightened') {
                    g.eaten = true; g.mode = 'scatter';
                    this.ghostsEatenCombo++;
                    this.score += 200 * Math.pow(2, this.ghostsEatenCombo - 1);
                    this.updateHUD();
                } else {
                    this.lives--;
                    this.updateHUD();
                    if (this.lives <= 0) {
                        this.state = 'lost';
                        this.showOverlay('GAME OVER', `Score: ${this.score} — Press ENTER to Retry`);
                    } else {
                        this.resetPositions();
                    }
                    return;
                }
            }
        }
    }

    // ── Rendering ──
    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawMaze(ctx);
        this.ghosts.forEach(g => g.draw(ctx, this.tick));
        this.pacman.draw(ctx);
    }

    drawMaze(ctx) {
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                const cell = this.maze[y][x];
                const px = x * TILE, py = y * TILE;
                if (cell === CELL_WALL) {
                    // check neighbors for connected wall drawing
                    ctx.fillStyle = '#1a1a5c';
                    ctx.shadowColor = 'rgba(60,60,200,0.3)';
                    ctx.shadowBlur = 4;
                    ctx.fillRect(px + 1, py + 1, TILE - 2, TILE - 2);
                    ctx.strokeStyle = '#3333aa';
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(px + 1, py + 1, TILE - 2, TILE - 2);
                    ctx.shadowBlur = 0;
                } else if (cell === CELL_DOOR) {
                    ctx.fillStyle = '#ff88cc';
                    ctx.fillRect(px + 4, py + TILE / 2 - 2, TILE - 8, 4);
                } else if (cell === CELL_PELLET) {
                    ctx.fillStyle = '#ffeecc';
                    ctx.shadowColor = 'rgba(255,238,200,0.5)';
                    ctx.shadowBlur = 4;
                    ctx.beginPath();
                    ctx.arc(px + TILE / 2, py + TILE / 2, 3, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                } else if (cell === CELL_POWER) {
                    const pulse = 4 + Math.sin(this.tick * 0.1) * 2;
                    ctx.fillStyle = '#ffeecc';
                    ctx.shadowColor = 'rgba(255,238,200,0.8)';
                    ctx.shadowBlur = 12;
                    ctx.beginPath();
                    ctx.arc(px + TILE / 2, py + TILE / 2, pulse, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }
            }
        }
    }
}

// ── Init ──
window.addEventListener('DOMContentLoaded', () => new Game());
