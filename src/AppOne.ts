import * as BABYLON from '@babylonjs/core';
import "@babylonjs/loaders";
import { WaveCollapseGenerator } from './modules/wfc-generator'

export class AppOne {
    private engine: BABYLON.Engine;
    private scene: BABYLON.Scene;
    private camera!: BABYLON.ArcRotateCamera;
    private generator: WaveCollapseGenerator;

    constructor(readonly canvas: HTMLCanvasElement) {
        // Create engine and scene
        this.engine = new BABYLON.Engine(canvas, true);
        this.scene = new BABYLON.Scene(this.engine);
        
        // Setup scene
        this.scene.clearColor = new BABYLON.Color4(0.6, 0.8, 1.0, 1.0);
        this.setupCamera();
        this.setupLights();

        // Create generator
        this.generator = new WaveCollapseGenerator(this.scene, 20, 2);

        // Handle window resize
        window.addEventListener('resize', () => {
            this.engine.resize();
        });

        // Start generation
        this.generate();
    }

    private setupCamera(): void {
        this.camera = new BABYLON.ArcRotateCamera(
            "camera",
            0,
            Math.PI / 3,
            40,
            BABYLON.Vector3.Zero(),
            this.scene
        );
        this.camera.attachControl(this.canvas, true);
        this.camera.lowerRadiusLimit = 10;
        this.camera.upperRadiusLimit = 100;
        this.camera.wheelDeltaPercentage = 0.01;
    }

    private setupLights(): void {
        // Hemispheric light for ambient lighting
        const hemiLight = new BABYLON.HemisphericLight(
            "hemiLight",
            new BABYLON.Vector3(0, 1, 0),
            this.scene
        );
        hemiLight.intensity = 0.7;

        // Directional light for shadows
        const dirLight = new BABYLON.DirectionalLight(
            "dirLight",
            new BABYLON.Vector3(-1, -2, -1),
            this.scene
        );
        dirLight.position = new BABYLON.Vector3(20, 40, 20);
        dirLight.intensity = 0.7;

        // Shadow generator
        const shadowGenerator = new BABYLON.ShadowGenerator(1024, dirLight);
        shadowGenerator.useExponentialShadowMap = true;
    }

    private async generate(): Promise<void> {
        try {
            await this.generator.generate();
        } catch (error) {
            console.error("Generation failed:", error);
        }
    }

    public async regenerate(): Promise<void> {
        this.generator.dispose();
        this.generator = new WaveCollapseGenerator(this.scene, 20, 2);
        await this.generate();
    }

    public run(): void {
        this.engine.runRenderLoop(() => {
            this.scene.render();
        });
    }

    public dispose(): void {
        this.generator.dispose();
        this.engine.dispose();
    }
}