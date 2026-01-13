import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 항목별 투표수 조회
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
    return NextResponse.json({ error }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { type, id, label, userId, userName } = body; // userName 추가됨

  try {
    if (type === 'vote') {
      // 이름(userName)도 같이 저장
      await sql`
        INSERT INTO votes (user_id, item_id, user_name) 
        VALUES (${userId}, ${id}, ${userName}) 
        ON CONFLICT (user_id, item_id) 
        DO UPDATE SET user_name = ${userName} -- 혹시 이름 바뀌었으면 갱신
      `;
    } else if (type === 'unvote') {
      await sql`DELETE FROM votes WHERE user_id = ${userId} AND item_id = ${id}`;
    } else if (type === 'updateLabel') {
      await sql`UPDATE vote_items SET label = ${label} WHERE id = ${id}`;
    } else if (type === 'reset') {
      await sql`DELETE FROM votes`;
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error }, { status: 500 });
  }
}