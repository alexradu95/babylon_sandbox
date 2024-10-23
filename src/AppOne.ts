import * as BABYLON from 'babylonjs';
import { WaveFunctionCollapse } from './WaveFunctionCollapse';
import { TerrainRenderer } from './TerrainRenderer';

export class AppOne {
    engine: BABYLON.Engine;
    scene: BABYLON.Scene;
    private terrainRenderer?: TerrainRenderer;

    constructor(readonly canvas: HTMLCanvasElement) {
        this.engine = new BABYLON.Engine(canvas, true, { 
            preserveDrawingBuffer: true, 
            stencil: true,
            limitDeviceRatio: 1.0
        });
        
        window.addEventListener('resize', () => {
            this.engine.resize();
        });
        
        this.scene = this.createScene();
    }

    private createScene(): BABYLON.Scene {
        const scene = new BABYLON.Scene(this.engine);
        
        // Basic scene setup
        scene.clearColor = new BABYLON.Color4(0.5, 0.7, 1.0, 1.0);
        
        // Create camera with balanced settings
        const camera = new BABYLON.ArcRotateCamera(
            "camera",
            BABYLON.Tools.ToRadians(45),
            BABYLON.Tools.ToRadians(45),
            150,
            BABYLON.Vector3.Zero(),
            scene
        );

        // Adjust camera settings
        camera.lowerRadiusLimit = 10;
        camera.upperRadiusLimit = 500;
        camera.minZ = 1;
        camera.maxZ = 2000;
        
        // Restore default camera controls with slight adjustments
        camera.wheelPrecision = 1;
        camera.pinchPrecision = 1;
        camera.panningSensibility = 1000;
        camera.angularSensibilityX = 1000;
        camera.angularSensibilityY = 1000;
        
        // Enable camera inertia
        camera.inertia = 0.9;
        camera.panningInertia = 0.9;
        camera.useBouncingBehavior = true;

        camera.attachControl(this.canvas, true);

        // Add lights
        const light = new BABYLON.HemisphericLight(
            "light", 
            new BABYLON.Vector3(0, 1, 0), 
            scene
        );
        light.intensity = 0.7;
        light.groundColor = new BABYLON.Color3(0.2, 0.2, 0.2);

        const dirLight = new BABYLON.DirectionalLight(
            "dirLight", 
            new BABYLON.Vector3(-1, -2, -1), 
            scene
        );
        dirLight.position = new BABYLON.Vector3(100, 100, 100);
        dirLight.intensity = 0.5;

        // Create and render terrain
        const wfc = new WaveFunctionCollapse();
        this.terrainRenderer = new TerrainRenderer(scene, wfc, 100);
        this.terrainRenderer.render();

        // Scene optimizations
        scene.skipPointerMovePicking = true;
        scene.autoClear = true;  // Restored
        scene.autoClearDepthAndStencil = true;  // Restored

        // Add subtle fog
        scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
        scene.fogColor = new BABYLON.Color3(0.5, 0.7, 1.0);
        scene.fogDensity = 0.0005;

        return scene;
    }

    debug(debugOn: boolean = true) {
        if (debugOn) {
            this.scene.debugLayer.show({ overlay: true });
        } else {
            this.scene.debugLayer.hide();
        }
    }

    run() {
        this.debug(true);
        this.engine.runRenderLoop(() => {
            this.scene.render();
        });
    }

    dispose() {
        this.terrainRenderer?.dispose();
        this.scene.dispose();
        this.engine.dispose();
    }
}