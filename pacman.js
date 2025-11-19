// pacman.js (fixed for responsiveness + touch + Block order)

//board
let board;
const rowCount = 21;
const columnCount = 19;
let tileSize = 32;
let context;

let blueGhostImage;
let orangeGhostImage;
let pinkGhostImage;
let redGhostImage;
let pacmanUpImage;
let pacmanDownImage;
let pacmanLeftImage;
let pacmanRightImage;
let wallImage;

//X = wall, O = skip, P = pac man, ' ' = food
//Ghosts: b = blue, o = orange, p = pink, r = red
const tileMap = [
  "XXXXXXXXXXXXXXXXXXX",
  "X        X        X",
  "X XX XXX X XXX XX X",
  "X                 X",
  "X XX X XXXXX X XX X",
  "X    X       X    X",
  "XXXX XXXX XXXX XXXX",
  "OOOX X       X XOOO",
  "XXXX X XXrXX X XXXX",
  "O       bpo       O",
  "XXXX X XXXXX X XXXX",
  "OOOX X       X XOOO",
  "XXXX X XXXXX X XXXX",
  "X        X        X",
  "X XX XXX X XXX XX X",
  "X  X     P     X  X",
  "XX X X XXXXX X X XX",
  "X    X   X   X    X",
  "X XXXXXX X XXXXXX X",
  "X                 X",
  "XXXXXXXXXXXXXXXXXXX",
];

const walls = new Set();
const foods = new Set();
const ghosts = new Set();
let pacman;

const directions = ["U", "D", "L", "R"]; //up down left right
let score = 0;
let lives = 3;
let gameOver = false;

/* ---------------------------
   CLASS Block (must be declared
   before loadMap is called)
   --------------------------- */
class Block {
  constructor(image, x, y, width, height) {
    this.image = image;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;

    this.startX = x;
    this.startY = y;

    this.direction = "R";
    this.velocityX = 0;
    this.velocityY = 0;
  }

  updateDirection(direction) {
    const prevDirection = this.direction;
    this.direction = direction;
    this.updateVelocity();
    this.x += this.velocityX;
    this.y += this.velocityY;

    for (let wall of walls.values()) {
      if (collision(this, wall)) {
        this.x -= this.velocityX;
        this.y -= this.velocityY;
        this.direction = prevDirection;
        this.updateVelocity();
        return;
      }
    }
  }

  updateVelocity() {
    if (this.direction == "U") {
      this.velocityX = 0;
      this.velocityY = -tileSize / 4;
    } else if (this.direction == "D") {
      this.velocityX = 0;
      this.velocityY = tileSize / 4;
    } else if (this.direction == "L") {
      this.velocityX = -tileSize / 4;
      this.velocityY = 0;
    } else if (this.direction == "R") {
      this.velocityX = tileSize / 4;
      this.velocityY = 0;
    }
  }

  reset() {
    this.x = this.startX;
    this.y = this.startY;
  }
}

/* ---------------------------
   Responsiveness helpers
   --------------------------- */
function updateCanvasSize() {
  // calculate tile size so whole board fits the smallest dimension
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const minScreen = Math.min(screenWidth, screenHeight);

  // leave a small margin so board isn't edge-to-edge
  tileSize = Math.max(12, Math.floor(minScreen / (columnCount + 2)));

  // set canvas internal pixel size
  board.width = tileSize * columnCount;
  board.height = tileSize * rowCount;

  // scale canvas visually to fit width if wanted by CSS, but internal drawing uses board.width/height
}

/* ---------------------------
   main lifecycle
   --------------------------- */
