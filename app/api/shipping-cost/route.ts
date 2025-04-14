import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getStateCodeFromName, DEFAULT_SHIPPING_COST } from "@/lib/state-utils"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const stateName = searchParams.get("state")

    if (!stateName) {
      return NextResponse.json(
        {
          success: false,
          message: "State name is required",
          costPerSqFt: DEFAULT_SHIPPING_COST,
        },
        { status: 400 },
      )
    }

    // Get the state code from the state name
    const stateCode = getStateCodeFromName(stateName)

    if (!stateCode) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid state name",
          costPerSqFt: DEFAULT_SHIPPING_COST,
        },
        { status: 400 },
      )
    }

    // Look up the shipping cost from the database
    const result = await sql`
      SELECT cost_per_square_foot 
      FROM state_shipping_costs 
      WHERE state_code = ${stateCode}
    `

    if (result.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Shipping cost not found for state",
          costPerSqFt: DEFAULT_SHIPPING_COST,
        },
        { status: 404 },
      )
    }

    const costPerSqFt = Number.parseFloat(result[0].cost_per_square_foot)

    return NextResponse.json({
      success: true,
      stateCode,
      stateName,
      costPerSqFt,
    })
  } catch (error) {
    console.error("Error fetching shipping cost:", error)

    return NextResponse.json(
      {
        success: false,
        message: "Error fetching shipping cost",
        costPerSqFt: DEFAULT_SHIPPING_COST,
      },
      { status: 500 },
    )
  }
}
