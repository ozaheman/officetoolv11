//--- START OF FILE constants.js ---


// ===================================================================================
// MODULE 1: CONTENT DEFINITIONS
// ===================================================================================
      // DDA: { name: 'M/s Dubai Development Authority', address: 'Planning Department<br>Dubai, U.A.E.' },
         // DubaiSportsCity: { name: 'M/s Dubai Sports City', address: 'Planning Department<br>Dubai, U.A.E.' },
         // EmiratesHills: { name: 'Emirates Hills', address: 'P.O. Box 9440<br>Dubai, United Arab Emirates' }
// +    },
// +    AUTHORITY_MAPPING: { // New mapping for UI logic
// +        'dubai': 'DM',
// +        'abu dhabi': 'DMT',
// +        'al ain': 'DMT',
// +        'sharjah': 'Sharjah Municipality',
// +        'ajman': 'Ajman Municipality',
// +        'ras al khaimah': 'RAK Municipality',
// +        'rak': 'RAK Municipality',
// +        'umm al quwain': 'UAQ Municipality',
// +        'uaq': 'UAQ Municipality',
// +        'fujairah': 'Fujairah Municipality'
     // },
  //--- START OF FILE constants.js ---


// ===================================================================================
// MODULE 1: CONTENT DEFINITIONS
// ===================================================================================

const DEPARTMENT_COLORS = {
    'Architectural': '#ffe119', // Yellow
    'Structural': '#3cb44b',    // Green
    'MEP': '#4363d8',           // Blue
    'Mechanical': '#42d4f4',      // Cyan
    'AOR': '#e6194B',           // Red
    'Tender': '#f58231',        // Orange
    'Draftsmen': '#469990',      // Teal
    'Account': '#f032e6',       // Magenta
    'Manager': '#a9a9a9',       // Dark Grey
    'Site': '#bfef45',        // Lime
    'Submission': '#9A6324',    // Brown
    'Default': '#808080'        // Grey
};
// Replaced VILLA_SCHEDULE_TEMPLATE with OCR based data
// Note: Dependencies are simplified for this demo to flow sequentially mostly.

// --- DETAILED SCHEDULE TEMPLATE FROM PDF ---
// Note: 'floor' property used for 3D filtering (sub, gf, 1, roof, upper_roof, ext)

/**
 * CONSTRUCTION SCHEDULE TEMPLATES
 * 1. VILLA_SCHEDULE (Residential, 2 floors)
 * 2. BUILDING_SCHEDULE (G+4 to G+10, Mixed Use)
 * 3. TOWER_SCHEDULE (High Rise, G+30+)
 * 4. WAREHOUSE_SCHEDULE (Industrial, Steel Structure)
 */

// ============================================================
// 1. VILLA (Traditional RCC Structure, High Finishes)
// ============================================================
const VILLA_SCHEDULE = [
    { id: 1, name: 'Mobilization & Utilities Setup', startOffset: 0, duration: 14, dependencies: [], floor: 'ext' },
    { id: 2, name: 'Excavation to Foundation', startOffset: 15, duration: 10, dependencies: [1], floor: 'sub' },
    { id: 3, name: 'PCC & Raft Foundation', startOffset: 25, duration: 20, dependencies: [2], floor: 'sub' },
    { id: 4, name: 'Basement Walls & Waterproofing', startOffset: 45, duration: 15, dependencies: [3], floor: 'sub' },
    { id: 5, name: 'GF Slab & Columns (Structure)', startOffset: 60, duration: 20, dependencies: [4], floor: 'gf' },
    { id: 6, name: 'FF Slab & Columns (Structure)', startOffset: 80, duration: 20, dependencies: [5], floor: '1' },
    { id: 7, name: 'Roof Slab & Parapet', startOffset: 100, duration: 15, dependencies: [6], floor: 'roof' },
    { id: 8, name: 'Blockwork (GF & FF)', startOffset: 90, duration: 25, dependencies: [5, 6], floor: 'all' },
    { id: 9, name: 'Internal Plaster', startOffset: 120, duration: 20, dependencies: [8], floor: 'all' },
    { id: 10, name: 'MEP First Fix (Piping/Ducting)', startOffset: 100, duration: 30, dependencies: [8], floor: 'all' },
    { id: 11, name: 'Flooring (Tiling/Marble)', startOffset: 145, duration: 25, dependencies: [9], floor: 'all' },
    { id: 12, name: 'Painting & Joinery', startOffset: 170, duration: 30, dependencies: [11], floor: 'all' },
    { id: 13, name: 'External Facade & Boundary Wall', startOffset: 130, duration: 45, dependencies: [8], floor: 'ext' },
    { id: 14, name: 'Testing, Commissioning & Handover', startOffset: 200, duration: 15, dependencies: [12, 13], floor: 'all' }
];

// ============================================================
// 2. MID-RISE BUILDING (Res/Comm, G+10, Repetitive Floors)
// ============================================================
const BUILDING_SCHEDULE = [
    // Preliminaries
    { id: 100, name: 'NTP & Mobilization', startOffset: 0, duration: 20, dependencies: [], floor: 'ext' },
    { id: 101, name: 'Shoring & Excavation', startOffset: 20, duration: 40, dependencies: [100], floor: 'sub' },
    
    // Substructure
    { id: 102, name: 'Raft Foundation', startOffset: 60, duration: 25, dependencies: [101], floor: 'sub' },
    { id: 103, name: 'Basement 1-2 Structure', startOffset: 85, duration: 40, dependencies: [102], floor: 'sub' },
    { id: 104, name: 'Podium / GF Structure', startOffset: 125, duration: 20, dependencies: [103], floor: 'gf' },

    // Typical Floors Cycle (Repetitive Task Group)
    { id: 105, name: 'Structure: Typical Floors (1-10)', startOffset: 145, duration: 100, dependencies: [104], floor: 'typ' },
    { id: 106, name: 'Blockwork: Typical Floors', startOffset: 165, duration: 90, dependencies: [105], floor: 'typ' }, // Starts lag after structure
    
    // Envelope
    { id: 107, name: 'Aluminum Glazing / Windows', startOffset: 190, duration: 80, dependencies: [106], floor: 'ext' },
    
    // MEP
    { id: 108, name: 'MEP Risers & Plant Rooms', startOffset: 150, duration: 120, dependencies: [104], floor: 'all' },
    { id: 109, name: 'Elevator Installation', startOffset: 200, duration: 60, dependencies: [105], floor: 'all' }, // Needs top out

    // Finishes
    { id: 110, name: 'Internal Finishes (Plaster/Paint/Tile)', startOffset: 200, duration: 100, dependencies: [106, 108], floor: 'typ' },
    { id: 111, name: 'Common Area / Lobby Finishes', startOffset: 280, duration: 40, dependencies: [110], floor: 'gf' },

    // Closeout
    { id: 112, name: 'Civil Defense Inspection', startOffset: 330, duration: 10, dependencies: [111], floor: 'all' },
    { id: 113, name: 'Final Handover', startOffset: 345, duration: 0, dependencies: [112], floor: 'all' }
];

// ============================================================
// 3. TOWER (High Rise, Deep Foundations, Complex Logistics)
// ============================================================
const TOWER_SCHEDULE = [
    // Piling (Deep Foundation)
    { id: 200, name: 'Site Mob & Piling Mat Setup', startOffset: 0, duration: 20, dependencies: [], floor: 'ext' },
    { id: 201, name: 'Test Piles & Load Testing', startOffset: 20, duration: 25, dependencies: [200], floor: 'sub' },
    { id: 202, name: 'Production Piling (Deep Foundations)', startOffset: 45, duration: 60, dependencies: [201], floor: 'sub' },
    { id: 203, name: 'Pile Breaking & Dewatering', startOffset: 105, duration: 20, dependencies: [202], floor: 'sub' },

    // Substructure & Core
    { id: 204, name: 'Thick Raft Foundation Casting', startOffset: 125, duration: 30, dependencies: [203], floor: 'sub' },
    { id: 205, name: 'Slipform/Jumpform Setup (Core Walls)', startOffset: 155, duration: 15, dependencies: [204], floor: 'sub' },
    { id: 206, name: 'Basement Structure (B1-B3)', startOffset: 170, duration: 60, dependencies: [204], floor: 'sub' },

    // Superstructure (Cycle)
    { id: 207, name: 'Core Wall Construction (Ahead of Slabs)', startOffset: 230, duration: 200, dependencies: [206], floor: 'tower' },
    { id: 208, name: 'Floor Slabs Construction (Post Tension)', startOffset: 240, duration: 200, dependencies: [206], floor: 'tower' },

    // Envelope (Curtain Wall)
    { id: 209, name: 'Curtain Wall Panels Installation', startOffset: 280, duration: 180, dependencies: [208], floor: 'ext' }, // Trails structure
    
    // Vertical Transportation & MEP
    { id: 210, name: 'Hoist Installation & Operation', startOffset: 230, duration: 250, dependencies: [206], floor: 'ext' },
    { id: 211, name: 'Chiller Lifting & Roof Plant', startOffset: 450, duration: 30, dependencies: [208], floor: 'roof' },
    { id: 212, name: 'High Speed Elevators Install', startOffset: 350, duration: 100, dependencies: [208], floor: 'tower' },

    // Finishes
    { id: 213, name: 'Drywall Partitioning', startOffset: 300, duration: 150, dependencies: [209], floor: 'tower' },
    { id: 214, name: 'Fit-out (Apartments/Offices)', startOffset: 350, duration: 150, dependencies: [213], floor: 'tower' },

    // Closeout
    { id: 215, name: 'Dismantle Tower Cranes', startOffset: 500, duration: 20, dependencies: [211], floor: 'roof' },
    { id: 216, name: 'Testing & Commissioning (T&C)', startOffset: 530, duration: 45, dependencies: [212, 214], floor: 'all' }
];

