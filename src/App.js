import React, { useState, useEffect, useCallback, useMemo } from 'react';

// --- Constants ---
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const POINT_CARDS = { 'A': 25, 'K': 20, 'Q': 15, 'J': 15 };
const SPADE_3_POINTS = 50;
const MIN_BID = 220;
const MAX_BID = 350;

// --- Helper Functions ---

// Creates a standard 52-card deck
const createDeck = () => {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      let points = POINT_CARDS[rank] || 0;
      if (suit === '♠' && rank === '3') {
        points = SPADE_3_POINTS;
      }
      deck.push({ suit, rank, points, id: `${rank}${suit}` });
    }
  }
  return deck;
};

// Shuffles an array in place (Fisher-Yates algorithm)
const shuffleDeck = (deck) => {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

// --- Components ---

// Represents a single card
const Card = ({ card, isHidden = false, onClick, isSelected, className = '' }) => {
  if (!card) return null; // Handle cases where card might be null initially

  const cardColor = (card.suit === '♥' || card.suit === '♦') ? 'text-red-600' : 'text-black';
  const selectedClass = isSelected ? 'border-blue-500 border-4 transform -translate-y-2' : 'border-gray-300 border';
  // Ensure hidden cards have a consistent background and hide text/symbols
  const hiddenClass = isHidden ? 'bg-blue-600 border-blue-800 text-transparent select-none' : `bg-white ${cardColor}`;

  return (
    <div
      className={`w-16 h-24 m-1 p-1 rounded-lg shadow-md flex flex-col justify-between items-center font-bold text-lg transition-transform duration-150 ${hiddenClass} ${selectedClass} ${className} ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
      onClick={onClick ? () => onClick(card) : undefined}
    >
      {isHidden ? (
        // Content for hidden card (e.g., a pattern or just blank)
        // Using text-transparent above hides the text/symbols effectively
        <>
         <span className="self-start opacity-0">{card.rank}{card.suit}</span>
         <span className="text-2xl opacity-0">{card.suit}</span>
         <span className="self-end transform rotate-180 opacity-0">{card.rank}{card.suit}</span>
        </>
      ) : (
        // Content for visible card
        <>
          <span className="self-start">{card.rank}{card.suit}</span>
          <span className="text-2xl">{card.suit}</span>
          <span className="self-end transform rotate-180">{card.rank}{card.suit}</span>
        </>
      )}
    </div>
  );
};


// Displays a player's hand
const PlayerHand = ({ player, cards, onCardClick, selectedCards = [], isCurrentPlayer, showHand = false }) => (
  <div className={`p-2 border rounded-lg mb-4 ${isCurrentPlayer ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
    <h3 className="font-semibold mb-2">Player {player.id} {player.isBidder ? '(Bidder)' : ''} {player.isDealer ? '(Dealer)' : ''}</h3>
     {/* Display bid status clearly */}
     <p className="text-sm">
        Bid: {player.bid === null ? 'Waiting' : (player.bid === 0 ? <span className="text-gray-500">Passed</span> : <span className="font-bold">{player.bid}</span>)}
     </p>
    <div className="flex flex-wrap justify-center min-h-[6rem]"> {/* Ensure minimum height */}
      {showHand ? (
        cards.map(card => (
          <Card
            key={card.id}
            card={card}
            // Only allow clicking cards if onCardClick is provided (relevant during playing phase)
            onClick={onCardClick}
            isSelected={selectedCards.some(selected => selected.id === card.id)}
          />
        ))
      ) : (
         // Display card backs if hand shouldn't be shown
         cards.map((_, index) => ( // Map over actual cards to get the correct count
           <Card key={`hidden-${player.id}-${index}`} card={{ suit: '?', rank: '?' }} isHidden={true} className="bg-blue-400"/>
         ))
      )}
       {showHand && cards.length === 0 && <span className="text-gray-400 self-center">Hand empty</span>}
       {!showHand && cards.length === 0 && <span className="text-gray-400 self-center">Hand empty</span>}
    </div>
  </div>
);

// Main Game Component
function App() {
  const [numPlayers, setNumPlayers] = useState(null);
  const [players, setPlayers] = useState([]);
  const [deck, setDeck] = useState([]);
  const [gamePhase, setGamePhase] = useState('setup'); // 'setup', 'bidding', 'trump_selection', 'deal_final', 'partner_select', 'playing', 'scoring'
  const [dealerIndex, setDealerIndex] = useState(0);
  const [bidderIndex, setBidderIndex] = useState(null);
  const [highestBid, setHighestBid] = useState(MIN_BID - 1); // Start below min bid
  const [currentBidderIndex, setCurrentBidderIndex] = useState(null); // Player whose turn it is to bid
  const [bids, setBids] = useState({}); // Track bids: { playerIndex: bidAmount (0 for pass) }
  const [bidPasses, setBidPasses] = useState(0); // Track consecutive passes
  const [trumpSuit, setTrumpSuit] = useState(null);
  const [currentTrick, setCurrentTrick] = useState([]); // Array of {card, playerIndex}
  const [trickLeaderIndex, setTrickLeaderIndex] = useState(null); // Player who leads the current trick
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(null); // Player whose turn it is to play a card
  const [scores, setScores] = useState({ bidderTeam: 0, oppositionTeam: 0 });
  const [calledCards, setCalledCards] = useState([]); // Cards called by the bidder to identify partners
  const [selectedPartnerCards, setSelectedPartnerCards] = useState([]); // Cards selected by bidder in UI
  const [bidderTeam, setBidderTeam] = useState([]); // Indices of players in bidder's team
  const [oppositionTeam, setOppositionTeam] = useState([]); // Indices of players in opposition
  // const [selectedCard, setSelectedCard] = useState(null); // Card selected by current player to play (Handled within handlePlayCard now)
  const [showHands, setShowHands] = useState(false); // Control whether to show all hands (for debugging/demo)
  const [message, setMessage] = useState("Select number of players to start.");
  const [totalHandsPlayed, setTotalHandsPlayed] = useState(0); // Track number of tricks played

  // Generate the list of all cards in a standard deck
  const fullDeckCards = useMemo(() => {
      const cards = [];
      for (const suit of SUITS) {
          for (const rank of RANKS) { // Use all RANKS
              let points = POINT_CARDS[rank] || 0;
              // Recalculate points for 3S if needed, although points aren't relevant for calling
              if (suit === '♠' && rank === '3') {
                  points = SPADE_3_POINTS;
              }
              cards.push({ suit, rank, points, id: `${rank}${suit}` });
          }
      }
      // Optional: Sort callable cards for consistent display
      cards.sort((a, b) => {
         const suitOrder = SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
         if (suitOrder !== 0) return suitOrder;
         // Sort by rank (Ace high) within suit for consistent display
         const rankOrder = RANKS.indexOf(b.rank) - RANKS.indexOf(a.rank);
         return rankOrder;
     });
      return cards;
  }, []);

  // Get the IDs of the cards in the bidder's hand (used for partner selection)
  const bidderHandIds = useMemo(() => {
      if (bidderIndex === null || !players[bidderIndex]) return new Set();
      return new Set(players[bidderIndex].hand.map(card => card.id));
  }, [bidderIndex, players]);

  // Filter the full deck to get cards *not* in the bidder's hand (used for partner selection)
  const availableCardsToCall = useMemo(() => {
      return fullDeckCards.filter(card => !bidderHandIds.has(card.id));
  }, [fullDeckCards, bidderHandIds]);

  // --- Game Setup Logic ---

  const initializeGame = useCallback((playerCount) => {
    setNumPlayers(playerCount);
    setMessage("Dealing initial hands...");
    setGamePhase('dealing_initial'); // Intermediate phase

    // Use setTimeout to allow UI update before heavy computation
    setTimeout(() => {
        let initialDeck = createDeck();

        // Remove cards based on player count
        if (playerCount === 5) {
          initialDeck = initialDeck.filter(card => !(card.rank === '2' && (card.suit === '♥' || card.suit === '♦')));
        } else if (playerCount === 6) {
          initialDeck = initialDeck.filter(card => card.rank !== '2');
        }

        const shuffledDeck = shuffleDeck([...initialDeck]);

        const initialDealSize = playerCount === 5 ? 5 : 4;

        const initialPlayers = Array.from({ length: playerCount }, (_, i) => ({
          id: i + 1,
          hand: [],
          tricksWon: [], // Store actual tricks (arrays of {card, playerIndex})
          isDealer: i === dealerIndex,
          isBidder: false,
          bid: null,
          isTeamBidder: null, // null: unknown, true: bidder team, false: opposition
        }));

        // Deal initial hands
        for (let i = 0; i < initialDealSize; i++) {
          for (let j = 0; j < playerCount; j++) {
            const card = shuffledDeck.pop();
            if (card) {
                 initialPlayers[j].hand.push(card);
            } else {
                console.error("Error: Ran out of cards during initial deal.");
                setMessage("Error dealing cards. Please restart.");
                setGamePhase('setup');
                return;
            }
          }
        }

         // Sort hands
        initialPlayers.forEach(p => p.hand.sort((a, b) => {
            const suitOrder = SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
            if (suitOrder !== 0) return suitOrder;
            const rankOrder = RANKS.indexOf(b.rank) - RANKS.indexOf(a.rank); // Ace high sort within suit
            return rankOrder;
        }));

        setPlayers(initialPlayers);
        setDeck(shuffledDeck);
        setBids({});
        setBidPasses(0);
        setHighestBid(MIN_BID - 1);
        setBidderIndex(null);
        setTrumpSuit(null);
        setCurrentTrick([]);
        setScores({ bidderTeam: 0, oppositionTeam: 0 });
        setCalledCards([]);
        setSelectedPartnerCards([]);
        setBidderTeam([]);
        setOppositionTeam([]);
        setTotalHandsPlayed(0);

        const firstBidder = (dealerIndex + 1) % playerCount;
        setCurrentBidderIndex(firstBidder);
        setGamePhase('bidding');
        setMessage(`Player ${firstBidder + 1}'s turn to bid. Minimum bid: ${MIN_BID}.`);
    }, 100); // Short delay for UI update

  }, [dealerIndex]);

  // --- Bidding Logic ---

  const handleBid = useCallback((playerIndex, amountStr) => {
    if (playerIndex !== currentBidderIndex || gamePhase !== 'bidding') return;

    const amount = parseInt(amountStr, 10);
    if (isNaN(amount)) {
        setMessage("Please enter a valid number or 0 to pass.");
        return;
    }

    let currentBids = { ...bids }; // Use a different name to avoid conflict
    let newHighestBid = highestBid;
    let newBidderIndex = bidderIndex;
    let newBidPasses = bidPasses; // Start with current passes

    if (amount === 0) { // Player passes
      currentBids[playerIndex] = 0;
      newBidPasses += 1; // Increment consecutive passes
      setMessage(`Player ${playerIndex + 1} passed.`);
    } else if (amount >= MIN_BID && amount > highestBid && amount <= MAX_BID) {
      currentBids[playerIndex] = amount;
      newHighestBid = amount;
      newBidderIndex = playerIndex;
      newBidPasses = 0; // Reset passes on a valid bid
      setMessage(`Player ${playerIndex + 1} bid ${amount}.`);
    } else {
      setMessage(`Invalid bid. Must be between ${Math.max(MIN_BID, highestBid + 1)} and ${MAX_BID}, or Pass (0).`);
      return; // Invalid bid, don't proceed
    }

    // Update player state with the bid immediately for UI feedback
    setPlayers(prevPlayers => prevPlayers.map((p, i) => i === playerIndex ? { ...p, bid: currentBids[i] } : p));

    setBids(currentBids);
    setHighestBid(newHighestBid);
    setBidderIndex(newBidderIndex);
    setBidPasses(newBidPasses);

    // Check if bidding ends
    const activeBidders = players.filter((_, i) => currentBids[i] === null || currentBids[i] > 0).length; // Count players who haven't passed yet or made a bid
    const totalPlayers = players.length;
    const playersWhoHaveBidOrPassed = Object.keys(currentBids).length;

    // Bidding ends if only one non-passing bidder remains OR if everyone has had a turn and passed consecutively
    // Condition 1: A bid was made, and everyone else passed (passes = total players - 1)
    // Condition 2: Everyone passed consecutively (passes = total players) - handles initial pass around
    // Condition 3: Everyone has placed a bid/pass, and the last action resulted in enough passes
    const biddingFinished = (newBidderIndex !== null && newBidPasses >= totalPlayers - 1) || newBidPasses >= totalPlayers;


    if (biddingFinished) {
       if (newBidderIndex === null) {
            // Everyone passed initially
            setMessage("Bidding failed! Everyone passed. Restarting round...");
             setTimeout(() => initializeGame(numPlayers), 2000);
             return;
       }

      // Bidding finished! Update bidder status.
      setPlayers(prevPlayers => prevPlayers.map((p, i) => ({
          ...p,
          isBidder: i === newBidderIndex,
          // Reset bid display for non-bidders? Optional. Keep bids visible for now.
      })));
      setGamePhase('trump_selection');
      setMessage(`Player ${newBidderIndex + 1} won the bid with ${newHighestBid}. Select the trump suit.`);
      setCurrentBidderIndex(null); // Clear current bidder
    } else {
      // Move to the next bidder who hasn't passed
      let nextBidder = (playerIndex + 1) % totalPlayers;
      while (currentBids[nextBidder] === 0) { // Skip players who have passed
        nextBidder = (nextBidder + 1) % totalPlayers;
      }
      setCurrentBidderIndex(nextBidder);
       setMessage(prev => `${prev} Player ${nextBidder + 1}'s turn to bid.`);
    }
  }, [currentBidderIndex, gamePhase, bids, highestBid, bidPasses, players, numPlayers, initializeGame, bidderIndex]);


  // --- Trump Selection ---
  const selectTrump = useCallback((suit) => {
      if (gamePhase !== 'trump_selection' || bidderIndex === null) return;
      if (!SUITS.includes(suit)) {
          setMessage("Invalid suit selected.");
          return;
      }

      setTrumpSuit(suit);
      setMessage(`Trump suit is ${suit}. Dealing remaining cards...`);
      setGamePhase('deal_final');

      // --- Deal Final Cards ---
      setTimeout(() => {
          setPlayers(prevPlayers => {
              const remainingDeck = [...deck];

              // Create a deep copy of players including their hands to prevent mutation issues
              const updatedPlayers = prevPlayers.map(player => ({
                  ...player,
                  hand: [...player.hand] // Create a new array for the hand
              }));

              // Error handling: Check if deck is empty or not divisible
              if (remainingDeck.length === 0) {
                  console.log("No cards left to deal.");
                   // Proceed directly to partner selection if no cards left
                   setMessage(`Trump: ${suit}. Bidder (Player ${bidderIndex + 1}) needs to call partners.`);
                   setGamePhase('partner_select');
                   return updatedPlayers; // Return potentially unchanged players if deck was empty
              }
              if (remainingDeck.length % numPlayers !== 0) {
                   console.error("Error: Remaining deck size not divisible by player count.", remainingDeck.length, numPlayers);
                   setMessage("Error dealing final cards. Deck mismatch.");
                   setGamePhase('setup'); // Reset on error
                   return prevPlayers;
              }

              // Deal remaining cards
              while (remainingDeck.length > 0) {
                   for (let j = 0; j < numPlayers; j++) {
                       const card = remainingDeck.pop();
                       if (card) {
                           updatedPlayers[j].hand.push(card);
                       } else {
                           console.error("Error: Ran out of cards unexpectedly during final deal.");
                           setMessage("Error dealing final cards. Please restart.");
                           setGamePhase('setup');
                           return prevPlayers;
                       }
                   }
              }

               // Sort hands again
               updatedPlayers.forEach(p => p.hand.sort((a, b) => {
                   const suitOrder = SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
                   if (suitOrder !== 0) return suitOrder;
                   const rankOrder = RANKS.indexOf(b.rank) - RANKS.indexOf(a.rank);
                   return rankOrder;
               }));

              setDeck([]); // Deck is now empty
              setMessage(`Trump: ${suit}. Bidder (Player ${bidderIndex + 1}) needs to call partners.`);
              setGamePhase('partner_select');
              return updatedPlayers;
          });
      }, 500); // Slightly longer delay to see message

  }, [gamePhase, bidderIndex, deck, numPlayers]);


  // --- Partner Selection Logic ---
   const handleSelectPartnerCard = useCallback((card) => {
       if (gamePhase !== 'partner_select' || bidderIndex === null) return;

       const numCardsToCall = highestBid > 330 ? 3 : (highestBid > 270 ? 2 : 1);

       setSelectedPartnerCards(prevSelected => {
           const isAlreadySelected = prevSelected.some(c => c.id === card.id);
           if (isAlreadySelected) {
               // Deselect
               return prevSelected.filter(c => c.id !== card.id);
           } else {
               // Select, but only if not exceeding the limit
               if (prevSelected.length < numCardsToCall) {
                   return [...prevSelected, card];
               } else {
                   setMessage(`You can only select ${numCardsToCall} card(s). Deselect one first.`);
                   return prevSelected; // Return unchanged if limit reached
               }
           }
       });
   }, [gamePhase, bidderIndex, highestBid]);

   const confirmPartners = useCallback(() => {
       if (gamePhase !== 'partner_select' || bidderIndex === null) return;

       const numCardsToCall = highestBid > 330 ? 3 : (highestBid > 270 ? 2 : 1);

       if (selectedPartnerCards.length !== numCardsToCall) {
           setMessage(`Please select exactly ${numCardsToCall} card(s) to call.`);
           return;
       }

       setCalledCards(selectedPartnerCards); // Store the officially called cards

       // Identify partners
       const bidderTeamIndices = [bidderIndex];
       const oppositionTeamIndices = [];
       const partnerCardsIds = selectedPartnerCards.map(c => c.id);

       players.forEach((player, index) => {
           if (index === bidderIndex) return; // Skip the bidder themselves

           // Check if the player has any of the called cards
           const hasPartnerCard = player.hand.some(cardInHand => partnerCardsIds.includes(cardInHand.id));

           if (hasPartnerCard) {
               bidderTeamIndices.push(index);
           } else {
               oppositionTeamIndices.push(index);
           }
       });

       setBidderTeam(bidderTeamIndices);
       setOppositionTeam(oppositionTeamIndices);

       // Update player state with team status (important for scoring later)
       // Keep isTeamBidder null for now, reveal later if needed by rules
       setPlayers(prev => prev.map((p, i) => ({
           ...p,
           isTeamBidder: bidderTeamIndices.includes(i) ? true : (oppositionTeamIndices.includes(i) ? false : null) // Assign team status
       })));

       setMessage(`Partners identified (secretly). Starting game! Trump: ${trumpSuit}. Player ${bidderIndex + 1} starts.`);
       setTrickLeaderIndex(bidderIndex);
       setCurrentPlayerIndex(bidderIndex);
       setGamePhase('playing');
       setSelectedPartnerCards([]); // Clear selection UI state

   }, [gamePhase, bidderIndex, players, highestBid, selectedPartnerCards, trumpSuit]);


   // --- Gameplay Logic ---

   // Get Rank Value for comparison (Ace high)
    const getRankValue = (rank) => RANKS.indexOf(rank);

    // Determine the winner of the current trick
    const determineTrickWinner = useCallback((trick, leadSuit, currentTrumpSuit) => {
        if (!trick || trick.length === 0) return -1; // Should not happen in normal flow

        let winningCard = trick[0].card;
        let winningPlayerIndex = trick[0].playerIndex;
        let winningSuit = winningCard.suit;

        for (let i = 1; i < trick.length; i++) {
            const currentCard = trick[i].card;
            const currentPlayerIndex = trick[i].playerIndex;
            const currentSuit = currentCard.suit;

            // Compare based on trump and lead suit
            if (currentSuit === currentTrumpSuit && winningSuit !== currentTrumpSuit) {
                // Current card is trump, winner so far is not: Current card wins
                winningCard = currentCard;
                winningPlayerIndex = currentPlayerIndex;
                winningSuit = currentSuit;
            } else if (currentSuit === currentTrumpSuit && winningSuit === currentTrumpSuit) {
                // Both are trump: Higher rank wins
                if (getRankValue(currentCard.rank) > getRankValue(winningCard.rank)) {
                    winningCard = currentCard;
                    winningPlayerIndex = currentPlayerIndex;
                    winningSuit = currentSuit;
                }
            } else if (currentSuit !== currentTrumpSuit && winningSuit !== currentTrumpSuit) {
                // Neither is trump: Follow lead suit rules
                if (currentSuit === leadSuit && winningSuit !== leadSuit) {
                     // Current card followed lead, winner didn't: Current card wins (shouldn't happen if lead is always first?)
                     winningCard = currentCard;
                     winningPlayerIndex = currentPlayerIndex;
                     winningSuit = currentSuit;
                } else if (currentSuit === leadSuit && winningSuit === leadSuit) {
                    // Both followed lead: Higher rank wins
                     if (getRankValue(currentCard.rank) > getRankValue(winningCard.rank)) {
                        winningCard = currentCard;
                        winningPlayerIndex = currentPlayerIndex;
                        winningSuit = currentSuit;
                    }
                }
                // If currentSuit is not leadSuit and winningSuit is leadSuit, winner remains.
                // If both are off-suit (and not trump), the first card played (lead) wins among them.
            }
            // If current card is not trump, but winner is trump, winner remains.
        }
        return winningPlayerIndex;
    }, [trumpSuit]); // Dependency on trumpSuit


   const handlePlayCard = useCallback((cardToPlay) => {
       if (gamePhase !== 'playing' || currentPlayerIndex === null || !players[currentPlayerIndex]) return;

       const playerHand = players[currentPlayerIndex].hand;
       const leadCard = currentTrick.length > 0 ? currentTrick[0].card : null;
       const leadSuit = leadCard ? leadCard.suit : null;

       // --- Card Play Validation ---
       const hasLeadSuit = playerHand.some(card => card.suit === leadSuit);

       if (leadSuit && cardToPlay.suit !== leadSuit && hasLeadSuit) {
           setMessage(`Invalid move: You must play the lead suit (${leadSuit}) if you have it.`);
           return;
       }
       // Player is allowed to play this card (either followed suit, or didn't have lead suit)

       // --- Update State ---
       // 1. Add card to trick
       const newTrick = [...currentTrick, { card: cardToPlay, playerIndex: currentPlayerIndex }];
       setCurrentTrick(newTrick);

       // 2. Remove card from player's hand
       setPlayers(prevPlayers => {
           const updatedPlayers = [...prevPlayers];
           updatedPlayers[currentPlayerIndex] = {
               ...updatedPlayers[currentPlayerIndex],
               hand: updatedPlayers[currentPlayerIndex].hand.filter(card => card.id !== cardToPlay.id)
           };
           return updatedPlayers;
       });

       // 3. Determine next player or end trick
       const nextPlayerIndex = (currentPlayerIndex + 1) % numPlayers;

       if (newTrick.length === numPlayers) {
           // --- Trick Complete ---
           const winnerIndex = determineTrickWinner(newTrick, leadSuit || cardToPlay.suit, trumpSuit); // Pass lead suit (or first card's suit if lead)
           const pointsInTrick = newTrick.reduce((sum, { card }) => sum + card.points, 0);

           setMessage(`Trick complete! Player ${winnerIndex + 1} wins the trick with ${pointsInTrick} points.`);

           // Update winner's tricksWon and scores
           setPlayers(prevPlayers => {
               const updatedPlayers = [...prevPlayers];
               updatedPlayers[winnerIndex] = {
                   ...updatedPlayers[winnerIndex],
                   tricksWon: [...updatedPlayers[winnerIndex].tricksWon, newTrick] // Store the whole trick
               };
               return updatedPlayers;
           });

           // Update overall scores based on winner's team
           setScores(prevScores => {
               const isWinnerBidderTeam = bidderTeam.includes(winnerIndex);
               if (isWinnerBidderTeam) {
                   return { ...prevScores, bidderTeam: prevScores.bidderTeam + pointsInTrick };
               } else {
                   return { ...prevScores, oppositionTeam: prevScores.oppositionTeam + pointsInTrick };
               }
           });

           setTotalHandsPlayed(prev => prev + 1);

           // Check if game ended (all cards played)
           const totalCardsInGame = (numPlayers === 5 ? 50 : 48); // 52 - removed cards
           const expectedTricks = totalCardsInGame / numPlayers;

           if (totalHandsPlayed + 1 >= expectedTricks) {
               // --- Game Over ---
               setGamePhase('scoring');
               setCurrentPlayerIndex(null);
               setCurrentTrick([]); // Clear last trick display
               // Scoring logic will be handled by the 'scoring' phase render
               setMessage("Game Over! Calculating final scores...");
           } else {
               // --- Start Next Trick ---
               setCurrentTrick([]); // Clear the current trick for the next round
               setTrickLeaderIndex(winnerIndex); // Winner leads next trick
               setCurrentPlayerIndex(winnerIndex);
               // Add short delay before next turn message?
               setTimeout(() => {
                    setMessage(`Player ${winnerIndex + 1} leads the next trick.`);
               }, 1500); // Delay to read trick winner message
           }

       } else {
           // --- Trick Continues ---
           setCurrentPlayerIndex(nextPlayerIndex);
           setMessage(`Player ${currentPlayerIndex + 1} played ${cardToPlay.rank}${cardToPlay.suit}. Player ${nextPlayerIndex + 1}'s turn.`);
       }

   }, [gamePhase, currentPlayerIndex, players, currentTrick, numPlayers, trumpSuit, determineTrickWinner, bidderTeam, totalHandsPlayed]);


  // --- Rendering ---

  // Determine which player's hand to show fully
  const isHandVisible = (playerIndex) => {
      if (showHands) return true; // Debug override shows all hands

      // Show hands during bidding phase
      if (gamePhase === 'bidding') return true;

      // Show bidder's hand during partner selection
      if (gamePhase === 'partner_select' && playerIndex === bidderIndex) return true;

      // Show current player's hand during playing phase
      if (gamePhase === 'playing' && playerIndex === currentPlayerIndex) return true;

      // Keep hands hidden otherwise (setup, trump_selection, deal_final, scoring)
      // Or optionally show all hands at scoring phase?
      if (gamePhase === 'scoring') return true; // Show all hands at the end

      return false;
  };

  const renderGamePhaseContent = () => {
    switch (gamePhase) {
      case 'setup':
      case 'dealing_initial': // Show setup buttons even while dealing initial
        return (
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-4">Start New Game</h2>
            {gamePhase === 'dealing_initial' && <p className="text-lg animate-pulse mb-4">{message}</p>}
            <button onClick={() => initializeGame(5)} disabled={gamePhase === 'dealing_initial'} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2 disabled:opacity-50">5 Players</button>
            <button onClick={() => initializeGame(6)} disabled={gamePhase === 'dealing_initial'} className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50">6 Players</button>
          </div>
        );
      case 'bidding':
        return (
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Bidding Phase</h2>
             <p className="mb-4">{message}</p>
             {currentBidderIndex !== null && players[currentBidderIndex] && ( // Check if player exists
                 <div className="border p-4 rounded-lg bg-gray-50 inline-block">
                    <h3 className="font-bold text-lg mb-2">Player {currentBidderIndex + 1}'s Turn to Bid</h3>
                    <input
                        type="number"
                        min={highestBid + 1 < MIN_BID ? MIN_BID : highestBid + 1}
                        max={MAX_BID}
                        step="5" // Bids often in steps of 5 or 10
                        placeholder={`Min ${highestBid + 1 < MIN_BID ? MIN_BID : highestBid + 1}`}
                        className="border p-2 rounded mr-2 w-32"
                        id="bidAmountInput"
                        key={`bid-input-${currentBidderIndex}`} // Force re-render on turn change
                    />
                    <button onClick={() => {
                        const input = document.getElementById('bidAmountInput');
                        handleBid(currentBidderIndex, input.value || '0'); // Pass value directly
                    }} className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mr-2 transition-colors">
                        Bid
                    </button>
                    <button onClick={() => handleBid(currentBidderIndex, '0')} className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors">
                        Pass
                    </button>
                 </div>
             )}
          </div>
        );
     case 'trump_selection':
         return (
             <div className="text-center">
                 <h2 className="text-xl font-semibold mb-2">Select Trump Suit</h2>
                 <p className="mb-4">{message}</p>
                 {bidderIndex !== null && (
                     <div>
                         <h3 className="font-bold text-lg mb-2">Player {bidderIndex + 1} (Bidder), choose trump:</h3>
                         <div className="flex justify-center gap-4 mt-2">
                             {SUITS.map(suit => (
                                 <button
                                     key={suit}
                                     onClick={() => selectTrump(suit)}
                                     className={`w-16 h-16 rounded-lg text-3xl font-bold border-2 shadow-md flex items-center justify-center transition-transform hover:scale-110 ${
                                         suit === '♥' || suit === '♦' ? 'text-red-600 border-red-600 hover:bg-red-100' : 'text-black border-black hover:bg-gray-200'
                                     }`}
                                 >
                                     {suit}
                                 </button>
                             ))}
                         </div>
                     </div>
                 )}
             </div>
         );
      case 'deal_final':
          return <p className="text-center text-xl font-semibold animate-pulse">{message}</p>;
      case 'partner_select':
          const numCardsToCall = highestBid > 330 ? 3 : (highestBid > 270 ? 2 : 1);

          return (
              <div className="text-center">
                  <h2 className="text-xl font-semibold mb-2">Call Partners</h2>
                  <p className="mb-2">Bidder (Player {bidderIndex !== null ? bidderIndex + 1 : 'N/A'}) must call {numCardsToCall} card(s).</p>
                  <p className="mb-4">{message}</p>
                  {/* Show cards not in bidder's hand for selection */}
                  {bidderIndex !== null && players[bidderIndex] && (
                      <div className="mb-4 border p-2 rounded bg-yellow-50">
                          <h4 className="font-semibold">Select {numCardsToCall} card(s) to call:</h4>
                          <div className="flex flex-wrap justify-center">
                              {availableCardsToCall.map(card => (
                                  <Card
                                      key={card.id}
                                      card={card}
                                      onClick={() => handleSelectPartnerCard(card)}
                                      isSelected={selectedPartnerCards.some(c => c.id === card.id)}
                                      className="hover:scale-105 border-2"
                                  />
                              ))}
                          </div>
                      </div>
                  )}
                  <button
                      onClick={confirmPartners}
                      disabled={selectedPartnerCards.length !== numCardsToCall}
                      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Confirm {selectedPartnerCards.length}/{numCardsToCall} Called Cards
                  </button>
              </div>
          );
      case 'playing':
          return (
              <div className="text-center">
                  <h2 className="text-xl font-semibold mb-2">Playing Phase</h2>
                   <div className="flex justify-center gap-4 text-sm mb-2">
                       <span>Trump: <span className={`font-bold text-xl ${trumpSuit === '♥' || trumpSuit === '♦' ? 'text-red-600' : 'text-black'}`}>{trumpSuit}</span></span>
                       <span>Bid: <span className="font-bold">{highestBid}</span> by Player {bidderIndex !== null ? bidderIndex + 1 : 'N/A'}</span>
                       <span>Tricks Played: <span className="font-bold">{totalHandsPlayed} / {(numPlayers === 5 ? 10 : 8)}</span></span>
                   </div>
                   <div className="flex justify-center gap-4 text-sm mb-4">
                        <span>Bidder Team Score: <span className="font-bold">{scores.bidderTeam}</span></span>
                        <span>Opposition Score: <span className="font-bold">{scores.oppositionTeam}</span></span>
                   </div>
                  <p className="my-2 min-h-[1.5rem]">{message}</p> {/* Ensure space for message */}

                  {/* Current Trick Display */}
                  <div className="flex justify-center items-center my-4 min-h-[8rem] border border-dashed border-gray-400 p-2 rounded-lg bg-gray-50">
                      <h4 className="mr-4 font-semibold text-lg">Current Trick:</h4>
                      {currentTrick.map(({card, playerIndex}, index) => (
                          <div key={index} className="relative mx-1 text-center">
                              <Card card={card} />
                              <span className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-700 text-white text-xs px-1.5 py-0.5 rounded shadow">
                                  P{playerIndex + 1}
                              </span>
                          </div>
                      ))}
                      {currentTrick.length === 0 && <span className="text-gray-500 text-lg">Trick Empty</span>}
                  </div>

                  {currentPlayerIndex !== null && (
                      <p className="font-bold text-green-600 text-lg animate-pulse">Player {currentPlayerIndex + 1}'s Turn</p>
                  )}
                  {/* Player hands are rendered below this section */}
              </div>
          );
       case 'scoring':
            const bidderTeamWon = scores.bidderTeam >= highestBid;
            const winnerMessage = bidderTeamWon
                ? `Bidder's Team Wins! They scored ${scores.bidderTeam} (Bid: ${highestBid})`
                : `Opposition Wins! Bidder's Team only scored ${scores.bidderTeam} (Bid: ${highestBid})`;
           return (
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4 text-blue-700">Game Over!</h2>
                    <p className={`text-xl font-semibold mb-2 ${bidderTeamWon ? 'text-green-600' : 'text-red-600'}`}>{winnerMessage}</p>
                    <p className="mb-1">Bidder Team Score: <span className="font-bold">{scores.bidderTeam}</span> (Players: {bidderTeam.map(i => i + 1).join(', ')})</p>
                    <p className="mb-4">Opposition Score: <span className="font-bold">{scores.oppositionTeam}</span> (Players: {oppositionTeam.map(i => i + 1).join(', ')})</p>
                    <button onClick={() => initializeGame(numPlayers)} className="bg-indigo-500 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded">
                        Play Again ({numPlayers} Players)
                    </button>
                     <button onClick={() => setGamePhase('setup')} className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded ml-2">
                        New Game (Select Players)
                    </button>
                </div>
           );
      default:
        return <p>Loading game state...</p>;
    }
  };

  return (
    <div className="container mx-auto p-4 font-sans flex flex-col min-h-screen bg-gray-50">
      <header className="bg-gray-800 text-white p-4 rounded-lg mb-6 shadow-md">
        <h1 className="text-3xl font-bold text-center">Card Game Simulator (350 Points)</h1>
      </header>

      {/* Central Game Area (Phase dependent content) */}
      <div className="flex-grow mb-6 p-4 bg-white rounded-lg shadow">
        {renderGamePhaseContent()}
      </div>

      {/* Player Hands Area - Conditionally render based on phase */}
      {players.length > 0 && gamePhase !== 'setup' && (
        <div className="mb-6">
            <h2 className="text-xl font-semibold mb-3 text-center text-gray-700">Player Hands</h2>
            <div className={`grid grid-cols-1 ${numPlayers === 5 ? 'md:grid-cols-3 lg:grid-cols-5' : 'md:grid-cols-3 lg:grid-cols-3'} gap-4`}>
             {/* Adjust grid columns based on player count for better layout */}
              {players.map((player, index) => (
                <PlayerHand
                  key={player.id}
                  player={player}
                  cards={player.hand}
                  // Enable card clicking only for the current player during the 'playing' phase
                  onCardClick={(gamePhase === 'playing' && index === currentPlayerIndex) ? handlePlayCard : undefined}
                  // Highlight the current player during 'playing' and 'bidding' phases
                  isCurrentPlayer={(gamePhase === 'playing' && index === currentPlayerIndex) || (gamePhase === 'bidding' && index === currentBidderIndex)}
                  // Control hand visibility based on game phase and debug toggle
                  showHand={isHandVisible(index)}
                />
              ))}
            </div>
        </div>
      )}

       {/* Debug/Control Panel - Keep at bottom */}
       <div className="mt-auto p-3 border rounded bg-gray-100 shadow-inner text-sm">
            <div className="flex justify-between items-center">
                <h4 className="font-semibold">Game Info / Controls</h4>
                <div>
                    <label className="mr-4">
                        <input type="checkbox" checked={showHands} onChange={(e) => setShowHands(e.target.checked)} className="mr-1 align-middle"/>
                        Show All Hands
                    </label>
                    <button onClick={() => setGamePhase('setup')} className="bg-red-500 hover:bg-red-700 text-white text-xs font-bold py-1 px-3 rounded transition-colors">
                        Reset Game
                    </button>
                </div>
            </div>
             <div className="flex gap-4 mt-1 text-xs text-gray-600">
                 <span>Phase: <span className="font-medium">{gamePhase}</span></span>
                 <span>Trump: <span className="font-medium">{trumpSuit || 'N/A'}</span></span>
                 <span>Bidder Team: <span className="font-medium">[{bidderTeam.map(i => i + 1).join(', ')}]</span></span>
                 <span>Opposition Team: <span className="font-medium">[{oppositionTeam.map(i => i + 1).join(', ')}]</span></span>
             </div>
        </div>

      <footer className="text-center text-xs text-gray-500 mt-4 py-2">
        React Card Game Simulation v1.1
      </footer>
    </div>
  );
}

export default App;
