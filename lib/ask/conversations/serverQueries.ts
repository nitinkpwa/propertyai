import type { PropertyContext } from "@/lib/ask/engine/types";
import type { AskConversation, AskConversationSummary, AskChatMessage } from "./types";

interface DbConversationRow {
  id: string;
  user_id: string;
  title: string;
  messages: AskChatMessage[] | null;
  property_context: PropertyContext | null;
  suggested_property_ids: string[] | null;
  created_at: string;
  updated_at: string;
}

function rowToConversation(row: DbConversationRow): AskConversation {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    propertyContext: row.property_context ?? null,
    messages: Array.isArray(row.messages) ? row.messages : [],
    suggestedPropertyIds: row.suggested_property_ids ?? [],
  };
}

function rowToSummary(row: DbConversationRow): AskConversationSummary {
  const messages = Array.isArray(row.messages) ? row.messages : [];
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    messageCount: messages.length,
    preview: lastUser?.content,
  };
}

export async function fetchUserConversationSummaries(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  userId: string,
): Promise<AskConversationSummary[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("id, user_id, title, messages, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("fetchUserConversationSummaries:", error.message);
    return [];
  }

  return ((data ?? []) as DbConversationRow[]).map(rowToSummary);
}

export async function fetchUserConversationById(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  userId: string,
  conversationId: string,
): Promise<AskConversation | null> {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("fetchUserConversationById:", error.message);
    return null;
  }

  return rowToConversation(data as DbConversationRow);
}

export async function createUserConversation(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  userId: string,
  title: string,
  propertyContext?: PropertyContext | null,
): Promise<AskConversation | null> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("conversations")
    .insert({
      user_id: userId,
      title,
      messages: [],
      property_context: propertyContext ?? null,
      suggested_property_ids: [],
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("createUserConversation:", error?.message);
    return null;
  }

  return rowToConversation(data as DbConversationRow);
}

export async function saveUserConversation(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  userId: string,
  conversation: AskConversation,
): Promise<AskConversation | null> {
  const { data, error } = await supabase
    .from("conversations")
    .update({
      title: conversation.title,
      messages: conversation.messages,
      property_context: conversation.propertyContext ?? null,
      suggested_property_ids: conversation.suggestedPropertyIds,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversation.id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error || !data) {
    console.error("saveUserConversation:", error?.message);
    return null;
  }

  return rowToConversation(data as DbConversationRow);
}

export async function deleteUserConversation(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  userId: string,
  conversationId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("conversations")
    .delete()
    .eq("id", conversationId)
    .eq("user_id", userId);

  if (error) {
    console.error("deleteUserConversation:", error.message);
    return false;
  }
  return true;
}
