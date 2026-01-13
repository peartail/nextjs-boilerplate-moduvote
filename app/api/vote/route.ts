import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // vote_items(항목)와 votes(투표내역)를 합쳐서(JOIN) 개수를 센 결과를 가져옴
    // COALESCE는 NULL일 경우 0으로 바꿔주는 함수
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
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { type, id, label, userId } = body; // userId가 추가됨

  try {
    if (type === 'vote') {
      // 투표 기록 추가 (중복이면 아무일도 안함 - ON CONFLICT DO NOTHING)
      await sql`
        INSERT INTO votes (user_id, item_id) 
        VALUES (${userId}, ${id}) 
        ON CONFLICT (user_id, item_id) DO NOTHING
      `;
    } else if (type === 'unvote') {
      // 투표 기록 삭제
      await sql`DELETE FROM votes WHERE user_id = ${userId} AND item_id = ${id}`;
    } else if (type === 'updateLabel') {
      await sql`UPDATE vote_items SET label = ${label} WHERE id = ${id}`;
    } else if (type === 'reset') {
      // 기록 테이블을 싹 비움
      await sql`DELETE FROM votes`;
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error }, { status: 500 });
  }
}