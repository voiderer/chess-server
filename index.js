var express = require('express');
var app = express();
var path = require('path');
var server = require('http').createServer(app);
var io = require('socket.io')(server);

app.use(express.static(path.join(__dirname, 'public')));
var port = process.env.PORT || 3000;

server.listen(port, function () {
    console.log('Server listening at port %d', port);
});


var numUsers = 0;
var history = {
    fen: "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1",
    moves: []
};
var defaultBoard = {
    fen: "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1",
    moves: []
};


io.on('connection', function (client) {
    var addedUser = false;
    var user_name;

    client.on('add user', function (username) {
        if (addedUser) return;

        addedUser = true;
        // we store the username in the socket session for this client
        io.username = username;
        user_name = username;
        ++numUsers;
        var team;
        if (numUsers === 1) {
            team = 'w';
        } else if (numUsers === 2) {
            team = 'b';
        } else {
            team = null;
        }

        if (numUsers === 1) {
            client.emit('init', {
                team: team,
                history: defaultBoard
            });
        } else {
            client.emit('init', {
                team: team,
                history: history
            });
        }

        client.broadcast.emit('user joined', {
            username: io.username,
            numUsers: numUsers
        });
        console.log("added user: " + io.username);
    });

    client.on("disconnect", function () {
        if (addedUser) {
            numUsers--;
            console.log("user left: " + user_name);
        }
    });

    client.on("move", function (data) {
        history = data;
        client.broadcast.emit("moved", data);
    });
});