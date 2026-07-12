"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_client_1 = require("socket.io-client");
const socket = (0, socket_io_client_1.io)('http://localhost:5000');
socket.on('connect', () => {
    console.log('🤖 Mock user connected to eChat Socket Server');
    // Register mock user ID
    socket.emit('register_user', { userId: 'mock_stranger_123' });
    // Wait a moment and then join the matchmaking queue
    setTimeout(() => {
        console.log('⏳ Mock user joining matchmaking queue...');
        socket.emit('join_match_queue', {
            userId: 'mock_stranger_123',
            name: 'Aisha (Mock Developer)',
            gender: 'Female',
            age: 23,
            country: 'India',
            longitude: 0.0,
            latitude: 0.0,
            prefGender: 'All', // Wants to match with anyone
            prefMinAge: 18,
            prefMaxAge: 99,
            filterType: 'country',
            kmRadius: 50
        });
    }, 1000);
});
socket.on('searching', (data) => {
    console.log('🔍 Server Response: Searching queue...', data);
});
socket.on('match_found', (data) => {
    console.log('🎉 MATCH SUCCESSFUL FOR MOCK CLIENT!');
    console.log('------------------------------------');
    console.log('Room Channel Name :', data.channelName);
    console.log('Agora RTC Token   :', data.token.substring(0, 30) + '...');
    console.log('Partner Matched   :', data.partner.name, `(ID: ${data.partner.userId})`);
    console.log('------------------------------------');
});
socket.on('partner_left', (data) => {
    console.log('⚠️ Partner left the call:', data.message);
});
socket.on('match_error', (data) => {
    console.error('❌ Matchmaking Error:', data.message);
});
socket.on('disconnect', () => {
    console.log('🔌 Mock user disconnected from socket');
});
