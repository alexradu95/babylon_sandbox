// Updated TerrainType with more fantasy-themed biomes
export enum TerrainType {
    DEEP_WATER,
    SHALLOW_WATER,
    BEACH,
    GRASSLAND,
    FOREST,
    DENSE_FOREST,
    HILLS,
    MOUNTAINS,
    SNOW_PEAKS,
    DESERT,
    SWAMP,
    WASTELAND
}

export interface TerrainTile {
    height: number;
    type: TerrainType;
    moisture: number;  // 0-1 value affecting vegetation
    temperature: number;  // 0-1 value affecting biome type
    features: TerrainFeature[];  // Additional decorative elements
}

export enum TerrainFeature {
    NONE,
    ANCIENT_RUINS,
    CASTLE,
    VILLAGE,
    TOWER,
    CAVE_ENTRANCE,
    TEMPLE,
    STANDING_STONES,
    MAGICAL_CRYSTAL,
    PORTAL,
    DRAGON_LAIR,
    SHIPWRECK    // For water tiles
}

export class WaveFunctionCollapse {
    private readonly MIN_HEIGHT = 0;
    private readonly MAX_HEIGHT = 15;
    private readonly COLLAPSE_ATTEMPTS = 5;

    private readonly HEIGHT_THRESHOLDS = {
        [TerrainType.DEEP_WATER]: { min: 0, max: 2 },
        [TerrainType.SHALLOW_WATER]: { min: 2, max: 3 },
        [TerrainType.BEACH]: { min: 3, max: 4 },
        [TerrainType.GRASSLAND]: { min: 4, max: 6 },
        [TerrainType.FOREST]: { min: 4, max: 7 },
        [TerrainType.DENSE_FOREST]: { min: 5, max: 8 },
        [TerrainType.HILLS]: { min: 6, max: 9 },
        [TerrainType.MOUNTAINS]: { min: 9, max: 12 },
        [TerrainType.SNOW_PEAKS]: { min: 12, max: 15 },
        [TerrainType.DESERT]: { min: 4, max: 6 },
        [TerrainType.SWAMP]: { min: 3, max: 4 },
        [TerrainType.WASTELAND]: { min: 4, max: 8 }
    };

    private readonly TERRAIN_WEIGHTS = {
        [TerrainType.DEEP_WATER]: 0.08,
        [TerrainType.SHALLOW_WATER]: 0.07,
        [TerrainType.BEACH]: 0.05,
        [TerrainType.GRASSLAND]: 0.2,
        [TerrainType.FOREST]: 0.15,
        [TerrainType.DENSE_FOREST]: 0.1,
        [TerrainType.HILLS]: 0.12,
        [TerrainType.MOUNTAINS]: 0.08,
        [TerrainType.SNOW_PEAKS]: 0.03,
        [TerrainType.DESERT]: 0.05,
        [TerrainType.SWAMP]: 0.04,
        [TerrainType.WASTELAND]: 0.03
    };

    private readonly VALID_NEIGHBORS = {
        [TerrainType.DEEP_WATER]: [TerrainType.DEEP_WATER, TerrainType.SHALLOW_WATER],
        [TerrainType.SHALLOW_WATER]: [TerrainType.DEEP_WATER, TerrainType.SHALLOW_WATER, TerrainType.BEACH],
        [TerrainType.BEACH]: [TerrainType.SHALLOW_WATER, TerrainType.BEACH, TerrainType.GRASSLAND, TerrainType.DESERT],
        [TerrainType.GRASSLAND]: [TerrainType.BEACH, TerrainType.GRASSLAND, TerrainType.FOREST, TerrainType.HILLS, TerrainType.SWAMP],
        [TerrainType.FOREST]: [TerrainType.GRASSLAND, TerrainType.FOREST, TerrainType.DENSE_FOREST, TerrainType.HILLS],
        [TerrainType.DENSE_FOREST]: [TerrainType.FOREST, TerrainType.DENSE_FOREST, TerrainType.HILLS],
        [TerrainType.HILLS]: [TerrainType.GRASSLAND, TerrainType.FOREST, TerrainType.HILLS, TerrainType.MOUNTAINS],
        [TerrainType.MOUNTAINS]: [TerrainType.HILLS, TerrainType.MOUNTAINS, TerrainType.SNOW_PEAKS],
        [TerrainType.SNOW_PEAKS]: [TerrainType.MOUNTAINS, TerrainType.SNOW_PEAKS],
        [TerrainType.DESERT]: [TerrainType.BEACH, TerrainType.DESERT, TerrainType.WASTELAND],
        [TerrainType.SWAMP]: [TerrainType.SHALLOW_WATER, TerrainType.GRASSLAND, TerrainType.SWAMP],
        [TerrainType.WASTELAND]: [TerrainType.DESERT, TerrainType.WASTELAND, TerrainType.MOUNTAINS]
    };

