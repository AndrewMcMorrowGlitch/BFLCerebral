'use client';

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomObject, RoomState } from '@/lib/roomState';

export type SceneEditorHandle = {
  captureClay: () => string;
};

interface SceneEditorProps {
  roomState: RoomState;
  onRoomStateChange: (next: RoomState) => void;
  selectedObjectId: string | null;
  onSelect: (id: string | null) => void;
}

const NON_DRAGGABLE = new Set(['floor', 'wall', 'ceiling']);

function buildMesh(obj: RoomObject) {
  let geometry: THREE.BufferGeometry;

  switch (obj.type) {
    case 'floor':
    case 'wall':
    case 'ceiling':
    case 'sofa':
    case 'table':
    case 'shelf':
    case 'chair':
      geometry = new THREE.BoxGeometry(obj.size.w, obj.size.h, obj.size.d);
      break;
    case 'rug':
      geometry = new THREE.BoxGeometry(obj.size.w, obj.size.h, obj.size.d);
      break;
    case 'lamp':
    case 'plant':
      geometry = new THREE.CylinderGeometry(obj.size.w / 3, obj.size.w / 2, obj.size.h, 24);
      break;
    case 'artwork':
    case 'decor':
      geometry = new THREE.PlaneGeometry(obj.size.w, obj.size.h);
      break;
    default:
      geometry = new THREE.BoxGeometry(obj.size.w, obj.size.h, obj.size.d);
  }

  const material = new THREE.MeshStandardMaterial({
    color: obj.material.color,
    flatShading: true,
    roughness: 0.8,
    metalness: 0.1,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(obj.position.x, obj.position.y, obj.position.z);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.userData = {
    id: obj.id,
    type: obj.type,
    draggable: !NON_DRAGGABLE.has(obj.type),
  };

  // Aim artwork/decor toward camera by default
  if (obj.type === 'artwork' || obj.type === 'decor') {
    mesh.rotation.y = 0;
  }

  return mesh;
}

export const SceneEditor = forwardRef<SceneEditorHandle, SceneEditorProps>(
  ({ roomState, onRoomStateChange, selectedObjectId, onSelect }, ref) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const clayRendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene>(new THREE.Scene());
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const meshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
    const animationRef = useRef<number | null>(null);
    const dragPlane = useRef<THREE.Plane>(new THREE.Plane());
    const dragState = useRef<{ id: string; offset: THREE.Vector3 } | null>(null);
    const raycaster = useRef<THREE.Raycaster>(new THREE.Raycaster());
    const pointer = useRef<THREE.Vector2>(new THREE.Vector2());
    const roomStateRef = useRef<RoomState>(roomState);

    useEffect(() => {
      roomStateRef.current = roomState;
    }, [roomState]);

    // Expose clay capture to parent
    useImperativeHandle(ref, () => ({
      captureClay: () => {
        const scene = sceneRef.current;
        const camera = cameraRef.current;
        const clayRenderer = clayRendererRef.current;
        if (!scene || !camera || !clayRenderer) return '';

        const originalOverride = scene.overrideMaterial;
        const originalBg = scene.background;

        scene.overrideMaterial = new THREE.MeshBasicMaterial({ color: '#d8d8d8' });
        scene.background = new THREE.Color('#f0f0f0');
        clayRenderer.render(scene, camera);
        const data = clayRenderer.domElement.toDataURL('image/png');

        scene.overrideMaterial = originalOverride;
        scene.background = originalBg;
        return data;
      },
    }));

    // Sync Three scene with room state
    const syncSceneFromState = useCallback(
      (state: RoomState) => {
        const scene = sceneRef.current;
        const meshMap = meshesRef.current;

        // Remove deleted meshes
        meshMap.forEach((mesh, id) => {
          if (!state.objects.find((o) => o.id === id)) {
            scene.remove(mesh);
            mesh.geometry.dispose();
            if (mesh.material instanceof THREE.Material) mesh.material.dispose();
            meshMap.delete(id);
          }
        });

        // Add / update meshes
        state.objects.forEach((obj) => {
          let mesh = meshMap.get(obj.id);
          if (!mesh) {
            mesh = buildMesh(obj);
            meshMap.set(obj.id, mesh);
            scene.add(mesh);
          }

          mesh.position.set(obj.position.x, obj.position.y, obj.position.z);
          mesh.scale.set(1, 1, 1);

          if (mesh.material instanceof THREE.MeshStandardMaterial) {
            mesh.material.color.set(obj.material.color);
          }

          if (mesh.material instanceof THREE.MeshStandardMaterial) {
            mesh.material.emissive = new THREE.Color(
              selectedObjectId === obj.id ? '#3b82f6' : '#000000',
            );
            mesh.material.emissiveIntensity = selectedObjectId === obj.id ? 0.25 : 0;
          }
        });
      },
      [selectedObjectId],
    );

    // Pointer helpers
    const setPointerFromEvent = (event: PointerEvent) => {
      const renderer = rendererRef.current;
      if (!renderer) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const handlePointerDown = useCallback(
      (event: PointerEvent) => {
        const renderer = rendererRef.current;
        const camera = cameraRef.current;
        if (!renderer || !camera) return;

        setPointerFromEvent(event);
        raycaster.current.setFromCamera(pointer.current, camera);
        const intersects = raycaster.current.intersectObjects(Array.from(meshesRef.current.values()));
        if (intersects.length === 0) {
          onSelect(null);
          return;
        }

        const hit = intersects[0];
        const mesh = hit.object as THREE.Mesh;
        const { id, draggable } = mesh.userData as { id?: string; draggable?: boolean };
        if (!id) return;
        onSelect(id);

        if (!draggable) return;
        const hitPoint = hit.point.clone();
        dragPlane.current.set(new THREE.Vector3(0, 1, 0), -mesh.position.y);
        dragState.current = {
          id,
          offset: hitPoint.sub(mesh.position.clone()),
        };
      },
      [onSelect],
    );

    const handlePointerMove = useCallback(
      (event: PointerEvent) => {
        const camera = cameraRef.current;
        if (!camera || !dragState.current) return;

        setPointerFromEvent(event);
        raycaster.current.setFromCamera(pointer.current, camera);
        const intersection = new THREE.Vector3();
        if (raycaster.current.ray.intersectPlane(dragPlane.current, intersection)) {
          const mesh = meshesRef.current.get(dragState.current.id);
          if (!mesh) return;
          mesh.position.set(
            intersection.x - dragState.current.offset.x,
            mesh.position.y,
            intersection.z - dragState.current.offset.z,
          );

          const latestState = roomStateRef.current;
          onRoomStateChange({
            ...latestState,
            objects: latestState.objects.map((obj) =>
              obj.id === dragState.current?.id
                ? { ...obj, position: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z } }
                : obj,
            ),
          });
        }
      },
      [onRoomStateChange],
    );

    const handlePointerUp = useCallback(() => {
      dragState.current = null;
    }, []);

    // Initial scene setup
    useEffect(() => {
      if (!containerRef.current) return;

      const scene = sceneRef.current;
      scene.background = new THREE.Color('#f6f6f6');

      const { clientWidth, clientHeight } = containerRef.current;
      const camera = new THREE.PerspectiveCamera(
        roomState.camera.fov,
        clientWidth / clientHeight,
        0.1,
        100,
      );
      camera.position.set(6, 5, 6);
      camera.lookAt(0, 1, 0);
      cameraRef.current = camera;

      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
      });
      renderer.setSize(clientWidth, clientHeight);
      renderer.shadowMap.enabled = false;
      containerRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      const clayRenderer = new THREE.WebGLRenderer({
        antialias: true,
        preserveDrawingBuffer: true,
      });
      clayRenderer.setSize(clientWidth, clientHeight);
      clayRenderer.shadowMap.enabled = false;
      clayRendererRef.current = clayRenderer;

      const ambient = new THREE.AmbientLight(0xffffff, 0.7);
      scene.add(ambient);
      const dir = new THREE.DirectionalLight(0xffffff, 0.8);
      dir.position.set(5, 8, 5);
      scene.add(dir);

      const grid = new THREE.GridHelper(20, 20, 0xd1d5db, 0xe5e7eb);
      grid.position.y = 0.001;
      scene.add(grid);

      syncSceneFromState(roomState);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.enablePan = false;
      controls.target.set(0, 1, 0);
      controls.update();

      const onResize = () => {
        if (!containerRef.current || !cameraRef.current || !rendererRef.current || !clayRendererRef.current) return;
        const { clientWidth: w, clientHeight: h } = containerRef.current;
        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(w, h);
        clayRendererRef.current.setSize(w, h);
      };
      window.addEventListener('resize', onResize);

      renderer.domElement.addEventListener('pointerdown', handlePointerDown);
      renderer.domElement.addEventListener('pointermove', handlePointerMove);
      renderer.domElement.addEventListener('pointerup', handlePointerUp);
      const meshMapForCleanup = meshesRef.current;

      const animate = () => {
        animationRef.current = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      return () => {
        window.removeEventListener('resize', onResize);
        renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
        renderer.domElement.removeEventListener('pointermove', handlePointerMove);
        renderer.domElement.removeEventListener('pointerup', handlePointerUp);
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        renderer.dispose();
        clayRenderer.dispose();
        const meshSnapshot = Array.from(meshMapForCleanup.values());
        meshSnapshot.forEach((mesh) => {
          mesh.geometry.dispose();
          if (mesh.material instanceof THREE.Material) mesh.material.dispose();
        });
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [handlePointerDown, handlePointerMove, handlePointerUp, roomState.camera.fov, syncSceneFromState]);

    // Update scene whenever the room state changes
    useEffect(() => {
      syncSceneFromState(roomState);
    }, [roomState, syncSceneFromState]);

    return <div ref={containerRef} className="h-full w-full bg-neutral-100 relative" />;
  },
);

SceneEditor.displayName = 'SceneEditor';
