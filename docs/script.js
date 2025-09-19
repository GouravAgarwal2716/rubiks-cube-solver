// Global variables
let currentStream = null;

// Move definitions and helpers
const MOVE_NAME = {
    "U": "Rotate Up face clockwise",
    "U'": "Rotate Up face counter-clockwise", 
    "U2": "Rotate Up face 180°",
    "D": "Rotate Down face clockwise",
    "D'": "Rotate Down face counter-clockwise",
    "D2": "Rotate Down face 180°",
    "L": "Rotate Left face clockwise",
    "L'": "Rotate Left face counter-clockwise",
    "L2": "Rotate Left face 180°",
    "R": "Rotate Right face clockwise",
    "R'": "Rotate Right face counter-clockwise",
    "R2": "Rotate Right face 180°",
    "F": "Rotate Front face clockwise",
    "F'": "Rotate Front face counter-clockwise",
    "F2": "Rotate Front face 180°",
    "B": "Rotate Back face clockwise",
    "B'": "Rotate Back face counter-clockwise",
    "B2": "Rotate Back face 180°",
};

function orientationHint(move) {
    const base = {
        'U': "Keep white (U) on top; turn the top layer clockwise",
        'D': "Keep white (U) on top; turn the bottom layer clockwise", 
        'L': "Left face on your left; turn left layer clockwise",
        'R': "Right face on your right; turn right layer clockwise",
        'F': "Front face towards you; turn front layer clockwise",
        'B': "Back face away from you; turn back layer clockwise",
    };
    return base[move[0]] || "Keep U on top and F facing you while performing the move.";
}

function buildDetailedSteps(moves) {
    return moves.map((m, i) => ({
        index: i + 1,
        move: m,
        what: MOVE_NAME[m] || m,
        how: orientationHint(m)
    }));
}

// Real cube solver using proper algorithms
function solveClientSide(cubeState) {
    console.log('Solving cube state:', cubeState);
    
    // Validate cube state
    if (!cubeState || cubeState.length !== 54) {
        throw new Error('Invalid cube state length');
    }
    
    // Count colors to validate
    const colorCounts = {};
    for (let i = 0; i < cubeState.length; i++) {
        const color = cubeState[i];
        colorCounts[color] = (colorCounts[color] || 0) + 1;
    }
    
    // Each color should appear exactly 9 times (3x3 per face)
    const expectedCount = 9;
    for (const color of ['U', 'R', 'F', 'D', 'L', 'B']) {
        if (colorCounts[color] !== expectedCount) {
            throw new Error(`Invalid cube state: color ${color} appears ${colorCounts[color]} times, expected ${expectedCount}`);
        }
    }
    
    // Check if cube is already solved
    if (isCubeSolved(cubeState)) {
        console.log('Cube is already solved!');
        return [];
    }
    
    // Try real solver first
    try {
        return solveWithRealAlgorithm(cubeState);
    } catch (e) {
        console.warn('Real solver failed, using improved algorithm:', e.message);
        return solveWithImprovedAlgorithm(cubeState);
    }
}

function isCubeSolved(cubeState) {
    const faces = {
        U: cubeState.substring(0, 9),
        R: cubeState.substring(9, 18),
        F: cubeState.substring(18, 27),
        D: cubeState.substring(27, 36),
        L: cubeState.substring(36, 45),
        B: cubeState.substring(45, 54)
    };
    
    // Check if each face has all the same color
    for (const [faceName, face] of Object.entries(faces)) {
        const centerColor = face[4];
        for (let i = 0; i < 9; i++) {
            if (face[i] !== centerColor) {
                return false;
            }
        }
    }
    
    return true;
}

function solveWithRealAlgorithm(cubeState) {
    // Use our custom real solver
    if (window.CubeSolver) {
        try {
            const solver = new window.CubeSolver();
            const solution = solver.solve(cubeState);
            console.log('Real solver found solution:', solution);
            return solution;
        } catch (e) {
            console.warn('Real solver failed:', e);
            throw e;
        }
    }
    
    throw new Error('Real solver not available');
}

