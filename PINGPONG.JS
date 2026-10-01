(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const playerScoreEl = document.getElementById('playerScore');
  const computerScoreEl = document.getElementById('computerScore');
  const startButton = document.getElementById('startButton');
  const restartBtn = document.getElementById('restart');
  const livesValueEl = document.getElementById('livesValue');
  const stageValueEl = document.getElementById('stageValue');

  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;

  const stories = [
    {
      name: 'Training Grounds',
      intro: 'The warrior enters the Academy of Echoes, where a rookie rival is eager to test their reflexes.',
      boss: false,
      difficulty: 'easy'
    },
    {
      name: 'Moonlit Vale',
      intro: 'A forgotten path opens under moonlight, where the first real champion of the valley waits.',
      boss: false,
      difficulty: 'normal'
    },
    {
      name: 'Crystal Cavern',
      intro: 'The cavern hums with arcane energy as a living crystal guardian blocks the way onward.',
      boss: false,
      difficulty: 'hard'
    },
    {
      name: 'Stone Titan',
      intro: 'The ancient titan awakens beneath the ruins, its stone paddle carrying the weight of a dead empire.',
      boss: true,
      difficulty: 'boss'
    },
    {
      name: 'Inferno Drake',
      intro: 'A dragon of lava and fury descends from the skies, blasting each rally with heat and speed.',
      boss: true,
      difficulty: 'boss'
    },
    {
      name: 'Void Sovereign',
      intro: 'The final ruler of the shadows appears, shadowing every movement with impossible precision.',
      boss: true,
      difficulty: 'boss'
    }
  ];

  const levelState = {
    currentStage: 0,
    lives: 3,
    score: 0,
    computerScore: 0,
    running: false,
    storyIndex: 0,
    gameStarted: false,
    powerUps: [],
    activePower: null
  };

  const player = {
    x: 18,
    y: (HEIGHT - 110) / 2,
    width: 12,
    height: 110,
    dy: 0
  };

  const computer = {
    x: WIDTH - 30,
    y: (HEIGHT - 110) / 2,
    width: 12,
    height: 110
  };

  const ball = {
    x: WIDTH / 2,
    y: HEIGHT / 2,
    r: 8,
    speed: 5,
    vx: 0,
    vy: 0
  };

  const keys = { ArrowUp: false, ArrowDown: false };
  let useMouse = false;

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function resetBall(direction = null) {
    ball.x = WIDTH / 2;
    ball.y = HEIGHT / 2;
    ball.speed = 5 + levelState.currentStage * 0.35;

    const angle = (Math.random() * 0.8) - 0.4;
    const dir = direction === 'left' ? -1 : direction === 'right' ? 1 : (Math.random() < 0.5 ? -1 : 1);
    ball.vx = dir * ball.speed * Math.cos(angle);
    ball.vy = ball.speed * Math.sin(angle);
  }

  function updateStageText() {
    const stage = stories[levelState.currentStage] || stories[0];
    stageValueEl.textContent = stage.name;
    livesValueEl.textContent = String(levelState.lives);
  }

  function spawnPowerUp() {
    const types = ['speed', 'expand', 'shield'];
    const type = types[Math.floor(Math.random() * types.length)];
    const x = WIDTH / 2 + (Math.random() * 100 - 50);
    const y = HEIGHT / 2 + (Math.random() * 100 - 50);

    levelState.powerUps.push({
      type,
      x,
      y,
      r: 12,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2
    });
  }

  function activatePowerUp(type) {
    if (type === 'speed') {
      ball.speed *= 1.2;
      setTimeout(() => { ball.speed /= 1.2; }, 4000);
    } else if (type === 'expand') {
      player.height = Math.min(player.height * 1.5, 170);
      setTimeout(() => { player.height = 110; }, 4000);
    } else if (type === 'shield') {
      levelState.activePower = 'shield';
      setTimeout(() => { levelState.activePower = null; }, 6000);
    }
  }

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
    const segment = 12;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (let y = 0; y < HEIGHT; y += segment * 2) {
      ctx.fillRect(WIDTH / 2 - 1, y, 2, segment);
    }
  }

  function drawPowerUps() {
    for (const p of levelState.powerUps) {
      const colors = {
        speed: '#ffd166',
        expand: '#58cced',
        shield: '#7ef29a'
      };
      ctx.fillStyle = colors[p.type];
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function render() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = 'rgba(255,255,255,0.015)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    drawNet();
    drawRect(player.x, player.y, player.width, player.height, '#ffd166');
    drawRect(computer.x, computer.y, computer.width, computer.height, '#9fb4c8');

    if (levelState.activePower === 'shield') {
      drawRect(player.x - 8, player.y - 8, player.width + 16, player.height + 16, 'rgba(126,242,154,0.2)');
    }

    drawCircle(ball.x, ball.y, ball.r, '#ffffff');
    drawPowerUps();
  }

  function startAdventure() {
    levelState.gameStarted = true;
    levelState.running = true;
    levelState.currentStage = 0;
    levelState.lives = 3;
    levelState.score = 0;
    levelState.computerScore = 0;
    updateStageText();
    resetBall('left');
  }

  function nextStage() {
    levelState.currentStage += 1;
    if (levelState.currentStage >= stories.length) {
      levelState.currentStage = stories.length - 1;
      levelState.running = false;
      return;
    }
    levelState.score = 0;
    levelState.computerScore = 0;
    updateStageText();
    resetBall('left');
  }

  function finishStage() {
    const stage = stories[levelState.currentStage];
    if (stage && stage.boss) {
      console.log('Boss defeated');
    }
    if (levelState.currentStage < stories.length - 1) {
      nextStage();
    } else {
      levelState.running = false;
    }
  }

  function update() {
    if (!levelState.running) return;

    if (!useMouse) {
      if (keys.ArrowUp) player.dy = -6;
      else if (keys.ArrowDown) player.dy = 6;
      else player.dy = 0;
      player.y += player.dy;
      player.y = clamp(player.y, 0, HEIGHT - player.height);
    }

    const target = ball.y - (computer.height / 2);
    const diff = target - computer.y;
    if (Math.abs(diff) > 4) {
      computer.y += diff > 0 ? 4 : -4;
    } else {
      computer.y = target;
    }
    computer.y = clamp(computer.y, 0, HEIGHT - computer.height);

    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.y - ball.r <= 0) {
      ball.y = ball.r;
      ball.vy = -ball.vy;
    } else if (ball.y + ball.r >= HEIGHT) {
      ball.y = HEIGHT - ball.r;
      ball.vy = -ball.vy;
    }

    // Player collision
    if (ball.x - ball.r <= player.x + player.width) {
      if (ball.y >= player.y && ball.y <= player.y + player.height && ball.vx < 0) {
        const rel = (ball.y - (player.y + player.height / 2)) / (player.height / 2);
        const bounce = rel * (Math.PI / 3);
        ball.vx = Math.abs(ball.vx) * 1.06 * Math.cos(bounce);
        ball.vy = ball.speed * Math.sin(bounce);
        ball.x = player.x + player.width + ball.r + 0.5;
      }
    }

    // Computer collision
    if (ball.x + ball.r >= computer.x) {
      if (ball.y >= computer.y && ball.y <= computer.y + computer.height && ball.vx > 0) {
        const rel = (ball.y - (computer.y + computer.height / 2)) / (computer.height / 2);
        const bounce = rel * (Math.PI / 3);
        ball.vx = -Math.abs(ball.vx) * 1.06 * Math.cos(bounce);
        ball.vy = ball.speed * Math.sin(bounce);
        ball.x = computer.x - ball.r - 0.5;
      }
    }

    if (ball.x + ball.r < 0) {
      levelState.computerScore++;
      computerScoreEl.textContent = levelState.computerScore;
      levelState.lives--;
      livesValueEl.textContent = levelState.lives;

      if (levelState.lives <= 0) {
        levelState.running = false;
      } else {
        resetBall('right');
      }
    } else if (ball.x - ball.r > WIDTH) {
      levelState.score++;
      playerScoreEl.textContent = levelState.score;

      if (Math.random() < 0.22) {
        spawnPowerUp();
      }

      if (levelState.score >= 5) {
        finishStage();
      } else {
        resetBall('left');
      }
    }

    for (let i = levelState.powerUps.length - 1; i >= 0; i--) {
      const p = levelState.powerUps[i];
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > WIDTH || p.y < 0 || p.y > HEIGHT) {
        levelState.powerUps.splice(i, 1);
        continue;
      }

      if (
        p.x + p.r > player.x &&
        p.x - p.r < player.x + player.width &&
        p.y + p.r > player.y &&
        p.y - p.r < player.y + player.height
      ) {
        activatePowerUp(p.type);
        levelState.powerUps.splice(i, 1);
      }
    }
  }

  function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
  }

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
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      keys[e.key] = false;
    }
  });

  startButton.addEventListener('click', () => {
    levelState.running = true;
    levelState.gameStarted = true;
    levelState.currentStage = 0;
    levelState.lives = 3;
    levelState.score = 0;
    levelState.computerScore = 0;
    playerScoreEl.textContent = '0';
    computerScoreEl.textContent = '0';
    updateStageText();
    resetBall('left');
  });

  restartBtn.addEventListener('click', () => {
    levelState.running = true;
    levelState.currentStage = 0;
    levelState.lives = 3;
    levelState.score = 0;
    levelState.computerScore = 0;
    playerScoreEl.textContent = '0';
    computerScoreEl.textContent = '0';
    updateStageText();
    resetBall('left');
  });

  updateStageText();
  resetBall('left');
  requestAnimationFrame(gameLoop);
})();
