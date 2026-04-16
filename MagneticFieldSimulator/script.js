// Constants & Globals
const MU_0 = 4 * Math.PI * 1e-7; // Permeability of free space
const EPSILON_0 = 8.854e-12; // Permittivity of free space
let isInductorMode = true; // true = Inductor, false = Capacitor

// DOM Elements
const navbar = document.getElementById('navbar');
const modeToggle = document.getElementById('mode-toggle');
const labelInductor = document.getElementById('label-inductor');
const labelCapacitor = document.getElementById('label-capacitor');

const slider1 = document.getElementById('val-1'); // I or V
const slider2 = document.getElementById('val-2'); // N or Area
const slider3 = document.getElementById('val-3'); // l or distance

const out1 = document.getElementById('out-1');
const out2 = document.getElementById('out-2');
const out3 = document.getElementById('out-3');

const lbl1 = document.getElementById('lbl-1');
const lbl2 = document.getElementById('lbl-2');
const lbl3 = document.getElementById('lbl-3');

const unit1 = document.getElementById('unit-1');
const unit2 = document.getElementById('unit-2');
const unit3 = document.getElementById('unit-3');

const bValDisplay = document.getElementById('b-val');
const wValDisplay = document.getElementById('w-val');
const formulaDisplay = document.getElementById('formula-display');
const graphXLabel = document.getElementById('graph-x-lbl');

const BFieldDisplayCont = document.querySelector('.B-field-display');

// --- SCROLL EFFECT ---
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// --- STATE MANAGEMENT ---
const state = {
    inductor: {
        I: 5, N: 500, l: 0.5, area: 0.01
    },
    capacitor: {
        V: 5, A: 0.1, d: 0.01 // Area in m^2, d in m
    }
};

function updateLabels() {
    if (isInductorMode) {
        lbl1.innerText = "Current (I)"; unit1.innerText = "A";
        lbl2.innerText = "Turns (N)"; unit2.innerText = "";
        lbl3.innerText = "Length (l)"; unit3.innerText = "m";
        
        slider1.min = 0; slider1.max = 10; slider1.step = 0.1; slider1.value = state.inductor.I;
        slider2.min = 10; slider2.max = 1000; slider2.step = 10; slider2.value = state.inductor.N;
        slider3.min = 0.1; slider3.max = 2; slider3.step = 0.1; slider3.value = state.inductor.l;
        
        formulaDisplay.innerText = "W = ½ L I²";
        BFieldDisplayCont.innerHTML = `<span>B-Field:</span><strong id="b-val" class="neon-text">0.00</strong> <small>T</small>`;
        graphXLabel.innerText = "Current (A)";
        document.documentElement.style.setProperty('--primary', '#0ea5e9');
        document.documentElement.style.setProperty('--primary-glow', 'rgba(14, 165, 233, 0.6)');
    } else {
        lbl1.innerText = "Voltage (V)"; unit1.innerText = "V";
        lbl2.innerText = "Area (A)"; unit2.innerText = "m²";
        lbl3.innerText = "Distance (d)"; unit3.innerText = "m";
        
        slider1.min = 0; slider1.max = 100; slider1.step = 1; slider1.value = state.capacitor.V;
        slider2.min = 0.01; slider2.max = 1; slider2.step = 0.01; slider2.value = state.capacitor.A;
        slider3.min = 0.001; slider3.max = 0.05; slider3.step = 0.001; slider3.value = state.capacitor.d;
        
        formulaDisplay.innerText = "W = ½ C V²";
        BFieldDisplayCont.innerHTML = `<span>E-Field:</span><strong id="b-val" class="neon-text" style="color:var(--secondary)">0.00</strong> <small>V/m</small>`;
        graphXLabel.innerText = "Voltage (V)";
        document.documentElement.style.setProperty('--primary', '#8b5cf6'); /* Purple for capacitor */
        document.documentElement.style.setProperty('--primary-glow', 'rgba(139, 92, 246, 0.6)');
    }
    updateCalculations();
}

function resetParticles() {
    if (!particles) return;
    const posLine = particles.geometry.attributes.position.array;
    for (let i = 0; i < particleCount * 3; i += 3) {
        if (isInductorMode) {
            posLine[i] = (Math.random() - 0.5) * 10;
            posLine[i+1] = (Math.random() - 0.5) * 5;
            posLine[i+2] = (Math.random() - 0.5) * 5;
        } else {
            posLine[i] = (Math.random() - 0.5) * 3;
            posLine[i+1] = (Math.random() - 0.5) * 3;
            posLine[i+2] = (Math.random() - 0.5) * 3;
        }
    }
    particles.geometry.attributes.position.needsUpdate = true;
}

