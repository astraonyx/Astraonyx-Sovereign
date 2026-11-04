// This is a file with a demo for your component
// That's what users will see in the preview
// Create new files in this directory to add more demos

import React from "react";
import ConstellationGrid from "@/components/ui/constellation-grid";
import { SplineScene } from "@/components/ui/splite";
import { Card } from "@/components/ui/card";
import { Spotlight } from "@/components/ui/spotlight";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { SonarGrid } from "@/components/ui/sonar-grid";
import SonarGridDemoFull from "@/components/ui/sonar-grid-demo";
import { Header } from "@/components/ui/vercel-navbar";
import { PromptInput } from "@/components/ui/ai-chat-input";
import { Button } from "@/components/ui/button";

// ONLY DEFAULT EXPORT WILL BE TREATED AS A DEMO
export default function DemoOne() {
  return <ConstellationGrid />;
}

export function SplineSceneBasic() {
  return (
    <Card className="w-full h-[500px] bg-black/[0.96] relative overflow-hidden">
      <Spotlight
        className="-top-40 left-0 md:left-60 md:-top-20"
        fill="white"
      />
      
      <div className="flex h-full">
        {/* Left content */}
        <div className="flex-1 p-8 relative z-10 flex flex-col justify-center">
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400">
            Interactive 3D
          </h1>
          <p className="mt-4 text-neutral-300 max-w-lg">
            Bring your UI to life with beautiful 3D scenes. Create immersive experiences 
            that capture attention and enhance your design.
          </p>
        </div>

        {/* Right content */}
        <div className="flex-1 relative">
          <SplineScene 
            scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
            className="w-full h-full"
          />
        </div>
      </div>
    </Card>
  );
}

export function ConstellationDemo() {
  return <ConstellationGrid />;
}

export function RainbowButtonDemo() {
  return <RainbowButton>Get Unlimited Access</RainbowButton>;
}

export function SonarGridDemo() {
  return <SonarGridDemoFull />;
}

export function VercelNavbarDemo() {
  return <Header />;
}

export function AIChatInputDemo() {
  return (
    <div className="flex w-full items-center justify-center p-8">
      <PromptInput placeholder="Ask anything..." />
    </div>
  );
}

export function AuraButtonShowcase() {
  return (
    <div className="flex flex-wrap gap-4 items-center justify-center p-8 bg-slate-950 rounded-2xl border border-white/10">
      <Button variant="auraCyan">Launch Bot (Cyan Aura)</Button>
      <Button variant="auraDanger">Stop / Delete (Crimson Aura)</Button>
      <Button variant="auraEmerald">Broadcast (Emerald Aura)</Button>
      <Button variant="auraAmber">Restart Process (Amber Aura)</Button>
      <Button variant="auraPurple">Hermes AI (Violet Aura)</Button>
      <Button variant="auraGlass">Settings (Obsidian Glass)</Button>
      <Button variant="rainbow">Cosmic Rainbow Shimmer</Button>
    </div>
  );
}
