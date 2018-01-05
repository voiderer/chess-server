var username;
var board;
var team;
var socket = io();

var $loginPage = $('.login.page'); // The login page
var $chatPage = $('.chat.page'); // The chatroom page
var $window = $(window);
var $usernameInput = $('.usernameInput'); // Input for username
var $currentInput = $usernameInput.focus();


function setImage(id, char) {
  var img = $('#' + id);
  img.attr('src', getImage(char));
  img.attr('class', "piece");

}

function getImage(char) {
  if (char === ' ') {
    return './image/blank.png';
  } else if (char >= 'A' && char <= 'Z') {
    return './image/R' + char + '.png';
  } else {
    return './image/B' + char + '.png';
  }

}

function setTransparent(id) {
  $('#' + id).attr('class', 'piece-transparent');
}

function setChosen(id) {
  if (id) {
    $('#' + id).attr('class', 'piece-chosen');
  }
}

function setHistory(id) {
  $("#" + id).attr('class', 'piece-history');
}

function setNormals(list) {
  for (var l = 0; l < list.length; l++) {
    $('#' + list[l]).attr('class', 'piece');
  }
}

function setPossibles(list) {
  for (var l = 0; l < list.length; l++) {
    $('#' + list[l]).attr('class', 'piece-possible');
  }
}

var chosen = null;
var possible = [];

function pieceClickEvent() {
  var id = this.id;
  if (chosen) {
    try {
      if (board.isCurrentPlayer(id)) {
        chosen = id;
        possible = board.getPossibleMoves(id);
        update();
        return;
      } else if (board.move(chosen + id)) {
        var char = board.getByStr(id);
        if (char.toUpperCase() === "K") {
          socket.emit("end", board.save());
        } else {
          socket.emit("move", board.save());
        }
        possible = [];
        chosen = null;
        update();
      }
    } catch (e) {
      console.log(e);
    }
    chosen = null;
  } else if (board.isCurrentPlayer(id)) {
    chosen = id;
    possible = board.getPossibleMoves(chosen);
    update();
  }
}

function setBoard(team) {
  var team_flag = true;
  if (team == "b") {
    team_flag = false;
  }
  var matrix = board.getMatrix(team_flag);
  var container = $("#container");
  container.empty();
  for (var i = 0; i < matrix.length; i++) {
    var row = matrix[i];
    var div = document.createElement("div");
    div.className = "chess-row";
    container.append(div);
    for (var j = 0; j < row.length; j++) {
      var tag = document.createElement('img');
      tag.className = 'piece';
      tag.id = row[j].id;
      tag.addEventListener('click', pieceClickEvent);
      tag.src = getImage(row[j].char);
      div.append(tag);
    }
  }
  if (board) {
    update();
  }
}

function update() {
  var list = board.getList();
  for (var l in list) {
    setImage(l, list[l]);
  }
  var his = board.history;
  var last = his[his.length - 1];
  if (last) {
    var a = last.move.substring(0, 2);
    var b = last.move.substring(2, 4);
    setHistory(a);
    setHistory(b);
  }
  setChosen(chosen);
  setPossibles(possible);
}

socket.on("moved", function (data) {
  board = ucci(data);
  update();
})

socket.on("init", function (data) {
  board = ucci(data.history);
  setBoard(data.team);
});

socket.on("team", function (team) {
  console.log("team "+team);
  this.team = team;
})



var $loginPage = $('.login.page'); // The login page

function setUsername() {
  username = cleanInput($usernameInput.val().trim());

  // If the username is valid
  if (username) {
    $loginPage.fadeOut();
    $chatPage.show();
    $loginPage.off('click');
    // Tell the server your username
    socket.emit('add user', username);
  }
}

// Prevents input from having injected markup
function cleanInput(input) {
  return $('<div/>').text(input).html();
}

$window.keydown(function (event) {
  // Auto-focus the current input when a key is typed
  if (!(event.ctrlKey || event.metaKey || event.altKey)) {
    $currentInput.focus();
  }
  // When the client hits ENTER on their keyboard
  if (event.which === 13) {
    if (username) {
      sendMessage();
      socket.emit('stop typing');
      typing = false;
    } else {
      setUsername();
    }
  }
});