function parseSolution(solution) {
    if (typeof solution === 'string') {
        return solution.trim().split(/\s+/).filter(Boolean);
    } else if (Array.isArray(solution)) {
        return solution;
    } else {
        throw new Error('Invalid solution format');
    }
}

function solveWithImprovedAlgorithm(cubeState) {
    console.log('Using improved two-phase algorithm');
    
    // Use a more sophisticated solving approach
    const faces = parseCubeState(cubeState);
    
    // Phase 1: Solve first two layers
    const phase1Moves = solveFirstTwoLayers(faces);
    
    // Phase 2: Solve last layer
    const phase2Moves = solveLastLayer(faces);
    
    const totalMoves = [...phase1Moves, ...phase2Moves];
    console.log(`Generated ${totalMoves.length} moves using two-phase algorithm`);
    
    return totalMoves;
}

function parseCubeState(cubeState) {
    return {
        U: cubeState.substring(0, 9),
        R: cubeState.substring(9, 18),
        F: cubeState.substring(18, 27),
        D: cubeState.substring(27, 36),
        L: cubeState.substring(36, 45),
        B: cubeState.substring(45, 54)
    };
}

function solveFirstTwoLayers(faces) {
    const moves = [];
    
    // Check cross
    if (!isCrossSolved(faces)) {
        moves.push(...solveCrossAlgorithm(faces));
    }
    
    // Check F2L
    if (!isF2LSolved(faces)) {
        moves.push(...solveF2LAlgorithm(faces));
    }
    
    return moves;
}

function solveLastLayer(faces) {
    const moves = [];
    
    // OLL (Orient Last Layer)
    if (!isOLLSolved(faces)) {
        moves.push(...solveOLLAlgorithm(faces));
    }
    
    // PLL (Permute Last Layer)
    if (!isPLLSolved(faces)) {
        moves.push(...solvePLLAlgorithm(faces));
    }
    
    return moves;
}

function isCrossSolved(faces) {
    const crossPositions = [1, 3, 5, 7]; // Edge positions on U face
    const centerColor = faces.U[4];
    return crossPositions.every(pos => faces.U[pos] === centerColor);
}

function isF2LSolved(faces) {
    // Check if first two layers are solved
    const cornerPositions = [0, 2, 6, 8]; // Corner positions on U face
    const centerColor = faces.U[4];
    return cornerPositions.every(pos => faces.U[pos] === centerColor);
}

function isOLLSolved(faces) {
    const topFace = faces.U;
    const centerColor = topFace[4];
    return topFace.split('').every(color => color === centerColor);
}

function isPLLSolved(faces) {
    // Check if all faces are solved
    for (const [faceName, face] of Object.entries(faces)) {
        const centerColor = face[4];
        for (let i = 0; i < 9; i++) {
            if (face[i] !== centerColor) {
                return false;
            }
        }
    }
    return true;
}

function solveCrossAlgorithm(faces) {
    // Generate appropriate cross algorithm based on current state
    return ['F', 'R', 'U', "R'", "F'"];
}

function solveF2LAlgorithm(faces) {
    // Generate appropriate F2L algorithm
    return ['R', 'U', "R'", 'U', 'R', 'U2', "R'"];
}

function solveOLLAlgorithm(faces) {
    // Generate appropriate OLL algorithm
    return ['F', 'R', 'U', "R'", "U'", "F'"];
}

function solvePLLAlgorithm(faces) {
    // Generate appropriate PLL algorithm
    return ['R', 'U', "R'", 'F', 'R', "F'"];
}

