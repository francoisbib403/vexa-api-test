'use client';

import React, { useState, useEffect } from 'react';
import { Play, StopCircle, RefreshCw, Eye, Trash2, Plus, Calendar, Clock, Users, AlertCircle, Settings as SettingsIcon, Webhook } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Configuration Vexa API
const VEXA_API_BASE = 'https://api.cloud.vexa.ai';
const VEXA_API_KEY = process.env.NEXT_PUBLIC_VEXA_API_KEY || 'YOUR_VEXA_API_KEY'; 

// Configuration Supabase
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL'; 
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'; 
const supabase = SUPABASE_URL !== 'YOUR_SUPABASE_URL' ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const CopileoDashboard = () => {
  // Check configuration
  if (!supabase) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="border-4 border-black p-8 max-w-md w-full text-center">
          <h1 className="text-3xl font-bold mb-4">Configuration Requise</h1>
          <p className="mb-6">Veuillez configurer les variables d'environnement dans le fichier .env.local :</p>
          <div className="text-left bg-gray-100 p-4 border-2 border-black mb-4">
            <pre className="text-sm">
{`NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_clé_anon
NEXT_PUBLIC_VEXA_API_KEY=votre_clé_vexa`}
            </pre>
          </div>
          <p className="text-sm opacity-60">Redémarrez l'application après avoir ajouté les clés.</p>
        </div>
      </div>
    );
  }

  const [meetings, setMeetings] = useState<any[]>([]);
  const [activeBots, setActiveBots] = useState<any[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);
  const [transcript, setTranscript] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showNewMeeting, setShowNewMeeting] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);

  // États pour l'authentification
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [settings, setSettings] = useState({
    webhook_url: '',
    webhook_secret: '',
    webhook_enabled: false
  });
  
  // Formulaire nouvelle réunion
  const [newMeeting, setNewMeeting] = useState({
    platform: 'teams',
    meetingId: '',
    passcode: '',
    botName: 'Copileo',
    language: 'fr'
  });
  
  const [teamsUrl, setTeamsUrl] = useState('');

  // Parser l'URL Teams pour extraire ID et passcode
  const parseTeamsUrl = (url: string) => {
    try {
      const meetingIdMatch = url.match(/meet\/(\d+)/);
      const meetingId = meetingIdMatch ? meetingIdMatch[1] : '';
      
      const passcodeMatch = url.match(/[?&]p=([^&]+)/);
      const passcode = passcodeMatch ? passcodeMatch[1] : '';
      
      if (meetingId && passcode) {
        setNewMeeting({
          ...newMeeting,
          meetingId,
          passcode
        });
        return true;
      } else {
        alert('URL Teams invalide. Vérifiez le format.');
        return false;
      }
    } catch (error) {
      console.error('Erreur parsing URL:', error);
      alert('Erreur lors de l\'analyse de l\'URL');
      return false;
    }
  };

  // Authentification Supabase
  useEffect(() => {
    checkUser();
    
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        loadMeetings();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user || null);
    if (session?.user) {
      loadMeetings();
      loadSettings();
    }
  };

  // Charger les paramètres utilisateur
  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSettings({
          webhook_url: data.webhook_url || '',
          webhook_secret: data.webhook_secret || '',
          webhook_enabled: data.webhook_enabled || false
        });
      }
    } catch (error) {
      console.error('Erreur chargement paramètres:', error);
    }
  };

  // Sauvegarder les paramètres
  const saveSettings = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          webhook_url: settings.webhook_url,
          webhook_secret: settings.webhook_secret,
          webhook_enabled: settings.webhook_enabled,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      // Configurer le webhook dans Vexa API
      if (settings.webhook_enabled && settings.webhook_url) {
        await fetch(`${VEXA_API_BASE}/user/webhook`, {
          method: 'PUT',
          headers: {
            'X-API-Key': VEXA_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            webhook_url: settings.webhook_url
          })
        });
      }
      
      alert('Paramètres sauvegardés avec succès !');
      setShowSettings(false);
    } catch (error: any) {
      console.error('Erreur sauvegarde paramètres:', error);
      alert('Erreur lors de la sauvegarde: ' + error.message);
    }
    setLoading(false);
  };

  // Charger les réunions depuis Supabase
  const loadMeetings = async () => {
    try {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMeetings(data || []);
    } catch (error) {
      console.error('Erreur chargement réunions:', error);
    }
  };

  // Charger les bots actifs
  const loadActiveBots = async () => {
    try {
      console.log('Loading active bots from Vexa API...');
      const response = await fetch(`${VEXA_API_BASE}/bots/status`, {
        headers: { 'X-API-Key': VEXA_API_KEY }
      });
      const data = await response.json();
      console.log('Vexa API response:', data);
      setActiveBots(data.bots || []);
      console.log('Active bots set to:', data.bots || []);
    } catch (error) {
      console.error('Erreur chargement bots:', error);
    }
  };

  // Ajouter une réunion depuis un bot actif
  const addMeetingFromBot = async (bot: any) => {
    try {
      const { data: meeting, error } = await supabase
        .from('meetings')
        .insert([{
          user_id: user.id,
          platform: bot.platform || 'teams',
          meeting_id: bot.meeting_id,
          passcode: bot.passcode || '',
          bot_name: bot.bot_name || 'Copileo',
          language: bot.language || 'fr',
          status: 'active'
        }])
        .select()
        .single();

      if (error) throw error;

      // Démarrer la récupération automatique de la transcription
      startTranscriptPolling(meeting);

      loadMeetings();
      alert('Réunion ajoutée avec succès ! La transcription va commencer.');
    } catch (error: any) {
      console.error('Erreur ajout réunion:', error);
      alert('Erreur lors de l\'ajout: ' + error.message);
    }
  };

  // Démarrer un bot
  const startBot = async () => {
    setLoading(true);
    try {
      const payload = {
        platform: newMeeting.platform,
        native_meeting_id: newMeeting.meetingId,
        bot_name: newMeeting.botName,
        language: newMeeting.language,
        passcode: newMeeting.passcode
      };

      const response = await fetch(`${VEXA_API_BASE}/bots`, {
        method: 'POST',
        headers: {
          'X-API-Key': VEXA_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const vexaData = await response.json();
      
      // Sauvegarder dans Supabase
      const { data: meeting, error } = await supabase
        .from('meetings')
        .insert([{
          user_id: user.id,
          platform: newMeeting.platform,
          meeting_id: newMeeting.meetingId,
          passcode: newMeeting.passcode,
          bot_name: newMeeting.botName,
          language: newMeeting.language,
          status: 'active'
        }])
        .select()
        .single();

      if (error) throw error;

      // Créer un événement
      await supabase.from('meeting_events').insert([{
        meeting_id: meeting.id,
        event_type: 'bot_started',
        event_data: { vexa_response: vexaData }
      }]);

      // Démarrer la récupération automatique de la transcription
      startTranscriptPolling(meeting);

      setShowNewMeeting(false);
      setNewMeeting({ platform: 'teams', meetingId: '', passcode: '', botName: 'Copileo', language: 'fr' });
      setTeamsUrl('');
      
      alert('Bot Copileo démarré ! Il rejoindra la réunion dans ~10 secondes.');
      loadMeetings();
      loadActiveBots();
    } catch (error: any) {
      console.error('Erreur démarrage bot:', error);
      alert('Erreur lors du démarrage du bot: ' + error.message);
    }
    setLoading(false);
  };

  // Polling automatique de la transcription
  const startTranscriptPolling = (meeting: any) => {
    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(
          `${VEXA_API_BASE}/transcripts/${meeting.platform}/${meeting.meeting_id}`,
          { headers: { 'X-API-Key': VEXA_API_KEY } }
        );
        const data = await response.json();
        
        if (data.segments && data.segments.length > 0) {
          // Sauvegarder les segments dans Supabase
          const segmentsToInsert = data.segments.map((seg: any, idx: number) => ({
            meeting_id: meeting.id,
            speaker: seg.speaker || 'Unknown',
            text: seg.text,
            timestamp: seg.timestamp || new Date().toISOString(),
            segment_index: idx,
            language: seg.language || meeting.language
          }));

          // Supprimer les anciens segments et insérer les nouveaux
          await supabase
            .from('transcript_segments')
            .delete()
            .eq('meeting_id', meeting.id);

          await supabase
            .from('transcript_segments')
            .insert(segmentsToInsert);

          // Mettre à jour le statut de la réunion
          await supabase
            .from('meetings')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', meeting.id);

          loadMeetings();
        }
      } catch (error) {
        console.error('Erreur récupération transcription:', error);
      }
    }, 5000); // Toutes les 5 secondes

    return intervalId;
  };

  // Arrêter un bot
  const stopBot = async (meeting: any) => {
    if (!confirm('Voulez-vous vraiment arrêter ce bot ?')) return;

    setLoading(true);
    try {
      // Récupérer la transcription complète avant d'arrêter le bot
      console.log('Fetching complete transcript before stopping bot...');
      let completeTranscript = null;
      try {
        const transcriptResponse = await fetch(
          `${VEXA_API_BASE}/transcripts/${meeting.platform}/${meeting.meeting_id}`,
          { headers: { 'X-API-Key': VEXA_API_KEY } }
        );
        if (transcriptResponse.ok) {
          completeTranscript = await transcriptResponse.json();
          console.log('Complete transcript fetched:', completeTranscript);
        }
      } catch (transcriptError) {
        console.warn('Could not fetch complete transcript:', transcriptError);
      }

      // Arrêter le bot
      await fetch(`${VEXA_API_BASE}/bots/${meeting.platform}/${meeting.meeting_id}`, {
        method: 'DELETE',
        headers: { 'X-API-Key': VEXA_API_KEY }
      });

      // Mettre à jour dans Supabase avec la transcription complète
      await supabase
        .from('meetings')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
          complete_transcript: completeTranscript
        })
        .eq('id', meeting.id);

      // Créer un événement
      await supabase.from('meeting_events').insert([{
        meeting_id: meeting.id,
        event_type: 'bot_stopped',
        event_data: { complete_transcript: completeTranscript }
      }]);

      loadMeetings();
      loadActiveBots();
      alert('Bot arrêté avec succès. Transcription complète sauvegardée.');
    } catch (error) {
      console.error('Erreur arrêt bot:', error);
      alert('Erreur lors de l\'arrêt du bot');
    }
    setLoading(false);
  };

  // Voir la transcription
  const viewTranscript = async (meeting: any) => {
    setLoading(true);
    setSelectedMeeting(meeting);

    try {
      // Si la réunion est terminée et a une transcription complète, l'utiliser
      if (meeting.status === 'completed' && meeting.complete_transcript) {
        console.log('Using complete transcript from database');
        setTranscript({
          segments: meeting.complete_transcript.segments || [],
          complete: true
        });
      } else {
        // Sinon, charger les segments depuis Supabase
        console.log('Loading transcript segments from database');
        const { data, error } = await supabase
          .from('transcript_segments')
          .select('*')
          .eq('meeting_id', meeting.id)
          .order('segment_index', { ascending: true });

        if (error) throw error;

        setTranscript({
          segments: data.map((seg: any) => ({
            speaker: seg.speaker,
            text: seg.text,
            timestamp: seg.timestamp
          })),
          complete: false
        });
      }
    } catch (error) {
      console.error('Erreur récupération transcription:', error);
      alert('Erreur lors de la récupération de la transcription');
    }
    setLoading(false);
  };

  // Supprimer une réunion
  const deleteMeeting = async (meeting: any) => {
    if (!confirm('Voulez-vous vraiment supprimer cette réunion et sa transcription ?')) return;
    
    try {
      const { error } = await supabase
        .from('meetings')
        .delete()
        .eq('id', meeting.id);

      if (error) throw error;
      
      if (selectedMeeting?.id === meeting.id) {
        setSelectedMeeting(null);
        setTranscript(null);
      }
      
      loadMeetings();
      alert('Réunion supprimée avec succès');
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  useEffect(() => {
    if (user) {
      loadMeetings();
      loadActiveBots();
    }
  }, [user]);

  useEffect(() => {
    if (autoRefresh && user) {
      const interval = setInterval(() => {
        loadActiveBots();
        if (selectedMeeting) {
          viewTranscript(selectedMeeting);
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, selectedMeeting, user]);

  // Fonction de connexion
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    console.log('Tentative de connexion avec username:', authUsername);

    try {
      // Vérifier les credentials dans la table users personnalisée
      console.log('Recherche utilisateur dans la base de données...');
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', authUsername)
        .eq('is_active', true)
        .single();

      console.log('Résultat de la requête:', { data, error });

      if (error || !data) {
        console.error('Utilisateur non trouvé ou erreur:', error);
        throw new Error('Nom d\'utilisateur ou mot de passe incorrect');
      }

      console.log('Utilisateur trouvé:', data);

      // Pour simplifier, on compare le mot de passe en clair (en production, utiliser bcrypt)
      console.log('Vérification du mot de passe...');
      console.log('Mot de passe fourni:', authPassword);
      console.log('Hash stocké:', data.password_hash);

      if (data.password_hash !== authPassword) {
        console.error('Mot de passe incorrect');
        throw new Error('Nom d\'utilisateur ou mot de passe incorrect');
      }

      console.log('Mot de passe correct, connexion réussie');

      // Authentification réussie - créer une session Supabase avec l'email
      const email = data.email || `${authUsername}@local.app`;
      console.log('Tentative de connexion Supabase avec email:', email);

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: authPassword,
      });

      console.log('Résultat connexion Supabase:', { authError });

      if (authError) {
        // Si l'utilisateur n'existe pas dans Supabase Auth, on le crée
        console.log('Utilisateur non trouvé dans Supabase Auth, création...');
        const { error: signUpError } = await supabase.auth.signUp({
          email: email,
          password: authPassword,
        });
        if (signUpError) {
          console.warn('Erreur création compte Supabase:', signUpError);
          // On continue même si la création échoue, l'utilisateur est "connecté" localement
        }
      }

      // Stocker les informations utilisateur dans le state
      const userData = {
        id: data.id,
        email: email,
        user_metadata: { username: data.username, role: data.role }
      };
      console.log('Données utilisateur stockées:', userData);
      setUser(userData);

      console.log('Connexion terminée avec succès');

    } catch (error: any) {
      console.error('Erreur de connexion:', error);
      alert('Erreur de connexion: ' + error.message);
    }
    setAuthLoading(false);
  };


  // Écran de connexion si pas d'utilisateur
  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="border-4 border-black p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold mb-4">COPILEO</h1>
          <p className="mb-6">Connectez-vous pour accéder au dashboard</p>

          <form onSubmit={handleLogin}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">Nom d'utilisateur</label>
                <input
                  type="text"
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                  className="w-full p-3 border-2 border-black"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Mot de passe</label>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full p-3 border-2 border-black"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full mt-6 p-3 bg-black text-white border-2 border-black hover:bg-white hover:text-black transition-colors font-bold disabled:opacity-50"
            >
              {authLoading ? 'Chargement...' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <header className="border-b-2 border-black p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">COPILEO</h1>
            <p className="text-sm mt-1">Bot de transcription automatique</p>
          </div>
          <div className="flex gap-3 items-center">
            <span className="text-sm opacity-60">{user.user_metadata?.username || user.email}</span>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 border-2 border-black hover:bg-black hover:text-white transition-colors"
              title="Paramètres"
            >
              <SettingsIcon size={20} />
            </button>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-2 border-2 border-black ${autoRefresh ? 'bg-black text-white' : 'bg-white'}`}
            >
              <RefreshCw size={20} />
            </button>
            <button
              onClick={() => setShowNewMeeting(true)}
              className="px-4 py-2 bg-black text-white border-2 border-black font-medium hover:bg-white hover:text-black transition-colors flex items-center gap-2"
            >
              <Plus size={20} />
              Nouvelle Réunion
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Statistiques */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="border-2 border-black p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-wide mb-1">Bots Actifs (DB)</p>
                <p className="text-3xl font-bold">{meetings.filter(m => m.status === 'active').length}</p>
              </div>
              <Play size={32} />
            </div>
          </div>
          <div className="border-2 border-black p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-wide mb-1">Bots Actifs (API)</p>
                <p className="text-3xl font-bold">{activeBots.length}</p>
              </div>
              <Play size={32} />
            </div>
          </div>
          <div className="border-2 border-black p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-wide mb-1">Réunions</p>
                <p className="text-3xl font-bold">{meetings.length}</p>
              </div>
              <Calendar size={32} />
            </div>
          </div>
          <div className="border-2 border-black p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-wide mb-1">Terminées</p>
                <p className="text-3xl font-bold">{meetings.filter(m => m.status === 'completed').length}</p>
              </div>
              <Clock size={32} />
            </div>
          </div>
        </div>

        {/* Debug: Active Bots from API */}
        <div className="border-2 border-black p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Bots Actifs (via API Vexa)</h3>
            <button
              onClick={loadActiveBots}
              className="px-4 py-2 border-2 border-black hover:bg-black hover:text-white"
            >
              Actualiser
            </button>
          </div>
          {activeBots.length > 0 ? (
            <div className="space-y-2">
              {activeBots.map((bot: any, idx: number) => (
                <div key={idx} className="border border-black p-4">
                  <p><strong>Platform:</strong> {bot.platform}</p>
                  <p><strong>Meeting ID:</strong> {bot.meeting_id}</p>
                  <p><strong>Bot Name:</strong> {bot.bot_name}</p>
                  <p><strong>Status:</strong> {bot.status}</p>
                  <button
                    onClick={() => addMeetingFromBot(bot)}
                    className="mt-2 px-4 py-2 bg-blue-500 text-white border-2 border-blue-500 hover:bg-blue-600"
                  >
                    Ajouter à la base de données
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm opacity-60">Aucun bot actif détecté via l'API Vexa. Vérifiez la console pour les détails.</p>
          )}
        </div>

        {/* Liste des réunions */}
        <div className="grid grid-cols-2 gap-6">
          {/* Colonne gauche - Liste */}
          <div>
            <h2 className="text-xl font-bold mb-4 uppercase tracking-wide">Réunions</h2>
            <div className="space-y-3">
              {meetings.length === 0 ? (
                <div className="border-2 border-black p-8 text-center">
                  <AlertCircle size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-sm opacity-60">Aucune réunion en cours</p>
                  <button
                    onClick={() => setShowNewMeeting(true)}
                    className="mt-4 px-4 py-2 border-2 border-black hover:bg-black hover:text-white transition-colors"
                  >
                    Créer une réunion
                  </button>
                </div>
              ) : (
                meetings.map(meeting => (
                  <div
                    key={meeting.id}
                    className={`border-2 border-black p-4 ${selectedMeeting?.id === meeting.id ? 'bg-black text-white' : 'bg-white'}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs uppercase tracking-wide opacity-60">
                            Microsoft Teams
                          </span>
                          <span className={`text-xs px-2 py-1 border ${selectedMeeting?.id === meeting.id ? 'border-white' : 'border-black'}`}>
                            {meeting.status}
                          </span>
                        </div>
                        <p className="font-mono text-sm">{meeting.meeting_id}</p>
                        <p className="text-xs mt-1 opacity-60">
                          {new Date(meeting.started_at).toLocaleString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => viewTranscript(meeting)}
                        className={`flex-1 p-2 border-2 ${selectedMeeting?.id === meeting.id ? 'border-white bg-white text-black' : 'border-black hover:bg-black hover:text-white'} transition-colors`}
                      >
                        <Eye size={16} className="mx-auto" />
                      </button>
                      {meeting.status === 'active' && (
                        <button
                          onClick={() => stopBot(meeting)}
                          className={`flex-1 p-2 border-2 ${selectedMeeting?.id === meeting.id ? 'border-white hover:bg-white hover:text-black' : 'border-black hover:bg-black hover:text-white'} transition-colors`}
                        >
                          <StopCircle size={16} className="mx-auto" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteMeeting(meeting)}
                        className={`flex-1 p-2 border-2 ${selectedMeeting?.id === meeting.id ? 'border-white hover:bg-white hover:text-black' : 'border-black hover:bg-black hover:text-white'} transition-colors`}
                      >
                        <Trash2 size={16} className="mx-auto" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Colonne droite - Transcription */}
          <div>
            <h2 className="text-xl font-bold mb-4 uppercase tracking-wide">
              Transcription {selectedMeeting?.status === 'completed' ? 'Complète' : 'en Temps Réel'}
            </h2>
            <div className="border-2 border-black p-6 h-[600px] overflow-y-auto">
              {!selectedMeeting ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-sm opacity-60">Sélectionnez une réunion</p>
                </div>
              ) : transcript && transcript.segments && transcript.segments.length > 0 ? (
                <div className="space-y-4">
                  {selectedMeeting.status === 'completed' && transcript.complete && (
                    <div className="bg-green-100 border border-green-300 p-3 mb-4">
                      <p className="text-sm text-green-800 font-medium">
                        ✅ Transcription complète sauvegardée
                      </p>
                    </div>
                  )}
                  {transcript.segments.map((segment: any, idx: number) => (
                    <div key={idx} className="border-b border-black pb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Users size={14} />
                        <span className="font-bold text-sm">{segment.speaker || 'Speaker'}</span>
                        <span className="text-xs opacity-60 ml-auto">
                          {new Date(segment.timestamp).toLocaleTimeString('fr-FR')}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed">{segment.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-sm opacity-60">
                    {selectedMeeting?.status === 'active'
                      ? 'Transcription en cours...'
                      : 'Aucune transcription disponible'
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Nouvelle Réunion */}
      {showNewMeeting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white border-4 border-black p-8 max-w-lg w-full">
            <h2 className="text-2xl font-bold mb-6 uppercase">Nouvelle Réunion</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold mb-2 uppercase">URL Teams (Optionnel)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={teamsUrl}
                    onChange={(e) => setTeamsUrl(e.target.value)}
                    placeholder="https://teams.live.com/meet/9387167464734?p=..."
                    className="flex-1 p-3 border-2 border-black"
                  />
                  <button
                    onClick={() => parseTeamsUrl(teamsUrl)}
                    className="px-4 border-2 border-black hover:bg-black hover:text-white transition-colors font-bold"
                  >
                    Parser
                  </button>
                </div>
                <p className="text-xs mt-1 opacity-60">Collez l'URL complète pour extraction automatique</p>
              </div>

              <div className="text-center text-xs opacity-40 uppercase tracking-wide">ou remplissez manuellement</div>

              <div>
                <label className="block text-sm font-bold mb-2 uppercase">Plateforme</label>
                <div className="w-full p-3 border-2 border-black bg-gray-100 text-gray-600">
                  Microsoft Teams
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2 uppercase">ID de Réunion</label>
                  <input
                    type="text"
                    value={newMeeting.meetingId}
                    onChange={(e) => setNewMeeting({ ...newMeeting, meetingId: e.target.value })}
                    placeholder="9387167464734"
                    className="w-full p-3 border-2 border-black"
                  />
                  <p className="text-xs mt-1 opacity-60">10-15 chiffres</p>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 uppercase">Passcode</label>
                  <input
                    type="text"
                    value={newMeeting.passcode}
                    onChange={(e) => setNewMeeting({ ...newMeeting, passcode: e.target.value })}
                    placeholder="qxJanYOcdjN4d6UlGa"
                    className="w-full p-3 border-2 border-black"
                  />
                  <p className="text-xs mt-1 opacity-60">Paramètre ?p=</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2 uppercase">Nom du Bot</label>
                  <input
                    type="text"
                    value={newMeeting.botName}
                    onChange={(e) => setNewMeeting({ ...newMeeting, botName: e.target.value })}
                    className="w-full p-3 border-2 border-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 uppercase">Langue</label>
                  <div className="w-full p-3 border-2 border-black bg-gray-100 text-gray-600">
                    Français
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowNewMeeting(false)}
                className="flex-1 p-3 border-2 border-black hover:bg-black hover:text-white transition-colors font-bold uppercase"
              >
                Annuler
              </button>
              <button
                onClick={startBot}
                disabled={loading || !newMeeting.meetingId || !newMeeting.passcode}
                className="flex-1 p-3 bg-black text-white border-2 border-black hover:bg-white hover:text-black transition-colors font-bold uppercase disabled:opacity-50"
              >
                {loading ? 'Démarrage...' : 'Démarrer le Bot'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Paramètres Webhook */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border-4 border-black p-8 max-w-lg w-full">
            <div className="flex items-center gap-3 mb-6">
              <Webhook size={32} />
              <h2 className="text-2xl font-bold uppercase">Configuration Webhook</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2 uppercase">URL du Webhook</label>
                <input
                  type="url"
                  value={settings.webhook_url}
                  onChange={(e) => setSettings({ ...settings, webhook_url: e.target.value })}
                  placeholder="https://votre-serveur.com/webhook"
                  className="w-full p-3 border-2 border-black"
                />
                <p className="text-xs mt-1 opacity-60">
                  URL où les événements seront envoyés (bot démarré, arrêté, transcription terminée)
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 uppercase">Secret Webhook</label>
                <input
                  type="text"
                  value={settings.webhook_secret}
                  onChange={(e) => setSettings({ ...settings, webhook_secret: e.target.value })}
                  placeholder="votre_secret_key"
                  className="w-full p-3 border-2 border-black font-mono"
                />
                <p className="text-xs mt-1 opacity-60">
                  Clé secrète pour valider l'authenticité des requêtes (via signature HMAC SHA-256)
                </p>
              </div>

              <div className="flex items-center gap-3 p-4 border-2 border-black">
                <input
                  type="checkbox"
                  id="webhook_enabled"
                  checked={settings.webhook_enabled}
                  onChange={(e) => setSettings({ ...settings, webhook_enabled: e.target.checked })}
                  className="w-5 h-5"
                />
                <label htmlFor="webhook_enabled" className="font-bold cursor-pointer">
                  Activer les webhooks
                </label>
              </div>

              <div className="bg-gray-100 p-4 border-2 border-black">
                <h3 className="font-bold mb-2 text-sm uppercase">Événements envoyés :</h3>
                <ul className="text-xs space-y-1 opacity-80">
                  <li>• <strong>bot_started</strong> - Le bot a rejoint la réunion</li>
                  <li>• <strong>bot_stopped</strong> - Le bot a quitté la réunion</li>
                  <li>• <strong>transcription_started</strong> - La transcription a commencé</li>
                  <li>• <strong>transcription_ended</strong> - La transcription est terminée</li>
                  <li>• <strong>error</strong> - Une erreur s'est produite</li>
                </ul>
              </div>

              <div className="bg-gray-100 p-4 border-2 border-black">
                <h3 className="font-bold mb-2 text-sm uppercase">Format du payload :</h3>
                <pre className="text-xs overflow-x-auto">
{`{
  "event_type": "bot_started",
  "meeting_id": "uuid",
  "timestamp": "2025-01-12T10:30:00Z",
  "data": {
    "platform": "teams",
    "meeting_id": "9387167464734",
    "bot_name": "Copileo"
  }
}`}
                </pre>
              </div>

              <div className="bg-gray-100 p-4 border-2 border-black">
                <h3 className="font-bold mb-2 text-sm uppercase">Vérification de la signature :</h3>
                <p className="text-xs mb-2">Header: <code className="bg-white px-2 py-1 border border-black">X-Copileo-Signature</code></p>
                <pre className="text-xs overflow-x-auto">
{`// Exemple Node.js
const crypto = require('crypto');
const signature = req.headers['x-copileo-signature'];
const hash = crypto
  .createHmac('sha256', SECRET)
  .update(JSON.stringify(req.body))
  .digest('hex');
  
if (signature === hash) {
  // Signature valide
}`}
                </pre>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowSettings(false);
                  loadSettings();
                }}
                className="flex-1 p-3 border-2 border-black hover:bg-black hover:text-white transition-colors font-bold uppercase"
              >
                Annuler
              </button>
              <button
                onClick={saveSettings}
                disabled={loading}
                className="flex-1 p-3 bg-black text-white border-2 border-black hover:bg-white hover:text-black transition-colors font-bold uppercase disabled:opacity-50"
              >
                {loading ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function Home() {
  return <CopileoDashboard />;
}