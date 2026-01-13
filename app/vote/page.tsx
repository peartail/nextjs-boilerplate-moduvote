'use client';
import useSWR from 'swr';
import { useState, useEffect } from 'react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function VotePage() {
  const { data: items, mutate } = useSWR('/api/vote', fetcher, { refreshInterval: 1000 });
  const [activeIds, setActiveIds] = useState<number[]>([]);

  useEffect(() => {
    if (items && items.reduce((acc: number, cur: any) => acc + cur.count, 0) === 0) {
      setActiveIds([]);
    }
  }, [items]);

  const handleVote = async (id: number) => {
    if (!activeIds.includes(id)) setActiveIds([...activeIds, id]);
    await fetch('/api/vote', { method: 'POST', body: JSON.stringify({ type: 'vote', id }) });
    mutate();
  };

  if (!items) return <div className="p-10 text-center">로딩중...</div>;

  return (
    <div className="min-h-screen bg-slate-900 p-4 flex flex-col items-center justify-center">
      <div className="grid grid-cols-3 gap-3 w-full max-w-md aspect-square">
        {items.map((item: any) => (
          <button
            key={item.id}
            onClick={() => handleVote(item.id)}
            className={`rounded-xl p-2 font-bold text-lg transition-all ${
              activeIds.includes(item.id) ? 'bg-yellow-400 text-black' : 'bg-slate-700 text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}