import pygame
import math
import random
from collections import deque

# Constants
TILE = 28
COLS = 21
ROWS = 21

CELL_PELLET = 0
CELL_WALL = 1
CELL_EMPTY = 2
CELL_POWER = 3
CELL_DOOR = 4
CELL_GHOST_HOUSE = 5

DIR_NONE = (0, 0)
DIR_UP = (0, -1)
DIR_DOWN = (0, 1)
DIR_LEFT = (-1, 0)
DIR_RIGHT = (1, 0)

MAZE_TEMPLATE = [
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
]

pygame.init()
WIDTH = COLS * TILE
HEIGHT = ROWS * TILE
EXTRA_HEIGHT = 60
screen = pygame.display.set_mode((WIDTH, HEIGHT + EXTRA_HEIGHT))
pygame.display.set_caption("Pac-Man in Python")

font = pygame.font.SysFont(None, 36)

def bfs(maze, sx, sy, tx, ty, is_ghost):
    if sx == tx and sy == ty:
        return DIR_NONE

    queue = deque([{"x": sx, "y": sy, "firstDir": None}])
    visited = set([f"{sx},{sy}"])
    dirs = [DIR_UP, DIR_LEFT, DIR_DOWN, DIR_RIGHT]

    while queue:
        cur = queue.popleft()

        for d in dirs:
            nx = cur["x"] + d[0]
            ny = cur["y"] + d[1]

            if nx < 0: nx = COLS - 1
            if nx >= COLS: nx = 0

            key = f"{nx},{ny}"
            if key in visited: continue
            if ny < 0 or ny >= ROWS: continue

            cell = maze[ny][nx]
            if is_ghost:
                walkable = cell != CELL_WALL
            else:
                walkable = (cell != CELL_WALL and cell != CELL_DOOR and cell != CELL_GHOST_HOUSE)
            
            if not walkable: continue

            visited.add(key)
            firstDir = cur["firstDir"] if cur["firstDir"] else d
            
            if nx == tx and ny == ty:
                return firstDir
            
            queue.append({"x": nx, "y": ny, "firstDir": firstDir})
            
    return DIR_NONE


class PacMan:
    def __init__(self):
        self.reset()
        
    def reset(self):
        self.gx = 10
        self.gy = 15
        self.px = self.gx * TILE
        self.py = self.gy * TILE
        self.dir = DIR_NONE
        self.nextDir = DIR_NONE
        self.speed = 2
        self.mouthAngle = 0
        self.mouthDir = 1
        self.angle = 0
        self.alive = True
        
    @property
    def aligned(self):
        return self.px % TILE == 0 and self.py % TILE == 0

    def update(self, maze):
        if not self.alive: return
        
        self.mouthAngle += 0.12 * self.mouthDir
        if self.mouthAngle > 0.9: self.mouthDir = -1
        if self.mouthAngle < 0.05: self.mouthDir = 1

        if self.aligned:
            self.gx = int(self.px / TILE)
            self.gy = int(self.py / TILE)
            if self.can_move(maze, self.nextDir):
                self.dir = self.nextDir
            elif not self.can_move(maze, self.dir):
                self.dir = DIR_NONE
                return
                
        if self.dir == DIR_NONE: return
        
        self.px += self.dir[0] * self.speed
        self.py += self.dir[1] * self.speed
        
        if self.px < -TILE: self.px = COLS * TILE
        if self.px > COLS * TILE: self.px = -TILE
        
        if self.dir == DIR_RIGHT: self.angle = 0
        elif self.dir == DIR_DOWN: self.angle = math.pi / 2
        elif self.dir == DIR_LEFT: self.angle = math.pi
        elif self.dir == DIR_UP: self.angle = -math.pi / 2

    def can_move(self, maze, dir_tup):
        if dir_tup == DIR_NONE: return False
        nx = self.gx + dir_tup[0]
        ny = self.gy + dir_tup[1]
        if nx < 0: nx = COLS - 1
        if nx >= COLS: nx = 0
        if ny < 0 or ny >= ROWS: return False
        c = maze[ny][nx]
        return c != CELL_WALL and c != CELL_DOOR and c != CELL_GHOST_HOUSE

    def draw(self, surface):
        if not self.alive: return
        cx = self.px + TILE // 2
        cy = self.py + TILE // 2
        r = TILE // 2 - 2

        start_angle = self.mouthAngle
        end_angle = 2 * math.pi - self.mouthAngle
        
        points = [(cx, cy)]
        steps = 20
        if end_angle > start_angle:
            angle_step = (end_angle - start_angle) / steps
            for i in range(steps + 1):
                theta = self.angle + start_angle + i * angle_step
                p_x = cx + r * math.cos(theta)
                p_y = cy + r * math.sin(theta)
                points.append((p_x, p_y))
            pygame.draw.polygon(surface, (255, 225, 53), points)


