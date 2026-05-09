const express = require('express');
const router = express.Router();

module.exports = function(io) {
    // Route: Emit event to a specific room
    router.post('/emit', (req, res) => {
        const { room, event, data } = req.body;
        
        if (room) {
            io.to(room).emit(event, data);
            console.log(`📢 Emitted ${event} to room ${room}`);
        } else {
            io.emit(event, data);
            console.log(`📢 Emitted ${event} to everyone`);
        }
        
        res.json({ success: true });
    });

    return router;
};
