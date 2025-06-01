import React from 'react';
import { StatusBar } from 'expo-status-bar';
import EnhancedBeatBox from './components/EnhancedBeatBox';

export default function App() {
  return (
    <>
      <StatusBar style="light" backgroundColor="#0f172a" />
      <EnhancedBeatBox />
    </>
  );
}