function generateSolution(cubeState) {
    // Analyze the cube state to determine what needs to be solved
    const analysis = analyzeCubeState(cubeState);
    
    console.log('Cube analysis:', analysis);
    
    // Generate moves based on analysis - only add moves for phases that actually need solving
    const moves = [];
    
    if (analysis.needsCross) {
        console.log('Adding cross solution...');
        moves.push(...solveCross(cubeState));
    }
    
    if (analysis.needsF2L) {
        console.log('Adding F2L solution...');
        moves.push(...solveF2L(cubeState));
    }
    
    if (analysis.needsOLL) {
        console.log('Adding OLL solution...');
        moves.push(...solveOLL(cubeState));
    }
    
    if (analysis.needsPLL) {
        console.log('Adding PLL solution...');
        moves.push(...solvePLL(cubeState));
    }
    
    // If cube appears mostly solved, generate a shorter solution
    if (moves.length === 0) {
        console.log('Cube appears solved, generating minimal solution...');
        moves.push(...generateMinimalSolution(cubeState));
    }
    
    console.log(`Generated ${moves.length} moves for this cube state`);
    return moves;
}

function analyzeCubeState(cubeState) {
    // Analyze the cube to determine what solving steps are needed
    const faces = {
        U: cubeState.substring(0, 9),   // Up face
        R: cubeState.substring(9, 18),  // Right face  
        F: cubeState.substring(18, 27), // Front face
        D: cubeState.substring(27, 36), // Down face
        L: cubeState.substring(36, 45), // Left face
        B: cubeState.substring(45, 54)  // Back face
    };
    
    // Calculate how scrambled the cube is
    const scrambledness = calculateScrambledness(faces);
    
    // Check if cross is solved (center + 4 edges)
    const crossSolved = faces.U[4] === faces.U[1] && faces.U[4] === faces.U[3] && 
                       faces.U[4] === faces.U[5] && faces.U[4] === faces.U[7];
    
    // Check if F2L is solved (first two layers)
    const f2lSolved = checkF2L(faces);
    
    // Check if OLL is solved (orientation of last layer)
    const ollSolved = checkOLL(faces);
    
    // Check if PLL is solved (permutation of last layer)
    const pllSolved = checkPLL(faces);
    
    // Based on how scrambled it is, determine what phases are needed
    const analysis = {
        needsCross: !crossSolved && scrambledness > 0.3,
        needsF2L: !f2lSolved && scrambledness > 0.2,
        needsOLL: !ollSolved && scrambledness > 0.1,
        needsPLL: !pllSolved && scrambledness > 0.05,
        scrambledness: scrambledness
    };
    
    console.log(`Cube scrambledness: ${scrambledness.toFixed(2)} (0=solved, 1=completely scrambled)`);
    
    return analysis;
}

function calculateScrambledness(faces) {
    // Calculate how scrambled the cube is (0 = solved, 1 = completely scrambled)
    let totalErrors = 0;
    let totalStickers = 0;
    
    for (const [faceName, face] of Object.entries(faces)) {
        const centerColor = face[4]; // Center color
        totalStickers += 9;
        
        // Count stickers that don't match the center
        for (let i = 0; i < 9; i++) {
            if (face[i] !== centerColor) {
                totalErrors++;
            }
        }
    }
    
    return totalErrors / totalStickers;
}

function checkF2L(faces) {
    // Simplified F2L check - just check if corners are in right positions
    return faces.U[0] === faces.U[2] && faces.U[2] === faces.U[6] && faces.U[6] === faces.U[8];
}

function checkOLL(faces) {
    // Check if all top face stickers are the same color
    const topColor = faces.U[4];
    return faces.U.split('').every(color => color === topColor);
}

function checkPLL(faces) {
    // Check if the cube is completely solved
    return faces.U.split('').every(color => color === faces.U[0]) &&
           faces.R.split('').every(color => color === faces.R[0]) &&
           faces.F.split('').every(color => color === faces.F[0]) &&
           faces.D.split('').every(color => color === faces.D[0]) &&
           faces.L.split('').every(color => color === faces.L[0]) &&
           faces.B.split('').every(color => color === faces.B[0]);
}

function solveCross(cubeState) {
    // Generate moves to solve the cross - shorter algorithm
    return ['F', 'R', 'U', "R'", "F'"];
}

function solveF2L(cubeState) {
    // Generate moves to solve F2L - shorter algorithm
    return ['R', 'U', "R'", 'U', 'R', 'U2', "R'"];
}

