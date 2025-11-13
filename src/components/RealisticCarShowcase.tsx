import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type LightingPreset = "Morning" | "Afternoon" | "Sunset" | "Night";

export default function GroundedCarShowcase() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [lighting, setLighting] = useState<LightingPreset>("Afternoon");

  useEffect(() => {
    if (!mountRef.current) return;
    mountRef.current.querySelectorAll("canvas").forEach((c) => c.remove());

    /** ---------- Scene Setup ---------- **/
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xbfd1e5);
    scene.fog = new THREE.Fog(0xa0a0a0, 10, 100);

    /** ---------- Camera ---------- **/
    const camera = new THREE.PerspectiveCamera(
      35,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    camera.position.set(-5, 2, 6);
    scene.add(camera);

    /** ---------- Renderer ---------- **/
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mountRef.current.appendChild(renderer.domElement);

    /** ---------- Ground ---------- **/
    const groundGeo = new THREE.PlaneGeometry(2000, 2000);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xdddddd,
      metalness: 0.2,
      roughness: 0.8,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    scene.add(ground);

    /** ---------- Hemisphere Ambient ---------- **/
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8d8d8d, 1.5);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    /** ---------- Sunlight (Directional Light) ---------- **/
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.5);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(4096, 4096);
    sunLight.shadow.camera.top = 20;
    sunLight.shadow.camera.bottom = -20;
    sunLight.shadow.camera.left = -20;
    sunLight.shadow.camera.right = 20;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    // Optional: Visible sun sphere
    const sunSphere = new THREE.Mesh();
    sunSphere.position.copy(sunLight.position);
    scene.add(sunSphere);

    /** ---------- Controls ---------- **/
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 2;
    controls.maxDistance = 20;
    controls.maxPolarAngle = Math.PI / 2;
    controls.target.set(0, 0.5, 0);
    controls.update();

    /** ---------- Loading Manager ---------- **/
    const manager = new THREE.LoadingManager();
    manager.onProgress = (_, loaded, total) =>
      setLoadingProgress(Math.round((loaded / total) * 100));
    manager.onLoad = () => setLoadingProgress(100);

    /** ---------- Environment Map ---------- **/
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    new RGBELoader(manager).load("/hdr/background.hdr", (texture) => {
      const envMap = pmremGenerator.fromEquirectangular(texture).texture;
      scene.environment = envMap;

      // HDR background sphere
      const bgGeo = new THREE.SphereGeometry(500, 64, 64);
      const bgMat = new THREE.MeshBasicMaterial({
        map: envMap,
        side: THREE.BackSide,
      });
      const bgMesh = new THREE.Mesh(bgGeo, bgMat);
      bgMesh.rotation.x = 0.15;
      scene.add(bgMesh);

      texture.dispose();
      pmremGenerator.dispose();

      /** ---------- Load Car ---------- **/
      new GLTFLoader(manager)
        .setPath("/mclaren/")
        .load(
          "scene.gltf",
          (gltf) => {
            const car = gltf.scene;
            car.scale.set(0.005, 0.005, 0.005);

            const box = new THREE.Box3().setFromObject(car);
            const size = new THREE.Vector3();
            const center = new THREE.Vector3();
            box.getSize(size);
            box.getCenter(center);
            car.position.sub(center);
            car.position.y += size.y / 2;

            car.traverse((child) => {
              if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                if (child.material) child.material.envMapIntensity = 1.5;
              }
            });
            scene.add(car);
          },
          undefined,
          (error) => console.error("❌ GLTF Load Error:", error)
        );
    });

    /** ---------- Lighting Presets (Sun Simulation) ---------- **/
    const updateLighting = (preset: LightingPreset) => {
      const sunPos = new THREE.Vector3();

      switch (preset) {
        case "Morning":
          sunLight.color.set(0xfff2cc);
          sunLight.intensity = 2;
          hemiLight.intensity = 1.2;
          sunPos.set(-5, 5, 3);
          scene.background = new THREE.Color(0xe6e9f0);
          break;

        case "Afternoon":
          sunLight.color.set(0xffffff);
          sunLight.intensity = 2.5;
          hemiLight.intensity = 1.5;
          sunPos.set(5, 10, 5);
          scene.background = new THREE.Color(0xbfd1e5);
          break;

        case "Sunset":
          sunLight.color.set(0xff9966);
          sunLight.intensity = 2.2;
          hemiLight.intensity = 1.0;
          sunPos.set(-3, 4, -4);
          scene.background = new THREE.Color(0xffcc99);
          break;

        case "Night":
          sunLight.color.set(0x99ccff);
          sunLight.intensity = 0.5;
          hemiLight.intensity = 0.3;
          sunPos.set(0, 2, -5);
          scene.background = new THREE.Color(0x0a0a1a);
          break;
      }

      // Smoothly move sunlight + sun sphere
      sunLight.position.lerp(sunPos, 0.1);
      sunLight.target.position.set(0, 0, 0);
      sunLight.target.updateMatrixWorld();
      sunSphere.position.copy(sunLight.position);
    };

    updateLighting(lighting);

    /** ---------- Animation Loop ---------- **/
    renderer.setAnimationLoop(() => {
      controls.update();
      updateLighting(lighting); // reactively adjust sunlight
      renderer.render(scene, camera);
    });

    /** ---------- Resize ---------- **/
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    /** ---------- Cleanup ---------- **/
    return () => {
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
    };
  }, [lighting]);

  /** ---------- UI ---------- **/
  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Loader */}
      {loadingProgress < 100 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-80 text-white z-10 transition-all duration-300">
          <div className="text-lg mb-2">Loading... {loadingProgress}%</div>
          <div className="w-48 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-400 transition-all duration-300"
              style={{ width: `${loadingProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Dropdown */}
      <div className="absolute top-4 left-4 z-20 bg-white/80 rounded-lg p-2 shadow-md backdrop-blur-sm">
        <label className="text-sm font-medium mr-2">Lighting:</label>
        <select
          value={lighting}
          onChange={(e) => setLighting(e.target.value as LightingPreset)}
          className="p-1 rounded border border-gray-300 bg-white text-sm"
        >
          <option>Morning</option>
          <option>Afternoon</option>
          <option>Sunset</option>
          <option>Night</option>
        </select>
      </div>

      <div ref={mountRef} className="absolute inset-0" />
    </div>
  );
}
