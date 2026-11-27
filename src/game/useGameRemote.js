// Hook React do estado dos minijogos (separado de gameRemote.js para o arcade autónomo não incluir o React)
import { useSyncExternalStore } from 'react';
import { subscribeGame, getGame } from './gameRemote';

export const useGameRemote = () => useSyncExternalStore(subscribeGame, getGame);
