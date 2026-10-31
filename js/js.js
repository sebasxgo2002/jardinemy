
/* ============================================================
   JARDÍN INFINITO PARA EMY
   Versión optimizada
   Three.js r180
============================================================ */

import * as THREE from 'three';

/* ============================================================
   1. ELEMENTOS HTML
============================================================ */

const $ = (id) => document.getElementById(id);

const container = $('garden-container');

const loadingScreen = $('loading-screen');
const loadingProgress = $('loading-progress');
const loadingPercentage = $('loading-percentage');

const welcomeScreen = $('welcome-screen');
const messageScreen = $('message-screen');
const finalScreen = $('final-screen');

const startButton = $('start-button');

const messageText = $('message-text');
const messagePhoto = $('message-photo');
const finalPhoto = $('final-photo');

const audio = $('background-audio');
const audioControls = $('audio-controls');
const audioToggle = $('audio-toggle');
const audioIcon = $('audio-icon');
const volumeControl = $('volume-control');

const webglError = $('webgl-error');


/* ============================================================
   2. CONFIGURACIÓN
============================================================ */

const CONFIG = {
    walkingSpeed: 0.035,
    walkingAmplitude: 0.025,
    recycleDistance: 145,
    terrainLength: 300,

    maxPixelRatio: 1,

    flowerCount: window.innerWidth < 600 ? 360 : 720,

    // Actualizar el movimiento de flores a 30 FPS
    flowerAnimationInterval: 1 / 30,

    // Distancia máxima para animar flores cercanas
    flowerAnimationDistance: 75,

    // Efectos ambientales
    fireflyCount: window.innerWidth < 600 ? 45 : 85,
    flyingPetalCount: window.innerWidth < 600 ? 18 : 36,
};


/* ============================================================
   3. ESTADO
============================================================ */

let scene;
let camera;
let renderer;
let clock;

let flowerSystem;
let effectsSystem;

let animationStarted = false;
let experienceStarted = false;
let isFinalScene = false;
let pageVisible = true;

let elapsedTime = 0;
let flowerAnimationAccumulator = 0;

let messageTimer = null;
let messageTransitionTimer = null;

let resizeTimer = null;


/* ============================================================
   4. COLORES
============================================================ */

const FLOWER_COLORS = [
    { name: 'Rosas', color: 0xf05c8a },
    { name: 'Rojos', color: 0xc92c51 },
    { name: 'Morados', color: 0x9461c9 },
    { name: 'Amarillos', color: 0xf6cb53 },
    { name: 'Blancos', color: 0xf8e8df },
    { name: 'Corales', color: 0xee896d }
];


/* ============================================================
   5. INICIALIZACIÓN
============================================================ */

function initializeGarden() {
    try {
        scene = new THREE.Scene();

        scene.background = new THREE.Color(0xd58b91);

        scene.fog = new THREE.FogExp2(
            0xe9a08f,
            0.009
        );

        camera = new THREE.PerspectiveCamera(
            window.innerWidth < 600 ? 78 : 72,
            window.innerWidth / window.innerHeight,
            0.1,
            500
        );

        camera.position.set(0, 2.1, 8);
        camera.rotation.order = 'YXZ';
        camera.lookAt(0, 1.8, -20);

        renderer = new THREE.WebGLRenderer({
            antialias: false,
            alpha: false,
            powerPreference: 'high-performance'
        });

        renderer.setPixelRatio(
            Math.min(
                window.devicePixelRatio || 1,
                CONFIG.maxPixelRatio
            )
        );

        renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );

        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.25;

        renderer.shadowMap.enabled = false;

        container.appendChild(renderer.domElement);

        clock = new THREE.Clock();

        createLighting();
        createTerrain();
        createMagicalPath();
        createFlowerSystem();
        createAtmosphere();

        window.addEventListener('resize', handleResize);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        animationStarted = true;

        // Primer render antes de mostrar la bienvenida
        renderer.render(scene, camera);

        prepareWelcome();

        animate();

    } catch (error) {
        console.error('Error al construir el jardín:', error);
        showWebGLError();
    }
}


/* ============================================================
   6. ILUMINACIÓN
============================================================ */

function createLighting() {
    const ambientLight = new THREE.HemisphereLight(
        0xffd5c4,
        0x39452c,
        2.1
    );

    scene.add(ambientLight);

    const sunsetLight = new THREE.DirectionalLight(
        0xffb18b,
        2.4
    );

    sunsetLight.position.set(-25, 35, -55);
    scene.add(sunsetLight);

    const pinkLight = new THREE.PointLight(
        0xff8aaf,
        90,
        120
    );

    pinkLight.position.set(12, 12, -45);
    scene.add(pinkLight);

    const pathLight = new THREE.PointLight(
        0xffd18d,
        35,
        65
    );

    pathLight.position.set(0, 3, -25);
    scene.add(pathLight);
}

