window.MockData = {
  repo: { name: 'INFERIUS', branch: 'feature/hero-rework', ahead: 3, behind: 2, hasUpstream: true },
  account: { login: 'alexturner', initials: 'AT' },

  // Branch metadata — single source of truth for the filter bar
  branches: [
    { name: 'main',                 shortName: 'main',    lane: 0, isMain: true,  isCurrent: false, isMerged: false },
    { name: 'feature/hero-rework',  shortName: 'hero',    lane: 1, isMain: false, isCurrent: true,  isMerged: false },
    { name: 'feature/audio-system', shortName: 'audio',   lane: 2, isMain: false, isCurrent: false, isMerged: true  },
    { name: 'bugfix/npc-vendor',    shortName: 'npc-fix', lane: 3, isMain: false, isCurrent: false, isMerged: false },
  ],

  stagedFiles: [
    { path: 'Content/Characters/Hero/SK_Hero.uasset',  status: 'M', size: '14.2 MB', lock: { mine: true } },
    { path: 'Content/Maps/L_TownCenter.umap',           status: 'M', size: '8.7 MB',  lock: { mine: true } },
    { path: 'Config/DefaultGame.ini',                   status: 'A', size: '4.1 KB',  lock: null },
  ],

  unstagedFiles: [
    { path: 'Content/Characters/NPC_Vendor.uasset',    status: 'M', size: '6.3 MB',  lock: { owner: 'jordan', mine: false } },
    { path: 'Content/UI/HUD/WBP_Crosshair.uasset',    status: 'M', size: '1.1 MB',  lock: null },
    { path: 'Content/Audio/SFX/footstep_grass.wav',    status: 'A', size: '512 KB',  lock: null },
    { path: 'Source/INFERIUS/HeroCharacter.cpp',       status: 'M', size: '18.4 KB', lock: null },
    { path: 'Source/INFERIUS/HeroCharacter.h',         status: 'M', size: '3.2 KB',  lock: null },
  ],

  //
  // Commit graph topology
  // ─────────────────────────────────────────────────────────────────────
  // Lane colours (matched in HistoryPanel LANE_COLORS):
  //   0 = main  (blue)    1 = feature/hero-rework  (orange)
  //   2 = audio (green)   3 = bugfix/npc-vendor     (purple)
  //
  // topLines    – lane indices that draw a vertical line above the dot
  // bottomLines – lane indices that draw a vertical line below the dot
  // mergeArc    – { from: laneIdx }  arc from BOTTOM of that lane → dot
  //               (source lane must NOT be in bottomLines for this row)
  // branchTo    – [laneIdx…]  curves from dot → BOTTOM of those lanes
  //               (those lanes must NOT be in bottomLines for this row)
  //
  // Connectivity rule: bottomLines[row N] === topLines[row N+1]
  // (mergeArc source connects visually via its topLine in the next row)
  //
  commits: [
    // ── Row 0 ── Working Tree (HEAD, uncommitted)
    {
      hash: null, isWorkingTree: true,
      message: 'Working Tree',
      uncommittedCount: 3,
      author: 'Alex Turner', initials: 'AT', color: '#e8622f',
      timeAgo: 'now', filesChanged: 3, isMerge: false,
      lane: 1,
      topLines: [],
      bottomLines: [0, 1],
      mergeArc: null, branchTo: [],
    },

    // ── Row 1 ── tip of feature/hero-rework
    {
      hash: 'a1b2c3d',
      message: 'Refactor hero movement system for better responsiveness',
      author: 'Alex Turner', initials: 'AT', color: '#e8622f',
      timeAgo: '2h ago', filesChanged: 4, isMerge: false,
      lane: 1,
      topLines: [0, 1], bottomLines: [0, 1],
      mergeArc: null, branchTo: [],
    },

    // ── Row 2
    {
      hash: 'e4f5g6h',
      message: 'Add vendor NPC interaction flow and dialogue triggers',
      author: 'Jordan Lee', initials: 'JL', color: '#a27ef0',
      timeAgo: '5h ago', filesChanged: 7, isMerge: false,
      lane: 1,
      topLines: [0, 1], bottomLines: [0, 1],
      mergeArc: null, branchTo: [],
    },

    // ── Row 3 ── tip of main
    {
      hash: 'i7j8k9l',
      message: 'Update town center map — new prop placements and lighting bakes',
      author: 'Sam Chen', initials: 'SC', color: '#4d9dff',
      timeAgo: '8h ago', filesChanged: 2, isMerge: false,
      lane: 0,
      topLines: [0, 1], bottomLines: [0, 1],
      mergeArc: null, branchTo: [],
    },

    // ── Row 4 ── tip of bugfix/npc-vendor (lane 3 starts here going down)
    {
      hash: 'm1n2o3p',
      message: 'Fix crosshair widget sizing on ultrawide and widescreen displays',
      author: 'Alex Turner', initials: 'AT', color: '#a27ef0',
      timeAgo: '1d ago', filesChanged: 1, isMerge: false,
      lane: 3,
      topLines: [0, 1],
      bottomLines: [0, 1, 3],
      mergeArc: null, branchTo: [],
    },

    // ── Row 5 ── MERGE feature/audio-system into main
    //            lane 2 comes in as a mergeArc from below; lane 3 passes through
    {
      hash: 'q4r5s6t',
      message: 'Merge branch feature/audio-system into main',
      author: 'Jordan Lee', initials: 'JL', color: '#4d9dff',
      timeAgo: '1d ago', filesChanged: 12, isMerge: true,
      lane: 0,
      topLines: [0, 1, 3],
      bottomLines: [0, 1, 3],   // lane 2 NOT here — drawn as mergeArc
      mergeArc: { from: 2 },
      branchTo: [],
    },

    // ── Row 6 ── tip of feature/audio-system (lane 2 active from here down)
    {
      hash: 'u7v8w9x',
      message: 'Add footstep audio system with terrain type detection',
      author: 'Sam Chen', initials: 'SC', color: '#2ec573',
      timeAgo: '2d ago', filesChanged: 8, isMerge: false,
      lane: 2,
      topLines: [0, 1, 2, 3], bottomLines: [0, 1, 2, 3],
      mergeArc: null, branchTo: [],
    },

    // ── Row 7
    {
      hash: 'p0q1r2s',
      message: 'Terrain variant system — rocky, grass, metal, wood surfaces',
      author: 'Sam Chen', initials: 'SC', color: '#2ec573',
      timeAgo: '2d ago', filesChanged: 5, isMerge: false,
      lane: 2,
      topLines: [0, 1, 2, 3], bottomLines: [0, 1, 2, 3],
      mergeArc: null, branchTo: [],
    },

    // ── Row 8 ── branch point for ALL three feature branches
    //            hero (1), audio (2), bugfix (3) all diverge from main here
    {
      hash: 'y1z2a3b',
      message: 'Optimize LFS tracking patterns for large Unreal asset files',
      author: 'Alex Turner', initials: 'AT', color: '#4d9dff',
      timeAgo: '3d ago', filesChanged: 3, isMerge: false,
      lane: 0,
      topLines: [0, 1, 2, 3],
      bottomLines: [0],           // only main continues below
      mergeArc: null,
      branchTo: [1, 2, 3],        // all three branch lanes curve off here
    },

    // ── Row 9
    {
      hash: 'c4d5e6f',
      message: 'Initial hero character blueprint and animation state machine',
      author: 'Jordan Lee', initials: 'JL', color: '#4d9dff',
      timeAgo: '4d ago', filesChanged: 15, isMerge: false,
      lane: 0,
      topLines: [0], bottomLines: [0],
      mergeArc: null, branchTo: [],
    },

    // ── Row 10 ── root commit
    {
      hash: 'g7h8i9j',
      message: 'Project initialization and Unreal Engine 5.3 base configuration',
      author: 'Alex Turner', initials: 'AT', color: '#4d9dff',
      timeAgo: '5d ago', filesChanged: 47, isMerge: false,
      lane: 0,
      topLines: [0], bottomLines: [],   // end of history
      mergeArc: null, branchTo: [],
    },
  ],

  selectedCommitFiles: [
    { status: 'M', path: 'Source/INFERIUS/HeroCharacter.cpp' },
    { status: 'M', path: 'Source/INFERIUS/HeroCharacter.h' },
    { status: 'A', path: 'Source/INFERIUS/EnhancedInputComponent.cpp' },
    { status: 'M', path: 'Content/Characters/Hero/ABP_Hero.uasset' },
  ],

  diffLines: [
    { type: 'hunk',    content: '@@ -42,10 +42,14 @@ void AHeroCharacter::SetupPlayerInputComponent(...)' },
    { type: 'ctx',     old: 42, nw: 42, content: 'void AHeroCharacter::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)' },
    { type: 'ctx',     old: 43, nw: 43, content: '{' },
    { type: 'del',     old: 44, nw: null, content: '    Super::SetupPlayerInputComponent(PlayerInputComponent);' },
    { type: 'del',     old: 45, nw: null, content: '    InputComponent->BindAxis("MoveForward", this, &AHeroCharacter::MoveForward);' },
    { type: 'del',     old: 46, nw: null, content: '    InputComponent->BindAxis("MoveRight",   this, &AHeroCharacter::MoveRight);' },
    { type: 'add',     old: null, nw: 44, content: '    Super::SetupPlayerInputComponent(PlayerInputComponent);' },
    { type: 'add',     old: null, nw: 45, content: '    // Enhanced Input System — replaces legacy BindAxis calls' },
    { type: 'add',     old: null, nw: 46, content: '    if (auto* Sub = GetEnhancedInputSubsystem()) {' },
    { type: 'add',     old: null, nw: 47, content: '        Sub->AddMappingContext(DefaultMappingContext, 0);' },
    { type: 'add',     old: null, nw: 48, content: '    }' },
    { type: 'ctx',     old: 47, nw: 49, content: '}' },
    { type: 'ctx',     old: 48, nw: 50, content: '' },
    { type: 'ctx',     old: 49, nw: 51, content: 'void AHeroCharacter::BeginPlay()' },
    { type: 'ctx',     old: 50, nw: 52, content: '{' },
    { type: 'del',     old: 51, nw: null, content: '    AddMovementInput(GetActorForwardVector(), Value);' },
    { type: 'add',     old: null, nw: 53, content: '    Super::BeginPlay();' },
    { type: 'add',     old: null, nw: 54, content: '    const FVector2D MV = MovementAction->GetValue().Get<FVector2D>();' },
    { type: 'add',     old: null, nw: 55, content: '    AddMovementInput(GetActorForwardVector(), MV.Y);' },
    { type: 'ctx',     old: 52, nw: 56, content: '}' },
  ],

  notifications: [
    { id: 1, type: 'lock',     text: 'Jordan locked NPC_Vendor.uasset', detail: 'feature/npc-system', time: '2h ago', unread: true },
    { id: 2, type: 'push',     text: 'Sam pushed 8 commits to feature/audio-system', detail: '↑ footstep_audio, terrain_detector…', time: '5h ago', unread: true },
    { id: 3, type: 'conflict', text: 'Merge conflict on L_Forest.umap', detail: 'Before merging feature/lighting → main', time: '1d ago', unread: false },
  ],
}
