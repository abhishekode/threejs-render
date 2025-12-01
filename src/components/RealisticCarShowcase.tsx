import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import Stats from "three/examples/jsm/libs/stats.module.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";


export default function McLarenViewer() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bodyColorRef = useRef<HTMLInputElement | null>(null);
  const detailsColorRef = useRef<HTMLInputElement | null>(null);
  const glassColorRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let camera: THREE.PerspectiveCamera;
    let renderer: THREE.WebGLRenderer;
    let scene: THREE.Scene;
    let controls: OrbitControls;
    let stats: Stats;
    let grid: THREE.GridHelper;

    const wheels: THREE.Object3D[] = [];

    function init() {
      const container = containerRef.current!;

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setAnimationLoop(animate);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.85;
      container.appendChild(renderer.domElement);

      stats = new Stats();
      stats.dom.style.position = "absolute";
      stats.dom.style.top = "0px";
      // container.appendChild(stats.dom);

      camera = new THREE.PerspectiveCamera(
        40,
        window.innerWidth / window.innerHeight,
        0.1,
        100
      );
      camera.position.set(4.25, 1.4, -4.5);

      controls = new OrbitControls(camera, renderer.domElement);
      controls.maxDistance = 9;
      controls.maxPolarAngle = THREE.MathUtils.degToRad(90);
      controls.target.set(0, 0.5, 0);
      controls.update();

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x2a2a2a);

      const hdrLoader = new HDRLoader();

      hdrLoader.load("/hdr/background.hdr", (hdr) => {
        hdr.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = hdr;
      });

      scene.fog = new THREE.Fog(0xffffff, 10, 15);

      grid = new THREE.GridHelper(20, 40, 0xffffff, 0xffffff);
      grid.material.opacity = 0.2;
      grid.material.depthWrite = false;
      grid.material.transparent = true;
      scene.add(grid);

      // Materials
      const bodyMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xff6600,
        metalness: 0.8,
        roughness: 0.2,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
      });

      const detailsMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 1.0,
        roughness: 0.5,
      });

      const glassMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.25,
        roughness: 0,
        transmission: 1.0,
      });

      // UI color pickers
      bodyColorRef.current!.oninput = (e) =>
        bodyMaterial.color.set((e.target as HTMLInputElement).value);

      detailsColorRef.current!.oninput = (e) =>
        detailsMaterial.color.set((e.target as HTMLInputElement).value);

      glassColorRef.current!.oninput = (e) =>
        glassMaterial.color.set((e.target as HTMLInputElement).value);

      // GLTF Loader
      const loader = new GLTFLoader();

      loader.load(
        "/lexus/scene.gltf",
        (gltf) => {
          const car = gltf.scene;
          car.scale.set(0.01, 0.01, 0.01);

          const box = new THREE.Box3().setFromObject(car);
          const size = new THREE.Vector3();
          const center = new THREE.Vector3();
          box.getSize(size);
          box.getCenter(center);
          car.position.sub(center);
          car.position.y += size.y / 2;

          car.traverse((child: THREE.Object3D) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              child.material.envMapIntensity = 1.5;

              const name = child.material.name.toLowerCase();
              const materialName = child.material.name.toLowerCase();

              console.log('material name:', materialName);

              console.log('name', name)

              // Body paint
              if (
                name.includes("body") ||
                name.includes("carpaint") ||
                materialName.includes("material3")) {
                child.material = bodyMaterial;
              }

              // Details: rims, trims, metal parts
              else if (
                name.includes("rim") ||
                name.includes("wheel") ||
                name.includes("detail") ||
                name.includes("metal") ||
                name.includes("trim") ||
                name.includes("brake") ||
                name.includes("tire") ||
                name.includes("exhaust") ||
                name.includes("antenna")

              ) {
                child.material = detailsMaterial;
              }

              // Windows / glass
              else if (
                name.includes("glass") ||
                name.includes("window") ||
                name.includes("windshield")
              ) {
                child.material = glassMaterial;
              }
            }
          });

          scene.add(car);
        },

        // onProgress (optional)
        undefined,

        // onError — MUST BE a function!
        (err) => {
          console.error("❌ GLTF load failed:", err);
        }
      );


      window.addEventListener("resize", onWindowResize);
    }

    function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function animate() {
      controls.update();

      const time = -performance.now() / 1000;

      wheels.forEach((wh) => {
        wh.rotation.x = time * Math.PI * 2;
      });

      // grid.position.z = -(time % 1);

      renderer.render(scene, camera);
      stats.update();
    }

    init();
    return () => window.removeEventListener("resize", onWindowResize);
  }, []);

  return (
    <div className="w-full h-screen bg-gray-900 relative">
      {/* Controls Panel */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 
                      flex flex-wrap items-center justify-center gap-4 p-4
                      bg-gray-800/80 backdrop-blur-sm rounded-lg shadow-lg
                      border border-gray-700">

        <label className="flex items-center gap-2 text-gray-100 text-sm font-medium">
          <span className="text-gray-300">Body:</span>
          <input
            type="color"
            ref={bodyColorRef}
            defaultValue="#ff6600"
            className="w-10 h-10 rounded border border-gray-600 cursor-pointer bg-transparent"
          />
        </label>

        <label className="flex items-center gap-2 text-gray-100 text-sm font-medium">
          <span className="text-gray-300">Details:</span>
          <input
            type="color"
            defaultValue="#ffffff"
            ref={detailsColorRef}
            className="w-10 h-10 rounded border border-gray-600 cursor-pointer bg-transparent"
          />
        </label>

        <label className="flex items-center gap-2 text-gray-100 text-sm font-medium">
          <span className="text-gray-300">Glass:</span>
          <input
            type="color"
            defaultValue="#ffffff"
            ref={glassColorRef}
            className="w-10 h-10 rounded border border-gray-600 cursor-pointer bg-transparent"
          />
        </label>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10
                      px-4 py-2 bg-gray-800/80 backdrop-blur-sm rounded-lg
                      border border-gray-700 text-gray-300 text-sm">
        <p>🖱️ Left click + drag to rotate • Right click + drag to pan • Scroll to zoom</p>
      </div>

      {/* 3D Viewer Container */}
      <div ref={containerRef} className="w-full h-full" />
    </div>

  );
}
