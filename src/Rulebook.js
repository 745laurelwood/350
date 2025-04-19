import React from 'react';

function Rulebook() {
  return (
    <div className="p-6 bg-white rounded-lg shadow-md text-gray-800 max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-center text-gray-700">350 Card Game Rules</h2>

      <section className="mb-6">
        <h3 className="text-2xl font-semibold mb-3 text-blue-600">Objective</h3>
        <p className="mb-2">
The goal of 350 is for the bidding team (the player who won the bid and their partners) to score at least the number of points they bid by capturing tricks containing point cards. The opposing team tries to prevent the bidding team from reaching their bid.
        </p>
      </section>

      <section className="mb-6">
        <h3 className="text-2xl font-semibold mb-3 text-blue-600">Setup</h3>
        <ul className="list-disc list-inside space-y-1 pl-4">
          <li><span className="font-semibold">Players:</span> 5 or 6 players. This simulator supports both.</li>
          <li><span className="font-semibold">Deck (5 Players):</span> Standard 52-card deck with the 2 of Hearts (♥) and 2 of Diamonds (♦) removed (50 cards total).</li>
          <li><span className="font-semibold">Deck (6 Players):</span> Standard 52-card deck with all four 2s removed (48 cards total).</li>
          <li><span className="font-semibold">Point Cards:</span>
            <ul className="list-disc list-inside space-y-1 pl-6 mt-1">
              <li>Ace (A): 25 points</li>
              <li>King (K): 20 points</li>
              <li>Queen (Q): 15 points</li>
              <li>Jack (J): 15 points</li>
              <li>3 of Spades (3♠): 50 points (Special)</li>
              <li>Other cards (2-10, excluding 3♠): 0 points</li>
            </ul>
          </li>
           <li><span className="font-semibold">Total Points in Deck:</span> 350 points.</li>
        </ul>
      </section>

      <section className="mb-6">
        <h3 className="text-2xl font-semibold mb-3 text-blue-600">Dealing</h3>
        <ul className="list-disc list-inside space-y-1 pl-4">
          <li><span className="font-semibold">Dealer:</span> Rotates clockwise each round.</li>
          <li><span className="font-semibold">Initial Deal:</span>
            <ul className="list-disc list-inside space-y-1 pl-6 mt-1">
                <li>5 Players: 5 cards each.</li>
                <li>6 Players: 4 cards each.</li>
            </ul>
          </li>
          <li><span className="font-semibold">Final Deal:</span> After bidding and trump selection, the remaining cards are dealt out one by one until the deck is empty.</li>
          <li><span className="font-semibold">Total Hand Size:</span> 10 cards (5 players) or 8 cards (6 players).</li>
        </ul>
      </section>

      <section className="mb-6">
        <h3 className="text-2xl font-semibold mb-3 text-blue-600">Bidding</h3>
        <ul className="list-disc list-inside space-y-1 pl-4">
          <li><span className="font-semibold">Starting Bidder:</span> Player to the left of the dealer.</li>
          <li><span className="font-semibold">Minimum Bid:</span> 220 points.</li>
          <li><span className="font-semibold">Bidding Process:</span> Players bid clockwise. Each bid must be higher than the previous highest bid, in increments of 5 or 10 (this simulator allows any increment).</li>
          <li><span className="font-semibold">Passing:</span> A player can pass (bid 0). Once a player passes, they cannot bid again in that round.</li>
          <li><span className="font-semibold">Winning the Bid:</span> Bidding continues until only one player remains who has not passed. This player becomes the 'Bidder' for the round.</li>
          <li><span className="font-semibold">All Pass:</span> If all players pass on the first round of bidding, the hand is redealt by the next dealer.</li>
        </ul>
      </section>

      <section className="mb-6">
        <h3 className="text-2xl font-semibold mb-3 text-blue-600">Trump Selection</h3>
        <p className="mb-2">The player who won the bid chooses one of the four suits (♠, ♥, ♦, ♣) to be the trump suit for the round.</p>
      </section>

      <section className="mb-6">
        <h3 className="text-2xl font-semibold mb-3 text-blue-600">Partner Calling</h3>
        <ul className="list-disc list-inside space-y-1 pl-4">
          <li><span className="font-semibold">Purpose:</span> The Bidder needs partners to help reach the bid amount. The number of partners depends on the bid.</li>
          <li><span className="font-semibold">Number of Cards to Call:</span>
             <ul className="list-disc list-inside space-y-1 pl-6 mt-1">
                 <li>Bid 220-270: Call 1 card.</li>
                 <li>Bid 275-330: Call 2 cards.</li>
                 <li>Bid 335-350: Call 3 cards.</li>
             </ul>
          </li>
          <li><span className="font-semibold">How to Call (Simulator Rule):</span> The Bidder selects the required number of cards <span class="font-semibold text-red-600">from the set of all cards *not* currently in their own hand</span>.</li>
          <li><span className="font-semibold">Identifying Partners:</span> Players who hold the called card(s) become partners with the Bidder for the round. Team composition is kept secret until the end (though players can often deduce it during play).</li>
          <li><span className="font-semibold">Teams:</span> Bidder + Partners vs. Opposition (everyone else).</li>
        </ul>
         <p class="mt-3 text-sm text-gray-600 italic">Note: Traditional partner calling rules vary (e.g., calling specific high cards like Aces/Kings, or calling cards *from* the bidder's hand). This simulator uses the "any card not in hand" method.</p>
      </section>

      <section className="mb-6">
        <h3 className="text-2xl font-semibold mb-3 text-blue-600">Gameplay (Tricks)</h3>
        <ul className="list-disc list-inside space-y-1 pl-4">
           <li><span className="font-semibold">Leading:</span> The Bidder leads the first trick. The winner of each trick leads the next one.</li>
           <li><span className="font-semibold">Playing a Card:</span> Players play one card clockwise.</li>
           <li><span className="font-semibold">Following Suit:</span> Players <span class="font-semibold">must</span> play a card of the same suit as the card that was led, if they have one.</li>
           <li><span className="font-semibold">Trump Cards:</span> If a player cannot follow suit, they can play any card, including a trump card.</li>
           <li><span className="font-semibold">Winning a Trick:</span>
             <ul className="list-disc list-inside space-y-1 pl-6 mt-1">
                <li>If any trump cards were played, the highest-ranking trump card wins the trick.</li>
                <li>If no trump cards were played, the highest-ranking card of the suit that was led wins the trick.</li>
                <li>Rank order (high to low): A, K, Q, J, 10, 9, 8, 7, 6, 5, 4, 3, (2 where applicable).</li>
            </ul>
          </li>
          <li><span className="font-semibold">Captured Tricks:</span> The player who wins the trick collects the cards played and keeps them for scoring.</li>
        </ul>
      </section>

      <section className="mb-6">
        <h3 className="text-2xl font-semibold mb-3 text-blue-600">Scoring</h3>
        <ul className="list-disc list-inside space-y-1 pl-4">
          <li>At the end of the round (all cards played), each team sums the points from the point cards in the tricks they captured.</li>
          <li><span className="font-semibold">Bidder Team Wins If:</span> Their total score is <span class="font-semibold">greater than or equal to</span> the amount bid.</li>
          <li><span className="font-semibold">Opposition Team Wins If:</span> The Bidder Team's total score is <span class="font-semibold">less than</span> the amount bid.</li>
          <li>This simulator currently only scores one round at a time. Traditional games often involve multiple rounds and cumulative scoring.</li>
        </ul>
      </section>

    </div>
  );
}

export default Rulebook; 