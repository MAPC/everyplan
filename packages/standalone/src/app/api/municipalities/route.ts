import { NextRequest, NextResponse } from 'next/server';
import { getMunicipalities } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    const municipalities = getMunicipalities();

    return NextResponse.json(municipalities);
  } catch (error) {
    console.error('Error fetching municipalities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch municipalities' },
      { status: 500 }
    );
  }
}