// ============================================================
// 4. WAREHOUSE (Industrial, Steel PEB, Large Spans)
// ============================================================
const WAREHOUSE_SCHEDULE = [
    // Civil Works
    { id: 300, name: 'Site Clearing & Grading', startOffset: 0, duration: 10, dependencies: [], floor: 'ext' },
    { id: 301, name: 'Isolated Footings & Neck Columns', startOffset: 10, duration: 20, dependencies: [300], floor: 'sub' },
    { id: 302, name: 'Ground Beams & Plinth', startOffset: 30, duration: 15, dependencies: [301], floor: 'sub' },
    
    // Steel Structure (PEB)
    { id: 303, name: 'Delivery of PEB Steel Structure', startOffset: 20, duration: 15, dependencies: [100], floor: 'ext' }, // Long Lead
    { id: 304, name: 'Steel Erection (Columns & Rafters)', startOffset: 50, duration: 25, dependencies: [302, 303], floor: 'steel' },
    { id: 305, name: 'Roof Sheeting & Skylights', startOffset: 75, duration: 15, dependencies: [304], floor: 'steel' },
    { id: 306, name: 'Wall Cladding (Sandwich Panels)', startOffset: 90, duration: 15, dependencies: [305], floor: 'steel' },

    // Flooring (Critical for Warehouse)
    { id: 307, name: 'Slab Prep (Vapor Barrier/Mesh)', startOffset: 105, duration: 10, dependencies: [305], floor: 'gf' }, // Must be watertight first
    { id: 308, name: 'Industrial Floor Pour (Laser Screed)', startOffset: 115, duration: 10, dependencies: [307], floor: 'gf' },
    { id: 309, name: 'Floor Curing, Cutting & Sealant', startOffset: 125, duration: 14, dependencies: [308], floor: 'gf' },

    // MEP (Industrial)
    { id: 310, name: 'Fire Fighting Sprinkler Grid', startOffset: 80, duration: 30, dependencies: [304], floor: 'roof' }, // High level
    { id: 311, name: 'High Bay Lighting Install', startOffset: 95, duration: 15, dependencies: [310], floor: 'roof' },
    { id: 312, name: 'Office/Mezzanine Fitout', startOffset: 100, duration: 40, dependencies: [306], floor: 'mezz' },

    // External
    { id: 313, name: 'Loading Dock Levelers Install', startOffset: 130, duration: 10, dependencies: [309], floor: 'gf' },
    { id: 314, name: 'Asphalt & Road Marking', startOffset: 140, duration: 20, dependencies: [300], floor: 'ext' },
    { id: 315, name: 'Handover', startOffset: 165, duration: 0, dependencies: [312, 314], floor: 'all' }
];

// Helper to export all
const ALL_PROJECT_TEMPLATES = {
    villa: VILLA_SCHEDULE,
    building: BUILDING_SCHEDULE,
    tower: TOWER_SCHEDULE,
    warehouse: WAREHOUSE_SCHEDULE
};

