import * as BABYLON from 'babylonjs';
import { WaveFunctionCollapse, TerrainType } from './WaveFunctionCollapse';

export class AppOne {
    engine: BABYLON.Engine;
    scene: BABYLON.Scene;

    constructor(readonly canvas: HTMLCanvasElement) {
        this.engine = new BABYLON.Engine(canvas);
        window.addEventListener('resize', () => {
            this.engine.resize();
        });
        this.scene = createScene(this.engine, this.canvas);
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
}

var createScene = function (engine: BABYLON.Engine, canvas: HTMLCanvasElement) {
    // Create scene
    var scene = new BABYLON.Scene(engine);
    
    // Create arc rotate camera for better terrain viewing
    var camera = new BABYLON.ArcRotateCamera("camera", 
        BABYLON.Tools.ToRadians(45), 
        BABYLON.Tools.ToRadians(45), 
        30, 
        BABYLON.Vector3.Zero(), 
        scene
    );
    camera.attachControl(canvas, true);
    
    // Add lights
    var light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.7;
    
    var dirLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(-1, -2, -1), scene);
    dirLight.position = new BABYLON.Vector3(20, 40, 20);
    dirLight.intensity = 0.5;

    // Generate terrain using WFC
    const wfc = new WaveFunctionCollapse();
    const terrainSize = 100; // Increased size for more interesting terrain
    const terrain = wfc.generateTerrain(terrainSize, terrainSize);

    // Create ground tiles
    const groundMeshes: BABYLON.Mesh[] = [];
    
    terrain.forEach((row, z) => {
        row.forEach((tile, x) => {
            // Create box instead of ground for height visualization
            const box = BABYLON.MeshBuilder.CreateBox(
                `tile_${x}_${z}`,
                { 
                    height: Math.max(0.1, tile.height), 
                    width: 1, 
                    depth: 1 
                },
                scene
            );
            
            // Position the box
            box.position.x = x - terrainSize/2;
            box.position.z = z - terrainSize/2;
            box.position.y = tile.height/2; // Center the box vertically
            
            // Create and apply material
            const material = new BABYLON.StandardMaterial(`material_${x}_${z}`, scene);
            const color = wfc.getTerrainTypeColor(tile.type);
            material.diffuseColor = new BABYLON.Color3(color.r, color.g, color.b);
            
            // Add some ambient occlusion and specular highlights
            material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
            material.ambientColor = new BABYLON.Color3(0.1, 0.1, 0.1);
            
            box.material = material;
            groundMeshes.push(box);
        });
    });

    // Add post-processing for better visuals
    const pipeline = new BABYLON.DefaultRenderingPipeline(
        "defaultPipeline", 
        true, 
        scene, 
        [camera]
    );
    
    if (pipeline.isSupported) {
        pipeline.imageProcessing.contrast = 1.1;
        pipeline.imageProcessing.exposure = 1.2;
        pipeline.bloomEnabled = true;
        pipeline.bloomThreshold = 0.8;
        pipeline.bloomWeight = 0.3;
    }

    return scene;
};