    private readonly FEATURE_PROBABILITIES: { [key in TerrainType]: { [key in TerrainFeature]?: number } } = {
        [TerrainType.DEEP_WATER]: { [TerrainFeature.SHIPWRECK]: 0.01 },
        [TerrainType.SHALLOW_WATER]: { [TerrainFeature.SHIPWRECK]: 0.02 },
        [TerrainType.BEACH]: { [TerrainFeature.RUINS]: 0.01 },
        [TerrainType.GRASSLAND]: {
            [TerrainFeature.VILLAGE]: 0.05,
            [TerrainFeature.STANDING_STONES]: 0.02,
            [TerrainFeature.TEMPLE]: 0.01
        },
        [TerrainType.FOREST]: {
            [TerrainFeature.ANCIENT_RUINS]: 0.02,
            [TerrainFeature.TEMPLE]: 0.01,
            [TerrainFeature.STANDING_STONES]: 0.03
        },
        [TerrainType.DENSE_FOREST]: {
            [TerrainFeature.ANCIENT_RUINS]: 0.03,
            [TerrainFeature.MAGICAL_CRYSTAL]: 0.02,
            [TerrainFeature.PORTAL]: 0.01
        },
        [TerrainType.HILLS]: {
            [TerrainFeature.CASTLE]: 0.03,
            [TerrainFeature.TOWER]: 0.04,
            [TerrainFeature.CAVE_ENTRANCE]: 0.03
        },
        [TerrainType.MOUNTAINS]: {
            [TerrainFeature.DRAGON_LAIR]: 0.02,
            [TerrainFeature.CAVE_ENTRANCE]: 0.05,
            [TerrainFeature.TOWER]: 0.02
        },
        [TerrainType.SNOW_PEAKS]: {
            [TerrainFeature.DRAGON_LAIR]: 0.03,
            [TerrainFeature.MAGICAL_CRYSTAL]: 0.02
        },
        [TerrainType.DESERT]: {
            [TerrainFeature.ANCIENT_RUINS]: 0.04,
            [TerrainFeature.TEMPLE]: 0.02
        },
        [TerrainType.SWAMP]: {
            [TerrainFeature.ANCIENT_RUINS]: 0.02,
            [TerrainFeature.MAGICAL_CRYSTAL]: 0.01
        },
        [TerrainType.WASTELAND]: {
            [TerrainFeature.PORTAL]: 0.02,
            [TerrainFeature.ANCIENT_RUINS]: 0.03
        }
    };

    getTerrainTypeColor(type: TerrainType): { r: number, g: number, b: number } {
        switch (type) {
            case TerrainType.DEEP_WATER:
                return { r: 0.1, g: 0.2, b: 0.8 };
            case TerrainType.SHALLOW_WATER:
                return { r: 0.2, g: 0.4, b: 0.8 };
            case TerrainType.BEACH:
                return { r: 0.9, g: 0.9, b: 0.6 };
            case TerrainType.GRASSLAND:
                return { r: 0.4, g: 0.8, b: 0.4 };
            case TerrainType.FOREST:
                return { r: 0.2, g: 0.6, b: 0.2 };
            case TerrainType.DENSE_FOREST:
                return { r: 0.1, g: 0.4, b: 0.1 };
            case TerrainType.HILLS:
                return { r: 0.5, g: 0.7, b: 0.3 };
            case TerrainType.MOUNTAINS:
                return { r: 0.6, g: 0.6, b: 0.6 };
            case TerrainType.SNOW_PEAKS:
                return { r: 0.9, g: 0.9, b: 0.9 };
            case TerrainType.DESERT:
                return { r: 0.9, g: 0.8, b: 0.5 };
            case TerrainType.SWAMP:
                return { r: 0.4, g: 0.5, b: 0.3 };
            case TerrainType.WASTELAND:
                return { r: 0.6, g: 0.5, b: 0.4 };
        }
    }

