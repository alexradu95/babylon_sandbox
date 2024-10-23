import * as BABYLON from 'babylonjs';

/**
 * Represents different types of world biomes that can be generated
 */
export enum BiomeType {
    OCEAN = 'ocean',
    COASTAL = 'coastal',
    BEACH = 'beach',
    PLAINS = 'plains',
    FOREST = 'forest',
    RAINFOREST = 'rainforest',
    HILLS = 'hills',
    MOUNTAINS = 'mountains',
    TUNDRA = 'tundra',
    DESERT = 'desert'
}

/**
 * Configuration options for world generation
 */
export interface WorldGenerationOptions {
    /** Size of the world in x dimension */
    width: number;
    /** Size of the world in z dimension */
    depth: number;
    /** Maximum height of terrain features */
    maxHeight: number;
    /** Minimum height of terrain features */
    minHeight: number;
    /** Scale of noise generation (higher = more varied terrain) */
    noiseScale: number;
    /** Number of noise octaves to generate */
    octaves: number;
    /** Persistence factor for noise octaves */
    persistence: number;
    /** Seed for random generation */
    seed?: number;
}

/**
 * Represents a single cell in the world grid
 */
interface WorldCell {
    /** Height value at this position */
    height: number;
    /** Biome type at this position */
    biome: BiomeType;
    /** Moisture level (0-1) affecting vegetation */
    moisture: number;
    /** Temperature value (0-1) affecting biome distribution */
    temperature: number;
}

/**
 * Main class responsible for procedural world generation
 */
export class WorldGenerator {
    private readonly defaultOptions: WorldGenerationOptions = {
        width: 256,
        depth: 256,
        maxHeight: 100,
        minHeight: -50,
        noiseScale: 50,
        octaves: 6,
        persistence: 0.5
    };

    private options: WorldGenerationOptions;
    private heightMap: number[][] = [];
    private moistureMap: number[][] = [];
    private temperatureMap: number[][] = [];
    private world: WorldCell[][] = [];

    constructor(options: Partial<WorldGenerationOptions> = {}) {
        this.options = { ...this.defaultOptions, ...options };
        if (this.options.seed) {
            Math.random = this.createSeededRandom(this.options.seed);
        }
    }

    /**
     * Generates a complete world based on the configured options
     * @returns A 2D array of WorldCell objects representing the generated world
     */
    public generate(): WorldCell[][] {
        console.log('Starting world generation...');
        
        // Generate base noise maps
        this.generateHeightMap();
        this.generateMoistureMap();
        this.generateTemperatureMap();
        
        // Create the world grid
        this.createWorldGrid();
        
        // Apply biome distribution
        this.distributeBiomes();
        
        // Apply post-processing effects
        this.smoothTerrain();
        this.createRivers();
        this.erodeCoastlines();
        
        console.log('World generation complete');
        return this.world;
    }

    /**
     * Creates a seeded random number generator
     * @param seed The seed value for random generation
     * @returns A seeded random number generator function
     */
    private createSeededRandom(seed: number): () => number {
        return () => {
            seed = (seed * 16807) % 2147483647;
            return (seed - 1) / 2147483646;
        };
    }

    /**
     * Generates heightmap using improved Perlin noise
     */
    private generateHeightMap(): void {
        console.log('Generating height map...');
        this.heightMap = Array(this.options.depth).fill(0)
            .map(() => Array(this.options.width).fill(0));

        for (let z = 0; z < this.options.depth; z++) {
            for (let x = 0; x < this.options.width; x++) {
                let amplitude = 1;
                let frequency = 1;
                let noiseHeight = 0;

                // Generate multiple octaves of noise
                for (let i = 0; i < this.options.octaves; i++) {
                    const sampleX = x * frequency / this.options.noiseScale;
                    const sampleZ = z * frequency / this.options.noiseScale;
                    
                    const perlinValue = this.perlin2D(sampleX, sampleZ);
                    noiseHeight += perlinValue * amplitude;

                    amplitude *= this.options.persistence;
                    frequency *= 2;
                }

                this.heightMap[z][x] = this.normalize(noiseHeight);
            }
        }
    }

    /**
     * Generates moisture map using simplified noise
     */
    private generateMoistureMap(): void {
        console.log('Generating moisture map...');
        this.moistureMap = Array(this.options.depth).fill(0)
            .map(() => Array(this.options.width).fill(0));

        for (let z = 0; z < this.options.depth; z++) {
            for (let x = 0; x < this.options.width; x++) {
                const noiseValue = this.perlin2D(x / 100, z / 100);
                this.moistureMap[z][x] = this.normalize(noiseValue);
            }
        }
    }

