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
            depth: true,
            antialias: true
        });
        
        window.addEventListener('resize', () => {
            this.engine.resize();
        });
        
        this.scene = this.createScene();
    }

    private createScene(): BABYLON.Scene {
        const scene = new BABYLON.Scene(this.engine);
        
        // Scene settings
        scene.clearColor = new BABYLON.Color4(0.5, 0.7, 1.0, 1.0);
        scene.ambientColor = new BABYLON.Color3(1, 1, 1);
        
        // Create camera
        const camera = new BABYLON.ArcRotateCamera(
            "camera",
            BABYLON.Tools.ToRadians(45),
            BABYLON.Tools.ToRadians(45),
            150,
            BABYLON.Vector3.Zero(),
            scene
        );

        // Camera settings
        camera.lowerRadiusLimit = 10;
        camera.upperRadiusLimit = 500;
        camera.minZ = 1;
        camera.maxZ = 2000;
        camera.wheelPrecision = 1;
        camera.pinchPrecision = 1;
        camera.attachControl(this.canvas, true);

        // Lights
        const light = new BABYLON.HemisphericLight(
            "light", 
            new BABYLON.Vector3(0, 1, 0), 
            scene
        );
        light.intensity = 1;
        light.groundColor = new BABYLON.Color3(0.2, 0.2, 0.3);
        light.specular = new BABYLON.Color3(0, 0, 0);

        const dirLight = new BABYLON.DirectionalLight(
            "dirLight", 
            new BABYLON.Vector3(-1, -2, -1), 
            scene
        );
        dirLight.position = new BABYLON.Vector3(100, 100, 100);
        dirLight.intensity = 0.8;

        // Create terrain
        const wfc = new WaveFunctionCollapse();
        this.terrainRenderer = new TerrainRenderer(scene, wfc, 1000);
        this.terrainRenderer.render();

        // Scene optimization
        scene.skipPointerMovePicking = true;
        scene.autoClear = true;
        scene.autoClearDepthAndStencil = true;



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