window.onload = function () {
  board = document.getElementById("board");
  if (!board) {
    console.error("Canvas with id 'board' not found!");
    return;
  }

  updateCanvasSize();
  context = board.getContext("2d");

  // load images and map AFTER class Block exists
  loadImages();
  loadMap();

  // initialize ghosts directions
  for (let ghost of ghosts.values()) {
    const newDirection = directions[Math.floor(Math.random() * 4)];
    ghost.updateDirection(newDirection);
  }

  // keyboard controls
  document.addEventListener("keyup", movePacman);

  // touch controls (must be after board exists)
  // NOTE: preventDefault on touchmove so page doesn't scroll during swipe
  let touchStartX = 0;
  let touchStartY = 0;

  board.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = board.getBoundingClientRect();

      // convert to canvas coordinate space
      const scaleX = board.width / rect.width;
      const scaleY = board.height / rect.height;

      touchStartX = (touch.clientX - rect.left) * scaleX;
      touchStartY = (touch.clientY - rect.top) * scaleY;
    },
    { passive: false }
  );

  board.addEventListener(
    "touchend",
    (e) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      const rect = board.getBoundingClientRect();

      const scaleX = board.width / rect.width;
      const scaleY = board.height / rect.height;

      const endX = (touch.clientX - rect.left) * scaleX;
      const endY = (touch.clientY - rect.top) * scaleY;

      const dx = endX - touchStartX;
      const dy = endY - touchStartY;

      // dominant movement decides direction
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > tileSize * 0.2) {
          pacman.updateDirection("R");
          pacman.image = pacmanRightImage;
        } else if (dx < -tileSize * 0.2) {
          pacman.updateDirection("L");
          pacman.image = pacmanLeftImage;
        }
      } else {
        if (dy > tileSize * 0.2) {
          pacman.updateDirection("D");
          pacman.image = pacmanDownImage;
        } else if (dy < -tileSize * 0.2) {
          pacman.updateDirection("U");
          pacman.image = pacmanUpImage;
        }
      }
    },
    { passive: false }
  );

  // handle window resize so board stays responsive
  window.addEventListener("resize", () => {
    // save pacman/ghost positions relative to tile if you need, but simplest is reload map and reset positions
    updateCanvasSize();
    loadMap();
    resetPositions();
  });

  // start game loop
  update();
};

/* ---------------------------
   image + map
   --------------------------- */
function loadImages() {
  wallImage = new Image();
  wallImage.src = "./wall.png";

  blueGhostImage = new Image();
  blueGhostImage.src = "./blueGhost.png";
  orangeGhostImage = new Image();
  orangeGhostImage.src = "./orangeGhost.png";
  pinkGhostImage = new Image();
  pinkGhostImage.src = "./pinkGhost.png";
  redGhostImage = new Image();
  redGhostImage.src = "./redGhost.png";

  pacmanUpImage = new Image();
  pacmanUpImage.src = "./pacmanUp.png";
  pacmanDownImage = new Image();
  pacmanDownImage.src = "./pacmanDown.png";
  pacmanLeftImage = new Image();
  pacmanLeftImage.src = "./pacmanLeft.png";
  pacmanRightImage = new Image();
  pacmanRightImage.src = "./pacmanRight.png";
}

function loadMap() {
  walls.clear();
  foods.clear();
  ghosts.clear();

  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < columnCount; c++) {
      const row = tileMap[r];
      const tileMapChar = row[c];

      const x = c * tileSize;
      const y = r * tileSize;

      if (tileMapChar == "X") {
        // block wall
        const wall = new Block(wallImage, x, y, tileSize, tileSize);
        walls.add(wall);
      } else if (tileMapChar == "b") {
        // blue ghost
        const ghost = new Block(blueGhostImage, x, y, tileSize, tileSize);
        ghosts.add(ghost);
      } else if (tileMapChar == "o") {
        // orange ghost
        const ghost = new Block(orangeGhostImage, x, y, tileSize, tileSize);
        ghosts.add(ghost);
      } else if (tileMapChar == "p") {
        // pink ghost
        const ghost = new Block(pinkGhostImage, x, y, tileSize, tileSize);
        ghosts.add(ghost);
      } else if (tileMapChar == "r") {
        // red ghost
        const ghost = new Block(redGhostImage, x, y, tileSize, tileSize);
        ghosts.add(ghost);
      } else if (tileMapChar == "P") {
        // pacman
        pacman = new Block(pacmanRightImage, x, y, tileSize, tileSize);
      } else if (tileMapChar == " ") {
        // empty is food - center the small square based on tileSize
        const foodSize = Math.max(2, Math.floor(tileSize / 8));
        const food = new Block(null, x + Math.floor(tileSize / 2) - Math.floor(foodSize / 2), y + Math.floor(tileSize / 2) - Math.floor(foodSize / 2), foodSize, foodSize);
        foods.add(food);
      }
    }
  }
}

/* ---------------------------
   core loop + draw
   --------------------------- */
function update() {
  if (gameOver) {
    return;
  }
  move();
  draw();
  setTimeout(update, 50); //1000/50 = 20 FPS
}

