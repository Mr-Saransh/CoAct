const { createServer } = require('http')
const next = require('next')
const { Server } = require('socket.io')

const port = parseInt(process.env.PORT || '3000', 10)
const dev = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0'
const server = createServer()
const path = require('path')
const app = next({ dev, dir: __dirname, hostname, port, webpack: true })
const handle = app.getRequestHandler()


app.prepare().then(() => {
  const io = new Server(server, { 
    cors: { origin: '*', methods: ['GET', 'POST'] }
  })

  server.on('request', (req, res) => {
    const reqUrl = new URL(req.url || '/', `http://${hostname}:${port}`)
    if (reqUrl.pathname.startsWith('/socket.io/')) return
    handle(req, res)
  })

  /** @type {Map<string, {id:string, hostId:string, hostName:string, mode:string, status:string, activityData:object, participants:Array, createdAt:number}>} */
  const sessions = new Map()
  const unoTimers = new Map()
  const wordChainTimers = new Map()
  const ludoPity = new Map() // sessionId -> { playerName -> nonSixCount }

  function broadcastState(sessionId) {
    const s = sessions.get(sessionId)
    if (s) io.to(sessionId).emit('session:state', s)
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }

  function createUnoDeck() {
    const colors = ['red', 'blue', 'green', 'yellow']
    const deck = []
    let n = 0
    for (const color of colors) {
      deck.push({ id: `c${n++}`, color, type: 'number', value: 0 })
      for (let v = 1; v <= 9; v++) {
        deck.push({ id: `c${n++}`, color, type: 'number', value: v })
        deck.push({ id: `c${n++}`, color, type: 'number', value: v })
      }
      for (let i = 0; i < 2; i++) {
        deck.push({ id: `c${n++}`, color, type: 'skip', value: null })
        deck.push({ id: `c${n++}`, color, type: 'reverse', value: null })
        deck.push({ id: `c${n++}`, color, type: 'draw2', value: null })
      }
    }
    for (let i = 0; i < 4; i++) {
      deck.push({ id: `c${n++}`, color: 'wild', type: 'wild', value: null })
      deck.push({ id: `c${n++}`, color: 'wild', type: 'wild4', value: null })
    }
    return shuffle(deck)
  }

  function clearUnoTimer(sessionId) {
    const t = unoTimers.get(sessionId)
    if (t) {
      clearTimeout(t.timeout)
      unoTimers.delete(sessionId)
    }
  }

  function advanceTurn(state, steps = 1) {
    const len = state.order.length
    const idx = state.order.indexOf(state.turn)
    const dir = state.direction === 'clockwise' ? 1 : -1
    const next = ((idx + dir * steps) % len + len) % len
    state.turn = state.order[next]
  }

  function drawFromPile(state, amount) {
    const out = []
    for (let i = 0; i < amount; i++) {
      if (state.drawPile.length === 0) {
        const top = state.discardPile.pop()
        if (state.discardPile.length > 0) {
          state.drawPile = shuffle([...state.discardPile])
          state.discardPile = top ? [top] : []
        }
      }
      const c = state.drawPile.pop()
      if (!c) break
      out.push(c)
    }
    return out
  }

  function isPlayable(card, state) {
    if (!state.currentCard) return true
    if (card.type === 'wild' || card.type === 'wild4') return true
    if (card.color === state.currentColor) return true
    if (card.type === 'number' && state.currentCard.type === 'number' && card.value === state.currentCard.value) return true
    if (card.type !== 'number' && state.currentCard.type !== 'number' && card.type === state.currentCard.type) return true
    return false
  }

  function startUnoTimer(sessionId) {
    clearUnoTimer(sessionId)
    const session = sessions.get(sessionId)
    if (!session || session.mode !== 'uno') return
    const state = session.activityData
    if (!state || state.status !== 'live' || state.winner) return

    const turnDurationMs = 12000
    state.turnDurationMs = turnDurationMs
    state.turnEndsAt = Date.now() + turnDurationMs
    broadcastState(sessionId)

    const timeout = setTimeout(() => {
      const s = sessions.get(sessionId)
      if (!s || s.mode !== 'uno' || s.activityData.winner) return
      const uno = s.activityData
      const current = uno.turn
      const drawn = drawFromPile(uno, 1)
      if (drawn.length) uno.players[current].cards.push(drawn[0])
      uno.hasDrawnThisTurn = false
      io.to(sessionId).emit('auto_skip', { user: current, drawn: drawn.length })
      io.to(sessionId).emit('next_turn', { from: current })
      advanceTurn(uno, 1)
      startUnoTimer(sessionId)
      broadcastState(sessionId)
    }, turnDurationMs)

    unoTimers.set(sessionId, { timeout })
  }

  function clearWordChainTimer(sessionId) {
    const t = wordChainTimers.get(sessionId)
    if (t) {
      clearTimeout(t.timeout)
      wordChainTimers.delete(sessionId)
    }
  }

  function startWordChainTimer(sessionId) {
    clearWordChainTimer(sessionId)
    const session = sessions.get(sessionId)
    if (!session || session.mode !== 'wordchain') return
    const state = session.activityData
    if (!state || state.status !== 'live' || state.winner) return

    const turnDurationMs = 15000 // 15 seconds
    state.turnDurationMs = turnDurationMs
    state.turnEndsAt = Date.now() + turnDurationMs
    broadcastState(sessionId)

    const timeout = setTimeout(() => {
      const s = sessions.get(sessionId)
      if (!s || s.mode !== 'wordchain' || s.activityData.winner) return
      const data = s.activityData
      const current = data.participantOrder[data.currentTurnIndex]
      
      // Auto-skip and mark as loser if we want, but for now just skip turn
      io.to(sessionId).emit('wordchain:timeout', { user: current })
      data.currentTurnIndex = (data.currentTurnIndex + 1) % data.participantOrder.length
      startWordChainTimer(sessionId)
      broadcastState(sessionId)
    }, turnDurationMs)

    wordChainTimers.set(sessionId, { timeout })
  }

  const LUDO_COLORS = ['red', 'blue', 'yellow', 'green']
  const LUDO_START_INDEX = { red: 0, blue: 13, yellow: 26, green: 39 }
  const LUDO_SAFE = [0, 8, 13, 21, 26, 34, 39, 47]

  function ludoBoardIndex(color, progress) {
    if (progress < 0 || progress > 50) return null
    return (LUDO_START_INDEX[color] + progress) % 52
  }

  function ludoValidMoves(player, diceValue) {
    if (!diceValue) return []
    const out = []
    player.tokens.forEach((p, idx) => {
      if (p < 0 && diceValue === 6) out.push(idx)
      else if (p >= 0 && p + diceValue <= 56) out.push(idx)
    })
    return out
  }

  function ludoNextPlayer(state) {
    const idx = state.players.findIndex(p => p.name === state.turn)
    const next = (idx + 1) % state.players.length
    state.turn = state.players[next].name
  }

  function ensureBoardState(session) {
    if (!session.activityData) session.activityData = {}
    if (!session.activityData.board) {
      session.activityData.board = {
        mode: 'live', // live | private
        livePermission: 'all', // all | host | selected
        allowedUsers: [],
        elements: [],
      }
    }
    return session.activityData.board
  }

  function isSpectator(session, userName) {
    return Array.isArray(session.spectators) && session.spectators.includes(userName)
  }

  function canDrawLive(session, board, userName, socketId) {
    if (isSpectator(session, userName)) return false
    if (board.livePermission === 'all') return true
    if (board.livePermission === 'host') return session.hostId === socketId
    if (board.livePermission === 'selected') {
      return session.hostId === socketId || (Array.isArray(board.allowedUsers) && board.allowedUsers.includes(userName))
    }
    return false
  }

  io.on('connection', (socket) => {
    // ==========================================
    // ANTAKSHARI & RMCS GLOBAL LISTENERS
    // ==========================================
    socket.on('antakshari:ping', () => {
      socket.emit('antakshari:pong', { time: Date.now(), socketId: socket.id });
    });

    socket.on('antakshari:join_team', ({ sessionId, team, targetName }) => {
      const sId = sessionId || socket.data.sessionId;
      console.log(`[antakshari] join_team → sess:${sId} team:${team} target:${targetName}`);
      const session = sessions.get(sId);
      if (!session) return;
      
      const name = targetName || socket.data.name || session.participants.find(p => p.id === socket.id)?.name;
      if (!name) return;

      if (!session.activityData) session.activityData = {};
      if (!session.activityData.teams) session.activityData.teams = { A: [], B: [], solo: [] };

      const teams = session.activityData.teams;
      teams.A = (teams.A || []).filter(n => n !== name);
      teams.B = (teams.B || []).filter(n => n !== name);
      teams.solo = (teams.solo || []).filter(n => n !== name);

      if (team === 'A') teams.A.push(name);
      else if (team === 'B') teams.B.push(name);
      else teams.solo.push(name);

      broadcastState(sId);
      socket.emit('session:state', session); // Direct echo for instant feedback
    });

    socket.on('antakshari:start', ({ sessionId, gameMode }) => {
      const sId = sessionId || socket.data.sessionId;
      console.log(`[antakshari] start_arena → sess:${sId} mode:${gameMode}`);
      const session = sessions.get(sId);
      if (!session) return;

      const teams = session.activityData.teams || { A: [], B: [], solo: [] };
      const assignedNames = [...(teams.A || []), ...(teams.B || []), ...(teams.solo || [])];
      
      let participants = session.participants.filter(p => 
        p.isConnected && (assignedNames.includes(p.name) || p.role === 'host' || session.players.includes(p.name))
      );

      if (participants.length === 0) participants = session.participants.filter(p => p.isConnected);

      console.log(`[antakshari] Starting with ${participants.length} players`);

      session.mode = 'antakshari';
      session.status = 'live';
      
      session.activityData = {
        gameMode: gameMode || 'solo',
        players: participants.map(p => ({ 
          name: p.name, 
          score: 0, 
          team: (teams.A || []).includes(p.name) ? 'A' : ((teams.B || []).includes(p.name) ? 'B' : 'solo') 
        })),
        teams: teams,
        turnIndex: 0,
        currentLetter: "A",
        history: [],
        phase: 'singing',
        timer: 15,
      };

      const firstPlayer = session.activityData.players[0]?.name;
      if (firstPlayer) {
        session.participants.forEach(p => {
          if (p.role !== 'host') {
            p.mutedByHost = (p.name !== firstPlayer);
            if (p.mutedByHost) p.micOn = false;
          }
        });
      }

      broadcastState(sId);
      socket.emit('session:state', session);
    });

    socket.on('antakshari:submit', ({ sessionId, text, nextLetter }) => {
      const sId = sessionId || socket.data.sessionId;
      console.log(`[antakshari] submission → sess:${sId} text:${text}`);
      const session = sessions.get(sId);
      if (!session || !session.activityData.players) return;
      
      const data = session.activityData;
      const currentPlayer = data.players[data.turnIndex];
      
      data.players[data.turnIndex].score += 10;
      data.history.push({ text, author: currentPlayer.name, letter: data.currentLetter });
      data.currentLetter = nextLetter || "A";
      data.turnIndex = (data.turnIndex + 1) % data.players.length;

      const nextSinger = data.players[data.turnIndex]?.name;
      session.participants.forEach(p => {
        if (p.role !== 'host') {
          p.mutedByHost = (p.name !== nextSinger);
          if (p.mutedByHost) p.micOn = false;
        }
      });

      broadcastState(sId);
      socket.emit('session:state', session);
    });

    socket.on('antakshari:fail', ({ sessionId }) => {
      const sId = sessionId || socket.data.sessionId;
      console.log(`[antakshari] turn_fail → sess:${sId}`);
      const session = sessions.get(sId);
      if (!session || !session.activityData.players) return;

      const data = session.activityData;
      const currentPlayer = data.players[data.turnIndex];

      if (data.gameMode === 'teams') {
        const otherTeam = currentPlayer.team === 'A' ? 'B' : 'A';
        data.players.forEach(p => { if (p.team === otherTeam) p.score += 5; });
      }

      data.turnIndex = (data.turnIndex + 1) % data.players.length;
      const nextSinger = data.players[data.turnIndex]?.name;
      session.participants.forEach(p => {
        if (p.role !== 'host') {
          p.mutedByHost = (p.name !== nextSinger);
          if (p.mutedByHost) p.micOn = false;
        }
      });

      broadcastState(sId);
      socket.emit('session:state', session);
    });
    // ==========================================

    socket.on('session:join', ({ sessionId, name, role }) => {
      if (!sessionId || !name) {
        socket.emit('session:error', { message: 'Missing sessionId or name' })
        return
      }

      let session = sessions.get(sessionId)

      if (role === 'host') {
        if (!session) {
          session = {
            id: sessionId,
            hostId: socket.id,
            hostName: name,
            mode: 'lobby',
            status: 'waiting',
            activityData: {},
            participants: [],
            players: [], // Active players
            spectators: [], // View-only participants
            maxPlayers: 4, // Default max players
            chatMessages: [],
            reactions: [], // Floating reactions
            createdAt: Date.now(),
          }
          sessions.set(sessionId, session)
          console.log(`  ★ session ${sessionId} created by ${name}`)
        } else {
          session.hostId = socket.id
          session.hostName = name
        }
      }

      if (role === 'participant' && !session) {
        socket.emit('session:error', { message: 'Session not found' })
        return
      }

      let existingP = session.participants.find(p => p.name === name)
      if (existingP) {
        existingP.id = socket.id
        existingP.role = role
        existingP.joinedAt = Date.now()
        existingP.isConnected = true
      } else {
        session.participants.push({ 
          id: socket.id, 
          name, 
          role, 
          joinedAt: Date.now(),
          isConnected: true,
          micOn: false,
          mutedByHost: false
        })
      }

      socket.join(sessionId)
      // Tag socket so we can clean up on disconnect
      socket.data.sessionId = sessionId
      socket.data.name = name
      socket.data.role = role

      console.log(`  → ${name} (${role}) joined ${sessionId}  [${session.participants.length} total]`)
      
      // Auto-assign role if not already assigned
      if (!session.players.includes(name) && !session.spectators.includes(name)) {
        if (session.players.length < session.maxPlayers) {
          session.players.push(name)
        } else {
          session.spectators.push(name)
        }
      }

      broadcastState(sessionId)
    })

    socket.on('session:toggle_role', ({ sessionId, targetName }) => {
      const session = sessions.get(sessionId)
      if (!session || session.hostId !== socket.id) return
      
      if (session.players.includes(targetName)) {
        // Player -> Spectator
        session.players = session.players.filter(n => n !== targetName)
        if (!session.spectators.includes(targetName)) session.spectators.push(targetName)
      } else if (session.spectators.includes(targetName)) {
        // Spectator -> Player
        if (session.players.length < session.maxPlayers) {
          session.spectators = session.spectators.filter(n => n !== targetName)
          if (!session.players.includes(targetName)) session.players.push(targetName)
        }
      }
      broadcastState(sessionId)
    })

    socket.on('session:set_max_players', ({ sessionId, count }) => {
      const session = sessions.get(sessionId)
      if (!session || session.hostId !== socket.id) return
      session.maxPlayers = count
      // If we reduced max players, demote last players to spectators
      while (session.players.length > count) {
        const demoted = session.players.pop()
        if (demoted && !session.spectators.includes(demoted)) session.spectators.push(demoted)
      }
      broadcastState(sessionId)
    })

    socket.on('session:reaction', ({ sessionId, userName, emoji }) => {
      const session = sessions.get(sessionId)
      if (!session) return
      const reaction = {
        id: Math.random().toString(36).substr(2, 9),
        userName,
        emoji,
        createdAt: Date.now()
      }
      io.to(sessionId).emit('session:reaction', reaction)
    })

    socket.on('session:activity', ({ sessionId, mode, activityData, status }) => {
      const session = sessions.get(sessionId)
      if (!session) return
      session.mode = mode
      session.status = status || 'live'
      session.activityData = activityData || {}
      console.log(`  ▶ ${sessionId} → ${mode} (${session.status})`)
      broadcastState(sessionId)
    })

    socket.on('session:updateActivity', ({ sessionId, activityData, status }) => {
      const session = sessions.get(sessionId)
      if (!session) return
      if (activityData) session.activityData = activityData
      if (status) session.status = status
      console.log(`  ↻ ${sessionId} updated activity (${session.status})`)
      broadcastState(sessionId)
    })

    socket.on('session:end', ({ sessionId }) => {
      const session = sessions.get(sessionId)
      if (!session) return
      clearUnoTimer(sessionId)
      session.mode = 'lobby'
      session.status = 'waiting'
      session.activityData = {}
      console.log(`  ■ ${sessionId} → lobby`)
      broadcastState(sessionId)
    })

    socket.on('session:promote', ({ sessionId, targetUserId }) => {
      const session = sessions.get(sessionId)
      if (!session) return
      
      const targetUser = session.participants.find(p => p.id === targetUserId)
      const currentHost = session.participants.find(p => p.id === session.hostId)
      
      if (targetUser) {
        session.hostId = targetUser.id
        session.hostName = targetUser.name
        targetUser.role = 'host'
        
        if (currentHost) {
          currentHost.role = 'participant'
        }
        
        console.log(`  👑 ${targetUser.name} promoted to host in ${sessionId}`)
        broadcastState(sessionId)
      }
    })

    socket.on('board:set_config', ({ sessionId, mode, livePermission, allowedUsers }) => {
      const session = sessions.get(sessionId)
      if (!session || session.mode !== 'board' || session.hostId !== socket.id) return
      const board = ensureBoardState(session)
      if (mode === 'live' || mode === 'private') board.mode = mode
      if (livePermission === 'all' || livePermission === 'host' || livePermission === 'selected') {
        board.livePermission = livePermission
      }
      if (Array.isArray(allowedUsers)) board.allowedUsers = allowedUsers
      broadcastState(sessionId)
    })

    socket.on('board:sync_state', ({ sessionId, elements }) => {
      const session = sessions.get(sessionId)
      if (!session || session.mode !== 'board') return
      const userName = socket.data.name
      if (!userName) return
      const board = ensureBoardState(session)
      if (board.mode !== 'live') return
      if (!canDrawLive(session, board, userName, socket.id)) return
      if (!Array.isArray(elements)) return
      board.elements = elements
      broadcastState(sessionId)
    })

    socket.on('board:submit_private', ({ sessionId, elements }) => {
      const session = sessions.get(sessionId)
      if (!session || session.mode !== 'board') return
      const userName = socket.data.name
      if (!userName || isSpectator(session, userName)) return
      const board = ensureBoardState(session)
      if (board.mode !== 'private') return
      if (!Array.isArray(elements) || elements.length === 0) return
      board.elements = [...board.elements, ...elements]
      broadcastState(sessionId)
    })

    // Backward compatibility for older board client.
    socket.on('board:update', ({ sessionId, nodes }) => {
      const session = sessions.get(sessionId)
      if (!session) return
      const board = ensureBoardState(session)
      board.elements = Array.isArray(nodes) ? nodes : []
      broadcastState(sessionId)
    })

    socket.on('poll:vote', ({ sessionId, userName, option }) => {
      const session = sessions.get(sessionId)
      if (!session || session.mode !== 'poll') return
      
      const activityData = session.activityData
      if (!activityData.votedUsers) activityData.votedUsers = []
      
      if (!activityData.votedUsers.includes(userName)) {
        activityData.votedUsers.push(userName)
        activityData.votes[option] = (activityData.votes[option] || 0) + 1
        activityData.totalVotes = (activityData.totalVotes || 0) + 1
        
        console.log(`  📊 ${userName} voted for ${option} in ${sessionId}`)
        broadcastState(sessionId)
      }
    })

    socket.on('quiz:answer', ({ sessionId, userName, answer }) => {
      const session = sessions.get(sessionId)
      if (!session || session.mode !== 'quiz') return
      
      const activityData = session.activityData
      if (!activityData.answers) activityData.answers = {}
      
      if (activityData.answers[userName] === undefined) {
        activityData.answers[userName] = answer
        console.log(`  📝 ${userName} answered in quiz ${sessionId}`)
        broadcastState(sessionId)
      }
    })

    socket.on('qa:submit', ({ sessionId, userName, text }) => {
      const session = sessions.get(sessionId)
      if (!session || session.mode !== 'qa') return
      
      const activityData = session.activityData
      if (!activityData.responses) activityData.responses = []
      
      activityData.responses.unshift({
        id: Math.random().toString(36).substr(2, 9),
        text,
        author: userName,
        visible: true
      })
      
      console.log(`  💬 ${userName} submitted Q&A in ${sessionId}`)
      broadcastState(sessionId)
    })

    socket.on('tasks:toggle', ({ sessionId, taskId, completed }) => {
      const session = sessions.get(sessionId)
      if (!session || session.mode !== 'tasks') return
      
      const activityData = session.activityData
      if (activityData.tasks) {
        const task = activityData.tasks.find(t => t.id === taskId)
        if (task) {
          task.completed = completed
          console.log(`  ☑️ Task ${taskId} marked as ${completed} in ${sessionId}`)
          broadcastState(sessionId)
        }
      }
    })

    socket.on('fitb:answer', ({ sessionId, userName, answer }) => {
      const session = sessions.get(sessionId)
      if (!session || session.mode !== 'fitb') return
      
      const activityData = session.activityData
      if (!activityData.responses) activityData.responses = {}
      
      if (activityData.responses[userName] === undefined) {
        activityData.responses[userName] = answer
        console.log(`  ✍️ ${userName} answered FITB in ${sessionId}`)
        broadcastState(sessionId)
      }
    })

    socket.on('wordchain:start', ({ sessionId }) => {
      const session = sessions.get(sessionId)
      if (!session || session.mode !== 'wordchain' || session.hostId !== socket.id) return
      
      const players = session.players || []
      if (players.length < 1) return

      session.status = 'live'
      session.activityData = {
        status: 'live',
        participantOrder: players,
        currentTurnIndex: 0,
        words: [],
        turnDurationMs: 15000,
        turnEndsAt: Date.now() + 15000
      }
      
      startWordChainTimer(sessionId)
      broadcastState(sessionId)
    })

    socket.on('wordchain:submit', ({ sessionId, userName, word }) => {
      const session = sessions.get(sessionId)
      if (!session || session.mode !== 'wordchain') return
      const state = session.activityData
      if (!state || state.status !== 'live') return
      
      const currentTurn = state.participantOrder[state.currentTurnIndex]
      if (currentTurn !== userName) return

      state.words.push({ word, author: userName })
      state.currentTurnIndex = (state.currentTurnIndex + 1) % state.participantOrder.length
      
      startWordChainTimer(sessionId)
      broadcastState(sessionId)
    })

    socket.on('wordchain:skip', ({ sessionId }) => {
      const session = sessions.get(sessionId)
      if (!session || session.mode !== 'wordchain' || session.hostId !== socket.id) return
      const state = session.activityData
      if (!state || state.status !== 'live') return

      state.currentTurnIndex = (state.currentTurnIndex + 1) % state.participantOrder.length
      startWordChainTimer(sessionId)
      broadcastState(sessionId)
    })

    socket.on('wordchain:reset', ({ sessionId }) => {
      const session = sessions.get(sessionId)
      if (!session || session.mode !== 'wordchain' || session.hostId !== socket.id) return
      clearWordChainTimer(sessionId)
      session.status = 'waiting'
      session.activityData = {
        participantOrder: [],
        currentTurnIndex: 0,
        words: []
      }
      broadcastState(sessionId)
    })

    socket.on('mostlikely:vote', ({ sessionId, userName, target }) => {
      const session = sessions.get(sessionId)
      if (!session || session.mode !== 'mostlikely') return
      
      const activityData = session.activityData
      if (!activityData.votes) activityData.votes = {}
      
      if (activityData.votes[userName] === undefined) {
        activityData.votes[userName] = target
        console.log(`  ✨ ${userName} voted for ${target} in Most Likely To in ${sessionId}`)
        broadcastState(sessionId)
      }
    })

    socket.on('study:notes', ({ sessionId, notes }) => {
      const session = sessions.get(sessionId)
      if (!session || session.mode !== 'study') return
      session.activityData.notes = notes
      broadcastState(sessionId)
    })

    socket.on('uno:start', ({ sessionId, cardsPerPlayer }) => {
      const session = sessions.get(sessionId)
      if (!session || session.mode !== 'uno') return
      if (session.hostId !== socket.id) return
      
      // Use the selected players list
      const players = session.participants.filter(p => p.isConnected && session.players.includes(p.name))
      if (players.length < 2 || players.length > 10) return
      const handSize = cardsPerPlayer === 9 ? 9 : 7

      const deck = createUnoDeck()
      const order = players.map(p => p.name)
      const playerState = {}
      for (const name of order) {
        playerState[name] = { cards: deck.splice(0, handSize) }
      }

      let first = deck.pop()
      while (first && (first.type === 'wild' || first.type === 'wild4')) {
        deck.unshift(first)
        first = deck.pop()
      }
      if (!first) return

      const turn = order[Math.floor(Math.random() * order.length)]
      session.status = 'live'
      session.activityData = {
        players: playerState,
        order,
        drawPile: deck,
        discardPile: [first],
        currentCard: first,
        currentColor: first.color,
        turn,
        direction: 'clockwise',
        status: 'live',
        cardsPerPlayer: handSize,
        winner: null,
        turnEndsAt: null,
        turnDurationMs: 12000,
        hasDrawnThisTurn: false,
      }

      io.to(sessionId).emit('next_turn', { to: turn })
      startUnoTimer(sessionId)
      broadcastState(sessionId)
    })

    socket.on('uno:draw_card', ({ sessionId }) => {
      const session = sessions.get(sessionId)
      if (!session || session.mode !== 'uno') return
      const state = session.activityData
      if (!state || state.status !== 'live' || state.winner) return
      const user = socket.data.name
      if (!user || state.turn !== user) return
      if (state.hasDrawnThisTurn) return

      const hand = state.players[user]?.cards || []
      const hasPlayable = hand.some(c => isPlayable(c, state))
      if (hasPlayable) return

      const drawn = drawFromPile(state, 1)
      if (!drawn.length) return
      hand.push(drawn[0])
      state.hasDrawnThisTurn = true
      io.to(sessionId).emit('draw_card', { user, count: 1 })

      if (!isPlayable(drawn[0], state)) {
        state.hasDrawnThisTurn = false
        io.to(sessionId).emit('next_turn', { from: user })
        advanceTurn(state, 1)
        startUnoTimer(sessionId)
      }
      broadcastState(sessionId)
    })

    socket.on('uno:play_card', ({ sessionId, cardId, color }) => {
      const session = sessions.get(sessionId)
      if (!session || session.mode !== 'uno') return
      const state = session.activityData
      if (!state || state.status !== 'live' || state.winner) return

      const user = socket.data.name
      if (!user || state.turn !== user) return
      const hand = state.players[user]?.cards || []
      const idx = hand.findIndex(c => c.id === cardId)
      if (idx === -1) return
      const card = hand[idx]
      if (!isPlayable(card, state)) return
      if ((card.type === 'wild' || card.type === 'wild4') && !['red', 'blue', 'green', 'yellow'].includes(color)) return

      hand.splice(idx, 1)
      state.discardPile.push(card)
      state.currentCard = card
      state.currentColor = card.type === 'wild' || card.type === 'wild4' ? color : card.color
      state.hasDrawnThisTurn = false

      io.to(sessionId).emit('play_card', { user, cardType: card.type, color: state.currentColor })
      if (card.type === 'wild' || card.type === 'wild4') io.to(sessionId).emit('choose_color', { user, color: state.currentColor })

      if (hand.length === 0) {
        state.winner = user
        state.status = 'ended'
        clearUnoTimer(sessionId)
        io.to(sessionId).emit('game_end', { winner: user })
        broadcastState(sessionId)
        return
      }

      let skip = false
      let drawCount = 0
      if (card.type === 'reverse') {
        state.direction = state.direction === 'clockwise' ? 'counterclockwise' : 'clockwise'
        if (state.order.length === 2) skip = true
      } else if (card.type === 'skip') {
        skip = true
      } else if (card.type === 'draw2') {
        drawCount = 2
        skip = true
      } else if (card.type === 'wild4') {
        drawCount = 4
        skip = true
      }

      if (drawCount > 0) {
        const dir = state.direction === 'clockwise' ? 1 : -1
        const idxTurn = state.order.indexOf(state.turn)
        const target = state.order[((idxTurn + dir) % state.order.length + state.order.length) % state.order.length]
        const drawn = drawFromPile(state, drawCount)
        state.players[target].cards.push(...drawn)
        io.to(sessionId).emit('apply_effect', { type: card.type, target, drawCount: drawn.length })
      } else if (card.type !== 'number') {
        io.to(sessionId).emit('apply_effect', { type: card.type })
      }

      io.to(sessionId).emit('next_turn', { from: user })
      advanceTurn(state, skip ? 2 : 1)
      startUnoTimer(sessionId)
      broadcastState(sessionId)
    })

    socket.on('ludo:start', ({ sessionId }) => {
      const session = sessions.get(sessionId)
      if (!session || session.mode !== 'ludo') return
      if (session.hostId !== socket.id) return

      // Use the selected players list
      const joined = session.participants.filter(p => p.isConnected && session.players.includes(p.name))
      if (joined.length < 2 || joined.length > 4) return

      const players = joined.map((p, idx) => ({
        name: p.name,
        color: LUDO_COLORS[idx],
        tokens: [-1, -1, -1, -1],
        finished: 0,
      }))

      session.status = 'live'
      session.activityData = {
        status: 'live',
        players,
        turn: players[Math.floor(Math.random() * players.length)].name,
        diceValue: null,
        phase: 'roll',
        winner: null,
        safeSquares: LUDO_SAFE,
      }
      io.to(sessionId).emit('ludo:turn_changed', { turn: session.activityData.turn })
      broadcastState(sessionId)
    })

    socket.on('ludo:roll_dice', ({ sessionId }) => {
      const session = sessions.get(sessionId)
      if (!session || session.mode !== 'ludo') return
      const state = session.activityData
      if (!state || state.status !== 'live' || state.winner) return

      const user = socket.data.name
      if (!user || user !== state.turn || state.phase !== 'roll') return
      const player = state.players.find(p => p.name === user)
      if (!player) return

      // Pity system logic
      let sessionPity = ludoPity.get(sessionId);
      if (!sessionPity) {
        sessionPity = {};
        ludoPity.set(sessionId, sessionPity);
      }
      
      let nonSixCount = sessionPity[user] || 0;
      let diceValue;

      if (nonSixCount >= 6) {
        diceValue = 6;
        sessionPity[user] = 0;
      } else {
        diceValue = Math.floor(Math.random() * 6) + 1;
        if (diceValue === 6) {
          sessionPity[user] = 0;
        } else {
          sessionPity[user] = nonSixCount + 1;
        }
      }

      state.diceValue = diceValue
      io.to(sessionId).emit('ludo:dice_rolled', { player: user, value: diceValue })

      const moves = ludoValidMoves(player, diceValue)
      if (moves.length === 0) {
        // Broadcast the roll first so they see it
        broadcastState(sessionId)
        
        setTimeout(() => {
          const currentSession = sessions.get(sessionId)
          if (!currentSession || currentSession.activityData.diceValue !== diceValue) return
          
          const s = currentSession.activityData
          s.diceValue = null
          ludoNextPlayer(s)
          s.phase = 'roll'
          io.to(sessionId).emit('ludo:turn_changed', { turn: s.turn })
          broadcastState(sessionId)
        }, 1500)
      } else {
        state.phase = 'move'
        broadcastState(sessionId)
      }
    })

    socket.on('ludo:move_token', ({ sessionId, tokenIndex }) => {
      const session = sessions.get(sessionId)
      if (!session || session.mode !== 'ludo') return
      const state = session.activityData
      if (!state || state.status !== 'live' || state.winner) return

      const user = socket.data.name
      if (!user || user !== state.turn || state.phase !== 'move') return
      const player = state.players.find(p => p.name === user)
      if (!player) return
      const dice = state.diceValue
      if (!dice && dice !== 0) return

      const moves = ludoValidMoves(player, dice)
      if (!moves.includes(tokenIndex)) return

      const curr = player.tokens[tokenIndex]
      const next = curr < 0 ? 0 : curr + dice
      if (next > 56) return
      player.tokens[tokenIndex] = next

      if (next === 56) {
        player.finished += 1
        if (player.finished >= 4) {
          state.winner = player.name
          state.status = 'ended'
          state.phase = 'roll'
          io.to(sessionId).emit('game_end', { winner: player.name })
          broadcastState(sessionId)
          return
        }
      }

      const landIdx = ludoBoardIndex(player.color, next)
      if (landIdx !== null && !LUDO_SAFE.includes(landIdx)) {
        for (const op of state.players) {
          if (op.name === player.name) continue
          op.tokens = op.tokens.map((p) => {
            const idx = ludoBoardIndex(op.color, p)
            if (idx !== null && idx === landIdx) return -1
            return p
          })
        }
      }

      io.to(sessionId).emit('ludo:token_moved', { player: user, tokenIndex, to: next })

      if (dice === 6) {
        state.phase = 'roll'
      } else {
        ludoNextPlayer(state)
        state.phase = 'roll'
        io.to(sessionId).emit('ludo:turn_changed', { turn: state.turn })
      }

      state.diceValue = null
      state.lastMove = { player: user, tokenIndex, to: next }
      broadcastState(sessionId)
    })

    socket.on('chat:message', ({ sessionId, userName, text }) => {
      const session = sessions.get(sessionId)
      if (!session) return
      session.chatMessages.push({
        id: Math.random().toString(36).substr(2, 9),
        sender: userName,
        text,
        timestamp: Date.now(),
        pinned: false
      })
      if (session.chatMessages.length > 100) session.chatMessages.shift()
      broadcastState(sessionId)
    })

    socket.on('chat:pin', ({ sessionId, messageId, pinned }) => {
      const session = sessions.get(sessionId)
      if (!session || session.hostId !== socket.id) return
      const msg = session.chatMessages.find(m => m.id === messageId)
      if (msg) {
        msg.pinned = pinned
        broadcastState(sessionId)
      }
    })

    socket.on('mod:mute', ({ sessionId, targetName, isMuted }) => {
      const session = sessions.get(sessionId)
      if (!session || session.hostId !== socket.id) return
      const target = session.participants.find(p => p.name === targetName)
      if (target) {
        target.mutedByHost = isMuted
        if (isMuted) target.micOn = false
        broadcastState(sessionId)
      }
    })

    socket.on('mod:mute_all', ({ sessionId }) => {
      const session = sessions.get(sessionId)
      if (!session || session.hostId !== socket.id) return
      session.participants.forEach(p => {
        if (p.role !== 'host') {
          p.mutedByHost = true
          p.micOn = false
        }
      })
      broadcastState(sessionId)
    })

    socket.on('mod:unmute_all', ({ sessionId }) => {
      const session = sessions.get(sessionId)
      if (!session || session.hostId !== socket.id) return
      session.participants.forEach(p => {
        if (p.role !== 'host') {
          p.mutedByHost = false
          // We DON'T force micOn to true for privacy, 
          // just allow them to unmute themselves.
        }
      })
      broadcastState(sessionId)
    })

    socket.on('wordchain:start', ({ sessionId }) => {
      const session = sessions.get(sessionId)
      if (!session || session.mode !== 'wordchain' || session.hostId !== socket.id) return
      
      const players = session.players || []
      if (players.length < 1) return

      session.status = 'live'
      session.activityData = {
        status: 'live',
        participantOrder: players,
        currentTurnIndex: 0,
        words: [],
        turnDurationMs: 15000,
        turnEndsAt: Date.now() + 15000
      }
      
      startWordChainTimer(sessionId)
      broadcastState(sessionId)
    })

    socket.on('wordchain:submit', ({ sessionId, userName, word }) => {
      const session = sessions.get(sessionId)
      if (!session || session.mode !== 'wordchain') return
      const state = session.activityData
      if (!state || state.status !== 'live') return
      
      const currentTurn = state.participantOrder[state.currentTurnIndex]
      if (currentTurn !== userName) return

      state.words.push({ word, author: userName })
      state.currentTurnIndex = (state.currentTurnIndex + 1) % state.participantOrder.length
      
      startWordChainTimer(sessionId)
      broadcastState(sessionId)
    })

    socket.on('wordchain:skip', ({ sessionId }) => {
      const session = sessions.get(sessionId)
      if (!session || session.mode !== 'wordchain' || session.hostId !== socket.id) return
      const state = session.activityData
      if (!state || state.status !== 'live') return

      state.currentTurnIndex = (state.currentTurnIndex + 1) % state.participantOrder.length
      startWordChainTimer(sessionId)
      broadcastState(sessionId)
    })

    socket.on('wordchain:reset', ({ sessionId }) => {
      const session = sessions.get(sessionId)
      if (!session || session.mode !== 'wordchain' || session.hostId !== socket.id) return
      clearWordChainTimer(sessionId)
      session.status = 'waiting'
      session.activityData = {
        participantOrder: [],
        currentTurnIndex: 0,
        words: []
      }
      broadcastState(sessionId)
    })

    socket.on('mostlikely:vote', ({ sessionId, userName, target }) => {
      const session = sessions.get(sessionId)
      if (!session || session.mode !== 'mostlikely') return
      const state = session.activityData
      if (!state || state.resultsShown) return

      state.votes[userName] = target
      broadcastState(sessionId)
    })

    socket.on('mod:kick', ({ sessionId, targetName }) => {
      const session = sessions.get(sessionId)
      if (!session || session.hostId !== socket.id) return
      const target = session.participants.find(p => p.name === targetName)
      if (target) {
        io.to(target.id).emit('session:kicked')
        session.participants = session.participants.filter(p => p.name !== targetName)
        broadcastState(sessionId)
      }
    })

    socket.on('voice:toggle', ({ sessionId, userName, micOn }) => {
      const session = sessions.get(sessionId)
      if (!session) return
      const p = session.participants.find(p => p.name === userName)
      if (p) {
        if (p.mutedByHost && micOn) return
        p.micOn = micOn
        broadcastState(sessionId)
      }
    })

    socket.on('voice:join', ({ sessionId, userName }) => {
      console.log(`🎙️ ${userName} joining voice in ${sessionId}`)
      socket.to(sessionId).emit('voice:join', { targetId: socket.id, targetName: userName })
    })

    socket.on('voice:signal', ({ sessionId, targetId, signal, callerId, callerName }) => {
      io.to(targetId).emit('voice:signal', { signal, callerId, callerName })
    })

    // === THOUGHT MAP ATOMIC EVENTS ===
    socket.on('thoughtmap:add_node', ({ sessionId, node }) => {
      const session = sessions.get(sessionId)
      if (!session || session.mode !== 'thoughtmap') return
      if (!session.activityData.nodes) session.activityData.nodes = []
      if (!session.activityData.connections) session.activityData.connections = []
      session.activityData.nodes.push(node)
      broadcastState(sessionId)
    })

    socket.on('thoughtmap:move_node', ({ sessionId, nodeId, x, y }) => {
      const session = sessions.get(sessionId)
      if (!session || session.mode !== 'thoughtmap') return
      const node = (session.activityData.nodes || []).find(n => n.id === nodeId)
      if (node) { node.x = x; node.y = y; broadcastState(sessionId) }
    })

    socket.on('thoughtmap:update_node', ({ sessionId, nodeId, text, color }) => {
      const session = sessions.get(sessionId)
      if (!session || session.mode !== 'thoughtmap') return
      const node = (session.activityData.nodes || []).find(n => n.id === nodeId)
      if (node) {
        if (text !== undefined) node.text = text
        if (color !== undefined) node.color = color
        broadcastState(sessionId)
      }
    })

    socket.on('thoughtmap:delete_node', ({ sessionId, nodeId }) => {
      const session = sessions.get(sessionId)
      if (!session || session.mode !== 'thoughtmap') return
      session.activityData.nodes = (session.activityData.nodes || []).filter(n => n.id !== nodeId)
      session.activityData.connections = (session.activityData.connections || []).filter(c => c.from !== nodeId && c.to !== nodeId)
      broadcastState(sessionId)
    })

    socket.on('thoughtmap:add_connection', ({ sessionId, connection }) => {
      const session = sessions.get(sessionId)
      if (!session || session.mode !== 'thoughtmap') return
      if (!session.activityData.connections) session.activityData.connections = []
      const exists = session.activityData.connections.some(c => c.from === connection.from && c.to === connection.to)
      if (!exists) { session.activityData.connections.push(connection); broadcastState(sessionId) }
    })

    socket.on('thoughtmap:delete_connection', ({ sessionId, connectionId }) => {
      const session = sessions.get(sessionId)
      if (!session || session.mode !== 'thoughtmap') return
      session.activityData.connections = (session.activityData.connections || []).filter(c => c.id !== connectionId)
      broadcastState(sessionId)
    })

    // === DUEL DEBATE ATOMIC EVENTS ===
    socket.on('duel:assign_role', ({ sessionId, targetName, role }) => {
      const session = sessions.get(sessionId)
      if (!session || session.mode !== 'duel' || session.hostId !== socket.id) return
      if (!session.activityData.roles) session.activityData.roles = {}
      session.activityData.roles[targetName] = role
      broadcastState(sessionId)
    })

    socket.on('duel:vote', ({ sessionId, userName, team }) => {
      const session = sessions.get(sessionId)
      if (!session || session.mode !== 'duel') return
      if (!session.activityData.biasVotes) session.activityData.biasVotes = {}
      session.activityData.biasVotes[userName] = team
      broadcastState(sessionId)
    })

    // === COURTROOM ATOMIC EVENTS ===
    socket.on('courtroom:assign_role', ({ sessionId, targetName, role }) => {
      const session = sessions.get(sessionId)
      if (!session || session.mode !== 'courtroom' || session.hostId !== socket.id) return
      if (!session.activityData.assignedRoles) session.activityData.assignedRoles = { judge: null, prosecution: [], defense: [] }
      const r = session.activityData.assignedRoles
      if (r.judge === targetName) r.judge = null
      if (Array.isArray(r.prosecution)) r.prosecution = r.prosecution.filter(n => n !== targetName)
      if (Array.isArray(r.defense)) r.defense = r.defense.filter(n => n !== targetName)
      if (role === 'judge') r.judge = targetName
      else if (role === 'prosecution') { if (!Array.isArray(r.prosecution)) r.prosecution = []; r.prosecution.push(targetName) }
      else if (role === 'defense') { if (!Array.isArray(r.defense)) r.defense = []; r.defense.push(targetName) }
      broadcastState(sessionId)
    })

    socket.on('courtroom:vote', ({ sessionId, userName, side }) => {
      const session = sessions.get(sessionId)
      if (!session || session.mode !== 'courtroom') return
      if (!session.activityData.votes) session.activityData.votes = {}
      session.activityData.votes[userName] = side
      broadcastState(sessionId)
    })

    // === RMCS ATOMIC EVENTS ===
    socket.on('rmcs:start', ({ sessionId }) => {
      const session = sessions.get(sessionId)
      if (!session || session.hostId !== socket.id) return
      
      const players = session.participants.filter(p => p.isConnected && session.players.includes(p.name))
      if (players.length !== 4) return // RMCS is typically 4 players

      const roles = ['Raja', 'Mantri', 'Chor', 'Sipahi']
      const shuffledRoles = shuffle([...roles])
      
      session.mode = 'rmcs'
      session.status = 'live'
      session.activityData = {
        players: players.map((p, i) => ({ 
          name: p.name, 
          role: shuffledRoles[i], 
          score: 0,
          currentRoundScore: 0,
          guess: null
        })),
        round: 1,
        totalRounds: 7,
        phase: 'assignment', // assignment | guessing | reveal
        winner: null
      }
      broadcastState(sessionId)
    })

    socket.on('rmcs:guess', ({ sessionId, guessName }) => {
      const session = sessions.get(sessionId)
      if (!session || session.mode !== 'rmcs') return
      const data = session.activityData
      const sipahi = data.players.find(p => p.role === 'Sipahi')
      if (sipahi.name !== socket.data.name) return

      const chor = data.players.find(p => p.role === 'Chor')
      const isCorrect = guessName === chor.name
      
      data.players.forEach(p => {
        if (p.role === 'Raja') p.currentRoundScore = 100
        if (p.role === 'Mantri') p.currentRoundScore = 50
        if (p.role === 'Sipahi') p.currentRoundScore = isCorrect ? 50 : 0
        if (p.role === 'Chor') p.currentRoundScore = isCorrect ? 0 : 100
        
        p.score += p.currentRoundScore
      })

      data.phase = 'reveal'
      data.lastGuess = { guesser: sipahi.name, target: guessName, isCorrect }
      broadcastState(sessionId)
    })

    socket.on('rmcs:next_round', ({ sessionId }) => {
      const session = sessions.get(sessionId)
      if (!session || session.mode !== 'rmcs' || session.hostId !== socket.id) return
      const data = session.activityData

      if (data.round >= data.totalRounds) {
        data.status = 'ended'
        const winner = [...data.players].sort((a, b) => b.score - a.score)[0]
        data.winner = winner.name
      } else {
        data.round++
        const roles = ['Raja', 'Mantri', 'Chor', 'Sipahi']
        const shuffledRoles = shuffle([...roles])
        data.players.forEach((p, i) => {
          p.role = shuffledRoles[i]
          p.currentRoundScore = 0
          p.guess = null
        })
        data.phase = 'assignment'
        data.lastGuess = null
      }
      broadcastState(sessionId)
    })

    socket.on('disconnect', () => {
      const { sessionId, name, role } = socket.data
      if (!sessionId) return
      const session = sessions.get(sessionId)
      if (!session) return

      // Notify others about voice leave
      socket.to(sessionId).emit('voice:leave', socket.id)

      const p = session.participants.find(p => p.id === socket.id)
      if (p) p.isConnected = false

      if (session.hostId === socket.id) {
        const nextHost = session.participants.find(p => p.isConnected && p.id !== socket.id)
        if (nextHost) {
          nextHost.role = 'host'
          session.hostId = nextHost.id
          session.hostName = nextHost.name
          console.log(`👑 Host reassigned to ${nextHost.name} in ${sessionId}`)
        }
      }

      // Remove from player/spectator lists if not reconnected within some time?
      // Actually, keeping them in the lists is better for reconnection stability.
      // But we should at least log it.
      
      console.log(`  ✗ ${name} disconnected from ${sessionId}`)

      const hasConnected = session.participants.some(p => p.isConnected)
      if (!hasConnected) {
        clearUnoTimer(sessionId)
        setTimeout(() => {
          const s = sessions.get(sessionId)
          if (s && !s.participants.some(p => p.isConnected)) {
            sessions.delete(sessionId)
            console.log(`  ✗ session ${sessionId} deleted (empty timeout)`)
          }
        }, 5 * 60 * 1000)
      } else {
        broadcastState(sessionId)
      }
    })
  })

  server.listen(port, hostname, (err) => {
    if (err) throw err
    console.log(`> Ready on http://${hostname}:${port}`)
  })
})
