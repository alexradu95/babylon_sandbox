import * as BABYLON from '@babylonjs/core';
import "@babylonjs/loaders";

export class AssetManager {
    private loadedContainers: Map<string, BABYLON.AssetContainer> = new Map();
    private scene: BABYLON.Scene;

    constructor(scene: BABYLON.Scene) {
        this.scene = scene;
    }

    public async loadModel(name: string, rootUrl: string, filename: string): Promise<BABYLON.AssetContainer | undefined> {
        try {
            if (this.loadedContainers.has(name)) {
                return this.loadedContainers.get(name);
            }

            console.log(`Loading model: ${name} from ${rootUrl}${filename}`);
            
            const container = await BABYLON.SceneLoader.LoadAssetContainerAsync(
                rootUrl,
                filename,
                this.scene
            );

            // Store the container for future use
            this.loadedContainers.set(name, container);

            return container;
        } catch (error) {
            console.error(`Failed to load model ${name}:`, error);
            return undefined;
        }
    }

    public async createInstance(name: string, instanceName: string): Promise<BABYLON.Mesh | undefined> {
        const container = this.loadedContainers.get(name);
        if (!container) {
            console.warn(`No container found for ${name}`);
            return undefined;
        }

        // Create an instance of all meshes in the container
        const rootMesh = new BABYLON.Mesh(instanceName, this.scene);
        container.meshes.forEach((mesh) => {
            if (mesh !== container.meshes[0]) {  // Skip the root mesh
                const instance = mesh.createInstance(instanceName + "_part");
                instance.parent = rootMesh;
            }
        });

        return rootMesh;
    }

    public dispose(): void {
        for (const container of this.loadedContainers.values()) {
            container.dispose();
        }
        this.loadedContainers.clear();
    }
}