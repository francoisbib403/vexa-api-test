import React, { useState, useEffect } from 'react';

interface TranscriptSegment {
  speaker?: string;
  timestamp: string;
  text: string;
}

interface Transcript {
  segments: TranscriptSegment[];
}

export default function VexaTeamsTester() {
  const [apiKey, setApiKey] = useState('');
  const [teamsUrl, setTeamsUrl] = useState('');
  const [meetingId, setMeetingId] = useState('');
  const [passcode, setPasscode] = useState('');
  const [botName, setBotName] = useState('Copileo Test');
  const [language, setLanguage] = useState('fr');
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const BASE_URL = 'https://api.cloud.vexa.ai';

  // Auto-extract meeting ID and passcode from URL
  useEffect(() => {
    if (teamsUrl) {
      try {
        const url = new URL(teamsUrl);
        const pathParts = url.pathname.split('/');
        const id = pathParts[pathParts.length - 1];
        const pass = url.searchParams.get('p');
        if (id) setMeetingId(id);
        if (pass) setPasscode(pass);
      } catch (e) {}
    }
  }, [teamsUrl]);

  const apiCall = async (endpoint: string, method: string = 'GET', body: any = null) => {
    if (!apiKey) {
      setMessage('Error: API key required');
      return null;
    }

    try {
      const options: RequestInit = {
        method,
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json'
        }
      };
      if (body) options.body = JSON.stringify(body);

      const response = await fetch(`${BASE_URL}${endpoint}`, options);
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || `Error ${response.status}`);
      return data;
    } catch (err) {
      setMessage(`Error: ${(err as Error).message}`);
      return null;
    }
  };

  const startBot = async () => {
    if (!meetingId || !passcode) {
      setMessage('Error: Meeting ID and passcode required');
      return;
    }

    setLoading(true);
    setMessage('Starting bot...');

    const result = await apiCall('/bots', 'POST', {
      platform: 'teams',
      native_meeting_id: meetingId,
      passcode: passcode,
      language: language,
      bot_name: botName
    });

    if (result) {
      setMessage('Bot started. Joining meeting in ~10 seconds.');
    }
    setLoading(false);
  };

  const stopBot = async () => {
    if (!meetingId) {
      setMessage('Error: No meeting ID');
      return;
    }

    setLoading(true);
    setMessage('Stopping bot...');

    const result = await apiCall(`/bots/teams/${meetingId}`, 'DELETE');
    if (result) {
      setMessage('Bot stopped. Fetching transcript...');
      setTimeout(() => getTranscript(), 2000);
    }
    setLoading(false);
  };

  const getTranscript = async () => {
    if (!meetingId) {
      setMessage('Error: No meeting ID');
      return;
    }

    setLoading(true);
    setMessage('Fetching transcript...');

    const result = await apiCall(`/transcripts/teams/${meetingId}`);
    if (result) {
      setTranscript(result);
      setMessage('Transcript retrieved');
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '900px', margin: '40px auto', padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '8px', fontWeight: '600' }}>Copileo Bot Tester</h1>
      <p style={{ color: '#666', marginBottom: '32px', fontSize: '14px' }}>Microsoft Teams Transcription</p>

      {/* API Key */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Enter your Vexa API key"
          style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
        />
      </div>

      {/* Teams URL */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Teams Meeting URL</label>
        <input
          type="text"
          value={teamsUrl}
          onChange={(e) => setTeamsUrl(e.target.value)}
          placeholder="https://teams.live.com/meet/9366473044740?p=waw4q9dPAvdIG3aknh"
          style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
        />
      </div>

      {/* Meeting ID and Passcode */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Meeting ID</label>
          <input
            type="text"
            value={meetingId}
            onChange={(e) => setMeetingId(e.target.value)}
            placeholder="9366473044740"
            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Passcode</label>
          <input
            type="text"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="waw4q9dPAvdIG3aknh"
            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
          />
        </div>
      </div>

      {/* Bot Config */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Bot Name</label>
          <input
            type="text"
            value={botName}
            onChange={(e) => setBotName(e.target.value)}
            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
          >
            <option value="fr">French</option>
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="de">German</option>
          </select>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <button
          onClick={startBot}
          disabled={loading}
          style={{
            padding: '12px 24px',
            backgroundColor: '#000',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            opacity: loading ? 0.6 : 1
          }}
        >
          Start Bot
        </button>
        <button
          onClick={stopBot}
          disabled={loading}
          style={{
            padding: '12px 24px',
            backgroundColor: '#fff',
            color: '#000',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            opacity: loading ? 0.6 : 1
          }}
        >
          Stop Bot
        </button>
        <button
          onClick={getTranscript}
          disabled={loading}
          style={{
            padding: '12px 24px',
            backgroundColor: '#fff',
            color: '#000',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            opacity: loading ? 0.6 : 1
          }}
        >
          Get Transcript
        </button>
      </div>

      {/* Message */}
      {message && (
        <div style={{
          padding: '12px',
          backgroundColor: message.startsWith('Error') ? '#fee' : '#efe',
          border: `1px solid ${message.startsWith('Error') ? '#fcc' : '#cfc'}`,
          borderRadius: '4px',
          marginBottom: '20px',
          fontSize: '14px'
        }}>
          {message}
        </div>
      )}

      {/* Transcript */}
      {transcript && (
        <div style={{ marginTop: '32px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '16px', fontWeight: '600' }}>Transcript</h2>
          <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '16px', maxHeight: '400px', overflowY: 'auto', backgroundColor: '#fafafa' }}>
            {transcript.segments && transcript.segments.length > 0 ? (
              transcript.segments.map((segment, idx) => (
                <div key={idx} style={{ marginBottom: '16px', paddingLeft: '12px', borderLeft: '2px solid #000' }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                    <strong>{segment.speaker || 'Speaker'}</strong> • {segment.timestamp}
                  </div>
                  <div style={{ fontSize: '14px', color: '#000' }}>{segment.text}</div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', color: '#999', padding: '32px', fontSize: '14px' }}>
                No transcript available yet
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}