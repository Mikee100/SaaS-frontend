'use client';

import dynamic from 'next/dynamic';

// Dynamically import the ServiceWorkerRegistration component with no SSR
const ServiceWorkerRegistration = dynamic(
  () => import('@/components/ServiceWorkerRegistration'),
  { ssr: false }
);

export default function ServiceWorkerWrapper() {
  return <ServiceWorkerRegistration />;
}
