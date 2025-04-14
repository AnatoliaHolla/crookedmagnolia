import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    // Test if we can connect to the database using tagged template literal
    const result = await sql`SELECT NOW()`

    return NextResponse.json({
      success: true,
      message: "Database connection successful",
      timestamp: result[0].now,
      databaseUrl: process.env.DATABASE_URL ? "Defined" : "Not defined",
    })
  } catch (error) {
    console.error("Database test error:", error)

    return NextResponse.json(
      {
        success: false,
        message: "Database connection failed",
        error: error instanceof Error ? error.message : "Unknown error",
        databaseUrl: process.env.DATABASE_URL ? "Defined" : "Not defined",
      },
      { status: 500 },
    )
  }
}