function draw() {
  context.clearRect(0, 0, board.width, board.height);

  // draw pacman if exists
  if (pacman && pacman.image) {
    context.drawImage(pacman.image, pacman.x, pacman.y, pacman.width, pacman.height);
  }

  for (let ghost of ghosts.values()) {
    if (ghost.image) context.drawImage(ghost.image, ghost.x, ghost.y, ghost.width, ghost.height);
  }

  for (let wall of walls.values()) {
    if (wall.image) context.drawImage(wall.image, wall.x, wall.y, wall.width, wall.height);
  }

  context.fillStyle = "white";
  for (let food of foods.values()) {
    context.fillRect(food.x, food.y, food.width, food.height);
  }

  //score
  context.fillStyle = "white";
  context.font = Math.max(10, Math.floor(tileSize / 3)) + "px sans-serif";
  if (gameOver) {
    context.fillText("Game Over: " + String(score), Math.floor(tileSize / 2), Math.floor(tileSize / 2));
  } else {
    context.fillText("x" + String(lives) + " " + String(score), Math.floor(tileSize / 2), Math.floor(tileSize / 2));
  }
}

/* ---------------------------
   movement + collision
   --------------------------- */
function move() {
  if (!pacman) return;

  pacman.x += pacman.velocityX;
  pacman.y += pacman.velocityY;

  // check wall collisions
  for (let wall of walls.values()) {
    if (collision(pacman, wall)) {
      pacman.x -= pacman.velocityX;
      pacman.y -= pacman.velocityY;
      break;
    }
  }

  // check ghosts collision
  for (let ghost of ghosts.values()) {
    if (collision(ghost, pacman)) {
      lives -= 1;
      if (lives == 0) {
        gameOver = true;
        return;
      }
      resetPositions();
    }

    if (
      ghost.y == tileSize * 9 &&
      ghost.direction != "U" &&
      ghost.direction != "D"
    ) {
      ghost.updateDirection("U");
    }

    ghost.x += ghost.velocityX;
    ghost.y += ghost.velocityY;
    for (let wall of walls.values()) {
      if (
        collision(ghost, wall) ||
        ghost.x <= 0 ||
        ghost.x + ghost.width >= board.width
      ) {
        ghost.x -= ghost.velocityX;
        ghost.y -= ghost.velocityY;
        const newDirection = directions[Math.floor(Math.random() * 4)];
        ghost.updateDirection(newDirection);
      }
    }
  }

  // check food collision
  let foodEaten = null;
  for (let food of foods.values()) {
    if (collision(pacman, food)) {
      foodEaten = food;
      score += 10;
      break;
    }
  }
  if (foodEaten) foods.delete(foodEaten);

  // next level
  if (foods.size == 0) {
    loadMap();
    resetPositions();
  }
}

function movePacman(e) {
  if (gameOver) {
    loadMap();
    resetPositions();
    lives = 3;
    score = 0;
    gameOver = false;
    update(); //restart game loop
    return;
  }

  if (e.code == "ArrowUp" || e.code == "KeyW") {
    pacman.updateDirection("U");
  } else if (e.code == "ArrowDown" || e.code == "KeyS") {
    pacman.updateDirection("D");
  } else if (e.code == "ArrowLeft" || e.code == "KeyA") {
    pacman.updateDirection("L");
  } else if (e.code == "ArrowRight" || e.code == "KeyD") {
    pacman.updateDirection("R");
  }

  //update pacman images
  if (pacman.direction == "U") {
    pacman.image = pacmanUpImage;
  } else if (pacman.direction == "D") {
    pacman.image = pacmanDownImage;
  } else if (pacman.direction == "L") {
    pacman.image = pacmanLeftImage;
  } else if (pacman.direction == "R") {
    pacman.image = pacmanRightImage;
  }
}

function collision(a, b) {
  return (
    a.x < b.x + b.width && //a's top left corner doesn't reach b's top right corner
    a.x + a.width > b.x && //a's top right corner passes b's top left corner
    a.y < b.y + b.height && //a's top left corner doesn't reach b's bottom left corner
    a.y + a.height > b.y
  ); //a's bottom left corner passes b's top left corner
}

function resetPositions() {
  if (pacman) pacman.reset();
  pacman.velocityX = 0;
  pacman.velocityY = 0;
  for (let ghost of ghosts.values()) {
    ghost.reset();
    const newDirection = directions[Math.floor(Math.random() * 4)];
    ghost.updateDirection(newDirection);
  }
}
