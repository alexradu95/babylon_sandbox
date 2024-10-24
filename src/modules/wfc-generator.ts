import * as BABYLON from '@babylonjs/core';
import { AssetManager } from './asset-manager';

const NATURE_KIT_MODELS = {
    GROUND: {
        name: 'ground',
        files: ['ground_grass.glb', 'ground_pathTile.glb']
    },
    TREE: {
        name: 'tree',
        files: ['tree_default.glb', 'tree_pine.glb', 'tree_oak.glb']
    },
    ROCK: {
        name: 'rock',
        files: ['rock_largeA.glb', 'rock_largeB.glb']
    },
    PLANT: {
        name: 'plant',
        files: ['plant_bush.glb', 'flower_redA.glb']
    }
};

// Define tile types based on Kenney's nature kit
enum TileType {
    GROUND = 'ground',
    GRASS = 'grass',
    FOREST = 'forest',
    WATER = 'water',
    ROCK = 'rock',
    CLIFF = 'cliff',
    PATH = 'path',
    BEACH = 'beach',
    MOUNTAIN = 'mountain'
}

// Define the constraints for each tile type
interface TileConstraints {
    north: TileType[];
    south: TileType[];
    east: TileType[];
    west: TileType[];
    up: TileType[];
    down: TileType[];
}

// Define asset mappings for each tile type
interface AssetMapping {
    meshNames: string[];
    rotationVariants: number; // How many 90-degree rotations are valid
    canStack: boolean;        // Whether this can have things placed on top
    heightOffset: number;     // Vertical offset for placement
    scale: number;           // Scale factor for the mesh
}

export class WFCTileSet {
    private constraints: Map<TileType, TileConstraints> = new Map();
    private assetMappings: Map<TileType, AssetMapping> = new Map();

    constructor() {
        this.initializeConstraints();
        this.initializeAssetMappings();
    }

    private initializeConstraints() {
        // Ground tiles
        this.constraints.set(TileType.GROUND, {
            north: [TileType.GROUND, TileType.GRASS, TileType.PATH],
            south: [TileType.GROUND, TileType.GRASS, TileType.PATH],
            east: [TileType.GROUND, TileType.GRASS, TileType.PATH],
            west: [TileType.GROUND, TileType.GRASS, TileType.PATH],
            up: [TileType.GRASS, TileType.ROCK, TileType.FOREST],
            down: [TileType.GROUND]
        });

        // Forest tiles
        this.constraints.set(TileType.FOREST, {
            north: [TileType.FOREST, TileType.GRASS],
            south: [TileType.FOREST, TileType.GRASS],
            east: [TileType.FOREST, TileType.GRASS],
            west: [TileType.FOREST, TileType.GRASS],
            up: [],
            down: [TileType.GROUND, TileType.GRASS]
        });

        // Add more constraints for other tile types...
    }

    private initializeAssetMappings() {
        // Ground variations
        this.assetMappings.set(TileType.GROUND, {
            meshNames: [
                'ground_grass',
                'ground_pathTile',
                'ground_pathStraight'
            ],
            rotationVariants: 4,
            canStack: true,
            heightOffset: 0,
            scale: 1
        });

        // Forest variations
        this.assetMappings.set(TileType.FOREST, {
            meshNames: [
                'tree_default',
                'tree_detailed',
                'tree_fat',
                'tree_oak',
                'tree_pineDefaultA',
                'tree_pineDefaultB'
            ],
            rotationVariants: 4,
            canStack: false,
            heightOffset: 0.5,
            scale: 1
        });

        // Rock variations
        this.assetMappings.set(TileType.ROCK, {
            meshNames: [
                'rock_largeA',
                'rock_largeB',
                'rock_largeC',
                'rock_largeD',
                'rock_largeE'
            ],
            rotationVariants: 4,
            canStack: false,
            heightOffset: 0.3,
            scale: 1
        });

        // Add more asset mappings...
    }

