window.MockData = {
  repo: { name: 'INFERIUS', branch: 'feature/hero-rework', ahead: 3, behind: 2, hasUpstream: true },
  account: { login: 'alexturner', initials: 'AT' },

  stagedFiles: [
    { path: 'Content/Characters/Hero/SK_Hero.uasset', status: 'M', size: '14.2 MB', lock: { mine: true } },
    { path: 'Content/Maps/L_TownCenter.umap',          status: 'M', size: '8.7 MB',  lock: { mine: true } },
    { path: 'Config/DefaultGame.ini',                   status: 'A', size: '4.1 KB',  lock: null },
  ],

  unstagedFiles: [
    { path: 'Content/Characters/NPC_Vendor.uasset',    status: 'M', size: '6.3 MB',  lock: { owner: 'jordan', mine: false } },
    { path: 'Content/UI/HUD/WBP_Crosshair.uasset',    status: 'M', size: '1.1 MB',  lock: null },
    { path: 'Content/Audio/SFX/footstep_grass.wav',    status: 'A', size: '512 KB',  lock: null },
    { path: 'Source/INFERIUS/HeroCharacter.cpp',       status: 'M', size: '18.4 KB', lock: null },
    { path: 'Source/INFERIUS/HeroCharacter.h',         status: 'M', size: '3.2 KB',  lock: null },
  ],

  commits: [
    { hash: 'a1b2c3d', message: 'Refactor hero movement system for better responsiveness', author: 'Alex Turner', initials: 'AT', color: '#4d9dff', timeAgo: '2h ago',  lane: 0, isMerge: false, filesChanged: 4 },
    { hash: 'e4f5g6h', message: 'Add vendor NPC interaction flow and dialogue triggers',    author: 'Jordan Lee',  initials: 'JL', color: '#a27ef0', timeAgo: '5h ago',  lane: 0, isMerge: false, filesChanged: 7 },
    { hash: 'i7j8k9l', message: 'Update town center map — new prop placements',            author: 'Sam Chen',    initials: 'SC', color: '#2ec573', timeAgo: '8h ago',  lane: 1, isMerge: false, filesChanged: 2 },
    { hash: 'm1n2o3p', message: 'Fix crosshair widget sizing on ultrawide displays',       author: 'Alex Turner', initials: 'AT', color: '#4d9dff', timeAgo: '1d ago',  lane: 0, isMerge: false, filesChanged: 1 },
    { hash: 'q4r5s6t', message: 'Merge branch feature/audio-system into develop',         author: 'Jordan Lee',  initials: 'JL', color: '#f5a832', timeAgo: '1d ago',  lane: 0, isMerge: true,  filesChanged: 12 },
    { hash: 'u7v8w9x', message: 'Add footstep audio system with terrain type detection',  author: 'Sam Chen',    initials: 'SC', color: '#2ec573', timeAgo: '2d ago',  lane: 1, isMerge: false, filesChanged: 8 },
    { hash: 'y1z2a3b', message: 'Optimize LFS tracking patterns for large textures',      author: 'Alex Turner', initials: 'AT', color: '#4d9dff', timeAgo: '3d ago',  lane: 0, isMerge: false, filesChanged: 3 },
    { hash: 'c4d5e6f', message: 'Initial hero character blueprint and animation setup',   author: 'Jordan Lee',  initials: 'JL', color: '#a27ef0', timeAgo: '4d ago',  lane: 0, isMerge: false, filesChanged: 15 },
    { hash: 'g7h8i9j', message: 'Project initialization and Unreal Engine 5 config',     author: 'Alex Turner', initials: 'AT', color: '#4d9dff', timeAgo: '5d ago',  lane: 0, isMerge: false, filesChanged: 47 },
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