    generateTerrain(width: number, height: number): TerrainTile[][] {
        const terrain: TerrainTile[][] = Array.from(
            { length: height },
            () => Array(width).fill(null)
        );

        // Generate climate maps
        const moistureMap = this.generatePerlinNoise(width, height);
        const temperatureMap = this.generatePerlinNoise(width, height);

        // Generate initial terrain with more diverse biomes
        const numSeeds = Math.max(5, Math.floor(Math.sqrt(width * height) / 3));
        for (let i = 0; i < numSeeds; i++) {
            const x = Math.floor(Math.random() * width);
            const z = Math.floor(Math.random() * height);
            
            const moisture = moistureMap[z][x];
            const temperature = temperatureMap[z][x];
            const initialHeight = this.getWeightedRandomHeight();
            const type = this.determineTerrainType(initialHeight, moisture, temperature);
            
            terrain[z][x] = {
                height: initialHeight,
                type: type,
                moisture: moisture,
                temperature: temperature,
                features: this.generateFeatures(type)
            };
        }

        // Propagate terrain using WFC algorithm
        this.propagateTerrain(terrain, moistureMap, temperatureMap);
        
        // Post-process to add features and ensure coherent biomes
        this.postProcessTerrain(terrain);

        return terrain;
    }

    private generatePerlinNoise(width: number, height: number): number[][] {
        // Simple implementation - in practice, you'd want to use a proper Perlin noise implementation
        const noise: number[][] = Array.from(
            { length: height },
            () => Array(width).fill(0)
        );

        for (let z = 0; z < height; z++) {
            for (let x = 0; x < width; x++) {
                noise[z][x] = Math.random();
            }
        }

        return noise;
    }

    private determineTerrainType(height: number, moisture: number, temperature: number): TerrainType {
        // Complex biome determination based on height, moisture, and temperature
        if (height <= this.HEIGHT_THRESHOLDS[TerrainType.DEEP_WATER].max) {
            return TerrainType.DEEP_WATER;
        }
        
        if (height <= this.HEIGHT_THRESHOLDS[TerrainType.SHALLOW_WATER].max) {
            return TerrainType.SHALLOW_WATER;
        }

        if (height >= this.HEIGHT_THRESHOLDS[TerrainType.SNOW_PEAKS].min) {
            return TerrainType.SNOW_PEAKS;
        }

        if (temperature > 0.7 && moisture < 0.3) {
            return TerrainType.DESERT;
        }

        if (moisture > 0.7 && height < this.HEIGHT_THRESHOLDS[TerrainType.HILLS].min) {
            return TerrainType.SWAMP;
        }

        if (temperature < 0.3 && height > this.HEIGHT_THRESHOLDS[TerrainType.MOUNTAINS].min) {
            return TerrainType.SNOW_PEAKS;
        }

        if (height > this.HEIGHT_THRESHOLDS[TerrainType.MOUNTAINS].min) {
            return TerrainType.MOUNTAINS;
        }

        if (height > this.HEIGHT_THRESHOLDS[TerrainType.HILLS].min) {
            return TerrainType.HILLS;
        }

        if (moisture > 0.6) {
            return TerrainType.DENSE_FOREST;
        }

        if (moisture > 0.4) {
            return TerrainType.FOREST;
        }

        return TerrainType.GRASSLAND;
    }

    private generateFeatures(type: TerrainType): TerrainFeature[] {
        const features: TerrainFeature[] = [];
        const probabilities = this.FEATURE_PROBABILITIES[type];

        if (probabilities) {
            for (const [feature, probability] of Object.entries(probabilities)) {
                if (Math.random() < probability) {
                    features.push(Number(feature) as TerrainFeature);
                }
            }
        }

        return features;
    }

