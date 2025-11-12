import React, { useRef, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Sun, Droplet, RotateCcw, Camera, Loader2, Zap } from "lucide-react";

type EnvPreset = "studio" | "sunset" | "night" | "city";

interface ControlsState {
  isDragging: boolean;
  previousMouse: { x: number; y: number };
  rotation: { x: number; y: number };
  targetRotation: { x: number; y: number };
  distance: number;
  targetDistance: number;
}

export default function RealisticCarShowcase() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const carRef = useRef<THREE.Group | null>(null);
  const requestRef = useRef<number | null>(null);

  const controlsRef = useRef<ControlsState>({
    isDragging: false,
    previousMouse: { x: 0, y: 0 },
    rotation: { x: 0.2, y: 0 },
    targetRotation: { x: 0.2, y: 0 },
    distance: 8,
    targetDistance: 8,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [hdrIntensity, setHdrIntensity] = useState(1.5);
  const [wetness, setWetness] = useState(0.3);
  const [envPreset, setEnvPreset] = useState<EnvPreset>("studio");
  const [autoRotate, setAutoRotate] = useState(true);

  const setupLighting = useCallback((scene: THREE.Scene, preset: EnvPreset, intensity = 1.5) => {
    scene.children = scene.children.filter((c) => !(c as any).isLight); // remove lights

    const add = (light: THREE.Light) => scene.add(light);

    switch (preset) {
      case "studio":
        add(new THREE.DirectionalLight(0xffffff, 2 * intensity));
        add(new THREE.AmbientLight(0x404040, 0.8 * intensity));
        add(new THREE.HemisphereLight(0x8899bb, 0x334455, 0.5 * intensity));
        break;

      case "sunset":
        add(new THREE.DirectionalLight(0xff6b35, 3 * intensity));
        add(new THREE.AmbientLight(0x332211, 0.5 * intensity));
        break;

      case "night":
        add(new THREE.DirectionalLight(0x6699ff, 1 * intensity));
        add(new THREE.AmbientLight(0x111133, 0.3 * intensity));
        break;

      case "city":
        add(new THREE.DirectionalLight(0xffffff, 2 * intensity));
        add(new THREE.AmbientLight(0x555555, 0.7 * intensity));
        break;
    }
  }, []);

  // Initialize scene
  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      45,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(5, 2, 8);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    setupLighting(scene, envPreset, hdrIntensity);

    // Ground
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(20, 64),
      new THREE.MeshStandardMaterial({
        color: 0x111111,
        metalness: 0.8,
        roughness: 0.3,
      })
    );

    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Load car
    const loader = new GLTFLoader();
    loader.load(
      "/iron_howl/scene.gltf",
      (gltf) => {
        const car = gltf.scene;
        car.scale.set(0.8, 0.8, 0.8);

        // compute bounding box including all children
        const box = new THREE.Box3().setFromObject(car);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);

        // move model so it sits on ground (Y=0)
        const yOffset = box.min.y < 0 ? -box.min.y : -center.y + size.y / 2;
        car.position.y += yOffset;

        // center horizontally if needed
        car.position.x -= center.x;
        car.position.z -= center.z;

        // enable shadows
        car.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
          }
        });

        carRef.current = car;
        scene.add(car);
        setIsLoading(false);
      },
      (progress) => {
        if (progress.total) {
          setLoadingProgress(Math.round((progress.loaded / progress.total) * 100));
        }
      },
      (error) => {
        console.error("Model load error:", error);
        setIsLoading(false);
      }
    );


    // Controls
    const onMouseDown = (e: MouseEvent) => {
      controlsRef.current.isDragging = true;
      controlsRef.current.previousMouse = { x: e.clientX, y: e.clientY };
      setAutoRotate(false);
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!controlsRef.current.isDragging) return;
      const deltaX = e.clientX - controlsRef.current.previousMouse.x;
      const deltaY = e.clientY - controlsRef.current.previousMouse.y;
      controlsRef.current.targetRotation.y += deltaX * 0.01;
      controlsRef.current.targetRotation.x = Math.max(
        -Math.PI / 4,
        Math.min(Math.PI / 4, controlsRef.current.targetRotation.x + deltaY * 0.01)
      );
      controlsRef.current.previousMouse = { x: e.clientX, y: e.clientY };
    };
    const onMouseUp = () => (controlsRef.current.isDragging = false);
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      controlsRef.current.targetDistance = Math.max(
        4,
        Math.min(20, controlsRef.current.targetDistance + e.deltaY * 0.01)
      );
    };

    renderer.domElement.addEventListener("mousedown", onMouseDown);
    renderer.domElement.addEventListener("mousemove", onMouseMove);
    renderer.domElement.addEventListener("mouseup", onMouseUp);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

    // Animation loop
    let time = 0;
    const animate = () => {
      requestRef.current = requestAnimationFrame(animate);
      time += 0.01;

      if (autoRotate) controlsRef.current.targetRotation.y += 0.004;

      const { rotation, targetRotation, distance, targetDistance } = controlsRef.current;
      rotation.x += (targetRotation.x - rotation.x) * 0.1;
      rotation.y += (targetRotation.y - rotation.y) * 0.1;
      controlsRef.current.distance += (targetDistance - distance) * 0.1;

      const dist = controlsRef.current.distance;
      const rotX = rotation.x;
      const rotY = rotation.y;

      camera.position.x = Math.sin(rotY) * Math.cos(rotX) * dist;
      camera.position.y = Math.sin(rotX) * dist + 2;
      camera.position.z = Math.cos(rotY) * Math.cos(rotX) * dist;
      camera.lookAt(0, 0.5, 0);

      if (carRef.current) {
        carRef.current.position.y = -0.5 + Math.sin(time * 0.3) * 0.02;
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, [setupLighting, envPreset, hdrIntensity, autoRotate]);

  const resetCamera = useCallback(() => {
    controlsRef.current.targetRotation = { x: 0.2, y: 0 };
    controlsRef.current.targetDistance = 8;
    setAutoRotate(true);
  }, []);

  return (
    <div className="w-full h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 flex flex-col">
      {/* Header */}
      <div className="p-4 md:p-6 bg-black/40 backdrop-blur-xl border-b border-gray-800">
        <h1 className="text-2xl font-bold text-white">Lamborghini Huracán • 3D Viewer</h1>
        <p className="text-gray-400 text-sm">HDR Lighting • PBR Materials • Real Model</p>
      </div>

      {/* 3D Canvas */}
      <div className="relative flex-1">
        <div ref={mountRef} className="w-full h-full" />
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
            <p className="text-white">Loading Car Model… {loadingProgress}%</p>
          </div>
        )}
      </div>

      {/* Control Panel */}
      <div className="bg-black/50 backdrop-blur-xl border-t border-gray-800 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div>
            <label className="text-white flex items-center gap-2 mb-1">
              <Sun className="w-4 h-4 text-yellow-400" /> HDR Intensity
            </label>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={hdrIntensity}
              onChange={(e) => setHdrIntensity(parseFloat(e.target.value))}
              className="w-full accent-blue-500"
            />
          </div>

          <div>
            <label className="text-white flex items-center gap-2 mb-1">
              <Droplet className="w-4 h-4 text-blue-400" /> Wetness
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={wetness}
              onChange={(e) => setWetness(parseFloat(e.target.value))}
              className="w-full accent-blue-500"
            />
          </div>

          <div>
            <label className="text-white flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-purple-400" /> Environment
            </label>
            <select
              value={envPreset}
              onChange={(e) => setEnvPreset(e.target.value as EnvPreset)}
              className="w-full bg-gray-800 text-white rounded px-2 py-1"
            >
              <option value="studio">Studio</option>
              <option value="sunset">Sunset</option>
              <option value="night">Night</option>
              <option value="city">City</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={resetCamera}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded py-2"
            >
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
            <button
              onClick={() => setAutoRotate((r) => !r)}
              className={`flex-1 flex items-center justify-center gap-2 rounded py-2 ${autoRotate
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-gray-700 text-gray-300"
                }`}
            >
              <Camera className="w-4 h-4" /> {autoRotate ? "Auto" : "Manual"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
