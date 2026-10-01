// Adventure Pong - Complete Game
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const playerScoreEl = document.getElementById('playerScore');
  const computerScoreEl = document.getElementById('computerScore');
  const restartBtn = document.getElementById('restart');

  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;

  // ============ GAME STATE & PROGRESSION ============
  const gameState = {
    currentMenu: 'main', // 'main', 'story', 'levelSelect', 'playing', 'levelComplete', 'gameOver', 'bossDefeated', 'gameWon', 'paused'
    currentLevel: 0,
    currentBossIndex: 0,
    lives: 3,
    totalScore: 0,
    unlockedLevels: [0], // Start with level 0 unlocked
    soundEnabled: true,
    difficulty: 'normal', // 'easy', 'normal', 'hard'
  };

  // ============ LEVELS & BOSS DATA ============
  const levels = [
    {
      id: 0,
      name: 'Practice Arena',
      story: 'You enter the training grounds. A gentle opponent awaits to teach you the basics.',
      isBoss: false,
      paddleSpeed: 6,
      aiSpeed: 3,
      ballSpeed: 5,
      scoreToWin: 5,
      powerUpChance: 0.02,
    },
    {
      id: 1,
      name: 'Forest Temple',
      story: 'Deep in the ancient forest, a mysterious guardian challenges you.',
      isBoss: false,
      paddleSpeed: 6,
      aiSpeed: 4,
      ballSpeed: 5.5,
      scoreToWin: 7,
      powerUpChance: 0.03,
    },
    {
      id: 2,
      name: 'Crystal Cavern',
      story: 'The cavern sparkles with energy. A crystalline foe emerges from the depths.',
      isBoss: false,
      paddleSpeed: 6,
      aiSpeed: 4.5,
      ballSpeed: 6,
      scoreToWin: 8,
      powerUpChance: 0.04,
    },
  ];

  const bosses = [
    {
      id: 0,
      name: 'Stone Guardian',
      story: 'A towering sentinel of the old world. Its paddle moves with relentless precision.',
      paddleSpeed: 7,
      aiSpeed: 5.5,
      ballSpeed: 6.5,
      scoreToWin: 10,
      color: '#8b7355',
      healthBar: true,
    },
    {
      id: 1,
      name: 'Inferno Drake',
      story: 'A fearsome dragon wreathed in flames. Every hit burns with intensity.',
      paddleSpeed: 8,
      aiSpeed: 6,
      ballSpeed: 7,
      scoreToWin: 12,
      color: '#ff4500',
      healthBar: true,
    },
    {
      id: 2,
      name: 'The Void Champion',
      story: 'The ultimate opponent. A being of pure competition. Defeat it to claim victory.',
      paddleSpeed: 9,
      aiSpeed: 6.5,
      ballSpeed: 7.5,
      scoreToWin: 15,
      color: '#4b0082',
      healthBar: true,
    },
  ];

  // ============ POWER-UPS ============
  const powerUpTypes = {
    SPEED_BOOST: { icon: '⚡', color: '#FFD700', effect: 'Ball slows down for 3 seconds', duration: 3000 },
    WIDE_PADDLE: { icon: '📏', color: '#87CEEB', effect: 'Your paddle grows 1.5x for 5 seconds', duration: 5000 },
    SLOW_BALL: { icon: '🐢', color: '#90EE90', effect: 'Ball slows for 4 seconds', duration: 4000 },
    SHIELD: { icon: '🛡️', color: '#DC143C', effect: 'Blocks next miss once', duration: Infinity },
    BALL_SPLIT: { icon: '⚪', color: '#FF69B4', effect: 'Next hit splits into 2 balls!', duration: 1 }, // one use
  };

  // ============ GAME OBJECTS ============
  const paddleWidth = 12;
  const paddleHeight = 110;
  const paddleOffset = 18;

  const player = {
    x: paddleOffset,
    y: (HEIGHT - paddleHeight) / 2,
    width: paddleWidth,
    height: paddleHeight,
    dy: 0,
    score: 0,
    activePowerUps: [],
    shield: false,
  };

  const computer = {
    x: WIDTH - paddleOffset - paddleWidth,
    y: (HEIGHT - paddleHeight) / 2,
    width: paddleWidth,
    height: paddleHeight,
    score: 0,
    color: '#9fb4c8',
  };

  const ball = {
    x: WIDTH / 2,
    y: HEIGHT / 2,
    r: 8,
    speed: 5,
    vx: 0,
    vy: 0,
    trail: [],
    isMultiBall: false,
  };

  const balls = [ball]; // Support for multi-ball power-up
  const powerUps = []; // Array of active power-ups on screen

  // ============ INPUT STATE ============
  const keys = { ArrowUp: false, ArrowDown: false };
  let useMouse = false;

  // ============ SOUND SYSTEM ============
  const soundSystem = {
    enabled: true,
    playSound: (type) => {
      if (!soundSystem.enabled) return;
      // Simple beep using Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      const freq = {
        hit: 600,
        score: 1000,
        powerUp: 800,
        levelUp: 1200,
        death: 300,
        click: 400,
      }[type] || 600;

      const duration = { hit: 0.05, score: 0.1, powerUp: 0.15, levelUp: 0.2, death: 0.3, click: 0.05 }[type] || 0.1;

      oscillator.frequency.value = freq;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    },
  };

  // ============ HELPER FUNCTIONS ============
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function resetBall(direction = null) {
    ball.x = WIDTH / 2;
    ball.y = HEIGHT / 2;
    const level = getCurrentLevelData();
    ball.speed = level.ballSpeed;

    const angle = Math.random() * 0.7 - 0.35;
    const dir = direction === 'left' ? -1 : direction === 'right' ? 1 : (Math.random() < 0.5 ? -1 : 1);
    ball.vx = dir * ball.speed * Math.cos(angle);
    ball.vy = ball.speed * Math.sin(angle);
    ball.trail = [];
  }

  function resetBalls() {
    balls.length = 0;
    balls.push(ball);
    resetBall();
  }

  function getCurrentLevelData() {
    if (isCurrentLevelBoss()) {
      return bosses[gameState.currentBossIndex];
    }
    return levels[gameState.currentLevel];
  }

  function isCurrentLevelBoss() {
    return gameState.currentLevel >= levels.length;
  }

  function spawnPowerUp(x, y) {
    const types = Object.keys(powerUpTypes);
    const randomType = types[Math.floor(Math.random() * types.length)];
    powerUps.push({
      x,
      y,
      type: randomType,
      radius: 12,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
    });
  }

  function activatePowerUp(type) {
    soundSystem.playSound('powerUp');

    if (type === 'SPEED_BOOST') {
      // Actually slows ball
      const originalSpeed = ball.speed;
      ball.speed *= 0.5;
      const timeout = setTimeout(() => {
        ball.speed = originalSpeed;
      }, powerUpTypes[type].duration);
    } else if (type === 'WIDE_PADDLE') {
      const originalHeight = player.height;
      player.height *= 1.5;
      const timeout = setTimeout(() => {
        player.height = originalHeight;
      }, powerUpTypes[type].duration);
    } else if (type === 'SLOW_BALL') {
      const originalSpeed = ball.speed;
      ball.speed *= 0.4;
      const timeout = setTimeout(() => {
        ball.speed = originalSpeed;
      }, powerUpTypes[type].duration);
    } else if (type === 'SHIELD') {
      player.shield = true;
    } else if (type === 'BALL_SPLIT') {
      // On next hit with player paddle, split ball
      ball.isMultiBall = true;
    }

    player.activePowerUps.push(type);
  }

  // ============ RENDERING ============
  function drawRect(x, y, w, h, color = '#fff') {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }

  function drawCircle(x, y, r, color = '#fff') {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawNet() {
    const segment = 14;
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for (let y = 10; y < HEIGHT; y += segment * 2) {
      ctx.fillRect(WIDTH / 2 - 1, y, 2, segment);
    }
  }

  function drawText(text, x, y, size = 16, color = '#fff', align = 'center') {
    ctx.font = `${size}px system-ui, Arial`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(text, x, y);
  }

  function drawMenu() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    if (gameState.currentMenu === 'main') {
      drawText('ADVENTURE PONG', WIDTH / 2, 80, 40, '#ffd166');
      drawText('A Quest Through the Arenas', WIDTH / 2, 130, 18, '#9fb4c8');
      drawText('Press SPACE to Start', WIDTH / 2, 200, 20, '#fff');
      drawText('Lives: 3 | Defeat all bosses to save the realm', WIDTH / 2, 250, 14, '#90EE90');

      drawText('Controls: Arrow Up/Down or Mouse', WIDTH / 2, 320, 12, '#9fb4c8');
      drawText('Collect Power-ups | Defeat Bosses | Win the Game', WIDTH / 2, 350, 12, '#9fb4c8');

      if (gameState.unlockedLevels.length > 1) {
        drawText('Press L for Level Select', WIDTH / 2, 420, 14, '#ffd166');
      }
    } else if (gameState.currentMenu === 'story') {
      const level = getCurrentLevelData();
      drawText('─ ' + level.name + ' ─', WIDTH / 2, 60, 28, '#ffd166');
      
      ctx.fillStyle = '#9fb4c8';
      ctx.textAlign = 'center';
      ctx.font = '16px system-ui';
      const lines = wrapText(level.story, 60);
      let yOffset = 140;
      lines.forEach(line => {
        ctx.fillText(line, WIDTH / 2, yOffset);
        yOffset += 25;
      });

      drawText('Press SPACE to Begin Battle', WIDTH / 2, HEIGHT - 60, 16, '#ffd166');
    } else if (gameState.currentMenu === 'levelSelect') {
      drawText('SELECT LEVEL', WIDTH / 2, 40, 32, '#ffd166');
      let yOffset = 120;
      levels.forEach((level, idx) => {
        const isUnlocked = gameState.unlockedLevels.includes(idx);
        const color = isUnlocked ? '#fff' : '#666';
        drawText(`${idx + 1}. ${level.name}`, WIDTH / 2, yOffset, 18, color);
        yOffset += 45;
      });
      drawText('Press 1-3 to select | Press ESC to return', WIDTH / 2, HEIGHT - 60, 12, '#9fb4c8');
    } else if (gameState.currentMenu === 'paused') {
      drawText('PAUSED', WIDTH / 2, 80, 36, '#ffd166');
      drawText('Press P to Resume', WIDTH / 2, 160, 18, '#fff');
      drawText('Press M for Menu', WIDTH / 2, 210, 18, '#fff');
    } else if (gameState.currentMenu === 'levelComplete') {
      drawText('LEVEL COMPLETE!', WIDTH / 2, 80, 36, '#90EE90');
      drawText(`${getCurrentLevelData().name}`, WIDTH / 2, 140, 20, '#ffd166');
      drawText(`Final Score: ${player.score}`, WIDTH / 2, 200, 18, '#fff');
      if (gameState.currentLevel < levels.length - 1) {
        drawText('Press SPACE for Next Level', WIDTH / 2, 260, 16, '#ffd166');
      } else {
        drawText('Press SPACE to Face the First Boss', WIDTH / 2, 260, 16, '#ffd166');
      }
    } else if (gameState.currentMenu === 'bossDefeated') {
      drawText('BOSS DEFEATED!', WIDTH / 2, 80, 36, '#FF69B4');
      drawText(`${bosses[gameState.currentBossIndex].name}`, WIDTH / 2, 140, 20, '#ffd166');
      drawText(`Final Score: ${player.score}`, WIDTH / 2, 200, 18, '#fff');
      if (gameState.currentBossIndex < bosses.length - 1) {
        drawText('Press SPACE to Face the Next Boss', WIDTH / 2, 260, 16, '#ffd166');
      } else {
        drawText('Press SPACE to See the Ending', WIDTH / 2, 260, 16, '#ffd166');
      }
    } else if (gameState.currentMenu === 'gameWon') {
      drawText('ADVENTURE COMPLETE!', WIDTH / 2, 60, 36, '#FFD700');
      drawText('You have saved the realm!', WIDTH / 2, 130, 20, '#ffd166');
      drawText(`Total Score: ${gameState.totalScore}`, WIDTH / 2, 180, 18, '#fff');
      drawText('All bosses defeated. You are a legend.', WIDTH / 2, 240, 16, '#90EE90');
      drawText('Press SPACE to Return to Menu', WIDTH / 2, 300, 16, '#ffd166');
    } else if (gameState.currentMenu === 'gameOver') {
      drawText('GAME OVER', WIDTH / 2, 80, 36, '#FF6347');
      drawText(`Lives: 0`, WIDTH / 2, 140, 20, '#fff');
      drawText(`Total Score: ${gameState.totalScore}`, WIDTH / 2, 190, 18, '#ffd166');
      drawText('Press SPACE to Return to Menu', WIDTH / 2, 260, 16, '#ffd166');
    }
  }

  function drawGameUI() {
    // Score display
    drawText(`Player: ${player.score}`, 80, 30, 16, '#ffd166');
    drawText(`${getCurrentLevelData().name}`, WIDTH / 2, 30, 16, '#9fb4c8');
    drawText(`Computer: ${computer.score}`, WIDTH - 80, 30, 16, '#9fb4c8');

    // Lives
    drawText(`Lives: ${gameState.lives}`, 30, HEIGHT - 20, 14, gameState.lives <= 1 ? '#FF6347' : '#fff');

    // Active power-ups display
    if (player.activePowerUps.length > 0) {
      let xOffset = WIDTH - 150;
      player.activePowerUps.forEach((powerUpType, idx) => {
        const pData = powerUpTypes[powerUpType];
        drawText(pData.icon, xOffset, 60, 20, pData.color);
        xOffset -= 40;
      });
    }

    if (isCurrentLevelBoss()) {
      // Show boss name
      const boss = bosses[gameState.currentBossIndex];
      drawText(`⚔️ ${boss.name} ⚔️`, WIDTH / 2, HEIGHT - 20, 14, boss.color);
    }

    // Pause instruction
    drawText('P = Pause', WIDTH / 2, HEIGHT - 20, 12, '#666');
  }

  function render() {
    // Clear
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // Background
    ctx.fillStyle = 'rgba(255,255,255,0.01)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Net
    drawNet();

    // Paddles
    const playerColor = player.shield ? '#00FF00' : '#ffd166';
    drawRect(player.x, player.y, player.width, player.height, playerColor);

    const currentLevel = getCurrentLevelData();
    const computerColor = isCurrentLevelBoss() ? currentLevel.color : computer.color;
    drawRect(computer.x, computer.y, computer.width, computer.height, computerColor);

    // Ball(s)
    balls.forEach(b => {
      if (b.trail.length > 0) {
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(b.trail[0].x, b.trail[0].y);
        b.trail.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.stroke();
      }
      drawCircle(b.x, b.y, b.r, '#ffffff');
    });

    // Power-ups on screen
    powerUps.forEach((pUp, idx) => {
      const pData = powerUpTypes[pUp.type];
      ctx.fillStyle = pData.color;
      ctx.beginPath();
      ctx.arc(pUp.x, pUp.y, pUp.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      drawText(pData.icon, pUp.x, pUp.y + 6, 16);
    });

    // Game UI
    drawGameUI();

    // Menu overlay if active
    if (gameState.currentMenu !== 'playing') {
      drawMenu();
    }
  }

  // ============ GAME LOGIC ============
  function wrapText(text, maxLineLength) {
    const lines = [];
    const words = text.split(' ');
    let currentLine = '';
    words.forEach(word => {
      if ((currentLine + word).length > maxLineLength) {
        lines.push(currentLine.trim());
        currentLine = word;
      } else {
        currentLine += ' ' + word;
      }
    });
    if (currentLine) lines.push(currentLine.trim());
    return lines;
  }

  function update() {
    if (gameState.currentMenu !== 'playing') return;

    const level = getCurrentLevelData();

    // Player movement
    if (!useMouse) {
      if (keys.ArrowUp) player.dy = -level.paddleSpeed;
      else if (keys.ArrowDown) player.dy = level.paddleSpeed;
      else player.dy = 0;

      player.y += player.dy;
      player.y = clamp(player.y, 0, HEIGHT - player.height);
    }

    // Computer AI
    const computerTargetBall = balls[0]; // AI targets first ball
    const target = computerTargetBall.y - (computer.height / 2);
    const diff = target - computer.y;
    if (Math.abs(diff) > level.aiSpeed) {
      computer.y += diff > 0 ? level.aiSpeed : -level.aiSpeed;
    } else {
      computer.y = target;
    }
    computer.y = clamp(computer.y, 0, HEIGHT - computer.height);

    // Update power-ups (move them)
    powerUps.forEach((pUp, idx) => {
      pUp.x += pUp.vx;
      pUp.y += pUp.vy;

      // Bounce off walls
      if (pUp.y - pUp.radius <= 0 || pUp.y + pUp.radius >= HEIGHT) {
        pUp.vy = -pUp.vy;
        pUp.y = clamp(pUp.y, pUp.radius, HEIGHT - pUp.radius);
      }
      if (pUp.x - pUp.radius <= 0 || pUp.x + pUp.radius >= WIDTH) {
        pUp.vx = -pUp.vx;
        pUp.x = clamp(pUp.x, pUp.radius, WIDTH - pUp.radius);
      }

      // Check collision with player
      const dist = Math.hypot(pUp.x - player.x - player.width / 2, pUp.y - player.y - player.height / 2);
      if (dist < pUp.radius + player.height / 2) {
        activatePowerUp(pUp.type);
        powerUps.splice(idx, 1);
      }
    });

    // Ball physics (support multiple balls)
    balls.forEach((b, ballIdx) => {
      b.x += b.vx;
      b.y += b.vy;

      // Trail
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > 10) b.trail.shift();

      // Top/bottom collision
      if (b.y - b.r <= 0) {
        b.y = b.r;
        b.vy = -b.vy;
        soundSystem.playSound('hit');
      } else if (b.y + b.r >= HEIGHT) {
        b.y = HEIGHT - b.r;
        b.vy = -b.vy;
        soundSystem.playSound('hit');
      }

      // Player paddle collision
      if (b.x - b.r <= player.x + player.width) {
        if (b.y >= player.y && b.y <= player.y + player.height && b.vx < 0) {
          soundSystem.playSound('hit');

          const rel = (b.y - (player.y + player.height / 2)) / (player.height / 2);
          const maxBounce = Math.PI / 3;
          const bounce = rel * maxBounce;
          const speedIncrease = 1.05;
          b.speed *= speedIncrease;

          // Ball split if active
          if (b.isMultiBall && ballIdx === 0) {
            b.isMultiBall = false; // Use power-up
            const newBall = {
              x: b.x,
              y: b.y,
              r: b.r,
              speed: b.speed,
              vx: b.vx,
              vy: b.vy + 2,
              trail: [],
              isMultiBall: false,
            };
            balls.push(newBall);
          }

          const dir = 1;
          b.vx = dir * b.speed * Math.cos(bounce);
          b.vy = b.speed * Math.sin(bounce);
          b.x = player.x + player.width + b.r + 0.5;
        }
      }

      // Computer paddle collision
      if (b.x + b.r >= computer.x) {
        if (b.y >= computer.y && b.y <= computer.y + computer.height && b.vx > 0) {
          soundSystem.playSound('hit');

          const rel = (b.y - (computer.y + computer.height / 2)) / (computer.height / 2);
          const maxBounce = Math.PI / 3;
          const bounce = rel * maxBounce;
          const speedIncrease = 1.03;
          b.speed *= speedIncrease;
          const dir = -1;
          b.vx = dir * b.speed * Math.cos(bounce);
          b.vy = b.speed * Math.sin(bounce);
          b.x = computer.x - b.r - 0.5;
        }
      }

      // Scoring
      if (b.x + b.r < 0) {
        computer.score++;
        soundSystem.playSound('score');

        if (player.shield) {
          player.shield = false;
          b.x = 50;
          b.vx = Math.abs(b.vx);
        } else {
          gameState.lives--;
          if (gameState.lives <= 0) {
            gameState.currentMenu = 'gameOver';
            gameState.totalScore += player.score;
            soundSystem.playSound('death');
          } else {
            resetBall('right');
          }
        }
      } else if (b.x - b.r > WIDTH) {
        player.score++;
        soundSystem.playSound('score');
        resetBall('left');

        // Chance to spawn power-up
        if (Math.random() < level.powerUpChance) {
          spawnPowerUp(WIDTH / 2, HEIGHT / 2);
        }

        // Check win condition
        if (player.score >= level.scoreToWin) {
          soundSystem.playSound('levelUp');
          gameState.totalScore += player.score;

          if (isCurrentLevelBoss()) {
            // Boss defeated
            gameState.currentMenu = 'bossDefeated';
            if (gameState.currentBossIndex >= bosses.length - 1) {
              // Final boss defeated
              setTimeout(() => {
                gameState.currentMenu = 'gameWon';
              }, 2000);
            }
          } else {
            // Level complete
            gameState.currentMenu = 'levelComplete';
            if (gameState.currentLevel < levels.length - 1) {
              gameState.unlockedLevels.push(gameState.currentLevel + 1);
            }
          }
        }
      }

      // Remove balls that go off screen (multi-ball)
      if (ballIdx > 0 && (b.x < -50 || b.x > WIDTH + 50)) {
        balls.splice(ballIdx, 1);
      }
    });
  }

  // ============ GAME LOOP ============
  let lastTime = performance.now();
  function loop(now) {
    const dt = now - lastTime;
    lastTime = now;

    update();
    render();
    requestAnimationFrame(loop);
  }

  // ============ INPUT HANDLING ============
  canvas.addEventListener('mousemove', (e) => {
    useMouse = true;
    const rect = canvas.getBoundingClientRect();
    const scaleY = canvas.height / rect.height;
    const y = (e.clientY - rect.top) * scaleY;
    player.y = clamp(y - player.height / 2, 0, HEIGHT - player.height);
  });

  canvas.addEventListener('touchmove', (e) => {
    useMouse = true;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const scaleY = canvas.height / rect.height;
    const y = (touch.clientY - rect.top) * scaleY;
    player.y = clamp(y - player.height / 2, 0, HEIGHT - player.height);
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      keys[e.key] = true;
      useMouse = false;
    } else if (e.key === ' ') {
      e.preventDefault();
      soundSystem.playSound('click');

      if (gameState.currentMenu === 'main') {
        gameState.currentMenu = 'story';
        gameState.currentLevel = 0;
        gameState.currentBossIndex = 0;
      } else if (gameState.currentMenu === 'story') {
        gameState.currentMenu = 'playing';
        player.score = 0;
        computer.score = 0;
        resetBalls();
      } else if (gameState.currentMenu === 'levelComplete') {
        gameState.currentLevel++;
        gameState.currentMenu = isCurrentLevelBoss() ? 'story' : 'story';
        gameState.currentBossIndex = 0;
        gameState.currentMenu = 'story';
      } else if (gameState.currentMenu === 'bossDefeated') {
        gameState.currentBossIndex++;
        if (gameState.currentBossIndex >= bosses.length) {
          gameState.currentMenu = 'gameWon';
        } else {
          gameState.currentLevel = levels.length;
          gameState.currentMenu = 'story';
        }
      } else if (gameState.currentMenu === 'gameWon' || gameState.currentMenu === 'gameOver') {
        gameState.currentMenu = 'main';
        gameState.lives = 3;
        player.score = 0;
        computer.score = 0;
      }
    } else if (e.key === 'p' || e.key === 'P') {
      if (gameState.currentMenu === 'playing') {
        gameState.currentMenu = 'paused';
      } else if (gameState.currentMenu === 'paused') {
        gameState.currentMenu = 'playing';
      }
    } else if (e.key === 'm' || e.key === 'M') {
      if (gameState.currentMenu === 'paused') {
        gameState.currentMenu = 'main';
      }
    } else if (e.key === 'l' || e.key === 'L') {
      if (gameState.currentMenu === 'main') {
        gameState.currentMenu = 'levelSelect';
      }
    } else if (e.key >= '1' && e.key <= '3') {
      const levelIdx = parseInt(e.key) - 1;
      if (gameState.currentMenu === 'levelSelect' && gameState.unlockedLevels.includes(levelIdx)) {
        gameState.currentLevel = levelIdx;
        gameState.currentMenu = 'story';
      }
    } else if (e.key === 'Escape') {
      if (gameState.currentMenu === 'levelSelect') {
        gameState.currentMenu = 'main';
      }
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      keys[e.key] = false;
    }
  });

  // Restart button
  restartBtn.addEventListener('click', () => {
    gameState.currentMenu = 'main';
    gameState.lives = 3;
    gameState.totalScore = 0;
    gameState.currentLevel = 0;
    gameState.currentBossIndex = 0;
    player.score = 0;
    computer.score = 0;
    resetBalls();
  });

  // Start game loop
  resetBalls();
  lastTime = performance.now();
  requestAnimationFrame(loop);
})();
