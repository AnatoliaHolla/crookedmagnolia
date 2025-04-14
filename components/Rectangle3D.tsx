"use client"

import type React from "react"

import { useRef, useEffect, useState } from "react"
import { Canvas, useThree, useFrame } from "@react-three/fiber"
import { OrbitControls, Text } from "@react-three/drei"
import * as THREE from "three"

// Define the props for the Rectangle component
interface RectangleProps {
  length: number
  width: number
  height: number
  cages: number
  flipDirection: boolean
}

// The main Rectangle3D component
export default function Rectangle3D({ length, width, height, cages, flipDirection }: RectangleProps) {
  // Add error handling state
  const [hasError, setHasError] = useState(false)

  // Error boundary to catch and handle Three.js errors
  if (hasError) {
    return (
      <div className="w-full h-[200px] bg-[rgba(10,26,10,0.8)] rounded-lg border border-[#00ff00] flex items-center justify-center">
        <div className="text-[#00ff00]">
          <p className="text-center">Unable to load 3D visualization</p>
          <p className="text-center text-xs mt-2">Please try refreshing the page</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-[200px] relative">
      <ErrorBoundary onError={() => setHasError(true)}>
        <Canvas
          shadows
          camera={{ position: [length * 0.8, height * 1.2, width * 2], fov: 50 }}
          gl={{ antialias: true }}
          style={{ background: "rgb(5, 15, 5)" }}
          onError={() => setHasError(true)}
        >
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1.5} castShadow />
          <pointLight position={[-10, -10, -10]} intensity={0.5} />
          <Scene length={length} width={width} height={height} cages={cages} flipDirection={flipDirection} />
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={5}
            maxDistance={200}
            makeDefault // Use makeDefault to avoid cleanup issues
          />
        </Canvas>
      </ErrorBoundary>

      {/* Instructions overlay */}
      <div className="absolute bottom-1 right-1 text-[#00ff00] text-xs bg-black/50 p-1 rounded">
        Click + drag to rotate | Scroll to zoom
      </div>
    </div>
  )
}

// Simple error boundary component
function ErrorBoundary({ children, onError }: { children: React.ReactNode; onError: () => void }) {
  useEffect(() => {
    // Catch global Three.js errors
    const handleError = () => {
      onError()
    }
    window.addEventListener("error", handleError)
    return () => window.removeEventListener("error", handleError)
  }, [onError])

  return <>{children}</>
}