modeToggle.addEventListener('change', (e) => {
    isInductorMode = !e.target.checked;
    if (isInductorMode) {
        labelInductor.classList.add('active');
        labelCapacitor.classList.remove('active');
    } else {
        labelCapacitor.classList.add('active');
        labelInductor.classList.remove('active');
    }
    updateLabels();
    resetParticles();
});

[slider1, slider2, slider3].forEach((slider, index) => {
    slider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (index === 0) { out1.innerText = val; isInductorMode ? state.inductor.I = val : state.capacitor.V = val;}
        if (index === 1) { out2.innerText = val.toFixed(isInductorMode ? 0 : 2); isInductorMode ? state.inductor.N = val : state.capacitor.A = val;}
        if (index === 2) { out3.innerText = val.toFixed(isInductorMode ? 1 : 3); isInductorMode ? state.inductor.l = val : state.capacitor.d = val;}
        updateCalculations();
    });
});

// --- CHART.JS ---
const ctx = document.getElementById('energyChart').getContext('2d');
let energyChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Stored Energy (Joules)',
            data: [],
            borderColor: '#0ea5e9',
            backgroundColor: 'rgba(14, 165, 233, 0.2)',
            borderWidth: 2,
            fill: true,
            tension: 0.4
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#94a3b8' } },
            y: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#94a3b8' } }
        },
        plugins: {
            legend: { display: false }
        }
    }
});

function drawGraph(maxVal) {
    const labels = [];
    const data = [];
    const steps = 20;

    for (let i = 0; i <= steps; i++) {
        let currentX = (i / steps) * maxVal;
        labels.push(currentX.toFixed(1));
        
        let w = 0;
        if (isInductorMode) {
            let L = (MU_0 * Math.pow(state.inductor.N, 2) * state.inductor.area) / state.inductor.l;
            w = 0.5 * L * Math.pow(currentX, 2);
        } else {
            let C = (EPSILON_0 * state.capacitor.A) / state.capacitor.d;
            w = 0.5 * C * Math.pow(currentX, 2);
        }
        data.push(w);
    }

    energyChart.data.labels = labels;
    energyChart.data.datasets[0].data = data;
    energyChart.data.datasets[0].borderColor = isInductorMode ? '#0ea5e9' : '#8b5cf6';
    energyChart.data.datasets[0].backgroundColor = isInductorMode ? 'rgba(14, 165, 233, 0.2)' : 'rgba(139, 92, 246, 0.2)';
    energyChart.update();
}

// --- CALCULATIONS & THREE.JS LOGIC LINK ---
function updateCalculations() {
    out1.innerText = slider1.value;
    out2.innerText = slider2.value;
    out3.innerText = slider3.value;

    let displayField = 0;
    let W = 0;

    if (isInductorMode) {
        let I = state.inductor.I;
        let N = state.inductor.N;
        let l = state.inductor.l;
        
        let B = MU_0 * (N / l) * I; // in Tesla
        displayField = B * 1000; // Display in mT for readable numbers
        
        let L = (MU_0 * Math.pow(N, 2) * state.inductor.area) / l;
        W = 0.5 * L * Math.pow(I, 2);
        
        if (typeof coil !== 'undefined') {
            const baseTurns = N / 20; 
            const baseLength = l * 8; 
            coil.geometry.dispose();
            const path = new HelixCurve(1.5, baseTurns, baseLength);
            coil.geometry = new THREE.TubeGeometry(path, 200, 0.1, 8, false);
            window.inductorBounds = baseLength / 2 + 1;
        }

        if (typeof particles !== 'undefined' && particles) particles.material.color.setHex(0x0ea5e9);
        fieldIntensity = I / 10;
        drawGraph(10);
    } else {
        let V = state.capacitor.V;
        let A = state.capacitor.A;
        let d = state.capacitor.d;
        
        let E = V / d; // V/m
        displayField = E;
        
        let C = (EPSILON_0 * A) / d;
        W = 0.5 * C * Math.pow(V, 2);
        
        if (typeof plate1 !== 'undefined' && plate2 !== 'undefined') {
            const dist = d * 50; 
            plate1.position.x = -dist;
            plate2.position.x = dist;
            
            const rad = Math.sqrt(A) * 3;
            plate1.scale.set(rad, 1, rad);
            plate2.scale.set(rad, 1, rad);
            
            window.capDist = dist;
            window.capRad = rad * 2; // base radius is 2
        }

        if (typeof particles !== 'undefined' && particles) particles.material.color.setHex(0x8b5cf6);
        fieldIntensity = V / 100;
        drawGraph(100);
    }
    
    document.getElementById('b-val').innerText = isInductorMode ? displayField.toFixed(2) + "m" : displayField.toFixed(0);
    
    // Scale W representation, sometimes it is very small. Format scientifically if very small
    let wText = W < 0.001 && W > 0 ? W.toExponential(2) : W.toFixed(4);
    wValDisplay.innerText = wText;
}