class Ghost:
    def __init__(self, name, gx, gy, color, scatterTarget):
        self.name = name
        self.homeX = gx
        self.homeY = gy
        self.color = color
        self.scatterTarget = scatterTarget
        self.reset()
        
    def reset(self):
        self.gx = self.homeX
        self.gy = self.homeY
        self.px = self.gx * TILE
        self.py = self.gy * TILE
        self.dir = DIR_UP
        self.speed = 2
        self.mode = 'scatter'
        self.prevMode = 'scatter'
        self.frightenedTimer = 0
        self.inHouse = self.gy == 9
        self.exitTimer = 0
        self.eaten = False
        
    @property
    def aligned(self):
        return self.px % TILE == 0 and self.py % TILE == 0

    def get_target(self, pacman, blinky):
        if self.eaten: return (10, 7)
        if self.mode == 'frightened': return None
        if self.mode == 'scatter': return self.scatterTarget
        
        if self.name == 'blinky':
            return (pacman.gx, pacman.gy)
        elif self.name == 'pinky':
            return (pacman.gx + pacman.dir[0]*4, pacman.gy + pacman.dir[1]*4)
        elif self.name == 'inky':
            ax = pacman.gx + pacman.dir[0]*2
            ay = pacman.gy + pacman.dir[1]*2
            return (ax + (ax - blinky.gx), ay + (ay - blinky.gy))
        elif self.name == 'clyde':
            dist = abs(pacman.gx - self.gx) + abs(pacman.gy - self.gy)
            if dist > 8:
                return (pacman.gx, pacman.gy)
            else:
                return self.scatterTarget
        return None

    def update(self, maze, pacman, blinky, dt):
        if self.inHouse:
            self.exitTimer += dt
            delays = {'blinky': 0, 'pinky': 3, 'inky': 6, 'clyde': 9}
            if self.exitTimer >= delays[self.name]:
                doorDir = bfs(maze, self.gx, self.gy, 10, 7, True)
                if doorDir and doorDir != DIR_NONE:
                    self.dir = doorDir
                else:
                    self.inHouse = False
            else:
                return
                
        if self.eaten:
            self.speed = 4
            if self.aligned:
                self.gx = int(self.px / TILE)
                self.gy = int(self.py / TILE)
                if self.gx == 10 and self.gy == 7:
                    self.eaten = False
                    self.speed = 2
                    self.mode = self.prevMode
                    return
                self.dir = bfs(maze, self.gx, self.gy, 10, 7, True)
            self.px += self.dir[0] * self.speed
            self.py += self.dir[1] * self.speed
            return

        if self.aligned:
            self.gx = int(self.px / TILE)
            self.gy = int(self.py / TILE)
            if self.inHouse and self.gx == 10 and self.gy == 7:
                self.inHouse = False
                
            target = self.get_target(pacman, blinky)
            if self.mode == 'frightened':
                dirs = [DIR_UP, DIR_LEFT, DIR_DOWN, DIR_RIGHT]
                valid = [d for d in dirs if self.can_move(maze, d)]
                non_reverse = [d for d in valid if d[0] != -self.dir[0] or d[1] != -self.dir[1]]
                choices = non_reverse if len(non_reverse) > 0 else valid
                if choices:
                    self.dir = random.choice(choices)
                else:
                    self.dir = DIR_NONE
            elif target:
                tx = max(0, min(COLS-1, target[0]))
                ty = max(0, min(ROWS-1, target[1]))
                best = bfs(maze, self.gx, self.gy, tx, ty, True)
                if best and best != DIR_NONE:
                    self.dir = best
                    
        self.px += self.dir[0] * self.speed
        self.py += self.dir[1] * self.speed
        if self.px < -TILE: self.px = COLS * TILE
        if self.px > COLS * TILE: self.px = -TILE

    def can_move(self, maze, dir_tup):
        nx = self.gx + dir_tup[0]
        ny = self.gy + dir_tup[1]
        if nx < 0: nx = COLS - 1
        if nx >= COLS: nx = 0
        if ny < 0 or ny >= ROWS: return False
        return maze[ny][nx] != CELL_WALL

    def draw(self, surface, tick):
        cx = int(self.px + TILE // 2)
        cy = int(self.py + TILE // 2)
        r = TILE // 2 - 2
        
        if self.eaten:
            self.draw_eyes(surface, cx, cy, r)
            return
            
        isFright = self.mode == 'frightened'
        flashing = isFright and self.frightenedTimer < 2
        
        if isFright:
            if flashing and (tick // 8) % 2 != 0:
                bodyColor = (255, 255, 255)
            else:
                bodyColor = (32, 32, 204)
        else:
            bodyColor = self.color

        points = []
        for i in range(180, -1, -10):
            theta = math.radians(i)
            px = cx + r * math.cos(theta)
            py = cy - 2 + r * math.sin(theta)
            points.append((px, py))
            
        wave = math.sin(tick * 0.3) * 2
        bottom = cy + r - 2
        points.append((cx + r, bottom))
        for i in range(2, -4, -2):
            wx = cx + (i / 3) * r
            wy = bottom + wave if (i % 2 == 0) else bottom - wave
            points.append((wx, wy))
        points.append((cx - r, cy - 2))
        
        pygame.draw.polygon(surface, bodyColor, points)
        
        if isFright:
            pygame.draw.rect(surface, (255,255,255), (cx - 5, cy - 5, 3, 3))
            pygame.draw.rect(surface, (255,255,255), (cx + 3, cy - 5, 3, 3))
            
            mouth_points = []
            for i in range(-5, 6):
                mx = cx + i
                my = cy + 3 + (-1 if i % 2 == 0 else 1)
                mouth_points.append((mx, my))
            if len(mouth_points) >= 2:
                pygame.draw.lines(surface, (255,255,255), False, mouth_points, 1)
        else:
            self.draw_eyes(surface, cx, cy, r)
            
    def draw_eyes(self, surface, cx, cy, r):
        eyeOffX = int(r * 0.3)
        eyeR_w = int(r * 0.28)
        eyeR_h = int(r * 0.33)
        pupilR = int(r * 0.14)
        
        for side in [-1, 1]:
            eye_rect = pygame.Rect(cx + side * eyeOffX - eyeR_w, cy - 3 - eyeR_h, eyeR_w*2, eyeR_h*2)
            pygame.draw.ellipse(surface, (255, 255, 255), eye_rect)
            
            px = self.dir[0] * pupilR * 0.5
            py = self.dir[1] * pupilR * 0.5
            pup_cx = int(cx + side * eyeOffX + px)
            pup_cy = int(cy - 3 + py)
            pygame.draw.circle(surface, (32, 32, 170), (pup_cx, pup_cy), pupilR)

class Game:
    def __init__(self):
        self.pacman = PacMan()
        self.ghosts = [
            Ghost('blinky', 10, 7, (255, 0, 0), (COLS - 2, 1)),
            Ghost('pinky',  9,  9, (255, 184, 255), (1, 1)),
            Ghost('inky',  10,  9, (0, 255, 255), (COLS - 2, ROWS - 2)),
            Ghost('clyde', 11,  9, (255, 184, 82), (1, ROWS - 2))
        ]
        self.score = 0
        self.lives = 3
        self.level = 1
        self.state = 'ready'
        self.tick = 0
        self.modeTimer = 0
        self.ghostMode = 'scatter'
        self.frightenedTimer = 0
        self.ghostsEatenCombo = 0
        self.reset_maze()
        
    def reset_maze(self):
        self.maze = [row[:] for row in MAZE_TEMPLATE]
        self.totalPellets = 0
        self.pelletsEaten = 0
        for y in range(ROWS):
            for x in range(COLS):
                if self.maze[y][x] == CELL_PELLET or self.maze[y][x] == CELL_POWER:
                    self.totalPellets += 1
                    
    def reset_positions(self):
        self.pacman.reset()
        for g in self.ghosts:
            g.reset()
        self.modeTimer = 0
        self.ghostMode = 'scatter'
        self.frightenedTimer = 0
        self.ghostsEatenCombo = 0
        
    def start_game(self):
        self.score = 0
        self.lives = 3
        self.level = 1
        self.reset_maze()
        self.reset_positions()
        self.state = 'playing'

    def update(self, dt):
        if self.state != 'playing': return
        self.tick += 1
        self.modeTimer += dt
        
        if self.frightenedTimer > 0:
            self.frightenedTimer -= dt
            if self.frightenedTimer <= 0:
                for g in self.ghosts:
                    if g.mode == 'frightened':
                        g.mode = g.prevMode
                self.ghostsEatenCombo = 0
        else:
            cycle = self.modeTimer % 27
            newMode = 'scatter' if cycle < 7 else 'chase'
            if newMode != self.ghostMode:
                self.ghostMode = newMode
                for g in self.ghosts:
                    if g.mode != 'frightened' and not g.eaten:
                        g.mode = newMode
                        
        self.pacman.update(self.maze)
        blinky = self.ghosts[0]
        for g in self.ghosts:
            g.update(self.maze, self.pacman, blinky, dt)
            
        if self.pacman.aligned:
            gx, gy = self.pacman.gx, self.pacman.gy
            if 0 <= gy < ROWS and 0 <= gx < COLS:
                cell = self.maze[gy][gx]
                if cell == CELL_PELLET:
                    self.maze[gy][gx] = CELL_EMPTY
                    self.score += 10
                    self.pelletsEaten += 1
                elif cell == CELL_POWER:
                    self.maze[gy][gx] = CELL_EMPTY
                    self.score += 50
                    self.pelletsEaten += 1
                    self.frightenedTimer = 8
                    self.ghostsEatenCombo = 0
                    for g in self.ghosts:
                        if not g.eaten and not g.inHouse:
                            g.prevMode = g.mode
                            g.mode = 'frightened'
                            g.frightenedTimer = 8

            if self.pelletsEaten >= self.totalPellets:
                self.state = 'won'
                return
                
        for g in self.ghosts:
            if g.inHouse or g.eaten: continue
            dx = abs(self.pacman.px - g.px)
            dy = abs(self.pacman.py - g.py)
            if dx < TILE * 0.7 and dy < TILE * 0.7:
                if g.mode == 'frightened':
                    g.eaten = True
                    g.mode = 'scatter'
                    self.ghostsEatenCombo += 1
                    self.score += int(200 * (2 ** (self.ghostsEatenCombo - 1)))
                else:
                    self.lives -= 1
                    if self.lives <= 0:
                        self.state = 'lost'
                    else:
                        self.reset_positions()
                    return

    def render(self, surface):
        surface.fill((0, 0, 0))
        for y in range(ROWS):
            for x in range(COLS):
                cell = self.maze[y][x]
                px = x * TILE
                py = y * TILE
                if cell == CELL_WALL:
                    pygame.draw.rect(surface, (26, 26, 92), (px + 1, py + 1, TILE - 2, TILE - 2))
                    pygame.draw.rect(surface, (51, 51, 170), (px + 1, py + 1, TILE - 2, TILE - 2), 1)
                elif cell == CELL_DOOR:
                    pygame.draw.rect(surface, (255, 136, 204), (px + 4, py + TILE // 2 - 2, TILE - 8, 4))
                elif cell == CELL_PELLET:
                    pygame.draw.circle(surface, (255, 238, 204), (px + TILE // 2, py + TILE // 2), 3)
                elif cell == CELL_POWER:
                    pulse = 4 + math.sin(self.tick * 0.1) * 2
                    pygame.draw.circle(surface, (255, 238, 204), (px + TILE // 2, py + TILE // 2), int(pulse))

        for g in self.ghosts:
            g.draw(surface, self.tick)
        self.pacman.draw(surface)
        
        hud_surface = pygame.Surface((WIDTH, EXTRA_HEIGHT))
        hud_surface.fill((20, 20, 20))
        score_text = font.render(f"Score: {self.score}", True, (255, 255, 255))
        lives_text = font.render(f"Lives: {'♥' * self.lives}", True, (255, 50, 50))
        level_text = font.render(f"Level: {self.level}", True, (255, 255, 255))
        
        hud_surface.blit(score_text, (10, 20))
        hud_surface.blit(lives_text, (WIDTH // 2 - lives_text.get_width() // 2, 20))
        hud_surface.blit(level_text, (WIDTH - level_text.get_width() - 10, 20))
        
        surface.blit(hud_surface, (0, HEIGHT))
        
        if self.state != 'playing':
            overlay = pygame.Surface((WIDTH, HEIGHT + EXTRA_HEIGHT), pygame.SRCALPHA)
            overlay.fill((0, 0, 0, 180))
            if self.state == 'ready':
                title = "READY!"
                msg = "Press ENTER to Start"
            elif self.state == 'paused':
                title = "PAUSED"
                msg = "Press P to Resume"
            elif self.state == 'won':
                title = "YOU WIN!"
                msg = "Press ENTER to Restart"
            else:
                title = "GAME OVER"
                msg = f"Score: {self.score} - Press ENTER"
                
            title_text = font.render(title, True, (255, 255, 0))
            msg_text = font.render(msg, True, (255, 255, 255))
            overlay.blit(title_text, (WIDTH // 2 - title_text.get_width() // 2, HEIGHT // 2 - 30))
            overlay.blit(msg_text, (WIDTH // 2 - msg_text.get_width() // 2, HEIGHT // 2 + 10))
            surface.blit(overlay, (0, 0))


def main():
    clock = pygame.time.Clock()
    game = Game()
    running = True
    
    while running:
        dt = clock.tick(60) / 1000.0
        dt = min(dt, 0.05)
        
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_RETURN:
                    if game.state in ['ready', 'won', 'lost']:
                        game.start_game()
                elif event.key == pygame.K_p:
                    if game.state == 'playing':
                        game.state = 'paused'
                    elif game.state == 'paused':
                        game.state = 'playing'
                
                if game.state == 'playing':
                    if event.key == pygame.K_UP:
                        game.pacman.nextDir = DIR_UP
                    elif event.key == pygame.K_DOWN:
                        game.pacman.nextDir = DIR_DOWN
                    elif event.key == pygame.K_LEFT:
                        game.pacman.nextDir = DIR_LEFT
                    elif event.key == pygame.K_RIGHT:
                        game.pacman.nextDir = DIR_RIGHT

        game.update(dt)
        game.render(screen)
        pygame.display.flip()
        
    pygame.quit()

if __name__ == "__main__":
    main()
