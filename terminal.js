const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http, {
  cors: {
    origin: "*"
  }
});
const SSHClient = require('ssh2').Client;


// Middleware to parse URL-encoded data
app.use(express.urlencoded({ extended: false, limit: '150mb' }));

// Serve static files from the public directory
app.use(express.static(__dirname + '/public'));
app.use('/xterm.css', express.static(require.resolve('xterm/css/xterm.css')));
app.use('/xterm.js', express.static(require.resolve('xterm')));
app.use('/xterm-addon-fit.js', express.static(require.resolve('xterm-addon-fit')));

// Serve index.html from the root directory
app.get('/terminal', (req, res) => {
  res.sendFile(__dirname + '/index.html'); 
});

// Socket.io connection
io.on('connection', function(socket) {
  let conn = new SSHClient();

  socket.on('connectSSH', (password) => {
    conn.on('ready', function() {
      socket.emit('data', '\r\n*** SSH CONNECTION ESTABLISHED ***\r\n');
      conn.shell(function(err, stream) {
        if (err) {
          return socket.emit('data', '\r\n*** SSH SHELL ERROR: ' + err.message + ' ***\r\n');
        }
        socket.on('data', function(data) {
          stream.write(data);
        });
        stream.on('data', function(d) {
          socket.emit('data', d.toString('binary'));
        }).on('close', function() {
          conn.end();
        });
      });
    }).on('close', function() {
      socket.emit('data', '\r\n*** SSH CONNECTION CLOSED ***\r\n');
    }).on('error', function(err) {
      socket.emit('data', '\r\n*** SSH CONNECTION ERROR: ' + err.message + ' ***\r\n');
    }).connect({
      host: 'localhost', // Always connect to localhost
      port: 22,
      username: 'mbot', // Always use the username 'mbot'
      password: password // Use the provided password
    });
  });
});

// Listen on port 3000
http.listen(3000, () => {
  console.log('Listening on http://localhost:3000/terminal');
});