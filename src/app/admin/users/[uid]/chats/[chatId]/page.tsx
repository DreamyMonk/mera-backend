"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Alert, Spinner } from "@/components/ui";
import { adminApi } from "@/lib/client/firebase";
import type { TranscriptItem } from "@/lib/shared/types";

type Chat = { id: string; title: string; createdAt: number; updatedAt: number; transcript: TranscriptItem[] };

function Item({ item }: { item: TranscriptItem }) {
  switch (item.kind) {
    case "user":
      return <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-gradient-to-br from-[#6d5dfc] to-[#c056f2] px-4 py-2.5 whitespace-pre-wrap text-white">{item.text}</div>;
    case "assistant":
      return <div className="max-w-[90%] rounded-2xl rounded-bl-md border border-zinc-200 bg-white px-4 py-2.5 whitespace-pre-wrap">{item.text}</div>;
    case "step":
      return <div className="pl-2 text-sm text-zinc-500">› {item.text}</div>;
    case "stepError":
    case "error":
      return <div className="pl-2 text-sm text-red-600">⚠ {item.text}</div>;
    default:
      return <div className="pl-2 text-sm text-zinc-400 italic">{item.text}</div>;
  }
}

export default function ChatView() {
  const { uid, chatId } = useParams<{ uid: string; chatId: string }>();
  const [chat, setChat] = useState<Chat | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi<{ chat: Chat }>(`/api/admin/users/${uid}/chats/${chatId}`).then((r) => setChat(r.chat)).catch((e) => setError(e.message));
  }, [uid, chatId]);

  if (error) return <Alert>{error}</Alert>;
  if (!chat) return <div className="text-violet-600"><Spinner /></div>;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/admin/users/${uid}`} className="text-sm text-violet-700 hover:underline">← Back to user</Link>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">{chat.title}</h1>
      <p className="text-sm text-zinc-500">
        Started {new Date(chat.createdAt).toLocaleString()} · updated {new Date(chat.updatedAt).toLocaleString()}
      </p>
      <div className="mt-6 flex flex-col gap-3">
        {chat.transcript.map((item, i) => (
          <Item key={i} item={item} />
        ))}
      </div>
    </div>
  );
}