/* ============================================================
   ALTURA DEL TERRENO
============================================================ */

function getTerrainHeight(x, z) {
    return (
        -0.18 +
        Math.sin(x * 0.11) * 0.16 +
        Math.cos(z * 0.025) * 0.09 +
        Math.sin((x + z) * 0.07) * 0.04
    );
}

/* ============================================================
   7. TERRENO
============================================================ */

function createTerrain() {
    const geometry = new THREE.PlaneGeometry(
        170,
        CONFIG.terrainLength,
        100,
        180
    );

    const positions = geometry.attributes.position;

    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const localZ = positions.getY(i);
        const worldZ = -localZ - 140;

        positions.setZ(
            i,
            getTerrainHeight(x, worldZ)
        );
    }

    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
        color: 0x526b3d,
        roughness: 1,
        metalness: 0
    });

    const terrain = new THREE.Mesh(geometry, material);

    terrain.rotation.x = -Math.PI / 2;
    terrain.position.set(0, 0, -140);

    scene.add(terrain);
}

/* ============================================================
   8. CAMINO MÁGICO
============================================================ */

function createMagicalPath() {
    function createGroundPlane(width, length, segmentsX, segmentsZ, offset) {
        const geometry = new THREE.PlaneGeometry(
            width,
            length,
            segmentsX,
            segmentsZ
        );

        const positions = geometry.attributes.position;

        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const localZ = positions.getY(i);
            const worldZ = -localZ - 140;

            positions.setZ(
                i,
                getTerrainHeight(x, worldZ) + offset
            );
        }

        geometry.computeVertexNormals();

        const mesh = new THREE.Mesh(
            geometry,
            new THREE.MeshStandardMaterial({
                color: 0x9a765e,
                roughness: 0.95
            })
        );

        mesh.rotation.x = -Math.PI / 2;
        mesh.position.z = -140;

        return mesh;
    }

    const path = createGroundPlane(4.2, 310, 8, 120, 0.045);
    scene.add(path);

    const edgeMaterial = new THREE.MeshBasicMaterial({
        color: 0xffd89b,
        transparent: true,
        opacity: 0.65
    });

    for (const side of [-1, 1]) {
        const edgeGeometry = new THREE.PlaneGeometry(
            0.07,
            310,
            1,
            120
        );

        const positions = edgeGeometry.attributes.position;

        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i) + side * 2.05;
            const localZ = positions.getY(i);
            const worldZ = -localZ - 140;

            positions.setZ(
                i,
                getTerrainHeight(x, worldZ) + 0.07
            );
        }

        edgeGeometry.computeVertexNormals();

        const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);

        edge.rotation.x = -Math.PI / 2;
        edge.position.z = -140;

        scene.add(edge);
    }

    const glowGeometry = new THREE.SphereGeometry(0.12, 8, 6);

    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffd58c
    });

    for (let z = -8; z >= -280; z -= 5) {
        for (const side of [-1, 1]) {
            const x = side * (2.3 + Math.random() * 0.35);

            const light = new THREE.Mesh(
                glowGeometry,
                glowMaterial
            );

            light.position.set(
                x,
                getTerrainHeight(x, z) + 0.18,
                z
            );

            scene.add(light);
        }
    }
}


/* ============================================================
   9. SISTEMA OPTIMIZADO DE FLORES
============================================================ */

/* ============================================================
   GEOMETRÍA 3D DE UN PÉTALO DE TULIPÁN
============================================================ */

function createTulipPetalGeometry() {
    const segmentsWidth = 10;
    const segmentsHeight = 14;

    const vertices = [];
    const indices = [];

    for (let row = 0; row <= segmentsHeight; row++) {
        const v = row / segmentsHeight;

        // El pétalo se ensancha desde la base
        const width =
            0.055 +
            0.43 * Math.sin((Math.PI / 2) * Math.pow(v, 0.8));

        for (let column = 0; column <= segmentsWidth; column++) {
            const u = (column / segmentsWidth) * 2 - 1;

            // Forma más estrecha en la base y redondeada arriba
            const x = u * width;

            // Curvatura de la punta para evitar un corte recto
            const roundedTip =
                0.09 * Math.pow(Math.abs(u), 2.2) *
                Math.pow(v, 5);

            const y = v - roundedTip;

            // Curvatura transversal: crea el efecto de copa
            const z =
                0.025 +
                0.12 * u * u * Math.sin(Math.PI * v) +
                0.025 * Math.sin(Math.PI * v);

            vertices.push(x, y, z);
        }
    }

    for (let row = 0; row < segmentsHeight; row++) {
        for (let column = 0; column < segmentsWidth; column++) {
            const a = row * (segmentsWidth + 1) + column;
            const b = a + 1;
            const c = a + segmentsWidth + 1;
            const d = c + 1;

            indices.push(a, c, b);
            indices.push(b, c, d);
        }
    }

    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(vertices, 3)
    );

    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
}

