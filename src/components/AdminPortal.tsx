import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Upload,
  Image as ImageIcon,
  Calendar,
  Bell,
  Sliders,
  Users,
  Heart,
  Save,
  RotateCcw,
  Download,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Sparkles,
  Flame,
  Music,
  Lamp,
  Waves,
  Eye,
  ChevronRight,
  ShieldCheck,
  Smartphone,
  ExternalLink,
  Cloud,
  Lock,
  KeyRound,
  LogOut,
  Check,
  Loader2,
  Video,
  MessageSquare,
  Phone,
  PhoneCall,
  Mail,
  Globe,
  Building2,
  Crown,
  Link as LinkIcon,
} from 'lucide-react';
import {
  PandalData,
  GalleryItem,
  PandalEvent,
  LiveUpdate,
  Volunteer,
  HeroSlide,
  CommitteeMember,
} from '../data/pandalData';
import { savePandalData, resetPandalData, exportPandalDataJson } from '../utils/pandalStorage';
import {
  SamitiInquiry,
  subscribeToInquiries,
  updateInquiryStatus,
  deleteInquiry,
} from '../utils/inquiryStorage';
import { playTempleBell } from '../utils/audio';
import { uploadImageToCloudinary, uploadMediaToCloudinary } from '../utils/imageUpload';
import {
  setSamitiAdminAuthenticated,
  updateAdminPin,
  getStoredAdminPin,
  getAdminSessionRole,
  getAdminSessionUser,
  getActiveSiteId,
  setActiveSiteId,
  getAdminSessionToken,
  verifyAdminSessionWithServer,
} from '../utils/adminAuth';
import {
  logoutAdmin,
  subscribeToFirebaseAuthState,
  AdminUserData,
} from '../firebase/authService';

interface AdminPortalProps {
  isOpen: boolean;
  onClose: () => void;
  pandalState: PandalData;
  onUpdatePandalState: (newData: PandalData) => void;
  onLogout?: () => void;
}

type AdminTab =
  | 'gallery'
  | 'events'
  | 'live'
  | 'featuredMedia'
  | 'inquiries'
  | 'pandal'
  | 'volunteers'
  | 'donation'
  | 'hero'
  | 'security'
  | 'sites';

