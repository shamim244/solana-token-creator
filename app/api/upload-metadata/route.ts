import { NextResponse } from "next/server";
import { MetadataStorageService, type MetadataPayload } from "../../lib/metadata-storage-service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as MetadataPayload;

    if (!body.name?.trim() || !body.symbol?.trim()) {
      return NextResponse.json(
        { success: false, error: "Name and symbol are required fields" },
        { status: 400 }
      );
    }

    const result = await MetadataStorageService.upload(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Metadata upload failed" },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Metadata upload route failed:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to upload metadata to storage";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