function createFlowerSystem() {
    const count = CONFIG.flowerCount;
    const PETAL_COUNT = 6;

    const stemGeometry = new THREE.CylinderGeometry(
        0.025,
        0.045,
        1.35,
        7
    );

    const leafGeometry = new THREE.SphereGeometry(
        0.5,
        8,
        8
    );

    const petalGeometry = createTulipPetalGeometry();

    const stemMaterial = new THREE.MeshStandardMaterial({
        color: 0x34733c,
        roughness: 0.85
    });

    const leafMaterial = new THREE.MeshStandardMaterial({
        color: 0x60964a,
        roughness: 0.85
    });

    const stems = new THREE.InstancedMesh(
        stemGeometry,
        stemMaterial,
        count
    );

    const leaves = new THREE.InstancedMesh(
        leafGeometry,
        leafMaterial,
        count * 2
    );

    stems.frustumCulled = false;
    leaves.frustumCulled = false;

    scene.add(stems, leaves);

    const flowers = [];
    const colorCounts = new Array(FLOWER_COLORS.length).fill(0);

    for (let i = 0; i < count; i++) {
        let x;

        do {
            x = (Math.random() - 0.5) * 68;
        } while (Math.abs(x) < 3.3);

        const z = -6 - Math.random() * 160;

        let colorIndex;

        const distance = Math.abs(x);

        if (distance < 12) {
            colorIndex = x < 0 ? 0 : 1;
        } else if (distance < 25) {
            colorIndex = x < 0 ? 2 : 3;
        } else {
            colorIndex = Math.floor(
                Math.random() * FLOWER_COLORS.length
            );
        }

        const flower = {
            x,
            y: getTerrainHeight(x, z),
            z,

            scale: 0.75 + Math.random() * 0.65,

            rotation: Math.random() * Math.PI * 2,

            sway: Math.random() * Math.PI * 2,

            swaySpeed: 0.75 + Math.random() * 0.55,

            swayAmount: 0.07 + Math.random() * 0.055,

            colorIndex,

            petalSlot: colorCounts[colorIndex]++
        };

        flowers.push(flower);
    }

    const petals = FLOWER_COLORS.map((flowerColor, index) => {
        const capacity = colorCounts[index] * PETAL_COUNT;

        const mesh = new THREE.InstancedMesh(
            petalGeometry,
            new THREE.MeshStandardMaterial({
                color: flowerColor.color,
                roughness: 0.68,
                metalness: 0,
                side: THREE.DoubleSide
            }),
            capacity
        );

        mesh.frustumCulled = false;
        scene.add(mesh);

        return mesh;
    });

    flowerSystem = {
        flowers,
        stems,
        leaves,
        petals,
        petalCount: PETAL_COUNT,
        particles: null
    };

    const dummy = new THREE.Object3D();

    for (let i = 0; i < count; i++) {
        writeFlowerMatrices(i, 0, dummy);
    }

    stems.instanceMatrix.needsUpdate = true;
    leaves.instanceMatrix.needsUpdate = true;

    for (const mesh of petals) {
        mesh.instanceMatrix.needsUpdate = true;
    }
}


/* ============================================================
   10. TRANSFORMACIONES DE CADA FLOR
============================================================ */

