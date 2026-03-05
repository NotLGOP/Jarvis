// Setup Three.js scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

camera.position.z = 5;

// Lighting
const light = new THREE.PointLight(0x00aaff, 2, 100);
light.position.set(10,10,10);
scene.add(light);

// Store blocks and models
let blocks = [];
let uploadedModel = null;

// Function to create block
function createBlock(x, y, z) {
  const block = new THREE.Mesh(
    new THREE.BoxGeometry(0.5,0.5,0.5),
    new THREE.MeshPhongMaterial({ color: 0x00aaff, emissive: 0x0044ff })
  );
  block.position.set(x,y,z);
  scene.add(block);
  blocks.push(block);
}

// Explode blocks or model
function explodeScene() {
  if (uploadedModel) {
    uploadedModel.traverse(child => {
      if (child.isMesh) {
        gsap.to(child.position, {
          x: child.position.x + (Math.random()-0.5)*5,
          y: child.position.y + (Math.random()-0.5)*5,
          z: child.position.z + (Math.random()-0.5)*5,
          duration: 1.5,
          ease: "power2.out"
        });
      }
    });
  } else {
    blocks.forEach(block => {
      gsap.to(block.position, {
        x: block.position.x + (Math.random()-0.5)*5,
        y: block.position.y + (Math.random()-0.5)*5,
        z: block.position.z + (Math.random()-0.5)*5,
        duration: 1.5,
        ease: "power2.out"
      });
    });
  }
}

// Upload model button
document.getElementById('uploadModel').addEventListener('change', event => {
  const file = event.target.files[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  const loader = new THREE.GLTFLoader();
  loader.load(url, gltf => {
    if (uploadedModel) scene.remove(uploadedModel);
    uploadedModel = gltf.scene;
    uploadedModel.scale.set(1,1,1);
    scene.add(uploadedModel);
  });
});

// MediaPipe Hands setup
const videoElement = document.getElementById('camera');
const canvasElement = document.getElementById('output');
const canvasCtx = canvasElement.getContext('2d');

const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});
hands.setOptions({
  maxNumHands: 2,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
});

hands.onResults(results => {
  canvasCtx.save();
  canvasCtx.clearRect(0,0,canvasElement.width,canvasElement.height);

  // Draw camera feed
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  if (results.multiHandLandmarks) {
    results.multiHandLandmarks.forEach(landmarks => {
      // Pinch detection: thumb tip (4) and index tip (8)
      const thumb = landmarks[4];
      const index = landmarks[8];
      const dist = Math.hypot(thumb.x - index.x, thumb.y - index.y);

      if (dist < 0.05) {
        const x = (index.x - 0.5) * 10;
        const y = -(index.y - 0.5) * 10;
        createBlock(x,y,0);
      }

      // Zoom-out gesture: both hands far apart
      if (results.multiHandLandmarks.length === 2) {
        const hand1 = results.multiHandLandmarks[0][0];
        const hand2 = results.multiHandLandmarks[1][0];
        const apart = Math.abs(hand1.x - hand2.x);
        if (apart > 0.5) {
          explodeScene();
        }
      }
    });
  }
  canvasCtx.restore();
});

// Camera setup
const cameraFeed = new Camera(videoElement, {
  onFrame: async () => {
    await hands.send({image: videoElement});
  },
  width: 640,
  height: 480
});
cameraFeed.start();

// Render loop
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();
