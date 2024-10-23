import * as BABYLON from 'babylonjs';
import { WaveFunctionCollapse, TerrainType } from './WaveFunctionCollapse';

interface ChunkData {
    positions: number[];
    indices: number[];
    colors: number[];
    normals: number[];
}

export class TerrainRenderer {
    private chunks: BABYLON.Mesh[] = [];
    private terrainNode: BABYLON.TransformNode;
    private readonly CHUNK_SIZE = 20;

    constructor(
        private readonly scene: BABYLON.Scene,
        private readonly wfc: WaveFunctionCollapse,
        private readonly terrainSize: number
    ) {
        this.terrainNode = new BABYLON.TransformNode("terrainNode", scene);
    }

    private createChunkMesh(chunkX: number, chunkZ: number, chunkData: ChunkData): BABYLON.Mesh {
        const chunkMesh = new BABYLON.Mesh(`chunk_${chunkX}_${chunkZ}`, this.scene);
        chunkMesh.parent = this.terrainNode;

        const vertexData = new BABYLON.VertexData();
        vertexData.positions = chunkData.positions;
        vertexData.indices = chunkData.indices;
        vertexData.colors = chunkData.colors;
        vertexData.normals = chunkData.normals;
        vertexData.applyToMesh(chunkMesh);

        // Create material with the correct StandardMaterial properties
        const material = new BABYLON.StandardMaterial(`chunkMaterial_${chunkX}_${chunkZ}`, this.scene);
        
        // Basic material properties
        material.backFaceCulling = false;
        material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        material.ambientColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        material.diffuseColor = new BABYLON.Color3(1, 1, 1);
        
        // Enable vertex colors
        material.diffuseColor = BABYLON.Color3.White();
        material.specularColor = BABYLON.Color3.Black();
        
        // Improve performance by disabling unnecessary features
        material.disableLighting = false;
        material.twoSidedLighting = true;
        material.maxSimultaneousLights = 4;
        
        // Optimize transparency handling
        material.alpha = 1.0;
        material.alphaMode = BABYLON.Engine.ALPHA_MAXIMIZE;
        
        // Apply mesh optimizations
        chunkMesh.material = material;
        chunkMesh.freezeWorldMatrix();
        chunkMesh.isPickable = false;
        chunkMesh.receiveShadows = true;

        return chunkMesh;
    }

    private createChunkData(
        terrain: ReturnType<WaveFunctionCollapse['generateTerrain']>,
        startX: number,
        startZ: number,
    ): ChunkData {
        const positions: number[] = [];
        const indices: number[] = [];
        const colors: number[] = [];
        const normals: number[] = [];
        let vertexIndex = 0;

        for (let z = startZ; z < Math.min(startZ + this.CHUNK_SIZE, this.terrainSize); z++) {
            for (let x = startX; x < Math.min(startX + this.CHUNK_SIZE, this.terrainSize); x++) {
                const tile = terrain[z][x];
                const height = tile.height;
                const color = this.wfc.getTerrainTypeColor(tile.type);

                const baseX = x - this.terrainSize/2;
                const baseZ = z - this.terrainSize/2;

                // Top face
                positions.push(
                    baseX, height, baseZ,
                    baseX + 1, height, baseZ,
                    baseX + 1, height, baseZ + 1,
                    baseX, height, baseZ + 1
                );

                indices.push(
                    vertexIndex, vertexIndex + 1, vertexIndex + 2,
                    vertexIndex, vertexIndex + 2, vertexIndex + 3
                );

                for (let i = 0; i < 4; i++) {
                    colors.push(color.r, color.g, color.b, 1);
                    normals.push(0, 1, 0);
                }

                vertexIndex += 4;

                // Only add side faces if they might be visible
                if (height > 0) {
                    // Front face
                    positions.push(
                        baseX, 0, baseZ,
                        baseX + 1, 0, baseZ,
                        baseX + 1, height, baseZ,
                        baseX, height, baseZ
                    );

                    indices.push(
                        vertexIndex, vertexIndex + 1, vertexIndex + 2,
                        vertexIndex, vertexIndex + 2, vertexIndex + 3
                    );

                    for (let i = 0; i < 4; i++) {
                        colors.push(color.r * 0.8, color.g * 0.8, color.b * 0.8, 1);
                        normals.push(0, 0, -1);
                    }

                    vertexIndex += 4;

                    // Right face
                    positions.push(
                        baseX + 1, 0, baseZ,
                        baseX + 1, 0, baseZ + 1,
                        baseX + 1, height, baseZ + 1,
                        baseX + 1, height, baseZ
                    );

                    indices.push(
                        vertexIndex, vertexIndex + 1, vertexIndex + 2,
                        vertexIndex, vertexIndex + 2, vertexIndex + 3
                    );

                    for (let i = 0; i < 4; i++) {
                        colors.push(color.r * 0.9, color.g * 0.9, color.b * 0.9, 1);
                        normals.push(1, 0, 0);
                    }

                    vertexIndex += 4;
                }
            }
        }

        return { positions, indices, colors, normals };
    }

    render() {
        const terrain = this.wfc.generateTerrain(this.terrainSize, this.terrainSize);

        // Clear existing chunks
        this.chunks.forEach(chunk => chunk.dispose());
        this.chunks = [];

        // Create new chunks
        for (let chunkZ = 0; chunkZ < this.terrainSize; chunkZ += this.CHUNK_SIZE) {
            for (let chunkX = 0; chunkX < this.terrainSize; chunkX += this.CHUNK_SIZE) {
                const chunkData = this.createChunkData(terrain, chunkX, chunkZ);
                const chunk = this.createChunkMesh(chunkX, chunkZ, chunkData);
                this.chunks.push(chunk);
            }
        }

        return this.chunks;
    }

    dispose() {
        this.chunks.forEach(chunk => chunk.dispose());
        this.chunks = [];
        this.terrainNode.dispose();
    }
}