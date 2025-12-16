/* START OF FILE js/bim_viewer.js */
// import { AppState, cacheDomElements } from '/js/site_app.js';
const BIMViewer = (() => {
    let scene, camera, renderer, controls;
    let container;
    let buildingElements = {}; // Map task IDs to 3D meshes
    let currentFilter = 'all';
    let animationId = null;
    const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let tooltipEl;
    // --- MATERIALS ---
    const MATS = {
        ghost: new THREE.MeshBasicMaterial({ 
            color: 0x888888, wireframe: true, opacity: 0.1, transparent: true, side: THREE.DoubleSide 
        }),
        active: new THREE.MeshLambertMaterial({ 
            color: 0xf39c12, transparent: true, opacity: 0.8, side: THREE.DoubleSide 
        }),
        concrete: new THREE.MeshLambertMaterial({ color: 0x95a5a6, side: THREE.DoubleSide }),
        block: new THREE.MeshLambertMaterial({ color: 0xc0392b, side: THREE.DoubleSide }),
        plaster: new THREE.MeshLambertMaterial({ color: 0xecf0f1, side: THREE.DoubleSide }),
        paint: new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide }),
        glass: new THREE.MeshPhongMaterial({ color: 0x3498db, opacity: 0.6, transparent: true, side: THREE.DoubleSide }),
        ground: new THREE.MeshLambertMaterial({ color: 0x8d6e63, side: THREE.DoubleSide }),
        mep: new THREE.MeshStandardMaterial({ color: 0x2980b9, metalness: 0.5, side: THREE.DoubleSide }),
        
        steel: new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.7, roughness: 0.2, side: THREE.DoubleSide }),
        water: new THREE.MeshPhongMaterial({ color: 0x00aaff, opacity: 0.6, transparent: true, side: THREE.DoubleSide }),
        paving: new THREE.MeshLambertMaterial({ color: 0xa1887f, side: THREE.DoubleSide })
    };

    // --- INITIALIZATION ---
    const init = (domId, projectType = 'Villa') => {
         tooltipEl = document.getElementById('bim-tooltip'); // Get reference
           
           
        container = document.getElementById(domId);
        if (!container) return;// --- FIX: Preserve Tooltip and Loading Div ---
        const existingTooltip = document.getElementById('bim-tooltip');
        const existingLoading = document.getElementById('bim-loading');
         existingLoading.innerHTML = '';
        container.innerHTML = ''; // Clear canvas
        
        // Re-append UI elements
        if(existingLoading) container.appendChild(existingLoading);
        if(existingTooltip) {
            container.appendChild(existingTooltip);
            tooltipEl = existingTooltip; // Update module reference
        }
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x222222);
        
        const gridHelper = new THREE.GridHelper(60, 60, 0x555555, 0x333333);
        scene.add(gridHelper);

        const width = container.clientWidth || 600;
        const height = container.clientHeight || 400;
        camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        camera.position.set(40, 30, 40);

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.shadowMap.enabled = true;
        container.appendChild(renderer.domElement);
renderer.domElement.addEventListener('click', onMouseClick, false);
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
        scene.add(hemiLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(20, 50, 20);
        dirLight.castShadow = true;
        scene.add(dirLight);

        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.target.set(0, 5, 0);

        generateStructure();

        if (animationId) cancelAnimationFrame(animationId);
        animate();
        
        setTimeout(onWindowResize, 100);
        window.addEventListener('resize', onWindowResize, false);
    };
const onMouseClick = (event) => {
    // Calculate mouse position in normalized device coordinates (-1 to +1)
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // Find intersections
    const intersects = raycaster.intersectObjects(scene.children);

    if (intersects.length > 0) {
        const object = intersects[0].object;
        
        // Check if object has task data
        if (object.userData && object.userData.taskId) {
            showTooltip(object.userData);
            
            // Highlight effect (Optional: flash material)
            const oldMat = object.material;
            object.material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
            setTimeout(() => { object.material = oldMat; }, 500);
             }
        } else {
            if(tooltipEl) tooltipEl.style.display = 'none';
        }
    };

    // else {
        // if(tooltipEl) tooltipEl.style.display = 'none';
    // }
// };

