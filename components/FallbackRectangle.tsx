"use client"

interface FallbackRectangleProps {
  length?: number
  width?: number
  height?: number
  cages?: number
  flipDirection?: boolean
}

export default function FallbackRectangle({
  length = 70,
  width = 14,
  height = 12,
  cages = 1,
  flipDirection = false,
}: FallbackRectangleProps) {
  return (
    <div className="w-full h-[200px] bg-[rgba(10,26,10,0.8)] rounded-lg border border-[#00ff00] flex flex-col items-center justify-center">
      <div className="text-[#00ff00] mb-4">Batting Cage Visualization</div>

      {/* Simple 2D representation */}
      <div className="relative w-3/4 h-24 border-2 border-[#00ff00] bg-[#005500]">
        {/* Floor with ATXTurf.com text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white font-bold text-sm">ATXTurf.com</span>
        </div>

        {/* Cage dimensions */}
        <div className="absolute -bottom-6 left-0 right-0 text-center text-[#00ff00] text-xs">
          {length}' × {width}' × {height}' ({cages} cage{cages > 1 ? "s" : ""})
        </div>

        {/* Roll direction indicator */}
        {flipDirection ? (
          <div className="absolute -top-6 left-0 right-0 text-center text-[#00ff00] text-xs">Rolls run length-wise</div>
        ) : (
          <div className="absolute -top-6 left-0 right-0 text-center text-[#00ff00] text-xs">Rolls run width-wise</div>
        )}
      </div>
    </div>
  )
}
