import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  eventServiceAdapter as eventService,
  resultServiceAdapter as resultService
} from '../services/serviceAdapter';
import http from '../services/http-common';
import { API_ROUTES } from '../services/apiRoutes';
import UserInfoHeader from '../components/UserInfoHeader';
import StudentFeedbackDisplay from '../components/StudentFeedbackDisplay';
import feedbackService from '../services/feedbackService';
import authManager from '../utils/authManager';
import { GENDER_OPTIONS, getGenderLabel, normalizeGenderValue } from '../constants/gender';
import { COORDINATOR_HELP_TEXT, extractApiErrorMessage, mapGenderRuleErrorToUi } from '../utils/genderEligibility';
import { GENDER_CATEGORY_OPTIONS } from '../utils/groupParticipants';

// Static data for Live Results Carousel
const staticResultsForCarousel = [
  {
    event: "Bharatanatyam Solo",
    winner: "Ananya Nair",
    school: "Pioneer Public School",
    district: "Thrissur"
  },
  {
    event: "Kathakali Group Performance",
    winner: "Krishnanunni Pillai",
    school: "Saraswati Vidyalaya",
    district: "Ernakulam"
  },
  {
    event: "Mappila Songs",
    winner: "Fathima Beevi",
    school: "Al-Ameen Public School",
    district: "Malappuram"
  },
  {
    event: "Chakyar Koothu",
    winner: "Raman Nair",
    school: "Kairali School",
    district: "Thrissur"
  },
  {
    event: "Kathak Solo",
    winner: "Priya Menon",
    school: "Little Flower School",
    district: "Kottayam"
  },
  {
    event: "Duffmuttu",
    winner: "Suresh Kumar",
    school: "St. Mary's School",
    district: "Alappuzha"
  },
  {
    event: "Ottan Thullal",
    winner: "Arun Mohan",
    school: "Gandhi Memorial School",
    district: "Kollam"
  },
  {
    event: "Light Music Solo",
    winner: "Sneha Nair",
    school: "Sacred Heart School",
    district: "Idukki"
  }
];

// Transform real results data to match the format expected by the Live Results Carousel component
const transformResultsForCarousel = (results) => {
  if (!results || !Array.isArray(results)) return [];

  return results.map(result => {
    // Extract data from the real results structure
    const eventName = result.event_details?.name || result.event_name || 'Event';
    const winnerName = result.participant_details?.first_name
      ? `${result.participant_details.first_name} ${result.participant_details.last_name || ''}`.trim()
      : result.participant_name || 'Winner';
    const schoolName = result.participant_details?.school?.name || 'School';
    const districtName = result.participant_details?.school?.district?.name || result.participant_details?.district?.name || 'District';

    return {
      event: eventName,
      winner: winnerName,
      school: schoolName,
      district: districtName
    };
  }).filter(result => result.event && result.winner && result.school && result.district);
};

// Event Registration Data - Updated with comprehensive categories and events
const CATEGORIES = [
  { key: 'dance', label: 'Dance / Folk / Traditional Arts', icon: '💃', color: 'from-pink-500 to-rose-500' },
  { key: 'visual_arts', label: 'Visual Arts', icon: '🎨', color: 'from-purple-500 to-violet-500' },
  { key: 'literary', label: 'Literary / Verbal Arts', icon: '📚', color: 'from-green-500 to-emerald-500' },
  { key: 'music', label: 'Music Arts', icon: '🎵', color: 'from-blue-500 to-indigo-500' },
  { key: 'theatre', label: 'Theatre / Performance Arts', icon: '🎭', color: 'from-orange-500 to-amber-500' }
];

// Unused - kept for reference
// const EVENTS_BY_CATEGORY = {
//   dance: [
//     'Aravana Muttu', 'Bharatanatyam', 'Chakyar Koothu', 'Duffmuttu', 'Folk Dance (Solo & Group)',
//     'Irula Dance', 'Kathakali (Single / Group)', 'Kerala Natanam', 'Kolkali', 'Koodiyattam',
//     'Kuchipudi', 'Malapulayattam', 'Mangalamkali', 'Margamkali', 'Mohiniyattam', 'Nangiar Koothu',
//     'Oppana', 'Paliya Dance', 'Paniya Dance', 'Parichamuttukali', 'Poorakkali', 'Thiruvathirakkali',
//     'Vattappattu', 'Nadodi Nritham', 'Thiruvathira'
//   ],
//   visual_arts: [
//     'Cartoon', 'Collage', 'Painting – Oil Colour', 'Painting – Pencil', 'Painting – Water Colour'
//   ],
//   literary: [
//     'Caption Writing', 'Dictionary Making', 'Essay Writing (Malayalam / English / Hindi / Sanskrit / Urdu / Arabic)',
//     'Poetry Writing', 'Prasnothari', 'Samasyapooranam', 'Story Writing', 'Translation', 'Aksharaslokam',
//     'Ashtapadi', 'Chambuprabhashanam', 'Kadhaprasangam', 'Kavyakeli', 'Lecture', 'Mushaira', 'Pathakam',
//     'Poetry Recitation', 'Speech', 'Quiz', 'Quran Recitation'
//   ],
//   music: [
//     'Chenda / Thayambaka', 'Clarinet / Bugle', 'Band', 'Flute', 'Guitar (Western)', 'Instrumental Music',
//     'Madhalam', 'Mridangam / Kanjira / Ghadam', 'Nadaswaram', 'Panchavadyam', 'Tabla', 'Triple / Jazz (Western)',
//     'Veena / Vichitra Veena', 'Violin (Eastern / Western / Oriental)', 'Arabic Music', 'Classical Music',
//     'Folk Music', 'Ghazal', 'Group Song – Urdu', 'Kathakali Music', 'Light Music', 'Mappila Songs',
//     'Patriotic Song', 'Vanchippattu'
//   ],
//   theatre: [
//     'Chavittu Nadakam', 'Drama', 'Mime', 'Mimicry', 'Mono Act', 'Ottan Thullal', 'Skit (English)', 'Yakshagana'
//   ]
// };

// Demo schedule generation for Dance + Music events with random times and venues
const DEMO_VENUES = ['Main Stage', 'Auditorium A', 'Auditorium B', 'Hall 1', 'Hall 2', 'Open Grounds'];

function buildDemoSchedule(events) {
  // Get event names from dance and music categories
  const danceEvents = events.filter(e => e.category === 'dance').map(e => e.name);
  const musicEvents = events.filter(e => e.category === 'music').map(e => e.name);
  const demoScheduleEventNames = [...danceEvents, ...musicEvents];

  // Generate one slot per event name, at random time today/tomorrow between 9:00–17:30
  const now = new Date();
  return demoScheduleEventNames.map((name, idx) => {
    const dayOffset = Math.floor(Math.random() * 2); // 0: today, 1: tomorrow
    const hour = 9 + Math.floor(Math.random() * 9); // 9..17
    const minute = Math.random() < 0.5 ? 0 : 30; // 00 or 30
    const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, hour, minute);
    const options = { month: 'short', day: 'numeric' };
    const datePart = dt.toLocaleDateString(undefined, options);
    const timePart = dt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return {
      id: `demo-${idx}`,
      event_details: {
        name,
        date: `${datePart} • ${timePart}`,
        venue_details: { name: DEMO_VENUES[Math.floor(Math.random() * DEMO_VENUES.length)] }
      }
    };
  });
}

// Utility: pick N distinct random indices from [0..len)
const pickDistinct = (len, n) => {
  if (len === 0) return [];
  const set = new Set();
  while (set.size < Math.min(n, len)) {
    set.add(Math.floor(Math.random() * len));
  }
  return Array.from(set);
};

const normalizeIdList = (value) => {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => (typeof item === 'object' ? item?.id : item))
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item > 0)
    )
  );
};

const getAllowedEventIds = (payload) => {
  if (Array.isArray(payload)) {
    return normalizeIdList(payload);
  }
  const candidates = [
    normalizeIdList(payload?.event_ids),
    normalizeIdList(payload?.allowed_event_ids),
    normalizeIdList(payload?.allowed_events)
  ];
  return candidates.find((candidate) => candidate.length > 0) || [];
};

const getGroupEntryEventIds = (entry) => {
  return normalizeIdList(
    entry?.event_ids ||
    entry?.events ||
    entry?.events_display
  );
};

const getGroupEntryEventsDisplay = (entry) => {
  if (Array.isArray(entry?.events_display)) {
    return entry.events_display
      .map((item) => (typeof item === 'string' ? item : item?.name || item?.event_name || ''))
      .filter(Boolean);
  }
  if (Array.isArray(entry?.events)) {
    return entry.events
      .map((item) => (typeof item === 'string' ? item : item?.name || item?.event_name || ''))
      .filter(Boolean);
  }
  return [];
};

const getAllowedGroupEntries = (payload) => {
  const candidates = [
    payload?.group_entries,
    payload?.approved_group_entries,
    payload?.groups,
    payload?.approved_groups,
    payload?.group_participants,
    payload?.group_registrations
  ];

  const list = candidates.find((candidate) => Array.isArray(candidate)) || [];
  return list
    .map((entry, index) => {
      const participants = Array.isArray(entry?.participants) ? entry.participants : [];
      const leaderIndex = Number(entry?.leader_index);
      const leaderFromIndex = Number.isInteger(leaderIndex) && leaderIndex > 0 && leaderIndex <= participants.length
        ? participants[leaderIndex - 1]
        : null;
      const leaderFullName = entry?.leader_full_name ||
        `${leaderFromIndex?.first_name || ''} ${leaderFromIndex?.last_name || ''}`.trim();

      return {
        id: entry?.id ?? entry?.group_entry_id ?? `${entry?.group_id || 'GROUP'}-${index}`,
        group_id: String(entry?.group_id || '').trim().toUpperCase(),
        group_class: entry?.group_class || '',
        gender_category: entry?.gender_category || '',
        participant_count: Number(entry?.participant_count || participants.length || 0) || 0,
        leader_index: leaderIndex || null,
        leader_full_name: leaderFullName || '-',
        participants,
        event_ids: getGroupEntryEventIds(entry),
        events_display: getGroupEntryEventsDisplay(entry),
        status: String(entry?.status || '').toLowerCase(),
        source: entry?.source || '',
        review_notes: entry?.review_notes || ''
      };
    })
    .filter((entry) => entry.group_id);
};

const parseAllowedEventsPayload = (payload) => {
  const eventIds = getAllowedEventIds(payload);
  const groupEntries = getAllowedGroupEntries(payload || {});
  if (eventIds.length > 0) {
    return { eventIds, groupEntries };
  }
  const groupEventIds = Array.from(new Set(groupEntries.flatMap((entry) => entry.event_ids || [])));
  return { eventIds: groupEventIds, groupEntries };
};

const toErrorList = (value) => {
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  if (value === null || value === undefined || value === '') return [];
  return [String(value)];
};

const createGroupProfileFieldErrors = () => ({
  non_field_errors: [],
  gender_category: [],
  notes: [],
  participants_non_field: [],
  participants: {}
});

const hasGroupProfileFieldErrors = (errors) => {
  if (!errors) return false;
  if (
    (Array.isArray(errors.non_field_errors) && errors.non_field_errors.length > 0) ||
    (Array.isArray(errors.gender_category) && errors.gender_category.length > 0) ||
    (Array.isArray(errors.participants_non_field) && errors.participants_non_field.length > 0)
  ) {
    return true;
  }
  return Object.values(errors.participants || {}).some((item) => (
    (Array.isArray(item?.first_name) && item.first_name.length > 0) ||
    (Array.isArray(item?.last_name) && item.last_name.length > 0) ||
    (Array.isArray(item?.gender) && item.gender.length > 0) ||
    (Array.isArray(item?.student_class) && item.student_class.length > 0) ||
    (Array.isArray(item?.phone) && item.phone.length > 0) ||
    (Array.isArray(item?.non_field_errors) && item.non_field_errors.length > 0)
  ));
};

const normalizeParticipantGenderValue = (value) => {
  const normalized = normalizeGenderValue(value);
  if (normalized) return normalized;
  return String(value || '').trim().toUpperCase();
};

const normalizeGroupProfileParticipants = (value) => {
  if (!Array.isArray(value)) return [];
  return value.map((participant, index) => {
    const participantId = participant?.id ?? participant?.participant_id ?? null;
    const memberOrderCandidate = Number(participant?.member_order ?? participant?.memberOrder ?? index + 1);
    const memberOrder = Number.isInteger(memberOrderCandidate) && memberOrderCandidate > 0
      ? memberOrderCandidate
      : index + 1;
    return {
      id: participantId,
      member_order: memberOrder,
      first_name: String(participant?.first_name || '').trim(),
      last_name: String(participant?.last_name || '').trim(),
      gender: normalizeParticipantGenderValue(participant?.gender),
      student_class: String(participant?.student_class ?? participant?.studentClass ?? '').trim(),
      phone: String(participant?.phone || '').trim()
    };
  });
};

const buildGroupProfileParticipantsPayload = (value) => {
  return normalizeGroupProfileParticipants(value).map((participant, index) => {
    const payload = {
      first_name: String(participant?.first_name || '').trim(),
      last_name: String(participant?.last_name || '').trim(),
      gender: normalizeParticipantGenderValue(participant?.gender),
      student_class: String(participant?.student_class || '').trim(),
      phone: String(participant?.phone || '').trim()
    };
    const participantId = participant?.id;
    if (participantId !== null && participantId !== undefined && participantId !== '') {
      payload.id = participantId;
    } else {
      const fallbackOrder = Number(participant?.member_order ?? index + 1);
      payload.member_order = Number.isInteger(fallbackOrder) && fallbackOrder > 0 ? fallbackOrder : (index + 1);
    }
    return payload;
  });
};

const parseParticipantFieldErrors = (participantErrors) => {
  const rows = {};
  const nonField = [];
  if (!participantErrors) return { rows, nonField };

  const consumeRowError = (rowIndex, item) => {
    if (!item || typeof item !== 'object') return;
    const rowErrors = {
      first_name: toErrorList(item?.first_name),
      last_name: toErrorList(item?.last_name),
      gender: toErrorList(item?.gender),
      student_class: toErrorList(item?.student_class),
      phone: toErrorList(item?.phone),
      non_field_errors: toErrorList(item?.non_field_errors)
    };
    if (
      rowErrors.first_name.length ||
      rowErrors.last_name.length ||
      rowErrors.gender.length ||
      rowErrors.student_class.length ||
      rowErrors.phone.length ||
      rowErrors.non_field_errors.length
    ) {
      rows[rowIndex] = rowErrors;
    }
  };

  if (Array.isArray(participantErrors)) {
    participantErrors.forEach((item, index) => {
      if (!item) return;
      if (typeof item === 'string') {
        nonField.push(item);
        return;
      }
      if (Array.isArray(item)) {
        nonField.push(...toErrorList(item));
        return;
      }
      consumeRowError(index, item);
    });
    return { rows, nonField };
  }

  if (typeof participantErrors === 'object') {
    Object.entries(participantErrors).forEach(([key, item]) => {
      const rowIndex = Number(key);
      if (!Number.isInteger(rowIndex) || rowIndex < 0) {
        nonField.push(...toErrorList(item));
        return;
      }
      if (typeof item === 'string') {
        nonField.push(item);
        return;
      }
      if (Array.isArray(item)) {
        nonField.push(...toErrorList(item));
        return;
      }
      consumeRowError(rowIndex, item);
    });
  } else {
    nonField.push(...toErrorList(participantErrors));
  }
  return { rows, nonField };
};

const parseGroupProfileErrors = (payload) => {
  const errors = createGroupProfileFieldErrors();
  if (!payload) return errors;
  if (typeof payload === 'string') {
    errors.non_field_errors = [payload];
    return errors;
  }

  errors.non_field_errors.push(...toErrorList(payload?.non_field_errors));
  errors.non_field_errors.push(...toErrorList(payload?.detail));
  errors.non_field_errors.push(...toErrorList(payload?.error));
  errors.gender_category = toErrorList(payload?.gender_category);
  errors.notes = toErrorList(payload?.notes);

  const participantParse = parseParticipantFieldErrors(payload?.participants);
  errors.participants = participantParse.rows;
  errors.participants_non_field = participantParse.nonField;

  return errors;
};

// Create a QR image Data URL using a public QR service, then draw to canvas (so we get a stable data URL)
async function generateQRCodeDataUrl(text, size = 256) {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  return new Promise((resolve, reject) => {
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, size, size);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = src;
  });
}

