import * as BABYLON from 'babylonjs';
import { TerrainType } from './WaveFunctionCollapse';

interface TerrainTile {
    height: number;
    type: TerrainType;
}

export class TerrainDecorator {
    private decorations: BABYLON.Mesh[] = [];
    private readonly TREE_DENSITY = 0.3;
    private readonly HOUSE_DENSITY = 0.05;
    private readonly MIN_HOUSES_PER_VILLAGE = 3;
    private readonly MAX_HOUSES_PER_VILLAGE = 7;

    constructor(
        private readonly scene: BABYLON.Scene,
        private readonly parentNode: BABYLON.TransformNode
    ) {}

    private createTree(position: BABYLON.Vector3): BABYLON.Mesh[] {
        const treeParts: BABYLON.Mesh[] = [];
        
        // Create trunk
        const trunk = BABYLON.MeshBuilder.CreateCylinder("trunk", {
            height: 1 + Math.random() * 0.5,
            diameter: 0.2,
            tessellation: 8
        }, this.scene);
        
        const trunkMaterial = new BABYLON.StandardMaterial("trunkMat", this.scene);
        trunkMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.3, 0.2);
        trunk.material = trunkMaterial;
        trunk.position = position.clone();
        trunk.position.y += trunk.scaling.y / 2;

        // Create foliage (multiple layers for more natural look)
        const layers = 3;
        for (let i = 0; i < layers; i++) {
            const cone = BABYLON.MeshBuilder.CreateCylinder("foliage", {
                height: 1.5 - (i * 0.2),
                diameterTop: 0.01,
                diameterBottom: 1.2 - (i * 0.2),
                tessellation: 8
            }, this.scene);
            
            const foliageMaterial = new BABYLON.StandardMaterial("foliageMat", this.scene);
            foliageMaterial.diffuseColor = new BABYLON.Color3(
                0.2 + Math.random() * 0.2,
                0.4 + Math.random() * 0.2,
                0.1 + Math.random() * 0.1
            );
            cone.material = foliageMaterial;
            
            cone.position = position.clone();
            cone.position.y += trunk.scaling.y + (cone.scaling.y / 2) + (i * 0.4);
            
            // Random rotation for variety
            cone.rotation.y = Math.random() * Math.PI;
            
            treeParts.push(cone);
        }

        treeParts.push(trunk);
        treeParts.forEach(part => {
            part.parent = this.parentNode;
            this.decorations.push(part);
        });

        return treeParts;
    }

    private createHouse(position: BABYLON.Vector3, rotation: number = 0): BABYLON.Mesh[] {
        const houseParts: BABYLON.Mesh[] = [];

        // Create main building
        const building = BABYLON.MeshBuilder.CreateBox("house", {
            height: 1.5,
            width: 2,
            depth: 2
        }, this.scene);
        
        const buildingMaterial = new BABYLON.StandardMaterial("houseMat", this.scene);
        buildingMaterial.diffuseColor = new BABYLON.Color3(
            0.8 + Math.random() * 0.2,
            0.8 + Math.random() * 0.2,
            0.8 + Math.random() * 0.2
        );
        building.material = buildingMaterial;
        
        building.position = position.clone();
        building.position.y += building.scaling.y / 2;
        building.rotation.y = rotation;

        // Create roof
        const roof = BABYLON.MeshBuilder.CreateCylinder("roof", {
            height: 2.2,
            diameter: 0.01,
            diameterTop: 0.01,
            diameterBottom: 2.4,
            tessellation: 4
        }, this.scene);
        
        const roofMaterial = new BABYLON.StandardMaterial("roofMat", this.scene);
        roofMaterial.diffuseColor = new BABYLON.Color3(
            0.6 + Math.random() * 0.2,
            0.3 + Math.random() * 0.1,
            0.2 + Math.random() * 0.1
        );
        roof.material = roofMaterial;
        
        roof.rotation.z = Math.PI / 2;
        roof.position = position.clone();
        roof.position.y += building.scaling.y + 0.5;
        roof.rotation.y = rotation;

        // Create chimney
        const chimney = BABYLON.MeshBuilder.CreateBox("chimney", {
            height: 0.7,
            width: 0.3,
            depth: 0.3
        }, this.scene);
        
        const chimneyMaterial = new BABYLON.StandardMaterial("chimneyMat", this.scene);
        chimneyMaterial.diffuseColor = new BABYLON.Color3(0.6, 0.6, 0.6);
        chimney.material = chimneyMaterial;
        
        chimney.position = position.clone();
        chimney.position.x += 0.5 * Math.cos(rotation);
        chimney.position.z += 0.5 * Math.sin(rotation);
        chimney.position.y += building.scaling.y + roof.scaling.y / 2;

        houseParts.push(building, roof, chimney);
        houseParts.forEach(part => {
            part.parent = this.parentNode;
            this.decorations.push(part);
        });

        return houseParts;
    }

    private isGoodSpotForTree(x: number, z: number, terrain: TerrainTile[][]): boolean {
        const tile = terrain[z][x];
        return (tile.type === TerrainType.PLAINS || tile.type === TerrainType.HILLS) &&
               tile.height > 3 && tile.height < 7;
    }

    private isGoodSpotForVillage(x: number, z: number, terrain: TerrainTile[][]): boolean {
        // Check if we have enough flat space for a village
        const minFlatArea = 4;
        let flatTiles = 0;
        
        for (let dx = -2; dx <= 2; dx++) {
            for (let dz = -2; dz <= 2; dz++) {
                const newX = x + dx;
                const newZ = z + dz;
                
                if (newX >= 0 && newX < terrain[0].length &&
                    newZ >= 0 && newZ < terrain.length) {
                    const tile = terrain[newZ][newX];
                    if (tile.type === TerrainType.PLAINS && tile.height > 3 && tile.height < 6) {
                        flatTiles++;
                    }
                }
            }
        }
        
        return flatTiles >= minFlatArea;
    }

    decorate(terrain: TerrainTile[][], terrainSize: number) {
        // Clear existing decorations
        this.decorations.forEach(mesh => mesh.dispose());
        this.decorations = [];

        // Add trees
        for (let z = 0; z < terrainSize; z++) {
            for (let x = 0; x < terrainSize; x++) {
                if (this.isGoodSpotForTree(x, z, terrain) && Math.random() < this.TREE_DENSITY) {
                    const position = new BABYLON.Vector3(
                        x - terrainSize/2,
                        terrain[z][x].height,
                        z - terrainSize/2
                    );
                    this.createTree(position);
                }
            }
        }

        // Add villages
        for (let z = 0; z < terrainSize; z += 5) {
            for (let x = 0; x < terrainSize; x += 5) {
                if (this.isGoodSpotForVillage(x, z, terrain) && Math.random() < this.HOUSE_DENSITY) {
                    const houseCount = this.MIN_HOUSES_PER_VILLAGE + 
                        Math.floor(Math.random() * (this.MAX_HOUSES_PER_VILLAGE - this.MIN_HOUSES_PER_VILLAGE));
                    
                    for (let i = 0; i < houseCount; i++) {
                        const offsetX = (Math.random() - 0.5) * 4;
                        const offsetZ = (Math.random() - 0.5) * 4;
                        const position = new BABYLON.Vector3(
                            (x + offsetX) - terrainSize/2,
                            terrain[z][x].height,
                            (z + offsetZ) - terrainSize/2
                        );
                        this.createHouse(position, Math.random() * Math.PI * 2);
                    }
                }
            }
        }
    }

    dispose() {
        this.decorations.forEach(mesh => mesh.dispose());
        this.decorations = [];
    }
}