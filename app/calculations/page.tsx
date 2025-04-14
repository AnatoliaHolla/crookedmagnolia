import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"

export default async function CalculationsPage() {
  // Fetch calculations from the database using tagged template literals
  const calculations = await sql`
    SELECT 
      c.*,
      s.cost_per_square_foot
    FROM 
      area_calculations c
    LEFT JOIN 
      state_shipping_costs s ON s.state_name = c.ship_to_state
    ORDER BY 
      c.created_at DESC 
    LIMIT 50
  `

  return (
    <main className="min-h-screen p-8">
      <div className="bg-[rgba(10,26,10,0.8)] border border-[#00ff00] rounded-lg shadow-[0_0_20px_rgba(0,255,0,0.3)] p-6 w-full max-w-6xl mx-auto relative overflow-hidden">
        {/* Scanning animation */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#00ff00] to-transparent animate-[scan_2s_linear_infinite]"></div>

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold uppercase tracking-wider text-[#00ff00] shadow-[0_0_10px_rgba(0,255,0,0.7)]">
            Batting Cage Calculations
          </h1>
          <a href="/" className="px-4 py-2 bg-[#005500] text-[#00ff00] rounded hover:bg-[#007700] transition-colors">
            Back to Calculator
          </a>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-3 text-left bg-[rgba(0,50,0,0.7)] border border-[#00aa00] uppercase">ID</th>
                <th className="p-3 text-left bg-[rgba(0,50,0,0.7)] border border-[#00aa00] uppercase">Email</th>
                <th className="p-3 text-left bg-[rgba(0,50,0,0.7)] border border-[#00aa00] uppercase">Zip Code</th>
                <th className="p-3 text-left bg-[rgba(0,50,0,0.7)] border border-[#00aa00] uppercase">Ship To State</th>
                <th className="p-3 text-left bg-[rgba(0,50,0,0.7)] border border-[#00aa00] uppercase">Length (ft)</th>
                <th className="p-3 text-left bg-[rgba(0,50,0,0.7)] border border-[#00aa00] uppercase">Width (ft)</th>
                <th className="p-3 text-left bg-[rgba(0,50,0,0.7)] border border-[#00aa00] uppercase">Height (ft)</th>
                <th className="p-3 text-left bg-[rgba(0,50,0,0.7)] border border-[#00aa00] uppercase">Cages</th>
                <th className="p-3 text-left bg-[rgba(0,50,0,0.7)] border border-[#00aa00] uppercase">Netting Sq Ft</th>
                <th className="p-3 text-left bg-[rgba(0,50,0,0.7)] border border-[#00aa00] uppercase">Turf Sq Ft</th>
                <th className="p-3 text-left bg-[rgba(0,50,0,0.7)] border border-[#00aa00] uppercase">Shipping Cost</th>
                <th className="p-3 text-left bg-[rgba(0,50,0,0.7)] border border-[#00aa00] uppercase">Created At</th>
              </tr>
            </thead>
            <tbody>
              {calculations.length > 0 ? (
                calculations.map((calc: any) => {
                  // Calculate roll square footage
                  const rollWidth = Math.ceil(calc.width / 15) * 15
                  const rollSqFt = rollWidth * calc.length * (calc.cages || 1)

                  // Calculate shipping cost
                  const costPerSqFt = calc.cost_per_square_foot || 0.35
                  const shippingCost = rollSqFt * costPerSqFt + 230

                  return (
                    <tr key={calc.id} className="hover:bg-[rgba(0,40,0,0.5)]">
                      <td className="p-3 border border-[#00aa00] bg-[rgba(0,20,0,0.3)]">{calc.id}</td>
                      <td className="p-3 border border-[#00aa00] bg-[rgba(0,20,0,0.3)]">{calc.email}</td>
                      <td className="p-3 border border-[#00aa00] bg-[rgba(0,20,0,0.3)]">{calc.zipcode}</td>
                      <td className="p-3 border border-[#00aa00] bg-[rgba(0,20,0,0.3)]">
                        {calc.ship_to_state || "Unknown"}
                      </td>
                      <td className="p-3 border border-[#00aa00] bg-[rgba(0,20,0,0.3)]">{calc.length}</td>
                      <td className="p-3 border border-[#00aa00] bg-[rgba(0,20,0,0.3)]">{calc.width}</td>
                      <td className="p-3 border border-[#00aa00] bg-[rgba(0,20,0,0.3)]">{calc.height || "N/A"}</td>
                      <td className="p-3 border border-[#00aa00] bg-[rgba(0,20,0,0.3)]">{calc.cages || "1"}</td>
                      <td className="p-3 border border-[#00aa00] bg-[rgba(0,20,0,0.3)]">
                        {(calc.surface_area || calc.area)?.toLocaleString() || "N/A"}
                      </td>
                      <td className="p-3 border border-[#00aa00] bg-[rgba(0,20,0,0.3)]">
                        {calc.floor_area
                          ? calc.floor_area.toLocaleString()
                          : calc.length && calc.width
                            ? (calc.length * calc.width * (calc.cages || 1)).toLocaleString()
                            : "N/A"}
                      </td>
                      <td className="p-3 border border-[#00aa00] bg-[rgba(0,20,0,0.3)]">${shippingCost.toFixed(2)}</td>
                      <td className="p-3 border border-[#00aa00] bg-[rgba(0,20,0,0.3)]">
                        {new Date(calc.created_at).toLocaleString()}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={12} className="p-4 text-center border border-[#00aa00] bg-[rgba(0,20,0,0.3)]">
                    No calculations found. Add some using the calculator!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-between text-sm text-[rgba(0,255,0,0.7)]">
          <span>Connected to: neon-emerald-apple database</span>
          <span className="animate-blink">● LIVE</span>
        </div>
      </div>
    </main>
  )
}
