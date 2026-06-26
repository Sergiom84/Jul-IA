import { NextResponse, type NextRequest } from "next/server";
import { getServerClient, getUser } from "@/src/lib/supabase/server";
import { getAdminClient } from "@/src/lib/supabase/admin";
import { STORAGE_BUCKET } from "@/src/lib/supabase/config";
import { isSupported, SUPPORTED_EXTENSIONS } from "@/src/lib/documents/extract";
import { isAllowedUrl, allowedDomainsLabel } from "@/src/lib/documents/url";

export const runtime = "nodejs";

const MAX_BYTES = 25 * 1024 * 1024;

function safeName(name: string): string {
  return name.replace(/[^\w.\-]+/g, "_").slice(-120) || "archivo";
}

// GET: lista las fuentes del usuario.
export async function GET() {
  const user = await getUser();
  if (!user) return new NextResponse("No autenticado", { status: 401 });

  const supabase = await getServerClient();
  const { data, error } = await supabase
    .from("sources")
    .select(
      "id, type, title, file_name, mime_type, url, status, error, chunk_count, created_at",
    )
    .order("created_at", { ascending: false });

  if (error) return new NextResponse(error.message, { status: 500 });
  return NextResponse.json(data ?? []);
}

const SOURCE_SELECT =
  "id, type, title, file_name, mime_type, url, status, error, chunk_count, created_at";

// POST: documento (multipart) o URL de referencia (JSON {url}). status uploaded.
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return new NextResponse("No autenticado", { status: 401 });

  // --- Rama URL de referencia (JSON) ---
  if (request.headers.get("content-type")?.includes("application/json")) {
    const { url } = (await request.json()) as { url?: string };
    if (!url?.trim()) return new NextResponse("Falta la URL", { status: 400 });
    if (!isAllowedUrl(url.trim())) {
      return new NextResponse(
        `Dominio no permitido. Permitidos: ${allowedDomainsLabel()}`,
        { status: 422 },
      );
    }
    const supabase = await getServerClient();
    const { data, error } = await supabase
      .from("sources")
      .insert({
        user_id: user.id,
        type: "url",
        title: url.trim(),
        url: url.trim(),
        status: "uploaded",
      })
      .select(SOURCE_SELECT)
      .single();
    if (error) return new NextResponse(error.message, { status: 500 });
    return NextResponse.json(data);
  }

  // --- Rama documento (multipart) ---
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return new NextResponse("Falta el archivo", { status: 400 });
  }
  if (!isSupported(file.name)) {
    return new NextResponse(
      `Formato no soportado. Permitidos: ${SUPPORTED_EXTENSIONS.join(", ")}`,
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
    return new NextResponse("El archivo supera 25 MB", { status: 413 });
  }

  const supabase = await getServerClient();
  const sourceId = crypto.randomUUID();
  const fileName = safeName(file.name);
  // Ruta forzada {user_id}/{source_id}/{filename} (las políticas lo exigen).
  const storagePath = `${user.id}/${sourceId}/${fileName}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (upErr) return new NextResponse(upErr.message, { status: 500 });

  const { data, error } = await supabase
    .from("sources")
    .insert({
      id: sourceId,
      user_id: user.id,
      type: "document",
      title: file.name,
      file_name: fileName,
      mime_type: file.type || null,
      storage_path: storagePath,
      status: "uploaded",
    })
    .select(
      "id, type, title, file_name, mime_type, url, status, error, chunk_count, created_at",
    )
    .single();

  if (error) {
    // Limpieza best-effort si falla la fila.
    await getAdminClient().storage.from(STORAGE_BUCKET).remove([storagePath]);
    return new NextResponse(error.message, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE ?id= : borra fuente (chunks por cascade) + objeto en Storage.
export async function DELETE(request: NextRequest) {
  const user = await getUser();
  if (!user) return new NextResponse("No autenticado", { status: 401 });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return new NextResponse("Falta id", { status: 400 });

  const supabase = await getServerClient();
  const { data: source } = await supabase
    .from("sources")
    .select("storage_path")
    .eq("id", id)
    .single();

  if (source?.storage_path) {
    await supabase.storage.from(STORAGE_BUCKET).remove([source.storage_path]);
  }

  const { error } = await supabase.from("sources").delete().eq("id", id);
  if (error) return new NextResponse(error.message, { status: 500 });

  return new NextResponse(null, { status: 204 });
}
