import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cleanSymbol } from "@/lib/format";
import type { PublicShareLink } from "@/lib/types";
import { TraderProfileClient } from "@/components/shares/trader-profile-client";

export const dynamic = "force-dynamic";

// Reserved route names to avoid route collisions
const RESERVED_NAMES = new Set([
  "watchlist",
  "trades",
  "journal",
  "settings",
  "analytics",
  "risk",
  "notifications",
  "shares",
  "login",
  "auth",
  "api",
  "public",
  "share",
  "_next",
  "favicon.ico",
]);

interface PageProps {
  params: Promise<{
    username: string;
  }>;
}

interface ProfileData {
  userId: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  twitterHandle: string | null;
  telegramChannel: string | null;
  isProfilePublic: boolean;
  shares: PublicShareLink[];
}

async function getTraderProfileData(username: string): Promise<ProfileData | null> {
  const cleanUsername = username.toLowerCase();
  if (RESERVED_NAMES.has(cleanUsername)) {
    return null;
  }

  const supabase = await createClient();

  // Find user by username
  const { data: settings } = await supabase
    .from("user_settings")
    .select("user_id, username, display_name, bio, avatar_url, twitter_handle, telegram_channel, is_profile_public")
    .eq("username", cleanUsername)
    .maybeSingle();

  if (!settings || settings.is_profile_public === false) {
    return null;
  }

  // Find active public share links for this user
  const { data: sharesData } = await supabase
    .from("public_share_links")
    .select("*")
    .eq("user_id", settings.user_id)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const shares: PublicShareLink[] = (sharesData || []).map((s) => ({
    ...s,
    username: settings.username,
  }));

  return {
    userId: settings.user_id,
    username: settings.username,
    displayName: settings.display_name,
    bio: settings.bio,
    avatarUrl: settings.avatar_url,
    twitterHandle: settings.twitter_handle,
    telegramChannel: settings.telegram_channel,
    isProfilePublic: settings.is_profile_public !== false,
    shares,
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const data = await getTraderProfileData(username);

  if (!data) {
    return {
      title: "Trader Not Found | Tape",
      description: "This public trader profile is unavailable or private.",
    };
  }

  const name = data.displayName || `@${data.username}`;
  const title = `👤 ${name} — Public Trader Setup Profile | Tape`;
  const description = data.bio || `Explore public Watchlist Radars and Trade Setups by @${data.username} on Tape.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      siteName: "Tape Trading Setup Journal",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function TraderProfilePage({ params }: PageProps) {
  const { username } = await params;
  const data = await getTraderProfileData(username);

  if (!data) {
    notFound();
  }

  return (
    <TraderProfileClient
      username={data.username}
      displayName={data.displayName}
      bio={data.bio}
      avatarUrl={data.avatarUrl}
      twitterHandle={data.twitterHandle}
      telegramChannel={data.telegramChannel}
      shares={data.shares}
    />
  );
}
