'use client';
import useSWR from 'swr';
import { useState, useEffect, useRef } from 'react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function VotePage() {
  const { data: items, mutate } = useSWR('/api/vote', fetcher, { 
    refreshInterval: 1000,
    revalidateOnFocus: false // 탭 전환 시 불필요한 깜빡임 방지
  });
  
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [activeIds, setActiveIds] = useState<number[]>([]);

  // 디바운싱을 위한 타이머 저장소
  const debounceTimers = useRef<{ [key: number]: NodeJS.Timeout }>({});
  
  // 클로저 문제 해결을 위해 최신 상태를 Ref로 추적
  const activeIdsRef = useRef<number[]>([]);

  // 초기화
  useEffect(() => {
    let storedUserId = localStorage.getItem('vote_sys_userId');
    if (!storedUserId) {
      storedUserId = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      localStorage.setItem('vote_sys_userId', storedUserId);
    }
    setUserId(storedUserId);

    const savedName = localStorage.getItem('vote_userName');
    if (savedName) setUserName(savedName);

    const savedVotes = localStorage.getItem('vote_activeIds');
    if (savedVotes) {
      const parsed = JSON.parse(savedVotes);
      setActiveIds(parsed);
      activeIdsRef.current = parsed; // Ref 동기화
    }
  }, []);

  // 리셋 감지
  useEffect(() => {
    if (items) {
      const totalVotes = items.reduce((sum: number, item: any) => sum + item.count, 0);
      if (totalVotes === 0) {
        setActiveIds([]);
        activeIdsRef.current = [];
        localStorage.removeItem('vote_activeIds');
      }
    }
  }, [items]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setUserName(name);
    localStorage.setItem('vote_userName', name);
  };

  // ✅ 핵심 로직 수정: 화면 즉시 반영 + 서버 요청 지연 전송
  const toggleVote = (id: number) => {
    if (!userName.trim()) {
      alert("이름을 입력해야 투표할 수 있습니다!");
      return;
    }

    // 1. 기존 타이머가 있다면 취소 (이전 클릭 무시)
    if (debounceTimers.current[id]) {
      clearTimeout(debounceTimers.current[id]);
    }

    // 2. 현재 상태 기준으로 UI 즉시 변경 (낙관적 업데이트)
    let newActiveIds;
    if (activeIds.includes(id)) {
      newActiveIds = activeIds.filter((voteId) => voteId !== id);
    } else {
      newActiveIds = [...activeIds, id];
    }

    // 상태와 로컬스토리지, Ref 즉시 업데이트
    setActiveIds(newActiveIds);
    activeIdsRef.current = newActiveIds; 
    localStorage.setItem('vote_activeIds', JSON.stringify(newActiveIds));

    // 3. 0.5초 뒤에 서버로 "최종 상태" 전송 (디바운싱)
   debounceTimers.current[id] = setTimeout(async () => {
      const isFinallyActive = activeIdsRef.current.includes(id);
      const type = isFinallyActive ? 'vote' : 'unvote';
      
      try {
        await fetch('/api/vote', {
          method: 'POST',
          // ✅ 수정됨: userName을 같이 보냄
          body: JSON.stringify({ type, id, userId, userName }),
        });
        mutate();
      } catch (error) {
        console.error("투표 전송 실패", error);
      }
    }, 500);// 500ms 딜레이 (취향에 따라 300~500 조절 가능)
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
                relative rounded-2xl flex flex-col items-center justify-center p-2 transition-all duration-100 active:scale-95
                ${isActive 
                  ? 'bg-yellow-400 text-slate-900 shadow-[0_0_20px_rgba(250,204,21,0.6)] translate-y-1' 
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600 shadow-lg'
                }
              `}
            >
              <span className="text-sm md:text-lg font-bold text-center break-keep leading-tight px-1 select-none">
                {item.label}
              </span>
              {isActive && (
                <div className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}