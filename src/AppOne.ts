import * as BABYLON from 'babylonjs';

/**
 * Main application class for the 3D world renderer
 */
export class AppOne {
    private engine: BABYLON.Engine;
    private scene: BABYLON.Scene;
    private camera!: BABYLON.ArcRotateCamera;
    private terrain: BABYLON.Mesh | null = null;

    /**
     * Initializes the application
     * @param canvas The canvas element for rendering
     */
    constructor(readonly canvas: HTMLCanvasElement) {
        // Initialize Babylon.js engine
        this.engine = new BABYLON.Engine(canvas, true, {
            preserveDrawingBuffer: true,
            stencil: true,
            depth: true,
            antialias: true
        });

        // Handle window resizing
        window.addEventListener('resize', () => {
            this.engine.resize();
        });

        // Create scene and initialize core components
        this.scene = new BABYLON.Scene(this.engine);
        
        // Scene settings
        this.scene.clearColor = new BABYLON.Color4(0.5, 0.7, 1.0, 1.0);
        this.scene.ambientColor = new BABYLON.Color3(1, 1, 1);
        
        // Initialize camera
        this.setupCamera();
        
        // Setup lights
        this.setupLights();
        
        // Generate initial terrain
        this.generateTerrain();
    }

    /**
     * Sets up the camera
     */
    private setupCamera(): void {
        this.camera = new BABYLON.ArcRotateCamera(
            "mainCamera",
            BABYLON.Tools.ToRadians(45),
            BABYLON.Tools.ToRadians(45),
            500,
            BABYLON.Vector3.Zero(),
            this.scene
        );

        // Camera settings
        this.camera.lowerRadiusLimit = 100;
        this.camera.upperRadiusLimit = 1000;
        this.camera.lowerBetaLimit = 0.1;
        this.camera.upperBetaLimit = Math.PI / 2.1;
        this.camera.minZ = 1;
        this.camera.maxZ = 2000;
        this.camera.wheelPrecision = 1;
        this.camera.pinchPrecision = 1;
        this.camera.panningSensibility = 50;
        this.camera.attachControl(this.canvas, true);

        // Smooth camera movements
        this.camera.inertia = 0.7;
        this.camera.angularSensibilityX = 500;
        this.camera.angularSensibilityY = 500;
    }

    /**
     * Sets up scene lighting
     */
    private setupLights(): void {
        const light = new BABYLON.HemisphericLight(
            "light",
            new BABYLON.Vector3(0, 1, 0),
            this.scene
        );
        light.intensity = 1;

        const dirLight = new BABYLON.DirectionalLight(
            "dirLight",
            new BABYLON.Vector3(-1, -2, -1),
            this.scene
        );
        dirLight.position = new BABYLON.Vector3(100, 100, 100);
        dirLight.intensity = 0.8;
    }

    /**
     * Generates terrain
     */
    private generateTerrain(): void {
        try {
            // Clean up existing terrain
            if (this.terrain) {
                this.terrain.dispose();
            }

            // Create simple ground mesh for testing
            this.terrain = BABYLON.MeshBuilder.CreateGround(
                "terrain",
                { 
                    width: 100,
                    height: 100,
                    subdivisions: 50 
                },
                this.scene
            );

            // Add material
            const material = new BABYLON.StandardMaterial("terrainMaterial", this.scene);
            material.wireframe = true;
            this.terrain.material = material;

        } catch (error) {
            console.error("Error generating terrain:", error);
        }
    }

    /**
     * Toggles the debug layer
     */
    debug(debugOn: boolean = true): void {
        if (debugOn) {
            this.scene.debugLayer.show({
                embedMode: true,
                overlay: true
            });
        } else {
            this.scene.debugLayer.hide();
        }
    }

    /**
     * Starts the application
     */
    run(): void {
        // Start render loop
        this.engine.runRenderLoop(() => {
            this.scene.render();
        });
    }

    /**
     * Cleans up resources
     */
    dispose(): void {
        if (this.terrain) {
            this.terrain.dispose();
        }
        this.scene.dispose();
        this.engine.dispose();
    }
}