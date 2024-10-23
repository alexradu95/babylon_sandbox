import { TerrainFeature, TerrainType, WaveFunctionCollapse } from "./WaveFunctionCollapse";

export class TerrainRenderer {
    private chunks: BABYLON.Mesh[] = [];
    private features: BABYLON.Mesh[] = [];
    private terrainNode: BABYLON.TransformNode;
    private readonly CHUNK_SIZE = 20;

    constructor(
        private readonly scene: BABYLON.Scene,
        private readonly wfc: WaveFunctionCollapse,
        private readonly terrainSize: number
    ) {
        this.terrainNode = new BABYLON.TransformNode("terrainNode", scene);
    }

    private createChunkData(
        terrain: { height: number; type: TerrainType; features: TerrainFeature[] }[][],
        startX: number,
        startZ: number
    ): { positions: number[]; indices: number[]; colors: number[]; normals: number[] } {
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
    
                if (height > 0) {
                    // Front face (Z-)
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
    
                    // Back face (Z+)
                    positions.push(
                        baseX, 0, baseZ + 1,
                        baseX, height, baseZ + 1,
                        baseX + 1, height, baseZ + 1,
                        baseX + 1, 0, baseZ + 1
                    );
    
                    indices.push(
                        vertexIndex, vertexIndex + 1, vertexIndex + 2,
                        vertexIndex, vertexIndex + 2, vertexIndex + 3
                    );
    
                    for (let i = 0; i < 4; i++) {
                        colors.push(color.r * 0.8, color.g * 0.8, color.b * 0.8, 1);
                        normals.push(0, 0, 1);
                    }
    
                    vertexIndex += 4;
    
                    // Right face (X+)
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
    
                    // Left face (X-)
                    positions.push(
                        baseX, 0, baseZ + 1,
                        baseX, 0, baseZ,
                        baseX, height, baseZ,
                        baseX, height, baseZ + 1
                    );
    
                    indices.push(
                        vertexIndex, vertexIndex + 1, vertexIndex + 2,
                        vertexIndex, vertexIndex + 2, vertexIndex + 3
                    );
    
                    for (let i = 0; i < 4; i++) {
                        colors.push(color.r * 0.9, color.g * 0.9, color.b * 0.9, 1);
                        normals.push(-1, 0, 0);
                    }
    
                    vertexIndex += 4;
    
                    // Bottom face (optional, if you want to see it from underneath)
                    positions.push(
                        baseX, 0, baseZ,
                        baseX, 0, baseZ + 1,
                        baseX + 1, 0, baseZ + 1,
                        baseX + 1, 0, baseZ
                    );
    
                    indices.push(
                        vertexIndex, vertexIndex + 1, vertexIndex + 2,
                        vertexIndex, vertexIndex + 2, vertexIndex + 3
                    );
    
                    for (let i = 0; i < 4; i++) {
                        colors.push(color.r * 0.7, color.g * 0.7, color.b * 0.7, 1);
                        normals.push(0, -1, 0);
                    }
    
                    vertexIndex += 4;
                }
            }
        }
    
        return { positions, indices, colors, normals };
    }

    private createChunkMesh(chunkX: number, chunkZ: number, chunkData: ReturnType<typeof this.createChunkData>): BABYLON.Mesh {
        const chunk = new BABYLON.Mesh(`chunk_${chunkX}_${chunkZ}`, this.scene);
        chunk.parent = this.terrainNode;
    
        // Create vertex data and apply it to the mesh
        const vertexData = new BABYLON.VertexData();
        vertexData.positions = chunkData.positions;
        vertexData.indices = chunkData.indices;
        vertexData.colors = chunkData.colors;
        vertexData.normals = chunkData.normals;
        vertexData.applyToMesh(chunk);
    
        // Create material
        const material = new BABYLON.StandardMaterial(`chunkMaterial_${chunkX}_${chunkZ}`, this.scene);
        material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        material.diffuseColor = BABYLON.Color3.White();
        material.backFaceCulling = false;
    
        // Enable vertex colors through vertex buffer
        chunk.setVerticesData(BABYLON.VertexBuffer.ColorKind, chunkData.colors, true);
        chunk.hasVertexAlpha = false; // Set to true if your colors have alpha
    
        chunk.material = material;
        chunk.freezeWorldMatrix();
        chunk.isPickable = false;
    
        return chunk;
    }

    private createTowerMesh(position: BABYLON.Vector3, scale: number): BABYLON.Mesh {
        const tower = new BABYLON.Mesh("tower", this.scene);
        
        // Tower body
        const body = BABYLON.MeshBuilder.CreateCylinder("towerBody", {
            height: scale * 4,
            diameter: scale,
            tessellation: 12
        }, this.scene);
        body.parent = tower;
        
        // Tower roof
        const roof = BABYLON.MeshBuilder.CreateCylinder("towerRoof", {
            height: scale,
            diameterTop: 0,
            diameterBottom: scale * 1.2,
            tessellation: 12
        }, this.scene);
        roof.position.y = scale * 2.5;
        roof.parent = tower;

        tower.position = position;
        return tower;
    }

    private createCrystalMesh(position: BABYLON.Vector3, scale: number): BABYLON.Mesh {
        const crystal = BABYLON.MeshBuilder.CreatePolyhedron("crystal", {
            type: 3, // Octahedron
            size: scale
        }, this.scene);
        
        const crystalMaterial = new BABYLON.StandardMaterial("crystalMat", this.scene);
        crystalMaterial.emissiveColor = new BABYLON.Color3(0.4, 0.6, 1.0);
        crystalMaterial.alpha = 0.8;
        crystal.material = crystalMaterial;
        
        crystal.position = position;
        crystal.rotation.y = Math.random() * Math.PI;
        
        return crystal;
    }

    render() {
        const terrain = this.wfc.generateTerrain(this.terrainSize, this.terrainSize);

        // Clear existing meshes
        this.chunks.forEach(chunk => chunk.dispose());
        this.features.forEach(feature => feature.dispose());
        this.chunks = [];
        this.features = [];

        // Render terrain chunks
        for (let chunkZ = 0; chunkZ < this.terrainSize; chunkZ += this.CHUNK_SIZE) {
            for (let chunkX = 0; chunkX < this.terrainSize; chunkX += this.CHUNK_SIZE) {
                const chunkData = this.createChunkData(terrain, chunkX, chunkZ);
                const chunk = this.createChunkMesh(chunkX, chunkZ, chunkData);
                this.chunks.push(chunk);

                // Add features for this chunk
                for (let z = chunkZ; z < Math.min(chunkZ + this.CHUNK_SIZE, this.terrainSize); z++) {
                    for (let x = chunkX; x < Math.min(chunkX + this.CHUNK_SIZE, this.terrainSize); x++) {
                        const tile = terrain[z][x];
                        if (tile.features.length > 0) {
                            const position = new BABYLON.Vector3(
                                x - this.terrainSize/2,
                                tile.height,
                                z - this.terrainSize/2
                            );
                            
                            tile.features.forEach((feature: TerrainFeature) => {
                                const featureMesh = this.createFeatureMesh(feature, position);
                                this.features.push(featureMesh);
                            });
                        }
                    }
                }
            }
        }

        // Add post-processing effects
        this.addAtmosphericEffects();
    }

    private addAtmosphericEffects() {
        // Add fog
        this.scene.fogMode = BABYLON.Scene.FOGMODE_EXP;
        this.scene.fogDensity = 0.01;
        this.scene.fogColor = new BABYLON.Color3(0.8, 0.9, 1.0);

        // Add ambient particles for atmosphere
        const particleSystem = new BABYLON.ParticleSystem("atmosphere", 1000, this.scene);
        particleSystem.particleTexture = new BABYLON.Texture("textures/flare.png", this.scene);
        particleSystem.emitter = new BABYLON.Vector3(0, 30, 0);
        particleSystem.minEmitBox = new BABYLON.Vector3(-this.terrainSize/2, 0, -this.terrainSize/2);
        particleSystem.maxEmitBox = new BABYLON.Vector3(this.terrainSize/2, 0, this.terrainSize/2);
        particleSystem.color1 = new BABYLON.Color4(1, 1, 1, 0.1);
        particleSystem.color2 = new BABYLON.Color4(1, 1, 1, 0.1);
        particleSystem.minSize = 0.1;
        particleSystem.maxSize = 0.5;
        particleSystem.minLifeTime = 1;
        particleSystem.maxLifeTime = 2;
        particleSystem.emitRate = 50;
        particleSystem.start();
    }

    dispose() {
        this.chunks.forEach(chunk => chunk.dispose());
        this.features.forEach(feature => feature.dispose());
        this.chunks = [];
        this.features = [];
        this.terrainNode.dispose();
    }

    private createFeatureMesh(feature: TerrainFeature, position: BABYLON.Vector3): BABYLON.Mesh {
        const scale = 1;  // Base scale for features
    
        switch (feature) {
            case TerrainFeature.TOWER:
                return this.createTowerMesh(position, scale);
                
            case TerrainFeature.MAGICAL_CRYSTAL:
                return this.createCrystalMesh(position, scale);
                
            case TerrainFeature.CASTLE:
                return this.createCastleMesh(position, scale);
                
            case TerrainFeature.VILLAGE:
                return this.createVillageMesh(position, scale);
                
            case TerrainFeature.ANCIENT_RUINS:
                return this.createRuinsMesh(position, scale);
            
                
            default:
                // Default simple marker for unimplemented features
                const marker = BABYLON.MeshBuilder.CreateBox("marker", {
                    height: 1,
                    width: 1,
                    depth: 1
                }, this.scene);
                marker.position = position.add(new BABYLON.Vector3(0, 0.5, 0));
                const markerMaterial = new BABYLON.StandardMaterial("markerMat", this.scene);
                markerMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0);
                marker.material = markerMaterial;
                return marker;
        }
    }
    
    private createCastleMesh(position: BABYLON.Vector3, scale: number): BABYLON.Mesh {
        const castle = new BABYLON.Mesh("castle", this.scene);
        
        // Main keep
        const keep = BABYLON.MeshBuilder.CreateBox("keep", {
            height: scale * 3,
            width: scale * 2,
            depth: scale * 2
        }, this.scene);
        keep.parent = castle;
        
        // Towers at corners
        const towerPositions = [
            new BABYLON.Vector3(scale, 0, scale),
            new BABYLON.Vector3(-scale, 0, scale),
            new BABYLON.Vector3(scale, 0, -scale),
            new BABYLON.Vector3(-scale, 0, -scale)
        ];
        
        towerPositions.forEach((pos, index) => {
            const tower = BABYLON.MeshBuilder.CreateCylinder(`tower${index}`, {
                height: scale * 4,
                diameter: scale * 0.8
            }, this.scene);
            tower.position = pos;
            tower.parent = castle;
        });
    
        castle.position = position;
        
        // Add material
        const castleMaterial = new BABYLON.StandardMaterial("castleMat", this.scene);
        castleMaterial.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.7);
        castle.getChildMeshes().forEach(mesh => mesh.material = castleMaterial);
    
        return castle;
    }
    
    private createVillageMesh(position: BABYLON.Vector3, scale: number): BABYLON.Mesh {
        const village = new BABYLON.Mesh("village", this.scene);
        
        // Create several small houses
        const housePositions = [
            new BABYLON.Vector3(0, 0, 0),
            new BABYLON.Vector3(scale * 1.5, 0, scale),
            new BABYLON.Vector3(-scale, 0, -scale),
            new BABYLON.Vector3(scale, 0, -scale * 1.5)
        ];
    
        housePositions.forEach((pos, index) => {
            const house = BABYLON.MeshBuilder.CreateBox(`house${index}`, {
                height: scale,
                width: scale * 1.2,
                depth: scale
            }, this.scene);
            house.position = pos;
    
            // Add a roof
            const roof = BABYLON.MeshBuilder.CreateCylinder(`roof${index}`, {
                height: scale * 0.8,
                diameter: scale * 1.4,
                tessellation: 4
            }, this.scene);
            roof.rotation.z = Math.PI / 2;
            roof.position = pos.add(new BABYLON.Vector3(0, scale * 0.8, 0));
            
            house.parent = village;
            roof.parent = village;
        });
    
        village.position = position;
        
        // Add material
        const villageMaterial = new BABYLON.StandardMaterial("villageMat", this.scene);
        villageMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.6, 0.4);
        village.getChildMeshes().forEach(mesh => mesh.material = villageMaterial);
    
        return village;
    }
    
    private createRuinsMesh(position: BABYLON.Vector3, scale: number): BABYLON.Mesh {
        const ruins = new BABYLON.Mesh("ruins", this.scene);
        
        // Create broken columns
        for (let i = 0; i < 4; i++) {
            const height = scale * (1 + Math.random());
            const column = BABYLON.MeshBuilder.CreateCylinder(`column${i}`, {
                height: height,
                diameter: scale * 0.4,
                tessellation: 8
            }, this.scene);
            
            column.position = new BABYLON.Vector3(
                (Math.random() - 0.5) * scale * 2,
                height/2,
                (Math.random() - 0.5) * scale * 2
            );
            column.rotation.x = Math.random() * 0.3;
            column.rotation.z = Math.random() * 0.3;
            column.parent = ruins;
        }
    
        // Add some fallen blocks
        for (let i = 0; i < 6; i++) {
            const block = BABYLON.MeshBuilder.CreateBox(`block${i}`, {
                height: scale * 0.4,
                width: scale * 0.8,
                depth: scale * 0.4
            }, this.scene);
            
            block.position = new BABYLON.Vector3(
                (Math.random() - 0.5) * scale * 3,
                scale * 0.2,
                (Math.random() - 0.5) * scale * 3
            );
            block.rotation.y = Math.random() * Math.PI;
            block.parent = ruins;
        }
    
        ruins.position = position;
        
        // Add aged stone material
        const ruinsMaterial = new BABYLON.StandardMaterial("ruinsMat", this.scene);
        ruinsMaterial.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.6);
        ruins.getChildMeshes().forEach(mesh => mesh.material = ruinsMaterial);
    
        return ruins;
    }

}