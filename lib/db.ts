import { neon } from "@neondatabase/serverless"

// Check if DATABASE_URL is defined
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL environment variable is not defined")
}

// Create a SQL client with the database URL from environment variables
export const sql = neon(process.env.DATABASE_URL!)

// Helper function to execute queries with better error handling
export async function executeQuery(query: string, params: any[] = []) {
  try {
    console.log("Executing query:", query)
    console.log("With parameters:", params)

    // Use sql.query instead of calling sql directly
    const result = await sql.query(query, params)
    console.log("Query result:", result)

    return result
  } catch (error) {
    console.error("Database error:", error)
    // Throw a more detailed error
    throw new Error(`Database operation failed: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}
