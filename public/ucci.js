//this is a library that implements the UCCI - Universal Chinese Chess Interface Protocol
//website of the protocol: http://www.xqbase.com/protocol/cchess_ucci.htm

//make sure that the variables defined in this library does not interfere with others
;
(function (global) {
  'use strict';
  //@param fen: the FEN(Forsyth-Edwards Notation) string of the initial state
  //reference of FEN protocol for chinese chess: 
  //http://www.xqbase.com/protocol/cchess_fen.htm
  var ucci = function (data) {
    data = data || {
      fen: 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1',
      moves: []
    };
    try {
      ucci.validate(data.fen);
    } catch (e) {
      console.log(e);
      return null;
    }
    return new ucci.init(data.fen, data.moves);
  };

  // The real construct function of the library
  ucci.init = function (fen, moves) {
    var parts = fen.split(' ');
    this.initialState = fen;
    var lines = parts[0].split('/');
    this.state = [];
    for (var i = 0; i <= 9; i++) {
      var temp = this.state[i] = [];
      var line = lines[i];
      for (var k = 0; k < line.length; k++) {
        var c = line[k];
        if (c >= '1' && c <= '9') {
          for (var j = 0; j < Number(c); j++) {
            temp.push(' ');
          }
        } else {
          temp.push(c);
        }
      }
    }

    //set up the current player
    if (parts[1] === "b") {
      this.player = "b";
    } else {
      this.player = "w";
    }

    //set up the counter for empty steps and rounds
    this.emptyStep = Number(parts[4]);
    this.round = Number(parts[5]);

    // set the historical movements
    this.history = [];

    for (var h_i = 0; h_i < moves.length; h_i++) {
      this.move(moves[h_i]);
    }

  };

  // row and col represents the relation between the index of this.state
  // and the representation character
  var row = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  var col = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];

  var blackPieces = ['r', 'n', 'b', 'a', 'k', 'c', 'p'];
  var whitePieces = ['R', 'N', 'B', 'A', 'K', 'C', 'P'];
  var pieces = whitePieces.concat(blackPieces);

  //validate whether the FEN string is valid or not;
  ucci.validate = function (fen) {
    // split the string and make sure that it has seven parts
    var parts = fen.split(' ');
    if (parts.length !== 6) {
      throw 'invalid number of parts';
    }

    //split the chess board string and make sure that it has 10 lines
    var lines = parts[0].split('/');
    if (lines.length !== 10) {
      throw 'invalid number of lines';
    }

    // validate that the 
    for (var lines_i in lines) {
      var l = lines[lines_i];
      var count = 0;
      for (var l_i in l) {
        var c = l[l_i];
        if (c >= '1' && c <= '9') {
          count += Number(c);
        } else if (pieces.indexOf(c) >= 0) {
          count++;
        } else {
          throw 'invalid piece character';
        }
      }
      if (count !== 9) {
        throw 'invalid chess state string';
      }
    }

    if (Number.NaN === Number(parts[4]) || Number.NaN === Number(parts[5])) {
      throw 'invalid number of rounds';
    }

    return true;
  };

  //make sure that the object created by the init function have access to
  //the functions of library by setting its prototype
  ucci.init.prototype = ucci.prototype = {
    print: function () {
      var board = '';
      for (var r in this.state) {
        var line = '';
        for (var c in this.state[r]) {
          line += this.state[r][c];
        }
        line += ' ';
        board += line + '\n';
      }
      console.log(board);
      return this;
    },

    showState: function () {
      console.log(this.state);
      return this;
    },

    //move a piece return false if not successful
    move: function (str) {

      //make sure that the two positions are different
      var src = str.substring(0, 2);
      var tar = str.substring(2, 4);
      if (src === tar) {
        return false;
      }

      //calculate  the position location and the target position
      var p_src = this.strToPos(src);
      var p_tar = this.strToPos(tar);

      //validate that this move is valid
      if (!this.isValidMove(p_src, p_tar)) {
        return false;
      }
      var c_t = this.getByPos(p_tar);

      if (c_t === " ") {
        this.emptyStep++;
      } else {
        this.emptyStep = 0;
      }

      this.setByPos(p_tar, this.getByPos(p_src));
      this.setByPos(p_src, ' ');

      this.history.push({
        move: str,
        eaten: c_t
      });
      this.round = Math.round(this.history.length / 2);

      if (this.player === "b") {
        this.player = "w";
      } else {
        this.player = "b";
      }
      return this;
    },

    //validate that a move is valid.
    isValidMove: function (p_s, p_t) {

      //The represented
      var c_s = this.getByPos(p_s);

      //The chosen piece must exist
      if (c_s === ' ') {
        throw 'no chosen piece';
      }
      var c_t = this.getByPos(p_t);

      //make sure that it does not eat a piece on the same team
      if (this.getTeam(c_s) === this.getTeam(c_t)) {
        throw 'cannot eat piece on the same side';
      }

      switch (c_s.toUpperCase()) {
        case 'A':
          return this.isAdvisorMoveValid(p_s[0], p_s[1], c_s, p_t[0], p_t[1], c_t);
        case 'B':
          return this.isBishopMoveValid(p_s[0], p_s[1], c_s, p_t[0], p_t[1], c_t);
        case 'C':
          return this.isCannonMoveValid(p_s[0], p_s[1], c_s, p_t[0], p_t[1], c_t);
        case 'K':
          return this.isKingMoveValid(p_s[0], p_s[1], c_s, p_t[0], p_t[1], c_t);
        case 'N':
          return this.isKnightMoveValid(p_s[0], p_s[1], c_s, p_t[0], p_t[1], c_t);
        case 'P':
          return this.isPawnMoveValid(p_s[0], p_s[1], c_s, p_t[0], p_t[1], c_t);
        case 'R':
          return this.isRookMoveValid(p_s[0], p_s[1], c_s, p_t[0], p_t[1], c_t);
      }
      return true;
    },
    isAdvisorMoveValid: function (ax, ay, ac, bx, by, bc) {
      if (by < 3 || by > 5 || ac === 'A' && bx <= 6 || ac === 'a' && bx >= 3) {
        throw 'advisors cannot leave designated area';
      }
      if (Math.abs(ax - bx) !== 1 || Math.abs(ay - by) !== 1) {
        throw 'advisors must move on diagonal step';
      }
      return true;
    },
    isBishopMoveValid: function (ax, ay, ac, bx, by, bc) {
      //make sure that the bishop stays in right side of the river
      if (ac === 'B' && bx < 5 || ac === 'b' && bx > 4) {
        throw "bishops can never cross the river";
      }
      if (Math.abs(ax - bx) !== 2 || Math.abs(ay - by) !== 2) {
        throw "bishops must move 2 diagonal step at a time";
      }
      //make sure the position is right
      if (this.state[(ax + bx) / 2][(ay + by) / 2] !== ' ') {
        throw "the bishop is blocked";
      }
      return true;
    },
    isCannonMoveValid: function (ax, ay, ac, bx, by, bc) {
      var count = this.countObstacle(ax, ay, bx, by);
      if (count < 0) {
        throw 'cannons must move in a straight line';
      }
      if (count === 0 && bc !== ' ') {
        throw 'cannons must eat with a piece in between';
      }
      if (count === 1 && bc === ' ') {
        throw 'nothing for the cannon to eat';
      }
      if (count > 1) {
        throw 'two much pieces in between';
      }
      return true;
    },
    isKingMoveValid: function (ax, ay, ac, bx, by, bc) {
      if (bc.toUpperCase() === 'K') {
        var count = this.countObstacle(ax, ay, bx, by);
        if (count < 0) {
          throw 'kings are not on the same line';
        } else if (count > 0) {
          throw 'kings are blocked';
        }
      } else if (by < 3 || by > 5 || ac === 'K' && bx < 7 || ac === 'k' && bx > 2) {
        throw 'kings cannot leave designated area';
      } else if (Math.abs(ax - bx) + Math.abs(ay - by) !== 1) {
        throw 'kings can only move one step at a time';
      }
      return true;
    },

    isKnightMoveValid: function (ax, ay, ac, bx, by, bc) {
      var offset = 0;
      if (Math.abs(ax - bx) === 1 && Math.abs(ay - by) === 2) {
        offset = by > ay ? 1 : -1;
        if (this.state[ax][ay + offset] !== ' ') {
          throw 'knight is blocked';
        }
      } else if (Math.abs(ax - bx) === 2 && Math.abs(ay - by) === 1) {
        offset = bx > ax ? 1 : -1;
        if (this.state[ax + offset][ay] !== ' ') {
          throw 'knight is blocked';
        }
      } else {
        throw 'knight must follow its pattern';
      }
      return true;
    },
    isPawnMoveValid: function (ax, ay, ac, bx, by, bc) {
      if (Math.abs(ax - bx) + Math.abs(ay - by) !== 1) {
        throw 'pawns can only move one step at a time';
      }
      if (ax - bx === 0 && (ac === 'P' && ax > 4 || ac === 'p' && ax < 5)) {
        throw 'pawns can only move horizontally after crossing the river';
      }
      if (ac === 'P' && ax - bx === -1 || ac === 'p' && ax - bx === 1) {
        throw 'pawns can never move backward';
      }
      return true;
    },
    isRookMoveValid: function (ax, ay, ac, bx, by, bc) {
      var count = this.countObstacle(ax, ay, bx, by);
      if (count < 0) {
        throw 'rooks must move in a straight line';
      } else if (count > 0) {
        throw 'the path of the rook is blocked';
      }
      return true;
    },
    //count how many pieces lies between two positions;
    countObstacle: function (ax, ay, bx, by) {
      var i, j, k, n = 0;
      if (ax === bx) {
        i = ay < by ? ay : by;
        j = ay > by ? ay : by;
        for (k = i + 1; k < j; k++) {
          if (this.state[ax][k] !== ' ') {
            n++;
          }
        }
        return n;
      } else if (ay === by) {
        i = ax < bx ? ax : bx;
        j = ax > bx ? ax : bx;
        for (k = i + 1; k < j; k++) {
          if (this.state[k][ay] !== ' ') {
            n++;
          }
        }
        return n;
      }
      return -1;
    },
    getByPos: function (pos) {
      return this.state[pos[0]][pos[1]];
    },

    getByStr: function (s) {
      var pos = this.strToPos(s);
      return this.getByPos(pos);
    },

    setByPos: function (pos, value) {
      this.state[pos[0]][pos[1]] = value;
    },

    strToPos: function (string) {
      if (string.length !== 2) {
        return null;
      }
      var c = string[0];
      var r = string[1];
      if (col.indexOf(c) < 0) {
        return null;
      }
      if (r < '0' || r > '9') {
        return null;
      }
      return [row.indexOf(r), col.indexOf(c)];
    },

    posToStr: function (pos) {
      return "" + col[pos[1]] + col[pos[0]];
    },

    getList: function () {
      var list = [];
      for (var r in this.state) {
        for (var c in this.state[r]) {
          var s = '' + col[c] + row[r];
          list[s] = this.state[r][c];
        }
      }
      return list;
    },

    getMatrix: function (team) {
      var matrix = [];
      if (team) {
        for (var i = 0; i < 10; i++) {
          var temp = [];
          matrix.push(temp);
          for (var j = 0; j < 9; j++) {
            temp.push({
              id: "" + col[j] + row[i],
              char: this.state[i][j]
            });
          }
        }
      } else {
        for (var i = 9; i >= 0; i--) {
          var temp = [];
          matrix.push(temp);
          for (var j = 8; j >= 0; j--) {
            temp.push({
              id: "" + col[j] + row[i],
              char: this.state[i][j]
            });
          }
        }
      }
      return matrix;
    },

    getPossibleMoves: function (str) {
      var p_s = this.strToPos(str);
      var list = [];
      for (var r = 0; r < 10; r++) {
        for (var c = 0; c < 9; c++) {
          try {
            this.isValidMove(p_s, [r, c]);
            list.push('' + col[c] + row[r]);
          } catch (e) {
            continue;
          }
        }
      }
      return list;
    },

    isSameTeam: function (a, b) {
      var c_a = this.getByStr(a);
      var c_b = this.getByStr(b);
      return this.getTeam(c_a) === this.getTeam(c_b);
    },

    getTeam: function (p) {
      if (this.isWhitePiece(p)) {
        return 'w';
      } else if (this.isBlackPiece(p)) {
        return 'b';
      } else {
        return null;
      }
    },

    isCurrentPlayer: function (str) {
      return this.player === this.getTeam(this.getByStr(str));
    },

    isWhitePiece: function (p) {
      return whitePieces.indexOf(p) >= 0;
    },

    isBlackPiece: function (p) {
      return blackPieces.indexOf(p) >= 0;
    },

    save:function () {
      var data = {
        fen: this.initialState,
        moves: []
      }
      for (var i=0;i<this.history.length;i++){
        data.moves.push(this.history[i].move);
      }
      return data;
    },
    
    revoke:function(){
      var history =this.history;
      history.
      history.splice(history.length-1,1);
    }
  };

  //add this library as a property to the global object;
  global.ucci = ucci;

}(window));