    private propagateTerrain(terrain: TerrainTile[][], moistureMap: number[][], temperatureMap: number[][]) {
        const width = terrain[0].length;
        const height = terrain.length;
        const queue: [number, number][] = [];

        // Add all defined cells to the queue
        for (let z = 0; z < height; z++) {
            for (let x = 0; x < width; x++) {
                if (terrain[z][x] !== null) {
                    queue.push([x, z]);
                }
            }
        }

        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

        while (queue.length > 0) {
            const [currentX, currentZ] = queue.shift()!;
            const currentTile = terrain[currentZ][currentX];

            for (const [dx, dz] of directions) {
                const newX = currentX + dx;
                const newZ = currentZ + dz;

                if (newX >= 0 && newX < width && 
                    newZ >= 0 && newZ < height && 
                    terrain[newZ][newX] === null) {
                    
                    let success = false;
                    const validHeightRange = this.getValidHeightRange(newX, newZ, terrain);
                    const localMoisture = moistureMap[newZ][newX];
                    const localTemperature = temperatureMap[newZ][newX];

                    // Multiple attempts to find valid terrain
                    for (let attempt = 0; attempt < this.COLLAPSE_ATTEMPTS && !success; attempt++) {
                        let newHeight: number;
                        
                        if (attempt === 0) {
                            // First attempt: Use weighted random height based on surroundings
                            newHeight = this.getWeightedRandomHeight();
                        } else {
                            // Subsequent attempts: Try to smooth transition
                            newHeight = validHeightRange.min + 
                                Math.random() * (validHeightRange.max - validHeightRange.min);
                        }

                        // Clamp height to valid range
                        newHeight = Math.max(validHeightRange.min, 
                                          Math.min(validHeightRange.max, newHeight));

                        // Determine terrain type based on all factors
                        const proposedType = this.determineTerrainType(
                            newHeight,
                            localMoisture,
                            localTemperature
                        );

                        // Check if this terrain type is valid with neighbors
                        let isValid = true;
                        for (const [checkDx, checkDz] of directions) {
                            const checkX = newX + checkDx;
                            const checkZ = newZ + checkDz;
                            
                            if (checkX >= 0 && checkX < width && 
                                checkZ >= 0 && checkZ < height && 
                                terrain[checkZ][checkX] !== null) {
                                
                                const neighborType = terrain[checkZ][checkX].type;
                                
                                // Check both terrain compatibility and height difference
                                if (!this.isValidNeighbor(proposedType, neighborType) ||
                                    Math.abs(newHeight - terrain[checkZ][checkX].height) > 2) {
                                    isValid = false;
                                    break;
                                }
                            }
                        }

                        if (isValid) {
                            // Create new terrain tile with all properties
                            terrain[newZ][newX] = {
                                height: newHeight,
                                type: proposedType,
                                moisture: localMoisture,
                                temperature: localTemperature,
                                features: []  // Features will be added in post-processing
                            };

                            // Apply biome-specific height adjustments
                            this.adjustHeightForBiome(terrain[newZ][newX]);

                            // Add to queue for further propagation
                            queue.push([newX, newZ]);
                            success = true;
                        }
                    }

                    // If all attempts failed, use fallback values
                    if (terrain[newZ][newX] === null) {
                        const fallbackHeight = (validHeightRange.min + validHeightRange.max) / 2;
                        const fallbackType = this.determineTerrainType(
                            fallbackHeight,
                            localMoisture,
                            localTemperature
                        );

                        terrain[newZ][newX] = {
                            height: fallbackHeight,
                            type: fallbackType,
                            moisture: localMoisture,
                            temperature: localTemperature,
                            features: []
                        };

                        queue.push([newX, newZ]);
                    }
                }
            }
        }
    }

    private isValidNeighbor(current: TerrainType, neighbor: TerrainType): boolean {
        // Basic neighbor validation from our rules
        const isValidBasicNeighbor = this.VALID_NEIGHBORS[current]?.includes(neighbor) || false;
        
        // Special cases for more natural transitions
        if (!isValidBasicNeighbor) {
            // Allow indirect transitions through intermediate terrain types
            for (const intermediateType of this.VALID_NEIGHBORS[current] || []) {
                if (this.VALID_NEIGHBORS[intermediateType]?.includes(neighbor)) {
                    return true;
                }
            }

            // Special case: Allow water types to connect
            if ((current === TerrainType.DEEP_WATER || current === TerrainType.SHALLOW_WATER) &&
                (neighbor === TerrainType.DEEP_WATER || neighbor === TerrainType.SHALLOW_WATER)) {
                return true;
            }

            // Special case: Allow mountain types to connect
            if ((current === TerrainType.MOUNTAINS || current === TerrainType.SNOW_PEAKS) &&
                (neighbor === TerrainType.MOUNTAINS || neighbor === TerrainType.SNOW_PEAKS)) {
                return true;
            }

            // Special case: Allow forest types to connect
            if ((current === TerrainType.FOREST || current === TerrainType.DENSE_FOREST) &&
                (neighbor === TerrainType.FOREST || neighbor === TerrainType.DENSE_FOREST)) {
                return true;
            }
        }

        return isValidBasicNeighbor;
    }

