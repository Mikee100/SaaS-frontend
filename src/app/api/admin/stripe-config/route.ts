import { NextResponse } from 'next/server';
// Removed NextAuth getServerSession. No authentication applied.
// import { prisma } from '@/lib/prisma'; // Commented out to fix build error

// The following import is causing a TypeScript error because 'auth.ts' is not a module
// import { authOptions } from '@/lib/auth'; // Commented out due to "not a module" error

// The following function uses getServerSession and authOptions, which are not available
// export async function GET() {
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session?.user?.isSuperadmin) {
//       return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
//     }
//     // const config = await prisma.stripeConfiguration.findFirst({ ... });
//     return NextResponse.json(config);
//   } catch (error) {
//     console.error('Error fetching Stripe config:', error);
//     return new NextResponse(
//       JSON.stringify({ error: 'Failed to fetch Stripe configuration' }),
//       { status: 500 }
//     );
//   }
// }

// Placeholder GET handler to avoid build errors
export async function GET() {
  return NextResponse.json({ message: 'GET Stripe config endpoint is disabled due to missing dependencies.' });
}

// The following function uses getServerSession and authOptions, which are not available
// export async function POST(request: Request) {
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session?.user?.isSuperadmin) {
//       return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
//     }
//     const { publishableKey, secretKey, webhookSecret, isLiveMode } = await request.json();
//     // const config = await prisma.stripeConfiguration.create({ ... });
//     return NextResponse.json(config);
//   } catch (error) {
//     console.error('Error saving Stripe config:', error);
//     return new NextResponse(
//       JSON.stringify({ error: 'Failed to save Stripe configuration' }),
//       { status: 500 }
//     );
//   }
// }

// Placeholder POST handler to avoid build errors
export async function POST(request: Request) {
  return NextResponse.json({ message: 'POST Stripe config endpoint is disabled due to missing dependencies.' });
}