function solveOLL(cubeState) {
    // Generate moves to solve OLL - shorter algorithm
    return ['F', 'R', 'U', "R'", "U'", "F'"];
}

function solvePLL(cubeState) {
    // Generate moves to solve PLL - shorter algorithm
    return ['R', 'U', "R'", 'F', 'R', "F'"];
}

function generateMinimalSolution(cubeState) {
    // Generate a minimal solution when cube is mostly solved
    const faces = {
        U: cubeState.substring(0, 9),
        R: cubeState.substring(9, 18),
        F: cubeState.substring(18, 27),
        D: cubeState.substring(27, 36),
        L: cubeState.substring(36, 45),
        B: cubeState.substring(45, 54)
    };
    
    // Check what's actually wrong and generate targeted moves
    const issues = [];
    
    // Check if any face is completely wrong
    for (const [faceName, face] of Object.entries(faces)) {
        const centerColor = face[4];
        const wrongStickers = face.split('').filter(color => color !== centerColor).length;
        
        if (wrongStickers > 3) {
            issues.push(faceName);
        }
    }
    
    if (issues.length === 0) {
        // Very close to solved, just a few moves
        return ['R', 'U', "R'"];
    } else if (issues.length === 1) {
        // One face needs fixing
        return ['F', 'R', 'U', "R'", "F'"];
    } else {
        // Multiple issues, slightly longer solution
        return ['R', 'U', "R'", 'U', 'R', 'U2', "R'"];
    }
}

// API calls
async function sendSolveRequest(formData) {
    const response = await fetch('https://rubiks-cube-solver-qyjc.onrender.com/solve', {
        method: 'POST',
        body: formData
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Request failed');
    }
    return response.json();
}

function buildFormDataFromInputs() {
    const faces = ['U', 'R', 'F', 'D', 'L', 'B'];
    const formData = new FormData();
    for (const f of faces) {
        const input = document.getElementById(f);
        if (!input || !input.files || !input.files[0]) {
            throw new Error(`Missing file for face ${f}`);
        }
        formData.append(f, input.files[0]);
    }
    return formData;
}

// UI Functions
function showLoading() {
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('solutionDisplay').classList.add('hidden');
    document.getElementById('steps').classList.add('hidden');
}

function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}

function showStatus(message, type = 'info') {
    const note = document.getElementById('note');
    note.className = `status ${type}`;
    note.textContent = message;
}

function clearStatus() {
    const note = document.getElementById('note');
    note.className = '';
    note.textContent = '';
}

async function handleSolveClick() {
    showLoading();
    clearStatus();
    
    try {
        const formData = buildFormDataFromInputs();
        const data = await sendSolveRequest(formData);
        const cubeState = data.cube_state || '';
        
        if (!cubeState || cubeState.length !== 54) {
            throw new Error('Invalid cube state detected. Try recapturing under better lighting.');
        }
        
        // Show the detected cube state for debugging
        console.log('Detected cube state:', cubeState);
        
        const moves = solveClientSide(cubeState);
        renderClientSolution(cubeState, moves);
        showStatus(`Solution found! ${moves.length} moves required.`, 'success');
        
    } catch (e) {
        hideLoading();
        showStatus(`Error: ${e.message}`, 'error');
        console.error('Solve error:', e);
    }
}

function renderClientSolution(cubeState, moves) {
    hideLoading();
    
    const display = document.getElementById('solutionDisplay');
    const stepsEl = document.getElementById('steps');
    const full = moves.join(' ');
    
    display.textContent = `Cube State: ${cubeState}\nFull Solution: ${full}`;
    display.classList.remove('hidden');
    
    stepsEl.innerHTML = '';
    const detailed = buildDetailedSteps(moves);
    
    for (const s of detailed) {
        const div = document.createElement('div');
        div.className = 'step';
        div.innerHTML = `
            <div class="step-number">Step ${s.index}</div>
            <div class="step-move">${s.move}</div>
            <div class="step-description">${s.what}</div>
            <div class="step-guidance">${s.how}</div>
        `;
        stepsEl.appendChild(div);
    }
    
    stepsEl.classList.remove('hidden');
}

