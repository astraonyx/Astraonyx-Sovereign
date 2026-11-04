'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function CosmicCanvas() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 7;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.replaceChildren(renderer.domElement);

    // 2. Central 3D Celestial Core (Icosahedron Wireframe & Points)
    const coreGeometry = new THREE.IcosahedronGeometry(2, 2);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0x6366f1,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    scene.add(coreMesh);

    // Inner glowing sphere
    const innerGeo = new THREE.SphereGeometry(1.2, 32, 32);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      wireframe: true,
      transparent: true,
      opacity: 0.25,
    });
    const innerSphere = new THREE.Mesh(innerGeo, innerMat);
    scene.add(innerSphere);

    // 3. Orbiting Particles Ring (Galaxy Starfield)
    const particleCount = 1200;
    const posArray = new Float32Array(particleCount * 3);
    const colorArray = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      // Cylindrical orbit ring distribution
      const radius = 3.2 + Math.random() * 2.8;
      const angle = Math.random() * Math.PI * 2;
      const heightOffset = (Math.random() - 0.5) * 1.5;

      posArray[i] = Math.cos(angle) * radius;
      posArray[i + 1] = heightOffset;
      posArray[i + 2] = Math.sin(angle) * radius;

      // Color gradient between indigo, cyan, and violet
      colorArray[i] = 0.38 + Math.random() * 0.3;     // R
      colorArray[i + 1] = 0.5 + Math.random() * 0.4; // G
      colorArray[i + 2] = 0.95;                      // B
    }

    const particlesGeo = new THREE.BufferGeometry();
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    particlesGeo.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));

    const particlesMat = new THREE.PointsMaterial({
      size: 0.035,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });

    const particlesMesh = new THREE.Points(particlesGeo, particlesMat);
    scene.add(particlesMesh);

    // 4. Mouse Interactivity
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const onMouseMove = (e) => {
      const rect = containerRef.current.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / width - 0.5) * 2;
      mouseY = -((e.clientY - rect.top) / height - 0.5) * 2;
    };

    window.addEventListener('mousemove', onMouseMove);

    // 5. Animation Loop
    let animationFrameId;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth camera interpolation
      targetX += (mouseX - targetX) * 0.05;
      targetY += (mouseY - targetY) * 0.05;
      camera.position.x = targetX * 1.2;
      camera.position.y = targetY * 1.2;
      camera.lookAt(scene.position);

      // Core rotation
      coreMesh.rotation.y = elapsedTime * 0.25;
      coreMesh.rotation.x = elapsedTime * 0.15;

      innerSphere.rotation.y = -elapsedTime * 0.3;
      innerSphere.rotation.z = elapsedTime * 0.2;

      // Particles swirl
      particlesMesh.rotation.y = elapsedTime * 0.12;

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current) return;
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      coreGeometry.dispose();
      coreMaterial.dispose();
      innerGeo.dispose();
      innerMat.dispose();
      particlesGeo.dispose();
      particlesMat.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-[420px] lg:h-[500px] relative pointer-events-auto cursor-grab active:cursor-grabbing"
    />
  );
}