    /**
     * Generates temperature map based on height and latitude
     */
    private generateTemperatureMap(): void {
        console.log('Generating temperature map...');
        this.temperatureMap = Array(this.options.depth).fill(0)
            .map(() => Array(this.options.width).fill(0));

        for (let z = 0; z < this.options.depth; z++) {
            const latitudeEffect = Math.cos((z - this.options.depth / 2) / (this.options.depth / 2) * Math.PI);
            
            for (let x = 0; x < this.options.width; x++) {
                // Temperature decreases with height and is affected by latitude
                const heightEffect = 1 - (this.heightMap[z][x] * 0.5);
                const noiseValue = this.perlin2D(x / 80, z / 80);
                
                this.temperatureMap[z][x] = this.normalize(
                    (latitudeEffect * 0.5 + heightEffect * 0.3 + noiseValue * 0.2)
                );
            }
        }
    }

    /**
     * Creates the initial world grid structure
     */
    private createWorldGrid(): void {
        console.log('Creating world grid...');
        this.world = Array(this.options.depth).fill(0)
            .map(() => Array(this.options.width).fill(null));

        for (let z = 0; z < this.options.depth; z++) {
            for (let x = 0; x < this.options.width; x++) {
                this.world[z][x] = {
                    height: this.heightMap[z][x],
                    moisture: this.moistureMap[z][x],
                    temperature: this.temperatureMap[z][x],
                    biome: BiomeType.PLAINS // Default biome, will be updated later
                };
            }
        }
    }

    /**
     * Distributes biomes based on height, moisture, and temperature
     */
    private distributeBiomes(): void {
        console.log('Distributing biomes...');
        for (let z = 0; z < this.options.depth; z++) {
            for (let x = 0; x < this.options.width; x++) {
                const cell = this.world[z][x];
                cell.biome = this.determineBiome(
                    cell.height,
                    cell.moisture,
                    cell.temperature
                );
            }
        }
    }

    /**
     * Determines the appropriate biome based on cell properties
     */
    private determineBiome(height: number, moisture: number, temperature: number): BiomeType {
        if (height < 0.2) return BiomeType.OCEAN;
        if (height < 0.3) return BiomeType.COASTAL;
        if (height < 0.35) return BiomeType.BEACH;
        
        if (temperature < 0.2) return BiomeType.TUNDRA;
        if (height > 0.75) return BiomeType.MOUNTAINS;
        if (height > 0.6) return BiomeType.HILLS;
        
        if (moisture > 0.8 && temperature > 0.6) return BiomeType.RAINFOREST;
        if (moisture > 0.6) return BiomeType.FOREST;
        if (moisture < 0.2 && temperature > 0.7) return BiomeType.DESERT;
        
        return BiomeType.PLAINS;
    }

    /**
     * Applies smoothing to terrain to prevent sharp transitions
     */
    private smoothTerrain(): void {
        console.log('Smoothing terrain...');
        const smoothedHeight = Array(this.options.depth).fill(0)
            .map(() => Array(this.options.width).fill(0));

        for (let z = 0; z < this.options.depth; z++) {
            for (let x = 0; x < this.options.width; x++) {
                let totalHeight = 0;
                let count = 0;

                // Calculate average height of surrounding cells
                for (let dz = -1; dz <= 1; dz++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const newZ = z + dz;
                        const newX = x + dx;

                        if (this.isInBounds(newX, newZ)) {
                            totalHeight += this.world[newZ][newX].height;
                            count++;
                        }
                    }
                }

                smoothedHeight[z][x] = totalHeight / count;
            }
        }

