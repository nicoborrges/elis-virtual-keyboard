/**
 * Prévia 3D do rig dirigida pelos frames resolvidos da pipeline
 * (mesmas mãos procedurais do teclado ELiS).
 */
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createArticulatedHand, getPoseFromElis, type HandRig } from '../components/scene/handRig';
import { anglesFromPoseTargets, type HandAngles } from '../pipeline/rigKinematics';
import type { SolvedFrame, SolvedHand } from '../pipeline/types';

interface RigPreviewProps {
  frame: SolvedFrame | undefined;
}

const REST_Y = -0.18;
const BASE_X = 0.88;

export const RigPreview: React.FC<RigPreviewProps> = ({ frame }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<SolvedFrame | undefined>(frame);

  useEffect(() => {
    frameRef.current = frame;
  }, [frame]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      container.textContent = 'WebGL indisponível neste navegador.';
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
    camera.position.set(0, 0.4, 7.4);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.target.set(0, 0.2, 0);

    scene.add(new THREE.HemisphereLight(0xf3e7cf, 0x1f1612, 1.1));
    const key = new THREE.DirectionalLight(0xfff5eb, 1.6);
    key.position.set(2.8, 4.2, 4.6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xd8ae5e, 1.1);
    rim.position.set(-3.5, 2.2, -3.5);
    scene.add(rim);

    const skin = new THREE.MeshStandardMaterial({ color: 0xeac7b2, roughness: 0.44 });
    const joint = new THREE.MeshStandardMaterial({ color: 0xdab099, roughness: 0.52 });
    const nail = new THREE.MeshStandardMaterial({ color: 0xf8e7dc, roughness: 0.22 });
    const cuff = new THREE.MeshStandardMaterial({ color: 0x2a2723, roughness: 0.45, metalness: 0.4 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xd8ae5e, emissive: 0xa67b2e, emissiveIntensity: 0.5 });
    const wine = new THREE.MeshStandardMaterial({ color: 0xb8615c, emissive: 0x6e2a2c, emissiveIntensity: 0.45 });

    const right = createArticulatedHand(1, skin, joint, nail, cuff, gold);
    const left = createArticulatedHand(-1, skin, joint, nail, cuff, wine);
    scene.add(right.root, left.root);

    const restAngles = (sign: 1 | -1): HandAngles => anglesFromPoseTargets(getPoseFromElis(null, null, null, sign), sign);
    const restQuat = (sign: 1 | -1) => {
      const p = getPoseFromElis(null, null, null, sign);
      return new THREE.Quaternion().setFromEuler(new THREE.Euler(p.wristRotX, p.wristRotY, p.wristRotZ, 'XYZ'));
    };

    const tmpQ = new THREE.Quaternion();
    const tmpE = new THREE.Euler();

    const drive = (rig: HandRig, sign: 1 | -1, hand: SolvedHand | undefined, k: number) => {
      const angles: HandAngles = hand ?? restAngles(sign);
      const target = hand ? tmpQ.set(...hand.wristQuat) : restQuat(sign);
      const offset = hand?.offset ?? [0, 0, 0];

      rig.root.position.lerp(new THREE.Vector3(sign * BASE_X + offset[0], REST_Y + offset[1], offset[2]), k);
      rig.wrist.quaternion.slerp(target, k);

      tmpE.set(...angles.thumb.cmc, 'XYZ');
      rig.thumb.cmc.quaternion.slerp(tmpQ.setFromEuler(tmpE), k);
      rig.thumb.mcp.rotation.x = THREE.MathUtils.lerp(rig.thumb.mcp.rotation.x, angles.thumb.mcp, k);
      rig.thumb.ip.rotation.x = THREE.MathUtils.lerp(rig.thumb.ip.rotation.x, angles.thumb.ip, k);

      rig.fingers.forEach((f, i) => {
        const a = angles.fingers[i];
        f.mcp.rotation.x = THREE.MathUtils.lerp(f.mcp.rotation.x, a.mcp, k);
        f.mcp.rotation.z = THREE.MathUtils.lerp(f.mcp.rotation.z, a.splay, k);
        f.pip.rotation.x = THREE.MathUtils.lerp(f.pip.rotation.x, a.pip, k);
        f.dip.rotation.x = THREE.MathUtils.lerp(f.dip.rotation.x, a.dip, k);
      });
    };

    const resize = () => {
      const w = Math.max(100, container.clientWidth);
      const h = Math.max(100, container.clientHeight);
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    const clock = new THREE.Clock();
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const k = Math.min(1, clock.getDelta() * 14);
      const f = frameRef.current;
      drive(right, 1, f?.dominant, k);
      drive(left, -1, f?.nonDominant, k);
      controls.update();
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
      [skin, joint, nail, cuff, gold, wine].forEach((m) => m.dispose());
      container.innerHTML = '';
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
      aria-label="Prévia 3D das mãos dirigida pela captura"
    />
  );
};
