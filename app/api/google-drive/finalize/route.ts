import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { sessionUri, totalSize } = await request.json();

        if (!sessionUri || !totalSize) {
            return NextResponse.json(
                { error: 'Missing required parameters' },
                { status: 400 }
            );
        }

        // Finalize the upload
        const response = await fetch(sessionUri, {
            method: 'PUT',
            headers: {
                'Content-Range': `bytes */${totalSize}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to finalize upload: ${response.status}`);
        }

        const result = await response.json();
        return NextResponse.json({
            success: true,
            fileId: result.id
        });

    } catch (error) {
        console.error('Finalize upload error:', error);
        return NextResponse.json(
            { error: 'Failed to finalize upload' },
            { status: 500 }
        );
    }
} 