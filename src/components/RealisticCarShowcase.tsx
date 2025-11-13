import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export default function GroundedCarShowcase() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    if (!mountRef.current) return;
    mountRef.current.querySelectorAll("canvas").forEach((c) => c.remove());

    /** ---------- Scene Setup ---------- **/
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa0a0a0);
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

    /** ---------- Lights ---------- **/
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8d8d8d, 2.5);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 10;
    dirLight.shadow.camera.bottom = -10;
    dirLight.shadow.camera.left = -10;
    dirLight.shadow.camera.right = 10;
    dirLight.shadow.mapSize.set(2048, 2048);
    scene.add(dirLight);

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

    /** ---------- Controls ---------- **/
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 2;
    controls.maxDistance = 20;
    controls.maxPolarAngle = Math.PI / 2; // Prevent camera from going below ground
    controls.target.set(0, 0.5, 0);
    controls.update();

    /** ---------- Loading Manager ---------- **/
    const manager = new THREE.LoadingManager();
    manager.onProgress = (_, loaded, total) =>
      setLoadingProgress(Math.round((loaded / total) * 100));
    manager.onLoad = () => setLoadingProgress(100);

    /** ---------- Environment Setup ---------- **/
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    new RGBELoader(manager).load("/hdr/background.hdr", (texture) => {
      const envMap = pmremGenerator.fromEquirectangular(texture).texture;
      scene.environment = envMap;

      // Create background sphere (for realistic horizon)
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

            // Compute bounding box to align car on ground
            const box = new THREE.Box3().setFromObject(car);
            const size = new THREE.Vector3();
            const center = new THREE.Vector3();
            box.getSize(size);
            box.getCenter(center);

            // Center and align with ground
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
          (error) => console.error("❌ Error loading GLTF:", error)
        );
    });

    /** ---------- Resize ---------- **/
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    /** ---------- Animation Loop ---------- **/
    renderer.setAnimationLoop(() => {
      controls.update();
      renderer.render(scene, camera);
    });

    /** ---------- Cleanup ---------- **/
    return () => {
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      pmremGenerator.dispose();
    };
  }, []);

  /** ---------- UI ---------- **/
  return (
    <div className="relative w-full h-screen overflow-hidden">
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
      <div ref={mountRef} className="absolute inset-0" />
    </div>
  );
}
