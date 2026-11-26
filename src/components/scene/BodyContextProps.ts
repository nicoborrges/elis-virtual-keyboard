import * as THREE from 'three';

export interface BodyContextPropsRig {
  root: THREE.Group;
  head: THREE.Group;
  torso: THREE.Group;
  neutralSpaceRing: THREE.Group;
  arm: THREE.Group;
  leg: THREE.Group;
  beacon: THREE.Group;
  beaconRingMat: THREE.MeshBasicMaterial;
  beaconCoreMat: THREE.MeshBasicMaterial;
}

/**
 * Constrói os módulos anatômicos 3D contextuais (Cabeça, Tronco, Braço e Perna)
 * na mesma paleta sólida de manequim de estúdio das mãos + Hotspot Beacon luminoso.
 */
export function createBodyContextProps(
  skinMat: THREE.Material,
  jointMat: THREE.Material,
  cuffMat: THREE.Material
): BodyContextPropsRig {
  const root = new THREE.Group();

  // Subtle detail materials matching the solid mannequin aesthetic
  const featureMat = new THREE.MeshStandardMaterial({
    color: 0xc99c84,
    roughness: 0.56,
    metalness: 0.04,
  });
  const darkFeatureMat = new THREE.MeshStandardMaterial({
    color: 0x3a3631,
    roughness: 0.45,
    metalness: 0.15,
  });

  // =========================================================
  // 1. CABEÇA SÓLIDA ESTILIZADA (#17 a #31)
  // =========================================================
  const head = new THREE.Group();
  head.position.set(0, 0.25, -0.95);
  head.scale.setScalar(0.001);
  head.visible = false;
  root.add(head);

  // Cranium (upper head dome)
  const cranium = new THREE.Mesh(
    new THREE.SphereGeometry(0.54, 28, 24),
    skinMat
  );
  cranium.position.set(0, 0.22, 0);
  cranium.scale.set(0.95, 1.06, 0.98);
  cranium.castShadow = true;
  cranium.receiveShadow = true;
  head.add(cranium);

  // Jaw / lower face taper
  const jaw = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 24, 20),
    skinMat
  );
  jaw.position.set(0, -0.18, 0.06);
  jaw.scale.set(0.9, 1.05, 0.92);
  jaw.castShadow = true;
  jaw.receiveShadow = true;
  head.add(jaw);

  // Chin subtlety
  const chin = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 16, 14),
    skinMat
  );
  chin.position.set(0, -0.5, 0.33);
  chin.scale.set(1.15, 0.72, 0.8);
  head.add(chin);

  // Neck & base collar
  const headNeck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.28, 0.76, 22),
    skinMat
  );
  headNeck.position.set(0, -0.82, -0.05);
  headNeck.castShadow = true;
  head.add(headNeck);

  const headCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.42, 0.34, 24),
    cuffMat
  );
  headCollar.position.set(0, -1.26, -0.05);
  head.add(headCollar);

  // Sculpted ears (left & right)
  [-1, 1].forEach((side) => {
    const ear = new THREE.Mesh(
      new THREE.TorusGeometry(0.13, 0.048, 10, 20, Math.PI * 1.4),
      jointMat
    );
    ear.position.set(side * 0.52, 0.04, 0.02);
    ear.rotation.y = side * (Math.PI / 2 - 0.15);
    ear.rotation.z = side * -0.45;
    ear.scale.set(0.75, 1.25, 0.75);
    head.add(ear);
  });

  // Minimalist brow ridges (#22 Sobrancelha)
  [-1, 1].forEach((side) => {
    const brow = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.024, 0.16, 6, 12),
      featureMat
    );
    brow.position.set(side * 0.2, 0.25, 0.48);
    brow.rotation.z = Math.PI / 2 - side * 0.1;
    head.add(brow);
  });

  // Minimalist calm mannequin eyes (#23 Olho)
  [-1, 1].forEach((side) => {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.052, 14, 12),
      darkFeatureMat
    );
    eye.position.set(side * 0.19, 0.12, 0.47);
    eye.scale.set(1.25, 0.65, 0.55);
    head.add(eye);
  });

  // Nose bridge & tip (#25 Nariz)
  const noseBridge = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.048, 0.16, 8, 14),
    jointMat
  );
  noseBridge.position.set(0, 0.02, 0.53);
  noseBridge.rotation.x = -0.34;
  head.add(noseBridge);

  const noseTip = new THREE.Mesh(
    new THREE.SphereGeometry(0.062, 14, 12),
    jointMat
  );
  noseTip.position.set(0, -0.05, 0.58);
  noseTip.scale.set(1.15, 0.85, 0.9);
  head.add(noseTip);

  // Sculpted lips (#26 Lábio superior, #27 Boca, #28 Dentes)
  const upperLip = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.026, 0.18, 6, 12),
    featureMat
  );
  upperLip.position.set(0, -0.23, 0.48);
  upperLip.rotation.z = Math.PI / 2;
  head.add(upperLip);

  const lowerLip = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.028, 0.15, 6, 12),
    featureMat
  );
  lowerLip.position.set(0, -0.29, 0.47);
  lowerLip.rotation.z = Math.PI / 2;
  head.add(lowerLip);

  // =========================================================
  // 2. TRONCO / BUSTO SÓLIDO ESTILIZADO (#32 a #36)
  // =========================================================
  const torso = new THREE.Group();
  torso.position.set(0, -0.25, -1.05);
  torso.scale.setScalar(0.001);
  torso.visible = false;
  root.add(torso);

  // Neck (#32 Pescoço)
  const torsoNeck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.29, 0.56, 22),
    skinMat
  );
  torsoNeck.position.set(0, 0.96, 0);
  torsoNeck.castShadow = true;
  torso.add(torsoNeck);

  // Subtle head hint cap on top of neck (clean silhouette without dominating)
  const neckCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    jointMat
  );
  neckCap.position.set(0, 1.24, 0);
  torso.add(neckCap);

  // Collar / clavicles
  const shouldersBar = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.32, 1.48, 10, 20),
    skinMat
  );
  shouldersBar.rotation.z = Math.PI / 2;
  shouldersBar.position.set(0, 0.62, 0);
  shouldersBar.scale.set(1, 1, 0.85);
  shouldersBar.castShadow = true;
  shouldersBar.receiveShadow = true;
  torso.add(shouldersBar);

  // Thorax / upper chest (#34 Tórax)
  const chest = new THREE.Mesh(
    new THREE.CylinderGeometry(0.76, 0.62, 0.84, 28),
    skinMat
  );
  chest.position.set(0, 0.24, 0.04);
  chest.scale.set(1.12, 1, 0.64);
  chest.castShadow = true;
  chest.receiveShadow = true;
  torso.add(chest);

  // Subtle sternum line accent
  const chestLine = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.018, 0.42, 6, 10),
    jointMat
  );
  chestLine.position.set(0, 0.28, 0.49);
  torso.add(chestLine);

  // Abdomen / waist (#35 Abdômen)
  const abdomen = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.56, 0.82, 26),
    skinMat
  );
  abdomen.position.set(0, -0.52, 0.02);
  abdomen.scale.set(1.06, 1, 0.62);
  abdomen.castShadow = true;
  abdomen.receiveShadow = true;
  torso.add(abdomen);

  // Dark mannequin waist pedestal trim
  const waistTrim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.58, 0.6, 0.24, 26),
    cuffMat
  );
  waistTrim.position.set(0, -1.0, 0.02);
  waistTrim.scale.set(1.06, 1, 0.62);
  torso.add(waistTrim);

  // Neutral signing space floating ring (#33 Espaço neutro)
  const neutralSpaceRing = new THREE.Group();
  neutralSpaceRing.position.set(0, 0.04, 0.14);
  neutralSpaceRing.scale.setScalar(0.001);
  neutralSpaceRing.visible = false;
  root.add(neutralSpaceRing);

  const neutralRingMesh = new THREE.Mesh(
    new THREE.TorusGeometry(0.58, 0.02, 12, 48),
    new THREE.MeshBasicMaterial({
      color: 0xd8ae5e,
      transparent: true,
      opacity: 0.55,
    })
  );
  neutralSpaceRing.add(neutralRingMesh);

  // =========================================================
  // 3. MEMBRO SUPERIOR — BRAÇO DE APOIO ESQUERDO (#37 a #43)
  // Shoulder (-1.75, 0.64, -0.56) -> Elbow (-1.50, -0.26, -0.34) -> Wrist (-0.88, -0.26, -0.20)
  // =========================================================
  const arm = new THREE.Group();
  arm.scale.setScalar(0.001);
  arm.visible = false;
  root.add(arm);

  // Shoulder sphere (#38 Ombro)
  const shoulder = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 22, 18),
    skinMat
  );
  shoulder.position.set(-1.75, 0.64, -0.56);
  shoulder.castShadow = true;
  arm.add(shoulder);

  // Dark torso shoulder mount cap
  const shoulderMount = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 18, 16),
    cuffMat
  );
  shoulderMount.position.set(-1.96, 0.62, -0.66);
  arm.add(shoulderMount);

  // Upper arm (#40 Braço) connecting shoulder -> elbow
  const upperArmStart = new THREE.Vector3(-1.75, 0.64, -0.56);
  const elbowPos = new THREE.Vector3(-1.5, -0.26, -0.34);
  const upperArmVec = elbowPos.clone().sub(upperArmStart);
  const upperArmLen = upperArmVec.length();

  const upperArm = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.21, Math.max(0.1, upperArmLen - 0.34), 10, 20),
    skinMat
  );
  upperArm.position.copy(upperArmStart).addScaledVector(upperArmVec, 0.5);
  upperArm.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    upperArmVec.clone().normalize()
  );
  upperArm.castShadow = true;
  arm.add(upperArm);

  // Elbow sphere (#41 Cotovelo)
  const elbow = new THREE.Mesh(
    new THREE.SphereGeometry(0.21, 20, 16),
    jointMat
  );
  elbow.position.copy(elbowPos);
  elbow.castShadow = true;
  arm.add(elbow);

  // Forearm (#42 Antebraço) connecting elbow -> left wrist support (-0.92, -0.26, -0.20)
  const wristJoinPos = new THREE.Vector3(-0.92, -0.26, -0.2);
  const forearmVec = wristJoinPos.clone().sub(elbowPos);
  const forearmLen = forearmVec.length();

  const forearm = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.18, Math.max(0.1, forearmLen - 0.28), 10, 20),
    skinMat
  );
  forearm.position.copy(elbowPos).addScaledVector(forearmVec, 0.5);
  forearm.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    forearmVec.clone().normalize()
  );
  forearm.castShadow = true;
  arm.add(forearm);

  // =========================================================
  // 4. MEMBRO INFERIOR — PERNA ESTILIZADA (#44 Perna)
  // =========================================================
  const leg = new THREE.Group();
  leg.position.set(-0.42, -0.66, -0.45);
  leg.scale.setScalar(0.001);
  leg.visible = false;
  root.add(leg);

  // Thigh segment angled forward like a seated/standing leg reference
  const thigh = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.32, 0.95, 12, 22),
    skinMat
  );
  thigh.rotation.x = Math.PI / 2 - 0.22;
  thigh.rotation.z = -0.15;
  thigh.position.set(0, 0.16, -0.08);
  thigh.castShadow = true;
  thigh.receiveShadow = true;
  leg.add(thigh);

  // Knee sphere
  const knee = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 20, 16),
    jointMat
  );
  knee.position.set(0.08, 0.04, 0.52);
  knee.castShadow = true;
  leg.add(knee);

  // Upper shin going down toward base
  const shin = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.24, 0.72, 10, 20),
    skinMat
  );
  shin.position.set(0.08, -0.44, 0.52);
  shin.castShadow = true;
  leg.add(shin);

  // Dark hip/thigh cuff trim
  const hipTrim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.34, 0.22, 22),
    cuffMat
  );
  hipTrim.rotation.x = Math.PI / 2 - 0.22;
  hipTrim.rotation.z = -0.15;
  hipTrim.position.set(-0.08, 0.3, -0.68);
  leg.add(hipTrim);

  // =========================================================
  // 5. HOTSPOT BEACON 3D (Marcador luminoso do ponto exato)
  // =========================================================
  const beacon = new THREE.Group();
  beacon.visible = false;
  root.add(beacon);

  const beaconRingMat = new THREE.MeshBasicMaterial({
    color: 0xd8ae5e,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
    depthTest: false,
  });
  const beaconRing = new THREE.Mesh(
    new THREE.RingGeometry(0.11, 0.155, 32),
    beaconRingMat
  );
  beaconRing.renderOrder = 10;
  beacon.add(beaconRing);

  const beaconCoreMat = new THREE.MeshBasicMaterial({
    color: 0xf5e9cc,
    transparent: true,
    opacity: 0.95,
    depthTest: false,
  });
  const beaconCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 14, 12),
    beaconCoreMat
  );
  beaconCore.renderOrder = 11;
  beacon.add(beaconCore);

  return {
    root,
    head,
    torso,
    neutralSpaceRing,
    arm,
    leg,
    beacon,
    beaconRingMat,
    beaconCoreMat,
  };
}