// Enhanced PDF generation with professional design - Single page optimized
function downloadRegistrationPDF({ studentName, categoryLabel, eventName, chessNumber, qrDataUrl }) {
  const w = window.open('', '_blank', 'noopener,noreferrer');
  if (!w) return;

  const currentDate = new Date().toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>E-Kalolsavam Registration Card - ${studentName}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Dancing+Script:wght@400;600&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { 
        font-family: 'Inter', sans-serif; 
        background: white;
        padding: 0;
        margin: 0;
        height: 100vh;
        overflow: hidden;
      }
      .container {
        width: 100%;
        height: 100vh;
        background: #ffffff;
        display: flex;
        flex-direction: column;
        border: 3px solid #f59e0b;
      }
      .header {
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        color: white;
        padding: 20px;
        text-align: center;
        position: relative;
        flex-shrink: 0;
      }
      .header::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="50" cy="50" r="1" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
        opacity: 0.3;
      }
      .header-content {
        position: relative;
        z-index: 1;
      }
      .title {
        font-family: 'Cinzel', serif;
        font-size: 28px;
        font-weight: 700;
        margin-bottom: 5px;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
      }
      .subtitle {
        font-family: 'Dancing Script', cursive;
        font-size: 16px;
        opacity: 0.9;
        margin-bottom: 10px;
      }
      .badge {
        display: inline-block;
        background: rgba(255,255,255,0.2);
        padding: 6px 12px;
        border-radius: 15px;
        font-size: 12px;
        font-weight: 600;
        backdrop-filter: blur(10px);
      }
      .content {
        padding: 30px;
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .main-row {
        display: flex;
        align-items: center;
        gap: 30px;
        width: 100%;
        max-width: 800px;
      }
      .qr-section {
        flex-shrink: 0;
      }
      .qr-code {
        width: 180px;
        height: 180px;
        border: 4px solid #f59e0b;
        border-radius: 16px;
        padding: 10px;
        background: white;
        box-shadow: 0 8px 25px rgba(0,0,0,0.1);
      }
      .qr-code img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
      .details {
        flex: 1;
      }
      .student-name {
        font-family: 'Cinzel', serif;
        font-size: 24px;
        font-weight: 700;
        color: #1f2937;
        margin-bottom: 15px;
        border-bottom: 3px solid #f59e0b;
        padding-bottom: 8px;
      }
      .detail-item {
        display: flex;
        align-items: center;
        margin-bottom: 12px;
        padding: 8px 0;
        border-bottom: 1px solid #f3f4f6;
      }
      .detail-icon {
        width: 20px;
        height: 20px;
        margin-right: 10px;
        color: #f59e0b;
        flex-shrink: 0;
      }
      .detail-label {
        font-weight: 600;
        color: #6b7280;
        min-width: 80px;
        font-size: 13px;
      }
      .detail-value {
        font-weight: 700;
        color: #1f2937;
        font-size: 15px;
      }
      .chess-number {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        padding: 6px 12px;
        border-radius: 6px;
        font-family: 'Courier New', monospace;
        font-weight: 700;
        font-size: 16px;
        letter-spacing: 1px;
        display: inline-block;
      }
      .footer {
        background: #f9fafb;
        padding: 15px 30px;
        border-top: 2px solid #f3f4f6;
        text-align: center;
        color: #6b7280;
        font-size: 12px;
        flex-shrink: 0;
      }
      .footer-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .scan-instruction {
        font-weight: 600;
        color: #f59e0b;
      }
      .date {
        font-size: 11px;
        color: #9ca3af;
      }
      @media print {
        body { 
          background: white; 
          padding: 0; 
          margin: 0;
          height: 100vh;
          overflow: hidden;
        }
        .container { 
          box-shadow: none; 
          border: 2px solid #f59e0b; 
          height: 100vh;
        }
        * {
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
      }
      @page { 
        size: A4 portrait; 
        margin: 0;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="header-content">
          <h1 class="title">E-Kalolsavam</h1>
          <p class="subtitle">Kerala Arts & Culture Festival</p>
          <div class="badge">Official Registration Card</div>
        </div>
      </div>
      
      <div class="content">
        <div class="main-row">
          <div class="qr-section">
            <div class="qr-code">
              <img src="${qrDataUrl}" alt="QR Code" />
            </div>
          </div>
          
          <div class="details">
            <div class="student-name">${studentName || 'Student Name'}</div>
            
            <div class="detail-item">
              <svg class="detail-icon" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span class="detail-label">Category:</span>
              <span class="detail-value">${categoryLabel || 'N/A'}</span>
            </div>
            
            <div class="detail-item">
              <svg class="detail-icon" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm8-2a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1V7a1 1 0 00-1-1h-2z" clip-rule="evenodd"/>
              </svg>
              <span class="detail-label">Event:</span>
              <span class="detail-value">${eventName || 'N/A'}</span>
            </div>
            
            <div class="detail-item">
              <svg class="detail-icon" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
              </svg>
              <span class="detail-label">Chess No:</span>
              <span class="detail-value">
                <span class="chess-number">${chessNumber || 'N/A'}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="footer">
        <div class="footer-content">
          <div class="scan-instruction">📱 Scan QR code at venue check-in</div>
          <div class="date">Generated: ${currentDate}</div>
        </div>
      </div>
    </div>
    
    <script>
      window.onload = function() { 
        setTimeout(function() { 
          window.print(); 
        }, 1500); 
      };
    </script>
  </body>
</html>`;

  w.document.write(html);
  w.document.close();
}

// Live Results Carousel Component (3 cards: left, middle (highlighted), right)
// Behavior: Every 3s, a new random card appears on the left, left->middle, middle->right, right disappears.
const LiveResultsCarousel = ({ results = [] }) => {
  const safeResults = Array.isArray(results) ? results : [];
  const [triplet, setTriplet] = useState(() => {
    const idx = pickDistinct(safeResults.length, 3);
    if (idx.length < 3 && safeResults.length > 0) {
      while (idx.length < 3) idx.push(idx[idx.length - 1] ?? 0);
    }
    return idx;
  });

  useEffect(() => {
    const idx = pickDistinct(safeResults.length, 3);
    if (idx.length < 3 && safeResults.length > 0) {
      while (idx.length < 3) idx.push(idx[idx.length - 1] ?? 0);
    }
    setTriplet(idx);
  }, [safeResults.length]);

  useEffect(() => {
    if (!safeResults.length) return;
    const interval = setInterval(() => {
      setTriplet((prev) => {
        if (!safeResults.length) return prev;
        if (safeResults.length <= 3) {
          const [l] = prev;
          const nextLeft = (l + 1) % safeResults.length;
          return [nextLeft, prev[0], prev[1]];
        }
        const exclude = new Set(prev);
        let newLeft = Math.floor(Math.random() * safeResults.length);
        let guard = 0;
        while (exclude.has(newLeft) && guard < 50) {
          newLeft = Math.floor(Math.random() * safeResults.length);
          guard++;
        }
        return [newLeft, prev[0], prev[1]];
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [safeResults.length]);

  if (!safeResults.length) return <p className="text-amber-700">No recent results yet.</p>;

  const visible = triplet
    .map((i) => (Number.isInteger(i) ? safeResults[i] : undefined))
    .filter(Boolean);

  return (
    <div className="relative py-4">
      <div className="flex justify-center items-center gap-6">
        {visible.map((result, idx) => {
          const isMiddle = idx === 1;
          return (
            <div
              key={`${result?.event ?? 'event'}-${result?.winner ?? 'winner'}-${idx}`}
              className={`transition-all duration-700 ease-out rounded-2xl p-5 w-[22rem] h-44 flex flex-col justify-center text-center border relative overflow-hidden
                ${isMiddle
                  ? 'scale-110 bg-gradient-to-br from-yellow-200 to-amber-300 shadow-2xl border-amber-500 ring-4 ring-amber-300/70'
                  : 'scale-95 bg-white shadow-lg border-amber-200'}
              `}
            >
              {isMiddle && (
                <div aria-hidden className="pointer-events-none absolute inset-0" style={{
                  background: 'radial-gradient( circle at 50% 50%, rgba(251, 191, 36, 0.35), rgba(251, 191, 36, 0.18) 45%, rgba(245, 158, 11, 0.08) 70%, transparent 80% )',
                  filter: 'blur(6px)'
                }} />
              )}
              <h4 className={`font-bold ${isMiddle ? 'text-amber-900 text-lg' : 'text-amber-800 text-base'} mb-1`} style={{ fontFamily: 'Cinzel, serif' }}>
                {result?.event}
              </h4>
              <p className={`font-semibold ${isMiddle ? 'text-amber-800' : 'text-amber-700'} mb-0.5`}>
                Winner: {result?.winner}
              </p>
              <p className={`text-sm ${isMiddle ? 'text-amber-700' : 'text-amber-600'} mb-0.5`}>
                School: {result?.school}
              </p>
              <p className={`text-sm ${isMiddle ? 'text-amber-700' : 'text-amber-600'}`}>
                District: {result?.district}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const TopRightFloatingMenu = ({ onOpen }) => {
  const iconData = [
    {
      key: 'profile',
      label: 'Edit Profile',
      description: 'Update your profile details and gender information',
      icon: 'M12 2A5 5 0 0 1 17 7A5 5 0 0 1 12 12A5 5 0 0 1 7 7A5 5 0 0 1 12 2M12 14.2C16 14.2 19.2 16 19.2 18.2V20H4.8V18.2C4.8 16 8 14.2 12 14.2M20.7 7.04C20.95 6.79 21.34 6.78 21.6 7.04L22.96 8.4C23.22 8.66 23.21 9.05 22.96 9.3L20.08 12.18L17.82 9.92L20.7 7.04M17.11 10.63L19.37 12.89L12.64 19.62H10.38V17.36L17.11 10.63Z',
      gradient: 'from-cyan-400 via-blue-500 to-indigo-600',
      shadowColor: 'shadow-cyan-500/25',
      accentColor: 'cyan'
    },
    {
      key: 'register',
      label: 'Event Registration',
      description: 'Join exciting cultural events and showcase your talents',
      icon: 'M12 2C13.1 2 14 2.9 14 4V5H17C18.1 5 19 5.9 19 7V19C19 20.1 18.1 21 17 21H7C5.9 21 5 20.1 5 19V7C5 5.9 5.9 5 7 5H10V4C10 2.9 10.9 2 12 2ZM12 4V6H12V4ZM7 7V19H17V7H7ZM9 9H15V11H9V9ZM9 13H15V15H9V13Z',
      gradient: 'from-emerald-400 via-teal-500 to-cyan-600',
      shadowColor: 'shadow-emerald-500/25',
      accentColor: 'emerald'
    },
    {
      key: 'qr',
      label: 'Digital ID Card',
      description: 'Access your personalized student identification',
      icon: 'M3 3H11V11H3V3ZM5 5V9H9V5H5ZM13 3H21V11H13V3ZM15 5V9H19V5H15ZM3 13H11V21H3V13ZM5 15V19H9V15H5ZM13 13H15V15H13V13ZM16 13H18V15H16V13ZM19 13H21V15H19V13ZM13 16H15V18H13V16ZM16 16H18V18H16V16ZM19 16H21V18H19V16ZM13 19H15V21H13V19ZM16 19H18V21H16V19ZM19 19H21V21H19V19Z',
      gradient: 'from-blue-400 via-indigo-500 to-purple-600',
      shadowColor: 'shadow-blue-500/25',
      accentColor: 'blue'
    },
    {
      key: 'scores',
      label: 'My Scores & Feedback',
      description: 'View your scores and feedback from judges',
      icon: 'M9 11.75A.75.75 0 019.75 11h4.5a.75.75 0 010 1.5h-4.5a.75.75 0 01-.75-.75zM9.75 14a.75.75 0 000 1.5h2.5a.75.75 0 000-1.5h-2.5z M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zM8.5 9.5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm3.5 6.5c-2.5 0-4.5-1-4.5-2.5s2-2.5 4.5-2.5 4.5 1 4.5 2.5-2 2.5-4.5 2.5z',
      gradient: 'from-pink-400 via-rose-500 to-red-600',
      shadowColor: 'shadow-pink-500/25',
      accentColor: 'pink'
    },
    {
      key: 'feedback',
      label: 'Share Feedback',
      description: 'Help us improve your experience with valuable insights',
      icon: 'M20 2H4C2.9 2 2 2.9 2 4V16C2 17.1 2.9 18 4 18H6L10 22L14 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H13.17L10 19.17L6.83 16H4V4H20V16ZM7 9H17V11H7V9ZM7 12H15V14H7V12Z',
      gradient: 'from-purple-400 via-violet-500 to-indigo-600',
      shadowColor: 'shadow-purple-500/25',
      accentColor: 'purple'
    },
    {
      key: 'results',
      label: 'Live Results',
      description: 'Track your performance and celebrate achievements',
      icon: 'M16 6L18.29 8.29L13.41 13.17L9.41 9.17L2 16.59L3.41 18L9.41 12L13.41 16L20.71 8.71L23 11V5H17L16 6ZM7 14H9V20H7V14ZM11 10H13V20H11V10ZM15 16H17V20H15V16Z',
      gradient: 'from-orange-400 via-red-500 to-pink-600',
      shadowColor: 'shadow-orange-500/25',
      accentColor: 'orange'
    },
    {
      key: 'schedule',
      label: 'Event Schedule',
      description: 'Stay updated with all event timings and venues',
      icon: 'M19 3H18V1H16V3H8V1H6V3H5C3.89 3 3.01 3.9 3.01 5L3 19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V8H19V19ZM7 10H12V15H7V10ZM14 12H17V14H14V12Z',
      gradient: 'from-amber-400 via-yellow-500 to-orange-600',
      shadowColor: 'shadow-amber-500/25',
      accentColor: 'amber'
    }
  ];

  const btn = (iconInfo, index) => (
    <div
      key={iconInfo.key}
      className="group relative"
      style={{ animationDelay: `${index * 0.12}s` }}
    >
      {/* Enhanced tooltip with better positioning and readability */}
      <div className="absolute right-full top-1/2 transform -translate-y-1/2 mr-4 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out group-hover:translate-x-0 translate-x-2 z-50 pointer-events-none">
        <div className="bg-white/95 backdrop-blur-xl text-gray-800 px-5 py-4 rounded-2xl shadow-2xl border border-gray-200/50 min-w-max max-w-xs">
          <div className="font-bold text-base mb-2 text-gray-900" style={{ fontFamily: 'Cinzel, serif' }}>
            {iconInfo.label}
          </div>
          <div className="text-sm text-gray-600 leading-relaxed font-medium">
            {iconInfo.description}
          </div>
          {/* Elegant arrow */}
          <div className="absolute left-full top-1/2 transform -translate-y-1/2 -ml-1">
            <div className="w-3 h-3 bg-white/95 rotate-45 border-r border-b border-gray-200/50"></div>
          </div>
        </div>
      </div>

      <button
        onClick={() => onOpen(iconInfo.key)}
        aria-label={iconInfo.label}
        className={`group relative w-20 h-20 rounded-3xl bg-gradient-to-br ${iconInfo.gradient} ${iconInfo.shadowColor} shadow-xl hover:shadow-2xl flex items-center justify-center transition-all duration-700 ease-out hover:scale-105 hover:-translate-y-3 overflow-hidden transform-gpu backdrop-blur-sm`}
        style={{
          filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.15))',
        }}
      >
        {/* Sophisticated background layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"></div>

        {/* Elegant floating elements */}
        <div className="absolute top-3 right-3 w-2 h-2 bg-white/70 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 delay-100 group-hover:animate-pulse"></div>
        <div className="absolute bottom-4 left-4 w-1.5 h-1.5 bg-white/50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-700 delay-200 group-hover:animate-bounce"></div>
        <div className="absolute top-1/3 left-3 w-1 h-1 bg-white/40 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-600 delay-300 group-hover:animate-ping"></div>

        {/* Premium icon with refined animations */}
        <div className="relative z-10 transform group-hover:scale-110 transition-all duration-500 ease-out group-hover:rotate-6">
          <svg
            className="w-9 h-9 text-white filter drop-shadow-lg"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d={iconInfo.icon} />
          </svg>
        </div>

        {/* Sophisticated click feedback */}
        <div className="absolute inset-0 bg-white/30 rounded-3xl opacity-0 group-active:opacity-100 transition-opacity duration-150 group-active:animate-pulse"></div>

        {/* Elegant border with glow effect */}
        <div className="absolute inset-0 rounded-3xl border-2 border-white/30 group-hover:border-white/50 transition-all duration-500"></div>

        {/* Subtle inner glow */}
        <div className="absolute inset-1 rounded-3xl border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

        {/* Premium shine effect */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
      </button>
    </div>
  );

  return (
    <div className="fixed top-1/3 right-10 z-40 flex flex-col gap-5 animate-fade-in-right transform -translate-y-1/2">
      {iconData.map((iconInfo, index) => btn(iconInfo, index))}
    </div>
  );
};

const Modal = ({ open, title, onClose, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl border border-amber-200">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-amber-50">
          <h3 className="text-xl font-semibold text-amber-800" style={{ fontFamily: 'Cinzel, serif' }}>{title}</h3>
          <button onClick={onClose} className="text-amber-700 hover:text-amber-900 text-xl">✕</button>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

const StudentDashboard = () => {
  const { t } = useTranslation();
  const PUBLISHED_EVENTS_INITIAL_VISIBLE = 6;
  const [open, setOpen] = useState(null); // 'register' | 'qr' | 'feedback' | 'results' | 'schedule'
  const [registrations, setRegistrations] = useState([]); // server-side list (unchanged usage)
  const [publishedResults, setPublishedResults] = useState([]);
  const transformedResults = useMemo(() => transformResultsForCarousel(publishedResults), [publishedResults]);
  const [loading, setLoading] = useState(true);
  const [demoSchedule, setDemoSchedule] = useState([]); // locally generated schedule for Dance + Music
  const [events, setEvents] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const [allowedEventIds, setAllowedEventIds] = useState(null); // null=loading, []=none
  const [allowedGroupEntries, setAllowedGroupEntries] = useState([]);

  const [mustResetPasswordOpen, setMustResetPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordResetError, setPasswordResetError] = useState('');
  const [passwordResetLoading, setPasswordResetLoading] = useState(false);

  // Events are already filtered to published events from the API
  const publishedEvents = useMemo(() => events || [], [events]);

  // Local registration state for the new flow
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const [registrationError, setRegistrationError] = useState('');
  const [registrationHelpText, setRegistrationHelpText] = useState('');
  const [registrationCta, setRegistrationCta] = useState(null);
  const [coordinatorRequestCopied, setCoordinatorRequestCopied] = useState(false);
  const [latestRegistration, setLatestRegistration] = useState(null); // { studentName, categoryLabel, eventName, chessNumber, qrDataUrl }
  const [isIdentityVerified, setIsIdentityVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false); // Loading state for registration
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [showAllEvents, setShowAllEvents] = useState(false); // Toggle for showing all events
  const [showAllPublishedEvents, setShowAllPublishedEvents] = useState(false);
  const [selectedRegistrationIndex, setSelectedRegistrationIndex] = useState(0); // Index of selected registration
  const [allRegistrationsWithQR, setAllRegistrationsWithQR] = useState([]); // All registrations with QR codes
  const [isGeneratingQR, setIsGeneratingQR] = useState(false); // Loading state for QR generation
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    gender: ''
  });
  const [profileError, setProfileError] = useState('');
  const [profileFieldErrors, setProfileFieldErrors] = useState({});
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileReturnTarget, setProfileReturnTarget] = useState(null);
  const [groupProfileLoadingId, setGroupProfileLoadingId] = useState('');
  const [groupProfileForm, setGroupProfileForm] = useState({
    groupEntryId: '',
    group_id: '',
    group_class: '',
    gender_category: '',
    notes: '',
    participants: []
  });
  const [groupProfileError, setGroupProfileError] = useState('');
  const [groupProfileFieldErrors, setGroupProfileFieldErrors] = useState(createGroupProfileFieldErrors());
  const [groupProfileSaving, setGroupProfileSaving] = useState(false);
  const [groupProfileReturnTarget, setGroupProfileReturnTarget] = useState(null);

  const hasMorePublishedEvents = publishedEvents.length > PUBLISHED_EVENTS_INITIAL_VISIBLE;
  const visiblePublishedEvents = useMemo(
    () => (showAllPublishedEvents ? publishedEvents : publishedEvents.slice(0, PUBLISHED_EVENTS_INITIAL_VISIBLE)),
    [publishedEvents, showAllPublishedEvents, PUBLISHED_EVENTS_INITIAL_VISIBLE]
  );

  // Feedback state
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackCategory, setFeedbackCategory] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const [showFeedbackPopup, setShowFeedbackPopup] = useState(false);
  const [feedbackPopupMessage, setFeedbackPopupMessage] = useState('');
  const [feedbackPopupType, setFeedbackPopupType] = useState('success'); // 'success' | 'positive' | 'negative'

  const currentRegistration = useMemo(() => {
    if (allRegistrationsWithQR && allRegistrationsWithQR.length > 0) {
      const idx = Math.max(0, Math.min(selectedRegistrationIndex, allRegistrationsWithQR.length - 1));
      return allRegistrationsWithQR[idx];
    }
    return null;
  }, [allRegistrationsWithQR, selectedRegistrationIndex]);

  useEffect(() => {
    if (!hasMorePublishedEvents && showAllPublishedEvents) {
      setShowAllPublishedEvents(false);
    }
  }, [hasMorePublishedEvents, showAllPublishedEvents]);

  const clearRegistrationFeedback = () => {
    setRegistrationError('');
    setRegistrationHelpText('');
    setRegistrationCta(null);
    setCoordinatorRequestCopied(false);
  };

  const setRegistrationFailure = (message) => {
    setRegistrationError(message);
    setRegistrationHelpText('');
    setRegistrationCta(null);
    setCoordinatorRequestCopied(false);
  };

  const showMappedRegistrationError = (error) => {
    const mapped = mapGenderRuleErrorToUi(error);
    if (!mapped) return false;
    setRegistrationError(mapped.message);
    setRegistrationHelpText(mapped.helperText || '');
    setRegistrationCta(mapped.cta || null);
    setCoordinatorRequestCopied(false);
    return true;
  };

  const openProfileEditor = (returnTarget = null) => {
    setProfileError('');
    setProfileFieldErrors({});
    setProfileReturnTarget(returnTarget);
    setOpen('profile');
  };

  const closeProfileEditor = () => {
    setProfileError('');
    setProfileFieldErrors({});
    const nextTarget = profileReturnTarget;
    setProfileReturnTarget(null);
    setOpen(nextTarget || null);
  };

  const closeGroupProfileEditor = () => {
    setGroupProfileError('');
    setGroupProfileFieldErrors(createGroupProfileFieldErrors());
    setGroupProfileLoadingId('');
    setGroupProfileSaving(false);
    setGroupProfileForm({
      groupEntryId: '',
      group_id: '',
      group_class: '',
      gender_category: '',
      notes: '',
      participants: []
    });
    const nextTarget = groupProfileReturnTarget;
    setGroupProfileReturnTarget(null);
    setOpen(nextTarget || null);
  };

  const handleCoordinatorCta = async () => {
    setCoordinatorRequestCopied(false);
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(COORDINATOR_HELP_TEXT);
        setCoordinatorRequestCopied(true);
      }
    } catch (_) {
      setCoordinatorRequestCopied(false);
    }
  };

  const handleOpen = async (key) => {
    if (key === 'profile') {
      setProfileReturnTarget(null);
      setProfileError('');
      setProfileFieldErrors({});
    }
    if (key === 'groupProfile') {
      return;
    }
    setOpen(key);
    if (key === 'qr') {
      if ((!allRegistrationsWithQR || allRegistrationsWithQR.length === 0) && registrations && registrations.length > 0) {
        setIsGeneratingQR(true);
        try {
          const mapped = await Promise.all((registrations || []).map(async (reg) => {
            const eventName = reg?.event_details?.name || reg?.event_name || 'Event';
            const categoryKey = reg?.event_details?.category;
            const categoryLabel = availableCategories.find(c => c.key === categoryKey)?.label || categoryKey || 'N/A';
            const chessNumber = reg?.chess_number || reg?.chessNumber || 'N/A';
            const studentName = `${currentUser?.first_name || ''} ${currentUser?.last_name || ''}`.trim() || 'Student';
            const qrText = `${studentName} | ${eventName} | ${chessNumber}`;
            const qrDataUrl = await generateQRCodeDataUrl(qrText);
            return { studentName, categoryLabel, eventName, chessNumber, qrDataUrl };
          }));
          setAllRegistrationsWithQR(mapped.filter(Boolean));
          setSelectedRegistrationIndex(0);
        } catch (e) {
          setAllRegistrationsWithQR([]);
        } finally {
          setIsGeneratingQR(false);
        }
      }
    }
  };

  const handleClose = () => {
    setOpen(null);
    clearRegistrationFeedback();
    setFeedbackError('');
  };

  const handleFirstNameChange = (e) => {
    const raw = String(e?.target?.value || '');
    const v = raw.toUpperCase();
    setFirstName(v);
    setIsIdentityVerified(false);
    clearRegistrationFeedback();
    if (!v) {
      setFirstNameError('');
      return;
    }
    if (v.includes(' ')) {
      setFirstNameError('Invalid Format: First name cannot contain spaces.');
      return;
    }
    if (!/^[A-Z]+$/.test(v)) {
      setFirstNameError('Invalid Character: First name must be uppercase letters only.');
      return;
    }
    setFirstNameError('');
  };

  const handleLastNameChange = (e) => {
    const raw = String(e?.target?.value || '');
    const v = raw.toUpperCase();
    setLastName(v);
    setIsIdentityVerified(false);
    clearRegistrationFeedback();
    if (!v) {
      setLastNameError('');
      return;
    }
    if (v.includes(' ')) {
      setLastNameError('Invalid Format: Last name cannot contain spaces.');
      return;
    }
    if (!/^[A-Z]+$/.test(v)) {
      setLastNameError('Invalid Character: Last name must be uppercase letters only.');
      return;
    }
    setLastNameError('');
  };

  const handleIdentityVerification = async () => {
    clearRegistrationFeedback();
    if (!firstName || !lastName || firstNameError || lastNameError) return;
    setIsVerifying(true);
    try {
      const a = `${currentUser?.first_name || ''}`.toUpperCase();
      const b = `${currentUser?.last_name || ''}`.toUpperCase();
      if (a && b && (a !== firstName || b !== lastName)) {
        setIsIdentityVerified(false);
        setRegistrationFailure(`Name Mismatch: The provided name '${firstName} ${lastName}' does not match your registered name '${currentUser?.first_name || ''} ${currentUser?.last_name || ''}'. Please use your exact registered name.`);
      } else {
        setIsIdentityVerified(true);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRegister = async () => {
    clearRegistrationFeedback();
    if (!isIdentityVerified) {
      setRegistrationFailure('Please verify your identity before registering.');
      return;
    }
    if (!normalizeGenderValue(currentUser?.gender)) {
      showMappedRegistrationError({ response: { data: { error: 'Your gender is not set on your profile.' } } });
      return;
    }
    if (!selectedCategory || !selectedEvent) {
      setRegistrationFailure('Please select a category and event.');
      return;
    }

    const eventId = selectedEventObj?.id;
    if (!eventId) {
      setRegistrationFailure('Selected event not found. Please refresh and try again.');
      return;
    }

    if (allowedEventIdSet && !allowedEventIdSet.has(eventId)) {
      setRegistrationFailure('No events available. Your school has not selected this event.');
      return;
    }

    if (requiresSelectedGroup && !selectedGroupId) {
      setRegistrationFailure('This is a group event. Please select your approved group ID before registering.');
      return;
    }
    if (selectedGroupId && !selectedGroupEntry) {
      setRegistrationFailure('Selected group ID is not approved for this event. Please choose a valid group entry.');
      return;
    }

    setIsRegistering(true);
    try {
      const reg = await eventService.registerForEvent(
        eventId,
        firstName,
        lastName,
        requiresSelectedGroup ? selectedGroupId : ''
      );
      const freshRegs = await eventService.listMyRegistrations();
      setRegistrations(Array.isArray(freshRegs) ? freshRegs : []);

      const eventName = reg?.event_details?.name || selectedEventObj?.name || selectedEvent;
      const categoryLabel = availableCategories.find(c => c.key === selectedCategory)?.label || selectedCategory;
      const chessNumber = reg?.chess_number || reg?.chessNumber || reg?.chessNumber || 'N/A';
      const studentName = `${currentUser?.first_name || ''} ${currentUser?.last_name || ''}`.trim() || `${firstName} ${lastName}`.trim();
      const qrText = `${studentName} | ${eventName} | ${chessNumber}`;
      const qrDataUrl = await generateQRCodeDataUrl(qrText);
      const card = { studentName, categoryLabel, eventName, chessNumber, qrDataUrl };
      setLatestRegistration(card);
      setAllRegistrationsWithQR((prev) => {
        const base = Array.isArray(prev) ? prev : [];
        return [card, ...base];
      });
      setSelectedRegistrationIndex(0);
      setSelectedCategory('');
      setSelectedEvent('');
      setSelectedGroupId('');
    } catch (e) {
      if (!showMappedRegistrationError(e)) {
        const msg = extractApiErrorMessage(e) || 'Failed to register.';
        setRegistrationFailure(msg);
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const handleSubmitFeedback = async () => {
    setFeedbackError('');
    if (!feedbackRating || feedbackRating < 1 || feedbackRating > 5) {
      setFeedbackError('Please select a rating.');
      return;
    }
    if (!feedbackCategory) {
      setFeedbackError('Please select a category.');
      return;
    }
    if (!feedbackText || !String(feedbackText).trim()) {
      setFeedbackError('Please enter your feedback.');
      return;
    }
    setFeedbackSubmitting(true);
    try {
      await feedbackService.submitFeedback({
        feedback_type: 'system',
        subject: 'Student Feedback',
        message: String(feedbackText || ''),
        category: feedbackCategory,
        rating: feedbackRating,
        contact_email: feedbackEmail || null,
      });
      const popupType = feedbackRating >= 4 ? 'positive' : (feedbackRating <= 2 ? 'negative' : 'success');
      setFeedbackPopupType(popupType);
      setFeedbackPopupMessage('Thank you for your feedback!');
      setShowFeedbackPopup(true);
      setTimeout(() => setShowFeedbackPopup(false), 4000);
      setFeedbackText('');
      setFeedbackCategory('');
      setFeedbackRating(0);
      setFeedbackEmail('');
      setOpen(null);
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.response?.data?.error || 'Failed to submit feedback.';
      setFeedbackError(msg);
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const allowedPublishedEvents = useMemo(() => {
    if (!Array.isArray(events) || !Array.isArray(allowedEventIds)) return [];
    const idSet = new Set(allowedEventIds);
    return events.filter((event) => idSet.has(event.id));
  }, [events, allowedEventIds]);

  // Group student-eligible events by category
  const eventsByCategory = useMemo(() => {
    const grouped = {};
    allowedPublishedEvents.forEach(event => {
      if (!grouped[event.category]) {
        grouped[event.category] = [];
      }
      grouped[event.category].push(event.name);
    });
    return grouped;
  }, [allowedPublishedEvents]);

  // Get available categories from API data with enhanced mapping
  const availableCategories = useMemo(() => {
    const categoryMap = {
      'dance': 'Dance / Folk / Traditional Arts',
      'music': 'Music Arts',
      'literary': 'Literary / Verbal Arts',
      'visual_arts': 'Visual Arts',
      'theatre': 'Theatre / Performance Arts'
    };

    // Show only categories that have student-eligible events
    const allCategories = ['dance', 'music', 'literary', 'visual_arts', 'theatre'];

    return allCategories.map(key => ({
      key,
      label: categoryMap[key] || key,
      icon: CATEGORIES.find(c => c.key === key)?.icon || '🎯',
      color: CATEGORIES.find(c => c.key === key)?.color || 'from-gray-500 to-gray-600',
      eventCount: eventsByCategory[key]?.length || 0,
      hasPublishedEvents: (allowedPublishedEvents || []).some(event => event.category === key)
    })).filter((category) => category.eventCount > 0);
  }, [eventsByCategory, allowedPublishedEvents]);

  // Fetch read-only data for student (robust to partial failures)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        console.log('StudentDashboard: Starting API calls...');

        // Make API calls with individual error handling
        const apiCalls = [
          { name: 'registrations', fn: () => eventService.listMyRegistrations(), fallback: [] },
          { name: 'results', fn: () => resultService.list({}), fallback: [] },
          { name: 'events', fn: () => eventService.listPublishedEvents(), fallback: [] },
          { name: 'user', fn: () => http.get('/api/auth/current/'), fallback: null }
        ];

        const results = await Promise.allSettled(apiCalls.map(call => call.fn()));

        if (!mounted) return;

        // Process results with fallbacks
        const [regsRes, resultsRes, evtsRes, userRes] = results;

        const regs = regsRes?.status === 'fulfilled' ? regsRes.value : [];
        const published = resultsRes?.status === 'fulfilled' ? resultsRes.value : [];
        const evts = evtsRes?.status === 'fulfilled' ? evtsRes.value : [];
        const userData = userRes?.status === 'fulfilled' ? userRes.value?.data : null;

        console.log('StudentDashboard: API results:', {
          registrations: regs?.length || 0,
          results: published?.length || 0,
          events: evts?.length || 0,
          user: userData ? 'loaded' : 'failed'
        });

        // Set data with fallbacks
        if (userData) {
          setCurrentUser(userData);
        } else {
          console.warn('Failed to load user data, using fallback');
          // Don't redirect - let the user stay on the page
        }

        setRegistrations(regs || []);
        setPublishedResults(published || []);

        // Use only published events from the API - no demo data
        const eventsData = Array.isArray(evts) ? evts : [];
        console.log('Loaded published events from API:', eventsData.length, 'events');

        setEvents(eventsData);
        setDemoSchedule(buildDemoSchedule(eventsData));

        // Fetch allowed events for this student (school-selected)
        try {
          const allowedRes = await http.get('/api/auth/students/allowed-events/');
          const parsedAllowedData = parseAllowedEventsPayload(allowedRes?.data || {});
          setAllowedEventIds(Array.isArray(parsedAllowedData.eventIds) ? parsedAllowedData.eventIds : []);
          setAllowedGroupEntries(Array.isArray(parsedAllowedData.groupEntries) ? parsedAllowedData.groupEntries : []);
        } catch (e) {
          setAllowedEventIds([]);
          setAllowedGroupEntries([]);
        }

      } catch (error) {
        console.error('StudentDashboard: Error loading data:', error);
        // Don't redirect on error - let the user stay on the page with fallback data
        if (mounted) {
          setRegistrations([]);
          setPublishedResults([]);
          setEvents([]);
          setDemoSchedule([]);
          setAllowedEventIds([]);
          setAllowedGroupEntries([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const allowedEventIdSet = useMemo(() => {
    if (!Array.isArray(allowedEventIds)) return null;
    return new Set(allowedEventIds);
  }, [allowedEventIds]);

  const filteredCategoryEvents = useMemo(() => {
    if (!selectedCategory) return [];
    if (allowedEventIdSet === null) return [];
    return (allowedPublishedEvents || []).filter(event => event?.category === selectedCategory);
  }, [selectedCategory, allowedEventIdSet, allowedPublishedEvents]);

  const selectedEventObj = useMemo(() => {
    if (!selectedCategory || !selectedEvent) return null;
    return (filteredCategoryEvents || []).find((event) => event?.name === selectedEvent) ||
      (events || []).find((event) => event?.name === selectedEvent && event?.category === selectedCategory) ||
      (events || []).find((event) => event?.name === selectedEvent) ||
      null;
  }, [selectedCategory, selectedEvent, filteredCategoryEvents, events]);

  const selectedEventParticipationType = useMemo(() => {
    return String(
      selectedEventObj?.event_definition_details?.participation_type_details?.type_name ||
      selectedEventObj?.event_definition_details?.participation_type ||
      selectedEventObj?.participation_type ||
      ''
    ).toUpperCase();
  }, [selectedEventObj]);

  const isSelectedEventLikelyGroup = useMemo(() => {
    if (!selectedEventObj) return false;
    return selectedEventParticipationType === 'GROUP';
  }, [selectedEventObj, selectedEventParticipationType]);

  const selectedEventGroupEntries = useMemo(() => {
    if (!selectedEventObj || !Array.isArray(allowedGroupEntries)) return [];

    const directMatches = allowedGroupEntries.filter((entry) => {
      const eventIds = Array.isArray(entry?.event_ids) ? entry.event_ids : [];
      return eventIds.includes(selectedEventObj.id);
    });
    if (directMatches.length > 0) return directMatches;

    if (isSelectedEventLikelyGroup) {
      return allowedGroupEntries.filter((entry) => !Array.isArray(entry?.event_ids) || entry.event_ids.length === 0);
    }
    return [];
  }, [selectedEventObj, allowedGroupEntries, isSelectedEventLikelyGroup]);

  const selectedGroupEntry = useMemo(() => {
    if (!selectedGroupId) return null;
    return (selectedEventGroupEntries || []).find((entry) => entry?.group_id === selectedGroupId) || null;
  }, [selectedEventGroupEntries, selectedGroupId]);

  const requiresSelectedGroup = useMemo(() => {
    return isSelectedEventLikelyGroup || selectedEventGroupEntries.length > 0;
  }, [isSelectedEventLikelyGroup, selectedEventGroupEntries]);

  const eventNameById = useMemo(() => {
    const map = {};
    (events || []).forEach((event) => {
      if (event?.id !== null && event?.id !== undefined) {
        map[String(event.id)] = event.name;
      }
    });
    return map;
  }, [events]);

  useEffect(() => {
    if (!selectedCategory) return;
    const isStillAvailable = availableCategories.some((category) => category.key === selectedCategory);
    if (!isStillAvailable) {
      setSelectedCategory('');
      setSelectedEvent('');
      setSelectedGroupId('');
    }
  }, [availableCategories, selectedCategory]);

  useEffect(() => {
    if (!selectedGroupId) return;
    const stillAvailable = selectedEventGroupEntries.some((entry) => entry?.group_id === selectedGroupId);
    if (!stillAvailable) {
      setSelectedGroupId('');
    }
  }, [selectedGroupId, selectedEventGroupEntries]);

  useEffect(() => {
    setSelectedGroupId('');
  }, [selectedCategory, selectedEvent]);

  useEffect(() => {
    if (currentUser && currentUser.role === 'student' && currentUser.must_reset_password) {
      setMustResetPasswordOpen(true);
    } else {
      setMustResetPasswordOpen(false);
    }
  }, [currentUser]);

  useEffect(() => {
    setProfileForm({
      first_name: currentUser?.first_name || '',
      last_name: currentUser?.last_name || '',
      phone: currentUser?.phone || '',
      gender: normalizeGenderValue(currentUser?.gender)
    });
  }, [currentUser]);

  const submitPasswordReset = async (e) => {
    e.preventDefault();
    setPasswordResetError('');

    if (!newPassword || newPassword.length < 8) {
      setPasswordResetError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordResetError('Passwords do not match');
      return;
    }

    setPasswordResetLoading(true);
    try {
      const res = await http.post('/api/auth/password/set-new/', { new_password: newPassword });
      const access = res.data?.access;
      const refresh = res.data?.refresh;

      if (access && refresh) {
        authManager.setTokens(access, refresh);
      }

      const userRes = await http.get('/api/auth/current/');
      setCurrentUser(userRes.data);
      setNewPassword('');
      setConfirmPassword('');
      setMustResetPasswordOpen(false);
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to update password';
      setPasswordResetError(msg);
    } finally {
      setPasswordResetLoading(false);
    }
  };

  const submitProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileFieldErrors({});

    const firstNameValue = String(profileForm.first_name || '').trim();
    const lastNameValue = String(profileForm.last_name || '').trim();
    const phoneValue = String(profileForm.phone || '').trim();
    const normalizedGender = normalizeGenderValue(profileForm.gender);

    if (!firstNameValue || !lastNameValue) {
      setProfileError('First name and last name are required.');
      return;
    }
    if (!normalizedGender) {
      setProfileError('Please select your gender.');
      return;
    }
    const payload = {
      first_name: firstNameValue,
      last_name: lastNameValue,
      phone: phoneValue,
      gender: normalizedGender
    };

    setProfileSaving(true);
    try {
      await http.patch('/api/auth/profile/', payload);

      try {
        const userRes = await http.get('/api/auth/current/');
        setCurrentUser(userRes.data);
      } catch (_) {
        setCurrentUser((prev) => ({ ...(prev || {}), ...payload }));
      }

      clearRegistrationFeedback();
      const nextTarget = profileReturnTarget;
      setProfileReturnTarget(null);
      setOpen(nextTarget || null);
    } catch (err) {
      const statusCode = Number(err?.response?.status || 0);
      const errorPayload = err?.response?.data;
      if (statusCode === 400 && errorPayload && typeof errorPayload === 'object' && !Array.isArray(errorPayload)) {
        setProfileFieldErrors(errorPayload);
        const fallbackMessage = extractApiErrorMessage(err) || 'Please correct the highlighted fields.';
        setProfileError(fallbackMessage);
      } else if (statusCode === 403) {
        setProfileError('Your role is not allowed to update this profile.');
      } else {
        setProfileError(extractApiErrorMessage(err) || 'Failed to update profile.');
      }
    } finally {
      setProfileSaving(false);
    }
  };

  const openGroupProfileEditor = async (groupEntryId, returnTarget = null) => {
    const normalizedId = String(groupEntryId || '').trim();
    if (!normalizedId) return;

    setGroupProfileReturnTarget(returnTarget);
    setGroupProfileError('');
    setGroupProfileFieldErrors(createGroupProfileFieldErrors());
    setGroupProfileLoadingId(normalizedId);
    setOpen('groupProfile');
    try {
      const response = await http.get(API_ROUTES.students.groupProfile(normalizedId));
      const data = response?.data || {};
      const fallbackEntry = allowedGroupEntries.find((entry) => String(entry?.id) === normalizedId || String(entry?.group_entry_id) === normalizedId);
      const participants = normalizeGroupProfileParticipants(data?.participants);
      setGroupProfileForm({
        groupEntryId: normalizedId,
        group_id: String(data?.group_id || fallbackEntry?.group_id || '').trim().toUpperCase(),
        group_class: String(data?.group_class || fallbackEntry?.group_class || '').trim(),
        gender_category: String(data?.gender_category || fallbackEntry?.gender_category || '').trim().toUpperCase(),
        notes: String(data?.notes || data?.review_notes || fallbackEntry?.review_notes || '').trim(),
        participants
      });
    } catch (err) {
      const statusCode = Number(err?.response?.status || 0);
      if (statusCode === 403) {
        setGroupProfileError('Your role is not allowed to edit this group profile.');
      } else if (statusCode === 404) {
        setGroupProfileError('This group profile was not found or is not owned by your account.');
      } else {
        setGroupProfileError(extractApiErrorMessage(err) || 'Failed to load group profile.');
      }
    } finally {
      setGroupProfileLoadingId('');
    }
  };

  const updateGroupProfileParticipantField = (index, field, value) => {
    setGroupProfileForm((prev) => {
      const nextParticipants = Array.isArray(prev.participants) ? [...prev.participants] : [];
      const current = nextParticipants[index] || { first_name: '', last_name: '' };
      nextParticipants[index] = { ...current, [field]: value };
      return { ...prev, participants: nextParticipants };
    });
    setGroupProfileFieldErrors((prev) => {
      if (!prev?.participants?.[index]?.[field]?.length) return prev;
      const nextParticipants = { ...(prev.participants || {}) };
      const row = { ...(nextParticipants[index] || {}) };
      row[field] = [];
      nextParticipants[index] = row;
      return { ...prev, participants: nextParticipants };
    });
  };

  const submitGroupProfileUpdate = async (event) => {
    event.preventDefault();
    setGroupProfileError('');
    setGroupProfileFieldErrors(createGroupProfileFieldErrors());

    const groupEntryId = String(groupProfileForm.groupEntryId || '').trim();
    const genderCategory = String(groupProfileForm.gender_category || '').trim().toUpperCase();
    const participants = buildGroupProfileParticipantsPayload(groupProfileForm.participants);
    const notes = String(groupProfileForm.notes || '').trim();

    if (!groupEntryId) {
      setGroupProfileError('Unable to update this group profile. Please reopen and try again.');
      return;
    }
    if (!GENDER_CATEGORY_OPTIONS.includes(genderCategory)) {
      setGroupProfileError('Please choose a valid gender category.');
      return;
    }
    if (!participants.length) {
      setGroupProfileError('At least one participant is required.');
      return;
    }

    setGroupProfileSaving(true);
    try {
      await http.patch(API_ROUTES.students.groupProfile(groupEntryId), {
        gender_category: genderCategory,
        ...(notes ? { notes } : {}),
        participants
      });

      setAllowedGroupEntries((prev) => {
        const list = Array.isArray(prev) ? prev : [];
        return list.map((entry) => {
          const entryId = String(entry?.id ?? entry?.group_entry_id ?? '');
          if (entryId !== groupEntryId) return entry;
          const participantCount = participants.length;
          const leaderIndex = Number(entry?.leader_index);
          const leaderParticipant = Number.isInteger(leaderIndex) && leaderIndex > 0 && leaderIndex <= participantCount
            ? participants[leaderIndex - 1]
            : null;
          const leaderFullName = leaderParticipant
            ? `${leaderParticipant.first_name || ''} ${leaderParticipant.last_name || ''}`.trim()
            : entry?.leader_full_name || '-';
          return {
            ...entry,
            gender_category: genderCategory,
            review_notes: notes || entry?.review_notes || '',
            participants: normalizeGroupProfileParticipants(participants),
            participant_count: participantCount,
            leader_full_name: leaderFullName || '-'
          };
        });
      });

      closeGroupProfileEditor();
    } catch (err) {
      const statusCode = Number(err?.response?.status || 0);
      const payload = err?.response?.data;
      if (statusCode === 400) {
        const parsedErrors = parseGroupProfileErrors(payload);
        if (hasGroupProfileFieldErrors(parsedErrors)) {
          setGroupProfileFieldErrors(parsedErrors);
          setGroupProfileError('Please correct the highlighted fields.');
        } else {
          setGroupProfileError(extractApiErrorMessage(err) || 'Validation failed.');
        }
      } else if (statusCode === 403) {
        setGroupProfileError('Your role is not allowed to edit this group profile.');
      } else if (statusCode === 404) {
        setGroupProfileError('This group profile was not found or is not owned by your account.');
      } else {
        setGroupProfileError(extractApiErrorMessage(err) || 'Failed to update group profile.');
      }
    } finally {
      setGroupProfileSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 relative" style={{
      backgroundImage: `linear-gradient(to right, rgba(251, 191, 36, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(251, 191, 36, 0.08) 1px, transparent 1px)`,
      backgroundSize: '60px 60px'
    }}>
      {mustResetPasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-amber-200">
            <div className="px-6 py-4 border-b bg-amber-50">
              <h3 className="text-xl font-semibold text-amber-800" style={{ fontFamily: 'Cinzel, serif' }}>
                Create a New Password
              </h3>
              <p className="text-sm text-amber-700 mt-1">
                You must change your temporary password before continuing.
              </p>
            </div>
            <form onSubmit={submitPasswordReset} className="p-6 space-y-4">
              {passwordResetError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {passwordResetError}
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={passwordResetLoading}
                className="w-full px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-700 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {passwordResetLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* User Info Header */}
      <UserInfoHeader
        user={currentUser}
        title="Student Dashboard"
        subtitle="Manage registrations, view events, and track results"
      />

      {/* Header - Keeping original design elements below UserInfoHeader */}
      <div className="relative bg-white/90 backdrop-blur-sm border-b-2 border-amber-200 shadow-sm mb-10 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center">
          <div className="flex items-center justify-center gap-4 mb-2">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" className="text-amber-600 animate-pulse" style={{ animationDuration: '3s' }}>
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <h1 className="text-4xl font-bold text-amber-800 hover:text-amber-900 transition-colors duration-300" style={{ fontFamily: 'Cinzel, serif' }}>Student Dashboard</h1>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" className="text-amber-600 animate-pulse" style={{ animationDuration: '3s', animationDelay: '1.5s' }}>
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
          <p className="text-lg text-orange-700 italic" style={{ fontFamily: 'Dancing Script, cursive' }}>
            Welcome to E-Kalolsavam • Manage your cultural journey
          </p>
          <div className="mt-2 text-sm text-amber-600">
            Celebrating Kerala Arts & Culture
          </div>
        </div>
      </div>

      {/* Floating Icon Menu (Right Center) */}
      <TopRightFloatingMenu onOpen={handleOpen} />

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 bg-white/20 backdrop-blur-xs rounded-3xl shadow-2xl border border-amber-200/30 mx-4 my-4">
        {/* Live Results Ticker */}
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-xl p-6 border-2 border-amber-200/50 mb-4 relative overflow-visible">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg animate-pulse" />
            <h3 className="text-xl font-bold text-amber-800">{t('live_results') || 'Live Results'}</h3>
          </div>
          <LiveResultsCarousel results={(transformedResults && transformedResults.length) ? transformedResults : staticResultsForCarousel} />
        </div>

        {/* Ultra-Detailed Professional Kathakali Mask */}
        <div className="w-full flex justify-center -mt-2 mb-6">
          <div className="group cursor-pointer" role="img" aria-label="Ultra-detailed authentic Kathakali mask with professional traditional makeup, intricate ornaments, and sophisticated animations">
            <svg width="600" height="350" viewBox="0 0 600 350" className="opacity-95 transition-all duration-500 group-hover:scale-105" aria-hidden="true">
              <defs>
                <filter id="kathakaliGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="10" result="g1" />
                  <feGaussianBlur stdDeviation="20" in="g1" result="g2" />
                  <feGaussianBlur stdDeviation="30" in="g2" result="g3" />
                  <feMerge>
                    <feMergeNode in="g3" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="goldGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="6" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <radialGradient id="faceGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fef3c7" />
                  <stop offset="20%" stopColor="#fbbf24" />
                  <stop offset="40%" stopColor="#f59e0b" />
                  <stop offset="80%" stopColor="#d97706" />
                  <stop offset="100%" stopColor="#92400e" />
                </radialGradient>
                <radialGradient id="eyeGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="30%" stopColor="#fef3c7" />
                  <stop offset="70%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#92400e" />
                </radialGradient>
                <linearGradient id="goldGrad" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="30%" stopColor="#f59e0b" />
                  <stop offset="70%" stopColor="#d97706" />
                  <stop offset="100%" stopColor="#92400e" />
                </linearGradient>
                <linearGradient id="beardGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#d97706" />
                  <stop offset="30%" stopColor="#92400e" />
                  <stop offset="100%" stopColor="#78350f" />
                </linearGradient>
                <linearGradient id="crownGrad" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stopColor="#fef3c7" />
                  <stop offset="50%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
                <style>
                  {`
                    .eye-lid {
                      animation: blink 10s infinite ease-in-out;
                      transform-origin: center;
                    }
                    .group:hover .eye-lid {
                      animation: blink-hover 5s infinite ease-in-out;
                    }
                    .crown-sparkle {
                      animation: sparkle 3s infinite ease-in-out;
                    }
                    @keyframes blink {
                      0%, 98%, 100% { transform: scaleY(1); opacity: 1; }
                      98.5%, 99.5% { transform: scaleY(0.12); opacity: 0.5; }
                    }
                    @keyframes blink-hover {
                      0%, 95%, 100% { transform: scaleY(1); opacity: 1; }
                      96%, 99% { transform: scaleY(0.12); opacity: 0.5; }
                    }
                    @keyframes sparkle {
                      0%, 100% { opacity: 1; }
                      50% { opacity: 0.6; }
                    }
                  `}
                </style>
              </defs>

              {/* Enhanced Chutti - Multi-layered crescent frame */}
              <g filter="url(#kathakaliGlow)">
                <path d="M110 85 Q300 35 490 85 Q520 135 490 175 Q300 225 110 175 Q80 135 110 85" fill="url(#goldGrad)" stroke="#92400e" strokeWidth="4" />
                <path d="M130 95 Q300 50 470 95 Q500 145 470 165 Q300 210 130 165 Q100 145 130 95" fill="#d97706" stroke="#92400e" strokeWidth="3" />
                <path d="M150 105 Q300 65 450 105 Q475 150 450 155 Q300 195 150 155 Q125 150 150 105" fill="url(#goldGrad)" stroke="#92400e" strokeWidth="2" />

                {/* Chutti decorative borders */}
                <path d="M110 85 Q300 35 490 85" fill="none" stroke="#fbbf24" strokeWidth="2" />
                <path d="M110 175 Q300 225 490 175" fill="none" stroke="#fbbf24" strokeWidth="2" />
              </g>

              {/* Ultra-Detailed Kireetam - Ornate headgear */}
              <g filter="url(#kathakaliGlow)">
                <path d="M160 25 Q300 5 440 25 Q465 55 440 75 Q300 105 160 75 Q135 55 160 25" fill="url(#crownGrad)" stroke="#92400e" strokeWidth="3" />
                <ellipse cx="300" cy="20" rx="90" ry="18" fill="#92400e" />
                <ellipse cx="300" cy="15" rx="70" ry="12" fill="url(#goldGrad)" />
                <ellipse cx="300" cy="10" rx="50" ry="8" fill="#f59e0b" />

                {/* Crown jewels - multiple layers */}
                <circle cx="200" cy="15" r="10" fill="#fbbf24" className="crown-sparkle" />
                <circle cx="400" cy="15" r="10" fill="#fbbf24" className="crown-sparkle" />
                <circle cx="300" cy="10" r="15" fill="#f59e0b" className="crown-sparkle" />
                <circle cx="240" cy="12" r="8" fill="#fbbf24" className="crown-sparkle" />
                <circle cx="360" cy="12" r="8" fill="#fbbf24" className="crown-sparkle" />
                <circle cx="270" cy="8" r="6" fill="#fef3c7" className="crown-sparkle" />
                <circle cx="330" cy="8" r="6" fill="#fef3c7" className="crown-sparkle" />

                {/* Crown decorative patterns */}
                <rect x="260" y="5" width="80" height="6" fill="#92400e" rx="3" />
                <rect x="275" y="2" width="50" height="5" fill="#d97706" rx="2" />
                <rect x="285" y="0" width="30" height="4" fill="#92400e" rx="2" />

                {/* Crown side decorations */}
                <path d="M190 35 Q200 25 210 35 Q200 45 190 35" fill="#fbbf24" />
                <path d="M390 35 Q400 25 410 35 Q400 45 390 35" fill="#fbbf24" />
              </g>

              {/* Enhanced Kundalams - Detailed ear ornaments */}
              <g filter="url(#goldGlow)">
                <ellipse cx="130" cy="130" rx="18" ry="30" fill="url(#goldGrad)" stroke="#92400e" strokeWidth="2" />
                <ellipse cx="470" cy="130" rx="18" ry="30" fill="url(#goldGrad)" stroke="#92400e" strokeWidth="2" />

                {/* Kundalam decorative elements */}
                <circle cx="130" cy="105" r="10" fill="#fbbf24" />
                <circle cx="470" cy="105" r="10" fill="#fbbf24" />
                <circle cx="130" cy="155" r="8" fill="#f59e0b" />
                <circle cx="470" cy="155" r="8" fill="#f59e0b" />
                <circle cx="125" cy="130" r="6" fill="#fef3c7" />
                <circle cx="475" cy="130" r="6" fill="#fef3c7" />

                {/* Kundalam chains */}
                <path d="M130 100 L135 90 L125 80" stroke="#92400e" strokeWidth="2" fill="none" />
                <path d="M470 100 L475 90 L465 80" stroke="#92400e" strokeWidth="2" fill="none" />
              </g>

              {/* Face with ultra-detailed makeup */}
              <ellipse cx="300" cy="150" rx="160" ry="120" fill="url(#faceGrad)" filter="url(#kathakaliGlow)" />

              <g filter="url(#kathakaliGlow)">
                {/* Face outline with Chutti integration */}
                <path d="M140 100 Q300 50 460 100 Q490 150 460 210 Q300 260 140 210 Q110 150 140 100" fill="none" stroke="#92400e" strokeWidth="6" />

                {/* Ultra-detailed Forehead Designs */}
                <rect x="240" y="80" width="120" height="8" fill="#92400e" rx="4" />
                <rect x="255" y="75" width="90" height="6" fill="#d97706" rx="3" />
                <rect x="270" y="70" width="60" height="5" fill="#92400e" rx="2" />
                <rect x="280" y="65" width="40" height="4" fill="#d97706" rx="2" />

                {/* Complex forehead motifs */}
                <path d="M250 85 L270 85 L275 90 L280 85 L300 85 L305 90 L300 95 L280 95 L275 100 L270 95 L250 95 Z" fill="#92400e" />
                <path d="M320 85 L340 85 L345 90 L350 85 L370 85 L375 90 L370 95 L350 95 L345 100 L340 95 L320 95 Z" fill="#92400e" />

                {/* Additional forehead decorations */}
                <circle cx="275" cy="87" r="4" fill="#d97706" />
                <circle cx="325" cy="87" r="4" fill="#d97706" />
                <circle cx="300" cy="82" r="3" fill="#92400e" />

                {/* Ultra-thick Eyebrows with dramatic curves */}
                <path d="M200 110 Q220 105 245 110 Q260 115 275 110 Q285 105 295 110" fill="#92400e" stroke="#92400e" strokeWidth="5" strokeLinecap="round" />
                <path d="M305 110 Q315 105 325 110 Q340 115 365 110 Q380 105 400 110" fill="#92400e" stroke="#92400e" strokeWidth="5" strokeLinecap="round" />

                {/* Extended eyebrow tips for maximum fierceness */}
                <path d="M195 115 L200 110 L205 115" stroke="#92400e" strokeWidth="4" strokeLinecap="round" />
                <path d="M395 115 L400 110 L405 115" stroke="#92400e" strokeWidth="4" strokeLinecap="round" />

                {/* Hyper-expressive Eyes */}
                <ellipse cx="250" cy="135" rx="32" ry="20" fill="url(#eyeGrad)" stroke="#92400e" strokeWidth="4" />
                <ellipse cx="350" cy="135" rx="32" ry="20" fill="url(#eyeGrad)" stroke="#92400e" strokeWidth="4" />

                {/* Sophisticated eye lids with multiple layers */}
                <path d="M218 125 Q250 120 282 125 Q282 145 250 150 Q218 145 218 125" fill="#92400e" className="eye-lid" />
                <path d="M318 125 Q350 120 382 125 Q382 145 350 150 Q318 145 318 125" fill="#92400e" className="eye-lid" />

                {/* Enhanced pupils with multiple highlights */}
                <circle cx="250" cy="135" r="12" fill="#1f2937" />
                <circle cx="350" cy="135" r="12" fill="#1f2937" />
                <circle cx="253" cy="132" r="4" fill="#ffffff" />
                <circle cx="353" cy="132" r="4" fill="#ffffff" />
                <circle cx="255" cy="130" r="2" fill="#fef3c7" />
                <circle cx="355" cy="130" r="2" fill="#fef3c7" />

                {/* Detailed Nose with traditional markings */}
                <ellipse cx="300" cy="165" rx="12" ry="18" fill="#92400e" stroke="#92400e" strokeWidth="3" />
                <path d="M300 145 L300 183" stroke="#d97706" strokeWidth="4" />
                <circle cx="300" cy="155" r="4" fill="#d97706" />
                <circle cx="300" cy="175" r="3" fill="#92400e" />

                {/* Nose side details */}
                <path d="M288 165 L292 160" stroke="#92400e" strokeWidth="2" />
                <path d="M312 160 L308 165" stroke="#92400e" strokeWidth="2" />

                {/* Ultra-defined Lips & Mouth */}
                <path d="M265 195 Q300 220 335 195" fill="none" stroke="#92400e" strokeWidth="8" strokeLinecap="round" />
                <path d="M270 200 Q300 210 330 200" fill="#dc2626" stroke="#92400e" strokeWidth="3" />

                {/* Detailed lip contours */}
                <path d="M270 200 Q285 205 300 210 Q315 205 330 200" fill="none" stroke="#b91c1c" strokeWidth="2" />

                {/* Ultra-detailed Thaadi beard */}
                <path d="M260 205 Q300 240 340 205 Q350 215 340 225 Q325 245 300 250 Q275 245 260 225 Q250 215 260 205" fill="url(#beardGrad)" stroke="#92400e" strokeWidth="4" />

                {/* Beard texture details */}
                <path d="M280 220 Q300 235 320 220" fill="none" stroke="#78350f" strokeWidth="2" />
                <path d="M275 230 Q300 240 325 230" fill="none" stroke="#78350f" strokeWidth="2" />

                {/* Extensive traditional face patterns */}
                <circle cx="220" cy="145" r="5" fill="#92400e" />
                <circle cx="380" cy="145" r="5" fill="#92400e" />
                <circle cx="240" cy="175" r="4" fill="#92400e" />
                <circle cx="360" cy="175" r="4" fill="#92400e" />
                <circle cx="300" cy="205" r="6" fill="#92400e" />

                {/* Character-defining lines and complex motifs */}
                <path d="M220 130 L230 125 L235 130" stroke="#92400e" strokeWidth="3" strokeLinecap="round" />
                <path d="M365 125 L375 130 L380 125" stroke="#92400e" strokeWidth="3" strokeLinecap="round" />
                <path d="M210 150 L220 155 L215 160" stroke="#92400e" strokeWidth="2" strokeLinecap="round" />
                <path d="M385 155 L395 150 L390 160" stroke="#92400e" strokeWidth="2" strokeLinecap="round" />

                {/* Additional facial markings */}
                <path d="M250 185 L255 180" stroke="#92400e" strokeWidth="2" />
                <path d="M345 180 L350 185" stroke="#92400e" strokeWidth="2" />
                <circle cx="260" cy="190" r="3" fill="#d97706" />
                <circle cx="340" cy="190" r="3" fill="#d97706" />
              </g>

              {/* Enhanced neck garlands and chest plates */}
              <g filter="url(#kathakaliGlow)">
                <ellipse cx="300" cy="270" rx="90" ry="25" fill="url(#goldGrad)" stroke="#92400e" strokeWidth="3" />
                <ellipse cx="300" cy="275" rx="70" ry="18" fill="#92400e" />
                <ellipse cx="300" cy="280" rx="50" ry="12" fill="url(#goldGrad)" />

                {/* Chest plate jewels */}
                <circle cx="260" cy="270" r="10" fill="#fbbf24" className="crown-sparkle" />
                <circle cx="340" cy="270" r="10" fill="#fbbf24" className="crown-sparkle" />
                <circle cx="300" cy="270" r="15" fill="#f59e0b" className="crown-sparkle" />
                <circle cx="280" cy="275" r="8" fill="#fef3c7" className="crown-sparkle" />
                <circle cx="320" cy="275" r="8" fill="#fef3c7" className="crown-sparkle" />
              </g>

              <title>Ultra-detailed authentic Kathakali mask with multi-layered Chutti frame, ornate Kireetam crown, sophisticated makeup patterns, detailed Thaadi beard, and intricate ornaments</title>
            </svg>
          </div>
        </div>

        {/* Traditional Lamp Glow */}
        <div className="absolute bottom-10 left-10 z-10 group cursor-pointer" role="img" aria-label="Detailed traditional oil lamp with wick, flame, and glowing effects on hover">
          <svg width="80" height="120" viewBox="0 0 80 120" className="transition-all duration-500 group-hover:scale-110">
            <defs>
              <radialGradient id="lampGlow" cx="50%" cy="30%" r="50%">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.2" />
              </radialGradient>
              <radialGradient id="flameInner" cx="50%" cy="20%" r="50%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#fbbf24" />
              </radialGradient>
              <filter id="lampFilter">
                <feGaussianBlur stdDeviation="5" />
              </filter>
              <filter id="flameFilter">
                <feGaussianBlur stdDeviation="2" />
              </filter>
            </defs>
            {/* Lamp base */}
            <rect x="35" y="100" width="10" height="15" fill="#92400e" rx="2" />
            {/* Lamp body */}
            <ellipse cx="40" cy="80" rx="15" ry="20" fill="#d97706" />
            {/* Oil level */}
            <ellipse cx="40" cy="80" rx="12" ry="15" fill="#92400e" opacity="0.3" />
            {/* Wick */}
            <rect x="38" y="70" width="4" height="10" fill="#92400e" rx="2" />
            <rect x="39" y="65" width="2" height="5" fill="#8b4513" />
            {/* Flame outer */}
            <path d="M35 50 Q40 35 45 50 Q42 60 40 65 Q38 60 35 50" fill="#fbbf24" className="transition-all duration-300 group-hover:fill-orange-400 animate-pulse" style={{ animationDuration: '2s' }} filter="url(#flameFilter)" />
            {/* Flame inner */}
            <path d="M37 50 Q40 40 43 50 Q41 55 40 58 Q39 55 37 50" fill="url(#flameInner)" className="opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            {/* Glow effect */}
            <ellipse cx="40" cy="55" rx="20" ry="15" fill="url(#lampGlow)" filter="url(#lampFilter)" className="opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            {/* Decorative elements */}
            <circle cx="25" cy="85" r="2" fill="#fbbf24" />
            <circle cx="55" cy="85" r="2" fill="#fbbf24" />
            <path d="M30 90 Q40 95 50 90" stroke="#92400e" strokeWidth="1" fill="none" />
          </svg>
        </div>

        {/* Festival Fireworks Burst */}
        <div className="absolute top-20 right-20 z-10 group cursor-pointer" role="img" aria-label="Detailed festival fireworks burst with multiple particles and radiating lines on hover">
          <div className="relative">
            {/* Core burst */}
            <div className="w-3 h-3 bg-yellow-500 rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-700 group-hover:scale-400 group-hover:opacity-0"></div>
            {/* Outer dots */}
            <div className="w-2 h-2 bg-yellow-500 rounded-full absolute top-0 left-0 transition-all duration-700 group-hover:scale-300 group-hover:opacity-0"></div>
            <div className="w-2 h-2 bg-red-500 rounded-full absolute top-0 right-0 transition-all duration-700 delay-100 group-hover:scale-300 group-hover:opacity-0"></div>
            <div className="w-2 h-2 bg-green-500 rounded-full absolute bottom-0 left-0 transition-all duration-700 delay-200 group-hover:scale-300 group-hover:opacity-0"></div>
            <div className="w-2 h-2 bg-amber-500 rounded-full absolute bottom-0 right-0 transition-all duration-700 delay-300 group-hover:scale-300 group-hover:opacity-0"></div>
            {/* Additional particles */}
            <div className="w-1.5 h-1.5 bg-orange-400 rounded-full absolute top-2 left-1/2 transform -translate-x-1/2 transition-all duration-700 delay-400 group-hover:scale-250 group-hover:opacity-0"></div>
            <div className="w-1.5 h-1.5 bg-pink-400 rounded-full absolute bottom-2 left-1/2 transform -translate-x-1/2 transition-all duration-700 delay-500 group-hover:scale-250 group-hover:opacity-0"></div>
            <div className="w-1.5 h-1.5 bg-purple-400 rounded-full absolute top-1/2 left-2 transform -translate-y-1/2 transition-all duration-700 delay-600 group-hover:scale-250 group-hover:opacity-0"></div>
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full absolute top-1/2 right-2 transform -translate-y-1/2 transition-all duration-700 delay-700 group-hover:scale-250 group-hover:opacity-0"></div>
            {/* Burst lines */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              <div className="w-px h-24 bg-yellow-500 absolute top-0 left-1/2 transform -translate-x-1/2"></div>
              <div className="h-px w-24 bg-red-500 absolute top-1/2 left-0 transform -translate-y-1/2"></div>
              <div className="w-px h-24 bg-green-500 absolute bottom-0 left-1/2 transform -translate-x-1/2"></div>
              <div className="h-px w-24 bg-amber-500 absolute top-1/2 right-0 transform -translate-y-1/2"></div>
              {/* Diagonal lines */}
              <div className="w-px h-20 bg-orange-400 absolute top-0 left-0 transform rotate-45 origin-bottom-right"></div>
              <div className="w-px h-20 bg-pink-400 absolute top-0 right-0 transform -rotate-45 origin-bottom-left"></div>
              <div className="w-px h-20 bg-purple-400 absolute bottom-0 left-0 transform -rotate-45 origin-top-right"></div>
              <div className="w-px h-20 bg-blue-400 absolute bottom-0 right-0 transform rotate-45 origin-top-left"></div>
            </div>
          </div>
        </div>

        {/* Professional Dashboard Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Statistics Overview */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 border border-amber-200 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-amber-100 to-transparent rounded-full -mr-10 -mt-10"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-amber-800" style={{ fontFamily: 'Cinzel, serif' }}>Your Progress</h4>
                  <p className="text-sm text-amber-600">Event Participation</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-amber-700">Registered Events</span>
                  <span className="font-bold text-amber-900">{registrations.length}</span>
                </div>
                <div className="w-full bg-amber-100 rounded-full h-2">
                  <div className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(registrations.length * 20, 100)}%` }}></div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-amber-700">Published Results</span>
                  <span className="font-bold text-amber-900">{publishedResults.length}</span>
                </div>
                <div className="w-full bg-amber-100 rounded-full h-2">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(publishedResults.length * 15, 100)}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats Cards */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 border border-amber-200 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                <div className="text-2xl font-bold text-amber-800 mb-1">{availableCategories.length}</div>
                <div className="text-sm text-amber-600">Categories</div>
                <div className="w-full bg-amber-200 rounded-full h-1 mt-2">
                  <div className="bg-amber-500 h-1 rounded-full w-full"></div>
                </div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
                <div className="text-2xl font-bold text-green-800 mb-1">{events.length}</div>
                <div className="text-sm text-green-600">Total Events</div>
                <div className="w-full bg-green-200 rounded-full h-1 mt-2">
                  <div className="bg-green-500 h-1 rounded-full w-full"></div>
                </div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <div className="text-2xl font-bold text-blue-800 mb-1">{staticResultsForCarousel.length}</div>
                <div className="text-sm text-blue-600">Live Results</div>
                <div className="w-full bg-blue-200 rounded-full h-1 mt-2">
                  <div className="bg-blue-500 h-1 rounded-full w-full"></div>
                </div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                <div className="text-2xl font-bold text-purple-800 mb-1">{demoSchedule.length}</div>
                <div className="text-sm text-purple-600">Scheduled</div>
                <div className="w-full bg-purple-200 rounded-full h-1 mt-2">
                  <div className="bg-purple-500 h-1 rounded-full w-full"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 border border-amber-200 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"></path>
                </svg>
              </div>
              <div>
                <h4 className="text-lg font-bold text-amber-800" style={{ fontFamily: 'Cinzel, serif' }}>Recent Activity</h4>
                <p className="text-sm text-amber-600">Latest Updates</p>
              </div>
            </div>
            <div className="space-y-3">
              {registrations.length > 0 ? (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-amber-900">New Registration</div>
                    <div className="text-xs text-amber-600">{registrations[0].event_details?.name}</div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-amber-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-amber-900">Welcome!</div>
                    <div className="text-xs text-amber-600">Ready to participate</div>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-amber-900">Live Results Updated</div>
                  <div className="text-xs text-amber-600">{staticResultsForCarousel.length} events</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-amber-900">Schedule Available</div>
                  <div className="text-xs text-amber-600">{demoSchedule.length} events</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Published Events (Visible to students) */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 border border-amber-200 shadow-lg hover:shadow-2xl transition-all duration-300 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h18v2H3V5zm0 4h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9zm4 2v8h10v-8H7z" /></svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-emerald-800" style={{ fontFamily: 'Cinzel, serif' }}>Published Events</h3>
                <p className="text-sm text-emerald-600">Open for viewing and registration</p>
              </div>
            </div>
          </div>
          {publishedEvents.length === 0 ? (
            <div className="text-center py-10 text-emerald-700">No events are currently published.</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {visiblePublishedEvents.map(ev => (
                  <div key={ev.id} className="rounded-xl border border-emerald-200 bg-white shadow hover:shadow-md transition-all duration-200 p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-sm text-emerald-700 mb-1 capitalize">{ev.category}</div>
                        <h4 className="text-lg font-semibold text-emerald-900">{ev.name}</h4>
                      </div>
                      <span className="px-2 py-0.5 text-xs rounded bg-emerald-50 text-emerald-700 border border-emerald-100">Published</span>
                    </div>
                    <div className="text-sm text-emerald-800/90 space-y-1">
                      <div className="flex items-center gap-2"><span>📅</span><span>{ev.date}</span></div>
                      <div className="flex items-center gap-2"><span>⏰</span><span>{ev.start_time} – {ev.end_time}</span></div>
                      <div className="flex items-center gap-2"><span>📍</span><span>{ev.venue_details?.name || ev.venue || '-'}</span></div>
                    </div>
                  </div>
                ))}
              </div>

              {hasMorePublishedEvents && (
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setShowAllPublishedEvents((prev) => !prev)}
                    className="px-4 py-2 rounded-lg border border-emerald-300 text-emerald-800 hover:bg-emerald-50 transition-colors duration-200 font-medium"
                  >
                    {showAllPublishedEvents ? 'Show Less' : 'Show More'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Enhanced Overview Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Registered Events - Enhanced */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 border border-amber-200 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-24 h-24 bg-gradient-to-br from-amber-100/50 to-transparent rounded-full -ml-12 -mt-12"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <h4 className="text-xl font-bold text-amber-800" style={{ fontFamily: 'Cinzel, serif' }}>Registered Events</h4>
                </div>
                <div className="text-2xl font-bold text-amber-600">{registrations.length}</div>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
                </div>
              ) : registrations.length ? (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {registrations.map((reg, index) => (
                    <div key={reg.id} className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 hover:shadow-md transition-all duration-200 hover:border-amber-300">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-amber-900 flex items-center gap-2">
                            <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                            {reg.event_details?.name || 'Event'}
                          </div>
                          <div className="text-sm text-amber-700 mt-1 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0V3H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"></path>
                            </svg>
                            {reg.event_details?.date || 'TBD'}
                          </div>
                          <div className="text-sm text-amber-600 mt-1 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"></path>
                            </svg>
                            {reg.event_details?.venue_details?.name || 'TBD'}
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${reg._local ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                          {reg._local ? 'New' : 'Registered'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg className="w-16 h-16 text-amber-300 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                  </svg>
                  <p className="text-amber-700 font-medium">No registrations yet</p>
                  <p className="text-amber-600 text-sm mt-1">Register for events to get started!</p>
                </div>
              )}
            </div>
          </div>

          {/* Schedule - Enhanced */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 border border-amber-200 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-100/50 to-transparent rounded-full -mr-12 -mt-12"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0V3H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"></path>
                    </svg>
                  </div>
                  <h4 className="text-xl font-bold text-amber-800" style={{ fontFamily: 'Cinzel, serif' }}>Your Schedule</h4>
                </div>
                <div className="text-2xl font-bold text-blue-600">{registrations.length || demoSchedule.length}</div>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : registrations.length ? (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {registrations.map((reg, index) => (
                    <div key={reg.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 hover:shadow-md transition-all duration-200 hover:border-blue-300">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-blue-900 flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            {reg.event_details?.name || 'Event'}
                          </div>
                          <div className="text-sm text-blue-700 mt-1 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"></path>
                            </svg>
                            {reg.event_details?.date || 'TBD'}
                          </div>
                          <div className="text-sm text-blue-600 mt-1 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"></path>
                            </svg>
                            {reg.event_details?.venue_details?.name || 'TBD'}
                          </div>
                        </div>
                        <div className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Scheduled
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {demoSchedule.slice(0, 5).map((item, index) => (
                    <div key={item.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 hover:shadow-md transition-all duration-200 hover:border-blue-300">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-blue-900 flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            {item.event_details?.name}
                          </div>
                          <div className="text-sm text-blue-700 mt-1 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"></path>
                            </svg>
                            {item.event_details?.date}
                          </div>
                          <div className="text-sm text-blue-600 mt-1 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"></path>
                            </svg>
                            {item.event_details?.venue_details?.name}
                          </div>
                        </div>
                        <div className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Preview
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <Modal open={open === 'profile'} title="Edit Profile" onClose={closeProfileEditor}>
        <form onSubmit={submitProfileUpdate} className="space-y-5">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-blue-900 font-semibold">Current gender: {getGenderLabel(currentUser?.gender)}</p>
            {profileReturnTarget === 'register' && (
              <p className="text-sm text-blue-700 mt-1">Save your profile and you will return to event registration.</p>
            )}
          </div>

          {profileError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {profileError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">First Name</label>
              <input
                type="text"
                value={profileForm.first_name}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, first_name: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                required
              />
              {toErrorList(profileFieldErrors?.first_name).map((msg, index) => (
                <p key={`profile-first-name-error-${index}`} className="mt-1 text-sm text-red-600">{msg}</p>
              ))}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Last Name</label>
              <input
                type="text"
                value={profileForm.last_name}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, last_name: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                required
              />
              {toErrorList(profileFieldErrors?.last_name).map((msg, index) => (
                <p key={`profile-last-name-error-${index}`} className="mt-1 text-sm text-red-600">{msg}</p>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
              <input
                type="text"
                value={profileForm.phone}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
              />
              {toErrorList(profileFieldErrors?.phone).map((msg, index) => (
                <p key={`profile-phone-error-${index}`} className="mt-1 text-sm text-red-600">{msg}</p>
              ))}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Gender</label>
              <select
                value={profileForm.gender}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, gender: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 bg-white"
                required
              >
                <option value="">Select gender</option>
                {GENDER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {toErrorList(profileFieldErrors?.gender).map((msg, index) => (
                <p key={`profile-gender-error-${index}`} className="mt-1 text-sm text-red-600">{msg}</p>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={closeProfileEditor}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              disabled={profileSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={profileSaving}
              className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {profileSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={open === 'groupProfile'} title="Edit Group Profile" onClose={closeGroupProfileEditor}>
        {groupProfileLoadingId ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <form onSubmit={submitGroupProfileUpdate} className="space-y-5">
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
              <p className="text-indigo-900 font-semibold">
                Group ID: {groupProfileForm.group_id || '-'} • Class: {groupProfileForm.group_class || '-'}
              </p>
              {groupProfileReturnTarget === 'register' && (
                <p className="text-sm text-indigo-700 mt-1">Save your group profile and you will return to event registration.</p>
              )}
            </div>

            {groupProfileError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {groupProfileError}
              </div>
            )}

            {groupProfileFieldErrors.non_field_errors.length > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 space-y-1">
                {groupProfileFieldErrors.non_field_errors.map((msg, index) => (
                  <p key={`group-profile-non-field-error-${index}`}>{msg}</p>
                ))}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Gender Category</label>
              <select
                value={groupProfileForm.gender_category}
                onChange={(e) => {
                  const value = String(e.target.value || '').toUpperCase();
                  setGroupProfileForm((prev) => ({ ...prev, gender_category: value }));
                  setGroupProfileFieldErrors((prev) => ({ ...prev, gender_category: [] }));
                }}
                className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 bg-white"
                required
              >
                <option value="">Select gender category</option>
                {GENDER_CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              {groupProfileFieldErrors.gender_category.map((msg, index) => (
                <p key={`group-profile-gender-error-${index}`} className="mt-1 text-sm text-red-600">{msg}</p>
              ))}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Notes (optional)</label>
              <textarea
                rows={2}
                value={groupProfileForm.notes}
                onChange={(e) => {
                  setGroupProfileForm((prev) => ({ ...prev, notes: e.target.value }));
                  setGroupProfileFieldErrors((prev) => ({ ...prev, notes: [] }));
                }}
                className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 bg-white"
                placeholder="Optional note for this update"
              />
              {toErrorList(groupProfileFieldErrors.notes).map((msg, index) => (
                <p key={`group-profile-notes-error-${index}`} className="mt-1 text-sm text-red-600">{msg}</p>
              ))}
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700">Participants</h4>
              {groupProfileFieldErrors.participants_non_field.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 space-y-1">
                  {groupProfileFieldErrors.participants_non_field.map((msg, index) => (
                    <p key={`group-profile-participants-non-field-${index}`}>{msg}</p>
                  ))}
                </div>
              )}
              {(groupProfileForm.participants || []).map((participant, index) => (
                <div key={`group-profile-participant-${index}`} className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 border border-indigo-100 rounded-lg bg-white">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">First Name</label>
                    <input
                      type="text"
                      value={participant.first_name}
                      onChange={(e) => updateGroupProfileParticipantField(index, 'first_name', e.target.value)}
                      className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
                      required
                    />
                    {toErrorList(groupProfileFieldErrors.participants?.[index]?.first_name).map((msg, errorIndex) => (
                      <p key={`group-profile-participant-first-name-${index}-${errorIndex}`} className="mt-1 text-xs text-red-600">{msg}</p>
                    ))}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={participant.last_name}
                      onChange={(e) => updateGroupProfileParticipantField(index, 'last_name', e.target.value)}
                      className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
                      required
                    />
                    {toErrorList(groupProfileFieldErrors.participants?.[index]?.last_name).map((msg, errorIndex) => (
                      <p key={`group-profile-participant-last-name-${index}-${errorIndex}`} className="mt-1 text-xs text-red-600">{msg}</p>
                    ))}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Gender</label>
                    <select
                      value={participant.gender || ''}
                      onChange={(e) => updateGroupProfileParticipantField(index, 'gender', e.target.value)}
                      className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 bg-white"
                    >
                      <option value="">Select gender</option>
                      {GENDER_OPTIONS.map((option) => (
                        <option key={`${option.value}-${index}`} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    {toErrorList(groupProfileFieldErrors.participants?.[index]?.gender).map((msg, errorIndex) => (
                      <p key={`group-profile-participant-gender-${index}-${errorIndex}`} className="mt-1 text-xs text-red-600">{msg}</p>
                    ))}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Class</label>
                    <input
                      type="text"
                      value={participant.student_class || ''}
                      onChange={(e) => updateGroupProfileParticipantField(index, 'student_class', e.target.value)}
                      className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
                    />
                    {toErrorList(groupProfileFieldErrors.participants?.[index]?.student_class).map((msg, errorIndex) => (
                      <p key={`group-profile-participant-class-${index}-${errorIndex}`} className="mt-1 text-xs text-red-600">{msg}</p>
                    ))}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
                    <input
                      type="text"
                      value={participant.phone || ''}
                      onChange={(e) => updateGroupProfileParticipantField(index, 'phone', e.target.value)}
                      className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
                    />
                    {toErrorList(groupProfileFieldErrors.participants?.[index]?.phone).map((msg, errorIndex) => (
                      <p key={`group-profile-participant-phone-${index}-${errorIndex}`} className="mt-1 text-xs text-red-600">{msg}</p>
                    ))}
                  </div>
                  {toErrorList(groupProfileFieldErrors.participants?.[index]?.non_field_errors).map((msg, errorIndex) => (
                    <p key={`group-profile-participant-non-field-${index}-${errorIndex}`} className="md:col-span-2 text-xs text-red-600">{msg}</p>
                  ))}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeGroupProfileEditor}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                disabled={groupProfileSaving}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={groupProfileSaving}
                className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {groupProfileSaving ? 'Saving...' : 'Save Group Profile'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Event Registration Modal - Enhanced */}
      <Modal open={open === 'register'} title="Event Registration" onClose={handleClose}>
        <div className="space-y-8">
          {/* Enhanced Progress Indicator */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-2">
              {/* Step 1: Name Entry */}
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${firstName && lastName && !firstNameError && !lastNameError ? 'bg-green-500 text-white shadow-lg' : 'bg-amber-200 text-amber-700'}`}>
                  {firstName && lastName && !firstNameError && !lastNameError ? '✓' : '1'}
                </div>
                <div className="text-xs text-center mt-2 max-w-20">
                  <div className="font-semibold text-gray-800">Enter Name</div>
                  <div className="text-gray-600">Fill Details</div>
                </div>
              </div>

              <div className={`h-1 w-12 ${firstName && lastName && !firstNameError && !lastNameError ? 'bg-green-500' : 'bg-amber-200'} transition-colors duration-300`}></div>

              {/* Step 2: Identity Verification */}
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${isIdentityVerified ? 'bg-green-500 text-white shadow-lg' : 'bg-amber-200 text-amber-700'}`}>
                  {isIdentityVerified ? '✓' : '2'}
                </div>
                <div className="text-xs text-center mt-2 max-w-20">
                  <div className="font-semibold text-gray-800">Verify Identity</div>
                  <div className="text-gray-600">Confirm Details</div>
                </div>
              </div>

              <div className={`h-1 w-12 ${isIdentityVerified ? 'bg-green-500' : 'bg-amber-200'} transition-colors duration-300`}></div>

              {/* Step 3: Category Selection */}
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${selectedCategory ? 'bg-green-500 text-white shadow-lg' : 'bg-amber-200 text-amber-700'}`}>
                  {selectedCategory ? '✓' : '3'}
                </div>
                <div className="text-xs text-center mt-2 max-w-20">
                  <div className="font-semibold text-gray-800">Select Category</div>
                  <div className="text-gray-600">Choose Type</div>
                </div>
              </div>

              <div className={`h-1 w-12 ${selectedEvent ? 'bg-green-500' : 'bg-amber-200'} transition-colors duration-300`}></div>

              {/* Step 4: Event Selection */}
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${selectedEvent ? 'bg-green-500 text-white shadow-lg' : 'bg-amber-200 text-amber-700'}`}>
                  {selectedEvent ? '✓' : '4'}
                </div>
                <div className="text-xs text-center mt-2 max-w-20">
                  <div className="font-semibold text-gray-800">Select Event</div>
                  <div className="text-gray-600">Choose Event</div>
                </div>
              </div>
            </div>
          </div>

          {/* Personal Information Section - Enhanced */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-200/30 to-transparent rounded-full -mr-16 -mt-16"></div>

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-amber-800" style={{ fontFamily: 'Cinzel, serif' }}>Student Identity Verification</h3>
                  <p className="text-sm text-amber-600">Enter your registered name to proceed</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative">
                  <label className="block text-amber-800 font-semibold mb-3 text-sm" style={{ fontFamily: 'Cinzel, serif' }}>First Name</label>
                  <div className="relative">
                    <input
                      value={firstName}
                      onChange={handleFirstNameChange}
                      placeholder="Enter your first name"
                      className={`w-full p-4 rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent ${firstNameError ? 'border-red-300 bg-red-50' : 'border-amber-200 bg-white hover:border-amber-300'}`}
                    />
                    {firstName && !firstNameError && !registrationError && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                        </svg>
                      </div>
                    )}
                  </div>
                  {firstNameError && (
                    <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
                      </svg>
                      {firstNameError}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <label className="block text-amber-800 font-semibold mb-3 text-sm" style={{ fontFamily: 'Cinzel, serif' }}>Last Name</label>
                  <div className="relative">
                    <input
                      value={lastName}
                      onChange={handleLastNameChange}
                      placeholder="Enter your last name"
                      className={`w-full p-4 rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent ${lastNameError ? 'border-red-300 bg-red-50' : 'border-amber-200 bg-white hover:border-amber-300'}`}
                    />
                    {lastName && !lastNameError && !registrationError && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                        </svg>
                      </div>
                    )}
                  </div>
                  {lastNameError && (
                    <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
                      </svg>
                      {lastNameError}
                    </div>
                  )}
                </div>
              </div>


              {/* Identity Verification Button */}
              <div className="mt-6 flex justify-center">
                <button
                  onClick={handleIdentityVerification}
                  disabled={!firstName || !lastName || firstNameError || lastNameError || isVerifying || isIdentityVerified}
                  className={`px-8 py-3 rounded-xl font-bold text-base transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${isIdentityVerified
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                    : firstName && lastName && !firstNameError && !lastNameError && !isVerifying
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg hover:shadow-xl'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                >
                  <span className="flex items-center gap-2">
                    {isVerifying ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Verifying...
                      </>
                    ) : isIdentityVerified ? (
                      <>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                        </svg>
                        Identity Verified
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" clipRule="evenodd"></path>
                        </svg>
                        Verify Identity
                      </>
                    )}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {registrationError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path>
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-red-800 font-medium">{registrationError}</div>
                {registrationHelpText && (
                  <div className="text-red-700 text-sm mt-1">{registrationHelpText}</div>
                )}
                {registrationCta && (
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {registrationCta.type === 'update_profile' ? (
                      <button
                        type="button"
                        onClick={() => openProfileEditor('register')}
                        className="px-3 py-1.5 rounded-lg bg-red-100 text-red-800 border border-red-300 text-sm font-semibold hover:bg-red-200 transition-colors"
                      >
                        {registrationCta.label}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleCoordinatorCta}
                        className="px-3 py-1.5 rounded-lg bg-red-100 text-red-800 border border-red-300 text-sm font-semibold hover:bg-red-200 transition-colors"
                      >
                        {registrationCta.label}
                      </button>
                    )}
                    {registrationCta.type === 'contact_coordinator' && coordinatorRequestCopied && (
                      <span className="text-xs text-red-700">Guidance copied to clipboard</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {allowedGroupEntries.length > 0 && (
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl p-6 border border-indigo-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 3a1 1 0 00-1 1v1H4a2 2 0 00-2 2v1h16V7a2 2 0 00-2-2h-1V4a1 1 0 10-2 0v1H7V4a1 1 0 00-1-1zm12 7H2v6a2 2 0 002 2h12a2 2 0 002-2v-6zM7 13a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd"></path>
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-indigo-800" style={{ fontFamily: 'Cinzel, serif' }}>Approved Group Entries</h3>
                </div>
                <span className="text-sm font-semibold text-indigo-700">{allowedGroupEntries.length} total</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allowedGroupEntries.map((entry) => {
                  const eventLabels = (entry.events_display && entry.events_display.length > 0)
                    ? entry.events_display
                    : (entry.event_ids || []).map((id) => eventNameById[String(id)] || `Event #${id}`);

                  return (
                    <div key={String(entry.id)} className="bg-white border border-indigo-200 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-indigo-900">{entry.group_id}</div>
                        <span className="text-xs px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-200">
                          {entry.group_class || '-'}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-indigo-800">
                        <div><strong>Leader:</strong> {entry.leader_full_name || '-'}</div>
                        <div><strong>Participants:</strong> {entry.participant_count || '-'}</div>
                        <div><strong>Gender:</strong> {entry.gender_category || '-'}</div>
                        <div className="mt-1"><strong>Events:</strong> {eventLabels.length > 0 ? eventLabels.join(', ') : '-'}</div>
                      </div>
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => openGroupProfileEditor(entry.id, open === 'register' ? 'register' : null)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-800 border border-indigo-300 text-sm font-semibold hover:bg-indigo-200 transition-colors"
                        >
                          Edit Group Profile
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Category Selection - Only show after identity verification */}
          {isIdentityVerified && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-blue-800" style={{ fontFamily: 'Cinzel, serif' }}>Select Category</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {allowedEventIdSet === null ? (
                  <div className="col-span-3 text-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : availableCategories.length === 0 ? (
                  <div className="col-span-3 text-center py-10 bg-white rounded-xl border border-blue-200">
                    <h4 className="text-lg font-bold text-blue-900 mb-2">No eligible categories available</h4>
                    <p className="text-blue-700">
                      We could not find any event categories assigned to your account yet.
                    </p>
                    <p className="text-sm text-blue-600 mt-2">
                      Please contact your school coordinator to assign events.
                    </p>
                  </div>
                ) : availableCategories.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => {
                      if (!isIdentityVerified) {
                        setRegistrationFailure('Please verify your identity before selecting a category.');
                        return;
                      }
                      setSelectedCategory(c.key);
                      setSelectedEvent('');
                    }}
                    className={`group rounded-2xl p-6 border-2 transition-all duration-300 text-left hover:shadow-xl hover:scale-105 relative overflow-hidden ${selectedCategory === c.key
                      ? 'bg-gradient-to-br from-amber-100 to-orange-100 border-amber-400 shadow-xl ring-2 ring-amber-300'
                      : 'bg-white border-blue-200 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                  >
                    {/* Background gradient overlay */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${c.color} opacity-5 group-hover:opacity-10 transition-opacity duration-300`}></div>

                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-12 h-12 bg-gradient-to-br ${c.color} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                          <span className="text-2xl">{c.icon}</span>
                        </div>
                        <div className={`font-bold text-lg ${selectedCategory === c.key ? 'text-amber-900' : 'text-blue-900'}`} style={{ fontFamily: 'Cinzel, serif' }}>
                          {c.label}
                        </div>
                      </div>

                      <div className={`text-sm ${selectedCategory === c.key ? 'text-amber-700' : 'text-blue-700'} mb-2`}>
                        {c.eventCount} events available
                      </div>

                      {selectedCategory === c.key && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                          <span className="text-xs text-amber-600 font-medium">Selected</span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Event Selection */}
          {selectedCategory && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-green-800" style={{ fontFamily: 'Cinzel, serif' }}>Select Event</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(() => {
                  if (allowedEventIdSet === null) {
                    return (
                      <div className="col-span-2 text-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mx-auto"></div>
                      </div>
                    );
                  }

                  // Only show events selected by the student's school for this category
                  const categoryEvents = filteredCategoryEvents;

                  if (categoryEvents.length === 0) {
                    return (
                      <div className="col-span-2 text-center py-12">
                        <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                          <svg className="w-10 h-10 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path>
                          </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-700 mb-3" style={{ fontFamily: 'Cinzel, serif' }}>No events available</h3>
                        <p className="text-gray-600 text-lg leading-relaxed max-w-md mx-auto">
                          Your school has not selected any events for the <strong>{availableCategories.find(c => c.key === selectedCategory)?.label}</strong> category.
                          Please contact your school coordinator.
                        </p>
                        <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                          <p className="text-blue-700 text-sm font-medium">
                            💡 Tip: Schools choose eligible events during participant submission.
                          </p>
                        </div>
                      </div>
                    );
                  }

                  return categoryEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => {
                        if (!isIdentityVerified) {
                          setRegistrationFailure('Please verify your identity before selecting an event.');
                          return;
                        }
                        setSelectedEvent(event.name);
                      }}
                      className={`group rounded-2xl p-5 border-2 transition-all duration-300 text-left hover:shadow-lg hover:scale-105 relative overflow-hidden ${selectedEvent === event.name
                        ? 'bg-gradient-to-br from-amber-100 to-orange-100 border-amber-400 shadow-lg ring-2 ring-amber-300'
                        : 'bg-white border-green-200 hover:border-green-300 hover:bg-green-50'
                        }`}
                    >
                      {/* Published indicator */}
                      <div className="absolute top-3 right-3 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>

                      <div className={`font-bold text-lg mb-2 ${selectedEvent === event.name ? 'text-amber-900' : 'text-green-900'}`} style={{ fontFamily: 'Cinzel, serif' }}>
                        {event.name}
                      </div>
                      <div className={`text-sm ${selectedEvent === event.name ? 'text-amber-700' : 'text-green-700'} mb-2`}>
                        {event.description || 'Click to select this event'}
                      </div>

                      {/* Event details */}
                      <div className="flex items-center gap-4 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0V3H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"></path>
                          </svg>
                          {event.date || 'TBD'}
                        </div>
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"></path>
                          </svg>
                          {event.start_time || 'TBD'}
                        </div>
                      </div>

                      {selectedEvent === event.name && (
                        <div className="mt-3 flex items-center gap-2">
                          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                          <span className="text-xs text-amber-600 font-medium">Selected</span>
                        </div>
                      )}
                    </button>
                  ));
                })()}
              </div>
            </div>
          )}

          {selectedEvent && requiresSelectedGroup && (
            <div className="bg-gradient-to-r from-indigo-50 to-violet-50 rounded-2xl p-6 border border-indigo-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a8 8 0 00-8 8v1a3 3 0 003 3h1a1 1 0 100-2H5a1 1 0 01-1-1v-1a6 6 0 0112 0v1a1 1 0 01-1 1h-1a1 1 0 100 2h1a3 3 0 003-3v-1a8 8 0 00-8-8z" clipRule="evenodd"></path>
                    <path d="M8 11a2 2 0 114 0v3a2 2 0 11-4 0v-3z"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-indigo-800" style={{ fontFamily: 'Cinzel, serif' }}>Select Approved Group ID</h3>
              </div>

              {selectedEventGroupEntries.length === 0 ? (
                <div className="bg-white border border-indigo-200 rounded-xl p-4 text-indigo-800">
                  <p className="font-semibold">No approved group entry is available for this group event.</p>
                  <p className="text-sm mt-1">Please contact your school coordinator to submit and approve a group entry before registering.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedEventGroupEntries.map((entry) => {
                    const isSelected = selectedGroupId === entry.group_id;
                    const eventLabels = (entry.events_display && entry.events_display.length > 0)
                      ? entry.events_display
                      : (entry.event_ids || []).map((id) => eventNameById[String(id)] || `Event #${id}`);

                    return (
                      <label
                        key={`${entry.group_id}-${entry.id}`}
                        className={`block rounded-xl border-2 p-4 cursor-pointer transition-all duration-200 ${isSelected ? 'border-indigo-400 bg-indigo-100 ring-2 ring-indigo-200' : 'border-indigo-200 bg-white hover:bg-indigo-50'}`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="group_id"
                            value={entry.group_id}
                            checked={isSelected}
                            onChange={(e) => setSelectedGroupId(e.target.value)}
                            className="mt-1 h-4 w-4 text-indigo-600 border-indigo-300 focus:ring-indigo-500"
                            aria-label={`Select group ${entry.group_id}`}
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="font-bold text-indigo-900">{entry.group_id}</div>
                              <span className="text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {entry.group_class || '-'}
                              </span>
                            </div>
                            <div className="text-sm text-indigo-800 mt-1">
                              <div><strong>Leader:</strong> {entry.leader_full_name || '-'}</div>
                              <div><strong>Participants:</strong> {entry.participant_count || '-'}</div>
                              <div><strong>Events:</strong> {eventLabels.length > 0 ? eventLabels.join(', ') : '-'}</div>
                            </div>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Action Section */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex-1">
                {selectedCategory && selectedEvent ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                      </svg>
                    </div>
                    <div>
                      <div className="text-purple-800 font-bold">Ready to Register!</div>
                      <div className="text-purple-600 text-sm">
                        <strong>{availableCategories.find(c => c.key === selectedCategory)?.label}</strong> • {selectedEvent}
                      </div>
                      {requiresSelectedGroup && (
                        <div className="text-purple-700 text-xs mt-1">
                          Group ID: <strong>{selectedGroupId || 'Select a group ID to continue'}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-400 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
                      </svg>
                    </div>
                    <div>
                      <div className="text-purple-800 font-bold">Complete Selection</div>
                      <div className="text-purple-600 text-sm">Choose a category and event to continue</div>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={handleRegister}
                disabled={!isIdentityVerified || !selectedCategory || !selectedEvent || (requiresSelectedGroup && !selectedGroupId) || isRegistering}
                className={`px-8 py-4 rounded-xl text-white font-bold text-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:scale-100 ${isIdentityVerified && selectedCategory && selectedEvent && (!requiresSelectedGroup || !!selectedGroupId) && !isRegistering
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg hover:shadow-xl'
                  : 'bg-gray-400 cursor-not-allowed'
                  }`}
              >
                <span className="flex items-center gap-2">
                  {isRegistering ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Registering...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"></path>
                      </svg>
                      Register Now
                    </>
                  )}
                </span>
              </button>
            </div>
          </div>

          {/* Latest Registration Success */}
          {latestRegistration && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-green-800" style={{ fontFamily: 'Cinzel, serif' }}>Registration Successful!</h3>
              </div>
              <div className="flex flex-col lg:flex-row items-center gap-6">
                <div className="relative">
                  <img src={latestRegistration.qrDataUrl} alt="QR Code" className="w-32 h-32 rounded-2xl border-4 border-green-300 shadow-lg" />
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                    </svg>
                  </div>
                </div>
                <div className="flex-1 text-center lg:text-left">
                  <div className="text-green-900 font-bold text-xl mb-2" style={{ fontFamily: 'Cinzel, serif' }}>{latestRegistration.eventName}</div>
                  <div className="space-y-1 text-green-800">
                    <div><strong>Category:</strong> {latestRegistration.categoryLabel}</div>
                    <div><strong>Chess Number:</strong> <span className="font-mono bg-green-100 px-2 py-1 rounded text-green-900">{latestRegistration.chessNumber}</span></div>
                  </div>
                </div>
                <button
                  onClick={() => downloadRegistrationPDF(latestRegistration)}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"></path>
                  </svg>
                  Download PDF
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* QR ID Card Modal - Enhanced */}
      <Modal open={open === 'qr'} title="QR ID Card" onClose={handleClose}>
        {isGeneratingQR ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
            <h3 className="text-xl font-bold text-purple-800 mb-2" style={{ fontFamily: 'Cinzel, serif' }}>Generating QR Codes</h3>
            <p className="text-purple-600">Please wait while we prepare your digital ID cards...</p>
          </div>
        ) : allRegistrationsWithQR.length === 0 && registrations.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2" style={{ fontFamily: 'Cinzel, serif' }}>No QR Card Available</h3>
            <p className="text-gray-600 mb-6">You haven't registered for any events yet.</p>
            <button
              onClick={() => setOpen('register')}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Register for an Event
            </button>
          </div>
        ) : allRegistrationsWithQR.length === 0 && registrations.length > 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-yellow-800 mb-2" style={{ fontFamily: 'Cinzel, serif' }}>Generating QR Codes</h3>
            <p className="text-yellow-600 mb-6">Please wait while we prepare your digital ID cards...</p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto"></div>
          </div>
        ) : currentRegistration ? (
          <div className="space-y-6">
            {/* Debug Info - Remove this later */}
            {console.log('Current registration data:', currentRegistration)}
            {/* Header */}
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 010 2H6v2.586l6.707-6.707a1 1 0 111.414 1.414L7.414 8H10a1 1 0 110 2H4a1 1 0 01-1-1V4zM16 3a1 1 0 00-1 1v3a1 1 0 102 0V4h2.586l-6.707 6.707a1 1 0 101.414 1.414L16 5.414V8a1 1 0 102 0V4a1 1 0 00-1-1z" clipRule="evenodd"></path>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-purple-800 mb-2" style={{ fontFamily: 'Cinzel, serif' }}>Digital ID Card</h2>
              <p className="text-purple-600">Your official E-Kalolsavam registration card</p>
            </div>

            {/* QR Card Preview */}
            <div className="bg-gradient-to-br from-white to-purple-50 rounded-2xl p-8 border-2 border-purple-200 shadow-xl">
              <div className="flex flex-col lg:flex-row items-center gap-8">
                {/* QR Code Section */}
                <div className="flex-shrink-0 text-center">
                  <div className="relative inline-block">
                    {currentRegistration.qrDataUrl ? (
                      <>
                        <img
                          src={currentRegistration.qrDataUrl}
                          alt="QR Code"
                          className="w-48 h-48 rounded-2xl border-4 border-purple-300 shadow-lg hover:shadow-xl transition-shadow duration-300"
                        />
                        <div className="absolute -top-3 -right-3 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                          </svg>
                        </div>
                      </>
                    ) : (
                      <div className="w-48 h-48 rounded-2xl border-4 border-purple-300 shadow-lg bg-gray-100 flex items-center justify-center">
                        <div className="text-center text-gray-500">
                          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-sm">Generating QR...</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-purple-600 mt-3 font-medium">Scan at venue check-in</p>
                </div>

                {/* Details Section */}
                <div className="flex-1 space-y-4">
                  <div className="text-center lg:text-left">
                    <h3 className="text-2xl font-bold text-purple-900 mb-2" style={{ fontFamily: 'Cinzel, serif' }}>
                      {currentRegistration.eventName}
                    </h3>
                    <div className="w-16 h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mx-auto lg:mx-0 mb-4"></div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-white/70 rounded-xl p-4 border border-purple-100">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"></path>
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm text-purple-600 font-medium">Category</div>
                          <div className="text-purple-900 font-bold">{currentRegistration.categoryLabel}</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/70 rounded-xl p-4 border border-purple-100">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm text-purple-600 font-medium">Chess Number</div>
                          <div className="text-green-900 font-bold text-xl font-mono bg-green-50 px-3 py-1 rounded-lg inline-block">
                            {currentRegistration.chessNumber || currentRegistration.chess_number || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/70 rounded-xl p-4 border border-purple-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path>
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="text-sm text-purple-600 font-medium">Student Name</div>
                          <div className="text-amber-900 font-bold">{currentRegistration.studentName || 'Not provided'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Event Navigation */}
            {showAllEvents && allRegistrationsWithQR.length > 1 && (
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-lg font-bold text-indigo-800">All Registered Events</h4>
                  <span className="text-sm text-indigo-600">
                    {selectedRegistrationIndex + 1} of {allRegistrationsWithQR.length}
                  </span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {allRegistrationsWithQR.map((reg, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedRegistrationIndex(index)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${index === selectedRegistrationIndex
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-white text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                        }`}
                    >
                      {reg.eventName}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => downloadRegistrationPDF({
                  studentName: currentRegistration.studentName,
                  categoryLabel: currentRegistration.categoryLabel,
                  eventName: currentRegistration.eventName,
                  chessNumber: currentRegistration.chessNumber || currentRegistration.chess_number,
                  qrDataUrl: currentRegistration.qrDataUrl
                })}
                className="flex-1 px-6 py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold text-lg transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"></path>
                </svg>
                Download PDF Card
              </button>
              <button
                onClick={() => downloadRegistrationPDF({
                  studentName: currentRegistration.studentName,
                  categoryLabel: currentRegistration.categoryLabel,
                  eventName: currentRegistration.eventName,
                  chessNumber: currentRegistration.chessNumber || currentRegistration.chess_number,
                  qrDataUrl: currentRegistration.qrDataUrl
                })}
                className="flex-1 px-6 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold text-lg transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd"></path>
                </svg>
                Print Card
              </button>
              {allRegistrationsWithQR.length > 0 && (
                <button
                  onClick={() => {
                    setShowAllEvents(!showAllEvents);
                    if (!showAllEvents) {
                      setSelectedRegistrationIndex(0);
                    }
                  }}
                  className="px-6 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-lg transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 010 2H6v2.586l6.707-6.707a1 1 0 111.414 1.414L7.414 8H10a1 1 0 110 2H4a1 1 0 01-1-1V4zM16 3a1 1 0 00-1 1v3a1 1 0 102 0V4h2.586l-6.707 6.707a1 1 0 101.414 1.414L16 5.414V8a1 1 0 102 0V4a1 1 0 00-1-1z" clipRule="evenodd"></path>
                  </svg>
                  {showAllEvents ? 'Latest Event' : (allRegistrationsWithQR.length > 1 ? 'All Events' : 'Event Details')}
                </button>
              )}
            </div>

            {/* Footer Note */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
                  </svg>
                </div>
                <div>
                  <div className="text-amber-800 font-semibold mb-1">Important Notice</div>
                  <div className="text-amber-700 text-sm">
                    Keep this QR code safe and present it at the venue for check-in. This digital card serves as your official entry pass for the event.
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 010 2H6v2.586l6.707-6.707a1 1 0 111.414 1.414L7.414 8H10a1 1 0 110 2H4a1 1 0 01-1-1V4zM16 3a1 1 0 00-1 1v3a1 1 0 102 0V4h2.586l-6.707 6.707a1 1 0 101.414 1.414L16 5.414V8a1 1 0 102 0V4a1 1 0 00-1-1z" clipRule="evenodd"></path>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2" style={{ fontFamily: 'Cinzel, serif' }}>No QR Card Available</h3>
            <p className="text-gray-600 mb-6">You haven't registered for any events yet.</p>
            <button
              onClick={() => setOpen('register')}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Register for an Event
            </button>
          </div>
        )}
      </Modal>

      {/* Feedback Modal - Enhanced */}
      <Modal open={open === 'feedback'} title="Share Your Feedback" onClose={handleClose}>
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"></path>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-green-800 mb-2" style={{ fontFamily: 'Cinzel, serif' }}>Your Voice Matters</h2>
            <p className="text-green-600">Help us improve the E-Kalolsavam experience</p>
          </div>

          {/* Feedback Form */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
            <div className="space-y-6">
              {/* Rating Section */}
              <div>
                <label className="block text-green-800 font-bold mb-3 text-lg" style={{ fontFamily: 'Cinzel, serif' }}>
                  How would you rate your experience? <span className="text-red-600">*</span>
                </label>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFeedbackRating(star)}
                      className={`w-12 h-12 rounded-full border-2 transition-all duration-200 flex items-center justify-center group ${feedbackRating >= star
                        ? 'bg-green-500 border-green-600'
                        : 'bg-white border-green-200 hover:border-green-400 hover:bg-green-50'
                        }`}
                    >
                      <svg
                        className={`w-6 h-6 transition-colors duration-200 ${feedbackRating >= star
                          ? 'text-white'
                          : 'text-green-400 group-hover:text-green-600'
                          }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                      </svg>
                    </button>
                  ))}
                </div>
                {feedbackRating > 0 && (
                  <div className="text-center mt-2 text-green-700 font-semibold">
                    {feedbackRating} star{feedbackRating > 1 ? 's' : ''} selected
                  </div>
                )}
              </div>

              {/* Category Selection */}
              <div>
                <label className="block text-green-800 font-bold mb-3 text-lg" style={{ fontFamily: 'Cinzel, serif' }}>
                  What aspect would you like to provide feedback on? <span className="text-red-600">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'registration', label: 'Registration Process', icon: '📝' },
                    { id: 'schedule', label: 'Event Schedule', icon: '📅' },
                    { id: 'venue', label: 'Venue & Facilities', icon: '🏛️' },
                    { id: 'organization', label: 'Overall Organization', icon: '🎯' },
                    { id: 'technical', label: 'Technical Support', icon: '💻' },
                    { id: 'other', label: 'Other', icon: '💭' }
                  ].map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setFeedbackCategory(category.id)}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 text-left group ${feedbackCategory === category.id
                        ? 'bg-green-500 border-green-600'
                        : 'bg-white border-green-200 hover:border-green-400 hover:bg-green-50'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{category.icon}</span>
                        <div>
                          <div className={`font-semibold text-sm ${feedbackCategory === category.id ? 'text-white' : 'text-green-900'
                            }`}>{category.label}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Feedback Text */}
              <div>
                <label className="block text-green-800 font-bold mb-3 text-lg" style={{ fontFamily: 'Cinzel, serif' }}>
                  Your Feedback <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  className="w-full p-4 border-2 border-green-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all duration-200 resize-none"
                  rows={6}
                  placeholder="Please share your detailed feedback, suggestions, or any issues you encountered. Your input helps us improve future events..."
                />
              </div>

              {/* Contact Info (Optional) */}
              <div className="bg-white/70 rounded-xl p-4 border border-green-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"></path>
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path>
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-green-800">Contact Information (Optional)</div>
                    <div className="text-xs text-green-600">For follow-up questions</div>
                  </div>
                </div>
                <input
                  type="email"
                  value={feedbackEmail}
                  onChange={(e) => setFeedbackEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full p-3 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all duration-200"
                />
              </div>
            </div>
          </div>

          {/* Error Display */}
          {feedbackError && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-red-800 font-semibold">{feedbackError}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleClose}
              disabled={feedbackSubmitting}
              className="flex-1 px-6 py-4 rounded-xl bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-bold text-lg transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
              </svg>
              Cancel
            </button>
            <button
              onClick={handleSubmitFeedback}
              disabled={feedbackSubmitting}
              className="flex-1 px-6 py-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold text-lg transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {feedbackSubmitting ? (
                <>
                  <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"></path>
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path>
                  </svg>
                  Submit Feedback
                </>
              )}
            </button>
          </div>

          {/* Footer Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
                </svg>
              </div>
              <div>
                <div className="text-blue-800 font-semibold mb-1">Privacy Notice</div>
                <div className="text-blue-700 text-sm">
                  Your feedback is anonymous unless you provide contact information. We use this information to improve our services and create better experiences for all participants.
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Results Modal - Enhanced */}
      <Modal open={open === 'results'} title="Competition Results" onClose={handleClose}>
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"></path>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-amber-800 mb-2" style={{ fontFamily: 'Cinzel, serif' }}>Live Results</h2>
            <p className="text-amber-600">Celebrating our talented participants</p>
          </div>

          {publishedResults.length ? (
            <div className="space-y-4">
              {/* Results List */}
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl p-6 border border-amber-200">
                <div className="space-y-4">
                  {publishedResults.map((result, index) => (
                    <div key={result.id} className="bg-white rounded-xl p-5 border border-amber-100 hover:shadow-lg transition-all duration-300 hover:border-amber-300 relative overflow-hidden">
                      {/* Position Badge */}
                      <div className="absolute top-4 right-4">
                        {result.position === 1 && (
                          <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg">
                            <span className="text-white font-bold text-lg">🥇</span>
                          </div>
                        )}
                        {result.position === 2 && (
                          <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center shadow-lg">
                            <span className="text-white font-bold text-lg">🥈</span>
                          </div>
                        )}
                        {result.position === 3 && (
                          <div className="w-12 h-12 bg-gradient-to-br from-amber-600 to-amber-800 rounded-full flex items-center justify-center shadow-lg">
                            <span className="text-white font-bold text-lg">🥉</span>
                          </div>
                        )}
                        {result.position && result.position > 3 && (
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center shadow-lg">
                            <span className="text-white font-bold text-sm">#{result.position}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"></path>
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-amber-900 mb-2" style={{ fontFamily: 'Cinzel, serif' }}>
                            {result.event_details?.name || result.event_name || 'Event'}
                          </h3>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path>
                              </svg>
                              <span className="text-amber-800 font-semibold">
                                Winner: {result.participant_details?.first_name || result.participant_name || 'Participant'}
                              </span>
                            </div>
                            {result.position && (
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"></path>
                                </svg>
                                <span className="text-amber-700">
                                  Position: <span className="font-bold text-amber-900">{result.position}</span>
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200 text-center">
                  <div className="text-2xl font-bold text-green-800 mb-1">{publishedResults.length}</div>
                  <div className="text-sm text-green-600">Total Results</div>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200 text-center">
                  <div className="text-2xl font-bold text-blue-800 mb-1">
                    {publishedResults.filter(r => r.position === 1).length}
                  </div>
                  <div className="text-sm text-blue-600">First Places</div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200 text-center">
                  <div className="text-2xl font-bold text-purple-800 mb-1">
                    {new Set(publishedResults.map(r => r.event_details?.name || r.event_name)).size}
                  </div>
                  <div className="text-sm text-purple-600">Events Completed</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-amber-800 mb-2" style={{ fontFamily: 'Cinzel, serif' }}>Results Coming Soon</h3>
              <p className="text-amber-600 mb-6">Competition results will be published here as events conclude.</p>
              <div className="flex items-center justify-center gap-2 text-amber-700">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                <span className="text-sm">Stay tuned for updates</span>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Schedule Modal - Enhanced */}
      <Modal open={open === 'schedule'} title="Event Schedule" onClose={handleClose}>
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0V3H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"></path>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-blue-800 mb-2" style={{ fontFamily: 'Cinzel, serif' }}>Your Schedule</h2>
            <p className="text-blue-600">Plan your participation in E-Kalolsavam</p>
          </div>

          {(registrations.length > 0 || demoSchedule.length > 0) ? (
            <div className="space-y-4">
              {/* Your Registered Events */}
              {registrations.length > 0 && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
                  <h3 className="text-xl font-bold text-green-800 mb-4 flex items-center gap-2">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                    </svg>
                    Your Registered Events
                  </h3>
                  <div className="space-y-4">
                    {registrations.map((registration, index) => (
                      <div key={registration.id} className="bg-white rounded-xl p-5 border border-green-100 hover:shadow-lg transition-all duration-300 hover:border-green-300 relative overflow-hidden">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0V3H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"></path>
                            </svg>
                          </div>
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-green-900 mb-3" style={{ fontFamily: 'Cinzel, serif' }}>
                              {registration.event_details?.name || 'Event'}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                                <div className="flex items-center gap-2 mb-1">
                                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"></path>
                                  </svg>
                                  <span className="text-sm font-semibold text-green-800">Date & Time</span>
                                </div>
                                <div className="text-green-900 font-medium">
                                  {registration.event_details?.date || 'TBD'} {registration.event_details?.start_time && registration.event_details?.end_time ?
                                    `(${registration.event_details.start_time} - ${registration.event_details.end_time})` : ''}
                                </div>
                              </div>
                              <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                                <div className="flex items-center gap-2 mb-1">
                                  <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"></path>
                                  </svg>
                                  <span className="text-sm font-semibold text-emerald-800">Venue</span>
                                </div>
                                <div className="text-emerald-900 font-medium">
                                  {registration.event_details?.venue_details?.name || 'TBD'}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="absolute top-4 right-4">
                          <div className={`px-3 py-1 rounded-full text-xs font-bold ${registration._local
                            ? 'bg-green-100 text-green-800 border border-green-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}>
                            {registration._local ? 'Recently Added' : 'Confirmed'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Event Schedule Preview */}
              {demoSchedule.length > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
                  <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center gap-2">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0V3H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"></path>
                    </svg>
                    Event Schedule Preview
                  </h3>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {demoSchedule.slice(0, 5).map((item, index) => (
                      <div key={item.id} className="bg-white rounded-xl p-4 border border-blue-100 hover:shadow-md transition-all duration-200 hover:border-blue-300">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-semibold text-blue-900 flex items-center gap-2">
                              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                              {item.event_details?.name}
                            </div>
                            <div className="text-sm text-blue-700 mt-1 flex items-center gap-1">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"></path>
                              </svg>
                              {item.event_details?.date} {item.event_details?.start_time && item.event_details?.end_time ?
                                `(${item.event_details.start_time} - ${item.event_details.end_time})` : ''}
                            </div>
                            <div className="text-sm text-blue-600 mt-1 flex items-center gap-1">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"></path>
                              </svg>
                              {item.event_details?.venue_details?.name}
                            </div>
                          </div>
                          <div className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {item.status === 'registered' ? 'Registered' : 'Preview'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200 text-center">
                  <div className="text-2xl font-bold text-green-800 mb-1">{registrations.length}</div>
                  <div className="text-sm text-green-600">Your Events</div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200 text-center">
                  <div className="text-2xl font-bold text-purple-800 mb-1">
                    {registrations.filter(r => r._local).length}
                  </div>
                  <div className="text-sm text-purple-600">Recent Additions</div>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200 text-center">
                  <div className="text-2xl font-bold text-amber-800 mb-1">
                    {new Set(registrations.map(r => r.event_details?.venue_details?.name).filter(Boolean)).size}
                  </div>
                  <div className="text-sm text-amber-600">Venues</div>
                </div>
              </div>

              {/* Digital ID Card Access */}
              {latestRegistration && (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 010 2H6v2.586l6.707-6.707a1 1 0 111.414 1.414L7.414 8H10a1 1 0 110 2H4a1 1 0 01-1-1V4zM16 3a1 1 0 00-1 1v3a1 1 0 102 0V4h2.586l-6.707 6.707a1 1 0 101.414 1.414L16 5.414V8a1 1 0 102 0V4a1 1 0 00-1-1z" clipRule="evenodd"></path>
                        </svg>
                      </div>
                      <div>
                        <div className="text-purple-800 font-semibold mb-1">Digital ID Card Ready</div>
                        <div className="text-purple-700 text-sm">Access your QR code and download your official ID card</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setOpen('qr')}
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium transition-all duration-300 hover:scale-105 shadow-md hover:shadow-lg flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 010 2H6v2.586l6.707-6.707a1 1 0 111.414 1.414L7.414 8H10a1 1 0 110 2H4a1 1 0 01-1-1V4zM16 3a1 1 0 00-1 1v3a1 1 0 102 0V4h2.586l-6.707 6.707a1 1 0 101.414 1.414L16 5.414V8a1 1 0 102 0V4a1 1 0 00-1-1z" clipRule="evenodd"></path>
                      </svg>
                      View ID Card
                    </button>
                  </div>
                </div>
              )}

              {/* Tips */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-200">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
                    </svg>
                  </div>
                  <div>
                    <div className="text-indigo-800 font-semibold mb-1">Event Preparation Tips</div>
                    <ul className="text-indigo-700 text-sm space-y-1">
                      <li>• Arrive at venue 30 minutes before your scheduled time</li>
                      <li>• Bring your QR ID card for check-in</li>
                      <li>• Check weather conditions for outdoor events</li>
                      <li>• Keep your chess number handy for reference</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0V3H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-blue-800 mb-2" style={{ fontFamily: 'Cinzel, serif' }}>No Events Scheduled</h3>
              <p className="text-blue-600 mb-6">You haven't registered for any events yet.</p>
              <button
                onClick={() => setOpen('register')}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Register for Events
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* Scores & Feedback Modal */}
      <Modal open={open === 'scores'} title="My Scores & Feedback" onClose={handleClose}>
        <StudentFeedbackDisplay />
      </Modal>

      {/* Feedback Success Popup */}
      {showFeedbackPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fadeIn">
          <div className={`bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4 transform transition-all duration-300 animate-scaleIn ${feedbackPopupType === 'positive' ? 'border-4 border-green-500' :
            feedbackPopupType === 'negative' ? 'border-4 border-red-500' :
              'border-4 border-blue-500'
            }`}>
            <div className="text-center">
              {/* Icon */}
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${feedbackPopupType === 'positive' ? 'bg-gradient-to-br from-green-400 to-emerald-500' :
                feedbackPopupType === 'negative' ? 'bg-gradient-to-br from-red-400 to-rose-500' :
                  'bg-gradient-to-br from-blue-400 to-indigo-500'
                }`}>
                {feedbackPopupType === 'positive' && (
                  <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
                {feedbackPopupType === 'negative' && (
                  <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
                {feedbackPopupType === 'success' && (
                  <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"></path>
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path>
                  </svg>
                )}
              </div>

              {/* Message */}
              <h3 className={`text-2xl font-bold mb-2 ${feedbackPopupType === 'positive' ? 'text-green-800' :
                feedbackPopupType === 'negative' ? 'text-red-800' :
                  'text-blue-800'
                }`} style={{ fontFamily: 'Cinzel, serif' }}>
                {feedbackPopupMessage}
              </h3>

              {/* Star Rating Display */}
              <div className="flex items-center justify-center gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className={`w-6 h-6 ${feedbackRating >= star ? 'text-yellow-400' : 'text-gray-300'
                      }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                  </svg>
                ))}
              </div>

              <p className="text-gray-600 mb-6">
                Your feedback has been submitted successfully and will help us improve the E-Kalolsavam experience.
              </p>

              {/* Auto-close indicator */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full animate-progress" style={{ animation: 'progress 4s linear' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
        .animate-progress {
          animation: progress 4s linear;
        }
      `}</style>
    </div>
  );
};

export default StudentDashboard;
