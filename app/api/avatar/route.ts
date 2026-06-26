import { NextResponse, type NextRequest } from "next/server";
import { getServerClient, getUser } from "@/src/lib/supabase/server";
import { getAdminClient } from "@/src/lib/supabase/admin";
import { AVATAR_BUCKET } from "@/src/lib/supabase/config";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

// POST: sube la foto de perfil del usuario y la guarda en su metadata.
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return new NextResponse("No autenticado", { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return new NextResponse("Falta la imagen", { status: 400 });
  }
  const ext = ALLOWED[file.type];
  if (!ext) {
    return new NextResponse("Formato no soportado (PNG, JPG, WEBP o GIF)", {
      status: 415,
    });
  }
  if (file.size > MAX_BYTES) {
    return new NextResponse("La imagen supera 5 MB", { status: 413 });
  }

  const admin = getAdminClient();

  // Asegura el bucket público de avatares (idempotente).
  const { error: bucketErr } = await admin.storage.createBucket(AVATAR_BUCKET, {
    public: true,
  });
  if (bucketErr && !/exist/i.test(bucketErr.message)) {
    return new NextResponse(bucketErr.message, { status: 500 });
  }

  // Ruta {user_id}/avatar-{timestamp}.{ext}: el sufijo evita caché del CDN.
  const path = `${user.id}/avatar-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await admin.storage
    .from(AVATAR_BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: true });
  if (upErr) return new NextResponse(upErr.message, { status: 500 });

  const {
    data: { publicUrl },
  } = admin.storage.from(AVATAR_BUCKET).getPublicUrl(path);

  // Persiste la URL en la metadata del usuario autenticado (sesión por cookie).
  const supabase = await getServerClient();
  const { error: updErr } = await supabase.auth.updateUser({
    data: { avatar_url: publicUrl },
  });
  if (updErr) return new NextResponse(updErr.message, { status: 500 });

  // Limpieza best-effort de avatares antiguos del usuario.
  const { data: old } = await admin.storage
    .from(AVATAR_BUCKET)
    .list(user.id);
  const stale = (old ?? [])
    .filter((o) => `${user.id}/${o.name}` !== path)
    .map((o) => `${user.id}/${o.name}`);
  if (stale.length) await admin.storage.from(AVATAR_BUCKET).remove(stale);

  return NextResponse.json({ avatarUrl: publicUrl });
}
