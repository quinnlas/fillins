const _ = require('lodash')

// solves fill-in puzzles
// outputs multiple solutions if found

// turn this off to just see solutions
const logSteps = false

// input the board with 1s for open spaces and 0s for walls/closed spaces
// the board should be rectangular
const boardInput = `
111101110011111
111101111011111
111101111011111
111111111111100
111110011100111
000111111111111
111001110111111
111111101111111
111111011100111
111111111111000
111001110011111
001111111111111
111110111101111
111110111101111
111110011101111
`

// input words separated by space or new line
// the words can have any characters other than + and whitespace
// words must be unique
const words = `
AIR
ALA
CAM
DAL
DOS
EAT
EST
ETA
ETC
FRO
GET
HOE
MAO
ODD
OUR
RES
REV
SLY
SPA
TIS
TNT
YAK
ALOT
AGOG
COAX
CREE
EPOS
EVER
FIRM
GALA
IONS
NAGA
NAPE
OLLA
OPAH
REST
ROUE
RUSH
SAYS
VINO
ADYTA
ANTSY
ARETE
CREEK
DAVIT
ENACT
ENEMA
EPOXY
ITALY
OVERS
PIXEL
PULSE
SETON
SHALE
SOBER
TAIGA
TESTA
TEXAS
VAPID
VIOLA
ATRIAL
LIAISE
NARCOS
RESETS
EHRLICH
GAROTTE
NEUTERS
ONSTAGE
PAHLAVI
RUMMAGE
EXTREMITY
TURNTABLE
CONSTITUTION
SLEDGEHAMMER
ARCHIMANDRITE
MIXEDMETAPHOR`
    .split(/\s+/g).filter(v => v)


// the board will be filled with + for a wall space, space for empty, and letters for the actual values
const board = boardInput.split('\n').map(r => r.trim()).filter(r => r).map(r => r.split('').map(l => l === '1' ? ' ' : '+'))
const spaces = findSpaces(board)

// validate input
if (spaces.length !== words.length) throw Error(`Found ${spaces.length} spaces and ${words.length} words`)

// if the board is solved, wall squares will be output as space characters
function printBoard(board, solved) {
    const divider = board[0].map(e => '=').join('=')
    console.log(divider)
    board.forEach(r => console.log(r.map(l => (solved && (l === '+')) ? ' ' : l).join(' ')))
    console.log(divider, '\n')
}

// use regex to find open spaces
function findHorizontalSpaces(board) {
    return board.reduce((spaces, row, rowIndex) => {
        const rowText = row.join('')
        const matches = [...rowText.matchAll(/  +/g)]
        spaces.push(...matches.map(m => ({
            type: 'h',
            row: rowIndex,
            col: m.index,
            length: m[0].length
        })))
        return spaces
    }, [])
}

// finds the blank spots and puts them in a good order for solving
function findSpaces(board) {
    let spaces = findHorizontalSpaces(board)

    // flip the board diagonally
    const flippedBoard = new Array(board[0].length).fill(1).map(e => [])
    for (let r = 0; r < board[0].length; r++) {
        for (let c = 0; c < board.length; c++) {
            flippedBoard[r][c] = board[c][r]
        }
    }

    spaces.push(...findHorizontalSpaces(flippedBoard).map(s => ({
        type: 'v',
        row: s.col,
        col: s.row,
        length: s.length
    })))

    // order the spaces in a way that will speed up solving time by increasing collisions
    // just pick the first step and do a breadth first search to add intersecting spaces
    // if we complete a graph and there are still more spaces, then we have a disconnected
    // puzzle and we should just take the next space to start the next graph
    const orderedSpaces = [spaces.shift()]

    // keep track of which spaces we have already checked intersections for
    // this just tells us what index we should start checking at
    let calculationIndex = 0

    while (spaces.length) {
        let foundIntersecting = false
        const nextCalculationIndex = orderedSpaces.length

        // check all the new spaces since last loop
        orderedSpaces.slice(calculationIndex).forEach(s1 => {
            // find spaces that intersect this new space
            const intersectingSpaces = spaces.filter(s2 => {
                if (s1.type === s2.type) return false
                const vertical = s1.type === 'v' ? s1 : s2
                const horizontal = vertical === s1 ? s2 : s1

                // check if horizontal includes the column of vertical and vice versa
                if (horizontal.col > vertical.col || horizontal.col + horizontal.length - 1 < vertical.col) return false
                if (vertical.row > horizontal.row || vertical.row + vertical.length - 1 < horizontal.row) return false
                foundIntersecting = true
                return true
            })

            orderedSpaces.push(...intersectingSpaces) // move the intersecting spaces into the orderedSpaces array
            spaces = spaces.filter(s => !intersectingSpaces.includes(s)) // remove the intersecting spaces from the old spaces array
        })
        calculationIndex = nextCalculationIndex

        // this will only happen if there is a gap in the puzzle (multiple graphs)
        if (!foundIntersecting) orderedSpaces.push(spaces.shift())
    }

    return orderedSpaces
}

// determine if a word fits in a space (taking into account intersecting words that are already filled)
function fits(word, space, board) {
    if (word.length !== space.length) return false
    // now we need to compare each letter to its space on the board
    for (let offset = 0; offset < space.length; offset++) {
        const row = space.type === 'v' ? space.row + offset : space.row
        const col = space.type === 'h' ? space.col + offset : space.col
        const letter = board[row][col]
        if (letter !== ' ' && word.charAt(offset) !== letter) return false
    }
    return true
}

// recursively try all possibilities and print the solutions that are discovered
const solutions = []

function solve(board, words) {
    if (words.length === 0) return solutions.push(board)

    if (logSteps) {
        printBoard(board)
        console.log(words)
    }

    // pick the next space, determine which words can go there, and guess each one recursively
    const space = spaces[spaces.length - words.length]

    const possibleWords = words.filter(word => fits(word, space, board))

    if (logSteps) {
        console.log(`found possiblities for space (${space.col + 1}, ${space.row + 1}) ${space.type === 'h' ? 'across' : 'down'}:`)
        console.log(possibleWords)
    }

    possibleWords.forEach(word => {

        if (logSteps) {
            console.log('=======================================================================================================')
            console.log(`trying ${word} in space (${space.col + 1}, ${space.row + 1}) ${space.type === 'h' ? 'across' : 'down'}`)
        }

        // prepare the arguments for the recursive call
        const newBoard = _.cloneDeep(board)

        // add the guessed word to the board
        word.split('').forEach((letter, offset) => {
            const row = space.type === 'v' ? space.row + offset : space.row
            const col = space.type === 'h' ? space.col + offset : space.col
            newBoard[row][col] = letter
        })

        const newWords = words.filter(w => w !== word)

        solve(newBoard, newWords)
    })
}

solve(board, words)
if (!solutions.length) console.log('\n\nNo solution found.')
else console.log('\n\nSolutions:')
solutions.forEach(s => printBoard(s, true))