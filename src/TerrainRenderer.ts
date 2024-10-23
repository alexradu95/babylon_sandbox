import * as BABYLON from 'babylonjs';
import { WaveFunctionCollapse, TerrainType } from './WaveFunctionCollapse';
import { TerrainDecorator } from './TerrainDecorator';

interface ChunkData {
    positions: number[];
    indices: number[];
    colors: number[];
    normals: number[];
}

export class TerrainRenderer {
    private chunks: BABYLON.Mesh[] = [];
    private terrainNode: BABYLON.TransformNode;
    private decorator: TerrainDecorator;
    private readonly CHUNK_SIZE = 20;

    constructor(
        private readonly scene: BABYLON.Scene,
        private readonly wfc: WaveFunctionCollapse,
        private readonly terrainSize: number
    ) {
        this.terrainNode = new BABYLON.TransformNode("terrainNode", scene);
        this.decorator = new TerrainDecorator(scene, this.terrainNode);
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

                // Add main faces
                this.addCubeFaces(
                    baseX, baseZ, height,
                    positions, indices, colors, normals,
                    color, vertexIndex
                );

                vertexIndex += this.calculateVertexCount(height);
            }
        }

        return { positions, indices, colors, normals };
    }

    private getTerrainMaterial(type: TerrainType): BABYLON.StandardMaterial {
        const material = new BABYLON.StandardMaterial(`material_${type}`, this.scene);
        
        switch (type) {
            case TerrainType.WATER:
                material.diffuseColor = new BABYLON.Color3(0.1, 0.3, 0.7);
                material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
                material.ambientColor = new BABYLON.Color3(0.1, 0.1, 0.2);
                break;
            case TerrainType.BEACH:
                material.diffuseColor = new BABYLON.Color3(0.76, 0.7, 0.5);
                material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
                break;
            case TerrainType.PLAINS:
                material.diffuseColor = new BABYLON.Color3(0.4, 0.6, 0.3);
                material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
                break;
            case TerrainType.HILLS:
                material.diffuseColor = new BABYLON.Color3(0.3, 0.5, 0.2);
                material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
                break;
            case TerrainType.MOUNTAINS:
                material.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
                material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
                break;
        }
        
        return material;
    }

    private calculateVertexCount(height: number): number {
        // 4 vertices for top face + 16 vertices for sides if height > 0
        return height > 0 ? 20 : 4;
    }

    private addCubeFaces(
        baseX: number,
        baseZ: number,
        height: number,
        positions: number[],
        indices: number[],
        colors: number[],
        normals: number[],
        color: { r: number, g: number, b: number },
        vertexIndex: number
    ) {
        // Top face
        positions.push(
            baseX, height, baseZ,
            baseX + 1, height, baseZ,
            baseX + 1, height, baseZ + 1,
            baseX, height, baseZ + 1
        );

        // Top face normals
        for (let i = 0; i < 4; i++) {
            normals.push(0, 1, 0);
        }

        // Top face indices
        indices.push(
            vertexIndex, vertexIndex + 1, vertexIndex + 2,
            vertexIndex, vertexIndex + 2, vertexIndex + 3
        );

        // Top face colors
        for (let i = 0; i < 4; i++) {
            colors.push(color.r, color.g, color.b, 1);
        }

        if (height > 0) {
            let currentVertexIndex = vertexIndex + 4;
            
            // Front face
            positions.push(
                baseX, 0, baseZ,
                baseX + 1, 0, baseZ,
                baseX + 1, height, baseZ,
                baseX, height, baseZ
            );
            
            // Back face
            positions.push(
                baseX, 0, baseZ + 1,
                baseX + 1, 0, baseZ + 1,
                baseX + 1, height, baseZ + 1,
                baseX, height, baseZ + 1
            );
            
            // Right face
            positions.push(
                baseX + 1, 0, baseZ,
                baseX + 1, 0, baseZ + 1,
                baseX + 1, height, baseZ + 1,
                baseX + 1, height, baseZ
            );
            
            // Left face
            positions.push(
                baseX, 0, baseZ,
                baseX, 0, baseZ + 1,
                baseX, height, baseZ + 1,
                baseX, height, baseZ
            );

            // Add normals for each face
            for (let i = 0; i < 4; i++) normals.push(0, 0, -1); // Front
            for (let i = 0; i < 4; i++) normals.push(0, 0, 1);  // Back
            for (let i = 0; i < 4; i++) normals.push(1, 0, 0);  // Right
            for (let i = 0; i < 4; i++) normals.push(-1, 0, 0); // Left

            // Add indices for each face
            for (let i = 0; i < 4; i++) {
                indices.push(
                    currentVertexIndex, currentVertexIndex + 1, currentVertexIndex + 2,
                    currentVertexIndex, currentVertexIndex + 2, currentVertexIndex + 3
                );
                currentVertexIndex += 4;
            }

            // Add slightly darker colors for sides
            for (let i = 0; i < 16; i++) {
                colors.push(color.r * 0.8, color.g * 0.8, color.b * 0.8, 1);
            }
        }
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

        // Create and apply material
        const material = new BABYLON.StandardMaterial(`chunkMaterial_${chunkX}_${chunkZ}`, this.scene);
        material.backFaceCulling = true;
        material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        material.ambientColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        material.vertexColors = true;
        material.freeze();
        chunkMesh.material = material;

        // Optimize mesh
        chunkMesh.freezeWorldMatrix();
        chunkMesh.doNotSyncBoundingInfo = true;
        chunkMesh.isPickable = false;
        chunkMesh.alwaysSelectAsActiveMesh = true;

        return chunkMesh;
    }

    render() {
        // Generate terrain data
        const terrain = this.wfc.generateTerrain(this.terrainSize, this.terrainSize);

        // Clear any existing chunks
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

        // Add decorations
        this.decorator.decorate(terrain, this.terrainSize);

        return this.chunks;
    }

    dispose() {
        this.chunks.forEach(chunk => chunk.dispose());
        this.chunks = [];
        this.decorator.dispose();
        this.terrainNode.dispose();
    }
}