import * as BABYLON from 'babylonjs';
import { WorldGenerator, WorldGenerationOptions, BiomeType } from './modules/world-generator/world-generator';

/**
 * Main application class for the 3D world renderer
 */
export class AppOne {
    private engine: BABYLON.Engine;
    private scene: BABYLON.Scene;
    private camera!: BABYLON.ArcRotateCamera;
    private terrain: BABYLON.Mesh | null = null;
    private worldGenerator: WorldGenerator;
    private readonly worldOptions: WorldGenerationOptions = {
        width: 100,
        depth: 100,
        maxHeight: 30,
        minHeight: -10,
        noiseScale: 25,
        octaves: 4,
        persistence: 0.6,
        seed: Math.random() * 1000000
    };

    constructor(readonly canvas: HTMLCanvasElement) {
        this.engine = new BABYLON.Engine(canvas, true, {
            preserveDrawingBuffer: true,
            stencil: true,
            depth: true,
            antialias: true
        });

        this.worldGenerator = new WorldGenerator(this.worldOptions);

        window.addEventListener('resize', () => {
            this.engine.resize();
        });

        this.scene = new BABYLON.Scene(this.engine);
        
        // Clear sky color
        this.scene.clearColor = new BABYLON.Color4(0.6, 0.8, 1.0, 1.0);
        this.scene.ambientColor = new BABYLON.Color3(0.8, 0.8, 0.8);
        
        this.setupCamera();
        this.generateTerrain();
        this.setupPostProcessing();
    }

    private setupCamera(): void {
        this.camera = new BABYLON.ArcRotateCamera(
            "mainCamera",
            BABYLON.Tools.ToRadians(45),
            BABYLON.Tools.ToRadians(60),
            150,
            new BABYLON.Vector3(0, 0, 0),
            this.scene
        );

        this.camera.lowerRadiusLimit = 50;
        this.camera.upperRadiusLimit = 500;
        this.camera.lowerBetaLimit = 0.1;
        this.camera.upperBetaLimit = Math.PI / 2.1;
        this.camera.minZ = 1;
        this.camera.maxZ = 1000;
        
        this.camera.wheelPrecision = 0.2;
        this.camera.pinchPrecision = 8;
        this.camera.panningSensibility = 50;
        this.camera.attachControl(this.canvas, true);

        this.camera.inertia = 0.5;
        this.camera.angularSensibilityX = 250;
        this.camera.angularSensibilityY = 250;

        this.camera.useFramingBehavior = true;
    }

    private generateTerrain(): void {
        try {
            console.log('Starting terrain generation...');

            if (this.terrain) {
                this.terrain.dispose();
            }

            this.worldGenerator.generate();
            this.terrain = this.worldGenerator.createMesh(this.scene);

            // Setup lighting
            const hemisphericLight = new BABYLON.HemisphericLight(
                "hemisphericLight",
                new BABYLON.Vector3(0, 1, 0),
                this.scene
            );
            hemisphericLight.intensity = 0.7;
            hemisphericLight.groundColor = new BABYLON.Color3(0.2, 0.2, 0.3);
            hemisphericLight.specular = BABYLON.Color3.Black();

            const directionalLight = new BABYLON.DirectionalLight(
                "dirLight",
                new BABYLON.Vector3(-1, -2, -1),
                this.scene
            );
            directionalLight.position = new BABYLON.Vector3(50, 50, 50);
            directionalLight.intensity = 0.8;

            // Subtle fog
            this.scene.fogMode = BABYLON.Scene.FOGMODE_EXP;
            this.scene.fogDensity = 0.001;
            this.scene.fogColor = new BABYLON.Color3(0.8, 0.9, 1.0);

            this.setupShadows();

            console.log('Terrain generation complete');
        } catch (error) {
            console.error("Error generating terrain:", error);
        }
    }

    private setupShadows(): void {
        if (!this.terrain) return;

        const light = this.scene.getLightByName("dirLight") as BABYLON.DirectionalLight;
        if (light) {
            const shadowGenerator = new BABYLON.ShadowGenerator(1024, light);
            shadowGenerator.useBlurExponentialShadowMap = true;
            shadowGenerator.blurKernel = 16;
            shadowGenerator.addShadowCaster(this.terrain);
            this.terrain.receiveShadows = true;
        }
    }

    private setupPostProcessing(): void {
        const ssao = new BABYLON.SSAORenderingPipeline('ssao', this.scene, {
            ssaoRatio: 0.5,
            combineRatio: 0.8
        });
        this.scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline('ssao', this.camera);

        const pipeline = new BABYLON.DefaultRenderingPipeline(
            "defaultPipeline",
            true,
            this.scene,
            [this.camera]
        );

        if (pipeline.imageProcessing) {
            pipeline.imageProcessing.contrast = 1.1;
            pipeline.imageProcessing.exposure = 1.0;
        }

        if (pipeline.bloom) {
            pipeline.bloomEnabled = true;
            pipeline.bloomThreshold = 0.7;
            pipeline.bloomWeight = 0.25;
        }

        if (pipeline.sharpen) {
            pipeline.sharpenEnabled = true;
            pipeline.sharpen.edgeAmount = 0.2;
        }
    }

    public regenerateTerrain(): void {
        this.worldOptions.seed = Math.random() * 1000000;
        this.worldGenerator = new WorldGenerator(this.worldOptions);
        this.generateTerrain();
    }

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

    run(): void {
        this.engine.runRenderLoop(() => {
            this.scene.render();
        });
    }

    dispose(): void {
        if (this.terrain) {
            this.terrain.dispose();
        }
        this.scene.dispose();
        this.engine.dispose();
    }
}