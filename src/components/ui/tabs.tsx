import React, { useState } from 'react';

export function Tabs({ value, onValueChange, children, className }: any) {
  return <div className={className}>{children}</div>;
}

export function TabsList({ children }: any) {
  return <div>{children}</div>;
}

export function TabsTrigger({ value, children, ...props }: any) {
  return <button {...props}>{children}</button>;
}

export function TabsContent({ value, children, ...props }: any) {
  return <div {...props}>{children}</div>;
}