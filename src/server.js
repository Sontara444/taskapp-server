const express = require('express');
const http = require('http');
const cors = require('cors');
const connectDB = require('./config/mongodb');
const userRoutes = require('./routes/auth')
const { initSocket } = require('./sockets/chat.socket');

require('dotenv').config();

const app = express();
const server = http.createServer(app);
initSocket(server);

connectDB()
app.use(cors({
    origin: [
        "https://chat-app-client-git-feature-call-sontaras-projects.vercel.app",
        "http://localhost:5173",
        "https://chat-app-client-chi-three.vercel.app",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', userRoutes);
app.use('/api/channels', require('./routes/channels'));
app.use('/api/messages', require('./routes/messages'));

const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
    res.send('Server is up and running');
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})


