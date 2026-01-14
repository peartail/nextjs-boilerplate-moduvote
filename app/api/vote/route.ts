import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. 설정 테이블이 없으면 생성 (안전장치)
    await sql`CREATE TABLE IF NOT EXISTS vote_settings (key TEXT PRIMARY KEY, value TEXT)`;

    // 2. 항목별 투표수 조회
    const result = await sql`
      SELECT 
        i.id, 
        i.label, 
        COUNT(v.user_id)::int as count 
      FROM vote_items i 
      LEFT JOIN votes v ON i.id = v.item_id 
      GROUP BY i.id, i.label 
      ORDER BY i.id ASC
    `;

    // 3. 현재 투표 모드 조회 (기본값: single)
    const modeResult = await sql`SELECT value FROM vote_settings WHERE key = 'vote_mode'`;
    const mode = modeResult.rows[0]?.value || 'single';

    // 배열이 아닌 객체 형태로 반환 ({ items, mode })
    return NextResponse.json({ items: result.rows, mode });
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { type, id, label, userId, userName, mode } = body; 

  try {
    if (type === 'vote') {
      // 투표 (기존 로직)
      await sql`
        INSERT INTO votes (user_id, item_id, user_name) 
        VALUES (${userId}, ${id}, ${userName}) 
        ON CONFLICT (user_id, item_id) 
        DO UPDATE SET user_name = ${userName}
      `;
    } else if (type === 'unvote') {
      // 투표 취소
      await sql`DELETE FROM votes WHERE user_id = ${userId} AND item_id = ${id}`;
    } else if (type === 'updateLabel') {
      // 라벨 수정
      await sql`UPDATE vote_items SET label = ${label} WHERE id = ${id}`;
    } else if (type === 'reset') {
      // 초기화
      await sql`DELETE FROM votes`;
    } else if (type === 'setMode') {
      // ✅ 모드 변경 및 초기화
      // 1. 모드 설정 저장
      await sql`
        INSERT INTO vote_settings (key, value) VALUES ('vote_mode', ${mode})
        ON CONFLICT (key) DO UPDATE SET value = ${mode}
      `;
      // 2. 투표 데이터 초기화 (Clear)
      await sql`DELETE FROM votes`;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error }, { status: 500 });
  }
}