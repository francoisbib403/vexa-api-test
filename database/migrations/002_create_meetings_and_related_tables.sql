-- Migration: Create meetings and related tables

-- Create meetings table
CREATE TABLE IF NOT EXISTS public.meetings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    meeting_id VARCHAR(100) NOT NULL,
    passcode VARCHAR(100),
    bot_name VARCHAR(100) DEFAULT 'Copileo',
    language VARCHAR(10) DEFAULT 'fr',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'error')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    webhook_url TEXT,
    webhook_secret TEXT,
    webhook_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create meeting_events table
CREATE TABLE IF NOT EXISTS public.meeting_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transcript_segments table
CREATE TABLE IF NOT EXISTS public.transcript_segments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
    speaker VARCHAR(100),
    text TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    segment_index INTEGER NOT NULL,
    language VARCHAR(10) DEFAULT 'fr',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_meetings_user_id ON public.meetings(user_id);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON public.meetings(status);
CREATE INDEX IF NOT EXISTS idx_meeting_events_meeting_id ON public.meeting_events(meeting_id);
CREATE INDEX IF NOT EXISTS idx_transcript_segments_meeting_id ON public.transcript_segments(meeting_id);
CREATE INDEX IF NOT EXISTS idx_transcript_segments_segment_index ON public.transcript_segments(meeting_id, segment_index);

-- Enable RLS
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcript_segments ENABLE ROW LEVEL SECURITY;

-- Policies for meetings
CREATE POLICY "Users can view own meetings" ON public.meetings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meetings" ON public.meetings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meetings" ON public.meetings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own meetings" ON public.meetings
    FOR DELETE USING (auth.uid() = user_id);

-- Policies for user_settings
CREATE POLICY "Users can view own settings" ON public.user_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON public.user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON public.user_settings
    FOR UPDATE USING (auth.uid() = user_id);

-- Policies for meeting_events
CREATE POLICY "Users can view events for own meetings" ON public.meeting_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.meetings m
            WHERE m.id = meeting_events.meeting_id AND m.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert events for own meetings" ON public.meeting_events
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.meetings m
            WHERE m.id = meeting_events.meeting_id AND m.user_id = auth.uid()
        )
    );

-- Policies for transcript_segments
CREATE POLICY "Users can view segments for own meetings" ON public.transcript_segments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.meetings m
            WHERE m.id = transcript_segments.meeting_id AND m.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert segments for own meetings" ON public.transcript_segments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.meetings m
            WHERE m.id = transcript_segments.meeting_id AND m.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update segments for own meetings" ON public.transcript_segments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.meetings m
            WHERE m.id = transcript_segments.meeting_id AND m.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete segments for own meetings" ON public.transcript_segments
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.meetings m
            WHERE m.id = transcript_segments.meeting_id AND m.user_id = auth.uid()
        )
    );

-- Triggers for updated_at
CREATE TRIGGER update_meetings_updated_at
    BEFORE UPDATE ON public.meetings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();