// --- THREE.JS SIMULATION ---
const canvasContainer = document.getElementById('threejs-canvas');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, canvasContainer.clientWidth / canvasContainer.clientHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
canvasContainer.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enableZoom = false;

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const pointLight = new THREE.PointLight(0x0ea5e9, 2, 50);
pointLight.position.set(5, 5, 5);
scene.add(pointLight);

// The Coil
class HelixCurve extends THREE.Curve {
    constructor(radius, turns, height) {
        super();
        this.radius = radius;
        this.turns = turns;
        this.height = height;
    }
    getPoint(t, optionalTarget = new THREE.Vector3()) {
        const angle = 2 * Math.PI * this.turns * t;
        const x = this.radius * Math.cos(angle);
        const y = this.height * (t - 0.5);
        const z = this.radius * Math.sin(angle);
        return optionalTarget.set(x, y, z);
    }
}

const path = new HelixCurve(1.5, 10, 4);
const geometry = new THREE.TubeGeometry(path, 200, 0.1, 8, false);
const material = new THREE.MeshStandardMaterial({ 
    color: 0xcccccc, 
    metalness: 0.8, 
    roughness: 0.2,
    transparent: true,
    opacity: 0.5
});
const coil = new THREE.Mesh(geometry, material);
coil.rotation.z = Math.PI / 2; // Lie flat
scene.add(coil);

// Capacitor Plates (Hidden initially)
const plateGeo = new THREE.CylinderGeometry(2, 2, 0.2, 32);
const plateMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.9 });
const plate1 = new THREE.Mesh(plateGeo, plateMat);
const plate2 = new THREE.Mesh(plateGeo, plateMat);
plate1.position.x = -1.5; plate1.rotation.z = Math.PI/2;
plate2.position.x = 1.5; plate2.rotation.z = Math.PI/2;
scene.add(plate1);
scene.add(plate2);
plate1.visible = false;
plate2.visible = false;

// Particles for Field Lines
const particleCount = 1000;
const pGeo = new THREE.BufferGeometry();
const pPos = new Float32Array(particleCount * 3);
for(let i=0; i<particleCount*3; i++) {
    pPos[i] = (Math.random() - 0.5) * 10;
}
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
const pMat = new THREE.PointsMaterial({
    color: 0x0ea5e9,
    size: 0.1,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending
});
const particles = new THREE.Points(pGeo, pMat);
scene.add(particles);

camera.position.z = 8;
camera.position.y = 2;

let fieldIntensity = 0.5; // 0 to 1

