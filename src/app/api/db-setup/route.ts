// src/app/api/db-setup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { applyDatabaseImprovements } from "@/lib/db-migrations";

export async function POST(request: NextRequest) {
  try {
    console.log("Starting database schema improvements...");
    
    const result = await applyDatabaseImprovements();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Database schema improvements applied successfully"
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in database setup:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
