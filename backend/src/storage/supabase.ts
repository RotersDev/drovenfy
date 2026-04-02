import { createClient, SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "images";

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set");
    _client = createClient(url, key);
  }
  return _client;
}

export async function ensureBucket() {
  const supabase = getClient();
  const { data } = await supabase.storage.getBucket(BUCKET);
  if (!data) {
    await supabase.storage.createBucket(BUCKET, { public: true });
  }
}

export async function uploadImage(
  base64Data: string,
  folder: string
): Promise<string> {
  const supabase = getClient();
  const matches = base64Data.match(/^data:(.+);base64,(.+)$/);
  if (!matches) throw new Error("Invalid base64 data");

  const contentType = matches[1];
  const ext = contentType.split("/")[1]?.replace("jpeg", "jpg") || "png";
  const buffer = Buffer.from(matches[2], "base64");
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, buffer, { contentType, upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
}

export function isBase64(str: string): boolean {
  return typeof str === "string" && str.startsWith("data:");
}