function writeFlowerMatrices(index, time, dummy) {
    const flower = flowerSystem.flowers[index];

    const {
        x,
        y,
        z,
        scale,
        rotation,
        sway,
        swaySpeed,
        swayAmount,
        colorIndex,
        petalSlot
    } = flower;

    const movement = Math.sin(
        time * swaySpeed + sway
    );

    const swayAngle = movement * swayAmount;

    const topOffset = movement * 0.11 * scale;

    const headY = y + 1.28 * scale;
    const headX = x + topOffset;

    // Tallo
    dummy.position.set(
        x + topOffset * 0.35,
        y + 0.675 * scale,
        z
    );

    dummy.scale.set(
        1,
        scale,
        1
    );

    dummy.rotation.set(
        swayAngle * 0.35,
        rotation,
        swayAngle
    );

    dummy.updateMatrix();

    flowerSystem.stems.setMatrixAt(
        index,
        dummy.matrix
    );

    // Hojas
    for (let leaf = 0; leaf < 2; leaf++) {
        const side = leaf === 0 ? -1 : 1;

        const leafMovement = Math.sin(
            time * swaySpeed * 1.3 + sway + leaf
        ) * 0.12;

        dummy.position.set(
            x + side * 0.19 * scale + topOffset * 0.3,
            y + (0.38 + leaf * 0.13) * scale,
            z + side * 0.035 * scale
        );

        dummy.scale.set(
            0.16 * scale,
            0.48 * scale,
            0.075 * scale
        );

        dummy.rotation.set(
            side * 0.12,
            rotation + leafMovement,
            side * 0.7 + swayAngle * 0.7
        );

        dummy.updateMatrix();

        flowerSystem.leaves.setMatrixAt(
            index * 2 + leaf,
            dummy.matrix
        );
    }

    // Pétalos del tulipán
    const petalMesh = flowerSystem.petals[colorIndex];

    const PETAL_COUNT = flowerSystem.petalCount;

    for (let petal = 0; petal < PETAL_COUNT; petal++) {
        const angle =
            (petal / PETAL_COUNT) * Math.PI * 2 + rotation;

        const petalMovement = swayAngle * 0.8;

        // Cada pétalo se orienta hacia fuera,
        // formando una copa alrededor del centro.
        const radialX = Math.cos(angle);
        const radialZ = Math.sin(angle);

        dummy.position.set(
            headX + radialX * 0.085 * scale,
            headY - 0.015 * scale,
            z + radialZ * 0.085 * scale
        );

        // Ancho, altura y curvatura del pétalo
        dummy.scale.set(
            0.46 * scale,
            0.52 * scale,
            0.55 * scale
        );

        // Orientación radial y ligera inclinación
        dummy.rotation.set(
            0.16 + petalMovement * 0.25,
            Math.PI / 2 - angle,
            0.025 * Math.cos(angle) + swayAngle * 0.25
        );

        dummy.updateMatrix();

        petalMesh.setMatrixAt(
            petalSlot * PETAL_COUNT + petal,
            dummy.matrix
        );
    }
}

/* ============================================================
   11. ANIMACIÓN DEL VIENTO
============================================================ */

function animateFlowers(time) {
    if (!flowerSystem) return;

    const dummy = new THREE.Object3D();

    const cameraZ = camera.position.z;
    const maxDistance = CONFIG.flowerAnimationDistance;

    for (let i = 0; i < flowerSystem.flowers.length; i++) {
        const flower = flowerSystem.flowers[i];

        const distance = Math.abs(flower.z - cameraZ);

        if (distance > maxDistance) {
            continue;
        }

        writeFlowerMatrices(i, time, dummy);
    }

    flowerSystem.stems.instanceMatrix.needsUpdate = true;
    flowerSystem.leaves.instanceMatrix.needsUpdate = true;

    for (const mesh of flowerSystem.petals) {
        mesh.instanceMatrix.needsUpdate = true;
    }
}


/* ============================================================
   12. RECICLAJE DEL JARDÍN
============================================================ */

function recycleGarden() {
    if (!flowerSystem) return;

    // Cuando la cámara completa el recorrido,
    // vuelve al inicio sin crear objetos nuevos.
    if (camera.position.z < -CONFIG.recycleDistance) {
        camera.position.z += CONFIG.recycleDistance;

        for (const flower of flowerSystem.flowers) {
            flower.z += CONFIG.recycleDistance;
            flower.y = getTerrainHeight(flower.x, flower.z);
        }

        // Actualizar todas las matrices una sola vez.
        const dummy = new THREE.Object3D();

        for (let i = 0; i < flowerSystem.flowers.length; i++) {
            writeFlowerMatrices(i, elapsedTime, dummy);
        }

        flowerSystem.stems.instanceMatrix.needsUpdate = true;
        flowerSystem.leaves.instanceMatrix.needsUpdate = true;

        for (const mesh of flowerSystem.petals) {
            mesh.instanceMatrix.needsUpdate = true;
        }
    }
}


/* ============================================================
   13. ATMÓSFERA: POLVO, LUCIÉRNAGAS Y PÉTALOS
============================================================ */