// The Scene component that contains the 3D objects
function Scene({ length, width, height, cages, flipDirection }: RectangleProps) {
  const { camera } = useThree()
  const groupRef = useRef<THREE.Group>(null)

  // Set camera position based on the size of the rectangle
  useEffect(() => {
    if (!camera) return

    try {
      // Calculate a good camera position based on the dimensions
      const maxDimension = Math.max(length, width * cages, height)
      const distance = maxDimension * 1.5

      // Position the camera at an angle to see the cage(s) properly
      camera.position.set(length * 0.8, height * 1.2, width * cages * 1.2)
      camera.lookAt(length / 2, height / 2, (width * cages) / 2)
    } catch (error) {
      console.error("Camera positioning error:", error)
    }

    // Clean up function
    return () => {
      // No need to clean up camera as it's managed by R3F
    }
  }, [camera, length, width, height, cages])

  // Add a subtle rotation animation to make it more dynamic
  useFrame(() => {
    if (groupRef.current) {
      // Very subtle automatic rotation when not being manipulated
      groupRef.current.rotation.y += 0.001
    }
  })

  // Create the cage(s)
  const renderCages = () => {
    const cageElements = []

    for (let i = 0; i < cages; i++) {
      // Calculate the position offset for each cage
      const offset = i * width

      // Create the cage
      cageElements.push(
        <group key={i} position={[0, 0, offset]}>
          {/* Floor (bright green) */}
          <mesh position={[length / 2, 0, width / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[length, width]} />
            <meshStandardMaterial color="#00cc00" side={THREE.DoubleSide} />
          </mesh>

          {/* ATXTurf.com text on the floor */}
          <Text
            position={[length / 2, 0.01, width / 2]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={length > width ? width / 8 : length / 10}
            color="white"
            anchorX="center"
            anchorY="middle"
            font="/fonts/Inter-Bold.woff"
          >
            ATXTurf.com
          </Text>

          {/* Add black lines for the 15' wide rolls */}
          {Array.from({ length: Math.ceil(flipDirection ? length / 15 : width / 15) }).map((_, index) => {
            const linePosition = index * 15

            if (flipDirection) {
              // Lines run along the width (perpendicular to length)
              return (
                <Line
                  key={`line-${index}`}
                  points={[
                    [linePosition, 0.01, 0],
                    [linePosition, 0.01, width],
                  ]}
                  color="black"
                />
              )
            } else {
              // Lines run along the length (perpendicular to width)
              return (
                <Line
                  key={`line-${index}`}
                  points={[
                    [0, 0.01, linePosition],
                    [length, 0.01, linePosition],
                  ]}
                  color="black"
                />
              )
            }
          })}

          {/* Ceiling (light gray netting) */}
          <mesh position={[length / 2, height, width / 2]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[length, width]} />
            <meshStandardMaterial color="#cccccc" side={THREE.DoubleSide} transparent opacity={0.5} wireframe={true} />
          </mesh>

          {/* Left wall (light gray netting) */}
          <mesh position={[0, height / 2, width / 2]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[width, height]} />
            <meshStandardMaterial color="#cccccc" side={THREE.DoubleSide} transparent opacity={0.5} wireframe={true} />
          </mesh>

          {/* Right wall (light gray netting) - only add if it's the last cage or a single cage */}
          {i === cages - 1 && (
            <mesh position={[length, height / 2, width / 2]} rotation={[0, -Math.PI / 2, 0]}>
              <planeGeometry args={[width, height]} />
              <meshStandardMaterial
                color="#cccccc"
                side={THREE.DoubleSide}
                transparent
                opacity={0.5}
                wireframe={true}
              />
            </mesh>
          )}

          {/* Front wall (light gray netting) */}
          <mesh position={[length / 2, height / 2, 0]}>
            <planeGeometry args={[length, height]} />
            <meshStandardMaterial color="#cccccc" side={THREE.DoubleSide} transparent opacity={0.5} wireframe={true} />
          </mesh>

          {/* Back wall (light gray netting) */}
          <mesh position={[length / 2, height / 2, width]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[length, height]} />
            <meshStandardMaterial color="#cccccc" side={THREE.DoubleSide} transparent opacity={0.5} wireframe={true} />
          </mesh>

          {/* Cage frame (bright green) - using simpler approach */}
          <CageFrame length={length} width={width} height={height} color="#00ff00" />
        </group>,
      )
    }

    return cageElements
  }

  return <group ref={groupRef}>{renderCages()}</group>
}

// Simplified Line component to avoid issues with bufferGeometry
function Line({ points, color }: { points: [number, number, number][]; color: string }) {
  const ref = useRef<THREE.Line>(null)

  useEffect(() => {
    return () => {
      // Clean up to avoid memory leaks
      if (ref.current) {
        if (ref.current.geometry) {
          ref.current.geometry.dispose()
        }
        if (ref.current.material) {
          if (Array.isArray(ref.current.material)) {
            ref.current.material.forEach((material) => material.dispose())
          } else {
            ref.current.material.dispose()
          }
        }
      }
    }
  }, [])

  return (
    <line ref={ref}>
      <bufferGeometry attach="geometry">
        <float32BufferAttribute
          attach="attributes-position"
          array={new Float32Array(points.flat())}
          count={points.length}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial attach="material" color={color} />
    </line>
  )
}

// Simplified cage frame component
function CageFrame({ length, width, height, color }: { length: number; width: number; height: number; color: string }) {
  // Bottom frame
  const bottomFrame = [
    [0, 0, 0],
    [length, 0, 0],
    [length, 0, width],
    [0, 0, width],
    [0, 0, 0],
  ]

  // Top frame
  const topFrame = [
    [0, height, 0],
    [length, height, 0],
    [length, height, width],
    [0, height, width],
    [0, height, 0],
  ]

  // Vertical edges
  const verticals = [
    [
      [0, 0, 0],
      [0, height, 0],
    ],
    [
      [length, 0, 0],
      [length, height, 0],
    ],
    [
      [length, 0, width],
      [length, height, width],
    ],
    [
      [0, 0, width],
      [0, height, width],
    ],
  ]

  return (
    <>
      <Line points={bottomFrame as [number, number, number][]} color={color} />
      <Line points={topFrame as [number, number, number][]} color={color} />
      {verticals.map((points, i) => (
        <Line key={`vertical-${i}`} points={points as [number, number, number][]} color={color} />
      ))}
    </>
  )
}