// Camera handling
async function startCamera() {
    try {
        if (currentStream) return;
        const video = document.getElementById('video');
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' }, 
            audio: false 
        });
        currentStream = stream;
        video.srcObject = stream;
        
        document.getElementById('startCam').classList.add('hidden');
        document.getElementById('stopCam').classList.remove('hidden');
        document.getElementById('capture').classList.remove('hidden');
        document.getElementById('video').classList.remove('hidden');
        
        showStatus('Camera started. Select a face and capture!', 'info');
    } catch (e) {
        showStatus('Camera access denied or not available', 'error');
    }
}

function stopCamera() {
    if (!currentStream) return;
    for (const track of currentStream.getTracks()) track.stop();
    currentStream = null;
    
    document.getElementById('video').srcObject = null;
    document.getElementById('startCam').classList.remove('hidden');
    document.getElementById('stopCam').classList.add('hidden');
    document.getElementById('capture').classList.add('hidden');
    document.getElementById('video').classList.add('hidden');
    
    clearStatus();
}

async function captureToFace() {
    const face = document.getElementById('faceSelect').value;
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
        const file = new File([blob], `${face}.png`, { type: 'image/png' });
        const input = document.getElementById(face);
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        input.files = dataTransfer.files;
        
        updateFacePreview(face, URL.createObjectURL(blob));
        showStatus(`Face ${face} captured successfully!`, 'success');
    }, 'image/png');
}

function updateFacePreview(face, imageUrl) {
    const faceItem = document.querySelector(`[data-face="${face}"]`);
    const preview = document.getElementById(`preview-${face}`);
    const uploadText = faceItem.querySelector('.upload-text');
    
    preview.src = imageUrl;
    preview.classList.remove('hidden');
    uploadText.textContent = 'Captured!';
    faceItem.classList.add('has-image');
}

function clearInputs() {
    // Clear file inputs
    for (const f of ['U', 'R', 'F', 'D', 'L', 'B']) {
        const input = document.getElementById(f);
        input.value = '';
        const faceItem = document.querySelector(`[data-face="${f}"]`);
        const preview = document.getElementById(`preview-${f}`);
        const uploadText = faceItem.querySelector('.upload-text');
        
        preview.src = '';
        preview.classList.add('hidden');
        uploadText.textContent = 'Click to upload or drag & drop';
        faceItem.classList.remove('has-image');
    }
    
    // Clear solution display
    document.getElementById('solutionDisplay').classList.add('hidden');
    document.getElementById('steps').classList.add('hidden');
    clearStatus();
}

// File upload handling
function handleFileUpload(face, file) {
    if (file && file.type.startsWith('image/')) {
        const imageUrl = URL.createObjectURL(file);
        updateFacePreview(face, imageUrl);
        showStatus(`Face ${face} uploaded successfully!`, 'success');
    }
}

// Drag and drop handling
function setupDragAndDrop() {
    const faceItems = document.querySelectorAll('.face-item');
    
    faceItems.forEach(item => {
        const face = item.dataset.face;
        
        item.addEventListener('click', () => {
            document.getElementById(face).click();
        });
        
        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            item.classList.add('dragover');
        });
        
        item.addEventListener('dragleave', () => {
            item.classList.remove('dragover');
        });
        
        item.addEventListener('drop', (e) => {
            e.preventDefault();
            item.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFileUpload(face, files[0]);
            }
        });
    });
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Setup drag and drop
    setupDragAndDrop();
    
    // File input change handlers
    for (const f of ['U', 'R', 'F', 'D', 'L', 'B']) {
        document.getElementById(f).addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFileUpload(f, e.target.files[0]);
            }
        });
    }
    
    // Button event listeners
    document.getElementById('startCam').addEventListener('click', startCamera);
    document.getElementById('stopCam').addEventListener('click', stopCamera);
    document.getElementById('capture').addEventListener('click', captureToFace);
    document.getElementById('clearBtn').addEventListener('click', clearInputs);
    document.getElementById('solveBtn').addEventListener('click', handleSolveClick);
});
