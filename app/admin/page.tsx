'use client';

import useSWR from 'swr';
import { clsx } from 'clsx';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AdminPage() {
  // 현재 투표 현황
  const { data: items, mutate: mutateItems } = useSWR('/api/vote', fetcher, { refreshInterval: 1000 });
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

  // 투표 종료 (스냅샷 저장 및 초기화)
  const handleFinishVote = async () => {
    if (!confirm('투표를 종료하고 결과를 저장하시겠습니까?\n(현재 투표는 초기화됩니다)')) return;
    
    const res = await fetch('/api/history', { method: 'POST' });
    if (res.ok) {
      alert("투표가 종료되고 결과가 저장되었습니다.");
      mutateItems();   // 현재 투표 0으로 초기화
      mutateHistory(); // 기록 목록 갱신
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
      {/* 1. 상단 컨트롤 패널 */}
      <div className="bg-white p-6 rounded-2xl shadow-sm mb-8 border border-gray-200 relative">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">🏆 실시간 랭킹</h2>
            <p className="text-sm text-gray-500">현재 진행 중인 투표 현황입니다.</p>
          </div>
          <button 
            onClick={handleFinishVote}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-bold shadow transition-colors"
          >
            투표 종료 & 결과 저장
          </button>
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

      {/* 2. 현재 투표 버튼 및 설정 */}
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

      {/* 3. 투표 결과 리스트 (History) */}
      <h3 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">📂 지난 투표 결과</h3>
      <div className="space-y-8">
        {historyList?.map((history: any) => {
          const results = history.result_data; // JSON 데이터
          const totalVotes = results.reduce((acc: number, cur: any) => acc + cur.count, 0);
          
          // 1,2,3등 추출
          const rankText = results.slice(0, 3).map((r: any, i: number) => 
            `${i+1}등: ${r.label}(${r.count}표)`
          ).join(' / ');

          return (
            <div key={history.id} className="bg-white p-6 rounded-2xl shadow-md relative group/card">
              {/* 삭제 버튼 */}
              <button 
                onClick={() => handleDeleteHistory(history.id)}
                className="absolute top-4 right-4 text-gray-400 hover:text-red-500 p-1"
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
                  if (r.count === 0) return null; // 0표는 그래프 숨김
                  const percent = totalVotes > 0 ? (r.count / totalVotes) * 100 : 0;
                  
                  return (
                    <div key={idx} className="flex items-center text-sm group/bar relative">
                      {/* 라벨 */}
                      <div className="w-24 truncate text-right mr-3 font-medium text-gray-600">
                        {r.label}
                      </div>
                      
                      {/* 막대 그래프 배경 */}
                      <div className="flex-1 h-8 bg-gray-100 rounded-r-lg relative flex items-center">
                        {/* 실제 막대 */}
                        <div 
                          className={clsx("h-full rounded-r-lg transition-all duration-500 flex items-center px-2 text-white font-bold text-xs", 
                            idx === 0 ? "bg-red-500" : 
                            idx === 1 ? "bg-orange-400" : "bg-blue-400"
                          )}
                          style={{ width: `${percent}%` }}
                        >
                        </div>
                        
                        {/* 막대 우측 텍스트 (몇 표) */}
                        <span className="ml-2 text-gray-600 font-bold text-xs absolute left-full pl-2 w-10">
                          {r.count}회
                        </span>

                        {/* 🔥 마우스 오버 팝업 (투표자 명단) */}
                        <div className="hidden group-hover/bar:block absolute bottom-full left-10 mb-2 z-10 w-48 bg-gray-800 text-white text-xs rounded-lg p-3 shadow-xl pointer-events-none">
                          <div className="font-bold border-b border-gray-600 pb-1 mb-1 text-yellow-400">
                            {r.label} 투표자 ({r.count}명)
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {r.voters.map((name: string, i: number) => (
                              <span key={i} className="bg-gray-700 px-1 rounded">{name}</span>
                            ))}
                          </div>
                          {/* 말풍선 꼬리 */}
                          <div className="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-gray-800"></div>
                        </div>
                      </div>
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