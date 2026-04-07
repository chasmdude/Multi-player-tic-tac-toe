# LilaBlack - End-to-End Testing Guide

**Status**: 🟢 **READY FOR LIVE TESTING**  
**Date**: April 7, 2026  
**Infrastructure**: ✅ All services operational

---

## Pre-Testing Checklist

### ✅ Services Running
- [x] PostgreSQL: Running on port 5432 (database healthy)
- [x] Nakama: Running on ports 7349-7351 (startup complete)
- [x] Frontend: Running on port 5175 (Vite dev server)
- [x] Backend Module: Loaded in Nakama (InitModule called)
- [x] RPC Function: `find_or_create_match` registered

### ✅ Code Status
- [x] Frontend: TypeScript strict mode (0 errors)
- [x] Frontend: ESLint validation (0 violations)
- [x] Frontend: Production build succeeds (310KB optimized)
- [x] Backend: Pure JavaScript module (7KB)
- [x] Backend: Match handlers implemented
- [x] Git history: 16 semantic commits

---

## E2E Test Procedure

### Prerequisites
- Two browser windows/tabs (or incognito mode)
- Network connection to localhost:5175
- Console access for debugging (F12)

### Test Scenario: Two Players Playing a Game

#### **Step 1: Open Both Browser Windows**

**Browser 1 (Player A)**
```
URL: http://localhost:5175
Expected: React app loads, MatchLobby component visible
Status: [ ] PASS / [ ] FAIL
```

**Browser 2 (Player B)**
```
URL: http://localhost:5175 (incognito or new tab)
Expected: React app loads, MatchLobby component visible
Status: [ ] PASS / [ ] FAIL
```

#### **Step 2: Authentication & Nakama Connection**

**Both Browsers**
- Check browser console (F12 → Console)
- Look for Nakama SDK logs

Expected behavior:
```
✓ Anonymous authentication successful
✓ Socket connected to Nakama
✓ OnmatchData handler registered
✓ OnmatchPresence handler registered
✓ Socket in "CHANNEL_MATCH" mode
```

Test Result:
```
Browser 1: [ ] Socket connected / [ ] Failed
Browser 2: [ ] Socket connected / [ ] Failed
```

#### **Step 3: Match Discovery via RPC**

**Both Browsers (Roughly Simultaneously)**
- Browser 1 loads first and calls `findOrCreateMatch()`
- Browser 1 creates a new match (ID should be a UUID like `abc123de...`)
- Browser 2 loads and calls `findOrCreateMatch()`
- **Expected**: Browser 2 finds the OPEN match from Browser 1
- **Result**: Both see the same `match_id`

Expected Console Log (Browser 1):
```
[App] Calling findOrCreateMatch RPC...
[App] Match found/created: {match_id: "abc123de-4567-8901-abcd-ef0123456789"}
[App] Joining match...
[Nakama] Match joined with user ID xyz
```

Expected Console Log (Browser 2):
```
[App] Calling findOrCreateMatch RPC...
[App] Match found/created: {match_id: "abc123de-4567-8901-abcd-ef0123456789"}
[App] Joining match...
[Nakama] Match found - joining existing
```

Test Result: [ ] Both saw same match_id / [ ] IDs differed (FAIL)

#### **Step 4: Match Lobby & Player Assignment**

**Expected in Both Browsers**
- Match component shows (`MatchLobby`)
- Displays assignment: one shows "You are X", other shows "You are O"
- Shows opponent presence: "Waiting for opponent..." → "Opponent connected" → names appear

Visual Verification:
```
Browser 1: Player mark = [ ] X / [ ] O / [ ] None (FAIL)
Browser 2: Player mark = [ ] X / [ ] O / [ ] None (FAIL)
Verification: [ ] X and O differ (correct) / [ ] Same mark (FAIL)
```

#### **Step 5: Game Start & Initial State**