// Textura radial para dar a las luciérnagas un brillo suave
function createGlowTexture() {
    const canvas = document.createElement('canvas');

    canvas.width = 64;
    canvas.height = 64;

    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(
        32, 32, 0,
        32, 32, 32
    );

    gradient.addColorStop(0, 'rgba(255,255,230,1)');
    gradient.addColorStop(0.12, 'rgba(255,240,170,0.95)');
    gradient.addColorStop(0.35, 'rgba(255,210,110,0.45)');
    gradient.addColorStop(1, 'rgba(255,190,90,0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);

    texture.colorSpace = THREE.SRGBColorSpace;

    return texture;
}


// Geometría de un pétalo individual
function createFlyingPetalGeometry() {
    const widthSegments = 8;
    const heightSegments = 12;

    const vertices = [];
    const indices = [];

    for (let row = 0; row <= heightSegments; row++) {
        const v = row / heightSegments;

        for (let column = 0; column <= widthSegments; column++) {
            const u = column / widthSegments * 2 - 1;

            // Silueta estrecha en los extremos y ancha en el centro
            const width = 0.19 * Math.pow(
                Math.sin(Math.PI * v),
                0.75
            );

            const x = u * width;

            const y = v - 0.5;

            // Curvatura suave para que no parezca una lámina plana
            const z =
                0.055 * (1 - u * u) +
                0.035 * Math.sin(Math.PI * v);

            vertices.push(x, y, z);
        }
    }

    for (let row = 0; row < heightSegments; row++) {
        for (let column = 0; column < widthSegments; column++) {
            const a = row * (widthSegments + 1) + column;
            const b = a + 1;
            const c = a + widthSegments + 1;
            const d = c + 1;

            indices.push(a, c, b);
            indices.push(b, c, d);
        }
    }

    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(vertices, 3)
    );

    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
}


function createAtmosphere() {
    /* --------------------------------------------------------
       A. POLVO AMBIENTAL
       -------------------------------------------------------- */

    const dustCount = 65;

    const dustPositions = new Float32Array(dustCount * 3);

    for (let i = 0; i < dustCount; i++) {
        dustPositions[i * 3] =
            (Math.random() - 0.5) * 65;

        dustPositions[i * 3 + 1] =
            Math.random() * 18 + 1;

        dustPositions[i * 3 + 2] =
            -Math.random() * 180;
    }

    const dustGeometry = new THREE.BufferGeometry();

    dustGeometry.setAttribute(
        'position',
        new THREE.BufferAttribute(dustPositions, 3)
    );

    const dustMaterial = new THREE.PointsMaterial({
        color: 0xffe4c1,
        size: 0.11,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        sizeAttenuation: true
    });

    const dust = new THREE.Points(
        dustGeometry,
        dustMaterial
    );

    scene.add(dust);


    /* --------------------------------------------------------
       B. LUCIÉRNAGAS
       -------------------------------------------------------- */

    const fireflyCount = CONFIG.fireflyCount;

    const fireflyPositions = new Float32Array(
        fireflyCount * 3
    );

    const fireflyColors = new Float32Array(
        fireflyCount * 3
    );

    const fireflies = [];

    for (let i = 0; i < fireflyCount; i++) {
        const x = (Math.random() - 0.5) * 28;

        const y = 0.5 + Math.random() * 5;

        const z = camera.position.z - 5 - Math.random() * 55;

        fireflyPositions[i * 3] = x;
        fireflyPositions[i * 3 + 1] = y;
        fireflyPositions[i * 3 + 2] = z;

        fireflyColors[i * 3] = 1;
        fireflyColors[i * 3 + 1] = 0.8;
        fireflyColors[i * 3 + 2] = 0.4;

        fireflies.push({
            phase: Math.random() * Math.PI * 2,

            speed: 0.6 + Math.random() * 1.2,

            drift: 0.15 + Math.random() * 0.3,

            baseX: x,
            baseY: y,

            size: 0.6 + Math.random() * 0.8
        });
    }

    const fireflyGeometry = new THREE.BufferGeometry();

    fireflyGeometry.setAttribute(
        'position',
        new THREE.BufferAttribute(fireflyPositions, 3)
    );

    fireflyGeometry.setAttribute(
        'color',
        new THREE.BufferAttribute(fireflyColors, 3)
    );

    const glowTexture = createGlowTexture();

    const fireflyMaterial = new THREE.PointsMaterial({
        map: glowTexture,
        color: 0xffffff,
        size: 0.65,
        transparent: true,
        opacity: 0.95,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true
    });

    const fireflyMesh = new THREE.Points(
        fireflyGeometry,
        fireflyMaterial
    );

    fireflyMesh.frustumCulled = false;

    scene.add(fireflyMesh);


    /* --------------------------------------------------------
       C. PÉTALOS FLOTANTES
       -------------------------------------------------------- */

    const petalCount = CONFIG.flyingPetalCount;

    const petalGeometry = createFlyingPetalGeometry();

    // Cada pétalo tendrá uno de los colores de los tulipanes
    const petalMaterials = FLOWER_COLORS.map((flowerColor) => {
        return new THREE.MeshStandardMaterial({
            color: flowerColor.color,
            roughness: 0.72,
            metalness: 0,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.94,
            depthWrite: false
        });
    });

    // Una instancia independiente por color
    const petalMeshes = petalMaterials.map((material) => {
        const mesh = new THREE.InstancedMesh(
            petalGeometry,
            material,
            petalCount
        );

        mesh.frustumCulled = false;

        scene.add(mesh);

        return mesh;
    });

    const flyingPetals = [];

    for (let i = 0; i < petalCount; i++) {
        flyingPetals.push({
            x: (Math.random() - 0.5) * 18,

            y: 1 + Math.random() * 5,

            z: camera.position.z - 8 - Math.random() * 48,

            fallSpeed: 0.12 + Math.random() * 0.2,

            driftSpeed: 0.15 + Math.random() * 0.25,

            rotationX: Math.random() * Math.PI * 2,
            rotationY: Math.random() * Math.PI * 2,
            rotationZ: Math.random() * Math.PI * 2,

            rotationSpeed: 0.4 + Math.random() * 1.1,

            phase: Math.random() * Math.PI * 2,

            scale: 0.55 + Math.random() * 0.65,

            // Elegir aleatoriamente uno de los seis colores
            colorIndex: Math.floor(
                Math.random() * FLOWER_COLORS.length
            )
        });
    }


    /* --------------------------------------------------------
       D. GUARDAR LOS SISTEMAS
       -------------------------------------------------------- */

    effectsSystem = {
        dust,

        fireflyMesh,
        fireflies,

        fireflyPositions,
        fireflyColors,

        flyingPetals,
        petalMeshes,


        petalDummy: new THREE.Object3D()
    };

    // Posicionar los pétalos desde el primer render
    updateFlyingPetals(0, 0);
}

