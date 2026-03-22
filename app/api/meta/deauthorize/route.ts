import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type SignedRequestPayload = {
  algorithm?: string;
  user_id?: string;
  account_id?: string;
  ad_account_id?: string;
  [key: string]: unknown;
};

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function fromBase64Url(input: string): Buffer {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Buffer.from(padded, "base64");
}

function parseSignedRequest(
  signedRequest: string,
  appSecret: string,
): SignedRequestPayload {
  const [encodedSignature, encodedPayload] = signedRequest.split(".");

  if (!encodedSignature || !encodedPayload) {
    throw new Error("Invalid signed_request format");
  }

  const expected = createHmac("sha256", appSecret)
    .update(encodedPayload)
    .digest();
  const signature = fromBase64Url(encodedSignature);

  if (
    signature.length !== expected.length ||
    !timingSafeEqual(signature, expected)
  ) {
    throw new Error("Invalid signed_request signature");
  }

  const payload = JSON.parse(
    fromBase64Url(encodedPayload).toString("utf8"),
  ) as SignedRequestPayload;

  if (
    typeof payload.algorithm === "string" &&
    payload.algorithm.toUpperCase() !== "HMAC-SHA256"
  ) {
    throw new Error("Unsupported signed_request algorithm");
  }

  return payload;
}

async function getSignedRequest(request: NextRequest): Promise<string | null> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as
      | { signed_request?: string }
      | null;
    return typeof body?.signed_request === "string"
      ? body.signed_request
      : null;
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await request.text();
    const params = new URLSearchParams(text);
    return params.get("signed_request");
  }

  const formData = await request.formData().catch(() => null);
  const value = formData?.get("signed_request");
  return typeof value === "string" ? value : null;
}

function candidateMetaAccountIds(payload: SignedRequestPayload): string[] {
  const values = [payload.ad_account_id, payload.account_id]
    .filter((v): v is string => typeof v === "string" && v.length > 0)
    .flatMap((raw) => {
      const normalized = raw.startsWith("act_") ? raw : `act_${raw}`;
      return [raw, normalized];
    });

  return [...new Set(values)];
}

function candidateMetaUserIds(payload: SignedRequestPayload): string[] {
  return [payload.user_id].filter(
    (v): v is string => typeof v === "string" && v.length > 0,
  );
}

async function bestEffortDisconnect(
  metaAccountIds: string[],
  metaUserIds: string[],
): Promise<void> {
  if (metaAccountIds.length === 0 && metaUserIds.length === 0) return;

  const admin = createAdminClient();

  let accountsByMetaId: Array<{ id: string }> = [];
  let accountsByUserId: Array<{ id: string }> = [];

  if (metaAccountIds.length > 0) {
    const { data } = await admin
      .from("meta_ad_accounts")
      .select("id")
      .in("meta_account_id", metaAccountIds);
    accountsByMetaId = data ?? [];
  }

  if (metaUserIds.length > 0) {
    const { data } = await admin
      .from("meta_ad_accounts")
      .select("id")
      .in("meta_user_id", metaUserIds);
    accountsByUserId = data ?? [];
  }

  const accountIds = [
    ...accountsByMetaId.map((a) => a.id),
    ...accountsByUserId.map((a) => a.id),
  ];

  const uniqueAccountIds = [...new Set(accountIds)];

  if (uniqueAccountIds.length === 0) return;

  await admin
    .from("meta_tokens")
    .delete()
    .in("meta_ad_account_id", uniqueAccountIds);
  await admin.from("meta_ad_accounts").delete().in("id", uniqueAccountIds);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const signedRequest = await getSignedRequest(request);
    if (!signedRequest) {
      return NextResponse.json(
        { error: "Missing signed_request" },
        { status: 400 },
      );
    }

    const appSecret = getRequiredEnv("META_APP_SECRET");
    const payload = parseSignedRequest(signedRequest, appSecret);

    await bestEffortDisconnect(
      candidateMetaAccountIds(payload),
      candidateMetaUserIds(payload),
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[meta/deauthorize] Request handling failed", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      status: "ok",
      message: "Meta deauthorize callback endpoint is active.",
    },
    { status: 200 },
  );
}
