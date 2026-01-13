import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';

// 기록 목록 가져오기
export async function GET() {
  try {
    const result = await sql`SELECT * FROM vote_history ORDER BY created_at DESC`;
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}

// 투표 종료 처리 (현재 상태 저장 후 초기화)
export async function POST() {
  try {
    // 1. 현재 투표 현황과 투표자 명단을 상세하게 조회
    const currentStatus = await sql`
      SELECT 
        i.label, 
        COUNT(v.user_id)::int as count,
        COALESCE(JSON_AGG(v.user_name) FILTER (WHERE v.user_name IS NOT NULL), '[]') as voters
      FROM vote_items i
      LEFT JOIN votes v ON i.id = v.item_id
      GROUP BY i.label
      ORDER BY count DESC
    `;
    
    // 2. JSON 형태로 변환
    const historyData = JSON.stringify(currentStatus.rows);

    // 3. 기록 테이블에 저장
    await sql`INSERT INTO vote_history (result_data) VALUES (${historyData})`;

    // 4. 현재 투표함 초기화 (Reset)
    await sql`DELETE FROM votes`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error }, { status: 500 });
  }
}

// 기록 삭제
export async function DELETE(request: Request) {
  const { id } = await request.json();
  try {
    await sql`DELETE FROM vote_history WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}