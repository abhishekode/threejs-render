import React, { useEffect, useRef, useState } from "react";
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
  const lightingRef = useRef<HTMLSelectElement | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    let camera: THREE.PerspectiveCamera;
    let renderer: THREE.WebGLRenderer;
    let scene: THREE.Scene;
    let controls: OrbitControls;
    let stats: Stats;
    let grid: THREE.GridHelper;
    let sunlight: THREE.DirectionalLight;
    let ambient: THREE.AmbientLight;

    /** CAR MATERIALS (shared) */
    const bodyMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xff6600,
      metalness: 0.9,
      roughness: 0.25,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
    });

    const detailsMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 1.0,
      roughness: 0.4,
    });

    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.1,
      roughness: 0.0,
      transmission: 1.0,
      thickness: 0.6,
    });

    /** OPTIMIZED LIGHTING ENGINE */
    const applyLighting = (mode: string) => {
      const configs = {
        morning: {
          sunColor: 0xffd7a8,
          sunIntensity: 1.3,
          position: new THREE.Vector3(3, 2, 1),
          ambient: 0.35,
        },
        noon: {
          sunColor: 0xffffff,
          sunIntensity: 2.1,
          position: new THREE.Vector3(0, 5, 0),
          ambient: 0.6,
        },
        evening: {
          sunColor: 0xff8c4a,
          sunIntensity: 1.0,
          position: new THREE.Vector3(-2, 1.2, 2),
          ambient: 0.3,
        },
        night: {
          sunColor: 0x8ab4ff,
          sunIntensity: 0.3,
          position: new THREE.Vector3(1, 1, 3),
          ambient: 0.18,
        },
      };

      const cfg = configs[mode];

      sunlight.color.set(cfg.sunColor);
      sunlight.intensity = cfg.sunIntensity;
      sunlight.position.copy(cfg.position);

      ambient.intensity = cfg.ambient;
    };

    /** INIT */
    function init() {
      const container = containerRef.current!;

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.toneMapping = THREE.NoToneMapping;
      renderer.toneMappingExposure = 0.95;
      container.appendChild(renderer.domElement);

      camera = new THREE.PerspectiveCamera(
        40,
        window.innerWidth / window.innerHeight,
        0.1,
        100
      );
      camera.position.set(-3, 1.5, 2);

      controls = new OrbitControls(camera, renderer.domElement);
      controls.maxDistance = 9;
      controls.maxPolarAngle = THREE.MathUtils.degToRad(90);
      controls.target.set(0, 0.8, 0);
      controls.update();

      stats = new Stats();
      stats.dom.style.top = "0px";

      scene = new THREE.Scene();
      scene.background = new THREE.Color("#dcdcdc");
      scene.environment = null;

      // /** ENVIRONMENT */
      // new HDRLoader().load("/hdr/background.hdr", (hdr) => {
      //   hdr.mapping = THREE.EquirectangularReflectionMapping;
      //   scene.environment = null;
      // });



      /** GRID (KEEPING IT) */
      grid = new THREE.GridHelper(20, 40, 0x0a0a2e, 0x0a0a2e);
      grid.material.opacity = 0.2;
      grid.material.transparent = true;
      grid.material.depthWrite = false;
      // scene.add(grid);


      const floorGeometry = new THREE.PlaneGeometry(40, 40);
      const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0xD0D0D0, // smooth light grey
        roughness: 0.9,
        metalness: 0,
      });

      const floor = new THREE.Mesh(floorGeometry, floorMaterial);
      floor.rotation.x = -Math.PI / 2; // make it horizontal
      floor.position.y = 0; // ground level
      floor.receiveShadow = true;
      scene.add(floor);

      /** LIGHTS */
      sunlight = new THREE.DirectionalLight(0xffffff, 2);
      sunlight.position.set(3, 4, 2);
      sunlight.castShadow = true;
      scene.add(sunlight);

      ambient = new THREE.AmbientLight(0xffffff, 0.4);
      scene.add(ambient);

      applyLighting("noon"); // default scene lighting

      /** COLOR PICKERS */
      bodyColorRef.current!.oninput = (e) =>
        bodyMaterial.color.set((e.target as HTMLInputElement).value);

      detailsColorRef.current!.oninput = (e) =>
        detailsMaterial.color.set((e.target as HTMLInputElement).value);

      glassColorRef.current!.oninput = (e) =>
        glassMaterial.color.set((e.target as HTMLInputElement).value);

      /** LIGHTING SELECT */
      lightingRef.current!.onchange = (e) =>
        applyLighting((e.target as HTMLSelectElement).value);

      /** LOAD CAR */
      new GLTFLoader().load(
        "/lexus/scene.gltf",
        (gltf) => {
          const car = gltf.scene;
          car.scale.set(0.014, 0.014, 0.014);

          const box = new THREE.Box3().setFromObject(car);
          const center = new THREE.Vector3();
          const size = new THREE.Vector3();
          box.getCenter(center);
          box.getSize(size);

          car.position.sub(center);
          car.position.y += size.y / 2;

          car.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              child.receiveShadow = false;
              const mname = child.material.name.toLowerCase();

              if (mname.includes("body") || mname.includes("paint")) {
                child.material = bodyMaterial;
              } else if (
                mname.includes("rim") ||
                mname.includes("wheel") ||
                mname.includes("metal")
              ) {
                child.material = detailsMaterial;
              } else if (mname.includes("glass")) {
                child.material = glassMaterial;
              }
            }
          });

          scene.add(car);
          setLoading(false); // hide loading spinner
        },
        undefined,
        (err) => console.error("GLTF load error:", err)
      );

      window.addEventListener("resize", onResize);
      renderer.setAnimationLoop(animate);
    }

    function onResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function animate() {
      controls.update();
      renderer.render(scene, camera);
      stats.update();
    }

    init();
  }, []);

  return (
    <div className="w-full h-screen bg-black relative">
      {/* Loading UI */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/80 backdrop-blur">
          <div className="text-gray-200 text-lg animate-pulse">
            Loading Car…
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 
                      flex gap-4 p-4 bg-gray-800/80 rounded-lg border border-gray-700">
        <label className="text-gray-100 flex gap-1 items-center">
          Body:
          <input type="color" ref={bodyColorRef} defaultValue="#ff6600"
            className="w-10 h-10" />
        </label>

        <label className="text-gray-100 flex gap-1 items-center">
          Details:
          <input type="color" ref={detailsColorRef} defaultValue="#ffffff"
            className="w-10 h-10" />
        </label>

        <label className="text-gray-100 flex gap-1 items-center">
          Glass:
          <input type="color" ref={glassColorRef} defaultValue="#ffffff"
            className="w-10 h-10" />
        </label>

        <label className="text-gray-100 flex gap-1 items-center">
          Light:
          <select ref={lightingRef} className="bg-gray-700 text-gray-200 px-3 py-1 rounded">
            <option value="morning">Morning</option>
            <option value="noon">Noon</option>
            <option value="evening">Evening</option>
            <option value="night">Night</option>
          </select>
        </label>
      </div>

      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
