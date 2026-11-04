'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function Constellation3D() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.1, 1000);
    camera.position.z = 80;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // 2. Nodes & Constellation Geometry
    const nodeCount = 70;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(nodeCount * 3);
    const velocities: { x: number; y: number; z: number }[] = [];

    for (let i = 0; i < nodeCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 120;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 60;

      velocities.push({
        x: (Math.random() - 0.5) * 0.08,
        y: (Math.random() - 0.5) * 0.08,
        z: (Math.random() - 0.5) * 0.04,
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Particle Point Material
    const pointMaterial = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 2.2,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geometry, pointMaterial);
    scene.add(points);

    // Line Segments for Constellation Connectors
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x818cf8,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
    });
    const lineGeometry = new THREE.BufferGeometry();
    const linePositions = new Float32Array(nodeCount * nodeCount * 6);
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lines);

    // 3. Mouse Interaction
    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 20;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 20;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // 4. Resize Handler
    const handleResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // 5. Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Camera gentle lerp to mouse
      camera.position.x += (mouseX - camera.position.x) * 0.03;
      camera.position.y += (-mouseY - camera.position.y) * 0.03;
      camera.lookAt(scene.position);

      const pos = geometry.attributes.position.array as Float32Array;
      let lineIndex = 0;
      const linePos = lineGeometry.attributes.position.array as Float32Array;

      // Update positions
      for (let i = 0; i < nodeCount; i++) {
        pos[i * 3] += velocities[i].x;
        pos[i * 3 + 1] += velocities[i].y;
        pos[i * 3 + 2] += velocities[i].z;

        // Bounce boundaries
        if (Math.abs(pos[i * 3]) > 60) velocities[i].x *= -1;
        if (Math.abs(pos[i * 3 + 1]) > 40) velocities[i].y *= -1;
        if (Math.abs(pos[i * 3 + 2]) > 30) velocities[i].z *= -1;

        // Connect nearby nodes
        for (let j = i + 1; j < nodeCount; j++) {
          const dx = pos[i * 3] - pos[j * 3];
          const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
          const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < 25) {
            linePos[lineIndex++] = pos[i * 3];
            linePos[lineIndex++] = pos[i * 3 + 1];
            linePos[lineIndex++] = pos[i * 3 + 2];
            linePos[lineIndex++] = pos[j * 3];
            linePos[lineIndex++] = pos[j * 3 + 1];
            linePos[lineIndex++] = pos[j * 3 + 2];
          }
        }
      }

      geometry.attributes.position.needsUpdate = true;
      lineGeometry.setDrawRange(0, lineIndex / 3);
      lineGeometry.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    // 6. Cleanup
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (mount && renderer.domElement) {
        mount.removeChild(renderer.domElement);
      }
      geometry.dispose();
      lineGeometry.dispose();
      pointMaterial.dispose();
      lineMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 z-0 pointer-events-none opacity-80" />;
}
