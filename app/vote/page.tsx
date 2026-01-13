'use client';
import useSWR from 'swr';
import { useState, useEffect } from 'react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function VotePage() {
  const { data: items, mutate } = useSWR('/api/vote', fetcher, { refreshInterval: 1000 });
  
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState(''); // 시스템 내부용 고유 ID
  const [activeIds, setActiveIds] = useState<number[]>([]);

  // 초기화: 사용자 ID 생성 및 로드
  useEffect(() => {
    // 1. 사용자 ID (브라우저 식별자)
    let storedUserId = localStorage.getItem('vote_sys_userId');
    if (!storedUserId) {
      storedUserId = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      localStorage.setItem('vote_sys_userId', storedUserId);
    }
    setUserId(storedUserId);

    // 2. 사용자 이름 (표시용)
    const savedName = localStorage.getItem('vote_userName');
    if (savedName) setUserName(savedName);

    // 3. 내 투표 기록 (로컬 UI 동기화용)
    const savedVotes = localStorage.getItem('vote_activeIds');
    if (savedVotes) setActiveIds(JSON.parse(savedVotes));
  }, []);

  // 리셋 감지
  useEffect(() => {
    if (items) {
      const totalVotes = items.reduce((sum: number, item: any) => sum + item.count, 0);
      if (totalVotes === 0) {
        setActiveIds([]);
        localStorage.removeItem('vote_activeIds');
      }
    }
  }, [items]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setUserName(name);
    localStorage.setItem('vote_userName', name);
  };

  const toggleVote = async (id: number) => {
    if (!userName.trim()) {
      alert("이름을 입력해야 투표할 수 있습니다!");
      return;
    }

    let newActiveIds;
    const isAlreadyVoted = activeIds.includes(id);

    // UI 즉시 반영 (Optimistic UI)
    if (isAlreadyVoted) {
      newActiveIds = activeIds.filter((voteId) => voteId !== id);
      // 서버 요청: 내 ID(userId)로 투표 취소
      await fetch('/api/vote', {
        method: 'POST',
        body: JSON.stringify({ type: 'unvote', id, userId }),
      });
    } else {
      newActiveIds = [...activeIds, id];
      // 서버 요청: 내 ID(userId)로 투표
      await fetch('/api/vote', {
        method: 'POST',
        body: JSON.stringify({ type: 'vote', id, userId }),
      });
    }

    setActiveIds(newActiveIds);
    localStorage.setItem('vote_activeIds', JSON.stringify(newActiveIds));
    mutate();
  };

  if (!items) return <div className="h-screen flex items-center justify-center text-white">로딩중...</div>;

  return (
    <div className="min-h-screen bg-slate-900 p-4 flex flex-col items-center justify-center">
      <div className="mb-8 w-full max-w-md">
        <label className="block text-slate-400 text-sm mb-2 text-center">참가자 이름</label>
        <input 
          type="text" 
          value={userName}
          onChange={handleNameChange}
          placeholder="이름 입력 필수"
          className="w-full p-3 rounded-lg bg-slate-800 text-white text-center border border-slate-700 focus:border-yellow-400 outline-none"
        />
      </div>

      <div className="grid grid-cols-3 gap-3 w-full max-w-md aspect-square">
        {items.map((item: any) => {
          const isActive = activeIds.includes(item.id);
          return (
            <button
              key={item.id}
              onClick={() => toggleVote(item.id)}
              className={`
                relative rounded-2xl flex flex-col items-center justify-center p-2 transition-all duration-200 active:scale-95
                ${isActive 
                  ? 'bg-yellow-400 text-slate-900 shadow-[0_0_20px_rgba(250,204,21,0.6)] translate-y-1' 
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600 shadow-lg'
                }
              `}
            >
              <span className="text-sm md:text-lg font-bold text-center break-keep leading-tight px-1">
                {item.label}
              </span>
              {isActive && (
                <div className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full animate-bounce" />
              )}
            </button>
          );
        })}
      </div>
      
      {/* (개발용) 내 고유 ID 확인 */}
      <p className="text-slate-600 text-[10px] mt-8">System ID: {userId}</p>
    </div>
  );
}