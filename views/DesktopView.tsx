import React from 'react';
import { ChatRoom, Felt, GameLog, LastMoveBanner, TableGrid } from '@laurelwood/card-class';
import { HUD, TrumpBadge } from '../components/panels';
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
      {/* Page-level overlay, not felt content: fixed to the top of the
          viewport above whatever the grid is doing. */}
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

      <TableGrid
        className="relative"
        top={
          /* 350 seats two or three opponents up top, so the slot holds a
             strip rather than a single hand. */
          <div className="top-strip w-full">
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
        }
        left={leftPlayer !== -1 && <PlayerHand playerIndex={leftPlayer} slot="left" />}
        right={rightPlayer !== -1 && <PlayerHand playerIndex={rightPlayer} slot="right" />}
        bottom={bottomPlayer !== -1 && <PlayerHand playerIndex={bottomPlayer} slot="bottom" />}
      >
        <Felt>
          {state.gamePhase === 'PLAYING' && state.trumpSuit && (
            <TrumpBadge suit={state.trumpSuit} partnerCardLabels={partnerCardLabels} />
          )}

          {state.gameLog.length > 0 && state.gamePhase === 'PLAYING' && (
            <LastMoveBanner message={state.gameLog[state.gameLog.length - 1]} />
          )}

          <div className="flex items-center justify-center w-full h-full z-10">
            <FeltContent />
          </div>
        </Felt>
      </TableGrid>

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
