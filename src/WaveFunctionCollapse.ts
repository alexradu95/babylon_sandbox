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
    
    private readonly HEIGHT_THRESHOLDS = {
        [TerrainType.WATER]: { min: 0, max: 2 },
        [TerrainType.BEACH]: { min: 2, max: 3 },
        [TerrainType.PLAINS]: { min: 3, max: 5 },
        [TerrainType.HILLS]: { min: 5, max: 7 },
        [TerrainType.MOUNTAINS]: { min: 7, max: 10 }
    };

    private readonly VALID_NEIGHBORS = {
        [TerrainType.WATER]: [TerrainType.WATER, TerrainType.BEACH],
        [TerrainType.BEACH]: [TerrainType.WATER, TerrainType.BEACH, TerrainType.PLAINS],
        [TerrainType.PLAINS]: [TerrainType.BEACH, TerrainType.PLAINS, TerrainType.HILLS],
        [TerrainType.HILLS]: [TerrainType.PLAINS, TerrainType.HILLS, TerrainType.MOUNTAINS],
        [TerrainType.MOUNTAINS]: [TerrainType.HILLS, TerrainType.MOUNTAINS]
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
            // No defined neighbors, return full range
            return { 
                min: this.MIN_HEIGHT, 
                max: this.MAX_HEIGHT 
            };
        }

        const avgHeight = definedNeighbors.reduce((sum, n) => sum + n.height, 0) / definedNeighbors.length;
        const maxDiff = 2; // Maximum height difference between neighbors

        return {
            min: this.normalizeHeight(avgHeight - maxDiff),
            max: this.normalizeHeight(avgHeight + maxDiff)
        };
    }

    generateTerrain(width: number, height: number): TerrainTile[][] {
        // Initialize terrain with null values
        const terrain: TerrainTile[][] = Array.from(
            { length: height },
            () => Array(width).fill(null)
        );

        // Generate initial random seed point
        const startX = Math.floor(width / 2);
        const startZ = Math.floor(height / 2);
        
        // Create initial tile
        const initialHeight = this.normalizeHeight(Math.random() * this.MAX_HEIGHT);
        terrain[startZ][startX] = {
            height: initialHeight,
            type: this.getTerrainTypeForHeight(initialHeight)
        };

        // Queue for propagation
        const queue: [number, number][] = [[startX, startZ]];
        
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
                        const newHeight = this.normalizeHeight(
                            range.min + Math.random() * (range.max - range.min)
                        );
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

        return terrain;
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