const VILLA_SCHEDULE_TEMPLATE = [
    // 1. Mobilization & Enabling
    { id: 1, name: 'MOBILIZATION WORKS', startOffset: 0, duration: 23, dependencies: [], floor: 'sub' },
    { id: 2, name: 'Site Fencing & Signboard', startOffset: 0, duration: 23, dependencies: [], floor: 'sub' },
    { id: 3, name: 'DEMOLISHING WORKS', startOffset: 7, duration: 4, dependencies: [2], floor: 'sub' },
    
    // 2. Shoring & Earthworks
    { id: 6, name: 'SHORING WORKS', startOffset: 14, duration: 28, dependencies: [3], floor: 'sub' },
    { id: 8, name: 'Shoring (I-beams)', startOffset: 20, duration: 10, dependencies: [6], floor: 'sub' },
    { id: 9, name: 'Excavation up to -4.6m', startOffset: 33, duration: 2, dependencies: [8], floor: 'sub' },
    { id: 13, name: 'Open excavation for raft', startOffset: 43, duration: 20, dependencies: [9], floor: 'sub' },
    { id: 14, name: 'Road base, leveling & compaction', startOffset: 68, duration: 7, dependencies: [13], floor: 'sub' },

    // 3. Substructure (Foundation & Basement)
    { id: 19, name: 'PCC below raft foundation', startOffset: 76, duration: 7, dependencies: [14], floor: 'sub' },
    { id: 48, name: 'Waterproofing (Horizontal)', startOffset: 84, duration: 12, dependencies: [19], floor: 'sub' },
    { id: 20, name: 'RCC Raft Foundation', startOffset: 99, duration: 16, dependencies: [48], floor: 'sub' },
    { id: 21, name: 'RCC Basement Columns & Retaining Walls', startOffset: 119, duration: 13, dependencies: [20], floor: 'sub' },
    { id: 49, name: 'Waterproofing (Vertical)', startOffset: 138, duration: 8, dependencies: [21], floor: 'sub' },
    { id: 17, name: 'Backfilling around foundations', startOffset: 150, duration: 4, dependencies: [49], floor: 'sub' },

    // 4. Superstructure - Ground Floor
    { id: 26, name: 'RCC Slab on Grade / GF Slab', startOffset: 155, duration: 8, dependencies: [17], floor: 'gf' },
    { id: 27, name: 'RCC GF Columns & Staircase', startOffset: 169, duration: 8, dependencies: [26], floor: 'gf' },
    { id: 39, name: 'GF Block Work & Lintels', startOffset: 180, duration: 15, dependencies: [27], floor: 'gf' },
    
    // 5. Superstructure - First Floor
    { id: 28, name: 'RCC First Floor Slab', startOffset: 180, duration: 17, dependencies: [27], floor: '1' },
    { id: 29, name: 'RCC FF Columns & Staircase', startOffset: 200, duration: 9, dependencies: [28], floor: '1' },
    { id: 40, name: 'FF Block Work & Lintels', startOffset: 215, duration: 15, dependencies: [29], floor: '1' },

    // 6. Superstructure - Roof
    { id: 30, name: 'RCC Roof Floor Slab', startOffset: 212, duration: 14, dependencies: [29], floor: 'roof' },
    { id: 33, name: 'RCC Roof Parapet', startOffset: 229, duration: 8, dependencies: [30], floor: 'roof' },
    { id: 41, name: 'Roof Block Work', startOffset: 240, duration: 5, dependencies: [33], floor: 'roof' },

    // 7. Upper Roof (Stair Tower/Lift)
    { id: 31, name: 'RCC Upper Roof Columns', startOffset: 230, duration: 4, dependencies: [30], floor: 'upper_roof' },
    { id: 32, name: 'RCC Upper Roof Slab', startOffset: 236, duration: 7, dependencies: [31], floor: 'upper_roof' },
    { id: 34, name: 'RCC Upper Roof Parapet', startOffset: 246, duration: 3, dependencies: [32], floor: 'upper_roof' },

    // 8. Finishes - Plaster
    { id: 43, name: 'Basement Internal Plaster', startOffset: 240, duration: 17, dependencies: [21], floor: 'sub' },
    { id: 44, name: 'GF Internal Plaster', startOffset: 275, duration: 15, dependencies: [39], floor: 'gf' },
    { id: 45, name: 'FF Internal Plaster', startOffset: 305, duration: 15, dependencies: [40], floor: '1' },
    
    // 9. Finishes - Flooring
    { id: 64, name: 'Basement Flooring / Tiles', startOffset: 300, duration: 40, dependencies: [43], floor: 'sub' },
    { id: 65, name: 'GF Flooring / Tiles', startOffset: 360, duration: 60, dependencies: [44], floor: 'gf' },
    { id: 66, name: 'FF Flooring / Tiles', startOffset: 390, duration: 60, dependencies: [45], floor: '1' },

    // 10. Finishes - Paint
    { id: 77, name: 'Basement Internal Paint', startOffset: 330, duration: 30, dependencies: [43], floor: 'sub' },
    { id: 78, name: 'GF Internal Paint', startOffset: 400, duration: 75, dependencies: [44], floor: 'gf' },
    { id: 79, name: 'FF Internal Paint', startOffset: 430, duration: 75, dependencies: [45], floor: '1' },
    
    // 11. External & Landscaping
    { id: 81, name: 'External GRC Cladding / Paint', startOffset: 330, duration: 120, dependencies: [39, 40], floor: 'ext' },
    { id: 135, name: 'Boundary Wall Construction', startOffset: 280, duration: 120, dependencies: [14], floor: 'ext' },
    { id: 138, name: 'Swimming Pool Works', startOffset: 300, duration: 60, dependencies: [17], floor: 'ext' },
    { id: 140, name: 'Outdoor Hardscaping', startOffset: 430, duration: 90, dependencies: [135], floor: 'ext' },

    // 12. MEP & Fitout
    { id: 156, name: 'Water Pumps & Tank', startOffset: 420, duration: 10, dependencies: [54], floor: 'roof' },
    { id: 193, name: 'Air Conditioning Works', startOffset: 220, duration: 224, dependencies: [30], floor: 'gf' }, // Spans multiple, assigned GF for simplicity
    { id: 226, name: 'Testing & Commissioning', startOffset: 550, duration: 15, dependencies: [193], floor: 'ext' }
];
const qVILLA_SCHEDULE_TEMPLATE= [
        { id: 10001, name: 'MOBILIZATION', startOffset: 0, duration: 62, dependencies: [] }, 
        { id: 1, name: 'ZONING & PERMITS', startOffset: 0, duration: 60, dependencies: [] },
        { id: 2, name: 'PLANS', startOffset: 5, duration: 65, dependencies: [] },
        { id: 20001, name: 'SHORING WORKS', startOffset: 31, duration: 19, dependencies: [1] }, 
        { id: 3, name: 'EXCAVATION WORK', startOffset: 51, duration: 27, dependencies: [2] }, 
        { id: 4, name: 'COMPACTION & PCC', startOffset: 62, duration: 31, dependencies: [3] }, 
        { id: 5, name: 'WATER-PROOFING', startOffset: 71, duration: 130, dependencies: [4] }, 
        { id: 6, name: 'SUB-STRUCTURE', startOffset: 109, duration: 140, dependencies: [5] },
 { id: 24, name: 'SUB-STRUCTURE:RAFT', startOffset: 109, duration: 140, dependencies: [6] }, { id: 28, name: 'SUB-STRUCTURE:RATAINING WALL', startOffset: 109, duration: 140, dependencies: [6] },   { id: 24, name: 'SUB-STRUCTURE:RAFT', startOffset: 109, duration: 140, dependencies: [6] },    
        { id: 7, name: 'B/WALL WORKS', startOffset: 385, duration: 74, dependencies: [10] }, 
        { id: 3, name: 'FIRST FLOOR SLAB', startOffset: 213, duration: 45, dependencies: [6] }, 
         { id: 37, name: 'FIRST FLOOR SLAB:slab', startOffset: 213, duration: 45, dependencies: [6] },
        { id: 9, name: 'ROOF SLAB WORKS', startOffset: 259, duration: 46, dependencies: [18] },
{ id: 45, name: 'ROOF SLAB WORKS:slab', startOffset: 259, duration: 46, dependencies: [18] },         
        { id: 10, name: 'UPPER ROOF SLAB', startOffset: 342, duration: 23, dependencies: [9] }, 
        { id: 11, name: 'STEEL STAIRCASE', startOffset: 339, duration: 18, dependencies: [10] }, 
        { id: 12, name: 'PLUMBING/DRAINAGE', startOffset: 111, duration: 453, dependencies: [6] }, 
        { id: 13, name: 'WATER TANK', startOffset: 461, duration: 19, dependencies: [10] }, 
        { id: 14, name: 'ELECTRICAL WORKS', startOffset: 62, duration: 483, dependencies: [6] }, 
        { id: 15, name: 'INTERCOM/CCTV', startOffset: 492, duration: 27, dependencies: [21] }, 
        { id: 16, name: 'AC WORK', startOffset: 405, duration: 138, dependencies: [20] }, 
        { id: 17, name: 'FIRE FIGHTING', startOffset: 181, duration: 401, dependencies: [6] }, 
        { id: 18, name: 'BLOCK WORK', startOffset: 204, duration: 189, dependencies: [8] }, 
        { id: 19, name: 'PLASTERING', startOffset: 262, duration: 117, dependencies: [9, 18] }, 
        { id: 20, name: 'GYPSUM CEILING', startOffset: 364, duration: 137, dependencies: [19] }, 
        { id: 21, name: 'INTERNAL FINISHES', startOffset: 410, duration: 127, dependencies: [20] }, 
        { id: 22, name: 'EXTERNAL FINISHES', startOffset: 375, duration: 113, dependencies: [19, 7] }, 
        { id: 104, name: 'EXTERNAL PAINTING', startOffset: 160, duration: 30, dependencies: [54] },
        { id: 23, name: 'ALUMINIUM WORK', startOffset: 339, duration: 207, dependencies: [19] }, 
        { id: 24, name: 'LIFT WORK', startOffset: 436, duration: 142, dependencies: [10] }, 
        { id: 25, name: 'JOINERY WORK', startOffset: 426, duration: 65, dependencies: [21] }, 
        { id: 26, name: 'SWIMMING POOL', startOffset: 461, duration: 54, dependencies: [10] }, 
        { id: 27, name: 'LANDSCAPE WORK', startOffset: 466, duration: 111, dependencies: [22, 26] }, 
        { id: 28, name: 'MAIN GATE WORK', startOffset: 507, duration: 61, dependencies: [7, 22] }, 
        { id: 29, name: 'SNAGGING', startOffset: 565, duration: 7, dependencies: [21, 22, 23, 24, 25, 27, 28] }, 
        { id: 30, name: 'AUTHORITY INSPECTION', startOffset: 572, duration: 5, dependencies: [29] },
    ]

const pVILLA_SCHEDULE_TEMPLATE = [
    { id: 1, name: 'ZONING & PERMITS', startOffset: 0, duration: 60, dependencies: [] },
    { id: 2, name: 'HOUSE PLANS', startOffset: 5, duration: 65, dependencies: [] },
    { id: 3, name: 'LOT SURVEY & EXCAVATION', startOffset: 12, duration: 65, dependencies: [1] }, // Maps to Ground Mesh
    { id: 12, name: 'SPECIAL MATERIALS (STEEL/LUMBER)', startOffset: 35, duration: 60, dependencies: [2] },
    { id: 13, name: 'WINDOWS/OPENINGS', startOffset: 40, duration: 60, dependencies: [12] }, // Maps to Windows
    { id: 20, name: 'LAYOUT HOUSE', startOffset: 60, duration: 60, dependencies: [3] },
    { id: 23, name: 'PREPARE FOOTINGS', startOffset: 63, duration: 60, dependencies: [20] },
    { id: 24, name: 'POUR FOOTINGS & PADS', startOffset: 67, duration: 60, dependencies: [23] }, // Maps to Foundation
    { id: 28, name: 'FOUNDATION WALLS', startOffset: 71, duration: 67, dependencies: [24] }, // Maps to Basement Walls
    { id: 36, name: 'PREPARE SLABS', startOffset: 90, duration: 60, dependencies: [28] },
    { id: 37, name: 'POUR CONCRETE SLABS', startOffset: 96, duration: 60, dependencies: [36] }, // Maps to Slabs
    { id: 40, name: 'BLOCK WORK / CHIMNEY', startOffset: 102, duration: 60, dependencies: [37] }, // Maps to Walls
    { id: 45, name: 'ROOFING', startOffset: 116, duration: 67, dependencies: [40] }, // Maps to Roof
    { id: 51, name: 'INSULATION & WALLS', startOffset: 133, duration: 67, dependencies: [45] },
    { id: 54, name: 'DRYWALL', startOffset: 144, duration: 66, dependencies: [51] },
    { id: 56, name: 'TRIM CARPENTRY', startOffset: 151, duration: 67, dependencies: [54] },
    { id: 66, name: 'FLOORING', startOffset: 179, duration: 63, dependencies: [56] },
    { id: 75, name: 'FINISH PUNCH LIST', startOffset: 200, duration: 60, dependencies: [66] },
     // Additional tasks needed for full scope but with unique IDs
    { id: 101, name: 'PLUMBING ROUGH-IN', startOffset: 105, duration: 40, dependencies: [28] },
    { id: 102, name: 'ELECTRICAL ROUGH-IN', startOffset: 105, duration: 40, dependencies: [40] },
    { id: 103, name: 'HVAC INSTALLATION', startOffset: 120, duration: 30, dependencies: [45] },
    { id: 104, name: 'EXTERNAL PAINTING', startOffset: 160, duration: 30, dependencies: [54] }
    
];
const DEFAULT_CREDENTIALS = {
    site: { user: 'SiteEngineer@urban-axis.com', pass: 'site_eng@12345' },
    arch: { user: 'Architect@urban-axis.com', pass: 'arch@12345' },
    str: { user: 'Structural@urban-axis.com', pass: 'str@12345' },
    mep: { user: 'MEP@urban-axis.com', pass: 'mep@12345' },
    pm: { user: 'Manager@urban-axis.com', pass: 'pm@12345' },
    contractor: { user: 'Contractor@urban-axis.com', pass: 'contractor@12345' },
    client: { user: 'Client@urban-axis.com', pass: 'client@12345' },
    viewer: { user: 'Viewer@urban-axis.com', pass: 'viewer@12345' },
    admin: { user: 'Admin@urban-axis.com', pass: 'admin@12345' }
};
// MODIFICATION: Added default salaries for resource calculation
const DEFAULT_DEPARTMENT_SALARIES = {
    'Architectural': 12000, 'Structural': 12000, 'MEP': 8000, 'Mechanical': 8000, 'AOR': 7000, 'Tender': 5000, 'Draftsmen': 5000, 'Account': 5000, 'Manager': 7000, 'Site': 8000, 'Submission': 7000, 'Default': 4000
};
       
