import React from 'react';
import { HUD, GameLog, LastMoveBanner, TrumpBadge, ChatRoom } from '../components/panels';
import { FeltContent } from '../components/FeltContent';
import { PlayerHand } from '../components/PlayerHand';
import { SharedOverlays } from '../components/SharedOverlays';
import { useGame } from '../GameContext';
import { Z_HUD } from '../constants';
import { SUIT_SYMBOLS, getRankLabel } from '../constants';

export const DesktopView: React.FC = () => {
  const {
    state, isMultiplayer, myIndex,
    topPlayers, leftPlayer, rightPlayer,
    positions,
    logEndRef,
    chatUnread, markChatRead, sendChat,
  } = useGame();

  const partnerCardLabels = state.partnerCards.map(c => `${getRankLabel(c.rank)}${SUIT_SYMBOLS[c.suit]}`);

  const chatEnabled = !!state.roomId && state.players.some(p => p.isHuman && p.id !== myIndex);

  const bottomPlayer = positions.find(p => p.slot === 'bottom')?.playerIndex ?? -1;

  return (
    <>
      <div className="game-grid royal-bg relative">
        <div
          className="fixed left-0 right-0 flex items-start justify-between gap-2 p-2 sm:p-3 pointer-events-none"
          style={{ zIndex: Z_HUD, top: 'var(--safe-t)' }}
        >
          <div className="pointer-events-auto">
            <HUD state={state} isMultiplayer={isMultiplayer} roomId={state.roomId || ''} />
          </div>
          <div className="pointer-events-auto flex justify-end">
            <GameLog entries={state.gameLog} logEndRef={logEndRef} />
          </div>
        </div>

        <div className="game-area-top top-strip pt-3 sm:pt-4">
          {topPlayers.map(idx => {
            const slot = positions.find(p => p.playerIndex === idx)?.slot ?? 'top-center';
            return (
              <PlayerHand
                key={idx}
                playerIndex={idx}
                slot={slot}
                compact={topPlayers.length >= 3}
              />
            );
          })}
        </div>

        <div className="game-area-left flex items-center justify-center">
          {leftPlayer !== -1 && <PlayerHand playerIndex={leftPlayer} slot="left" />}
        </div>

        <div className="game-area-center flex items-stretch justify-center px-2 sm:px-4 pt-2 sm:pt-3 pb-4 sm:pb-6 min-h-0 min-w-0">
          <div
            className="relative w-full max-w-5xl h-full table-felt rounded-[1.25rem] sm:rounded-[2rem] flex items-center justify-center p-3 sm:p-6 min-h-0"
            style={{ border: '1px solid var(--line)', boxShadow: '0 18px 40px rgba(0,0,0,0.55), inset 0 0 40px rgba(0,0,0,0.45)' }}
          >
            <div className="absolute inset-2 rounded-[1rem] sm:rounded-[1.5rem] pointer-events-none" style={{ border: '1px solid rgba(111,176,255,0.05)' }} />

            {state.gamePhase === 'PLAYING' && state.trumpSuit && (
              <TrumpBadge suit={state.trumpSuit} partnerCardLabels={partnerCardLabels} />
            )}

            {state.gameLog.length > 0 && state.gamePhase === 'PLAYING' && (
              <LastMoveBanner message={state.gameLog[state.gameLog.length - 1]} />
            )}

            <div className="flex items-center justify-center w-full h-full z-10">
              <FeltContent />
            </div>
          </div>
        </div>

        <div className="game-area-right flex items-center justify-center">
          {rightPlayer !== -1 && <PlayerHand playerIndex={rightPlayer} slot="right" />}
        </div>

        <div className="game-area-bottom flex items-end justify-center pt-3 sm:pt-4 pb-4 sm:pb-6">
          {bottomPlayer !== -1 && <PlayerHand playerIndex={bottomPlayer} slot="bottom" />}
        </div>
      </div>
      {chatEnabled && (
        <div
          className="fixed right-0 flex justify-end p-2 sm:p-3 pointer-events-none"
          style={{ zIndex: Z_HUD, bottom: 'var(--safe-b)' }}
        >
          <div className="pointer-events-auto">
            <ChatRoom
              messages={state.chatLog ?? []}
              myIndex={myIndex}
              unread={chatUnread}
              onOpen={markChatRead}
              onClose={markChatRead}
              onSend={sendChat}
            />
          </div>
        </div>
      )}
      <SharedOverlays />
    </>
  );
};
