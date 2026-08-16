// Simple Pong game
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const playerScoreEl = document.getElementById('playerScore');
  const computerScoreEl = document.getElementById('computerScore');
  const restartBtn = document.getElementById('restart');

  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;

  // Game objects
  const paddleWidth = 12;
  const paddleHeight = 110;
  const paddleOffset = 18;
  const paddleSpeed = 6; // keyboard speed
  const aiSpeed = 4;     // computer paddle max speed

  const player = {
    x: paddleOffset,
    y: (HEIGHT - paddleHeight) / 2,
    width: paddleWidth,
    height: paddleHeight,
    dy: 0
  };

  const computer = {
    x: WIDTH - paddleOffset - paddleWidth,
    y: (HEIGHT - paddleHeight) / 2,
    width: paddleWidth,
    height: paddleHeight
  };

  const ball = {
    x: WIDTH / 2,
    y: HEIGHT / 2,
    r: 8,
    speed: 5,
    vx: 0,
    vy: 0
  };

  let playerScore = 0;
  let computerScore = 0;

  // Input state
  const keys = { ArrowUp: false, ArrowDown: false };
  let useMouse = false;

  function resetBall(direction = null) {
    ball.x = WIDTH / 2;
    ball.y = HEIGHT / 2;
    ball.speed = 5;

    // random-ish angle between -0.35 and 0.35 radians
    const angle = (Math.random() * 0.7 - 0.35);
    const dir = direction === 'left' ? -1 : direction === 'right' ? 1 : (Math.random() < 0.5 ? -1 : 1);
    ball.vx = dir * ball.speed * Math.cos(angle);
    ball.vy = ball.speed * Math.sin(angle);
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
    const segment = 14;
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for (let y = 10; y < HEIGHT; y += segment * 2) {
      ctx.fillRect(WIDTH / 2 - 1, y, 2, segment);
    }
  }

  function render() {
    // clear
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // background subtle
    ctx.fillStyle = 'rgba(255,255,255,0.01)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // net
    drawNet();

    // paddles
    drawRect(player.x, player.y, player.width, player.height, '#ffd166');
    drawRect(computer.x, computer.y, computer.width, computer.height, '#9fb4c8');

    // ball
    drawCircle(ball.x, ball.y, ball.r, '#ffffff');

  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function update() {
    // Player keyboard movement
    if (!useMouse) {
      if (keys.ArrowUp) player.dy = -paddleSpeed;
      else if (keys.ArrowDown) player.dy = paddleSpeed;
      else player.dy = 0;

      player.y += player.dy;
      player.y = clamp(player.y, 0, HEIGHT - player.height);
    }

    // Computer AI: move towards the ball center with limited speed
    const target = ball.y - (computer.height / 2);
    const diff = target - computer.y;
    if (Math.abs(diff) > aiSpeed) {
      computer.y += diff > 0 ? aiSpeed : -aiSpeed;
    } else {
      computer.y = target;
    }
    computer.y = clamp(computer.y, 0, HEIGHT - computer.height);

    // Ball movement
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Top/bottom collision
    if (ball.y - ball.r <= 0) {
      ball.y = ball.r;
      ball.vy = -ball.vy;
    } else if (ball.y + ball.r >= HEIGHT) {
      ball.y = HEIGHT - ball.r;
      ball.vy = -ball.vy;
    }

    // Paddle collisions - using AABB test with circle (approximate)
    // Player paddle
    if (ball.x - ball.r <= player.x + player.width) {
      if (ball.y >= player.y && ball.y <= player.y + player.height && ball.vx < 0) {
        // collision - compute reflection based on where it hit the paddle
        const rel = (ball.y - (player.y + player.height / 2)) / (player.height / 2);
        const maxBounce = Math.PI / 3; // 60 degrees
        const bounce = rel * maxBounce;
        const speedIncrease = 1.05;
        ball.speed *= speedIncrease;
        const dir = 1; // ball goes right
        ball.vx = dir * ball.speed * Math.cos(bounce);
        ball.vy = ball.speed * Math.sin(bounce);
        ball.x = player.x + player.width + ball.r + 0.5; // reposition to avoid sticking
      }
    }

    // Computer paddle
    if (ball.x + ball.r >= computer.x) {
      if (ball.y >= computer.y && ball.y <= computer.y + computer.height && ball.vx > 0) {
        const rel = (ball.y - (computer.y + computer.height / 2)) / (computer.height / 2);
        const maxBounce = Math.PI / 3;
        const bounce = rel * maxBounce;
        const speedIncrease = 1.03;
        ball.speed *= speedIncrease;
        const dir = -1; // ball goes left
        ball.vx = dir * ball.speed * Math.cos(bounce);
        ball.vy = ball.speed * Math.sin(bounce);
        ball.x = computer.x - ball.r - 0.5;
      }
    }

    // Score conditions
    if (ball.x + ball.r < 0) {
      // computer scores
      computerScore++;
      computerScoreEl.textContent = computerScore;
      resetBall('right');
    } else if (ball.x - ball.r > WIDTH) {
      // player scores
      playerScore++;
      playerScoreEl.textContent = playerScore;
      resetBall('left');
    }
  }

  // Game loop
  let lastTime = performance.now();
  function loop(now) {
    const dt = now - lastTime;
    lastTime = now;

    update(dt);
    render();

    requestAnimationFrame(loop);
  }

  // Input handlers
  canvas.addEventListener('mousemove', (e) => {
    useMouse = true;
    const rect = canvas.getBoundingClientRect();
    const scaleY = canvas.height / rect.height;
    const y = (e.clientY - rect.top) * scaleY;
    player.y = clamp(y - player.height / 2, 0, HEIGHT - player.height);
  });

  // Touch support - allow dragging on mobile
  canvas.addEventListener('touchmove', (e) => {
    useMouse = true;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const scaleY = canvas.height / rect.height;
    const y = (touch.clientY - rect.top) * scaleY;
    player.y = clamp(y - player.height / 2, 0, HEIGHT - player.height);
  }, { passive: false });

  // When the player uses keyboard, we can allow switching back to keyboard by not setting useMouse,
  // but if we've had recent mouse/touch movement we keep using mouse. To let keyboard take control again,
  // the player can click outside and use keys.
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      keys[e.key] = true;
      // allow keyboard to control again if arrow keys pressed
      useMouse = false;
    }
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      keys[e.key] = false;
    }
  });

  // Restart button
  restartBtn.addEventListener('click', () => {
    playerScore = 0;
    computerScore = 0;
    playerScoreEl.textContent = playerScore;
    computerScoreEl.textContent = computerScore;
    player.y = (HEIGHT - player.height) / 2;
    computer.y = (HEIGHT - computer.height) / 2;
    resetBall();
  });

  // Initialize
  resetBall();
  lastTime = performance.now();
  requestAnimationFrame(loop);
})();