'use client';
import useSWR from 'swr';
import { useState, useEffect } from 'react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function VotePage() {
  const { data: items, mutate } = useSWR('/api/vote', fetcher, { refreshInterval: 1000 });
  
  const [userName, setUserName] = useState('');
  const [activeIds, setActiveIds] = useState<number[]>([]);

  // 페이지 로드 시, 브라우저에 저장된 내 이름과 투표 기록 불러오기
  useEffect(() => {
    const savedName = localStorage.getItem('vote_userName');
    const savedVotes = localStorage.getItem('vote_activeIds');
    if (savedName) setUserName(savedName);
    if (savedVotes) setActiveIds(JSON.parse(savedVotes));
  }, []);

  // 진행자가 'Clear'를 눌러 총 투표수가 0이 되면, 내 화면 불도 끔
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
    localStorage.setItem('vote_userName', name); // 이름 저장
  };

  const toggleVote = async (id: number) => {
    if (!userName.trim()) {
      alert("투표를 하려면 이름을 먼저 입력해주세요!");
      return;
    }

    let newActiveIds;
    const isAlreadyVoted = activeIds.includes(id);

    // 1. 상태 업데이트 (UI 즉시 반영)
    if (isAlreadyVoted) {
      // 이미 투표했으면 -> 취소 (Unvote)
      newActiveIds = activeIds.filter((voteId) => voteId !== id);
      await fetch('/api/vote', {
        method: 'POST',
        body: JSON.stringify({ type: 'unvote', id }),
      });
    } else {
      // 투표 안했으면 -> 투표 (Vote)
      newActiveIds = [...activeIds, id];
      await fetch('/api/vote', {
        method: 'POST',
        body: JSON.stringify({ type: 'vote', id }),
      });
    }

    // 2. 상태 저장
    setActiveIds(newActiveIds);
    localStorage.setItem('vote_activeIds', JSON.stringify(newActiveIds));
    mutate(); // 데이터 갱신
  };

  if (!items) return <div className="h-screen flex items-center justify-center text-white">로딩중...</div>;

  return (
    <div className="min-h-screen bg-slate-900 p-4 flex flex-col items-center justify-center">
      {/* 상단 이름 입력 영역 */}
      <div className="mb-8 w-full max-w-md">
        <label className="block text-slate-400 text-sm mb-2 text-center">참가자 이름</label>
        <input 
          type="text" 
          value={userName}
          onChange={handleNameChange}
          placeholder="이름을 입력하세요"
          className="w-full p-3 rounded-lg bg-slate-800 text-white text-center border border-slate-700 focus:border-yellow-400 outline-none transition-colors"
        />
      </div>

      {/* 투표 버튼 그리드 */}
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
              
              {/* 선택됨 표시 아이콘 */}
              {isActive && (
                <div className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full animate-bounce" />
              )}
            </button>
          );
        })}
      </div>
      <p className="text-slate-500 text-xs mt-8">
        {userName ? `${userName}님, 원하는 항목을 선택/해제 하세요.` : "이름을 입력해야 투표할 수 있습니다."}
      </p>
    </div>
  );
}