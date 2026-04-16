'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';

const AppSidebarDynamic = dynamic(
  () => import('@/components/app-sidebar').then((mod) => mod.AppSidebar),
  { ssr: false }
);

export function ClientSideSidebar() {
  return <AppSidebarDynamic />;
}