        // Apply smoothed heights
        for (let z = 0; z < this.options.depth; z++) {
            for (let x = 0; x < this.options.width; x++) {
                this.world[z][x].height = smoothedHeight[z][x];
            }
        }
    }

    /**
     * Creates river systems throughout the terrain
     */
    private createRivers(): void {
        console.log('Creating river systems...');
        const riverCount = Math.floor((this.options.width + this.options.depth) / 100);
        
        for (let i = 0; i < riverCount; i++) {
            let x = Math.floor(Math.random() * this.options.width);
            let z = Math.floor(Math.random() * this.options.depth);
            
            // Start rivers from high elevation
            while (this.world[z][x].height < 0.6) {
                x = Math.floor(Math.random() * this.options.width);
                z = Math.floor(Math.random() * this.options.depth);
            }

            this.carveRiverPath(x, z);
        }
    }

    /**
     * Carves a river path from the starting point following terrain gradient
     */
    private carveRiverPath(startX: number, startZ: number): void {
        let x = startX;
        let z = startZ;
        const riverPath: [number, number][] = [];
        
        while (this.isInBounds(x, z) && this.world[z][x].height > 0.2) {
            riverPath.push([x, z]);
            
            // Find lowest neighboring cell
            let lowestHeight = this.world[z][x].height;
            let nextX = x;
            let nextZ = z;
            
            for (let dz = -1; dz <= 1; dz++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dz === 0) continue;
                    
                    const newX = x + dx;
                    const newZ = z + dz;
                    
                    if (this.isInBounds(newX, newZ) && 
                        this.world[newZ][newX].height < lowestHeight) {
                        lowestHeight = this.world[newZ][newX].height;
                        nextX = newX;
                        nextZ = newZ;
                    }
                }
            }
            
            if (nextX === x && nextZ === z) break;
            x = nextX;
            z = nextZ;
        }

        // Carve the river
        riverPath.forEach(([rx, rz]) => {
            this.world[rz][rx].height *= 0.7;
            this.world[rz][rx].moisture = 1.0;
            if (this.world[rz][rx].biome !== BiomeType.OCEAN) {
                this.world[rz][rx].biome = BiomeType.COASTAL;
            }
        });
    }

    /**
     * Erodes coastlines to create more natural-looking shores
     */
    private erodeCoastlines(): void {
        console.log('Eroding coastlines...');
        for (let z = 0; z < this.options.depth; z++) {
            for (let x = 0; x < this.options.width; x++) {
                if (this.isCoastline(x, z)) {
                    this.erodeCell(x, z);
                }
            }
        }
    }

    /**
     * Checks if a cell is part of a coastline
     */
    private isCoastline(x: number, z: number): boolean {
        if (!this.isInBounds(x, z)) return false;
        
        const cell = this.world[z][x];
        if (cell.biome === BiomeType.OCEAN) return false;
        
        // Check if any neighboring cell is ocean
        for (let dz = -1; dz <= 1; dz++) {
            for (let dx = -1; dx <= 1; dx++) {
                const newX = x + dx;
                const newZ = z + dz;
                
                if (this.isInBounds(newX, newZ) && 
                    this.world[newZ][newX].biome === BiomeType.OCEAN) {
                    return true;
                }
            }
        }
        
        return false;
    }

    /**
     * Erodes a single cell to create more natural coastlines
     */
    private erodeCell(x: number, z: number): void {
        const erosionFactor = 0.8;
        this.world[z][x].height *= erosionFactor;
        
        if (this.world[z][x].height < 0.3) {
            this.world[z][x].biome = BiomeType.BEACH;
        }
    }

    /**
     * Checks if coordinates are within world bounds
     */
    private isInBounds(x: number, z: number): boolean {
        return x >= 0 && x < this.options.width && 
               z >= 0 && z < this.options.depth;
    }

    /**
     * Normalizes a value to be between 0 and 1
     */
    private normalize(value: number): number {
        return (value + 1) / 2;
    }

/**
     * Simple 2D Perlin noise implementation
     * @param x X coordinate
     * @param y Y coordinate
     * @returns Noise value between -1 and 1
     */
private perlin2D(x: number, y: number): number {
    // Get integer coordinates
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    
    // Get decimal parts
    const xf = x - xi;
    const yf = y - yi;
    
    // Get gradient vectors
    const aa = this.getGradient(xi, yi);
    const ba = this.getGradient(xi + 1, yi);
    const ab = this.getGradient(xi, yi + 1);
    const bb = this.getGradient(xi + 1, yi + 1);
    
    // Compute dot products
    const x1 = this.lerp(
        this.dot([xf, yf], aa),
        this.dot([xf - 1, yf], ba),
        this.fade(xf)
    );
    const x2 = this.lerp(
        this.dot([xf, yf - 1], ab),
        this.dot([xf - 1, yf - 1], bb),
        this.fade(xf)
    );
    
    return this.lerp(x1, x2, this.fade(yf));
}

/**
 * Gets a pseudo-random gradient vector for Perlin noise
 */
private getGradient(x: number, y: number): [number, number] {
    // Use a simple hash function
    const hash = x * 1619 + y * 31337;
    const angle = (hash * 16807) % 2147483647 / 2147483647 * 2 * Math.PI;
    return [Math.cos(angle), Math.sin(angle)];
}

/**
 * Computes dot product of two 2D vectors
 */
private dot(a: [number, number], b: [number, number]): number {
    return a[0] * b[0] + a[1] * b[1];
}

/**
 * Smooth interpolation function for Perlin noise
 */
private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
}

/**
 * Linear interpolation helper
 */
private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
}

/**
 * Gets the biome color for rendering
 */