    private getValidHeightRange(x: number, z: number, terrain: TerrainTile[][]): { min: number; max: number } {
        const width = terrain[0].length;
        const height = terrain.length;
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        const neighbors: TerrainTile[] = [];

        // Collect valid neighbors
        for (const [dx, dz] of directions) {
            const newX = x + dx;
            const newZ = z + dz;
            if (newX >= 0 && newX < width && 
                newZ >= 0 && newZ < height && 
                terrain[newZ][newX] !== null) {
                neighbors.push(terrain[newZ][newX]);
            }
        }

        if (neighbors.length === 0) {
            return {
                min: this.MIN_HEIGHT,
                max: this.MAX_HEIGHT
            };
        }

        // Calculate height range based on neighbors
        const avgHeight = neighbors.reduce((sum, n) => sum + n.height, 0) / neighbors.length;
        const maxDiff = 1.5; // Maximum height difference for smooth transitions

        return {
            min: Math.max(this.MIN_HEIGHT, avgHeight - maxDiff),
            max: Math.min(this.MAX_HEIGHT, avgHeight + maxDiff)
        };
    }

    private adjustHeightForBiome(tile: TerrainTile) {
        // Apply biome-specific height adjustments
        switch (tile.type) {
            case TerrainType.MOUNTAINS:
                tile.height += Math.random() * 0.5; // Slight random variation in mountain heights
                break;
            case TerrainType.HILLS:
                tile.height += Math.random() * 0.3; // Gentle variation in hills
                break;
            case TerrainType.DEEP_WATER:
                tile.height = Math.min(tile.height, this.HEIGHT_THRESHOLDS[TerrainType.DEEP_WATER].max);
                break;
            case TerrainType.BEACH:
                // Ensure beaches have a gradual slope
                tile.height = Math.max(
                    this.HEIGHT_THRESHOLDS[TerrainType.BEACH].min,
                    Math.min(tile.height, this.HEIGHT_THRESHOLDS[TerrainType.BEACH].max)
                );
                break;
        }
    }

    private postProcessTerrain(terrain: TerrainTile[][]) {
        const width = terrain[0].length;
        const height = terrain.length;

        // Smooth out terrain transitions
        for (let z = 0; z < height; z++) {
            for (let x = 0; x < width; x++) {
                this.smoothTile(terrain, x, z);
            }
        }

        // Add features while ensuring they make sense in the context
        for (let z = 0; z < height; z++) {
            for (let x = 0; x < width; x++) {
                this.addContextualFeatures(terrain, x, z);
            }
        }
    }

    private smoothTile(terrain: TerrainTile[][], x: number, z: number) {
        const width = terrain[0].length;
        const height = terrain.length;
        const current = terrain[z][x];
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        
        // Get neighboring tiles
        const neighbors: TerrainTile[] = [];
        for (const [dx, dz] of directions) {
            const newX = x + dx;
            const newZ = z + dz;
            if (newX >= 0 && newX < width && newZ >= 0 && newZ < height) {
                neighbors.push(terrain[newZ][newX]);
            }
        }

        // Smooth height
        const averageHeight = neighbors.reduce((sum, n) => sum + n.height, 0) / neighbors.length;
        const heightDiff = Math.abs(current.height - averageHeight);
        if (heightDiff > 2) {
            current.height = averageHeight + (current.height > averageHeight ? 1 : -1);
            current.type = this.determineTerrainType(current.height, current.moisture, current.temperature);
        }

        // Smooth moisture and temperature
        current.moisture = (current.moisture + 
            neighbors.reduce((sum, n) => sum + n.moisture, 0) / neighbors.length) / 2;
        current.temperature = (current.temperature + 
            neighbors.reduce((sum, n) => sum + n.temperature, 0) / neighbors.length) / 2;
    }

