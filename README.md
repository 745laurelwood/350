# 350

A web-based version of **350**, a 5- or 6-player partnership trick-taking card game with bidding and called partners. Play against AI opponents or with friends in a shared room.

## Rules

### Players and cards

350 is played by **five or six** players. Partnerships are not fixed; they are formed each round through "calling" cards. The game uses a standard 52-card deck with the small cards removed:

- **5 players**: remove the 2 of Hearts and 2 of Diamonds (50 cards).
- **6 players**: remove all four 2s (48 cards).

Card strength within a suit, **high → low**: A, K, Q, J, 10, 9, 8, 7, 6, 5, 4, 3 (and 2 where applicable).

Card points (count for the team that wins the trick):

| Card | Points |
| --- | --- |
| 3 of Spades (3♠) | 50 |
| Ace | 25 |
| King | 20 |
| Queen | 15 |
| Jack | 15 |
| Other (2–10, excluding 3♠) | 0 |

Total points in the deck = **350**.

### Deal and bidding

Deal and play are clockwise. The dealer rotates clockwise each round. Initial deal is 5 cards (5p) or 4 cards (6p) per player.

- The player to the dealer's left bids first.
- Legal bids range from **220** to **350**.
- Each new bid must strictly exceed the previous high bid.
- A pass is permanent. Once you pass, you are out of the auction.
- If everyone passes, the hand is redealt by the next dealer.

The last remaining bidder wins the auction. They choose a **trump suit**, openly. The dealer then deals the rest of the deck so that everyone has a full hand of **10** (5p) or **8** (6p) cards.

### Calling partners

Based on the winning bid, the bidder calls a number of cards from outside their hand:

| Bid | Cards to call |
| --- | --- |
| 220–270 | 1 |
| 275–330 | 2 |
| 335–350 | 3 |

Whoever holds a called card joins the bidder's team for the round. Team identities are kept secret during play (often inferred from gameplay) and revealed at round end.

### Play

The bid winner leads the first trick. Players must follow the led suit if able. Otherwise, any card may be played, including a trump. The highest trump wins the trick; if no trumps were played, the highest card of the led suit wins. The trick winner leads the next trick.

### Scoring

When the round ends, each team totals the card points from the tricks they captured.

- If the bidder team's total is **at or above** their bid, they make the bid: each player on the bidder team gains **+1 game point**, others gain 0.
- If the bidder team falls short, they miss the bid: each opposition player gains **+1 game point**, bidder team players gain 0.

The first player to **+5 game points** wins the match.

## Run locally

**Prerequisites**: Node.js, pnpm.

```bash
pnpm install
pnpm run dev
```
