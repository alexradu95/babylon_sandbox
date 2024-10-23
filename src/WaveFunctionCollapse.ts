export interface TerrainTile {
    height: number;
    type: TerrainType;
}

export enum TerrainType {
    WATER,
    BEACH,
    PLAINS,
    HILLS,
    MOUNTAINS
}

export class WaveFunctionCollapse {
    private readonly COLLAPSE_ATTEMPTS = 5;
    private readonly MIN_HEIGHT = 0;
    private readonly MAX_HEIGHT = 10;
    
    // Adjusted height thresholds to favor hills
    private readonly HEIGHT_THRESHOLDS = {
        [TerrainType.WATER]: { min: 0, max: 2 },
        [TerrainType.BEACH]: { min: 2, max: 3 },
        [TerrainType.PLAINS]: { min: 3, max: 5 },
        [TerrainType.HILLS]: { min: 5, max: 8 },    // Expanded hills range
        [TerrainType.MOUNTAINS]: { min: 8, max: 10 } // Reduced mountains range
    };

    // Adjusted neighbor rules to make mountains rarer
    private readonly VALID_NEIGHBORS = {
        [TerrainType.WATER]: [TerrainType.WATER, TerrainType.BEACH],
        [TerrainType.BEACH]: [TerrainType.WATER, TerrainType.BEACH, TerrainType.PLAINS],
        [TerrainType.PLAINS]: [TerrainType.BEACH, TerrainType.PLAINS, TerrainType.HILLS],
        [TerrainType.HILLS]: [TerrainType.PLAINS, TerrainType.HILLS, TerrainType.MOUNTAINS],
        [TerrainType.MOUNTAINS]: [TerrainType.HILLS]  // Mountains can only spawn next to hills
    };

    private readonly TERRAIN_WEIGHTS = {
        [TerrainType.WATER]: 0.15,
        [TerrainType.BEACH]: 0.1,
        [TerrainType.PLAINS]: 0.35,
        [TerrainType.HILLS]: 0.35,     // Increased hill probability
        [TerrainType.MOUNTAINS]: 0.05   // Reduced mountain probability
    };

    private normalizeHeight(height: number): number {
        return Math.max(this.MIN_HEIGHT, Math.min(this.MAX_HEIGHT, height));
    }

    private getTerrainTypeForHeight(height: number): TerrainType {
        for (const [type, range] of Object.entries(this.HEIGHT_THRESHOLDS)) {
            if (height >= range.min && height <= range.max) {
                return Number(type) as TerrainType;
            }
        }
        return TerrainType.PLAINS;
    }

    private isValidNeighbor(current: TerrainType, neighbor: TerrainType): boolean {
        return this.VALID_NEIGHBORS[current].includes(neighbor);
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
        return this.HEIGHT_THRESHOLDS[TerrainType.PLAINS].min;
    }

    private getValidHeightRange(x: number, z: number, terrain: TerrainTile[][]): { min: number; max: number } {
        const definedNeighbors: TerrainTile[] = [];
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

        for (const [dx, dz] of directions) {
            const newX = x + dx;
            const newZ = z + dz;
            if (newX >= 0 && newX < terrain[0].length && 
                newZ >= 0 && newZ < terrain.length && 
                terrain[newZ][newX] !== null) {
                definedNeighbors.push(terrain[newZ][newX]);
            }
        }

        if (definedNeighbors.length === 0) {
            return { 
                min: this.MIN_HEIGHT, 
                max: this.MAX_HEIGHT 
            };
        }

        const avgHeight = definedNeighbors.reduce((sum, n) => sum + n.height, 0) / definedNeighbors.length;
        const maxDiff = 1.5; // Reduced height difference for smoother transitions

        // Apply weighted height adjustment
        const baseMin = this.normalizeHeight(avgHeight - maxDiff);
        const baseMax = this.normalizeHeight(avgHeight + maxDiff);

        // Reduce probability of extreme heights
        const mountainProbability = 0.05;
        if (baseMax > this.HEIGHT_THRESHOLDS[TerrainType.MOUNTAINS].min && 
            Math.random() > mountainProbability) {
            return {
                min: baseMin,
                max: this.HEIGHT_THRESHOLDS[TerrainType.HILLS].max
            };
        }

        return {
            min: baseMin,
            max: baseMax
        };
    }

