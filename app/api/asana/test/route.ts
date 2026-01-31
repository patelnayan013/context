import { NextResponse } from 'next/server';
import { testConnection } from '@/lib/adapters/asana';

export async function GET() {
  try {
    const result = await testConnection();

    if (result.success) {
      return NextResponse.json({
        status: 'connected',
        user: result.user,
        message: 'Successfully connected to Asana',
      });
    } else {
      return NextResponse.json(
        {
          status: 'error',
          message: result.error || 'Failed to connect to Asana',
        },
        { status: 401 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
