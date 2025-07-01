import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json(
                { error: 'Email parameter is required' },
                { status: 400 }
            );
        }

        const webhookUrl = process.env.NEXT_PUBLIC_MAKE_WEBHOOK_POST_URL;

        if (!webhookUrl) {
            return NextResponse.json(
                { error: 'Make.com webhook URL not configured' },
                { status: 500 }
            );
        }
        console.log('webhookUrl', webhookUrl);
        // Send POST request to Make.com webhook with email parameter
        const response = await fetch(`${webhookUrl}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching history:', error);
        return NextResponse.json(
            { error: 'Failed to fetch submission history' },
            { status: 500 }
        );
    }
} 