    generateTerrain(width: number, height: number): TerrainTile[][] {
        const terrain: TerrainTile[][] = Array.from(
            { length: height },
            () => Array(width).fill(null)
        );

        // Generate initial random seed points
        const numSeeds = Math.max(3, Math.floor(Math.sqrt(width * height) / 4));
        for (let i = 0; i < numSeeds; i++) {
            const x = Math.floor(Math.random() * width);
            const z = Math.floor(Math.random() * height);
            const initialHeight = this.getWeightedRandomHeight();
            terrain[z][x] = {
                height: initialHeight,
                type: this.getTerrainTypeForHeight(initialHeight)
            };
        }

        // Queue for propagation
        const queue: [number, number][] = [];
        for (let i = 0; i < numSeeds; i++) {
            queue.push([Math.floor(Math.random() * width), Math.floor(Math.random() * height)]);
        }
        
        while (queue.length > 0) {
            const [currentX, currentZ] = queue.shift()!;

            const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
            for (const [dx, dz] of directions) {
                const newX = currentX + dx;
                const newZ = currentZ + dz;

                if (newX >= 0 && newX < width && 
                    newZ >= 0 && newZ < height && 
                    terrain[newZ][newX] === null) {
                    
                    const range = this.getValidHeightRange(newX, newZ, terrain);
                    let success = false;

                    for (let attempt = 0; attempt < this.COLLAPSE_ATTEMPTS && !success; attempt++) {
                        // Use weighted random height for initial attempt
                        const newHeight = attempt === 0 ? 
                            this.getWeightedRandomHeight() : 
                            this.normalizeHeight(range.min + Math.random() * (range.max - range.min));
                            
                        const newType = this.getTerrainTypeForHeight(newHeight);

                        let isValid = true;
                        for (const [checkDx, checkDz] of directions) {
                            const checkX = newX + checkDx;
                            const checkZ = newZ + checkDz;
                            if (checkX >= 0 && checkX < width && 
                                checkZ >= 0 && checkZ < height && 
                                terrain[checkZ][checkX] !== null) {
                                if (!this.isValidNeighbor(newType, terrain[checkZ][checkX].type)) {
                                    isValid = false;
                                    break;
                                }
                            }
                        }

                        if (isValid) {
                            terrain[newZ][newX] = { height: newHeight, type: newType };
                            queue.push([newX, newZ]);
                            success = true;
                        }
                    }

                    // If all attempts failed, use fallback values
                    if (terrain[newZ][newX] === null) {
                        const fallbackHeight = this.normalizeHeight((range.min + range.max) / 2);
                        terrain[newZ][newX] = {
                            height: fallbackHeight,
                            type: this.getTerrainTypeForHeight(fallbackHeight)
                        };
                        queue.push([newX, newZ]);
                    }
                }
            }
        }

        // Post-process to smooth transitions and reduce isolated mountains
        this.smoothTerrain(terrain);

        return terrain;
    }

    private smoothTerrain(terrain: TerrainTile[][]) {
        const width = terrain[0].length;
        const height = terrain.length;
        
        for (let z = 0; z < height; z++) {
            for (let x = 0; x < width; x++) {
                if (terrain[z][x].type === TerrainType.MOUNTAINS) {
                    // Count neighboring hills
                    let hillCount = 0;
                    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
                    
                    for (const [dx, dz] of directions) {
                        const newX = x + dx;
                        const newZ = z + dz;
                        if (newX >= 0 && newX < width && newZ >= 0 && newZ < height) {
                            if (terrain[newZ][newX].type === TerrainType.HILLS) {
                                hillCount++;
                            }
                        }
                    }

                    // Convert isolated mountains to hills
                    if (hillCount < 2) {
                        terrain[z][x].height = this.HEIGHT_THRESHOLDS[TerrainType.HILLS].max - 0.5;
                        terrain[z][x].type = TerrainType.HILLS;
                    }
                }
            }
        }
    }

    getTerrainTypeColor(type: TerrainType): { r: number, g: number, b: number } {
        switch (type) {
            case TerrainType.WATER:
                return { r: 0.2, g: 0.4, b: 0.8 };
            case TerrainType.BEACH:
                return { r: 0.8, g: 0.8, b: 0.6 };
            case TerrainType.PLAINS:
                return { r: 0.4, g: 0.8, b: 0.4 };
            case TerrainType.HILLS:
                return { r: 0.5, g: 0.7, b: 0.3 };
            case TerrainType.MOUNTAINS:
                return { r: 0.6, g: 0.6, b: 0.6 };
        }
    }
}