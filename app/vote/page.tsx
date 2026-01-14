'use client';
import useSWR from 'swr';
import { useState, useEffect, useRef } from 'react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function VotePage() {
  // 데이터 구조 분해 ({ items, mode })
  const { data, mutate } = useSWR('/api/vote', fetcher, { 
    refreshInterval: 1000,
    revalidateOnFocus: false 
  });
  
  const items = data?.items;
  const mode = data?.mode || 'single'; // 기본값 single

  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [activeIds, setActiveIds] = useState<number[]>([]);

  // 디바운싱 타이머 저장소
  const debounceTimers = useRef<{ [key: number]: NodeJS.Timeout }>({});
  
  // 클로저 문제 해결을 위한 최신 상태 추적 Ref
  const activeIdsRef = useRef<number[]>([]);

  // 초기화 (ID 생성 및 로컬스토리지 로드)
  useEffect(() => {
    // 1. 유저 고유 ID
    let storedUserId = localStorage.getItem('vote_sys_userId');
    if (!storedUserId) {
      storedUserId = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      localStorage.setItem('vote_sys_userId', storedUserId);
    }
    setUserId(storedUserId);

    // 2. 이름 불러오기
    const savedName = localStorage.getItem('vote_userName');
    if (savedName) setUserName(savedName);

    // 3. 내 투표 기록 불러오기
    const savedVotes = localStorage.getItem('vote_activeIds');
    if (savedVotes) {
      const parsed = JSON.parse(savedVotes);
      setActiveIds(parsed);
      activeIdsRef.current = parsed; 
    }
  }, []);

  // 리셋 감지 (서버 투표수가 0이 되면 내 화면도 초기화)
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

  // ✅ 핵심 로직: 디바운싱 + 이름 전송 + (단수/복수 처리)
  const toggleVote = (id: number) => {
    if (!userName.trim()) {
      alert("이름을 입력해야 투표할 수 있습니다!");
      return;
    }

    // 1. 기존 타이머 취소 (빠른 클릭 시 이전 요청 무시)
    if (debounceTimers.current[id]) {
      clearTimeout(debounceTimers.current[id]);
    }

    // 2. 화면 즉시 반영 (낙관적 업데이트) & 모드별 로직
    let newActiveIds: number[];

    if (mode === 'single') {
      // [단수투표]
      if (activeIds.includes(id)) {
        // 이미 선택된 것을 누르면 해제 (0개 선택 가능)
        newActiveIds = [];
      } else {
        // 새로운 것을 누르면 그것만 선택 (기존 것 해제)
        newActiveIds = [id];
      }
    } else {
      // [복수투표] (기존 로직)
      if (activeIds.includes(id)) {
        newActiveIds = activeIds.filter((voteId) => voteId !== id);
      } else {
        newActiveIds = [...activeIds, id];
      }
    }

    setActiveIds(newActiveIds);
    activeIdsRef.current = newActiveIds; 
    localStorage.setItem('vote_activeIds', JSON.stringify(newActiveIds));

    // 3. 0.5초 뒤 서버 전송
    // 단수투표 시 교체되는 경우:
    // 기존 선택된 ID는 newActiveIds에 없으므로 아래 로직에서 자동으로 'unvote' 전송됨
    // 새로 선택된 ID는 newActiveIds에 있으므로 'vote' 전송됨
    
    // 현재 조작한 ID에 대해서만 타이머 설정하면 부족할 수 있음 (단수투표 교체 시)
    // 따라서 단수투표 모드에서는 '모든' 아이템에 대해 상태 동기화를 확인하거나,
    // 간단히 여기서 클릭한 id뿐만 아니라, 기존에 선택되었던 id도 트리거해줘야 함.
    // 하지만 기존 로직(debounceTimers)은 id별로 동작함.
    
    // 개선된 로직: 변경이 발생한 모든 ID에 대해 서버 요청을 보낼 필요가 있음.
    // 단수투표에서 A -> B로 바꿀 때:
    // A: 선택됨 -> 해제됨 (서버에 unvote 보내야 함)
    // B: 해제됨 -> 선택됨 (서버에 vote 보내야 함)
    
    // 현재 함수는 `id`(클릭한 항목)만 인자로 받음.
    // 단수투표의 경우, 이전에 선택되었던 항목(prevId)도 찾아서 unvote 처리를 확실히 해줘야 함.
    // 다만, `toggleVote`가 실행되는 시점에서 `activeIds`는 아직 갱신 전 상태(이전 상태)를 가지고 있음.
    
    const prevActiveIds = activeIds; // 변경 전 상태

    // 영향 받는 모든 ID 수집 (클릭한 ID + 이전에 선택되어 있었던 ID들)
    const affectedIds = new Set([id, ...prevActiveIds]);

    affectedIds.forEach((targetId) => {
        // 각 영향받는 ID에 대해 디바운스 타이머 설정
        if (debounceTimers.current[targetId]) {
            clearTimeout(debounceTimers.current[targetId]);
        }

        debounceTimers.current[targetId] = setTimeout(async () => {
            const isFinallyActive = activeIdsRef.current.includes(targetId);
            const type = isFinallyActive ? 'vote' : 'unvote';
            
            try {
                await fetch('/api/vote', {
                    method: 'POST',
                    body: JSON.stringify({ type, id: targetId, userId, userName }),
                });
                mutate(); 
            } catch (error) {
                console.error("투표 전송 실패", error);
            }
        }, 500);
    });
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
          className="w-full p-3 rounded-lg bg-slate-800 text-white text-center border border-slate-700 focus:border-yellow-400 outline-none transition-colors"
        />
        <p className="text-slate-500 text-xs text-center mt-2">
            현재 모드: <span className="text-yellow-400 font-bold">{mode === 'single' ? '단수투표 (1개만 선택)' : '복수투표 (여러개 선택)'}</span>
        </p>
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
      
      <p className="text-slate-600 text-[10px] mt-8 text-center">
        {userName ? `${userName}님 접속중` : '이름을 입력해주세요'} 
        <br/> ID: {userId.slice(0, 8)}...
      </p>
    </div>
  );
}