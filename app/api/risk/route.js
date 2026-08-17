import { NextResponse } from 'next/server';
import { calculatePressure } from '@/lib/risk';

export async function POST(request) {
  try {
    return NextResponse.json(calculatePressure(await request.json()));
  } catch (error) {
    return NextResponse.json({ error: 'Please answer every check-in question.' }, { status: 400 });
  }
}
