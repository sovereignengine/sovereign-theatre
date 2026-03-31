import React from 'react';
import { CinematicVoidTerminal } from './components/CinematicVoidTerminal';
import './styles/cinematic-bunker.css';
import './styles/theatre.css';

export default function CinemaApp() {
  return (
    <div className="bg-black w-full h-full min-h-screen">
      <CinematicVoidTerminal />
    </div>
  );
}