    public getValidNeighbors(type: TileType, direction: keyof TileConstraints): TileType[] {
        return this.constraints.get(type)?.[direction] || [];
    }

    public getRandomAsset(type: TileType): { meshName: string; rotation: number } {
        const mapping = this.assetMappings.get(type);
        if (!mapping) {
            throw new Error(`No asset mapping found for tile type: ${type}`);
        }

        const meshName = mapping.meshNames[Math.floor(Math.random() * mapping.meshNames.length)];
        const rotation = (Math.floor(Math.random() * mapping.rotationVariants) * Math.PI) / 2;

        return { meshName, rotation };
    }

    public getAssetProperties(type: TileType): AssetMapping | undefined {
        return this.assetMappings.get(type);
    }
}

interface WFCCell {
    possibleTypes: Set<TileType>;
    collapsed: boolean;
    finalType?: TileType;
    mesh?: BABYLON.Mesh;
}

export class WaveCollapseGenerator {
    private assetManager: AssetManager;
    private isInitialized: boolean = false;

    constructor(
        private scene: BABYLON.Scene,
        private gridSize: number = 10,
        private cellSize: number = 2
    ) {
        this.assetManager = new AssetManager(scene);
    }

    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        console.log('Initializing Wave Collapse Generator...');

        // Load all models
        const loadingPromises: Promise<void>[] = [];

        for (const category of Object.values(NATURE_KIT_MODELS)) {
            for (const file of category.files) {
                const promise = this.assetManager
                    .loadModel(
                        `${category.name}_${file}`,
                        'src/assets/nature_kit/',
                        file
                    )
                    .then(() => console.log(`Loaded ${file}`))
                    .catch(error => console.error(`Failed to load ${file}:`, error));

                loadingPromises.push(promise);
            }
        }

        try {
            await Promise.all(loadingPromises);
            this.isInitialized = true;
            console.log('Initialization complete');
        } catch (error) {
            console.error('Initialization failed:', error);
            throw error;
        }
    }

    public async generate(): Promise<void> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        // Create ground plane first
        const ground = BABYLON.MeshBuilder.CreateGround(
            "ground",
            { width: this.gridSize * this.cellSize, height: this.gridSize * this.cellSize },
            this.scene
        );

        const groundMaterial = new BABYLON.StandardMaterial("groundMat", this.scene);
        groundMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.5, 0.2);
        ground.material = groundMaterial;

        // Place objects using wave function collapse algorithm
        for (let x = 0; x < this.gridSize; x++) {
            for (let z = 0; z < this.gridSize; z++) {
                await this.placeRandomObject(x, z);
            }
        }
    }

    private async placeRandomObject(x: number, z: number): Promise<void> {
        // Simple random placement for now - can be expanded with proper WFC rules
        const random = Math.random();
        let category;

        if (random < 0.1) {
            category = NATURE_KIT_MODELS.ROCK;
        } else if (random < 0.3) {
            category = NATURE_KIT_MODELS.TREE;
        } else if (random < 0.4) {
            category = NATURE_KIT_MODELS.PLANT;
        } else {
            return; // Empty space
        }

        const file = category.files[Math.floor(Math.random() * category.files.length)];
        const modelName = `${category.name}_${file}`;
        
        try {
            const instance = await this.assetManager.createInstance(modelName, `instance_${x}_${z}`);
            
            if (instance) {
                instance.position = new BABYLON.Vector3(
                    (x - this.gridSize/2) * this.cellSize,
                    0,
                    (z - this.gridSize/2) * this.cellSize
                );
                
                // Random rotation
                instance.rotation.y = Math.random() * Math.PI * 2;
                
                // Random scale variation
                const scale = 0.8 + Math.random() * 0.4;
                instance.scaling = new BABYLON.Vector3(scale, scale, scale);
            }
        } catch (error) {
            console.warn(`Failed to place object at ${x},${z}:`, error);
        }
    }

    public dispose(): void {
        this.assetManager.dispose();
    }
}