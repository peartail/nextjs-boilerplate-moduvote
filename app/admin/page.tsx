'use client';

import useSWR from 'swr';
import { clsx } from 'clsx';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AdminPage() {
  // 현재 투표 현황 (items와 mode를 함께 받아옴)
  const { data, mutate: mutateItems } = useSWR('/api/vote', fetcher, { refreshInterval: 1000 });
  
  const items = data?.items; // 투표 항목 리스트
  const mode = data?.mode || 'single'; // 현재 모드 (기본값 single)

  // 투표 기록(History)
  const { data: historyList, mutate: mutateHistory } = useSWR('/api/history', fetcher);

  // 실시간 랭킹 계산
  const top3 = items 
    ? [...items].sort((a: any, b: any) => b.count - a.count).slice(0, 3) 
    : [];

  // 라벨 수정
  const handleLabelUpdate = async (id: number, newLabel: string) => {
    await fetch('/api/vote', {
      method: 'POST',
      body: JSON.stringify({ type: 'updateLabel', id, label: newLabel }),
    });
    mutateItems();
  };

  // 1. 단순 초기화 (Clear)
  const handleReset = async () => {
    if (!confirm('경고: 현재 진행 중인 투표가 모두 사라집니다.\n정말 초기화 하시겠습니까?')) return;
    
    await fetch('/api/vote', {
      method: 'POST',
      body: JSON.stringify({ type: 'reset' }),
    });
    mutateItems();
  };

  // ✅ 모드 변경 토글 (단수 <-> 복수)
  const handleToggleMode = async () => {
    const newMode = mode === 'single' ? 'multiple' : 'single';
    const modeName = newMode === 'single' ? '단수투표' : '복수투표';
    
    if (!confirm(`투표 방식을 '${modeName}'로 변경하시겠습니까?\n(변경 시 현재 투표는 초기화됩니다)`)) return;

    await fetch('/api/vote', {
      method: 'POST',
      body: JSON.stringify({ type: 'setMode', mode: newMode }),
    });
    mutateItems(); // 데이터 갱신
  };

  // 2. 투표 종료 (Finish)
  const handleFinishVote = async () => {
    if (!confirm('투표를 종료하고 결과를 저장하시겠습니까?\n(현재 투표는 초기화됩니다)')) return;
    
    const res = await fetch('/api/history', { method: 'POST' });
    if (res.ok) {
      alert("투표가 종료되고 결과가 저장되었습니다.");
      mutateItems();   
      mutateHistory(); 
    }
  };

  // 기록 삭제
  const handleDeleteHistory = async (id: number) => {
    if (!confirm('이 기록을 삭제하시겠습니까?')) return;
    await fetch('/api/history', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    });
    mutateHistory();
  };

  if (!items) return <div className="p-10 text-center">로딩중...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6 max-w-4xl mx-auto">
      {/* 상단 컨트롤 패널 */}
      <div className="bg-white p-6 rounded-2xl shadow-sm mb-8 border border-gray-200 relative">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800">🏆 실시간 랭킹</h2>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <p>현재 진행 중인 투표 현황입니다.</p>
              <span className="bg-gray-100 px-2 py-0.5 rounded text-xs border border-gray-300">
                현재: {mode === 'single' ? '단수투표' : '복수투표'}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {/* 초기화 버튼 */}
            <button 
              onClick={handleReset}
              className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-lg font-bold transition-colors text-sm border border-gray-300"
            >
              초기화 (Clear)
            </button>

            {/* ✅ 투표 모드 토글 버튼 */}
            <button 
              onClick={handleToggleMode}
              className={clsx(
                "px-4 py-2 rounded-lg font-bold transition-colors text-sm border shadow-sm",
                mode === 'single' 
                  ? "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100" 
                  : "bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100"
              )}
            >
              {mode === 'single' ? '단수투표' : '복수투표'}
            </button>
            
            {/* 투표 종료 버튼 */}
            <button 
              onClick={handleFinishVote}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold shadow transition-colors text-sm"
            >
              투표 종료 & 결과 저장
            </button>
          </div>
        </div>

        <div className="space-y-2 mb-2">
          {top3.map((item: any, index: number) => (
            <div key={item.id} className="flex items-center text-sm">
              <span className={clsx("font-bold mr-2 w-10", 
                index === 0 ? "text-red-600 text-lg" : 
                index === 1 ? "text-orange-500" : 
                index === 2 ? "text-yellow-600" : "text-gray-600"
              )}>
                {index + 1}등
              </span>
              <span className="flex-1 font-medium">{item.label}</span>
              <span className="text-gray-800 font-bold">{item.count}표</span>
            </div>
          ))}
        </div>
      </div>

      {/* 현재 투표 버튼 및 설정 */}
      <div className="grid grid-cols-3 gap-4 mb-12">
        {items.map((item: any) => (
          <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center">
            <div className="text-3xl font-black text-indigo-600 mb-2">{item.count}</div>
            <input 
              type="text" 
              defaultValue={item.label}
              onBlur={(e) => handleLabelUpdate(item.id, e.target.value)}
              className="w-full text-center border-b-2 border-gray-100 focus:border-indigo-500 outline-none py-1 text-gray-700 font-medium transition-colors"
            />
          </div>
        ))}
      </div>

      {/* 투표 결과 리스트 (History) */}
      <h3 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">📂 지난 투표 결과</h3>
      <div className="space-y-8">
        {historyList?.map((history: any) => {
          const results = history.result_data;
          const totalVotes = results.reduce((acc: number, cur: any) => acc + cur.count, 0);
          
          const rankText = results.slice(0, 3).map((r: any, i: number) => 
            `${i+1}등: ${r.label}(${r.count}표)`
          ).join(' / ');

          return (
            <div key={history.id} className="bg-white p-6 rounded-2xl shadow-md relative group/card">
              <button 
                onClick={() => handleDeleteHistory(history.id)}
                className="absolute top-4 right-4 text-gray-400 hover:text-red-500 p-1 font-bold"
                title="기록 삭제"
              >
                ✕
              </button>

              <div className="mb-4">
                <div className="text-xs text-gray-400 mb-1">
                  {new Date(history.created_at).toLocaleString()} 종료됨
                </div>
                <div className="font-bold text-lg text-gray-800 mb-1">
                  {rankText}
                </div>
                <div className="text-sm text-gray-500">총 투표수: {totalVotes}표</div>
              </div>

              {/* 그래프 영역 */}
              <div className="space-y-3">
                {results.map((r: any, idx: number) => {
                  if (r.count === 0) return null;
                  const percent = totalVotes > 0 ? (r.count / totalVotes) * 100 : 0;
                  
                  return (
                    <div key={idx} className="flex items-center text-sm group/bar relative">
                      <div className="w-24 truncate text-right mr-3 font-medium text-gray-600 shrink-0">
                        {r.label}
                      </div>
                      
                      <div className="flex-1 h-8 bg-gray-100 rounded-r-lg relative flex items-center">
                        <div 
                          className={clsx("h-full rounded-r-lg transition-all duration-500 flex items-center px-2 text-white font-bold text-xs relative", 
                            idx === 0 ? "bg-red-500" : 
                            idx === 1 ? "bg-orange-400" : "bg-blue-400"
                          )}
                          style={{ width: `${percent}%` }}
                        >
                          <div className="hidden group-hover/bar:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 w-max max-w-[250px] bg-gray-800 text-white text-xs rounded-lg p-3 shadow-xl pointer-events-none">
                            <div className="font-bold border-b border-gray-600 pb-1 mb-1 text-yellow-400">
                              {r.label} 투표자 ({r.count}명)
                            </div>
                            <div className="leading-relaxed break-words whitespace-normal">
                              {r.voters.join(', ')}
                            </div>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-800"></div>
                          </div>
                        </div>
                      </div>

                      <span className="ml-2 text-gray-600 font-bold text-xs w-12 shrink-0">
                        {r.count}회
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {(!historyList || historyList.length === 0) && (
          <p className="text-center text-gray-400 py-10">아직 저장된 투표 결과가 없습니다.</p>
        )}
      </div>
    </div>
  );
}