export const AdminPortal: React.FC<AdminPortalProps> = ({
  isOpen,
  onClose,
  pandalState,
  onUpdatePandalState,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('gallery');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [uploadingSection, setUploadingSection] = useState<'gallery' | 'hero' | 'volunteer' | 'media' | null>(null);
  const [currentAdminUser, setCurrentAdminUser] = useState<AdminUserData | null>(null);
  const [visitorCount, setVisitorCount] = useState<number | null>(null);

  // Inquiries State
  const [inquiriesList, setInquiriesList] = useState<SamitiInquiry[]>([]);
  const [inquiryFilter, setInquiryFilter] = useState<'all' | 'new' | 'contacted' | 'resolved'>('all');

  // Role & Multi-Site States
  const sessionRole = getAdminSessionRole();
  const sessionUser = getAdminSessionUser();
  const isSuperAdmin = sessionRole === 'super_admin';
  const [activeSite, setActiveSite] = useState<string>(() => getActiveSiteId());
  const [sitesList, setSitesList] = useState<any[]>([]);
  const [adminsList, setAdminsList] = useState<any[]>([]);

  // Site Creation States
  const [newSiteId, setNewSiteId] = useState('');
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteLocation, setNewSiteLocation] = useState('');
  const [newSiteTheme, setNewSiteTheme] = useState('');
  const [newSiteUpi, setNewSiteUpi] = useState('');
  const [newSiteHelpline, setNewSiteHelpline] = useState('');
  const [isSubmittingSite, setIsSubmittingSite] = useState(false);

  // Admin Creation States
  const [newAdminUser, setNewAdminUser] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'admin' | 'super_admin'>('admin');
  const [newAdminSiteId, setNewAdminSiteId] = useState('shree-shakti-durga');
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);

  const fetchSites = async () => {
    try {
      const res = await fetch('/api/sites');
      const data = await res.json();
      if (data.success && Array.isArray(data.sites)) {
        setSitesList(data.sites);
      }
    } catch (err) {
      console.warn('Failed to fetch sites:', err);
    }
  };

  const fetchAdmins = async () => {
    try {
      const token = getAdminSessionToken();
      const res = await fetch('/api/admin/admins-list', {
        headers: token ? { 'x-admin-token': token } : {},
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.admins)) {
        setAdminsList(data.admins);
      }
    } catch (err) {
      console.warn('Failed to fetch admins:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      verifyAdminSessionWithServer().then(({ valid }) => {
        if (!valid) {
          if (onLogout) {
            onLogout();
          } else {
            onClose();
          }
          return;
        }
        fetchSites();
        if (isSuperAdmin) {
          fetchAdmins();
          const token = getAdminSessionToken();
          fetch('/api/admin/visitors/count', { headers: token ? { 'x-admin-token': token } : {}, cache: 'no-store' })
            .then((r) => r.ok ? r.json() : Promise.reject())
            .then((d) => { if (d.success && Number.isFinite(d.total)) setVisitorCount(d.total); })
            .catch(() => setVisitorCount(null));
        }
      });
    }
  }, [isOpen, isSuperAdmin]);

  useEffect(() => {
    if (!isSuperAdmin && (activeTab === 'sites' || activeTab === 'featuredMedia')) {
      setActiveTab('gallery');
    }
  }, [isSuperAdmin, activeTab]);

  const handleSwitchSite = (siteId: string) => {
    playTempleBell();
    setActiveSite(siteId);
    setActiveSiteId(siteId);
    showToast(`सक्रिय वेबसाइट बदलकर '${siteId}' कर दी गई!`);
  };

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiteId.trim() || !newSiteName.trim()) {
      showToast('कृपया वेबसाइट ID और नाम दोनों भरें!');
      return;
    }

    setIsSubmittingSite(true);
    try {
      const token = getAdminSessionToken();
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-admin-token': token } : {}),
        },
        body: JSON.stringify({
          siteId: newSiteId.trim(),
          name: newSiteName.trim(),
          location: newSiteLocation.trim(),
          theme: newSiteTheme.trim(),
          upiId: newSiteUpi.trim(),
          helpline: newSiteHelpline.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'नई वेबसाइट सफलतापूर्वक जोड़ दी गई!');
        setNewSiteId('');
        setNewSiteName('');
        setNewSiteLocation('');
        setNewSiteTheme('');
        setNewSiteUpi('');
        setNewSiteHelpline('');
        fetchSites();
      } else {
        showToast(data.message || 'साइट जोड़ने में त्रुटि आई!');
      }
    } catch {
      showToast('सर्वर से संपर्क नहीं हो सका।');
    } finally {
      setIsSubmittingSite(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminUser.trim() || !newAdminPass.trim() || !newAdminName.trim()) {
      showToast('कृपया सभी अनिवार्य फ़ील्ड भरें!');
      return;
    }

    setIsSubmittingAdmin(true);
    try {
      const token = getAdminSessionToken();
      const res = await fetch('/api/admin/create-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-admin-token': token } : {}),
        },
        body: JSON.stringify({
          username: newAdminUser.trim(),
          password: newAdminPass.trim(),
          displayName: newAdminName.trim(),
          role: newAdminRole,
          siteId: newAdminSiteId,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'नया एडमिन सफलतापूर्वक बन गया!');
        setNewAdminUser('');
        setNewAdminPass('');
        setNewAdminName('');
        fetchAdmins();
      } else {
        showToast(data.message || 'एडमिन बनाने में त्रुटि!');
      }
    } catch {
      showToast('सर्वर से संपर्क नहीं हो सका।');
    } finally {
      setIsSubmittingAdmin(false);
    }
  };

  const handleDeleteAdmin = async (targetUsername: string) => {
    if (!window.confirm(`क्या आप सचमुच एडमिन '${targetUsername}' को हटाना चाहते हैं?`)) {
      return;
    }

    try {
      const token = getAdminSessionToken();
      const res = await fetch('/api/admin/delete-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-admin-token': token } : {}),
        },
        body: JSON.stringify({ username: targetUsername }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'एडमिन हटा दिया गया!');
        fetchAdmins();
      } else {
        showToast(data.message || 'हटाने में त्रुटि!');
      }
    } catch {
      showToast('सर्वर से संपर्क नहीं हो सका।');
    }
  };

  useEffect(() => {
    const unsubscribeAuth = subscribeToFirebaseAuthState((_fbUser, adminData) => {
      setCurrentAdminUser(adminData);
    });
    const unsubscribeInquiries = subscribeToInquiries((items) => {
      setInquiriesList(items);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeInquiries();
    };
  }, []);

  const handleLogout = async () => {
    playTempleBell();
    await logoutAdmin();
    setSamitiAdminAuthenticated(false);
    if (onLogout) {
      onLogout();
    }
    showToast('आप सुरक्षित रूप से लॉग आउट हो चुके हैं।');
    setTimeout(() => {
      onClose();
    }, 350);
  };

  // Security Tab States
  const [oldPinInput, setOldPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [pinChangeMsg, setPinChangeMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Gallery Form State
  const [newGalleryImage, setNewGalleryImage] = useState<string>('');
  const [newGalleryTitle, setNewGalleryTitle] = useState<string>('');
  const [newGalleryCategory, setNewGalleryCategory] = useState<GalleryItem['category']>('Pratima');
  const [newGalleryCaption, setNewGalleryCaption] = useState<string>('');
  const [editingGalleryId, setEditingGalleryId] = useState<string | null>(null);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);

  // Event Form State
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventDate, setEventDate] = useState('20 OCT');
  const [eventDayLabel, setEventDayLabel] = useState('Maha Ashtami');
  const [eventTime, setEventTime] = useState('7:30 PM – 9:00 PM');
  const [eventTitle, setEventTitle] = useState('');
  const [eventCategory, setEventCategory] = useState<PandalEvent['category']>('Puja');
  const [eventIconName, setEventIconName] = useState('Flame');
  const [eventVenue, setEventVenue] = useState('Main Garbhagriha Sanctum');
  const [eventDescription, setEventDescription] = useState('');

  // Live Update Form State
  const [editingUpdateId, setEditingUpdateId] = useState<string | null>(null);
  const [updateTitle, setUpdateTitle] = useState('');
  const [updateMessage, setUpdateMessage] = useState('');
  const [updateType, setUpdateType] = useState<LiveUpdate['type']>('live');
  const [updateIsLive, setUpdateIsLive] = useState(true);
  const [updateCrowd, setUpdateCrowd] = useState<'Low' | 'Moderate' | 'Heavy'>('Moderate');

  // Hero Slide Form State
  const [editingHeroId, setEditingHeroId] = useState<string | null>(null);
  const [heroImage, setHeroImage] = useState('');
  const [heroTag, setHeroTag] = useState('');
  const [heroTitle, setHeroTitle] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const heroFileInputRef = useRef<HTMLInputElement>(null);

  // Volunteer Form State
  const [editingVolunteerId, setEditingVolunteerId] = useState<string | null>(null);
  const [volName, setVolName] = useState('');
  const [volRole, setVolRole] = useState('');
  const [volSubRole, setVolSubRole] = useState('');
  const [volShift, setVolShift] = useState('Morning (8 AM - 2 PM)');
  const [volStatus, setVolStatus] = useState<Volunteer['status']>('Active');
  const [volPhoto, setVolPhoto] = useState('');
  const [volBadge, setVolBadge] = useState('');
  const volFileInputRef = useRef<HTMLInputElement>(null);

  // Pandal General State (Draft)
  const [draftName, setDraftName] = useState(pandalState.name);
  const [draftSubName, setDraftSubName] = useState(pandalState.subName);
  const [draftTagline, setDraftTagline] = useState(pandalState.tagline);
  const [draftLocation, setDraftLocation] = useState(pandalState.location || '');
  const [draftAddress, setDraftAddress] = useState(pandalState.address || '');
  const [draftLandmark, setDraftLandmark] = useState(pandalState.landmark || '');
  const [draftCity, setDraftCity] = useState(pandalState.city || '');
  const [draftPincode, setDraftPincode] = useState(pandalState.pincode || '');
  const [draftMapQuery, setDraftMapQuery] = useState(pandalState.mapQuery || '');
  const [draftCurrentTheme, setDraftCurrentTheme] = useState(pandalState.currentTheme);
  const [draftThemeDescription, setDraftThemeDescription] = useState(pandalState.themeDescription);
  const [draftAboutText, setDraftAboutText] = useState(pandalState.aboutText);
  const [draftFullDescription, setDraftFullDescription] = useState(pandalState.fullDescription);
  const [draftHelpline, setDraftHelpline] = useState(pandalState.parkingInfo.helpline);
  const [draftEmergencyContact, setDraftEmergencyContact] = useState(pandalState.parkingInfo.emergencyContact);
  const [draftGate1, setDraftGate1] = useState(pandalState.parkingInfo.gate1Status);
  const [draftGate2, setDraftGate2] = useState(pandalState.parkingInfo.gate2Status);
  const [draftGate3, setDraftGate3] = useState(pandalState.parkingInfo.gate3Status);

  // Donation State (Draft)
  const [draftUpiId, setDraftUpiId] = useState(pandalState.upiId || 'ak6412883@okhdfcbank');
  const [draftPayeeName, setDraftPayeeName] = useState(pandalState.payeeName || 'Shree Shakti Durga Puja Samiti');
  const [draftPresets, setDraftPresets] = useState<string>(
    (pandalState.donationAmounts || [51, 101, 501, 1001, 2001]).join(', ')
  );

  // Featured Media (Video / Image) Draft State
  const [draftMediaEnabled, setDraftMediaEnabled] = useState(pandalState.featuredMedia?.enabled ?? false);
  const [draftMediaType, setDraftMediaType] = useState<'image' | 'video'>(pandalState.featuredMedia?.type ?? 'video');
  const [draftMediaUrl, setDraftMediaUrl] = useState(pandalState.featuredMedia?.url ?? '');
  const [draftMediaTitle, setDraftMediaTitle] = useState(pandalState.featuredMedia?.title ?? '');
  const [draftMediaSubtitle, setDraftMediaSubtitle] = useState(pandalState.featuredMedia?.subtitle ?? '');
  const [draftMediaLinkUrl, setDraftMediaLinkUrl] = useState(pandalState.featuredMedia?.linkUrl ?? '');
  const [draftMediaLinkText, setDraftMediaLinkText] = useState(pandalState.featuredMedia?.linkText ?? '');
  const mediaFileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  // Sync draft pandal data when opened
  React.useEffect(() => {
    if (isOpen) {
      setDraftName(pandalState.name);
      setDraftSubName(pandalState.subName);
      setDraftTagline(pandalState.tagline);
      setDraftLocation(pandalState.location || '');
      setDraftAddress(pandalState.address || '');
      setDraftLandmark(pandalState.landmark || '');
      setDraftCity(pandalState.city || '');
      setDraftPincode(pandalState.pincode || '');
      setDraftMapQuery(pandalState.mapQuery || '');
      setDraftCurrentTheme(pandalState.currentTheme);
      setDraftThemeDescription(pandalState.themeDescription);
      setDraftAboutText(pandalState.aboutText);
      setDraftFullDescription(pandalState.fullDescription);
      setDraftHelpline(pandalState.parkingInfo.helpline);
      setDraftEmergencyContact(pandalState.parkingInfo.emergencyContact);
      setDraftGate1(pandalState.parkingInfo.gate1Status);
      setDraftGate2(pandalState.parkingInfo.gate2Status);
      setDraftGate3(pandalState.parkingInfo.gate3Status);
      setDraftUpiId(pandalState.upiId || 'ak6412883@okhdfcbank');
      setDraftPayeeName(pandalState.payeeName || 'Shree Shakti Durga Puja Samiti');
      setDraftPresets((pandalState.donationAmounts || [51, 101, 501, 1001, 2001]).join(', '));
      setDraftMediaEnabled(pandalState.featuredMedia?.enabled ?? false);
      setDraftMediaType(pandalState.featuredMedia?.type ?? 'video');
      setDraftMediaUrl(pandalState.featuredMedia?.url ?? '');
      setDraftMediaTitle(pandalState.featuredMedia?.title ?? '');
      setDraftMediaSubtitle(pandalState.featuredMedia?.subtitle ?? '');
      setDraftMediaLinkUrl(pandalState.featuredMedia?.linkUrl ?? '');
      setDraftMediaLinkText(pandalState.featuredMedia?.linkText ?? '');
    }
  }, [isOpen, pandalState]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    playTempleBell();
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleCommitPandalData = async (updated: PandalData, feedback: string) => {
    const payload: PandalData = {
      ...updated,
      updatedAt: new Date().toISOString(),
    };
    onUpdatePandalState(payload);
    await savePandalData(payload);
    showToast(feedback);
  };

  // Helper for uploading image or video to Cloudinary CDN with fallback
  const handleCloudinaryUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (url: string) => void,
    section: 'gallery' | 'hero' | 'volunteer' | 'media',
    resourceType: 'auto' | 'image' | 'video' = 'image'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = resourceType === 'video' || file.type.startsWith('video/');
    const maxSize = isVideo ? 100 * 1024 * 1024 : 25 * 1024 * 1024;

    if (file.size > maxSize) {
      alert(isVideo ? 'कृपया 100MB से छोटा वीडियो चुनें (Video size should be under 100MB)' : 'कृपया 25MB से छोटी इमेज चुनें (Image size under 25MB)');
      return;
    }

    setUploadingSection(section);
    try {
      const res = await uploadMediaToCloudinary(file, isVideo ? 'video' : 'image', 'durga_puja_2026');
      if (res.success && res.url) {
        setter(res.url);
        showToast(isVideo ? '🎬 वीडियो Cloudinary CDN पर सुरक्षित अपलोड हो गया!' : '☁️ Cloudinary CDN पर सुरक्षित अपलोड सफल!');
      } else {
        // Fallback to FileReader if Cloudinary fails
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setter(event.target.result as string);
            showToast(isVideo ? 'लोकल वीडियो लोड हो गया (फ़ॉलबैक)' : 'लोकल स्टोरेज में फोटो लोड हो गई (फ़ॉलबैक)');
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      alert('अपलोड में समस्या आई: ' + (err?.message || 'त्रुटि'));
    } finally {
      setUploadingSection(null);
    }
  };

  // Featured Media (Video & Image) Handlers - Super Admin Only
  const handleSaveFeaturedMedia = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isSuperAdmin) {
      showToast('विशेष मीडिया में बदलाव की अनुमति केवल सुपर एडमिन को है!');
      return;
    }
    const updated: PandalData = {
      ...pandalState,
      featuredMedia: {
        enabled: draftMediaEnabled,
        type: draftMediaType,
        url: draftMediaUrl.trim(),
        title: draftMediaTitle.trim(),
        subtitle: draftMediaSubtitle.trim(),
        linkUrl: draftMediaLinkUrl.trim(),
        linkText: draftMediaLinkText.trim(),
      },
    };
    handleCommitPandalData(updated, 'विशेष मीडिया (Featured Media) सफलतापूर्वक वेबसाइट पर सेव हो गया!');
  };

  const handleRemoveFeaturedMedia = () => {
    if (!isSuperAdmin) {
      showToast('विशेष मीडिया हटाने की अनुमति केवल सुपर एडमिन को है!');
      return;
    }
    setDraftMediaEnabled(false);
    setDraftMediaUrl('');
    setDraftMediaTitle('');
    setDraftMediaSubtitle('');
    setDraftMediaLinkUrl('');
    setDraftMediaLinkText('');
    const updated: PandalData = {
      ...pandalState,
      featuredMedia: {
        enabled: false,
        type: 'video',
        url: '',
        title: '',
        subtitle: '',
        linkUrl: '',
        linkText: '',
      },
    };
    handleCommitPandalData(updated, 'विशेष मीडिया हटा दिया गया है। मुख्य पेज से स्पेस पूरी तरह खाली हो गया!');
  };

  // Inquiries Action Handlers
  const handleUpdateInquiryStatus = async (id: string, status: 'new' | 'contacted' | 'resolved') => {
    playTempleBell();
    await updateInquiryStatus(id, status);
    showToast(`स्थिति अपडेट की गई: ${status === 'contacted' ? 'संपर्क किया' : status === 'resolved' ? 'समाधान हुआ' : 'नई'}`);
  };

  const handleDeleteInquiry = async (id: string) => {
    if (!confirm('क्या आप इस पूछताछ रिकॉर्ड को हटाना चाहते हैं?')) return;
    playTempleBell();
    await deleteInquiry(id);
    showToast('पूछताछ रिकॉर्ड हटा दिया गया।');
  };

  const handleExportInquiriesCsv = () => {
    if (inquiriesList.length === 0) {
      alert('डाउनलोड करने के लिए कोई पूछताछ उपलब्ध नहीं है।');
      return;
    }
    const headers = ['ID', 'Date', 'Devotee Name', 'Phone', 'Committee Member', 'Purpose', 'Status', 'Message'];
    const rows = inquiriesList.map((q) => [
      q.id,
      q.createdAt,
      `"${(q.senderName || '').replace(/"/g, '""')}"`,
      `"${q.senderPhone || ''}"`,
      `"${(q.memberName || '').replace(/"/g, '""')}"`,
      `"${(q.purpose || '').replace(/"/g, '""')}"`,
      q.status,
      `"${(q.message || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `samiti_inquiries_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('📊 पूछताछ सूची CSV फ़ाइल डाउनलोड हो गई!');
  };

  // Change Admin Security PIN
  const handleChangeAdminPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPinInput || newPinInput.trim().length < 4) {
      setPinChangeMsg({ type: 'error', text: 'नया पिन कम से कम 4 अंकों का होना चाहिए।' });
      return;
    }
    if (newPinInput.trim() !== confirmPinInput.trim()) {
      setPinChangeMsg({ type: 'error', text: 'नया पिन और पुष्टि पिन मेल नहीं खा रहे हैं।' });
      return;
    }

    const targetUsername = sessionUser?.username || (isSuperAdmin ? 'kushwahaarjun9970' : 'admin');
    const res = await updateAdminPin(oldPinInput, newPinInput, targetUsername);
    if (res.success) {
      setPinChangeMsg({ type: 'success', text: res.message });
      setOldPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
      showToast('सुरक्षा पासवर्ड सफलतापूर्वक अपडेट हो गया!');
    } else {
      setPinChangeMsg({ type: 'error', text: res.message });
    }
  };

  // GALLERY ACTIONS
  const handleSaveGalleryItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGalleryImage.trim()) {
      showToast('कृपया फोटो अपलोड करें या इमेज URL दर्ज करें');
      return;
    }
    if (!newGalleryTitle.trim()) {
      showToast('कृपया फोटो का शीर्षक दर्ज करें');
      return;
    }

    let updatedGallery: GalleryItem[];
    if (editingGalleryId) {
      updatedGallery = pandalState.galleryImages.map((item) =>
        item.id === editingGalleryId
          ? {
              ...item,
              image: newGalleryImage,
              title: newGalleryTitle,
              category: newGalleryCategory,
              caption: newGalleryCaption || newGalleryTitle,
            }
          : item
      );
      setEditingGalleryId(null);
    } else {
      const newItem: GalleryItem = {
        id: `g_${Date.now()}`,
        image: newGalleryImage,
        title: newGalleryTitle,
        category: newGalleryCategory,
        caption: newGalleryCaption || newGalleryTitle,
      };
      updatedGallery = [newItem, ...pandalState.galleryImages];
    }

    const updatedData: PandalData = {
      ...pandalState,
      galleryImages: updatedGallery,
    };

    handleCommitPandalData(
      updatedData,
      editingGalleryId ? 'फोटो विवरण अपडेट कर दिया गया है!' : 'नई फोटो गैलरी में सफलतापूर्वक जुड़ गई है!'
    );

    // Reset Form
    setNewGalleryImage('');
    setNewGalleryTitle('');
    setNewGalleryCaption('');
    setNewGalleryCategory('Pratima');
    if (galleryFileInputRef.current) galleryFileInputRef.current.value = '';
  };

  const handleDeleteGalleryItem = (id: string) => {
    const updatedGallery = pandalState.galleryImages.filter((item) => item.id !== id);
    const updatedData: PandalData = {
      ...pandalState,
      galleryImages: updatedGallery,
    };
    handleCommitPandalData(updatedData, 'फोटो गैलरी से हटा दी गई है!');
  };

  const handleEditGalleryItem = (item: GalleryItem) => {
    setEditingGalleryId(item.id);
    setNewGalleryImage(item.image);
    setNewGalleryTitle(item.title);
    setNewGalleryCategory(item.category);
    setNewGalleryCaption(item.caption);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // EVENT ACTIONS
  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) {
      showToast('कृपया अनुष्ठान / कार्यक्रम का नाम दर्ज करें');
      return;
    }

    let updatedEvents: PandalEvent[];
    if (editingEventId) {
      updatedEvents = pandalState.events.map((ev) =>
        ev.id === editingEventId
          ? {
              ...ev,
              date: eventDate,
              dayLabel: eventDayLabel,
              time: eventTime,
              title: eventTitle,
              category: eventCategory,
              iconName: eventIconName,
              venue: eventVenue,
              description: eventDescription,
            }
          : ev
      );
      setEditingEventId(null);
    } else {
      const newEvent: PandalEvent = {
        id: `e_${Date.now()}`,
        date: eventDate,
        dayLabel: eventDayLabel,
        time: eventTime,
        title: eventTitle,
        category: eventCategory,
        iconName: eventIconName,
        venue: eventVenue,
        description: eventDescription,
      };
      updatedEvents = [...pandalState.events, newEvent];
    }

    const updatedData: PandalData = {
      ...pandalState,
      events: updatedEvents,
      totalEvents: updatedEvents.length,
    };

    handleCommitPandalData(
      updatedData,
      editingEventId ? 'कार्यक्रम विवरण अपडेट हो गया!' : 'नया उत्सव कार्यक्रम सफलतापूर्वक जुड़ गया!'
    );

    // Reset Form
    setEventTitle('');
    setEventDescription('');
  };

  const handleDeleteEvent = (id: string) => {
    const updatedEvents = pandalState.events.filter((ev) => ev.id !== id);
    const updatedData: PandalData = {
      ...pandalState,
      events: updatedEvents,
      totalEvents: updatedEvents.length,
    };
    handleCommitPandalData(updatedData, 'कार्यक्रम हटा दिया गया है!');
  };

  const handleEditEvent = (ev: PandalEvent) => {
    setEditingEventId(ev.id);
    setEventDate(ev.date);
    setEventDayLabel(ev.dayLabel);
    setEventTime(ev.time);
    setEventTitle(ev.title);
    setEventCategory(ev.category);
    setEventIconName(ev.iconName);
    setEventVenue(ev.venue);
    setEventDescription(ev.description);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // LIVE UPDATE ACTIONS
  const handleSaveUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateTitle.trim() || !updateMessage.trim()) {
      showToast('कृपया सूचना शीर्षक और संदेश दोनों दर्ज करें');
      return;
    }

    const now = new Date();
    const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let updatedList: LiveUpdate[];
    if (editingUpdateId) {
      updatedList = pandalState.liveUpdates.map((u) =>
        u.id === editingUpdateId
          ? {
              ...u,
              title: updateTitle,
              message: updateMessage,
              type: updateType,
              isLive: updateIsLive,
              crowdLevel: updateCrowd,
            }
          : u
      );
      setEditingUpdateId(null);
    } else {
      const newU: LiveUpdate = {
        id: `u_${Date.now()}`,
        time: 'Just Now',
        timestamp: timeFormatted,
        title: updateTitle,
        message: updateMessage,
        type: updateType,
        isLive: updateIsLive,
        crowdLevel: updateCrowd,
      };
      updatedList = [newU, ...pandalState.liveUpdates];
    }

    const updatedData: PandalData = {
      ...pandalState,
      liveUpdates: updatedList,
    };

    handleCommitPandalData(
      updatedData,
      editingUpdateId ? 'लाइव सूचना संशोधित की गई!' : 'नई लाइव घोषणा जारी की गई!'
    );

    setUpdateTitle('');
    setUpdateMessage('');
  };

  const handleToggleLiveStatus = (id: string) => {
    const updatedList = pandalState.liveUpdates.map((u) =>
      u.id === id ? { ...u, isLive: !u.isLive } : u
    );
    const updatedData: PandalData = {
      ...pandalState,
      liveUpdates: updatedList,
    };
    handleCommitPandalData(updatedData, 'लाइव स्थिति अपडेट हो गई!');
  };

  const handleDeleteUpdate = (id: string) => {
    const updatedList = pandalState.liveUpdates.filter((u) => u.id !== id);
    const updatedData: PandalData = {
      ...pandalState,
      liveUpdates: updatedList,
    };
    handleCommitPandalData(updatedData, 'सूचना हटा दी गई है!');
  };

  // PANDAL GENERAL DETAILS SAVE
  const handleSavePandalDetails = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedData: PandalData = {
      ...pandalState,
      name: draftName,
      subName: draftSubName,
      tagline: draftTagline,
      location: draftLocation.trim(),
      address: draftAddress.trim(),
      landmark: draftLandmark.trim(),
      city: draftCity.trim(),
      pincode: draftPincode.trim(),
      mapQuery: draftMapQuery.trim(),
      currentTheme: draftCurrentTheme,
      themeDescription: draftThemeDescription,
      aboutText: draftAboutText,
      fullDescription: draftFullDescription,
      parkingInfo: {
        ...pandalState.parkingInfo,
        helpline: draftHelpline,
        emergencyContact: draftEmergencyContact,
        gate1Status: draftGate1,
        gate2Status: draftGate2,
        gate3Status: draftGate3,
      },
    };
    handleCommitPandalData(updatedData, 'पंडाल विवरण व थीम सुरक्षित कर दी गई हैं!');
  };

  // DONATION DETAILS SAVE
  const handleSaveDonationDetails = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedPresets = draftPresets
      .split(',')
      .map((p) => parseInt(p.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0);

    const updatedData: PandalData = {
      ...pandalState,
      upiId: draftUpiId.trim() || 'ak6412883@okhdfcbank',
      payeeName: draftPayeeName.trim() || 'Shree Shakti Durga Puja Samiti',
      donationAmounts: parsedPresets.length > 0 ? parsedPresets : [51, 101, 501, 1001, 2001],
    };
    handleCommitPandalData(updatedData, 'दान व UPI विवरण सुरक्षित हो गए!');
  };

  // VOLUNTEER ACTIONS
  const handleSaveVolunteer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!volName.trim() || !volRole.trim()) {
      alert('कृपया स्वयंसेवक का नाम और सेवा कार्य दर्ज करें');
      return;
    }

    let updatedVols: Volunteer[];
    if (editingVolunteerId) {
      updatedVols = pandalState.volunteers.map((v) =>
        v.id === editingVolunteerId
          ? {
              ...v,
              name: volName,
              role: volRole,
              subRole: volSubRole,
              shift: volShift,
              status: volStatus,
              photo: volPhoto || v.photo,
              badge: volBadge,
            }
          : v
      );
      setEditingVolunteerId(null);
    } else {
      const newV: Volunteer = {
        id: `vol_${Date.now()}`,
        name: volName,
        role: volRole,
        subRole: volSubRole,
        shift: volShift,
        status: volStatus,
        photo:
          volPhoto ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
        badge: volBadge,
      };
      updatedVols = [...pandalState.volunteers, newV];
    }

    const updatedData: PandalData = {
      ...pandalState,
      volunteers: updatedVols,
      volunteerCount: updatedVols.length,
    };

    handleCommitPandalData(
      updatedData,
      editingVolunteerId ? 'स्वयंसेवक विवरण संशोधित हुआ!' : 'नया स्वयंसेवक सफलतापूर्वक जोड़ा गया!'
    );

    setVolName('');
    setVolRole('');
    setVolSubRole('');
    setVolPhoto('');
    setVolBadge('');
    if (volFileInputRef.current) volFileInputRef.current.value = '';
  };

  const handleDeleteVolunteer = (id: string) => {
    if (confirm('क्या आप इस स्वयंसेवक को सूची से हटाना चाहते हैं?')) {
      const updatedVols = pandalState.volunteers.filter((v) => v.id !== id);
      const updatedData: PandalData = {
        ...pandalState,
        volunteers: updatedVols,
        volunteerCount: updatedVols.length,
      };
      handleCommitPandalData(updatedData, 'स्वयंसेवक सूची से हटा दिया गया!');
    }
  };

  // HERO SLIDE ACTIONS
  const handleSaveHeroSlide = (e: React.FormEvent) => {
    e.preventDefault();
    if (!heroImage.trim() || !heroTitle.trim()) {
      alert('कृपया बैनर इमेज और शीर्षक दर्ज करें');
      return;
    }

    let updatedSlides: HeroSlide[];
    if (editingHeroId) {
      updatedSlides = pandalState.heroImages.map((s) =>
        s.id === editingHeroId
          ? {
              ...s,
              image: heroImage,
              tag: heroTag || '2026 Theme',
              title: heroTitle,
              subtitle: heroSubtitle,
            }
          : s
      );
      setEditingHeroId(null);
    } else {
      const newSlide: HeroSlide = {
        id: `h_${Date.now()}`,
        image: heroImage,
        tag: heroTag || 'Festive Darshan',
        title: heroTitle,
        subtitle: heroSubtitle,
      };
      updatedSlides = [...pandalState.heroImages, newSlide];
    }

    const updatedData: PandalData = {
      ...pandalState,
      heroImages: updatedSlides,
    };

    handleCommitPandalData(
      updatedData,
      editingHeroId ? 'बैनर स्लाइड अपडेट हो गया!' : 'नया बैनर स्लाइड जुड़ गया!'
    );

    setHeroImage('');
    setHeroTag('');
    setHeroTitle('');
    setHeroSubtitle('');
    if (heroFileInputRef.current) heroFileInputRef.current.value = '';
  };

  const handleDeleteHeroSlide = (id: string) => {
    if (pandalState.heroImages.length <= 1) {
      alert('कम से कम 1 मुख्य बैनर स्लाइड होना आवश्यक है');
      return;
    }
    if (confirm('क्या आप इस बैनर को हटाना चाहते हैं?')) {
      const updatedSlides = pandalState.heroImages.filter((s) => s.id !== id);
      const updatedData: PandalData = {
        ...pandalState,
        heroImages: updatedSlides,
      };
      handleCommitPandalData(updatedData, 'बैनर स्लाइड हटा दिया गया!');
    }
  };

  // RESET & EXPORT ACTIONS
  const handleResetToDefaults = async () => {
    const original = await resetPandalData();
    onUpdatePandalState(original);
    showToast('समस्त डेटा मूल मंदिर डिफ़ॉल्ट पर रीसेट कर दिया गया!');
  };

  const handleExportData = () => {
    exportPandalDataJson(pandalState);
    showToast('पंडाल कॉन्फ़िगरेशन JSON डाउनलोड हो रहा है!');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex flex-col justify-start animate-fade-in text-slate-800">
      {/* Devotional Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-60 bg-white border-2 border-[#d97706] text-[#78350f] px-6 py-3.5 rounded-2xl shadow-[0_10px_35px_rgba(217,119,6,0.3)] flex items-center gap-3 animate-bounce">
          <Sparkles className="w-5 h-5 text-[#d97706]" />
          <span className="text-sm font-bold tracking-wide">{toastMessage}</span>
        </div>
      )}

      {/* TOP CLEAN WHITE DEVOTIONAL HEADER */}
      <header className="w-full bg-white/95 backdrop-blur-md border-b border-[#e5d8c3] px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ffd76a] to-[#d9a441] flex items-center justify-center text-[#7a1c1c] font-black text-xl shadow-sm border border-[#c49232]/30">
            🪷
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-marcellus text-lg sm:text-xl font-bold text-[#801313] tracking-wide">
                समिति प्रबंधन कक्ष
              </h1>
              {isSuperAdmin ? (
                <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 text-white border border-yellow-400 text-[10px] font-bold shadow-2xs flex items-center gap-1">
                  <Crown className="w-3 h-3 text-yellow-200" />
                  <span>मुख्य सुपर एडमिन</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300 text-[10px] font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-amber-600" />
                  <span>समिति एडमिन</span>
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              <p className="text-xs text-[#7c5b36]">
                {sessionUser?.displayName ? `${sessionUser.displayName} • ` : ''}
                {isSuperAdmin ? 'अखिल भारतीय मास्टर कंट्रोल' : (pandalState.name || 'समिति पंडाल')}
              </p>
              {isSuperAdmin && sitesList.length > 0 && (
                <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                  <span className="text-[10px] font-bold text-amber-800">साइट:</span>
                  <select
                    value={activeSite}
                    onChange={(e) => handleSwitchSite(e.target.value)}
                    className="text-[11px] bg-transparent text-amber-900 font-bold cursor-pointer focus:outline-none"
                  >
                    {sitesList.map((s) => (
                      <option key={s.siteId} value={s.siteId}>
                        {s.name} ({s.siteId})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportData}
            title="Download Backup"
            className="px-3 py-1.5 rounded-xl bg-[#fdf9f3] hover:bg-[#f5ecdc] text-xs font-semibold text-[#7c5324] border border-[#d8c7ad] flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-[#b45309]" />
            <span className="hidden sm:inline">डेटा बैकअप</span>
          </button>

          <button
            onClick={handleResetToDefaults}
            title="Reset to Original Defaults"
            className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-xs font-semibold text-rose-700 border border-rose-200 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">रीसेट</span>
          </button>

          <button
            onClick={() => {
              playTempleBell();
              onClose();
            }}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#d97706] to-[#f59e0b] text-white font-bold text-xs sm:text-sm hover:brightness-105 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Eye className="w-4 h-4 text-amber-100" />
            <span>लाइव वेबसाइट देखें</span>
          </button>

          <button
            onClick={handleLogout}
            title="सुरक्षित लॉग आउट"
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-xs font-semibold text-slate-700 hover:text-rose-700 border border-slate-300 hover:border-rose-300 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-600" />
            <span className="hidden md:inline">लॉग आउट</span>
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
            aria-label="Close Admin"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* QUICK STATS COUNTERS */}
      <div className="bg-[#fcfaf7] border-b border-[#e8ddcb] px-4 sm:px-8 py-2 overflow-x-auto custom-scrollbar flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5 text-slate-700 shrink-0 font-medium">
          <span className="text-[#b45309] font-bold">📸 {pandalState.galleryImages.length}</span> तस्वीरें
        </div>
        <span className="text-[#d8c7ad]">•</span>
        <div className="flex items-center gap-1.5 text-slate-700 shrink-0 font-medium">
          <span className="text-[#b45309] font-bold">📅 {pandalState.events.length}</span> कार्यक्रम
        </div>
        <span className="text-[#d8c7ad]">•</span>
        <div className="flex items-center gap-1.5 text-slate-700 shrink-0 font-medium">
          <span className="text-[#b45309] font-bold">📢 {pandalState.liveUpdates.length}</span> सूचनाएं
        </div>
        <span className="text-[#d8c7ad]">•</span>
        <div className="flex items-center gap-1.5 text-slate-700 shrink-0 font-medium">
          <span className="text-[#b45309] font-bold">👥 {pandalState.volunteers.length}</span> स्वयंसेवक
        </div>
        <span className="text-[#d8c7ad]">•</span>
        <div className="flex items-center gap-1.5 text-slate-700 shrink-0 font-medium">
          <span className="text-[#b45309] font-bold">📩 {inquiriesList.length}</span> पूछताछ
        </div>
        {isSuperAdmin && (
          <>
            <span className="text-[#d8c7ad]">•</span>
            <div className="flex items-center gap-1.5 text-[#801313] shrink-0 font-bold bg-amber-100/60 px-2 py-0.5 rounded-md">
              <span>🌐 {sitesList.length} वेबसाइट्स</span>
            </div>
          </>
        )}
      </div>

      {/* HORIZONTAL TAB NAVIGATION */}
      <div className="bg-white border-b border-[#e5d8c3] px-3 sm:px-8 flex items-center gap-1.5 sm:gap-2.5 overflow-x-auto custom-scrollbar py-2.5 shrink-0 shadow-xs">
        {[
          ...(isSuperAdmin
            ? [{ id: 'sites', label: 'मल्टी-वेबसाइट्स व एडमिन', icon: Globe, badge: sitesList.length }]
            : []),
          { id: 'gallery', label: 'फोटो गैलरी', icon: ImageIcon, badge: pandalState.galleryImages.length },
          { id: 'events', label: 'उत्सव व कार्यक्रम', icon: Calendar, badge: pandalState.events.length },
          {
            id: 'live',
            label: 'लाइव सूचनाएं',
            icon: Bell,
            badge: pandalState.liveUpdates.filter((u) => u.isLive).length,
          },
          ...(isSuperAdmin
            ? [
                {
                  id: 'featuredMedia',
                  label: 'विशेष मीडिया (Video/Image)',
                  icon: Video,
                  badge: draftMediaEnabled && draftMediaUrl ? 'सक्रिय' : undefined,
                },
              ]
            : []),
          {
            id: 'inquiries',
            label: 'पूछताछ व संदेश',
            icon: MessageSquare,
            badge: inquiriesList.filter((x) => x.status === 'new').length || undefined,
          },
          { id: 'pandal', label: 'पंडाल विवरण', icon: Sliders },
          { id: 'volunteers', label: 'स्वयंसेवक', icon: Users, badge: pandalState.volunteers.length },
          { id: 'donation', label: 'दान व्यवस्था', icon: Heart },
          { id: 'hero', label: 'मुख्य स्लाइडर', icon: Sparkles, badge: pandalState.heroImages.length },
          { id: 'security', label: 'सुरक्षा', icon: Lock },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                playTempleBell();
                setActiveTab(tab.id as AdminTab);
              }}
              className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer border ${
                isActive
                  ? 'bg-gradient-to-r from-[#8a1313] to-[#a31a1a] text-white border-[#8a1313] shadow-sm'
                  : 'bg-[#faf7f2] hover:bg-[#f3ebd9] text-[#6b4722] border-[#e5d8c3]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-amber-200' : 'text-[#b45309]'}`} />
              <span>{tab.label}</span>
              {typeof tab.badge === 'number' && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    isActive ? 'bg-[#ffd76a] text-[#590a0a]' : 'bg-[#e8decb] text-[#590a0a]'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT PANELS (LIGHT WARM IVORY/WHITE CANVAS) */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar bg-[#f8f5ee]">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* ==================================================== */}
          {/* TAB 1: GALLERY & IMAGE MANAGEMENT */}
          {/* ==================================================== */}
          {activeTab === 'gallery' && (
            <div className="space-y-6">
              {/* Form Card: Add / Edit Photo */}
              <div className="bg-white border border-[#e5d8c3] rounded-2xl p-5 sm:p-7 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between pb-3 mb-5 border-b border-[#f0e6d6]">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🪷</span>
                    <h3 className="font-marcellus text-lg sm:text-xl font-bold text-[#801313]">
                      {editingGalleryId ? 'फोटो संपादित करें (Edit Photo)' : 'नई फोटो अपलोड करें (Upload New Image)'}
                    </h3>
                  </div>
                  {editingGalleryId && (
                    <button
                      onClick={() => {
                        setEditingGalleryId(null);
                        setNewGalleryImage('');
                        setNewGalleryTitle('');
                        setNewGalleryCaption('');
                      }}
                      className="text-xs font-semibold text-rose-600 hover:underline"
                    >
                      रद्द करें (Cancel Edit)
                    </button>
                  )}
                </div>

                <form onSubmit={handleSaveGalleryItem} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left: Upload Input & Image Preview */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-[#7a1c1c] uppercase tracking-wider">
                          1. फोटो चुनें या लिंक दर्ज करें *
                        </label>
                      </div>

                      {/* File Picker Button */}
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          disabled={uploadingSection === 'gallery'}
                          onClick={() => galleryFileInputRef.current?.click()}
                          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#d97706] to-[#f59e0b] text-white font-bold text-xs flex items-center gap-2 hover:brightness-105 shadow-sm cursor-pointer transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {uploadingSection === 'gallery' ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>अपलोड हो रहा है...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4" />
                              <span>डिवाइस से फोटो चुनें</span>
                            </>
                          )}
                        </button>
                        <input
                          ref={galleryFileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleCloudinaryUpload(e, setNewGalleryImage, 'gallery')}
                        />
                        <span className="text-xs text-slate-500">या नीचे लिंक पेस्ट करें</span>
                      </div>

                      {/* URL input */}
                      <input
                        type="text"
                        placeholder="उदा: https://res.cloudinary.com/... या https://images.unsplash.com/..."
                        value={newGalleryImage}
                        onChange={(e) => setNewGalleryImage(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf8f5] border border-[#d8c7ad] text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#d97706]"
                      />

                      {/* Preview Box */}
                      {newGalleryImage ? (
                        <div className="relative w-full h-48 rounded-xl overflow-hidden border-2 border-[#d97706] shadow-sm group">
                          <img
                            src={newGalleryImage}
                            alt="Preview"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&auto=format&fit=crop&q=80';
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-xs font-bold text-white bg-black/70 px-3 py-1 rounded-full">
                              लाइव पूर्वावलोकन (Preview)
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-36 rounded-xl border-2 border-dashed border-[#d8c7ad] bg-[#faf8f5] flex flex-col items-center justify-center text-xs text-slate-400 gap-1.5">
                          <ImageIcon className="w-8 h-8 opacity-40 text-[#b45309]" />
                          <span>फोटो चुनने पर यहाँ पूर्वावलोकन दिखाई देगा</span>
                        </div>
                      )}
                    </div>

                    {/* Right: Metadata Inputs */}
                    <div className="space-y-3.5">
                      <div>
                        <label className="block text-xs font-bold text-[#7a1c1c] uppercase tracking-wider mb-1">
                          2. फोटो का शीर्षक (Title) *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="उदा: माँ दुर्गा प्रतिमा दर्शन / Trinetra Mahadev"
                          value={newGalleryTitle}
                          onChange={(e) => setNewGalleryTitle(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf8f5] border border-[#d8c7ad] text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#d97706]"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-[#7a1c1c] uppercase tracking-wider mb-1">
                            3. श्रेणी (Category)
                          </label>
                          <select
                            value={newGalleryCategory}
                            onChange={(e) =>
                              setNewGalleryCategory(e.target.value as GalleryItem['category'])
                            }
                            className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf8f5] border border-[#d8c7ad] text-xs sm:text-sm text-slate-800 font-semibold focus:bg-white focus:outline-none focus:border-[#d97706]"
                          >
                            <option value="Pratima">Pratima (प्रतिमा)</option>
                            <option value="Pandal">Pandal (भव्य पंडाल)</option>
                            <option value="Aarti">Aarti (महा आरती)</option>
                            <option value="Cultural">Cultural (सांस्कृतिक)</option>
                            <option value="Community">Community (सामुदायिक)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#7a1c1c] uppercase tracking-wider mb-1">
                            शीघ्र प्रीसेट
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setNewGalleryImage(
                                'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&auto=format&fit=crop&q=80'
                              );
                              setNewGalleryTitle('दिव्य महा आरती दृश्य');
                              setNewGalleryCategory('Aarti');
                              setNewGalleryCaption('108 दीपों की भव्य संध्या आरती का दिव्य क्षण।');
                            }}
                            className="w-full py-2.5 px-2 rounded-xl bg-[#fdf8f0] hover:bg-[#faebd4] text-[11px] font-bold text-[#b45309] border border-[#e8cca0] transition-all text-center cursor-pointer"
                          >
                            + माँ आरती प्रीसेट
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#7a1c1c] uppercase tracking-wider mb-1">
                          4. विवरण / व्याख्या (Caption / Description)
                        </label>
                        <textarea
                          rows={2}
                          placeholder="उदा: 12 फुट की पवित्र मिट्टी की प्रतिमा एवं अलौकिक आभूषण..."
                          value={newGalleryCaption}
                          onChange={(e) => setNewGalleryCaption(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-[#faf8f5] border border-[#d8c7ad] text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#d97706]"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-[#d97706] to-[#f59e0b] text-white font-bold text-sm hover:brightness-105 flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                      >
                        <Save className="w-4 h-4" />
                        <span>
                          {editingGalleryId ? 'फोटो में परिवर्तन सुरक्षित करें' : 'पंडाल गैलरी में प्रकाशित करें (Publish)'}
                        </span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Existing Gallery Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-marcellus text-base sm:text-lg font-bold text-[#801313] flex items-center gap-2">
                    <span>🖼️</span> वर्तमान गैलरी फोटो ({pandalState.galleryImages.length})
                  </h4>
                  <span className="text-xs text-slate-500 font-medium">
                    किसी भी फोटो को संपादित करें या हटाएं
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pandalState.galleryImages.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white border border-[#e5d8c3] rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div className="relative h-44 w-full overflow-hidden bg-slate-100">
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                        <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-white/90 border border-[#d8c7ad] text-[10px] font-bold text-[#801313] shadow-xs">
                          {item.category}
                        </span>
                      </div>

                      <div className="p-3.5 flex-1 flex flex-col justify-between">
                        <div>
                          <h5 className="font-bold text-sm text-slate-800 line-clamp-1">
                            {item.title}
                          </h5>
                          <p className="text-xs text-slate-600 line-clamp-2 mt-1">
                            {item.caption}
                          </p>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-3 mt-3 border-t border-[#f0e6d6]">
                          <button
                            onClick={() => handleEditGalleryItem(item)}
                            className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold text-xs flex items-center gap-1 border border-amber-300 transition-all cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteGalleryItem(item.id)}
                            className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs flex items-center gap-1 border border-rose-300 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 2: EVENTS MANAGEMENT */}
          {/* ==================================================== */}
          {activeTab === 'events' && (
            <div className="space-y-6">
              {/* Form Card: Add / Edit Event */}
              <div className="bg-white border border-[#e5d8c3] rounded-2xl p-5 sm:p-7 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between pb-3 mb-5 border-b border-[#f0e6d6]">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🪔</span>
                    <h3 className="font-marcellus text-lg sm:text-xl font-bold text-[#801313]">
                      {editingEventId
                        ? 'उत्सव कार्यक्रम संपादित करें (Edit Festival Event)'
                        : 'नया उत्सव कार्यक्रम जोड़ें (Add New Festival Event)'}
                    </h3>
                  </div>
                  {editingEventId && (
                    <button
                      onClick={() => {
                        setEditingEventId(null);
                        setEventTitle('');
                        setEventDescription('');
                      }}
                      className="text-xs font-semibold text-rose-600 hover:underline"
                    >
                      रद्द करें (Cancel Edit)
                    </button>
                  )}
                </div>

                <form onSubmit={handleSaveEvent} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#7a1c1c] mb-1">
                        कार्यक्रम का नाम (Event Title) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="उदा: महा आरती एवं हवन"
                        value={eventTitle}
                        onChange={(e) => setEventTitle(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#faf8f5] border border-[#d8c7ad] text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#d97706]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#7a1c1c] mb-1">
                        तिथि (Date Label) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="उदा: 20 OCT या 21 OCT"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#faf8f5] border border-[#d8c7ad] text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#d97706]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#7a1c1c] mb-1">
                        दिन / तिथि नाम (Day Label) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="उदा: Maha Ashtami / Shasthi / Navami"
                        value={eventDayLabel}
                        onChange={(e) => setEventDayLabel(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#faf8f5] border border-[#d8c7ad] text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#d97706]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#7a1c1c] mb-1">
                        समय (Timing) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="उदा: 7:30 PM – 9:00 PM"
                        value={eventTime}
                        onChange={(e) => setEventTime(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#faf8f5] border border-[#d8c7ad] text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#d97706]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#7a1c1c] mb-1">
                        श्रेणी (Category)
                      </label>
                      <select
                        value={eventCategory}
                        onChange={(e) => setEventCategory(e.target.value as PandalEvent['category'])}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#faf8f5] border border-[#d8c7ad] text-xs sm:text-sm text-slate-800 font-semibold focus:bg-white focus:outline-none focus:border-[#d97706]"
                      >
                        <option value="Puja">Puja (पूजा एवं अनुष्ठान)</option>
                        <option value="Aarti">Aarti (महा आरती)</option>
                        <option value="Dance">Dance (धुनुची नृत्य)</option>
                        <option value="Cultural">Cultural (सांस्कृतिक संगीत)</option>
                        <option value="Visarjan">Visarjan (विसर्जन यात्रा)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#7a1c1c] mb-1">
                        स्थान / मंच (Venue)
                      </label>
                      <input
                        type="text"
                        placeholder="उदा: Main Sanctum / Courtyard Stage"
                        value={eventVenue}
                        onChange={(e) => setEventVenue(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#faf8f5] border border-[#d8c7ad] text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#d97706]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#7a1c1c] mb-1">
                      कार्यक्रम विवरण (Description)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="उदा: 108 पवित्र दीपकों के साथ शहर की सुख-शांति हेतु भव्य महा आरती..."
                      value={eventDescription}
                      onChange={(e) => setEventDescription(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#faf8f5] border border-[#d8c7ad] text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#d97706]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full sm:w-auto px-8 py-2.5 rounded-xl bg-gradient-to-r from-[#d97706] to-[#f59e0b] text-white font-bold text-xs sm:text-sm hover:brightness-105 flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>
                      {editingEventId ? 'कार्यक्रम अपडेट करें' : 'कार्यक्रम शेड्यूल में जोड़ें'}
                    </span>
                  </button>
                </form>
              </div>

              {/* Existing Events List */}
              <div className="space-y-3">
                <h4 className="font-marcellus text-base sm:text-lg font-bold text-[#801313] flex items-center gap-2">
                  <span>📅</span> वर्तमान उत्सव कार्यक्रम सूची ({pandalState.events.length})
                </h4>

                <div className="space-y-3">
                  {pandalState.events.map((ev) => (
                    <div
                      key={ev.id}
                      className="bg-white border border-[#e5d8c3] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#801313] to-[#590a0a] border border-[#ffd76a]/40 flex flex-col items-center justify-center text-center shrink-0 shadow-xs">
                          <span className="text-[10px] text-[#ffd76a] uppercase font-bold tracking-tight">
                            {ev.date}
                          </span>
                          <span className="text-xs font-bold text-white leading-none">
                            {ev.dayLabel.split(' ')[0]}
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h5 className="font-bold text-sm sm:text-base text-slate-800">
                              {ev.title}
                            </h5>
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[10px] text-amber-800 font-bold">
                              {ev.category}
                            </span>
                          </div>
                          <p className="text-xs text-[#b45309] mt-0.5 font-bold">
                            ⏰ {ev.time} • 📍 {ev.venue}
                          </p>
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                            {ev.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => handleEditEvent(ev)}
                          className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold flex items-center gap-1 border border-amber-300 transition-all cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>संशोधन (Edit)</span>
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(ev.id)}
                          className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1 border border-rose-300 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>हटाएं (Delete)</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 3: LIVE BROADCASTS & ANNOUNCEMENTS */}
          {/* ==================================================== */}
          {activeTab === 'live' && (
            <div className="space-y-6">
              {/* Form Card: Add Live Update */}
              <div className="bg-white border border-[#e5d8c3] rounded-2xl p-5 sm:p-7 shadow-sm">
                <div className="flex items-center justify-between pb-3 mb-5 border-b border-[#f0e6d6]">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📢</span>
                    <h3 className="font-marcellus text-lg sm:text-xl font-bold text-[#801313]">
                      नई लाइव सूचना / घोषणा (Broadcast Live Update)
                    </h3>
                  </div>
                </div>

                <form onSubmit={handleSaveUpdate} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-[#7a1c1c] mb-1">
                        सूचना का शीर्षक (Headline) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="उदा: महा आरती प्रारंभ होने में 10 मिनट शेष!"
                        value={updateTitle}
                        onChange={(e) => setUpdateTitle(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#faf8f5] border border-[#d8c7ad] text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#d97706]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#7a1c1c] mb-1">
                        प्रकार (Type)
                      </label>
                      <select
                        value={updateType}
                        onChange={(e) => setUpdateType(e.target.value as LiveUpdate['type'])}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#faf8f5] border border-[#d8c7ad] text-xs sm:text-sm text-slate-800 font-semibold focus:bg-white focus:outline-none focus:border-[#d97706]"
                      >
                        <option value="live">🔴 Live (लाइव कार्यक्रम)</option>
                        <option value="prasad">🍲 Prasad (प्रसाद व भोग)</option>
                        <option value="alert">⚠️ Alert (चेतावनी / भीड़ सूचना)</option>
                        <option value="info">ℹ️ Info (सामान्य जानकारी)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#7a1c1c] mb-1">
                      संदेश विवरण (Detailed Announcement) *
                    </label>
                    <textarea
                      rows={2}
                      required
                      placeholder="उदा: सभी भक्तगण कृपया मुख्य प्रांगण में पधारें और महिषासुरमर्दिनी स्तोत्र पाठ में भाग लें..."
                      value={updateMessage}
                      onChange={(e) => setUpdateMessage(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#faf8f5] border border-[#d8c7ad] text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#d97706]"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#801313]">
                        <input
                          type="checkbox"
                          checked={updateIsLive}
                          onChange={(e) => setUpdateIsLive(e.target.checked)}
                          className="w-4 h-4 accent-[#d97706]"
                        />
                        <span>इसे तुरंत "LIVE" मार्क करें (Show Live Badge)</span>
                      </label>

                      <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                        <span>भीड़ स्थिति:</span>
                        <select
                          value={updateCrowd}
                          onChange={(e) => setUpdateCrowd(e.target.value as 'Low' | 'Moderate' | 'Heavy')}
                          className="bg-[#faf8f5] border border-[#d8c7ad] rounded-lg px-2 py-1 text-xs text-slate-800 font-semibold"
                        >
                          <option value="Low">Low (कम भीड़)</option>
                          <option value="Moderate">Moderate (मध्यम)</option>
                          <option value="Heavy">Heavy (भारी भीड़)</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 text-white font-bold text-xs sm:text-sm hover:brightness-105 flex items-center gap-2 shadow-sm cursor-pointer"
                    >
                      <Bell className="w-4 h-4" />
                      <span>तुरंत प्रसारित करें (Broadcast Now)</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Current Updates List */}
              <div className="space-y-3">
                <h4 className="font-marcellus text-base sm:text-lg font-bold text-[#801313] flex items-center gap-2">
                  <span>📡</span> सक्रिय लाइव अपडेट्स ({pandalState.liveUpdates.length})
                </h4>

                <div className="space-y-3">
                  {pandalState.liveUpdates.map((u) => (
                    <div
                      key={u.id}
                      className={`rounded-xl p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                        u.isLive
                          ? 'bg-rose-50/70 border-rose-300 shadow-xs'
                          : 'bg-white border-[#e5d8c3]'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {u.isLive && (
                            <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black animate-pulse">
                              ● LIVE
                            </span>
                          )}
                          <span className="text-xs text-[#b45309] font-mono font-bold">
                            {u.timestamp || u.time}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
                            {u.type.toUpperCase()}
                          </span>
                          {u.crowdLevel && (
                            <span className="text-[10px] text-slate-500 font-medium">
                              भीड़: {u.crowdLevel}
                            </span>
                          )}
                        </div>
                        <h5 className="font-bold text-sm sm:text-base text-slate-900">
                          {u.title}
                        </h5>
                        <p className="text-xs text-slate-600">{u.message}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => handleToggleLiveStatus(u.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                            u.isLive
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          }`}
                        >
                          {u.isLive ? 'Live बंद करें' : 'Live चालू करें'}
                        </button>

                        <button
                          onClick={() => handleDeleteUpdate(u.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs border border-rose-200 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB: FEATURED MEDIA (VIDEO / PHOTO HIGHLIGHT) - SUPER ADMIN ONLY */}
          {/* ==================================================== */}
          {activeTab === 'featuredMedia' && isSuperAdmin && (
            <div className="space-y-6">
              <div className="bg-white border border-[#e5d8c3] rounded-2xl p-5 sm:p-7 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-[#f0e6d6]">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-xl bg-amber-100 text-amber-900 border border-amber-300">
                      <Video className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="font-marcellus text-lg sm:text-xl font-bold text-[#801313]">
                        विशेष मीडिया प्रबंधन (Video / Photo Highlight)
                      </h3>
                      <p className="text-xs text-slate-500 font-serif">
                        मुख्य पेज पर कोई भी विशेष वीडियो या फ़ोटो लगाएं। हटाते ही वहाँ की जगह पूरी तरह खाली हो जाएगी।
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        draftMediaEnabled && draftMediaUrl.trim()
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-slate-100 text-slate-600 border-slate-300'
                      }`}
                    >
                      {draftMediaEnabled && draftMediaUrl.trim() ? '🟢 पेज पर लाइव है' : '⚪ बंद (हटाया हुआ)'}
                    </span>
                  </div>
                </div>

                <form onSubmit={handleSaveFeaturedMedia} className="space-y-5">
                  {/* Enable / Disable Switch */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-amber-50/70 border border-amber-200">
                    <div>
                      <h4 className="text-sm font-bold text-amber-950">
                        विशेष मीडिया सक्रिय करें (Enable on Main Page)
                      </h4>
                      <p className="text-xs text-amber-800 font-serif mt-0.5">
                        सक्रिय करने पर यह मुख्य पेज पर दिखेगा। हटाने पर इसका स्थान पूरी तरह खाली हो जाएगा।
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draftMediaEnabled}
                        onChange={(e) => setDraftMediaEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  {/* Format Selector: Video vs Image */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDraftMediaType('video')}
                      className={`p-3.5 rounded-xl border flex items-center justify-center gap-2 text-sm font-bold transition-all cursor-pointer ${
                        draftMediaType === 'video'
                          ? 'bg-[#801313] text-white border-[#801313] shadow-sm'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <Video className="w-4 h-4" />
                      <span>वीडियो (Video / YouTube / MP4)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDraftMediaType('image')}
                      className={`p-3.5 rounded-xl border flex items-center justify-center gap-2 text-sm font-bold transition-all cursor-pointer ${
                        draftMediaType === 'image'
                          ? 'bg-[#801313] text-white border-[#801313] shadow-sm'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <ImageIcon className="w-4 h-4" />
                      <span>फोटो (Image / Cloudinary)</span>
                    </button>
                  </div>

                  {/* Media Upload & URL Configuration */}
                  <div className="p-4 rounded-xl bg-amber-50/40 border border-amber-200 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <label className="block text-xs font-bold text-[#7a1c1c]">
                        {draftMediaType === 'video'
                          ? '1. वीडियो फ़ाइल या URL (Video Upload from Gallery / Direct Link) *'
                          : '1. फोटो फ़ाइल या URL (Photo Upload from Gallery / Direct Link) *'}
                      </label>
                      <span className="text-[11px] text-amber-800 font-medium">
                        {draftMediaType === 'video' ? '🎬 गैलरी से MP4, WebM या वीडियो चुनें' : '🖼️ गैलरी से फोटो चुनें'}
                      </span>
                    </div>

                    {/* Hidden Native File Inputs */}
                    <input
                      ref={videoFileInputRef}
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime,video/*"
                      className="hidden"
                      onChange={(e) =>
                        handleCloudinaryUpload(e, (url) => setDraftMediaUrl(url), 'media', 'video')
                      }
                    />
                    <input
                      ref={mediaFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleCloudinaryUpload(e, (url) => setDraftMediaUrl(url), 'media', 'image')
                      }
                    />

                    {/* Gallery Choose Button & URL Input Row */}
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (draftMediaType === 'video') {
                            videoFileInputRef.current?.click();
                          } else {
                            mediaFileInputRef.current?.click();
                          }
                        }}
                        disabled={uploadingSection === 'media'}
                        className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer whitespace-nowrap disabled:opacity-50 shrink-0"
                      >
                        {uploadingSection === 'media' ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-amber-200" />
                            <span>
                              {draftMediaType === 'video' ? 'वीडियो अपलोड हो रहा है...' : 'फोटो अपलोड हो रही है...'}
                            </span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 text-amber-200" />
                            <span>
                              {draftMediaType === 'video' ? '📁 गैलरी से वीडियो चुनें (Choose Video)' : '📁 गैलरी से फोटो चुनें (Choose Photo)'}
                            </span>
                          </>
                        )}
                      </button>

                      <input
                        type="url"
                        value={draftMediaUrl}
                        onChange={(e) => setDraftMediaUrl(e.target.value)}
                        placeholder={
                          draftMediaType === 'video'
                            ? 'या वीडियो लिंक पेस्ट करें: https://...mp4 या YouTube Link'
                            : 'या इमेज लिंक पेस्ट करें: https://...'
                        }
                        className="flex-1 px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#d9a441]"
                      />
                    </div>

                    {draftMediaUrl && (
                      <p className="text-[11px] text-emerald-700 font-mono break-all flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        <span>सक्रिय मीडिया स्रोत: {draftMediaUrl.slice(0, 80)}{draftMediaUrl.length > 80 ? '...' : ''}</span>
                      </p>
                    )}
                  </div>

                  {/* Title & Subtitle */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#7a1c1c] mb-1">
                        शीर्षक (Title - वैकल्पिक)
                      </label>
                      <input
                        type="text"
                        value={draftMediaTitle}
                        onChange={(e) => setDraftMediaTitle(e.target.value)}
                        placeholder="जैसे: श्री शक्ति दुर्गा पूजा भव्य आरती दर्शन"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#d9a441] focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#7a1c1c] mb-1">
                        उप-शीर्षक / विवरण (Subtitle - वैकल्पिक)
                      </label>
                      <input
                        type="text"
                        value={draftMediaSubtitle}
                        onChange={(e) => setDraftMediaSubtitle(e.target.value)}
                        placeholder="जैसे: अलौकिक दर्शन एवं पंडाल की भव्यता"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#d9a441] focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Clickable Link Attachment to Video/Media */}
                  <div className="p-4 rounded-xl bg-[#faf8f5] border border-[#e5d8c3] space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#801313]">
                        <LinkIcon className="w-4 h-4 text-[#d97706]" />
                        <span>वीडियो / मीडिया पर लिंक लगाएं (Attach Clickable Link)</span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        दर्शकों के लिए वीडियो के साथ यह लिंक बटन प्रदर्शित होगा
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          लिंक URL (Target Link URL)
                        </label>
                        <input
                          type="url"
                          value={draftMediaLinkUrl}
                          onChange={(e) => setDraftMediaLinkUrl(e.target.value)}
                          placeholder="उदा: https://youtube.com/live/... या Instagram, दान या वेबसाइट लिंक"
                          className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#d8c7ad] text-xs sm:text-sm font-mono text-slate-800 focus:outline-none focus:border-[#d97706]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          लिंक बटन का नाम (Button Label)
                        </label>
                        <input
                          type="text"
                          value={draftMediaLinkText}
                          onChange={(e) => setDraftMediaLinkText(e.target.value)}
                          placeholder="उदा: लाइव आरती देखें / Watch Live / दान करें"
                          className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#d8c7ad] text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#d97706]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Live Preview Box with Native Ratio */}
                  {draftMediaUrl && draftMediaUrl.trim() && (
                    <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-700 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#ffd76a] flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" /> लाइव पूर्वावलोकन (Preview - मूल रेशियो में)
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {draftMediaType === 'video' ? 'Autoplay Video (Native Aspect Ratio)' : 'Image'}
                        </span>
                      </div>

                      <div className="rounded-xl overflow-hidden bg-black/80 flex flex-col items-center justify-center p-2 border border-slate-800">
                        {draftMediaType === 'video' ? (
                          draftMediaUrl.includes('youtube') || draftMediaUrl.includes('youtu.be') ? (
                            <p className="p-6 text-xs text-amber-200 font-medium text-center">
                              ▶️ YouTube लिंक सुरक्षित है: {draftMediaUrl} (वेबसाइट पर सीधे एम्बेड होकर स्वतः चलेगा)
                            </p>
                          ) : (
                            <video
                              src={draftMediaUrl}
                              controls
                              autoPlay
                              muted
                              playsInline
                              loop
                              className="max-h-[360px] w-auto max-w-full rounded-lg object-contain shadow-md"
                            />
                          )
                        ) : (
                          <img
                            src={draftMediaUrl}
                            alt="Preview"
                            className="max-h-[360px] w-auto max-w-full rounded-lg object-contain shadow-md"
                          />
                        )}

                        {draftMediaLinkUrl && (
                          <div className="mt-3">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-[#ffd76a] border border-[#ffd76a]/30 text-xs font-medium">
                              <LinkIcon className="w-3 h-3" />
                              <span>बटन: {draftMediaLinkText || 'लिंक खोलें'}</span>
                              <ExternalLink className="w-3 h-3 opacity-70" />
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#f0e6d6]">
                    <button
                      type="button"
                      onClick={handleRemoveFeaturedMedia}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>मीडिया हटाएं और स्पेस खाली करें (Clear Space)</span>
                    </button>

                    <button
                      type="submit"
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#d97706] to-[#f59e0b] hover:brightness-105 text-white font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>पेज पर सुरक्षित करें (Save to Page)</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB: DEVOTEE INQUIRIES & MESSAGES */}
          {/* ==================================================== */}
          {activeTab === 'inquiries' && (
            <div className="space-y-6">
              {/* Header Box */}
              <div className="bg-white border border-[#e5d8c3] rounded-2xl p-5 sm:p-7 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-5 border-b border-[#f0e6d6]">
                  <div className="flex items-center gap-3">
                    <span className="p-2.5 rounded-xl bg-amber-100 text-amber-900 border border-amber-300">
                      <MessageSquare className="w-5 h-5 text-amber-900" />
                    </span>
                    <div>
                      <h3 className="font-marcellus text-lg sm:text-xl font-bold text-[#801313]">
                        श्रद्धालु पूछताछ व संदेश (Devotee Inquiries)
                      </h3>
                      <p className="text-xs text-slate-500 font-serif">
                        वेबसाइट से समिति सदस्यों को भेजे गए सभी संदेश, फ़ोन नंबर व विवरण
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportInquiriesCsv}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Excel / CSV डाउनलोड</span>
                    </button>
                  </div>
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap items-center gap-2 mb-6">
                  {[
                    { id: 'all', label: 'सभी पूछताछ', count: inquiriesList.length },
                    {
                      id: 'new',
                      label: 'नई पूछताछ',
                      count: inquiriesList.filter((x) => x.status === 'new').length,
                      badgeClass: 'bg-rose-600 text-white',
                    },
                    {
                      id: 'contacted',
                      label: 'संपर्क किया',
                      count: inquiriesList.filter((x) => x.status === 'contacted').length,
                      badgeClass: 'bg-amber-600 text-white',
                    },
                    {
                      id: 'resolved',
                      label: 'समाधान हुआ',
                      count: inquiriesList.filter((x) => x.status === 'resolved').length,
                      badgeClass: 'bg-emerald-600 text-white',
                    },
                  ].map((flt) => {
                    const isActive = inquiryFilter === flt.id;
                    return (
                      <button
                        key={flt.id}
                        type="button"
                        onClick={() => {
                          playTempleBell();
                          setInquiryFilter(flt.id as any);
                        }}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
                          isActive
                            ? 'bg-[#801313] text-white border-[#801313] shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <span>{flt.label}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                            flt.badgeClass || (isActive ? 'bg-amber-300 text-black' : 'bg-slate-200 text-slate-700')
                          }`}
                        >
                          {flt.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Inquiries Cards List */}
                {(() => {
                  const filtered = inquiriesList.filter((item) => {
                    if (inquiryFilter === 'all') return true;
                    return item.status === inquiryFilter;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-12 px-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                        <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <h4 className="text-sm font-bold text-slate-600">
                          {inquiryFilter === 'all'
                            ? 'अभी तक कोई पूछताछ संदेश प्राप्त नहीं हुआ है।'
                            : 'इस फ़िल्टर में कोई पूछताछ नहीं मिली।'}
                        </h4>
                        <p className="text-xs text-slate-400 mt-1 font-serif">
                          जब भी कोई श्रद्धालु वेबसाइट पर समिति सदस्य से संपर्क करेगा, वह यहाँ तुरंत दिखाई देगा।
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {filtered.map((inq) => {
                        const cleanPhone = (inq.senderPhone || '').replace(/[^0-9]/g, '');
                        const waText = encodeURIComponent(
                          `जय माँ दुर्गा! प्रणाम ${inq.senderName} जी,\nश्री शक्ति दुर्गा पूजा समिति के संदर्भ में आपकी पूछताछ (${inq.purpose}) के संबंध में संपर्क किया जा रहा है।`
                        );
                        const waUrl = `https://wa.me/${cleanPhone}?text=${waText}`;

                        return (
                          <div
                            key={inq.id}
                            className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                              inq.status === 'new'
                                ? 'bg-rose-50/40 border-rose-200 shadow-sm'
                                : inq.status === 'contacted'
                                ? 'bg-amber-50/30 border-amber-200'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <span className="font-bold text-slate-900 text-base">
                                  {inq.senderName}
                                </span>
                                <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                                  {inq.senderPhone}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    inq.status === 'new'
                                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                      : inq.status === 'contacted'
                                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                      : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                  }`}
                                >
                                  {inq.status === 'new'
                                    ? '🔴 नई पूछताछ'
                                    : inq.status === 'contacted'
                                    ? '🟡 संपर्क किया'
                                    : '🟢 समाधान हुआ'}
                                </span>
                              </div>

                              <div className="text-[11px] text-slate-500 font-mono">
                                📅 {new Date(inq.createdAt).toLocaleString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            </div>

                            {/* Recipient Member & Purpose */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-3">
                              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                                <span className="text-slate-500 block text-[10px]">संदेश प्राप्तकर्ता (Addressed To):</span>
                                <span className="font-bold text-[#801313]">{inq.memberName}</span>
                                <span className="text-slate-500 ml-1">({inq.memberRole})</span>
                              </div>

                              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                                <span className="text-slate-500 block text-[10px]">पूछताछ का विषय (Inquiry Purpose):</span>
                                <span className="font-bold text-slate-800">{inq.purpose}</span>
                              </div>
                            </div>

                            {/* Message Body */}
                            {inq.message && (
                              <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm text-slate-800 mb-3 font-serif leading-relaxed">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">
                                  श्रद्धालु का संदेश:
                                </span>
                                "{inq.message}"
                              </div>
                            )}

                            {/* Action Buttons: Call, WhatsApp, Status, Delete */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                              <div className="flex items-center gap-2">
                                <a
                                  href={`tel:${inq.senderPhone}`}
                                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-300"
                                >
                                  <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
                                  <span>फ़ोन करें</span>
                                </a>

                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#128C7E] text-xs font-bold flex items-center gap-1.5 transition-all border border-[#25D366]/40"
                                >
                                  <MessageSquare className="w-3.5 h-3.5 text-[#25D366] fill-[#25D366]" />
                                  <span>WhatsApp चैट</span>
                                </a>
                              </div>

                              <div className="flex items-center gap-2">
                                <select
                                  value={inq.status}
                                  onChange={(e) =>
                                    handleUpdateInquiryStatus(inq.id, e.target.value as any)
                                  }
                                  className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#d97706]"
                                >
                                  <option value="new">🔴 नया</option>
                                  <option value="contacted">🟡 संपर्क किया</option>
                                  <option value="resolved">🟢 समाधान हुआ</option>
                                </select>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteInquiry(inq.id)}
                                  className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs cursor-pointer transition-all"
                                  title="हटाएं (Delete Record)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 4: PANDAL DETAILS & THEME */}
          {/* ==================================================== */}
          {activeTab === 'pandal' && (
            <form onSubmit={handleSavePandalDetails} className="space-y-6">
              <div className="bg-white border border-[#e5d8c3] rounded-2xl p-5 sm:p-7 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-[#f0e6d6]">
                  <span className="text-xl">🚩</span>
                  <h3 className="font-marcellus text-lg sm:text-xl font-bold text-[#801313]">
                    पंडाल का नाम, पता व 2026 थीम (Pandal Identity & Theme)
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#7a1c1c] mb-1">
                      पंडाल का मुख्य नाम (Name)
                    </label>
                    <input
                      type="text"
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#faf8f5] border border-[#d8c7ad] text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#d97706]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#7a1c1c] mb-1">
                      उप-नाम (Sub Name)
                    </label>
                    <input
                      type="text"
                      value={draftSubName}
                      onChange={(e) => setDraftSubName(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#faf8f5] border border-[#d8c7ad] text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#d97706]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#7a1c1c] mb-1">
                      टैगलाइन (Tagline)
                    </label>
                    <input
                      type="text"
                      value={draftTagline}
                      onChange={(e) => setDraftTagline(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#faf8f5] border border-[#d8c7ad] text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#d97706]"
                    />
                  </div>
                </div>

                {/* Theme Configuration */}
                <div className="p-4 rounded-xl bg-[#faf8f5] border border-[#e5d8c3] space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#801313]">
                    <Sparkles className="w-4 h-4 text-[#d97706]" />
                    <span>2026 पंडाल थीम विज़न (Festival Theme)</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      थीम शीर्षक (Theme Title)
                    </label>
                    <input
                      type="text"
                      value={draftCurrentTheme}
                      onChange={(e) => setDraftCurrentTheme(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#d8c7ad] text-xs sm:text-sm font-bold text-[#b45309] focus:outline-none focus:border-[#d97706]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      थीम का विस्तृत दर्शन (Theme Description)
                    </label>
                    <textarea
                      rows={2}
                      value={draftThemeDescription}
                      onChange={(e) => setDraftThemeDescription(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#d8c7ad] text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#d97706]"
                    />
                  </div>
                </div>

                {/* About Narratives */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#7a1c1c] mb-1">
                      संक्षिप्त परिचय (Short About Text)
                    </label>
                    <textarea
                      rows={3}
                      value={draftAboutText}
                      onChange={(e) => setDraftAboutText(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#faf8f5] border border-[#d8c7ad] text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-none focus:border-[#d97706]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#7a1c1c] mb-1">
                      संपूर्ण इतिहास व गाथा (Full Description)
                    </label>
                    <textarea
                      rows={3}
                      value={draftFullDescription}
                      onChange={(e) => setDraftFullDescription(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#faf8f5] border border-[#d8c7ad] text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-none focus:border-[#d97706]"
                    />
                  </div>
                </div>

                {/* Location, Address & Live Map Configuration */}
                <div className="p-5 rounded-2xl bg-[#faf8f5] border border-[#e5d8c3] space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-[#801313]">
                      <span>📍</span>
                      <span>स्थान, पता एवं लाइव मैप (Location, Address & Live Map)</span>
                    </div>
                    <span className="text-[11px] text-amber-800 bg-amber-100/70 border border-amber-300 px-2.5 py-0.5 rounded-full font-medium">
                      यहाँ बदलने पर हेडर, मैप और कार्ड्स में तुरंत अपडेट होगा
                    </span>
                  </div>

                  {/* Primary Location (Appears in Header, Share & Badges) */}
                  <div>
                    <label className="block text-xs font-bold text-[#801313] mb-1">
                      1. मुख्य शहर व राज्य / लोकेशन (Header & Display Location) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="उदा: स्टेशन रोड, सीवान, बिहार या अलीगंज, लखनऊ, उत्तर प्रदेश"
                      value={draftLocation}
                      onChange={(e) => setDraftLocation(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#d8c7ad] text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-[#d97706] shadow-2xs"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      यह मुख्य स्थान वेबसाइट के सबसे ऊपर हेडर (Header) और सूचनाओं में दिखता है।
                    </p>
                  </div>

                  {/* Street Address and Landmark */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        2. पंडाल का पूरा पता (Street Address / Venue) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="उदा: स्टेशन रोड, मेन पंडाल ग्राउंड्स"
                        value={draftAddress}
                        onChange={(e) => setDraftAddress(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#d8c7ad] text-xs text-slate-800 focus:outline-none focus:border-[#d97706]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        3. निकटतम लैंडमार्क / पहचान (Landmark)
                      </label>
                      <input
                        type="text"
                        placeholder="उदा: रेलवे स्टेशन के पास / टाउन हॉल के सामने"
                        value={draftLandmark}
                        onChange={(e) => setDraftLandmark(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#d8c7ad] text-xs text-slate-800 focus:outline-none focus:border-[#d97706]"
                      />
                    </div>
                  </div>

                  {/* City, Pincode and Map Search Query */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        4. शहर (City)
                      </label>
                      <input
                        type="text"
                        placeholder="उदा: सीवान / लखनऊ / वाराणसी"
                        value={draftCity}
                        onChange={(e) => setDraftCity(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#d8c7ad] text-xs text-slate-800 focus:outline-none focus:border-[#d97706]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        5. पिनकोड (Pincode)
                      </label>
                      <input
                        type="text"
                        placeholder="उदा: 841226"
                        value={draftPincode}
                        onChange={(e) => setDraftPincode(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#d8c7ad] text-xs text-slate-800 focus:outline-none focus:border-[#d97706]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        6. गूगल मैप्स सर्च नाम (Map Search Query)
                      </label>
                      <input
                        type="text"
                        placeholder="उदा: Shree Shakti Durga Pandal, Siwan"
                        value={draftMapQuery}
                        onChange={(e) => setDraftMapQuery(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#d8c7ad] text-xs text-slate-800 focus:outline-none focus:border-[#d97706]"
                      />
                    </div>
                  </div>

                  {/* Live Map Preview for Admin Verification */}
                  <div className="pt-2">
                    <label className="block text-xs font-bold text-[#801313] mb-1.5 flex items-center gap-1.5">
                      <span>🗺️</span>
                      <span>गूगल मैप्स लाइव प्रीव्यू (दर्शकों को यही मैप दिखेगा)</span>
                    </label>
                    <div className="relative aspect-[16/7] w-full rounded-xl overflow-hidden border border-[#d8c7ad] bg-slate-100 shadow-inner">
                      <iframe
                        title="Admin Map Preview"
                        src={`https://maps.google.com/maps?q=${encodeURIComponent(
                          (draftMapQuery && draftMapQuery.trim()) ||
                          [draftName, draftAddress, draftLandmark, draftCity || draftLocation].filter(Boolean).join(', ')
                        )}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                        className="w-full h-full border-0"
                        loading="lazy"
                      />
                    </div>
                  </div>

                  {/* Helpline & Emergency Numbers */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#e5d8c3]">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        हेल्पलाइन नंबर (Helpline)
                      </label>
                      <input
                        type="text"
                        value={draftHelpline}
                        onChange={(e) => setDraftHelpline(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#d8c7ad] text-xs text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        आपातकालीन नंबर (Emergency Contact)
                      </label>
                      <input
                        type="text"
                        value={draftEmergencyContact}
                        onChange={(e) => setDraftEmergencyContact(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#d8c7ad] text-xs text-slate-800"
                      />
                    </div>
                  </div>

                  {/* Gate Statuses */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-[#b45309] mb-1">
                        गेट 1 स्थिति (Gate 1 Status)
                      </label>
                      <input
                        type="text"
                        value={draftGate1}
                        onChange={(e) => setDraftGate1(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#d8c7ad] text-xs text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#b45309] mb-1">
                        गेट 2 स्थिति (Gate 2 Parking)
                      </label>
                      <input
                        type="text"
                        value={draftGate2}
                        onChange={(e) => setDraftGate2(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#d8c7ad] text-xs text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#b45309] mb-1">
                        गेट 3 स्थिति (Gate 3 VIP/Senior)
                      </label>
                      <input
                        type="text"
                        value={draftGate3}
                        onChange={(e) => setDraftGate3(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#d8c7ad] text-xs text-slate-800"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#d97706] to-[#f59e0b] text-white font-bold text-sm hover:brightness-105 flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>पंडाल विवरण व थीम सुरक्षित करें (Save Details)</span>
                </button>
              </div>
            </form>
          )}

          {/* ==================================================== */}
          {/* TAB 5: VOLUNTEERS & COMMITTEE */}
          {/* ==================================================== */}
          {activeTab === 'volunteers' && (
            <div className="space-y-6">
              {/* Form Card: Add / Edit Volunteer */}
              <div className="bg-white border border-[#e5d8c3] rounded-2xl p-5 sm:p-7 shadow-sm">
                <div className="flex items-center justify-between pb-3 mb-5 border-b border-[#f0e6d6]">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">👥</span>
                    <h3 className="font-marcellus text-lg sm:text-xl font-bold text-[#801313]">
                      {editingVolunteerId
                        ? 'स्वयंसेवक विवरण संपादित करें (Edit Volunteer)'
                        : 'नया स्वयंसेवक जोड़ें (Add Volunteer)'}
                    </h3>
                  </div>
                  {editingVolunteerId && (
                    <button
                      onClick={() => {
                        setEditingVolunteerId(null);
                        setVolName('');
                        setVolRole('');
                      }}
                      className="text-xs font-semibold text-rose-600 hover:underline"
                    >
                      रद्द करें (Cancel)
                    </button>
                  )}
                </div>

                <form onSubmit={handleSaveVolunteer} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#7a1c1c] mb-1">
                        स्वयंसेवक का नाम (Name) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="उदा: Arjun Kushwaha"
                        value={volName}
                        onChange={(e) => setVolName(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#faf8f5] border border-[#d8c7ad] text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#d97706]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#7a1c1c] mb-1">
                        मुख्य सेवा दायित्व (Role) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="उदा: Web & App Developer / Queue Sewa"
                        value={volRole}
                        onChange={(e) => setVolRole(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#faf8f5] border border-[#d8c7ad] text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#d97706]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#7a1c1c] mb-1">
                        उप-दायित्व (Sub Role)
                      </label>
                      <input
                        type="text"
                        placeholder="उदा: Tech Lead & Digital Seva"
                        value={volSubRole}
                        onChange={(e) => setVolSubRole(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#faf8f5] border border-[#d8c7ad] text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#d97706]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#7a1c1c] mb-1">
                        ड्यूटी समय / शिफ्ट (Shift)
                      </label>
                      <input
                        type="text"
                        placeholder="उदा: Evening (4 PM - 11 PM)"
                        value={volShift}
                        onChange={(e) => setVolShift(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#faf8f5] border border-[#d8c7ad] text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#d97706]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#7a1c1c] mb-1">
                        स्थिति (Status)
                      </label>
                      <select
                        value={volStatus}
                        onChange={(e) => setVolStatus(e.target.value as Volunteer['status'])}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#faf8f5] border border-[#d8c7ad] text-xs sm:text-sm text-slate-800 font-semibold focus:bg-white focus:outline-none focus:border-[#d97706]"
                      >
                        <option value="Active">Active (सक्रिय सेवा)</option>
                        <option value="On Duty">On Duty (कर्तव्यरत)</option>
                        <option value="Coordination">Coordination (समन्वयक)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#7a1c1c] mb-1">
                        विशेष बैज (Badge)
                      </label>
                      <input
                        type="text"
                        placeholder="उदा: 🌟 Tech Lead / 🛡️ Security Head"
                        value={volBadge}
                        onChange={(e) => setVolBadge(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#faf8f5] border border-[#d8c7ad] text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#d97706]"
                      />
                    </div>
                  </div>

                  {/* Photo selection */}
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <button
                      type="button"
                      disabled={uploadingSection === 'volunteer'}
                      onClick={() => volFileInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-[#fdf9f3] border border-[#d8c7ad] text-xs font-bold text-[#b45309] flex items-center gap-2 hover:bg-[#faebd4] cursor-pointer disabled:opacity-60"
                    >
                      {uploadingSection === 'volunteer' ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>अपलोड हो रहा है...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span>फोटो अपलोड करें</span>
                        </>
                      )}
                    </button>
                    <input
                      ref={volFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleCloudinaryUpload(e, setVolPhoto, 'volunteer')}
                    />
                    <input
                      type="text"
                      placeholder="या फोटो लिंक दर्ज करें"
                      value={volPhoto}
                      onChange={(e) => setVolPhoto(e.target.value)}
                      className="flex-1 w-full px-3.5 py-2 rounded-xl bg-[#faf8f5] border border-[#d8c7ad] text-xs text-slate-800"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-[#d97706] to-[#f59e0b] text-white font-bold text-xs sm:text-sm hover:brightness-105 flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Save className="w-4 h-4" />
                    <span>{editingVolunteerId ? 'अपडेट सुरक्षित करें' : 'स्वयंसेवक जोड़ें'}</span>
                  </button>
                </form>
              </div>

              {/* Volunteers List */}
              <div className="space-y-3">
                <h4 className="font-marcellus text-base sm:text-lg font-bold text-[#801313] flex items-center gap-2">
                  <span>🛡️</span> सक्रिय स्वयंसेवक सूची ({pandalState.volunteers.length})
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {pandalState.volunteers.map((v) => (
                    <div
                      key={v.id}
                      className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
                        v.isArjun
                          ? 'bg-amber-50/70 border-amber-300 shadow-sm'
                          : 'bg-white border-[#e5d8c3]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={v.photo}
                          alt={v.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-[#d97706]"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80';
                          }}
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h5 className="font-bold text-sm text-slate-800">{v.name}</h5>
                            {v.isArjun && (
                              <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.2 rounded font-black">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#b45309] font-bold">{v.role}</p>
                          <p className="text-[11px] text-slate-500">{v.shift}</p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold">
                          {v.status}
                        </span>
                        {!v.isArjun && (
                          <button
                            onClick={() => handleDeleteVolunteer(v.id)}
                            className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 6: DONATION & UPI SETTINGS */}
          {/* ==================================================== */}
          {activeTab === 'donation' && (
            <form onSubmit={handleSaveDonationDetails} className="space-y-6">
              <div className="bg-white border border-[#e5d8c3] rounded-2xl p-5 sm:p-7 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-[#f0e6d6]">
                  <span className="text-xl">💰</span>
                  <h3 className="font-marcellus text-lg sm:text-xl font-bold text-[#801313]">
                    दान व UPI भुगतान प्रबंधन (Donation & UPI Settings)
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-[#7a1c1c] uppercase tracking-wider mb-1">
                        1. आधिकारिक UPI आईडी (Official UPI ID) *
                      </label>
                      <input
                        type="text"
                        required
                        value={draftUpiId}
                        onChange={(e) => setDraftUpiId(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf8f5] border border-[#d8c7ad] text-sm font-mono text-[#b45309] font-bold focus:bg-white focus:outline-none focus:border-[#d97706]"
                        placeholder="ak6412883@okhdfcbank"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        सभी UPI ऐप (GPay, PhonePe, Paytm, BHIM) इसी पते पर दान भेजेंगे।
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#7a1c1c] uppercase tracking-wider mb-1">
                        2. संस्था का नाम / Payee Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={draftPayeeName}
                        onChange={(e) => setDraftPayeeName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf8f5] border border-[#d8c7ad] text-sm text-slate-800 focus:bg-white focus:outline-none focus:border-[#d97706]"
                        placeholder="Shree Shakti Durga Puja Samiti"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#7a1c1c] uppercase tracking-wider mb-1">
                        3. सुझाए गए दान राशि प्रीसेट (Preset Amounts)
                      </label>
                      <input
                        type="text"
                        value={draftPresets}
                        onChange={(e) => setDraftPresets(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf8f5] border border-[#d8c7ad] text-sm text-slate-800 focus:bg-white focus:outline-none focus:border-[#d97706]"
                        placeholder="51, 101, 501, 1001, 2001"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        अल्पविराम (comma) से अलग करें, उदा: 51, 101, 501, 1001, 2001, 5001
                      </p>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-[#d97706] to-[#f59e0b] text-white font-bold text-sm hover:brightness-105 flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>UPI सेटिंग्स सुरक्षित करें (Save UPI Setup)</span>
                    </button>
                  </div>

                  {/* Right: Real-time QR Code Preview */}
                  <div className="bg-[#faf8f5] border border-[#e5d8c3] rounded-2xl p-5 flex flex-col items-center justify-center text-center space-y-3">
                    <span className="text-xs font-bold text-[#801313] uppercase tracking-wider">
                      लाइव UPI QR कोड पूर्वावलोकन (Live QR Preview)
                    </span>

                    <div className="p-3 bg-white rounded-xl shadow-sm border border-[#e5d8c3]">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                          `upi://pay?pa=${draftUpiId || 'ak6412883@okhdfcbank'}&pn=${encodeURIComponent(
                            draftPayeeName || 'Shree Shakti Durga Puja Samiti'
                          )}&am=501&cu=INR&tn=Durga%20Puja%20Samarpan`
                        )}`}
                        alt="UPI QR Code"
                        className="w-40 h-40 object-contain"
                      />
                    </div>

                    <div>
                      <p className="text-xs font-mono text-[#b45309] font-bold">{draftUpiId}</p>
                      <p className="text-[11px] text-slate-600">{draftPayeeName}</p>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* ==================================================== */}
          {/* TAB 7: HERO CAROUSEL BANNERS */}
          {/* ==================================================== */}
          {activeTab === 'hero' && (
            <div className="space-y-6">
              {/* Form Card: Add / Edit Hero Banner */}
              <div className="bg-white border border-[#e5d8c3] rounded-2xl p-5 sm:p-7 shadow-sm">
                <div className="flex items-center justify-between pb-3 mb-5 border-b border-[#f0e6d6]">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🎠</span>
                    <h3 className="font-marcellus text-lg sm:text-xl font-bold text-[#801313]">
                      {editingHeroId
                        ? 'मुख्य बैनर स्लाइड संपादित करें (Edit Slide)'
                        : 'नया बैनर स्लाइड जोड़ें (Add Hero Slide)'}
                    </h3>
                  </div>
                </div>

                <form onSubmit={handleSaveHeroSlide} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="block text-xs font-bold text-[#7a1c1c]">
                        बैनर इमेज (Image File or URL) *
                      </label>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          disabled={uploadingSection === 'hero'}
                          onClick={() => heroFileInputRef.current?.click()}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#d97706] to-[#f59e0b] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-60"
                        >
                          {uploadingSection === 'hero' ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>अपलोड हो रहा है...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-3.5 h-3.5" />
                              <span>फोटो अपलोड करें</span>
                            </>
                          )}
                        </button>
                        <input
                          ref={heroFileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleCloudinaryUpload(e, setHeroImage, 'hero')}
                        />
                        <span className="text-xs text-slate-500">या लिंक दर्ज करें</span>
                      </div>

                      <input
                        type="text"
                        placeholder="https://images.unsplash.com/..."
                        value={heroImage}
                        onChange={(e) => setHeroImage(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#faf8f5] border border-[#d8c7ad] text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#d97706]"
                      />

                      {heroImage && (
                        <div className="h-32 rounded-xl overflow-hidden border-2 border-[#d97706] shadow-sm">
                          <img src={heroImage} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-[#7a1c1c] mb-1">
                          टैग (Badge / Tag)
                        </label>
                        <input
                          type="text"
                          placeholder="उदा: 2026 Theme / Sacred Traditions"
                          value={heroTag}
                          onChange={(e) => setHeroTag(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-[#faf8f5] border border-[#d8c7ad] text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-none focus:border-[#d97706]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#7a1c1c] mb-1">
                          मुख्य शीर्षक (Banner Title) *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="उदा: Divine Shakti / माँ दुर्गा दर्शन"
                          value={heroTitle}
                          onChange={(e) => setHeroTitle(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-[#faf8f5] border border-[#d8c7ad] text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-none focus:border-[#d97706]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#7a1c1c] mb-1">
                          उप-शीर्षक (Subtitle)
                        </label>
                        <input
                          type="text"
                          placeholder="उदा: Experience the sacred grace of Mahishasuramardini"
                          value={heroSubtitle}
                          onChange={(e) => setHeroSubtitle(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-[#faf8f5] border border-[#d8c7ad] text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-none focus:border-[#d97706]"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#d97706] to-[#f59e0b] text-white font-bold text-xs sm:text-sm hover:brightness-105 flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <Save className="w-4 h-4" />
                        <span>बैनर स्लाइड सुरक्षित करें</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Existing Hero Slides */}
              <div className="space-y-3">
                <h4 className="font-marcellus text-base sm:text-lg font-bold text-[#801313] flex items-center gap-2">
                  <span>🎠</span> वर्तमान मुख्य स्लाइडर ({pandalState.heroImages.length})
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {pandalState.heroImages.map((s) => (
                    <div
                      key={s.id}
                      className="bg-white border border-[#e5d8c3] rounded-xl overflow-hidden shadow-xs hover:shadow-md flex flex-col justify-between"
                    >
                      <div className="relative h-40 bg-slate-100">
                        <img src={s.image} alt={s.title} className="w-full h-full object-cover" />
                        <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-white/95 border border-[#d97706] text-[10px] text-[#801313] font-bold shadow-xs">
                          {s.tag}
                        </span>
                      </div>
                      <div className="p-3.5 flex items-center justify-between">
                        <div>
                          <h5 className="font-bold text-sm text-slate-800">{s.title}</h5>
                          <p className="text-xs text-slate-600 line-clamp-1">{s.subtitle}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteHeroSlide(s.id)}
                          className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 cursor-pointer"
                          title="Delete Slide"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 8: SECURITY SETTINGS */}
          {/* ==================================================== */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              {isSuperAdmin && (
                <div className="bg-white border border-[#e5d8c3] rounded-2xl p-5 sm:p-7 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-amber-50 p-3"><Eye className="w-6 h-6 text-[#801313]" /></div>
                    <div>
                      <h3 className="font-marcellus text-lg font-bold text-[#801313]">वेबसाइट विज़िटर</h3>
                      <p className="text-xs text-slate-500">यह आँकड़ा केवल सुपर एडमिन को दिखाई देता है।</p>
                    </div>
                    <div className="ml-auto text-right">
                      <div className="text-3xl font-bold text-[#801313]">{visitorCount === null ? '—' : visitorCount.toLocaleString('en-IN')}</div>
                      <div className="text-xs text-slate-500">कुल विज़िट</div>
                    </div>
                  </div>
                  <button type="button" onClick={() => {
                    const token = getAdminSessionToken();
                    fetch('/api/admin/visitors/count', { headers: token ? { 'x-admin-token': token } : {}, cache: 'no-store' })
                      .then((r) => r.ok ? r.json() : Promise.reject())
                      .then((d) => { if (d.success && Number.isFinite(d.total)) setVisitorCount(d.total); });
                  }} className="mt-4 px-3 py-2 rounded-lg border border-amber-200 text-xs font-bold text-[#801313] hover:bg-amber-50">आँकड़ा रीफ़्रेश करें</button>
                </div>
              )}
              {/* Admin Security Password / PIN Management */}
              <div className="bg-white border border-[#e5d8c3] rounded-2xl p-5 sm:p-7 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-5 border-b border-[#f0e6d6]">
                  <div className="flex items-center gap-2">
                    <Lock className="w-5 h-5 text-[#801313]" />
                    <div>
                      <h3 className="font-marcellus text-lg sm:text-xl font-bold text-[#801313]">
                        सुरक्षा पासवर्ड व पिन प्रबंधन
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        सक्रिय खाता: <span className="font-mono font-bold text-[#801313] bg-amber-50 px-2 py-0.5 rounded border border-amber-200">{sessionUser?.username || (isSuperAdmin ? 'kushwahaarjun9970' : 'admin')}</span> {isSuperAdmin ? '👑 (मुख्य सुपर एडमिन)' : '🛡️ (समिति एडमिन)'}
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleChangeAdminPin} className="max-w-md space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#7a1c1c] mb-1">
                      वर्तमान पासवर्ड / पुराना पिन *
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="वर्तमान पासवर्ड दर्ज करें"
                      value={oldPinInput}
                      onChange={(e) => setOldPinInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf8f5] border border-[#d8c7ad] text-sm text-slate-800 focus:bg-white focus:outline-none focus:border-[#d97706]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#7a1c1c] mb-1">
                        नया पासवर्ड / पिन *
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="नया पासवर्ड"
                        value={newPinInput}
                        onChange={(e) => setNewPinInput(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf8f5] border border-[#d8c7ad] text-sm text-slate-800 focus:bg-white focus:outline-none focus:border-[#d97706]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#7a1c1c] mb-1">
                        पुष्टि करें *
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="पुष्टि करें"
                        value={confirmPinInput}
                        onChange={(e) => setConfirmPinInput(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf8f5] border border-[#d8c7ad] text-sm text-slate-800 focus:bg-white focus:outline-none focus:border-[#d97706]"
                      />
                    </div>
                  </div>

                  {pinChangeMsg && (
                    <div
                      className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                        pinChangeMsg.type === 'success'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                          : 'bg-rose-50 text-rose-800 border border-rose-300'
                      }`}
                    >
                      {pinChangeMsg.type === 'success' ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                      )}
                      <span>{pinChangeMsg.text}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#801313] to-[#a31a1a] text-white font-bold text-xs sm:text-sm hover:brightness-110 flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
                  >
                    <KeyRound className="w-4 h-4 text-amber-200" />
                    <span>पासवर्ड अपडेट करें</span>
                  </button>
                </form>
              </div>

              {/* Session Control Card */}
              <div className="bg-white border border-[#e5d8c3] rounded-2xl p-5 sm:p-7 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#d97706]" />
                    <span>सत्र नियंत्रण (Session Management)</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    कार्य पूर्ण होने पर एडमिन सत्र से लॉगआउट करें।
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-2 border border-rose-300 cursor-pointer shadow-2xs transition-all shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                  <span>सत्र लॉक करें (Log Out)</span>
                </button>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB: MULTI-SITE & COMMITTEE ADMINS MANAGEMENT (SUPER ADMIN ONLY) */}
          {/* ==================================================== */}
          {activeTab === 'sites' && isSuperAdmin && (
            <div className="space-y-6">
              {/* Header Info Banner */}
              <div className="bg-gradient-to-r from-[#3a0606] to-[#590a0a] text-white p-6 rounded-3xl shadow-lg border border-[#ffd76a]/30">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffd76a]/20 border border-[#ffd76a]/40 text-[#ffd76a] text-xs font-bold mb-2">
                      <Crown className="w-3.5 h-3.5" />
                      <span>मल्टी-वेबसाइट / पंडाल मास्टर कंट्रोल</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold font-marcellus text-[#ffd76a]">
                      एक ही डेटाबेस से अनेक वेबसाइट्स का प्रबंधन
                    </h2>
                    <p className="text-xs sm:text-sm text-amber-100/90 mt-1 max-w-2xl">
                      यहाँ से आप नई वेबसाइट्स/पंडाल जोड़ सकते हैं, प्रत्येक वेबसाइट के लिए अलग-अलग समिति एडमिन नियुक्त कर सकते हैं, तथा किसी भी वेबसाइट का डेटा लाइव एडिट कर सकते हैं।
                    </p>
                  </div>
                  <div className="flex items-center gap-3 bg-black/30 backdrop-blur-sm px-4 py-2.5 rounded-2xl border border-white/10 shrink-0">
                    <Globe className="w-5 h-5 text-[#ffd76a]" />
                    <div>
                      <div className="text-[10px] text-amber-200 uppercase tracking-wider font-bold">कुल वेबसाइट्स</div>
                      <div className="text-xl font-black text-white">{sitesList.length}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 1: All Registered Websites Cards */}
              <div className="bg-white border border-[#e5d8c3] rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-base text-[#801313] flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-[#d97706]" />
                    <span>पंजीकृत वेबसाइट्स / पंडाल ({sitesList.length})</span>
                  </h3>
                  <button
                    type="button"
                    onClick={fetchSites}
                    className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>रिफ्रेश</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sitesList.map((site) => {
                    const isSelected = activeSite === site.siteId;
                    return (
                      <div
                        key={site.siteId}
                        className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'border-[#b45309] bg-amber-50/40 shadow-md ring-2 ring-[#d97706]/40'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="font-bold text-sm text-slate-900">{site.name}</h4>
                            {isSelected ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold shrink-0">
                                सक्रिय साइट
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium shrink-0">
                                {site.siteId}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-1 mb-1">📍 {site.location || 'स्थान निर्दिष्ट नहीं'}</p>
                          {site.theme && <p className="text-xs text-amber-800 line-clamp-1 mb-2 font-serif">🎨 थीम: {site.theme}</p>}
                          {site.upiId && <p className="text-[11px] text-slate-400 font-mono">UPI: {site.upiId}</p>}
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                          {!isSelected && (
                            <button
                              type="button"
                              onClick={() => handleSwitchSite(site.siteId)}
                              className="flex-1 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-[#78350f] font-bold text-xs cursor-pointer transition-all"
                            >
                              एडिट के लिए चुनें
                            </button>
                          )}
                          <a
                            href={`/?site=${encodeURIComponent(site.siteId)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>खोलें</span>
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 2: Register New Website Form */}
              <div className="bg-white border border-[#e5d8c3] rounded-3xl p-6 shadow-sm">
                <h3 className="font-bold text-base text-[#801313] flex items-center gap-2 mb-2">
                  <Plus className="w-5 h-5 text-[#d97706]" />
                  <span>नई वेबसाइट / पंडाल जोड़ें (New Website / Pandal)</span>
                </h3>
                <p className="text-xs text-slate-500 mb-5">
                  यह इसी डेटाबेस में एक नया पंडाल इंस्टेंस तैयार करेगा। आप URL में <code className="bg-slate-100 px-1 py-0.5 rounded text-amber-900 font-bold">?site=siteId</code> लगाकर इसे अलग से लोड कर सकते हैं।
                </p>

                <form onSubmit={handleCreateSite} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      वेबसाइट ID (Slug, अंग्रेजी छोटे अक्षर) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="उदाहरण: maa-durga-siwan"
                      value={newSiteId}
                      onChange={(e) => setNewSiteId(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-'))}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#d97706]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      पंडाल / समिति का नाम *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="उदाहरण: माँ दुर्गा पूजा समिति, सीवान"
                      value={newSiteName}
                      onChange={(e) => setNewSiteName(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#d97706]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      स्थान (Location)
                    </label>
                    <input
                      type="text"
                      placeholder="उदाहरण: स्टेशन रोड, सीवान, बिहार"
                      value={newSiteLocation}
                      onChange={(e) => setNewSiteLocation(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#d97706]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      थीम (Theme)
                    </label>
                    <input
                      type="text"
                      placeholder="उदाहरण: वैदिक नारी शक्ति व शांति"
                      value={newSiteTheme}
                      onChange={(e) => setNewSiteTheme(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#d97706]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      दान UPI ID
                    </label>
                    <input
                      type="text"
                      placeholder="उदाहरण: samiti@okhdfcbank"
                      value={newSiteUpi}
                      onChange={(e) => setNewSiteUpi(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#d97706]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      हेल्पलाइन नंबर
                    </label>
                    <input
                      type="text"
                      placeholder="उदाहरण: +91 94500 00000"
                      value={newSiteHelpline}
                      onChange={(e) => setNewSiteHelpline(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#d97706]"
                    />
                  </div>

                  <div className="sm:col-span-2 mt-2">
                    <button
                      type="submit"
                      disabled={isSubmittingSite}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#801313] to-[#a31a1a] text-white font-bold text-xs sm:text-sm hover:brightness-110 flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      {isSubmittingSite ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 text-amber-200" />}
                      <span>डेटाबेस में नई वेबसाइट जोड़ें</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Section 3: Manage Admins across sites */}
              <div className="bg-white border border-[#e5d8c3] rounded-3xl p-6 shadow-sm">
                <h3 className="font-bold text-base text-[#801313] flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-[#d97706]" />
                  <span>वेबसाइट एडमिन्स प्रबंधन (Admin User Management)</span>
                </h3>
                <p className="text-xs text-slate-500 mb-5">
                  प्रत्येक वेबसाइट के लिए अलग एडमिन क्रेडेंशियल बनाएं। समिति एडमिन केवल अपनी निर्धारित वेबसाइट को ही मैनेज कर सकते हैं।
                </p>

                {/* Add Admin Subform */}
                <form onSubmit={handleCreateAdmin} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">यूज़रनेम *</label>
                    <input
                      type="text"
                      required
                      placeholder="उदा. siwan_admin"
                      value={newAdminUser}
                      onChange={(e) => setNewAdminUser(e.target.value.toLowerCase().trim())}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">पासवर्ड *</label>
                    <input
                      type="text"
                      required
                      placeholder="गुप्त पासवर्ड दर्ज करें"
                      value={newAdminPass}
                      onChange={(e) => setNewAdminPass(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">नाम (Display Name) *</label>
                    <input
                      type="text"
                      required
                      placeholder="उदा. राहुल सिंह (सचिव)"
                      value={newAdminName}
                      onChange={(e) => setNewAdminName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">वेबसाइट असाइन करें *</label>
                    <select
                      value={newAdminSiteId}
                      onChange={(e) => setNewAdminSiteId(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                    >
                      {sitesList.map((s) => (
                        <option key={s.siteId} value={s.siteId}>
                          {s.name} ({s.siteId})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">भूमिका (Role)</label>
                    <select
                      value={newAdminRole}
                      onChange={(e) => setNewAdminRole(e.target.value as any)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                    >
                      <option value="admin">समिति एडमिन (Single Site)</option>
                      <option value="super_admin">सुपर एडमिन (All Sites)</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={isSubmittingAdmin}
                      className="w-full py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingAdmin ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>नया एडमिन बनाएं</span>
                    </button>
                  </div>
                </form>

                {/* Admins Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">यूज़रनेम</th>
                        <th className="p-2.5">नाम</th>
                        <th className="p-2.5">भूमिका</th>
                        <th className="p-2.5">निर्धारित वेबसाइट</th>
                        <th className="p-2.5 text-right">कार्रवाई</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {adminsList.map((adm) => (
                        <tr key={adm.username} className="hover:bg-slate-50">
                          <td className="p-2.5 font-mono font-bold text-slate-800">{adm.username}</td>
                          <td className="p-2.5 text-slate-700">{adm.displayName}</td>
                          <td className="p-2.5">
                            {adm.role === 'super_admin' ? (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px]">
                                👑 सुपर एडमिन
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 font-semibold text-[10px]">
                                🛡️ समिति एडमिन
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 font-mono text-slate-600">{adm.siteId === '*' ? 'सभी वेबसाइट्स (*)' : adm.siteId}</td>
                          <td className="p-2.5 text-right">
                            {adm.username !== 'kushwahaarjun9970' ? (
                              <button
                                type="button"
                                onClick={() => handleDeleteAdmin(adm.username)}
                                className="px-2.5 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold text-[11px] cursor-pointer"
                              >
                                हटाएं
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-italic">सुरक्षित खाता</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* BOTTOM ACTION BAR (WHITE & CLEAN) */}
      <footer className="w-full bg-white border-t border-[#e5d8c3] px-4 sm:px-8 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>सभी परिवर्तन तुरंत लाइव वेबपेज पर दिखाई देंगे।</span>
        </div>

        <button
          onClick={() => {
            playTempleBell();
            onClose();
          }}
          className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#d97706] to-[#f59e0b] text-white font-bold text-xs sm:text-sm hover:brightness-105 flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>पूर्ण हुआ • लाइव पंडाल पर लौटें</span>
        </button>
      </footer>
    </div>
  );
};
