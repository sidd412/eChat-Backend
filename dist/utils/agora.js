"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAgoraToken = void 0;
const agora_token_1 = require("agora-token");
const generateAgoraToken = (channelName, uid = 0, expireTimeInSeconds = 86400 // Token valid for 24 hours (or customize as needed)
) => {
    const appId = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;
    if (!appId || !appCertificate) {
        console.error('❌ Agora credentials missing in environment variables');
        throw new Error('Agora App ID or App Certificate not configured');
    }
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expireTimeInSeconds;
    // Build token using UID (we use 0 to allow any user to join as standard behavior, or specific uid)
    const token = agora_token_1.RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, channelName, uid, agora_token_1.RtcRole.PUBLISHER, privilegeExpiredTs, // token expire timestamp
    privilegeExpiredTs // privilege expire timestamp
    );
    return token;
};
exports.generateAgoraToken = generateAgoraToken;