/* ============================================================
   13.1 ANIMACIÓN DE LUCIÉRNAGAS
============================================================ */

function updateFireflies(time, delta) {
    if (!effectsSystem) return;

    const {
        fireflies,
        fireflyPositions,
        fireflyColors,
        fireflyMesh
    } = effectsSystem;

    const cameraZ = camera.position.z;

    for (let i = 0; i < fireflies.length; i++) {
        const firefly = fireflies[i];

        // Movimiento flotante, suave y ligeramente irregular
        const movementX = Math.sin(
            time * firefly.speed + firefly.phase
        );

        const movementY = Math.sin(
            time * firefly.speed * 0.8 + firefly.phase * 1.7
        );

        let x = firefly.baseX + movementX * firefly.drift;

        let y = firefly.baseY + movementY * 0.3;

        let z = fireflyPositions[i * 3 + 2];

        // Reciclar las luces cuando quedan detrás de la cámara
        if (z > cameraZ + 4) {
            firefly.baseX = (Math.random() - 0.5) * 28;
            firefly.baseY = 0.5 + Math.random() * 5;

            z = cameraZ - 35 - Math.random() * 30;

            fireflyPositions[i * 3 + 2] = z;
        }

        fireflyPositions[i * 3] = x;
        fireflyPositions[i * 3 + 1] = y;

        // Parpadeo orgánico: no todas se iluminan al mismo tiempo
        const pulse = Math.max(
            0,
            Math.sin(time * firefly.speed + firefly.phase)
        );

        const flicker =
            0.12 + Math.pow(pulse, 2.5) * 0.88;

        fireflyColors[i * 3] = flicker;
        fireflyColors[i * 3 + 1] = flicker * 0.78;
        fireflyColors[i * 3 + 2] = flicker * 0.38;
    }

    fireflyMesh.geometry.attributes.position.needsUpdate = true;
    fireflyMesh.geometry.attributes.color.needsUpdate = true;
}


/* ============================================================
   13.2 ANIMACIÓN DE PÉTALOS
============================================================ */

