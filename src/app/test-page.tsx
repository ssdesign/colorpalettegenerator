'use client';

import React from 'react';

export default function TestPage() {
  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold mb-4">Test Page</h1>
      <p>This is a test page to verify routing is working correctly.</p>
      <div className="mt-4">
        <a href="/" className="text-blue-500 hover:underline">Back to Home</a>
      </div>
    </div>
  );
} 