public getBiomeColor(biome: BiomeType): BABYLON.Color3 {
    switch (biome) {
        case BiomeType.OCEAN:
            return new BABYLON.Color3(0.1, 0.2, 0.8);
        case BiomeType.COASTAL:
            return new BABYLON.Color3(0.2, 0.4, 0.8);
        case BiomeType.BEACH:
            return new BABYLON.Color3(0.9, 0.9, 0.6);
        case BiomeType.PLAINS:
            return new BABYLON.Color3(0.4, 0.8, 0.4);
        case BiomeType.FOREST:
            return new BABYLON.Color3(0.2, 0.6, 0.2);
        case BiomeType.RAINFOREST:
            return new BABYLON.Color3(0.1, 0.4, 0.1);
        case BiomeType.HILLS:
            return new BABYLON.Color3(0.5, 0.7, 0.3);
        case BiomeType.MOUNTAINS:
            return new BABYLON.Color3(0.6, 0.6, 0.6);
        case BiomeType.TUNDRA:
            return new BABYLON.Color3(0.9, 0.9, 0.9);
        case BiomeType.DESERT:
            return new BABYLON.Color3(0.9, 0.8, 0.5);
        default:
            return new BABYLON.Color3(1, 1, 1);
    }
}

/**
 * Creates a Babylon.js mesh for the generated world
 * @param scene The Babylon.js scene
 * @returns The created terrain mesh
 */
public createMesh(scene: BABYLON.Scene): BABYLON.Mesh {
    console.log('Creating terrain mesh...');
    
    const positions: number[] = [];
    const indices: number[] = [];
    const colors: number[] = [];
    const normals: number[] = [];
    let vertexIndex = 0;

    // Create vertices and colors
    for (let z = 0; z < this.options.depth; z++) {
        for (let x = 0; x < this.options.width; x++) {
            const cell = this.world[z][x];
            const height = this.lerp(
                this.options.minHeight,
                this.options.maxHeight,
                cell.height
            );
            const color = this.getBiomeColor(cell.biome);

            // Add vertex
            positions.push(
                x - this.options.width/2,  // x
                height,                    // y
                z - this.options.depth/2   // z
            );

            // Add color
            colors.push(
                color.r,
                color.g,
                color.b,
                1  // alpha
            );

            // Create triangles (indices)
            if (x < this.options.width - 1 && z < this.options.depth - 1) {
                indices.push(
                    vertexIndex,
                    vertexIndex + 1,
                    vertexIndex + this.options.width,
                    vertexIndex + 1,
                    vertexIndex + this.options.width + 1,
                    vertexIndex + this.options.width
                );
            }

            vertexIndex++;
        }
    }

    // Calculate normals
    BABYLON.VertexData.ComputeNormals(positions, indices, normals);

    // Create the mesh
    const terrain = new BABYLON.Mesh('terrain', scene);
    const vertexData = new BABYLON.VertexData();
    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.colors = colors;
    vertexData.normals = normals;
    vertexData.applyToMesh(terrain);

    // Create and assign material
    const material = new BABYLON.StandardMaterial('terrainMaterial', scene);
    material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    material.diffuseColor = BABYLON.Color3.White();
    material.backFaceCulling = false;
    terrain.material = material;

    // Enable vertex colors
    terrain.hasVertexAlpha = false;
    terrain.useVertexColors = true;

    // Optimize the mesh
    terrain.freezeWorldMatrix();
    terrain.freezeNormals();
    terrain.isPickable = false;

    return terrain;
}

/**
 * Adds environment effects to the scene
 * @param scene The Babylon.js scene
 */
public addEnvironmentEffects(scene: BABYLON.Scene): void {
    // Add fog
    scene.fogMode = BABYLON.Scene.FOGMODE_EXP;
    scene.fogDensity = 0.01;
    scene.fogColor = new BABYLON.Color3(0.8, 0.9, 1.0);

    // Add hemispheric light for ambient lighting
    const hemisphericLight = new BABYLON.HemisphericLight(
        'hemisphericLight',
        new BABYLON.Vector3(0, 1, 0),
        scene
    );
    hemisphericLight.intensity = 0.7;
    hemisphericLight.groundColor = new BABYLON.Color3(0.2, 0.2, 0.3);
    hemisphericLight.specular = BABYLON.Color3.Black();

    // Add directional light for shadows
    const directionalLight = new BABYLON.DirectionalLight(
        'directionalLight',
        new BABYLON.Vector3(-1, -2, -1),
        scene
    );
    directionalLight.position = new BABYLON.Vector3(
        this.options.width / 2,
        this.options.maxHeight * 2,
        this.options.depth / 2
    );
    directionalLight.intensity = 0.8;

    // Add skybox
    const skybox = BABYLON.MeshBuilder.CreateBox('skybox', {
        size: Math.max(
            this.options.width,
            this.options.depth,
            this.options.maxHeight
        ) * 2
    }, scene);
    const skyboxMaterial = new BABYLON.StandardMaterial('skyboxMaterial', scene);
    skyboxMaterial.backFaceCulling = false;
    skyboxMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.9, 1.0);
    skyboxMaterial.specularColor = BABYLON.Color3.Black();
    skybox.material = skyboxMaterial;
}
}