    private addContextualFeatures(terrain: TerrainTile[][], x: number, z: number) {
        const width = terrain[0].length;
        const height = terrain.length;
        const current = terrain[z][x];
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]];

        // Check the surrounding area for existing features
        let nearbyFeatures: TerrainFeature[] = [];
        for (const [dx, dz] of directions) {
            const newX = x + dx;
            const newZ = z + dz;
            if (newX >= 0 && newX < width && newZ >= 0 && newZ < height) {
                nearbyFeatures.push(...terrain[newZ][newX].features);
            }
        }

        // Add contextual features based on surroundings
        if (current.type === TerrainType.HILLS || current.type === TerrainType.MOUNTAINS) {
            // Add castle near village
            if (nearbyFeatures.includes(TerrainFeature.VILLAGE) && 
                !nearbyFeatures.includes(TerrainFeature.CASTLE) &&
                Math.random() < 0.4) {
                current.features.push(TerrainFeature.CASTLE);
            }
        }

        // Add magical features near ancient ruins
        if (nearbyFeatures.includes(TerrainFeature.ANCIENT_RUINS) && 
            Math.random() < 0.3 &&
            !current.features.includes(TerrainFeature.MAGICAL_CRYSTAL)) {
            current.features.push(TerrainFeature.MAGICAL_CRYSTAL);
        }

        // Add cave entrances near mountains
        if (current.type === TerrainType.MOUNTAINS && 
            Math.random() < 0.2 &&
            !current.features.includes(TerrainFeature.CAVE_ENTRANCE)) {
            current.features.push(TerrainFeature.CAVE_ENTRANCE);
        }

        // Add temples near standing stones
        if (nearbyFeatures.includes(TerrainFeature.STANDING_STONES) &&
            Math.random() < 0.25 &&
            !current.features.includes(TerrainFeature.TEMPLE)) {
            current.features.push(TerrainFeature.TEMPLE);
        }
    }

    private getWeightedRandomHeight(): number {
        const random = Math.random();
        let cumulativeProbability = 0;

        for (const [type, weight] of Object.entries(this.TERRAIN_WEIGHTS)) {
            cumulativeProbability += weight;
            if (random < cumulativeProbability) {
                const range = this.HEIGHT_THRESHOLDS[type as unknown as TerrainType];
                return range.min + Math.random() * (range.max - range.min);
            }
        }
        
        return this.HEIGHT_THRESHOLDS[TerrainType.GRASSLAND].min;
    }

    getFeatureColor(feature: TerrainFeature): { r: number, g: number, b: number } {
        switch (feature) {
            case TerrainFeature.ANCIENT_RUINS:
                return { r: 0.7, g: 0.7, b: 0.7 };
            case TerrainFeature.CASTLE:
                return { r: 0.8, g: 0.8, b: 0.8 };
            case TerrainFeature.VILLAGE:
                return { r: 0.9, g: 0.6, b: 0.4 };
            case TerrainFeature.TOWER:
                return { r: 0.9, g: 0.9, b: 0.9 };
            case TerrainFeature.CAVE_ENTRANCE:
                return { r: 0.3, g: 0.3, b: 0.3 };
            case TerrainFeature.TEMPLE:
                return { r: 1.0, g: 0.9, b: 0.6 };
            case TerrainFeature.STANDING_STONES:
                return { r: 0.7, g: 0.7, b: 0.7 };
            case TerrainFeature.MAGICAL_CRYSTAL:
                return { r: 0.6, g: 0.8, b: 1.0 };
            case TerrainFeature.PORTAL:
                return { r: 0.8, g: 0.4, b: 1.0 };
            case TerrainFeature.DRAGON_LAIR:
                return { r: 1.0, g: 0.4, b: 0.4 };
            case TerrainFeature.SHIPWRECK:
                return { r: 0.6, g: 0.5, b: 0.4 };
            default:
                return { r: 1.0, g: 1.0, b: 1.0 };
        }
    }

    getFeatureScale(feature: TerrainFeature): number {
        switch (feature) {
            case TerrainFeature.ANCIENT_RUINS:
                return 2.0;
            case TerrainFeature.CASTLE:
                return 3.0;
            case TerrainFeature.VILLAGE:
                return 2.5;
            case TerrainFeature.TOWER:
                return 2.0;
            case TerrainFeature.CAVE_ENTRANCE:
                return 1.5;
            case TerrainFeature.TEMPLE:
                return 2.5;
            case TerrainFeature.STANDING_STONES:
                return 1.5;
            case TerrainFeature.MAGICAL_CRYSTAL:
                return 1.0;
            case TerrainFeature.PORTAL:
                return 2.0;
            case TerrainFeature.DRAGON_LAIR:
                return 3.0;
            case TerrainFeature.SHIPWRECK:
                return 2.0;
            default:
                return 1.0;
        }
    }
}
