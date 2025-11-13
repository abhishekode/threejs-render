import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export default function App() {
  const mountRef = useRef(null);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    if (!mountRef.current) return;

    // ✅ Remove any existing canvas (prevents double render under StrictMode)
    mountRef.current.querySelectorAll("canvas").forEach((c) => c.remove());

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.set(2, 1.5, 4);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    mountRef.current.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxDistance = 10;
    controls.minDistance = 1;

    // Loading manager
    const manager = new THREE.LoadingManager();
    manager.onProgress = (_, loaded, total) => {
      setLoadingProgress(Math.round((loaded / total) * 100));
    };
    manager.onLoad = () => {
      setLoadingProgress(100);
    };

    // ✅ Load HDR only once
    new RGBELoader(manager)
      .setPath("/hdr/")
      .load("background.hdr", (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = texture;
        scene.background = texture;

        // ✅ Load car model
        new GLTFLoader(manager)
          .setPath("/iron_howl/")
          .load(
            "scene.gltf",
            (gltf) => {
              const car = gltf.scene;
              car.scale.set(0.5, 0.5, 0.5);

              car.traverse((child: any) => {
                if (child.isMesh) {
                  child.castShadow = true;
                  child.receiveShadow = true;
                  child.material.envMapIntensity = 1.2;
                }
              });

              // ✅ Center and ground the car
              const box = new THREE.Box3().setFromObject(car);
              const center = box.getCenter(new THREE.Vector3());
              const minY = box.min.y;
              car.position.sub(center);
              car.position.y -= minY;

              scene.add(car);

              // ✅ Add a soft shadow plane
              const groundGeometry = new THREE.PlaneGeometry(100, 100);
              const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.35 });
              const ground = new THREE.Mesh(groundGeometry, groundMaterial);
              ground.rotation.x = -Math.PI / 2;
              ground.position.y = -0.01;
              ground.receiveShadow = true;
              scene.add(ground);

              // ✅ Add realistic sunlight
              const sun = new THREE.DirectionalLight(0xffffff, 1.2);
              sun.position.set(5, 10, 7);
              sun.castShadow = true;
              sun.shadow.mapSize.set(2048, 2048);
              sun.shadow.bias = -0.001;
              scene.add(sun);
            },
            undefined,
            (err) => console.error("❌ GLTF load error:", err)
          );
      });

    // Handle window resize
    const resize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", resize);

    // Pause rendering when tab not visible
    let isVisible = true;
    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Animation loop
    const animate = () => {
      if (isVisible) {
        controls.update();
        renderer.render(scene, camera);
      }
      requestAnimationFrame(animate);
    };
    animate();

    // Cleanup on unmount
    return () => {
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      if (mountRef.current?.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }

      renderer.dispose();
      controls.dispose();
      scene.traverse((obj: any) => {
        if (obj.isMesh) {
          obj.geometry?.dispose();
          if (obj.material.isMaterial) {
            obj.material.dispose();
          }
        }
      });
    };
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {loadingProgress < 100 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-80 text-white z-10">
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