function updateFlyingPetals(time, delta) {
    if (!effectsSystem) return;

    const {
        flyingPetals,
        petalMeshes,
        petalDummy: dummy
    } = effectsSystem;

    const cameraZ = camera.position.z;

    // Contadores independientes para cada color
    const colorSlots = new Array(
        FLOWER_COLORS.length
    ).fill(0);

    for (let i = 0; i < flyingPetals.length; i++) {
        const petal = flyingPetals[i];

        // Caída y desplazamiento por el viento
        petal.y -= petal.fallSpeed * delta;

        petal.x += (
            Math.sin(time * 0.7 + petal.phase) *
            petal.driftSpeed
        ) * delta;

        petal.z += Math.sin(
            time * 0.35 + petal.phase
        ) * 0.12 * delta;

        // Rotación natural
        petal.rotationX += petal.rotationSpeed * delta;
        petal.rotationY += petal.rotationSpeed * 0.65 * delta;
        petal.rotationZ += petal.rotationSpeed * 0.8 * delta;

        const terrainHeight = getTerrainHeight(
            petal.x,
            petal.z
        );

        // Reciclar el pétalo
        if (
            petal.y < terrainHeight + 0.35 ||
            petal.z > cameraZ + 4 ||
            Math.abs(petal.x) > 13
        ) {
            petal.x = (Math.random() - 0.5) * 18;

            petal.y = 3 + Math.random() * 4;

            petal.z = cameraZ - 35 - Math.random() * 30;

            petal.phase = Math.random() * Math.PI * 2;
        }

        const flutter = Math.sin(
            time * 2.2 + petal.phase
        ) * 0.25;

        dummy.position.set(
            petal.x,
            petal.y,
            petal.z
        );

        dummy.scale.set(
            petal.scale,
            petal.scale * 1.3,
            petal.scale
        );

        dummy.rotation.set(
            petal.rotationX + flutter,
            petal.rotationY,
            petal.rotationZ
        );

        dummy.updateMatrix();

        const colorIndex = petal.colorIndex;

        petalMeshes[colorIndex].setMatrixAt(
            colorSlots[colorIndex],
            dummy.matrix
        );

        colorSlots[colorIndex]++;
    }

    // Actualizar las matrices de cada color
    for (let i = 0; i < petalMeshes.length; i++) {
        petalMeshes[i].count = colorSlots[i];

        petalMeshes[i].instanceMatrix.needsUpdate = true;
    }
}


/* ============================================================
   13.3 ACTUALIZAR TODOS LOS EFECTOS
============================================================ */

function updateEffects(time, delta) {
    if (!effectsSystem) return;

    updateFireflies(time, delta);
    updateFlyingPetals(time, delta);

    // Movimiento casi imperceptible del polvo ambiental
    effectsSystem.dust.rotation.y =
        Math.sin(time * 0.1) * 0.025;
}


/* ============================================================
   14. MOVIMIENTO DE LA CÁMARA
============================================================ */

function updateCamera(delta, time) {
    if (!experienceStarted) return;

    const speed = isFinalScene
        ? CONFIG.walkingSpeed * 0.25
        : CONFIG.walkingSpeed;

    camera.position.z -= speed * delta * 60;

    const movement = Math.sin(time * 2.5);

    camera.position.y =
        2.1 + movement * CONFIG.walkingAmplitude;

    camera.position.x = Math.sin(time * 0.65) * 0.09;

    camera.rotation.x =
        -0.015 + Math.sin(time * 1.1) * 0.008;

    camera.rotation.z = Math.sin(time * 0.65) * 0.003;

    recycleGarden();
}


/* ============================================================
   15. BUCLE PRINCIPAL
============================================================ */

function animate() {
    if (!animationStarted || !pageVisible) return;

    requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.05);

    elapsedTime += delta;

    updateCamera(delta, elapsedTime);

    flowerAnimationAccumulator += delta;

    // Actualizar flores a 30 FPS, aunque el renderizado
    // de la escena pueda continuar a 60 FPS.

    if (
        flowerAnimationAccumulator >=
        CONFIG.flowerAnimationInterval
    ) {
        flowerAnimationAccumulator = 0;

        animateFlowers(elapsedTime);

        updateEffects(
            elapsedTime,
            CONFIG.flowerAnimationInterval
        );
    }

    renderer.render(scene, camera);
}


/* ============================================================
   16. REDIMENSIONAMIENTO
============================================================ */

function handleResize() {
    if (!camera || !renderer) return;

    clearTimeout(resizeTimer);

    resizeTimer = setTimeout(() => {
        camera.aspect = window.innerWidth / window.innerHeight;

        camera.fov = window.innerWidth < 600 ? 78 : 72;

        camera.updateProjectionMatrix();

        renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );

        renderer.setPixelRatio(
            Math.min(
                window.devicePixelRatio || 1,
                CONFIG.maxPixelRatio
            )
        );
    }, 100);
}