const showTooltip = (data) => {
    if (!tooltipEl) return;
    
    // Find task info from global schedule data if available
    const task = window.currentScheduleData ? window.currentScheduleData.find(t => String(t.id) === data.taskId) : null;
    const taskName = task ? task.name : `Task ID: ${data.taskId}`;
    
    // Calculate simple progress based on today vs start/end
    let progress = '0%';
    if(task) {
        const now = new Date().getTime();
        const start = new Date(task.start).getTime();
        const end = new Date(task.end).getTime();
        if(now >= end) progress = '100%';
        else if(now > start) {
            const p = Math.round(((now - start) / (end - start)) * 100);
            progress = `${p}%`;
        }
    }
// alert (taskName);
// alert(DOMElements.bimitemname.textContent);
 const elName = document.getElementById('bim-item-name');
        const elStatus = document.getElementById('bim-item-status');
        const elProgress = document.getElementById('bim-item-progress');
    DOMElements.bimitemname.textContent = taskName;
    DOMElements.bimitemstatus.textContent = data.currentState.toUpperCase();
    DOMElements.bimitemprogress.textContent  = progress;
     tooltipEl.style.display = 'block';
    
    tooltipEl.style.display = 'block';
};
    const onWindowResize = () => {
        if (!camera || !renderer || !container) return;
        const width = container.clientWidth;
        const height = container.clientHeight;
        if (width === 0 || height === 0) return;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    };

    const animate = () => {
        animationId = requestAnimationFrame(animate);
        if (controls) controls.update();
        if (renderer && scene && camera) renderer.render(scene, camera);
    };

    // --- GEOMETRY GENERATION ---
    // Updated Signature: Includes Rotation (rotX, rotY, rotZ)
    const addPart = (taskId, geo, x, y, z, sx=1, sy=1, sz=1, rotX=0, rotY=0, rotZ=0, floor='all', matOverride=null) => {
        const mesh = new THREE.Mesh(geo, MATS.ghost);
        mesh.position.set(x, y, z);
        mesh.scale.set(sx, sy, sz);
        mesh.rotation.set(rotX, rotY, rotZ); // Apply rotations
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        mesh.userData = { 
            taskId: String(taskId), 
            floor: floor,
            currentState: 'ghost',
            matOverride: matOverride
        };
        
        scene.add(mesh);

        const key = String(taskId);
        if (!buildingElements[key]) buildingElements[key] = [];
        buildingElements[key].push(mesh);
    };

    const generateStructure = () => {
        buildingElements = {};
        
        // --- 1. MOBILIZATION & ENABLING ---
        // 1. Mobilization Works (Site Fencing)
        const fenceGeo = new THREE.BoxGeometry(0.1, 2, 30);
        addPart(1, fenceGeo, 15, 1, 0, 1, 1, 1, 0, 0, 0, 'sub', 'steel'); // East
        addPart(1, fenceGeo, -15, 1, 0, 1, 1, 1, 0, 0, 0, 'sub', 'steel'); // West
        // North/South fences (Rotated 90 deg Y-axis)
        addPart(1, fenceGeo, 0, 1, 15, 1, 1, 1, 0, Math.PI/2, 0, 'sub', 'steel'); // North
        addPart(1, fenceGeo, 0, 1, -15, 1, 1, 1, 0, Math.PI/2, 0, 'sub', 'steel'); // South
        
        // 2. Signboard
        addPart(2, new THREE.BoxGeometry(1.5, 3, 0.1), 11, 4, 15, 1, 1, 1, 0, -Math.PI/4, 0, 'sub', 'paint');
        
        // 3. Demolishing (Ground clearing)
        addPart(3, new THREE.PlaneGeometry(28, 28), 0, 0.1, 0, 1, 1, 1, -Math.PI/2, 0, 0, 'sub', 'ground');

        // --- 2. SHORING & EARTHWORKS ---
        // 6. Shoring Works (Piles)
        const pileGeo = new THREE.CylinderGeometry(0.2, 0.2, 6);
        for(let i=-12; i<=12; i+=3) {
            addPart(6, pileGeo, 14, -3, i, 1, 1, 1, 0, 0, 0, 'sub', 'concrete');
            addPart(6, pileGeo, -14, -3, i, 1, 1, 1, 0, 0, 0, 'sub', 'concrete');
            addPart(6, pileGeo, i, -3, 14, 1, 1, 1, 0, 0, 0, 'sub', 'concrete');
            addPart(6, pileGeo, i, -3, -14, 1, 1, 1, 0, 0, 0, 'sub', 'concrete');
        }
        // 8. Shoring I-Beams
        const beamGeo = new THREE.BoxGeometry(28, 0.3, 0.3);
        addPart(8, beamGeo, 0, -1, 13.8, 1, 1, 1, 0, 0, 0, 'sub', 'steel');
        addPart(8, beamGeo, 0, -3, 13.8, 1, 1, 1, 0, 0, 0, 'sub', 'steel');
        
        // 9, 13. Excavation
        addPart(9, new THREE.BoxGeometry(28, 0.1, 28), 0, -4.6, 0, 1, 1, 1, 0, 0, 0, 'sub', 'ground');
        addPart(13, new THREE.BoxGeometry(18, 0.1, 18), 0, -4.8, 0, 1, 1, 1, 0, 0, 0, 'sub', 'ground');
        // 14. Road Base
        addPart(14, new THREE.BoxGeometry(18, 0.2, 18), 0, -4.7, 0, 1, 1, 1, 0, 0, 0, 'sub', 'ground');

        // --- 3. SUBSTRUCTURE ---
        // 19. PCC
        addPart(19, new THREE.BoxGeometry(17, 0.1, 17), 0, -4.6, 0, 1, 1, 1, 0, 0, 0, 'sub', 'concrete');
        // 48. Waterproofing
        addPart(48, new THREE.BoxGeometry(17, 0.05, 17), 0, -4.55, 0, 1, 1, 1, 0, 0, 0, 'sub', 'steel');
        // 20. Raft
        addPart(20, new THREE.BoxGeometry(16, 0.8, 16), 0, -4.1, 0, 1, 1, 1, 0, 0, 0, 'sub', 'concrete');
        
        // 21. Basement Cols & Walls
        const colGeo = new THREE.BoxGeometry(0.6, 3.5, 0.6);
        [[-7,-7], [7,-7], [-7,7], [7,7]].forEach(p => {
            addPart(21, colGeo, p[0], -2.0, p[1], 1, 1, 1, 0, 0, 0, 'sub', 'concrete');
        });
        // Retaining Walls
        const wallLong = new THREE.BoxGeometry(16, 3.5, 0.3);
        addPart(21, wallLong, 0, -2.0, 7.85, 1, 1, 1, 0, 0, 0, 'sub', 'concrete'); // Front
        addPart(21, wallLong, 0, -2.0, -7.85, 1, 1, 1, 0, 0, 0, 'sub', 'concrete'); // Back
        addPart(21, wallLong, 7.85, -2.0, 0, 1, 1, 1, 0, Math.PI/2, 0, 'sub', 'concrete'); // Right (Rotated)
        addPart(21, wallLong, -7.85, -2.0, 0, 1, 1, 1, 0, Math.PI/2, 0, 'sub', 'concrete'); // Left (Rotated)
        
        // 49. Waterproofing Vertical
        addPart(49, new THREE.BoxGeometry(16.2, 3.5, 0.05), 0, -2.0, 8.05, 1, 1, 1, 0, 0, 0, 'sub', 'steel');
        // 17. Backfilling
        addPart(17, new THREE.BoxGeometry(30, 4, 30), 0, -2, 0, 1, 1, 1, 0, 0, 0, 'sub', 'ground');

        // --- 4. SUPERSTRUCTURE - GF ---
        addPart(26, new THREE.BoxGeometry(16.5, 0.3, 16.5), 0, 0, 0, 1, 1, 1, 0, 0, 0, 'gf', 'concrete'); // Slab
        [[-7,-7], [7,-7], [-7,7], [7,7]].forEach(p => addPart(27, colGeo, p[0], 1.9, p[1], 1, 1, 1, 0, 0, 0, 'gf', 'concrete')); // Cols
        
        // 39. GF Blockwork
        const blockWall = new THREE.BoxGeometry(16, 3.5, 0.2);
        addPart(39, blockWall, 0, 1.9, 7.5, 1, 1, 1, 0, 0, 0, 'gf', 'block'); // Front
        addPart(39, blockWall, 0, 1.9, -7.5, 1, 1, 1, 0, 0, 0, 'gf', 'block'); // Back
        addPart(39, blockWall, 7.5, 1.9, 0, 1, 1, 1, 0, Math.PI/2, 0, 'gf', 'block'); // Right
        addPart(39, blockWall, -7.5, 1.9, 0, 1, 1, 1, 0, Math.PI/2, 0, 'gf', 'block'); // Left

        // --- 5. SUPERSTRUCTURE - FF ---
        addPart(28, new THREE.BoxGeometry(17, 0.3, 17), 0, 3.8, 0, 1, 1, 1, 0, 0, 0, '1', 'concrete'); // Slab
        [[-7,-7], [7,-7], [-7,7], [7,7]].forEach(p => addPart(29, colGeo, p[0], 5.7, p[1], 1, 1, 1, 0, 0, 0, '1', 'concrete')); // Cols
        // 40. FF Blockwork
        addPart(40, blockWall, 0, 5.7, 7.5, 1, 1, 1, 0, 0, 0, '1', 'block');
        addPart(40, blockWall, 0, 5.7, -7.5, 1, 1, 1, 0, 0, 0, '1', 'block');
        addPart(40, blockWall, 7.5, 5.7, 0, 1, 1, 1, 0, Math.PI/2, 0, '1', 'block');
        addPart(40, blockWall, -7.5, 5.7, 0, 1, 1, 1, 0, Math.PI/2, 0, '1', 'block');

        // --- 6. SUPERSTRUCTURE - ROOF ---
        addPart(30, new THREE.BoxGeometry(17, 0.3, 17), 0, 7.6, 0, 1, 1, 1, 0, 0, 0, 'roof', 'concrete'); // Slab
        const parapet = new THREE.BoxGeometry(17, 1, 0.2);
        addPart(33, parapet, 0, 8.2, 8.4, 1, 1, 1, 0, 0, 0, 'roof', 'concrete');
        addPart(33, parapet, 0, 8.2, -8.4, 1, 1, 1, 0, 0, 0, 'roof', 'concrete');
        addPart(33, parapet, 8.4, 8.2, 0.0, 1, 1, 1, 0, Math.PI/2, 0, 'roof', 'concrete');
         addPart(33, parapet, -8.4, 8.2, 0.0, 1, 1, 1, 0, Math.PI/2, 0, 'roof', 'concrete');
        addPart(41, new THREE.BoxGeometry(4, 3, 4), 5, 9.1, 5, 1, 1, 1, 0, 0, 0, 'roof', 'block'); // Service room

        // --- 7. UPPER ROOF ---
        addPart(31, new THREE.BoxGeometry(0.4, 3, 0.4), 5, 9.1, 5, 1, 1, 1, 0, 0, 0, 'upper_roof', 'concrete');
        addPart(32, new THREE.BoxGeometry(4.5, 0.2, 4.5), 5, 10.7, 5, 1, 1, 1, 0, 0, 0, 'upper_roof', 'concrete');
        addPart(34, new THREE.BoxGeometry(4.500, 0.800, 0.100), 5, 11.200, 7.200, 1, 1, 1, 0, 0, 0, 'upper_roof', 'concrete');
    addPart(34, new THREE.BoxGeometry(4.500, 0.800, 0.100), 5, 11.200, 2.750, 1, 1, 1, 0, 0, 0, 'upper_roof', 'concrete');
    addPart(34, new THREE.BoxGeometry(4.500, 0.800, 0.100), 2.800, 11.200, 5, 1, 1, 1, 0, Math.PI/2, 0, 'upper_roof', 'concrete');
    addPart(34, new THREE.BoxGeometry(4.500, 0.800, 0.100), 7.2, 11.200, 5, 1, 1, 1, 0, Math.PI/2, 0, 'upper_roof', 'concrete');

        // --- 8, 9, 10. FINISHES ---
        // Plaster (Inner Skins)
        const plasterGeo = new THREE.BoxGeometry(15.8, 3.4, 0.05);
        addPart(43, plasterGeo, 0, -2.0, 7.7, 1, 1, 1, 0, 0, 0, 'sub', 'plaster');
        addPart(44, plasterGeo, 0, 1.9, 7.3, 1, 1, 1, 0, 0, 0, 'gf', 'plaster');
        addPart(45, plasterGeo, 0, 5.7, 7.3, 1, 1, 1, 0, 0, 0, '1', 'plaster');
        // Tiles
        addPart(64, new THREE.BoxGeometry(15, 0.05, 15), 0, -3.65, 0, 1, 1, 1, 0, 0, 0, 'sub', 'tile');
        addPart(65, new THREE.BoxGeometry(16, 0.05, 16), 0, 0.2, 0, 1, 1, 1, 0, 0, 0, 'gf', 'tile');
        addPart(66, new THREE.BoxGeometry(16, 0.05, 16), 0, 4.0, 0, 1, 1, 1, 0, 0, 0, '1', 'tile');

        // --- 11. EXTERNAL ---
        // 81. External Paint
        addPart(81, new THREE.BoxGeometry(16.4, 7.6, 16.4), 0, 3.8, 0, 1, 1, 1, 0, 0, 0, 'ext', 'paint');
        // 135. Boundary Wall
        const bWall = new THREE.BoxGeometry(40, 2, 0.3);
        addPart(135, bWall, 0, 1, 19, 1, 1, 1, 0, 0, 0, 'ext', 'block');
        addPart(135, bWall, 0, 1, -19, 1, 1, 1, 0, 0, 0, 'ext', 'block');
        addPart(135, bWall, 19.85, 1, 0, 1, 1, 1, 0, Math.PI/2, 0, 'ext', 'block'); // Rotated Side
        addPart(135, bWall, -19.85, 1, 0, 1, 1, 1, 0, Math.PI/2, 0, 'ext', 'block'); // Rotated Side
        // 138. Pool
        addPart(138, new THREE.BoxGeometry(4, 1.500, 6), 12, 0.500, 0, 1, 1, 1, 0, 0, 0, 'ext', 'water');
        // 140. Paving
        addPart(140, new THREE.BoxGeometry(35, 0.1, 35), 0, 0.1, 0, 1, 1, 1, 0, 0, 0, 'ext', 'paving');

        // --- 12. MEP ---
        addPart(156, new THREE.BoxGeometry(1, 1, 2), 5, 8.6, -5, 1, 1, 1, 0, 0, 0, 'roof', 'mep');
        const acUnit = new THREE.BoxGeometry(1, 1, 0.5);
        addPart(193, acUnit, 2, 8.1, 8, 1, 1, 1, 0, 0, 0, 'roof', 'mep');
        addPart(193, acUnit, -2, 8.1, 8, 1, 1, 1, 0, 0, 0, 'roof', 'mep');
    };

    // --- UPDATE LOGIC ---
    const updateSimulation = (currentDate) => {
        if (!currentDate || isNaN(new Date(currentDate).getTime())) return;
        const curMs = new Date(currentDate).getTime();
        
        if (!window.currentScheduleData) return;

        const activeTasksList = document.getElementById('active-tasks-list');
        let activeTasksHTML = '<h5>Current Activities</h5><ul>';
        let hasActive = false;

        for (const [taskIdStr, meshes] of Object.entries(buildingElements)) {
            const task = window.currentScheduleData.find(t => String(t.id) === taskIdStr);
            
            let state = 'ghost';
            let progress = 0;
            let matOverride = null;

            if (task && task.start && task.end) {
                const startMs = new Date(task.start).getTime();
                const endMs = new Date(task.end).getTime();
                
                if (curMs >= endMs) {
                    state = 'done';
                    progress = 1;
                } else if (curMs >= startMs) {
                    state = 'active';
                    const duration = endMs - startMs;
                    progress = duration > 0 ? (curMs - startMs) / duration : 0;
                    const pct = Math.round(progress * 100);
                    activeTasksHTML += `<li>${task.name} <span class="progress">${pct}%</span></li>`;
                    hasActive = true;
                }
            }

            meshes.forEach(mesh => {
                matOverride = mesh.userData.matOverride;
                if (currentFilter !== 'all' && mesh.userData.floor !== currentFilter) {
                    mesh.visible = false;
                } else {
                    updateMeshState(mesh, state, progress, matOverride);
                }
            });
        }
        
        if (!hasActive) activeTasksHTML += '<li style="color:#999;">No active tasks...</li>';
        activeTasksHTML += '</ul>';
        if (activeTasksList) activeTasksList.innerHTML = activeTasksHTML;
    };

    const updateMeshState = (mesh, state, progress, matOverride) => {
        if (!mesh.visible) mesh.visible = true;
        if (mesh.userData.currentState === state && state !== 'active') return;
        mesh.userData.currentState = state;

        if (state === 'ghost') {
            mesh.material = MATS.ghost;
        } else if (state === 'active') {
            mesh.material = MATS.active.clone();
            mesh.material.opacity = 0.3 + (progress * 0.7);
        } else if (state === 'done') {
            const mat = matOverride ? MATS[matOverride] : MATS.concrete; 
            mesh.material = mat || MATS.concrete;
        }
    };

    const setFilter = (floorId) => {
        currentFilter = floorId;
        Object.values(buildingElements).flat().forEach(mesh => {
             if (floorId === 'all' || mesh.userData.floor === floorId) {
                 mesh.visible = true;
             } else {
                 mesh.visible = false;
             }
        });
    };

    return { init, updateSimulation, setFilter };
})();