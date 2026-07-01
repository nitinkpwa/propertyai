import { NextRequest, NextResponse } from "next/server";
import type { AskChatMessage, AskConversation } from "@/lib/ask/conversations/types";
import {
  deleteUserConversation,
  fetchUserConversationById,
  saveUserConversation,
} from "@/lib/ask/conversations/serverQueries";
import { createSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase/server";

function sanitizeConversation(raw: unknown): AskConversation | null {
  if (typeof raw !== "object" || raw === null) return null;
  const c = raw as Record<string, unknown>;
  if (typeof c.id !== "string" || typeof c.title !== "string") return null;

  const messages = Array.isArray(c.messages)
    ? (c.messages as AskChatMessage[])
    : [];

  return {
    id: c.id,
    title: c.title,
    createdAt: typeof c.createdAt === "string" ? c.createdAt : new Date().toISOString(),
    updatedAt: typeof c.updatedAt === "string" ? c.updatedAt : new Date().toISOString(),
    propertyContext: (c.propertyContext as AskConversation["propertyContext"]) ?? null,
    messages,
    suggestedPropertyIds: Array.isArray(c.suggestedPropertyIds)
      ? (c.suggestedPropertyIds as string[])
      : [],
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const conversation = await fetchUserConversationById(supabase, user.id, id);

  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ conversation });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const conversation = sanitizeConversation(body.conversation);

  if (!conversation || conversation.id !== id) {
    return NextResponse.json({ error: "Invalid conversation payload" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const saved = await saveUserConversation(supabase, user.id, conversation);

  if (!saved) {
    return NextResponse.json({ error: "Failed to save conversation" }, { status: 500 });
  }

  return NextResponse.json({ conversation: saved });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const ok = await deleteUserConversation(supabase, user.id, id);

  if (!ok) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
