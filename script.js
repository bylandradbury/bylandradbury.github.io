// --------------------
// ELEMENTS
// --------------------
const map = document.getElementById("map");
const viewport = document.getElementById("viewport");

const cloudBack = document.querySelector(".cloud-layer.back");
const cloudFront = document.querySelector(".cloud-layer.front");

// --------------------
// STATE
// --------------------
let offsetX = 0;
let offsetY = 0;
let scale = 1;

let isDraggingMap = false;
let startX, startY;

let mouseX = 0;
let mouseY = 0;

let cloudBackX = 0;
let cloudBackY = 0;

let cloudFrontX = 0;
let cloudFrontY = 0;

// --------------------
// TRACK CURSOR
// --------------------
window.addEventListener("mousemove", (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

// --------------------
// MAP TRANSFORM
// --------------------
function updateMap() {
  map.style.transform = `
    translate(${offsetX}px, ${offsetY}px)
    scale(${scale})
  `;
  map.style.transformOrigin = "0 0";

  updateCloudParallax();
}

// --------------------
// MAP DRAG
// --------------------
viewport.addEventListener("mousedown", (e) => {
  isDraggingMap = true;
  startX = e.clientX - offsetX;
  startY = e.clientY - offsetY;
  viewport.style.cursor = "grabbing";
});

window.addEventListener("mouseup", () => {
  isDraggingMap = false;
  viewport.style.cursor = "grab";
});

window.addEventListener("mousemove", (e) => {
  if (!isDraggingMap) return;

  offsetX = e.clientX - startX;
  offsetY = e.clientY - startY;

  updateMap();
});

// --------------------
// ZOOM (CURSOR-CENTERED)
// --------------------
viewport.addEventListener("wheel", (e) => {
  e.preventDefault();

  const zoomIntensity = 0.0005;
  const delta = -e.deltaY * zoomIntensity;

  const newScale = Math.min(Math.max(0.6, scale + delta), 1.8);

  const rect = map.getBoundingClientRect();

  const mouseMapX = (e.clientX - rect.left) / scale;
  const mouseMapY = (e.clientY - rect.top) / scale;

  offsetX -= mouseMapX * (newScale - scale);
  offsetY -= mouseMapY * (newScale - scale);

  scale = newScale;

  updateMap();
});

// --------------------
// AUDIO + NODE SETUP
// --------------------
const nodes = [];

document.querySelectorAll(".node").forEach(node => {
  const audio = new Audio();

  audio.src = node.dataset.audio;
  audio.preload = "auto";
  audio.load();

  audio.loop = true;
  audio.volume = 0;

  nodes.push({ node, audio });
});

window.addEventListener("click", () => {
  nodes.forEach(({ audio }) => {
    if (audio.paused) audio.play().catch(() => {});
  });
}, { once: true });

// --------------------
// NODE DRAG (FIXED)
// --------------------
document.querySelectorAll(".node").forEach(node => {
  let draggingNode = false;

  node.addEventListener("mousedown", (e) => {
    draggingNode = true;
    e.stopPropagation(); // prevents map drag
  });

  window.addEventListener("mouseup", () => {
    draggingNode = false;
  });

  window.addEventListener("mousemove", (e) => {
    if (!draggingNode) return;

    const rect = map.getBoundingClientRect();

    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    node.style.left = x + "px";
    node.style.top = y + "px";
  });
});

// --------------------
// AUDIO + NODE VISUALS
// --------------------
function updateVolumes() {
  nodes.forEach(({ node, audio }) => {

    const rect = node.getBoundingClientRect();

    const nodeX = rect.left + rect.width / 2;
    const nodeY = rect.top + rect.height / 2;

    const dx = nodeX - mouseX;
    const dy = nodeY - mouseY;

    const distance = Math.sqrt(dx * dx + dy * dy);

    const deadZone = 120;
    const maxDistance = 300;

    let target = 0;

    if (distance < maxDistance) {
      if (distance < deadZone) {
        target = 1;
      } else {
        target = 1 - (distance - deadZone) / (maxDistance - deadZone);
      }
    }

    audio.volume += (target - audio.volume) * 0.08;

    const blob = node.querySelector("path");

    if (blob) {
      const s = 0.6 + audio.volume * 0.5;

      node.style.transform =
        `translate(-50%, -50%) scale(${s})`;

      blob.style.fill =
        `rgba(0, 255, 200, ${0.1 + audio.volume * 0.6})`;
    }
  });
}

// --------------------
// CLOUD PARALLAX (SCREEN SPACE)
// --------------------
function updateCloudParallax() {
  const targetBackX = offsetX * 0.03;
  const targetBackY = offsetY * 0.03;

  const targetFrontX = offsetX * 0.08;
  const targetFrontY = offsetY * 0.08;

  // inertia (lerp)
  cloudBackX += (targetBackX - cloudBackX) * 0.05;
  cloudBackY += (targetBackY - cloudBackY) * 0.05;

  cloudFrontX += (targetFrontX - cloudFrontX) * 0.08;
  cloudFrontY += (targetFrontY - cloudFrontY) * 0.08;

  cloudBack.style.transform =
    `translate(${cloudBackX}px, ${cloudBackY}px) scale(1.7)`;

  cloudFront.style.transform =
    `translate(${cloudFrontX}px, ${cloudFrontY}px) scale(1)`;
}

// --------------------
// CLOUD HALOS (SCREEN SPACE FIXED)
// --------------------
function updateCloudLight() {
  if (!cloudFront) return;

  const rect = cloudFront.getBoundingClientRect();

  let gradients = [];

  nodes.forEach(({ node, audio }) => {
    const nRect = node.getBoundingClientRect();

    const x = nRect.left + nRect.width / 2 - rect.left;
    const y = nRect.top + nRect.height / 2 - rect.top;

    const radius = 100 + audio.volume * 120;
    const strength = 0.08 + audio.volume * 0.25;

    gradients.push(
      `radial-gradient(circle ${radius}px at ${x}px ${y}px,
        rgba(255,255,255,${strength}),
        transparent 85%)`
    );
  });

  cloudFront.style.backgroundImage = `
    ${gradients.join(",")},
    url("images/clouds2.jpg")
  `;

  cloudFront.style.backgroundBlendMode = "screen";
}

// --------------------
// LOOP
// --------------------
function animate() {
  updateVolumes();
  updateCloudParallax();
  updateCloudLight();

  requestAnimationFrame(animate);
}

animate();