/* ============================================================
   17. VISIBILIDAD DE LA PÁGINA
============================================================ */

function handleVisibilityChange() {
    pageVisible = !document.hidden;

    if (pageVisible) {
        clock.getDelta();
        animate();
    }
}


/* ============================================================
   18. PANTALLA DE CARGA
============================================================ */

function prepareWelcome() {
    loadingProgress.style.width = '100%';
    loadingPercentage.textContent = '100%';

    setTimeout(() => {
        loadingScreen.classList.add('hidden');
        welcomeScreen.classList.remove('hidden');
        audioControls.classList.remove('hidden');
    }, 700);
}


/* ============================================================
   19. ERROR WEBGL
============================================================ */

function showWebGLError() {
    loadingScreen.classList.add('hidden');
    welcomeScreen.classList.add('hidden');

    $('webgl-error').classList.remove('hidden');
}


/* ============================================================
   20. MENSAJES
============================================================ */

const messages = [
    {
        text: "Feliz cumpleaños, Emy netita. Espero que pases realmente un lindo día, hoy y siempre.",
        photo: "./img/foto1.webp"
    },
    {
        text: "Gracias por estar junto a mí durante todos estos años.",
        photo: "./img/foto2.webp"
    },
    {
        text: "Sabes bien el cariño y amor que tengo por ti y siempre va ser así ❤️",
        photo: "./img/foto3.webp"
    },
    {
        text: "A veces peleamos, discutimos o no pasamos mucho tiempo juntos...",
        photo: "./img/foto4.webp"
    },
    {
        text: "Pero cada momento que compartimos me hace muy feliz.",
        photo: "./img/foto5.webp"
    },
    {
        text: "Te quiero mucho. ❤️",
        photo: "./img/foto6.webp"
    }
];

function showMessage(index) {
    if (index >= messages.length) {
        showFinalScene();
        return;
    }

    const currentMessage = messages[index];

    messageText.classList.remove('visible');
    messagePhoto.classList.remove('loaded');

    messagePhoto.onload = () => {
        messagePhoto.classList.add('loaded');
    };

    messagePhoto.onerror = () => {
        console.warn('No se pudo cargar:', currentMessage.photo);
    };

    messageText.textContent = currentMessage.text;
    messagePhoto.src = currentMessage.photo;

    requestAnimationFrame(() => {
        messageText.classList.add('visible');
    });

    messageTimer = setTimeout(() => {
        messageText.classList.remove('visible');
        messagePhoto.classList.remove('loaded');

        messageTransitionTimer = setTimeout(() => {
            showMessage(index + 1);
        }, 1000);

    }, 7000);
}


/* ============================================================
   21. ESCENA FINAL
============================================================ */

function showFinalScene() {
    clearTimeout(messageTimer);
    clearTimeout(messageTransitionTimer);

    messageScreen.classList.add('hidden');
    finalScreen.classList.remove('hidden');

    finalPhoto.onload = () => {
        finalPhoto.classList.add('loaded');
    };

    finalPhoto.onerror = () => {
        console.warn('No se pudo cargar la fotografía final.');
    };

    if (finalPhoto.complete && finalPhoto.naturalWidth > 0) {
        finalPhoto.classList.add('loaded');
    }

    isFinalScene = true;
}


/* ============================================================
   22. INICIAR EXPERIENCIA
============================================================ */

function startExperience() {
    if (experienceStarted) return;

    experienceStarted = true;

    welcomeScreen.classList.add('hidden');
    messageScreen.classList.remove('hidden');

    audio.volume = Number(volumeControl.value);

    audio.play().then(() => {
        audioIcon.textContent = '♫';
    }).catch(() => {
        console.log('La música requiere interacción del usuario.');
    });

    showMessage(0);
}


/* ============================================================
   23. CONTROLES DE AUDIO
============================================================ */

audioToggle.addEventListener('click', () => {
    if (audio.paused) {
        audio.play().then(() => {
            audioIcon.textContent = '♫';
        }).catch(() => {
            audioIcon.textContent = '×';
        });
    } else {
        audio.pause();
        audioIcon.textContent = '×';
    }
});

volumeControl.addEventListener('input', () => {
    audio.volume = Number(volumeControl.value);
});


/* ============================================================
   24. EVENTOS
============================================================ */

startButton.addEventListener('click', startExperience);


/* ============================================================
   25. INICIAR
============================================================ */

initializeGarden();
