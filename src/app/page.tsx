'use client';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Menu, Search, RefreshCw, Settings, User, Lightbulb, Bell, Pen, Archive, Trash2, Tag, Grid3x3, List } from 'lucide-react';
import NoteCard from '@/components/NoteCard';
import NoteListItem from '@/components/NoteListItem';
import NoteEditor from '@/components/NoteEditor';
import EditNoteModal from '@/components/EditNoteModal';
import EditLabelsModal from '@/components/EditLabelsModal';
import ThemeSelector from '@/components/ThemeSelector';
import Footer from '@/components/Footer';
import ProfileModal from '@/components/ProfileModal';
import { useLocale } from '@/lib/i18n/useLocale';

export default function Home() {
  const { t, i18n } = useTranslation(['common', 'notes', 'auth', 'settings']);
  const { locale, setLocale } = useLocale();
  const [notes, setNotes] = useState<any[]>([]);
  const [labels, setLabels] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingNote, setEditingNote] = useState<any>(null);
  const [showLabelEditModal, setShowLabelEditModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState('notes');
  const [showSettings, setShowSettings] = useState(false);
  const [showAuthSettings, setShowAuthSettings] = useState(false);
  const [authEnabled, setAuthEnabled] = useState(false);
  const [authType, setAuthType] = useState<'password' | 'pin'>('password');
  const [newPassword, setNewPassword] = useState('');
  const [hasExistingPassword, setHasExistingPassword] = useState(false);
  const [authSaving, setAuthSaving] = useState(false);

  // Profile state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileUsername, setProfileUsername] = useState<string | null>(null);
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);

  // View mode: 'grid' | 'list'
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Drag & Drop State
  const [draggedNote, setDraggedNote] = useState<any>(null);
  const [dragOverNoteId, setDragOverNoteId] = useState<string | null>(null);

  const reminderCheckedRef = useRef(false);

  const checkReminders = (notesList: any[]) => {
    const now = new Date();
    const dueNotes = notesList.filter(n =>
      n.reminder_at &&
      new Date(n.reminder_at) <= now &&
      !n.deleted_at
    );

    dueNotes.forEach(note => {
      toast(`🔔 ${t('notes:reminders.notificationPrefix')} ${note.title || t('notes:reminders.untitled')}`, {
        description: new Date(note.reminder_at).toLocaleString(i18n.language),
        duration: 8000,
        action: {
          label: t('common:actions.open'),
          onClick: () => setEditingNote(note),
        },
      });
      // Erinnerung nach Anzeige löschen
      fetch(`/api/notes/${note.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminder_at: null }),
      });
    });
  };

  const fetchData = async () => {
    const [notesRes, labelsRes] = await Promise.all([fetch('/api/notes'), fetch('/api/labels')]);
    if (notesRes.ok) {
        const data = await notesRes.json();
        data.sort((a:any, b:any) => b.position - a.position || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setNotes(data);
        if (!reminderCheckedRef.current) {
          reminderCheckedRef.current = true;
          checkReminders(data);
        }
    }
    if (labelsRes.ok) setLabels(await labelsRes.json());
  };

  useEffect(() => {
    let mounted = true;
    if (mounted) fetchData();
    return () => { mounted = false; };
  }, []);

  // Load profile on mount
  useEffect(() => {
    let mounted = true;
    fetch('/api/profile').then(r => r.json()).then(d => {
      if (mounted) {
        setProfileUsername(d.username ?? null);
        setProfileAvatar(d.avatar ?? null);
      }
    });
    return () => { mounted = false; };
  }, []);

  // View Mode aus localStorage lesen NACH Mount
  useEffect(() => {
    let mounted = true;
    if (mounted) {
      const stored = localStorage.getItem('gnotes-view-mode');
      if (stored === 'list' || stored === 'grid') setViewMode(stored);
    }
    return () => { mounted = false; };
  }, []);

  // View Mode in localStorage speichern wenn er sich ändert
  useEffect(() => { localStorage.setItem('gnotes-view-mode', viewMode); }, [viewMode]);

  // Auth-Einstellungen laden wenn Settings geöffnet wird
  useEffect(() => {
    let mounted = true;
    if (showSettings && mounted) {
      fetch('/api/settings/auth').then(r => r.json()).then(d => {
        if (mounted) {
          setAuthEnabled(d.auth_enabled);
          setAuthType(d.auth_type || 'password');
          setHasExistingPassword(d.has_password);
        }
      });
    }
    return () => { mounted = false; };
  }, [showSettings]);

  // API Helper
  const deleteNote = async (id: string, hard: boolean = false) => {
    await toast.promise(
      fetch(`/api/notes/${id}${hard ? '?hard=true' : ''}`, { method: 'DELETE' }).then(res => {
        if (res.ok) { fetchData(); if (editingNote?.id === id) setEditingNote(null); }
        else throw new Error();
      }),
      { loading: t('notes:toasts.deleting'), success: t('notes:toasts.deleted'), error: t('notes:toasts.deleteError') }
    );
  };
  const emptyTrash = async () => {
    if(!window.confirm(t('notes:placeholders.confirmEmptyTrash'))) return;
    const res = await fetch('/api/notes', { method: 'DELETE' });
    if (res.ok) { toast.success(t('notes:placeholders.trashEmptied')); fetchData(); }
  };
  const updateNote = async (id: string, data: any) => {
    const res = await fetch(`/api/notes/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) toast.error(t('notes:toasts.saveError'));
    fetchData();
  };
  const duplicateNote = async (n: any) => {
    await fetch('/api/notes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: n.title, content_text: n.content_text, color: n.color, bg_image: n.bg_image, checklist_items: n.checklist_items?.map((i:any)=>({text:i.text,checked:i.checked})), attachments: n.attachments?.map((a:any)=>a.url), label_ids: n.labels?.map((l:any)=>l.id) })
    });
    toast.success(t('notes:toasts.duplicated'));
    fetchData();
  };

  const saveAuthSettings = async () => {
    setAuthSaving(true);
    const body: Record<string, unknown> = { auth_enabled: authEnabled, auth_type: authType };
    if (newPassword) body.password = newPassword;
    const res = await fetch('/api/settings/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) {
      toast.success(authEnabled ? t('settings:enabled') : t('settings:disabled'));
      setNewPassword('');
      setShowSettings(false);
      if (authEnabled) setTimeout(() => window.location.reload(), 1000);
    } else {
      toast.error(t('notes:toasts.saveError'));
    }
    setAuthSaving(false);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  // DRAG AND DROP LOGIK
  const handleDragStart = (e: React.DragEvent, note: any) => {
    setDraggedNote(note);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = async (e: React.DragEvent, targetNote: any) => {
    e.preventDefault();
    if (!draggedNote || draggedNote.id === targetNote.id) return;
    if (draggedNote.pinned !== targetNote.pinned) return;

    const newPosTarget = draggedNote.position || Date.now();
    const newPosDragged = targetNote.position || Date.now() + 1;

    const newNotes = [...notes];
    const dragIdx = newNotes.findIndex(n => n.id === draggedNote.id);
    const targetIdx = newNotes.findIndex(n => n.id === targetNote.id);
    newNotes[dragIdx].position = newPosDragged;
    newNotes[targetIdx].position = newPosTarget;
    setNotes(newNotes.sort((a, b) => b.position - a.position));

    await fetch(`/api/notes/${draggedNote.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ position: newPosDragged }) });
    await fetch(`/api/notes/${targetNote.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ position: newPosTarget }) });
    setDraggedNote(null);
    setDragOverNoteId(null);
  };

  const viewNotes = notes.filter(n => {
    if (currentView === 'trash') return n.deleted_at !== null;
    if (n.deleted_at !== null) return false;
    if (currentView === 'archive') return n.archived;
    if (currentView === 'notes') return !n.archived;
    if (!n.archived && n.labels?.some((l:any) => l.id === currentView)) return true;
    return false;
  });

  const filteredNotes = viewNotes.filter(note => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return note.title?.toLowerCase().includes(q) || note.content_text?.toLowerCase().includes(q) || note.checklist_items?.some((i:any) => i.text.toLowerCase().includes(q));
  });

  const pinnedNotes = filteredNotes.filter(n => n.pinned);
  const otherNotes = filteredNotes.filter(n => !n.pinned);

  const renderGrid = (notesList: any[]) => (
    <div className="masonry-grid">
      {notesList.map(note =>
        <NoteCard
          key={note.id} note={note} currentView={currentView} searchQueryActive={!!searchQuery}
          onDelete={deleteNote} onUpdate={updateNote} onRefresh={fetchData} onEdit={setEditingNote} onDuplicate={duplicateNote}
          onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop}
          isDragTarget={dragOverNoteId === note.id && draggedNote?.id !== note.id}
          onDragEnter={(id: string | null) => setDragOverNoteId(id)}
          availableLabels={labels}
        />
      )}
    </div>
  );

  const renderList = (notesList: any[]) => (
    <div className="flex flex-col gap-2">
      {notesList.map(note =>
        <NoteListItem
          key={note.id} note={note} currentView={currentView}
          onDelete={deleteNote} onUpdate={updateNote} onRefresh={fetchData} onEdit={setEditingNote} onDuplicate={duplicateNote}
          availableLabels={labels}
        />
      )}
    </div>
  );

  const renderNotes = (notesList: any[]) => viewMode === 'list' ? renderList(notesList) : renderGrid(notesList);

  return (
    <div
      className="h-screen flex flex-col overflow-hidden transition-colors"
      style={{ backgroundColor: 'var(--theme-bg)', color: 'var(--theme-text)' }}
    >
      {/* Header */}
      <header
        className="h-16 flex items-center justify-between px-2 sm:px-4 border-b shrink-0 gap-2 sm:gap-4 overflow-x-auto"
        style={{ borderColor: 'var(--theme-border)' }}
      >
        <div className={`flex items-center gap-2 sm:gap-4 shrink-0 min-w-0 ${isSidebarOpen ? 'sm:w-72' : 'w-auto'}`}>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 sm:p-3 rounded-full transition-colors flex-shrink-0"
            style={{ color: 'var(--theme-text-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--theme-hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-1 sm:gap-2 min-w-0 overflow-hidden flex-shrink-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded flex items-center justify-center font-bold text-black flex-shrink-0" style={{ backgroundColor: 'var(--theme-accent)' }}>N</div>
            <span suppressHydrationWarning className="text-base sm:text-xl font-medium truncate">
              {currentView === 'trash'
                ? t('common:navigation.trash')
                : currentView === 'archive'
                  ? t('common:navigation.archive')
                  : labels.find(l => l.id === currentView)?.name || t('common:navigation.notes')}
            </span>
          </div>
        </div>

        {/* Search bar - hidden on xs, visible on sm+ */}
        <div className="flex-1 max-w-3xl mx-2 sm:mx-4 hidden sm:block min-w-0">
          <div
            className="rounded-lg flex items-center px-3 sm:px-4 py-2 transition-all shadow-sm focus-within:shadow-md"
            style={{ backgroundColor: 'var(--theme-input-bg)' }}
          >
            <Search size={18} className="mr-2 sm:mr-3 flex-shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
            <input
              type="text"
              placeholder={t('common:actions.search')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent w-full outline-none placeholder-gray-500 text-sm"
              style={{ color: 'var(--theme-text)' }}
            />
          </div>
        </div>

        {/* Right header actions - with responsive sizing */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <button
            onClick={fetchData}
            className="p-2 sm:p-3 rounded-full transition-colors flex-shrink-0"
            style={{ color: 'var(--theme-text-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--theme-hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <RefreshCw size={18} className="sm:w-5 sm:h-5" />
          </button>

          {/* View Mode Toggle - hidden on xs */}
          <div className="flex items-center rounded-lg overflow-hidden border hidden sm:flex flex-shrink-0" style={{ borderColor: 'var(--theme-border)' }}>
            <button
              onClick={() => setViewMode('grid')}
              title="Grid view"
              className="p-2 transition-colors"
              style={viewMode === 'grid'
                ? { backgroundColor: 'var(--theme-accent)', color: '#000' }
                : { color: 'var(--theme-text-muted)' }}
              onMouseEnter={e => { if (viewMode !== 'grid') e.currentTarget.style.backgroundColor = 'var(--theme-hover)'; }}
              onMouseLeave={e => { if (viewMode !== 'grid') e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <Grid3x3 size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="List view"
              className="p-2 transition-colors"
              style={viewMode === 'list'
                ? { backgroundColor: 'var(--theme-accent)', color: '#000' }
                : { color: 'var(--theme-text-muted)' }}
              onMouseEnter={e => { if (viewMode !== 'list') e.currentTarget.style.backgroundColor = 'var(--theme-hover)'; }}
              onMouseLeave={e => { if (viewMode !== 'list') e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <List size={16} />
            </button>
          </div>

          {/* Settings dropdown */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 sm:p-3 rounded-full transition-colors"
              style={{ color: 'var(--theme-text-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--theme-hover)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <Settings size={18} className="sm:w-5 sm:h-5" />
            </button>

            {showSettings && (
              <div
                className="fixed right-4 w-72 rounded-xl shadow-xl border z-50 overflow-hidden"
                style={{
                  top: '4.5rem',
                  backgroundColor: 'var(--theme-surface)',
                  borderColor: 'var(--theme-border)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                }}
              >
                {/* Profile quick-link */}
                <button
                  onClick={() => { setShowSettings(false); setShowProfileModal(true); }}
                  className="w-full text-left px-4 py-3 flex items-center gap-3 border-b transition-colors"
                  style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--theme-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  {profileAvatar ? (
                    <img src={profileAvatar} alt="Avatar" className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: 'var(--theme-accent)', color: '#000' }}
                    >
                      {profileUsername ? profileUsername.slice(0, 2).toUpperCase() : <User size={14} />}
                    </div>
                  )}
                  <span className="text-sm font-medium">{profileUsername ?? 'Set up profile'}</span>
                </button>

                {/* Theme selector */}
                <ThemeSelector />

                {/* Language */}
                <div className="w-full px-4 py-3 border-b" style={{ borderColor: 'var(--theme-border)' }}>
                  <label className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>{t('settings:language')}</span>
                    <select
                      value={locale}
                      onChange={e => setLocale(e.target.value as 'en' | 'de' | 'fr')}
                      className="rounded-lg px-2 py-1 text-sm outline-none"
                      style={{
                        backgroundColor: 'var(--theme-bg-secondary)',
                        color: 'var(--theme-text)',
                        borderColor: 'var(--theme-border)',
                      }}
                    >
                      <option value="en">{t('settings:languageEnglish')}</option>
                      <option value="de">{t('settings:languageGerman')}</option>
                      <option value="fr">{t('settings:languageFrench')}</option>
                    </select>
                  </label>
                </div>

                {/* Security */}
                <button
                  onClick={() => setShowAuthSettings(!showAuthSettings)}
                  className="w-full text-left px-4 py-3 flex items-center justify-between transition-colors"
                  style={{ color: 'var(--theme-text)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--theme-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <span>{t('settings:security')}</span>
                  <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                    {authEnabled ? `🔒 ${t('settings:active')}` : `🔓 ${t('settings:inactive')}`}
                  </span>
                </button>

                {showAuthSettings && (
                  <div className="px-4 pb-4 border-t" style={{ borderColor: 'var(--theme-border)' }}>
                    <div className="flex items-center justify-between py-3">
                      <span className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>{t('settings:appLock')}</span>
                      <button
                        onClick={() => setAuthEnabled(!authEnabled)}
                        className="w-12 h-6 rounded-full transition-colors"
                        style={{ backgroundColor: authEnabled ? 'var(--theme-accent)' : 'var(--theme-bg-tertiary)' }}
                      >
                        <span
                          className={`block w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${authEnabled ? 'translate-x-6' : 'translate-x-0'}`}
                        />
                      </button>
                    </div>
                    {authEnabled && (
                      <>
                        <div className="flex gap-3 mb-3">
                          <label className="flex items-center gap-1 text-sm cursor-pointer" style={{ color: 'var(--theme-text)' }}>
                            <input type="radio" checked={authType === 'password'} onChange={() => setAuthType('password')} /> {t('settings:password')}
                          </label>
                          <label className="flex items-center gap-1 text-sm cursor-pointer" style={{ color: 'var(--theme-text)' }}>
                            <input type="radio" checked={authType === 'pin'} onChange={() => setAuthType('pin')} /> {t('settings:pin')}
                          </label>
                        </div>
                        <input
                          type={authType === 'pin' ? 'number' : 'password'}
                          placeholder={authType === 'pin' ? t('settings:pinPlaceholder') : t('settings:newPasswordPlaceholder')}
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          className="w-full rounded-lg px-3 py-2 text-sm outline-none mb-2"
                          style={{
                            backgroundColor: 'var(--theme-bg-secondary)',
                            color: 'var(--theme-text)',
                            border: '1px solid var(--theme-border)',
                          }}
                        />
                      </>
                    )}
                    <button
                      onClick={saveAuthSettings}
                      disabled={authSaving || (authEnabled && !newPassword && !hasExistingPassword)}
                      className="w-full text-black text-sm font-semibold py-2 rounded-lg transition-colors disabled:opacity-50"
                      style={{ backgroundColor: 'var(--theme-accent)' }}
                    >
                      {authSaving ? t('settings:saving') : t('settings:save')}
                    </button>
                    {authEnabled && (
                      <p className="text-xs mt-2" style={{ color: 'var(--theme-text-muted)' }}>{t('settings:nextLoginHint')}</p>
                    )}
                  </div>
                )}

                {authEnabled && (
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 border-t text-red-500 transition-colors"
                    style={{ borderColor: 'var(--theme-border)' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--theme-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {t('auth:logout')}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Profile / Avatar button */}
          <button
            onClick={() => setShowProfileModal(true)}
            className="flex items-center gap-1 sm:gap-2 rounded-full px-1 sm:px-2 py-1 ml-1 sm:ml-4 transition-colors flex-shrink-0"
            title={profileUsername ?? 'Profile'}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--theme-hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            {profileAvatar ? (
              <img
                src={profileAvatar}
                alt="Avatar"
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold select-none flex-shrink-0"
                style={{ backgroundColor: 'var(--theme-accent)', color: '#000' }}
              >
                {profileUsername ? profileUsername.slice(0, 2).toUpperCase() : <User size={16} />}
              </div>
            )}
            {profileUsername && (
              <span className="text-xs sm:text-sm font-medium hidden md:block" style={{ color: 'var(--theme-text)' }}>
                {profileUsername}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {isSidebarOpen && (
          <aside className="w-72 py-3 shrink-0 overflow-y-auto font-medium">
            <nav className="space-y-1">
              <SidebarItem
                active={currentView === 'notes'}
                onClick={() => setCurrentView('notes')}
                icon={<Lightbulb size={24} />}
                label={t('common:navigation.notes')}
              />
              {labels.map(l => (
                <SidebarItem
                  key={l.id}
                  active={currentView === l.id}
                  onClick={() => setCurrentView(l.id)}
                  icon={<Tag size={24} />}
                  label={l.name}
                />
              ))}
              <SidebarItem
                active={false}
                onClick={() => setShowLabelEditModal(true)}
                icon={<Pen size={24} />}
                label={t('common:navigation.editLabels')}
              />
              <SidebarItem
                active={currentView === 'archive'}
                onClick={() => setCurrentView('archive')}
                icon={<Archive size={24} />}
                label={t('common:navigation.archive')}
              />
              <SidebarItem
                active={currentView === 'trash'}
                onClick={() => setCurrentView('trash')}
                icon={<Trash2 size={24} />}
                label={t('common:navigation.trash')}
              />
            </nav>
          </aside>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-8 relative">
          {currentView === 'notes' && !searchQuery && (
            <NoteEditor onNoteAdded={fetchData} availableLabels={labels} />
          )}
          {currentView === 'trash' && (
            <div className="flex justify-center mb-8">
              <div className="italic flex items-center gap-4" style={{ color: 'var(--theme-text-muted)' }}>
                {t('notes:placeholders.noteInTrashInfo')}
                <button
                  onClick={emptyTrash}
                  className="text-blue-500 hover:bg-blue-500/10 px-4 py-2 rounded-md font-medium not-italic transition-colors"
                >
                  {t('notes:placeholders.emptyTrash')}
                </button>
              </div>
            </div>
          )}

          {pinnedNotes.length > 0 ? (
            <>
              <div className="mb-8">
                <h2 className="text-xs font-semibold tracking-wider mb-4 ml-2" style={{ color: 'var(--theme-text-subtle)' }}>
                  {t('common:sections.pinned')}
                </h2>
                {renderNotes(pinnedNotes)}
              </div>
              {otherNotes.length > 0 && (
                <div>
                  <h2 className="text-xs font-semibold tracking-wider mb-4 ml-2" style={{ color: 'var(--theme-text-subtle)' }}>
                    {t('common:sections.others')}
                  </h2>
                  {renderNotes(otherNotes)}
                </div>
              )}
            </>
          ) : renderNotes(filteredNotes)}
        </main>
      </div>

      {editingNote && (
        <EditNoteModal
          note={editingNote}
          availableLabels={labels}
          onClose={() => setEditingNote(null)}
          onSave={() => { setEditingNote(null); fetchData(); }}
          onUpdate={updateNote}
          onDelete={deleteNote}
          onDuplicate={duplicateNote}
        />
      )}
      {showLabelEditModal && (
        <EditLabelsModal labels={labels} onClose={() => setShowLabelEditModal(false)} onRefresh={fetchData} />
      )}

      {showProfileModal && (
        <ProfileModal
          onClose={() => setShowProfileModal(false)}
          onProfileUpdated={(u, a) => {
            setProfileUsername(u);
            setProfileAvatar(a);
          }}
        />
      )}

      <Footer />
    </div>
  );
}

/** Reusable sidebar navigation item */
function SidebarItem({
  active, onClick, icon, label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-6 px-6 py-3 rounded-r-full transition-colors"
      style={active
        ? { backgroundColor: 'var(--theme-selected)', color: 'var(--theme-selected-text)' }
        : { color: 'var(--theme-text)' }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = 'var(--theme-hover)'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = 'transparent'; }}
    >
      {icon}
      {label}
    </button>
  );
}
