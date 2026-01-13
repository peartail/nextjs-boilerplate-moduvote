import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await sql`SELECT * FROM vote_items ORDER BY id ASC`;
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { type, id, label } = body;

  try {
    if (type === 'vote') {
      await sql`UPDATE vote_items SET count = count + 1 WHERE id = ${id}`;
    } else if (type === 'updateLabel') {
      await sql`UPDATE vote_items SET label = ${label} WHERE id = ${id}`;
    } else if (type === 'reset') {
      await sql`UPDATE vote_items SET count = 0`;
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}