// MODIFICATION: Cleaned up this array to match keys in the details object below.
const SCOPE_OF_WORK_DETAILS_KEYS = [
    'New Construction',
    'Modification',
    'AOR Service',
    'Supervision',
    'Interior Design',
    'BIM',
    'Extension',
    'Project Management',
    'Swimming Pool',
    'Tendering',
    'Landscaping'
];
// ===================================================================================
// MODULE 1: CONTENT DEFINITIONS
// ===================================================================================

const DESIGN_SCRUM_TEMPLATE = [
    { id: 1, name: 'Project Kickoff & Client Requirements', duration: 5, dependencies: [], department: 'Manager', fixed_time: 3 },
    { id: 2, name: 'Prepare Initial Design Proposal', duration: 8, dependencies: [1], department: 'Architectural', fixed_time: 7 },
    { id: 3, name: 'Client Presentation & Feedback Round 1', duration: 3, dependencies: [2], department: 'Manager', fixed_time: 3 },
    { id: 4, name: 'Revise Design based on Feedback', duration: 5, dependencies: [3], department: 'Architectural', fixed_time: 5 },
    { id: 5, name: 'Finalize Architectural Plan Layout', duration: 5, dependencies: [4], department: 'Draftsmen', fixed_time: 5 },
    { id: 6, name: 'Develop Perspectives & Elevations', duration: 7, dependencies: [5], department: 'Architectural', fixed_time: 7 },
    { id: 7, name: 'Request/Receive Topographic Survey', duration: 7, dependencies: [1], department: 'Site', fixed_time: 7 },
    { id: 8, name: 'Request/Receive Soil Test Report', duration: 15, dependencies: [1], department: 'Site', fixed_time: 10 },
    { id: 9, name: 'Request/Receive Renewed Affection Plan & Load Confirmation', duration: 10, dependencies: [1], department: 'AOR', fixed_time: 3 },
    { id: 10, name: 'Develop Section Drawings', duration: 8, dependencies: [5], department: 'Draftsmen', fixed_time: 8 },
    { id: 11, name: 'Client Approval on Final Visuals & Sections', duration: 3, dependencies: [6, 10], department: 'Manager', fixed_time: 3 },
    { id: 12, name: 'Prepare Preliminary Drawings for Developer/Authority', duration: 15, dependencies: [11, 7, 8, 9], department: 'Submission', fixed_time: 5 },
    { id: 13, name: 'Submit & Await Developer/Authority Preliminary Approval', duration: 20, dependencies: [12], department: 'AOR', fixed_time: 15 },
    { id: 14, name: 'Finalize Architectural Package for Coordination', duration: 7, dependencies: [13], department: 'Architectural', fixed_time: 7 },
    { id: 15, name: 'Share Package with MEP & Structural Teams', duration: 1, dependencies: [14], department: 'Manager', fixed_time: 1 },
    { id: 16, name: 'Receive & Review MEP/Structural Concerns (Shafts, Columns)', duration: 5, dependencies: [15], department: 'Architectural', fixed_time: 5 },
    { id: 17, name: 'Accommodate MEP/Structural Feedback & Reshare', duration: 4, dependencies: [16], department: 'Architectural', fixed_time: 3 },
    { id: 18, name: 'MEP Team Finalizes Drawings', duration: 10, dependencies: [17], department: 'MEP', fixed_time: 7 },
    { id: 19, name: 'Structural Team Finalizes Drawings', duration: 10, dependencies: [17], department: 'Structural', fixed_time: 7 },
    { id: 20, name: 'Start NOC Application Process (Parallel)', duration: 20, dependencies: [13], department: 'AOR', fixed_time: 20 },
    { id: 21, name: 'Prepare Final Architectural Tender Drawings', duration: 7, dependencies: [17], department: 'Draftsmen', fixed_time: 7 },
    { id: 22, name: 'Compile Full Tender Package (Arch, STR, MEP)', duration: 3, dependencies: [18, 19, 21], department: 'Tender', fixed_time: 3 },
    { id: 23, name: 'Submit for Final Building Permit', duration: 3, dependencies: [22, 20], department: 'Submission', fixed_time: 3 },
    { id: 24, name: 'Await Final Building Permit Approval', duration: 15, dependencies: [23], department: 'AOR', fixed_time: 15 },
    { id: 25, name: 'Float Tender to Contractors (Parallel)', duration: 2, dependencies: [22], department: 'Tender', fixed_time: 1 },
    { id: 26, name: 'Receive & Analyze Tender Proposals', duration: 15, dependencies: [25], department: 'Tender', fixed_time: 7 }
];
const CONTENT = {
    VAT_TRN: '100337020000003',
    BANK_DETAILS: {
        name: 'Urban Axis ARCHITECTURAL & CONSULTING ENGINEERS',
        bank: 'AL MASRAF BANK',
        ac: '611000432052',
        iban: 'AE230080000611000432052',
        swift: 'ABINAEAAXXX'
    },
    AUTHORITY_MAPPING: {
        'dubai': 'DM',
        'abu dhabi': 'DMT',
        'al ain': 'DMT',
        'sharjah': 'Sharjah Municipality',
        'ajman': 'Ajman Municipality',
        'ras al khaimah': 'RAK Municipality',
        'rak': 'RAK Municipality',
        'umm al quwain': 'UAQ Municipality',
        'uaq': 'UAQ Municipality',
        'fujairah': 'Fujairah Municipality'
    },
    AREA_AUTHORITY_NAMES: {
        'dubai': {
            main_authority_short: 'DM',
            main_authority_long: 'Dubai Municipality',
            civil_defense: 'Dubai Civil Defense (DCD)',
            electricity_water: 'Dubai Electricity & Water Authority (DEWA)'
        },
        'abu dhabi': {
            main_authority_short: 'DMT',
            main_authority_long: 'Department of Municipalities and Transport',
            civil_defense: 'Abu Dhabi Civil Defence (ADCD)',
            electricity_water: 'Abu Dhabi Distribution Company (ADDC)'
        },
        'sharjah': {
            main_authority_short: 'Sharjah Municipality',
            main_authority_long: 'Sharjah Municipality',
            civil_defense: 'Sharjah Civil Defence',
            electricity_water: 'Sharjah Electricity, Water and Gas Authority (SEWA)'
        },
        'default': {
            main_authority_short: 'Local Municipality',
            main_authority_long: 'the concerned Local Municipality',
            civil_defense: 'the local Civil Defense department',
            electricity_water: 'the local Electricity & Water Authority'
        }
    },
    AUTHORITY_DETAILS: {
        Emaar: { name: 'M/s Emaar', address: 'Planning Department<br>Dubai, U.A.E.' },
        DM: { name: 'M/s Dubai Municipality', address: 'Planning Department<br>Dubai, U.A.E.' },
        DDA: { name: 'M/s Dubai Development Authority', address: 'Planning Department<br>Dubai, U.A.E.' },
        DubaiSportsCity: { name: 'M/s Dubai Sports City', address: 'Planning Department<br>Dubai, U.A.E.' },
        EmiratesHills: { name: 'Emirates Hills', address: 'P.O. Box 9440<br>Dubai, United Arab Emirates' }
    },
    SCOPE_OF_WORK_DETAILS: {
        'New Construction': {
            brief: 'New Construction Consultancy',
            detail: 'Comprehensive architectural and engineering consultancy for proposed new construction projects, from initial concept design through to project completion and handover.',
            scopeSections: ['1', '2', '3', '4', '5', '6']
        },
        'Modification': {
            brief: 'Modification & Renovation Services',
            detail: 'Design and supervision for modification, renovation, and alteration works on existing buildings, including site surveying and preparation of as-built drawings.',
            scopeSections: ['1', '2', '3', '4', '5', '6']
        },
        'AOR Service': {
            brief: 'Architect of Record (AOR) Services',
            detail: 'Providing Architect of Record (AOR) services for projects where designs are provided by others. This includes reviewing employer\'s design, advising on local authority compliance, preparing submission formats (DWF/PDF), managing online submissions, project tracking, and obtaining all necessary NOCs and the final Building Permit.',
            scopeSections: ['2', '3']
        },
        'Supervision': {
            brief: 'Site Supervision Services [{supervisionVisits} visits/month]',
            detail: 'Manage and supervise the execution of works at site through scheduled site visits to monitor progress and ensure conformity with drawings and contract documents. This includes reviewing contractor submittals, approving materials, preparing progress reports, and certifying interim payments. Additional supervision beyond the agreed scope will be charged at AED {additionalSupervisionFee}/visit.',
            scopeSections: ['5', '6']
        },
        'Interior Design': {
            brief: 'Interior Design Services',
            detail: 'Complete interior design services, from space planning and concept development to material selection, furniture specification, and preparation of detailed drawings for execution.',
            scopeSections: ['7']
        },
        'BIM': {
            brief: 'Building Information Modeling (BIM)',
            detail: 'Building Information Modeling (BIM) services including 3D modeling, clash detection, and documentation.',
            scopeSections: ['12', '13']
        },
        'Extension': {
            brief: 'Building Extension Design & Supervision',
            detail: 'Specialized consultancy services for designing and managing building extension projects, ensuring seamless integration with the existing structure and compliance with all relevant building codes.',
            scopeSections: ['1', '2', '3', '5']
        },
        'Project Management': { brief: 'Project Management', detail: 'The Consultant\'s representative will assist the Client if he/she requires the assistance, to visit interior Related Market/ shops/ showrooms for Selections of furnishings, furniture, decorations, accessories, FF & E etc and coordinating with the contractors during the office hours which will be covered as project management fees', scopeSections: ['1', '4', '5', '6'] },
        'Swimming Pool': { brief: 'Swimming Pool Design & Approval', detail: '...', scopeSections: ['2', '3'] },
        'Tendering': { brief: 'Tendering Services', detail: '...', scopeSections: ['4'] },
        'Landscaping': { brief: 'Landscaping Design', detail: '...', scopeSections: ['2', '3', '7'] },
         'Structural Review': { brief: 'Structural Design Review', detail: 'Review and reporting on third-party structural drawings and calculations.', scopeSections: ['14'] },
        'Existing Structural Review': { brief: 'Existing Structure Assessment', detail: 'Assessment of existing structures, including recommendations for strength testing.', scopeSections: ['14']}
    },
    BRIEF_PROPOSAL_TERMS: [
        { id: 'specialApprovals', text: 'Any Special Approvals by Authorities to be paid by the client.' },
        { id: 'submissionCharges', text: 'Authorities submissions / Resubmission charges to be paid by the owner.' },
        { id: 'siteVisits', text: '{supervisionVisits} site visits are included in the package.' },
        { id: 'extraSupervision', text: 'Extra Supervision charged separately ({additionalSupervisionFee} AED per visit).' },
        { id: 'surveyWorks', text: 'Any survey works if required, will be charged separately.' },
        { id: 'neighborNOC', text: 'NOC from neighbor will be provided by the client.' }
    ],
    FEE_MILESTONES: [
        { id: 'advance', text: 'Advance', defaultPercentage: 15 },
        { id: 'prep_dwg', text: 'On Preparation of Drawings', defaultPercentage: 10 },
        { id: 'approve_client', text: 'On Approval of Drawings by Client', defaultPercentage: 10 },
        { id: 'approve_dev', text: 'On Getting Approval from Developer (DDA)', defaultPercentage: 10 },
        { id: 'submit_auth', text: 'On Submission to Authority', defaultPercentage: 10 },
        { id: 'approve_auth', text: 'On Approval from Authority', defaultPercentage: 10 },
        { id: 'prep_tender', text: 'On Preparation of Tender', defaultPercentage: 10 },
        { id: 'tender_analysis', text: 'On Tender Analysis', defaultPercentage: 5 },
        { id: 'get_noc', text: 'On Getting NOCs', defaultPercentage: 5 },
        { id: 'get_permit', text: 'On Getting Building Permit', defaultPercentage: 10 },
        { id: 'tender_invitation', text: 'On Tender Invitation', defaultPercentage: 5 },
    ],
    NOTES: [
        { id: 'note-special', text: 'Any special approvals will be charged separately.' },
        { id: 'note-green', text: 'Green Building approvals, Environment Impact study Assessment, Traffic Impact Study & Third party Design analysis will be done by Specialists (if required) the price of the above is excluded in our offer.' },
        { id: 'note-bidders', text: 'Consultant has allowed for 4 bidders only for the bid invitations, review & analysis.' },
        { id: 'note-authority', text: 'Authority Fee charged separately.' }
    ],
    SCOPE_DEFINITIONS: {
        
        
    1: [
        { id: '1.1', brief: 'Study Owner Requirements', detailed: "<b>1.1 Study the Owners requirements and advise as necessary.</b>" },
        { id: '1.2', brief: 'Site Inspection & Info Gathering', detailed: "<b>1.2 The consultant shall visit and properly inspect, consistent with the level of professional skill and care required hereunder, the Project site and any structure(s) or other man-made features to be modified:</b><p> familiarize itself with the survey, including the location of all existing buildings, utilities, conditions, streets equipment, components and other attributes having or likely to have an impact on the Project; familiarize itself with the Owner's layout and design requirements, conceptual design objectives and budget for the project; familiarize itself with pertinent Project dates and programming needs, including the Project design schedule, review and analyze all Project geotechnical, hazardous substances, structural, chemical, electrical, mechanical and construction materials tests, investigations and recommendations if required; and gather any other information necessary for a thorough understanding of the Project." },
        { id: '1.3', brief: 'Revise Plans per Regulations', detailed: "<b>1.3 Revise the site plans and Owner's requirements in view of the applicable building regulations of all the concerned authorities.</b><p> Endeavour to develop, implement and maintain, in consultation with the Owner and Builder, a spirit of cooperation, collegiality and open communication among the parties so that the goals and objectives of each are clearly understood, potential problems are resolved promptly, and, upon completion, the Project is deemed a success by all parties.  The consultant shall perform all services in accordance with requirements of governmental agencies having jurisdiction over the Project such as {main_authority_long}, {civil_defense}, and other concerned authorities.The Consultant's design shall comply with applicable building codes, accessibility laws and regulations." },
        { id: '1.4', brief: 'Conduct Design Workshops', detailed: "<b>1.4 During the design phases, the consultant agrees to provide, as part of Basic Services, on-site program and budget verification, development and review workshops necessary or desirable to develop a design, acceptable to Owner and its user groups, which is within Owner's budget.</b><p> Such workshop(s) will be conducted with representatives of Owner's user groups. The preliminary drawings and plans of the project shall be prepared including cross-section for the various floors and the main elevations." },
        { id: '1.5', brief: 'Prepare Draft Specifications', detailed: "<b>1.5 Prepare and draft specifications</b><p> in accordance with requirements of the owner and as per the authorities' regulation." }
    ],
    2: [
        { id: '2.1', brief: 'Prepare Preliminary Designs', detailed: "<b>2.1 Based upon the approved Conceptual Schematic Design studies, the consultant shall prepare, for approval by the Owner, Preliminary Design Documents consisting of drawings, 3-dimensional renderings and other documents illustrating the scale and relationship of Project components and building systems parameters.</b><p> Consultant shall prepare and submit the preliminary drawings including Architectural floor plans, Elevations, Sections, Built up and FAR calculations, Parking calculations, in accordance with the requirements of the concerned authority." },
        { id: '2.2', brief: 'Prepare & Submit DWF Files', detailed: "<b>2.2 Preparation of DWF formats from DWG files.</b><p> Submit all necessary documents to Concerned Authority, regular project tracking, preparation of building cards and data sheets, preparation of green building data sheets." },
        { id: '2.3', brief: 'Obtain Preliminary Approval', detailed: "<b>2.3 Obtain the preliminary approval from the concerned authorities for the preliminary drawings.</b><p> Furnish the owner with one set of approved drawings (pdf format)." },
        { id: '2.4', brief: 'Coordinate with Interior Designer', detailed: "<b>2.4 Coordinate and liaise with the Interior Designer for Architectural and MEP layouts and elevations based on AutoCAD." },
        { id: '2.5', brief: 'Manage Soil Investigation & NOCs', detailed: "<b>2.5 Invite reputable soil investigation firms to quote for the Soil Investigation works and topographic works and assign the job to the successful bidder.</b><p> Apply for all NOCs such as {electricity_water}, Etisalat / DU, {civil_defense}, RTA (if required, documents to be prepared by specialized RTA consultant) Final Inspection chamber (FIC)." },
        { id: '2.6', brief: 'Revise Provisional Costs', detailed: "<b>2.6 Revise the provisional costs of the project as per the above.</b>" }
    ],
    3: [
        { id: '3.1', brief: 'Topographic Survey', detailed: "<b>3.1 Undertake the required topographic survey and leveling works, cut and fill (by specialized contractor if required).</b>" },
        { id: '3.2', brief: 'Prepare Final Drawings', detailed: `<b>3.2 Prepare the Final drawing and designs of the project as per the following:</b><p><ol type="A" class="nested-scope-list" data-section="3.2"></ol>` },
        { id: '3.3', brief: 'Submit for Building Permit', detailed: "<b>3.3 Submit the drawings to the Municipality or other concerned authorities for approval & obtaining the Building Permit.</b>" },
        { id: '3.4', brief: 'Provide As-Built Drawings', detailed: "<b>3.4 Furnish the Owner with one set of the As-Built drawings of the project.</b>" }
    ],
    '3.2': [
        { id: '3.2.A', brief: 'Architectural', detailed: "<b>A. The Architectural drawings:</b><p> Detailed Setting out, floor plans, elevations, sections, finishes schedules, area calculations, garbage calculations, green building calculations, architectural detailed enlarged sections and point details, door window schedules, kitchen and toilet details, compound wall details, external structures detailed drawings." },
        { id: '3.2.B', brief: 'Structural', detailed: "<b>B. Structural drawings:</b><p> Detailed drawings such as framing plans, foundations details, column beam schedules, structural details, column beam layouts, structural grids, detailed structural calculations, ETABS model or equivalent." },
        { id: '3.2.C', brief: 'Electrical', detailed: "<b>C. Electrical drawings:</b><p> Detailed floor plans, layouts, power and lighting details, single line diagrams, LV design and load schedules, trench details, substations lv room details." },
        { id: '3.2.D', brief: 'Plumbing', detailed: "<b>D. Plumbing drawings:</b><p> Complete drainage and water supply layouts, riser diagrams, invert level calculations, FIC details, and standard details." },
        { id: '3.2.E', brief: 'Air Conditioning', detailed: "<b>E. Air Conditioning drawings:</b><p> AC layouts ducting layouts, wall and slab sections, insulation details, U values as per green building requirements, AC calculations on HAP as per Dubai Municipality regulations." },
        { id: '3.2.F', brief: 'Fire & Alarm', detailed: "<b>F. Fire protection and Alarm system drawings:</b><p> Firefighting and fire protection layouts, emergency evacuation plans, sprinklers layouts, smoke detectors layouts, riser diagrams and hydraulic calculations (if required)." },
        { id: '3.2.G', brief: 'Solar Panel', detailed: "<b>G. Solar Panel:</b><p>Basic Layout solar panel coordination on roof area. Consultancy and suggestions by expert."}
    ],
    4: [ // MODIFICATION: Added separate BOQ items
        { id: '4.1', brief: 'Prepare Tender Documents', detailed: "<b>4.1 Prepare the Project drawings, Tender & contract documents, General and Particular terms and conditions of the contract agreement.</b>" },
        { id: '4.2', brief: 'Propose Contractors', detailed: "<b>4.2 Propose competent contractors suitable for the execution of the project in consultation with the Owner.</b>" },
        { id: '4.3.A', brief: 'Prepare Architectural BOQ', detailed: "<b>4.3.A Prepare Bill of Quantities for Architectural and Finishing works.</b>" },
        { id: '4.3.B', brief: 'Prepare Structural BOQ', detailed: "<b>4.3.B Prepare Bill of Quantities for Structural works.</b>" },
        { id: '4.3.C', brief: 'Prepare MEP BOQ', detailed: "<b>4.3.C Prepare Bill of Quantities for MEP works.</b>" },
        { id: '4.4', brief: 'Tender Analysis Report', detailed: "<b>4.4 Propose a financial & technical analysis report for the received offers along with Consultants recommendations in this regard and submit it to the Owner for approval.</b>" },
        { id: '4.5', brief: 'Place Contract with Bidder', detailed: "<b>4.5 Upon the approval of the Owner, the Consultant shall place the Contract with the successful tender in the presence of the Owner or his representatives.</b>" }
    ],
    5: [
        { id: '5.1', brief: 'Provide Gantt Chart', detailed: "<b>5.1 Contractor to provide Gant Chart to show estimated Timeline of project.</b>" },
        { id: '5.2', brief: 'Provide Technical Advice', detailed: "<b>5.2 Provide the Owner with the required technical advice when and as necessary.</b>" },
        { id: '5.3', brief: 'Supervise Site Works', detailed: "<b>5.3 Manage and supervise the execution of works at site through site-visits, in order tofollow up the progress of the works and ensure their conformity with the drawings,contract documents, acceptable engineering practices and the terms andconditions of the Contract agreement. The Consultant may issue instructions to the contractor to abide by the terms and conditions of the Contract agreementand/or require him to comply with the Specifications and standards.</b>" },        
{ id: '5.4', brief: 'Approve Workshop Drawings', detailed: "<b>5.4 Approve the detailed workshop drawings proposed by the Contractor, Subcontractors or Suppliers before commencement of execution.</b>" },
        { id: '5.5', brief: 'Interior Design Submissions', detailed: "<b>5.5 Interior Design Scope - Design Submissions:</b><p>Compile and submit working drawings (A-3 copy and PDF) and BOQs (A-4 copy and PDF)The compilations will be categorized on a per area basis." },
        { id: '5.6', brief: 'Provide Clarifications', detailed: "<b>5.6 Provide the Contractor with all necessary clarifications pertaining to the Contract Documents in order to ensure the satisfactory completion of the project.</b>" },
        { id: '5.7', brief: 'Approve Material Samples', detailed: "<b>5.7 Approve the samples of materials supplied by the Contractor for use in the project and endure their soundness with the standards and specifications.</b>" },
        { id: '5.8', brief: 'Inspect Materials & Workmanship', detailed: "<b>5.8 Inspect the materials and their workmanship, and order all necessary tests to be carried on them under his own Supervision.</b>" },
        { id: '5.9', brief: 'Report Progress to Owner', detailed: "<b>5.9 Report to the Owner on the Progress of the project at regular periods.</b>" },
        { id: '5.10', brief: 'Prepare Interim Payments', detailed: "<b>5.10 Prepare interim payment certificates monthly.</b>" },
        { id: '5.11', brief: 'Handle Variations/Amendments', detailed: "<b>5.11 Apply to the concerned authorities as per the applicable procedures to obtain their approval for any amendments/variations agreed upon in writing between the Owner and the Contractor.</b>" },
        { id: '5.12', brief: 'Review Contractor Claims', detailed: "<b>5.12 Review the Contractor's claims and submit his recommendations to the Owner.</b>" },
        { id: '5.13', brief: 'Final Inspection & Certificates', detailed: "<b>5.13 Carry out the final inspection of the works, issue the final acceptance certificates and prepare the final settlements account and Contractor's due payments.</b>" }
    ],
    6: [
        { id: '6.1', brief: 'Guide Owner on Material Selection', detailed: "<b>6.1 The Consultant shall from time to time obtain the approval from the Owner for the use of the material in the construction, decoration of Project for quality, design and colours before giving any approval to the Contractor.</b><p> However the consultant being an expert in this field should give his best opinion and guide the owner in decision making." },
        { id: '6.2', brief: 'Relieved from Liability for Others', detailed: "<b>6.2 The Consultant shall be relieved from responsibility for any injuries resulting from the default and/or instructions of other parties.</b><p> Additionally, the consultant shall not be held responsible for any damage/defects resulting from the acts of God." }
    ],
    7: [
        { id: '7.1', brief: 'Prepare Mood Boards & 3D Renders', detailed: '<b>7.1 Prepare Interior Design Concepts:</b><p>Develop Mood Boards for each area with reference images and color schemes. Prepare 2 or more 3D Render views for each major area.' },
        { id: '7.2', brief: 'Develop Detailed Interior Layouts', detailed: '<b>7.2 Develop Detailed Layouts:</b><p>Prepare detailed interior layouts for all areas<p><ul><li>Flooring layouts</li><li>Ceiling layouts (RCP)</li><li>Elevations with furniture </li><li>Lighting and Electrical</li><li>Mood board </li>...</ul>' },
        { id: '7.3', brief: 'Prepare Interior BOQ & Specifications', detailed: '<b>7.3 Prepare Tender Documents:</b><p>Prepare detailed Bill of Quantities (BOQ) and Specification documents for all interior finishes, fixtures, and furniture (FF&E).' },
        { id: '7.4', brief: 'Manage Showroom Visits & Samples', detailed: '<b>7.4 Project Management & Selections:</b><p>Assist the Client with visits to interior related markets/shops/showrooms for selections.Project Management starts with the commencement of design execution on site.' },
         { id: '7.5', brief: 'Preparing BOQ for ID items', detailed: '<b>7.5 Project Management & Selections:</b><p>The BOQs will be compiled and submitted in an A-4 copy and a CD (soft copy in PDF). The compilations with be categorized on a per package basis.' },
{ id: '7.6', brief: 'Project Management for Interior works', detailed: '<b>7.6 Project Management Stage: </b><p>The Consultants representative will assist the Client if he/she requires the assistance, to visit interior Related Market/ shops/ showrooms for Selections of furnishings, furniture, decorations, accessories, FF & E etc and coordinating with the contractors during the office hours which will be covered as project management fees.  Project Management starts with the commencement of design execution on site.' },
{ id: '7.7', brief: 'Project Management OverTime 800 Aed/-  after office hours', detailed: '<b>7.7 It will be charged at AED 800/hour extra, if after office hours, weekends, or public holidays.' }
    ],
    8: [
        { id: '8.1', brief: 'Fee Calculation Basis', detailed: "<b>8.1 The project cost shall first be calculated on the basis of the provisional cost of the project and then on the basis of the accepted offer price and then the actual cost of the project on effecting the final payment to the Contractor.</b><p> The above ratios of fees for the various project stages shall be adjusted according to the applicable data at the time of payment." },
        { id: '8.2', brief: 'Definition of Actual Cost', detailed: "<b>8.2 The actual cost of the project shall consist of the total payments made to the contractor, the payments made against contractors claims arising out of the contract agreement minus any penalty amounts deducted from the contractor & the fair evaluation to any labour, materials or machinery provided by the owner to the contractor.</b>" },
        { id: '8.3', brief: 'Exclusions from Consultancy Fees', detailed: `<b>8.3 The following are not included in the consultancy fees:</b>...` }
    ],
    9: [
        { id: '9.1', brief: 'Owner to Issue Instructions via Consultant', detailed: "<b>9.1 The Owner undertakes not to enter any amendments on the designs or issue any technical instruction except through the Consultant.</b><p> In case of the Owner does not abide by this condition, the Consultant shall relieve himself from any responsibility for the consequences of such amendments or instructions." },
        { id: '9.2', brief: 'Owner-appointed Staff to follow Consultant', detailed: "<b>9.2 If the Owner insists to appoint a supervision staff such staff shall abide by the Consultants instructions and in case of their non-abidance, the Consultant shall not bear the responsibility for any technical and legal obligations arising out of the contract-agreement;</b><p> provided the official authorities and the Owner are kept informed accordingly." }
    ],
    10: [
        { id: '10.1', brief: 'Handling of Amendments/Variations', detailed: "<b>10. Amendments:</b><p> Should the need arises for any amendment or variation on the designs or documents already prepared by the Consultant at the request of the Owner, the Consultant shall be entitled to remuneration for such amendments and variations as agreed upon between the Consultant and the Owner prior to the commencement of work." }
    ],
    11: [
        { id: '11.1', brief: 'Entitlement to Fees on Extension', detailed: "<b>11.1 Where the need arises for the extension of the original completion period of the project as stated in the contract agreement concluded between the Owner and the Contractor for any reason whatsoever in which the Consultant is not involved, the Consultant shall be entitled to remuneration as per the monthly supervision fees.</b>" },
        { id: '11.2', brief: 'Remuneration on Suspension/Termination', detailed: "<b>11.2 If at any stage of Consultancy work the Consultant's work is partially or totally suspended/Terminated by the order of the Client, the Consultant shall be entitled to a remuneration for the completed stage plus the remuneration for the stage which he has just commenced as well as reasonable remuneration for work completed for the following stages and any other proved costs and expenditures borne by the Consultant in the course of the project execution.</b>" },
        { id: '11.4', brief: 'Delay by Contractor', detailed: "<b>11.4 If there is a delay in the project completion period from the Contractor's side, the Consultant's monthly supervision charges for the extended supervision shall be paid by the contractor as agreed mutually by the Consultant & Contractor till the project is completed.</b>" },
        { id: '11.5', brief: 'Delay by Owner', detailed: "<b>11.5 If there is a delay in the project from Owner's side, the Consultant's monthly supervision charges for the extended supervision shall be paid by the owner which will be agreed mutually between consultant and owner till the project is completed.</b>" }
    ],
    12: [ 
        { id: '12.1', brief: 'Architectural BIM Modeling', detailed: "<b>12.1 Architectural BIM Modeling:</b><p>Development of a 3D architectural model for coordination and visualization." },
        { id: '12.2', brief: 'Structural BIM Modeling', detailed: "<b>12.2 Structural BIM Modeling:</b><p>Development of a 3D structural model, including rebar modeling if required." },
        { id: '12.3', brief: 'MEP BIM Modeling', detailed: "<b>12.3 MEP BIM Modeling:</b><p>Development of a 3D MEP model for all mechanical, electrical, and plumbing systems." },
        { id: '12.4', brief: 'Clash Detection', detailed: "<b>12.4 Clash Detection & Coordination:</b><p>Combining all models into a federated model to run clash detection reports and coordinate resolutions between disciplines." }
    ],
    13: [ // NEW: BIM LOD Section
        { id: '13.1', brief: 'LOD 100 - Concept Design', detailed: "<b>13.1 Level of Detail 100:</b> Model elements are represented with a mass or symbol to analyze basic parameters like area, volume, orientation, and cost." },
        { id: '13.2', brief: 'LOD 200 - Schematic Design', detailed: "<b>13.2 Level of Detail 200:</b> Model elements are represented as generic systems with approximate quantities, size, shape, location, and orientation." },
        { id: '13.3', brief: 'LOD 300 - Detailed Design', detailed: "<b>13.3 Level of Detail 300:</b> Model elements are graphically represented as specific systems, objects or assemblies in terms of quantity, size, shape, location, and orientation." },
        { id: '13.4', brief: 'LOD 350 - Construction Documentation', detailed: "<b>13.4 Level of Detail 350:</b> Model elements include details necessary for cross-coordination, such as connections and interfaces with other elements." },
        { id: '13.5', brief: 'LOD 400 - Fabrication & Assembly', detailed: "<b>13.5 Level of Detail 400:</b> Model elements are modeled with sufficient detail for fabrication, assembly, and installation." }
    ],
   14: [
            { id: '14.1', brief: 'Review of Third-Party Drawings', detailed: `<b>14.1 Structural Review of Drawings Received from Client:</b><p>Review and provide comments on structural drawings prepared by a third party for the following elements:</p><ol type="A" class="nested-scope-list" data-section="14.1"></ol>` },
            { id: '14.2', brief: 'Assessment of Existing Structures', detailed: "<b>14.2 Assessment of Existing Structures:</b><p>Conduct a visual inspection and review of as-built information for existing structural elements. This service includes recommending necessary on-site tests to verify the strength and integrity of concrete and steel reinforcement.</p>" },
            { id: '14.3', brief: 'Strength Testing Coordination', detailed: "<b>14.3 Coordination of Material Strength Testing:</b><p>Coordinate and supervise third-party specialists to conduct tests such as Core Testing for concrete compressive strength, and rebar scanning/testing for steel reinforcement details. A final report will be issued based on the test results." }
        ],
        '14.1': [ // Sub-items for the drawing review
            { id: '14.1.A', brief: 'Footing / Raft / Piles', detailed: "<b> Foundation Systems:</b> Footings, Raft, and Piles" },
            { id: '14.1.B', brief: 'Retaining & Shoring Walls', detailed: "<b> Earth-Retaining Systems:</b> Retaining Walls and Shoring Walls" },
            { id: '14.1.C', brief: 'Slabs & Beams', detailed: "<b> Horizontal Elements:</b> Slabs and Beams" },
            { id: '14.1.D', brief: 'Columns', detailed: "<b> Vertical Elements:</b> Columns" },
            { id: '14.1.E', brief: 'Staircases', detailed: "<b> Staircases:</b> Concrete and/or Metal/Steel Staircases" },
            { id: '14.1.F', brief: 'Ancillary Structures', detailed: "<b> Ancillary Structures:</b> Pergolas, Sheds, Warehouse Structures" }
        ]
    
},
    VILLA_SCHEDULE_TEMPLATE: [
        { id: 1, name: 'MOBILIZATION', startOffset: 0, duration: 62, dependencies: [] }, 
        { id: 2, name: 'SHORING WORKS', startOffset: 31, duration: 19, dependencies: [1] }, 
        { id: 3, name: 'EXCAVATION WORK', startOffset: 51, duration: 27, dependencies: [2] }, 
        { id: 4, name: 'COMPACTION & PCC', startOffset: 62, duration: 31, dependencies: [3] }, 
        { id: 5, name: 'WATER-PROOFING', startOffset: 71, duration: 130, dependencies: [4] }, 
        { id: 6, name: 'SUB-STRUCTURE', startOffset: 109, duration: 140, dependencies: [5] },
 { id: 24, name: 'SUB-STRUCTURE:RAFT', startOffset: 109, duration: 140, dependencies: [6] }, { id: 28, name: 'SUB-STRUCTURE:RATAINING WALL', startOffset: 109, duration: 140, dependencies: [6] },   { id: 24, name: 'SUB-STRUCTURE:RAFT', startOffset: 109, duration: 140, dependencies: [6] },    
        { id: 7, name: 'B/WALL WORKS', startOffset: 385, duration: 74, dependencies: [10] }, 
        { id: 3, name: 'FIRST FLOOR SLAB', startOffset: 213, duration: 45, dependencies: [6] }, 
         { id: 37, name: 'FIRST FLOOR SLAB:slab', startOffset: 213, duration: 45, dependencies: [6] },
        { id: 9, name: 'ROOF SLAB WORKS', startOffset: 259, duration: 46, dependencies: [18] },
{ id: 45, name: 'ROOF SLAB WORKS:slab', startOffset: 259, duration: 46, dependencies: [18] },         
        { id: 10, name: 'UPPER ROOF SLAB', startOffset: 342, duration: 23, dependencies: [9] }, 
        { id: 11, name: 'STEEL STAIRCASE', startOffset: 339, duration: 18, dependencies: [10] }, 
        { id: 12, name: 'PLUMBING/DRAINAGE', startOffset: 111, duration: 453, dependencies: [6] }, 
        { id: 13, name: 'WATER TANK', startOffset: 461, duration: 19, dependencies: [10] }, 
        { id: 14, name: 'ELECTRICAL WORKS', startOffset: 62, duration: 483, dependencies: [6] }, 
        { id: 15, name: 'INTERCOM/CCTV', startOffset: 492, duration: 27, dependencies: [21] }, 
        { id: 16, name: 'AC WORK', startOffset: 405, duration: 138, dependencies: [20] }, 
        { id: 17, name: 'FIRE FIGHTING', startOffset: 181, duration: 401, dependencies: [6] }, 
        { id: 18, name: 'BLOCK WORK', startOffset: 204, duration: 189, dependencies: [8] }, 
        { id: 19, name: 'PLASTERING', startOffset: 262, duration: 117, dependencies: [9, 18] }, 
        { id: 20, name: 'GYPSUM CEILING', startOffset: 364, duration: 137, dependencies: [19] }, 
        { id: 21, name: 'INTERNAL FINISHES', startOffset: 410, duration: 127, dependencies: [20] }, 
        { id: 22, name: 'EXTERNAL FINISHES', startOffset: 375, duration: 113, dependencies: [19, 7] }, 
        { id: 23, name: 'ALUMINIUM WORK', startOffset: 339, duration: 207, dependencies: [19] }, 
        { id: 24, name: 'LIFT WORK', startOffset: 436, duration: 142, dependencies: [10] }, 
        { id: 25, name: 'JOINERY WORK', startOffset: 426, duration: 65, dependencies: [21] }, 
        { id: 26, name: 'SWIMMING POOL', startOffset: 461, duration: 54, dependencies: [10] }, 
        { id: 27, name: 'LANDSCAPE WORK', startOffset: 466, duration: 111, dependencies: [22, 26] }, 
        { id: 28, name: 'MAIN GATE WORK', startOffset: 507, duration: 61, dependencies: [7, 22] }, 
        { id: 29, name: 'SNAGGING', startOffset: 565, duration: 7, dependencies: [21, 22, 23, 24, 25, 27, 28] }, 
        { id: 30, name: 'AUTHORITY INSPECTION', startOffset: 572, duration: 5, dependencies: [29] },
    ]
};
    // --- DATA STORE (In a real app, this would come from a database) ---
    const STAFF_DATA = [
        { id: 1, name: 'Faisal M.', role: 'Architect', joinDate: '2005-01-15', grossSalary: 13000, leaveBalance: 30, increments: [], leaves: [] },
        { id: 2, name: 'Adnan K.', role: 'Architect', joinDate: '2022-02-01', grossSalary: 13000, leaveBalance: 30, increments: [], leaves: [] },
        { id: 3, name: 'Imran S.', role: 'Structure Engineer', joinDate: '2021-11-10', grossSalary: 13000, leaveBalance: 30, increments: [], leaves: [] },
        { id: 4, name: 'Bilal H.', role: 'MEP Engineer', joinDate: '2022-05-20', grossSalary: 7000, leaveBalance: 30, increments: [], leaves: [] },
        { id: 5, name: 'Kareem A.', role: 'Designer', joinDate: '2023-01-10', grossSalary: 4000, leaveBalance: 30, increments: [], leaves: [] },
        { id: 6, name: 'Sana R.', role: 'Receptionist', joinDate: '2022-08-01', grossSalary: 3000, leaveBalance: 30, increments: [], leaves: [] },
        { id: 7, name: 'Ali Z.', role: 'Office Boy', joinDate: '2022-09-01', grossSalary: 2000, leaveBalance: 30, increments: [], leaves: [] }
    ];

    const OFFICE_EXPENSES = [
        { id: 1, date: '2024-05-01', category: 'Rent', description: 'Office Rent for May', amount: 7000 },
        { id: 2, date: '2024-05-05', category: 'Utilities (DEWA)', description: 'Electricity and Water bill', amount: 2000 },
        { id: 3, date: '2024-05-10', category: 'Petty Cash', description: 'Monthly petty cash refill', amount: 6000 },
        { id: 4, date: '2024-04-01', category: 'Rent', description: 'Office Rent for April', amount: 7000 },
        { id: 5, date: '2024-04-04', category: 'Utilities (DEWA)', description: 'Electricity and Water bill', amount: 2150 },
        { id: 6, date: '2024-02-15', category: 'Office Supplies', description: 'Stationery and printer toner', amount: 850 },
    ];
    // --- END OF DATA STORE ---
    // --- DATA FROM PDF ---
    // This data is extracted directly from the provided PDF image.
    const STAFF_SALARIES = [
        { role: 'Architect 1', salary: 13000, group: 'Architects' },
        { role: 'Architect 2', salary: 13000, group: 'Architects' },
        { role: 'Structure Engineer 1', salary: 13000, group: 'Engineers' },
        { role: 'Structure Engineer 2', salary: 13000, group: 'Engineers' },
        { role: 'MEP Engineer', salary: 7000, group: 'Engineers' },
        { role: 'Inspection Engineer 1', salary: 7000, group: 'Engineers' },
        { role: 'Inspection Engineer 2', salary: 7000, group: 'Engineers' },
        { role: 'Inspection Engineer 3', salary: 7000, group: 'Engineers' },
        { role: 'Designer 1', salary: 4000, group: 'Designers' },
        { role: 'Designer 2', salary: 4000, group: 'Designers' },
        { role: 'Receptionist', salary: 3000, group: 'Admin' },
        { role: 'Office Boy', salary: 2000, group: 'Admin' },
        { role: 'Staff 1', salary: 2000, group: 'Admin' },
        { role: 'Staff 2', salary: 2000, group: 'Admin' }
    ];

    const MONTHLY_OFFICE_EXPENSES = [
        { item: 'Rent', amount: 7000 },
        { item: 'DEWA', amount: 2000 },
        { item: 'Petty Cash', amount: 6000 }
    ];
    
    const YEARLY_FIXED_EXPENSES = [
        { item: 'LICENSE', amount: 40000 },
        { item: 'Healthcare', amount: 98000 },
        { item: 'Gratuity', amount: 58200 },
        { item: 'Visa', amount: 42000 }
    ];