function animate() {
    requestAnimationFrame(animate);
    controls.update();

    // Toggle visibility based on mode
    if(isInductorMode) {
        coil.visible = true;
        plate1.visible = false;
        plate2.visible = false;
        
        // Magnetic field animation (toroidal flow)
        let speed = 0.02 + 0.15 * fieldIntensity;
        let bounds = window.inductorBounds || 5;
        const posLine = particles.geometry.attributes.position.array;
        for(let i=0; i<particleCount; i++) {
            let x = posLine[i*3];
            let y = posLine[i*3+1];
            let z = posLine[i*3+2];
            
            // simple flow logic inside coil and looping outside
            x += speed;
            if(x > bounds) {
                x = -bounds;
                y = (Math.random() - 0.5) * 5;
                z = (Math.random() - 0.5) * 5;
            }
            
            posLine[i*3] = x;
            posLine[i*3+1] = y;
            posLine[i*3+2] = z;
        }
        particles.geometry.attributes.position.needsUpdate = true;
    } else {
        coil.visible = false;
        plate1.visible = true;
        plate2.visible = true;
        
        // Electric field animation (straight lines between plates)
        let speed = 0.01 + 0.08 * fieldIntensity;
        let pdist = window.capDist || 1.5;
        let prad = window.capRad || 1.8;
        const posLine = particles.geometry.attributes.position.array;
        for(let i=0; i<particleCount; i++) {
            let x = posLine[i*3];
            let y = posLine[i*3+1];
            let z = posLine[i*3+2];
            
            x += speed;
            if(x > pdist) {
                x = -pdist;
                y = (Math.random() - 0.5) * prad * 2;
                z = (Math.random() - 0.5) * prad * 2;
            }
            if(Math.sqrt(y*y + z*z) > prad) {
                y = (Math.random() - 0.5) * prad * 2;
                z = (Math.random() - 0.5) * prad * 2;
            }
            
            posLine[i*3] = x;
            posLine[i*3+1] = y;
            posLine[i*3+2] = z;
        }
        particles.geometry.attributes.position.needsUpdate = true;
    }

    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = canvasContainer.clientWidth / canvasContainer.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
});


// --- QUIZ LOGIC ---
const quizData = [
    {
        q: "Where is magnetic energy stored in an inductor?",
        opts: ["In the conducting wire", "In the magnetic field", "In the battery", "It dissipates as heat"],
        a: 1
    },
    {
        q: "How does the magnetic energy stored in a solenoid depend on the current (I)?",
        opts: ["Linearly proportional to I", "Inversely proportional to I", "Proportional to the square of I (I²)", "Independent of I"],
        a: 2
    },
    {
        q: "Which property is the electric equivalent of Inductance (L) for storing energy?",
        opts: ["Resistance (R)", "Voltage (V)", "Current (I)", "Capacitance (C)"],
        a: 3
    },
    {
        q: "What effect does doubling the number of turns (N) have on the magnetic field B?",
        opts: ["B remains the same", "B is halved", "B is quadrupled", "B is doubled"],
        a: 3
    }
];

let currentQ = 0;
const quizWrapper = document.getElementById('quiz-wrapper');
const progressDisplay = document.getElementById('quiz-progress');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');

function renderQuiz() {
    quizWrapper.innerHTML = '';
    const qData = quizData[currentQ];
    
    // Creating elements
    const questionEl = document.createElement('div');
    questionEl.className = 'question';
    questionEl.innerText = `${currentQ + 1}. ${qData.q}`;
    
    const optionsEl = document.createElement('div');
    optionsEl.className = 'options';
    
    const feedbackEl = document.createElement('div');
    feedbackEl.className = 'feedback';
    
    qData.opts.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'btn option-btn';
        btn.innerText = opt;
        btn.onclick = () => {
            // Disable all buttons
            Array.from(optionsEl.children).forEach(b => b.style.pointerEvents = 'none');
            
            if(idx === qData.a) {
                btn.classList.add('correct');
                feedbackEl.innerHTML = '<span style="color:#10b981"><i class="fa-solid fa-check"></i> Correct!</span>';
            } else {
                btn.classList.add('wrong');
                optionsEl.children[qData.a].classList.add('correct');
                feedbackEl.innerHTML = '<span style="color:#ef4444"><i class="fa-solid fa-xmark"></i> Incorrect. The right answer is highlighted.</span>';
            }
        };
        optionsEl.appendChild(btn);
    });
    
    quizWrapper.appendChild(questionEl);
    quizWrapper.appendChild(optionsEl);
    quizWrapper.appendChild(feedbackEl);
    
    progressDisplay.innerText = `${currentQ + 1} / ${quizData.length}`;
    
    prevBtn.disabled = currentQ === 0;
    nextBtn.innerText = currentQ === quizData.length - 1 ? "Finish" : "Next";
}

prevBtn.addEventListener('click', () => {
    if(currentQ > 0) { currentQ--; renderQuiz(); }
});

nextBtn.addEventListener('click', () => {
    if(currentQ < quizData.length - 1) { 
        currentQ++; 
        renderQuiz(); 
    } else {
        quizWrapper.innerHTML = '<div style="text-align:center"><h3>Quiz Completed! 🎉</h3><p>Review the theory section if you need to brush up on the concepts!</p></div>';
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
        progressDisplay.style.display = 'none';
    }
});

// Initialization
updateLabels();
renderQuiz();