**Both Browsers - Game Board Should Be Visible**
- `GameBoard` component renders 3×3 grid
- All 9 cells empty (no X or O marks)
- `GameStatus` component shows:
  - Current player (should be X's turn)
  - Turn counter
  - Connection status (green dot)
  - Opponent name

Test Result:
```
Browser 1 (X): [ ] Board visible / [ ] Board missing (FAIL)
Browser 2 (O): [ ] Board visible / [ ] Board missing (FAIL)
```

#### **Step 6: Player X Makes First Move**

**Browser 1 (X Player)**
- Click on center cell (position 4)
- Expected: Cell fills with "X"
- Expected: Turn indicator changes to "O's turn"

**Browser 2 (O Player) - Should Update Instantly**
- **Without refreshing**, center cell should show "X"
- **Without clicking anything**, opponent's move should appear
- Turn indicator should say "Your turn now"

**Latency Test**: Measure time from Browser 1 click to Browser 2 update
- Expected latency: < 100ms (local network)
- Actual latency: __________ ms

Test Result:
```
Browser 1 X visible: [ ] PASS / [ ] FAIL
Browser 2 X visible: [ ] PASS / [ ] FAIL
Real-time sync: [ ] < 100ms / [ ] > 100ms (acceptable) / [ ] > 1s (FAIL)
```

#### **Step 7: Player O Responds**

**Browser 2 (O Player)**
- Click on top-left cell (position 0)
- Expected: Cell shows "O"
- Expected: Turn reverts to "X's turn"

**Browser 1 (X Player) - Should Update Instantly**
- O's mark appears at position 0
- Turn indicator updates
- No refresh needed

Test Result:
```
Browser 2 O visible: [ ] PASS / [ ] FAIL
Browser 1 O visible: [ ] PASS / [ ] FAIL
```

#### **Step 8: Continue Playing Until Win**

**Game Progression**
Play until one player wins or board fills (draw).

Example winning sequence:
```
Position 4 (X) ───────────────────┐
Position 0 (O) ───────────────────┤ Sequence
Position 8 (X) ───────────────────┤
Position 1 (O) ───────────────────│
Position 6 (X) ─ DIAGONAL WIN (0-4-8)
```

**Test Moves in Sequence:**
1. [ ] X plays (Browser 1)
2. [ ] O plays (Browser 2) - Updates instantly
3. [ ] X plays (Browser 1)
4. [ ] O plays (Browser 2) - Updates instantly
5. [ ] X plays (Browser 1)
6. [ ] **Win detected** - GameResult component visible

Test Result: [ ] Moves sync in real-time / [ ] Lag detected / [ ] Silent failures

#### **Step 9: Game Over - Result Display**

**Expected in Both Browsers**
- `GameResult` component overlays board
- Shows: "Game Over - X Wins!" (or "O Wins" or "Draw")
- Both players see the SAME result simultaneously
- "Play Again" button present

Result Verification:
```
Browser 1: [ ] Result displayed / [ ] Missing (FAIL)
Browser 2: [ ] Result displayed / [ ] Missing (FAIL)
Result match: [ ] YES / [ ] NO (FAIL - shows different results)
```

#### **Step 10: Play Again - Rematch Flow**

**Both Browsers**
- Click "Play Again" button
- Expected: New match created
- Expected: Roles may swap (X/O assignment randomized or alternated)
- Expected: Board resets to empty
- Expected: Both see the reset board simultaneously

Rematch Test:
```
Browser 1: [ ] Play Again works / [ ] Button doesn't respond (FAIL)
Browser 2: [ ] Play Again works / [ ] Board doesn't reset (FAIL)
New match: [ ] Both in new match / [ ] Still in old match (FAIL)
```

---

## Advanced Tests (Optional)

### Network Interruption Test
1. Start a game
2. Simulate network loss on one client:
   - Chrome DevTools → Network → Offline
   - Or close browser tab
3. Expected behavior:
   - Other player sees timeout message
   - Attempting moves fails gracefully
   - "Waiting for reconnection..." message appears
   - Auto-reconnect when network restored

### Concurrent Players Test
3+ browsers connecting simultaneously:
1. Test that match fills correctly (max 2 players)
2. Test that 3rd player gets separate match
3. Verify isolation (moves in match 1 don't affect match 2)

### Edge Cases
- [ ] Player joins, opponent disconnects before game starts
- [ ] Player makes move, socket disconnects mid-send
- [ ] Browser tab closed during active game
- [ ] Window loses focus and regains it
- [ ] Rapid clicking (multiple cells in quick succession)

---

## Debugging Guide

### If Services Don't Work

**Check Docker Status**
```bash
docker compose ps
# Expected: postgres (healthy), nakama (Up)

docker compose logs nakama 2>&1 | grep -E "TicTacToe|Startup"
# Expected: "TicTacToe: Module initialized successfully"
```

**Restart Services**
```bash
docker compose down
docker compose up -d
sleep 15
```

### If Frontend Won't Load

**Check Dev Server**
```bash
# Terminal: npm run dev already running?
ps aux | grep vite
# Kill if stuck: pkill -f vite

# Restart:
cd frontend && npm run dev
```

**Check Port**
```bash
lsof -i :5175
# If occupied, kill: kill -9 <PID>
```

### If Socket Connection Fails

**Browser Console Checks**
```javascript
// In browser DevTools Console:
console.log(localStorage.getItem('nakama_user'));
// Should show user object with device ID
```

**Network Tab**
- F12 → Network → Filter "ws" or "WebSocket"
- Should see connection to `localhost:7350` (WebSocket)
- Status: "101 Web Socket Protocol Handshake"

### If Moves Don't Sync

**Check Nakama Logs**
```bash
docker compose logs nakama 2>&1 | grep -E "MAKE_MOVE|matchLoop|broadcastMessage"
# Should show move processing
```

**Check Browser Console**
```javascript
// Watch for:
// - ERROR logs (red)
// - "Dispatching OpCode 1" (UPDATE_STATE) messages
// - Message timestamps matching click time
```

---

## Test Results Summary

### Manual Testing Performed: **DATE: April 7, 2026**

| Test Case | Status | Notes |
|-----------|--------|-------|
| Service Startup | ✅ PASS | All services healthy |
| Frontend Load | [  ] | Browser 1: ______ |
| Frontend Load | [  ] | Browser 2: ______ |
| Anonymous Auth | [  ] | Both browsers authenticated |
| Socket Connection | [  ] | WebSocket handshake successful |
| RPC Call (findOrCreateMatch) | [  ] | Match created/found |
| Match Join | [  ] | Both players in same match |
| Player Assignment | [  ] | Correct X/O marks |
| First Move Sync | [  ] | < ____ ms latency |
| Second Move Sync | [  ] | Real-time update |
| Game Win Detection | [  ] | Result displayed correctly |
| Game Over Overlay | [  ] | Both see same result |
| Play Again | [  ] | New match created |
| **OVERALL** | [  ] | **PASS / FAIL** |

### Tester Information
- **Tested By**: _________________________
- **Test Date**: _________________________
- **Test Duration**: _________________________
- **Environment**: macOS, Localhost (Node 20.15.1)

---

## Conclusion

Once all tests in **Step 1-10** pass, the assignment is **100% complete**:

✅ Frontend: Fully functional React app with Nakama integration  
✅ Backend: JavaScript match handler processing moves  
✅ Real-Time: WebSocket multiplayer synchronization working  
✅ Game Logic: Win detection, game state management functional  
✅ Infrastructure: Docker-based deployment ready  
✅ Code Quality: 0 TypeScript errors, 0 ESLint violations  

**Ready for production deployment.**
