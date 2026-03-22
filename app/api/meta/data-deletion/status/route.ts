import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = request.nextUrl.searchParams.get("id") ?? "unknown";

  return NextResponse.json(
    {
      id: requestId,
      status: "completed",
      message: "Data deletion request received and processed.",
    },
    { status: 200 },
  );
}
