'use client';

import useSWR from 'swr';

// 데이터 가져오는 함수 (fetch wrapper)
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AdminPage() {
  // 1초마다 데이터 갱신 (실시간 랭킹 반영)
  const { data: items, mutate } = useSWR('/api/vote', fetcher, { refreshInterval: 1000 });

  // 랭킹 계산
  const top3 = items 
    ? [...items].sort((a: any, b: any) => b.count - a.count).slice(0, 3) 
    : [];

  const handleLabelUpdate = async (id: number, newLabel: string) => {
    await fetch('/api/vote', {
      method: 'POST',
      body: JSON.stringify({ type: 'updateLabel', id, label: newLabel }),
    });
    mutate(); // 즉시 갱신
  };

  const handleReset = async () => {
    if (!confirm('투표 결과를 0으로 초기화하시겠습니까?')) return;
    await fetch('/api/vote', {
      method: 'POST',
      body: JSON.stringify({ type: 'reset' }),
    });
    mutate();
  };

  if (!items) return <div className="p-10 text-center">로딩중...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-3xl mx-auto">
      <div className="bg-white p-6 rounded-2xl shadow-sm mb-6 border border-gray-200 relative">
        <h2 className="text-lg font-bold mb-3 text-gray-800">🏆 실시간 랭킹</h2>
        <div className="space-y-2">
          {top3.map((item: any, index: number) => (
            <div key={item.id} className="flex items-center text-sm">
              <span className={`font-bold mr-2 w-8 ${index === 0 ? 'text-red-500' : 'text-gray-600'}`}>
                {index + 1}등
              </span>
              <span className="flex-1 font-medium">{item.label}</span>
              <span className="text-gray-500 font-bold">{item.count}표</span>
            </div>
          ))}
        </div>
        
        <button 
          onClick={handleReset}
          className="absolute top-6 right-6 bg-red-100 text-red-600 hover:bg-red-200 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
        >
          Clear (초기화)
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 md:gap-4">
        {items.map((item: any) => (
          <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center">
            <div className="text-3xl font-black text-indigo-600 mb-2">
              {item.count}
            </div>
            <input 
              type="text" 
              defaultValue={item.label}
              onBlur={(e) => handleLabelUpdate(item.id, e.target.value)}
              className="w-full text-center border-b-2 border-gray-200 focus:border-indigo-500 outline-none py-1 text-gray-700 font-medium transition-colors"
              placeholder="항목 이름"
            />
          </div>
        ))}
      </div>
    </div>
  );
}