import type { PageConfig } from '../shared/types';

// ── Dashboard layout ──────────────────────────────────────────────────────
//
// This is the single source of truth for what's on the dashboard.
// Each page has a `layout: PlacedWidget[]` — every entry is one widget at
// fixed pixel coordinates (the kindle is 1072×1448 — see config/dashboard.ts).
//
// Available widgets and their config:
//
//   sensor-value   { entity, label?, decimals? }
//                  Numeric HASS state with unit; falls back to raw state.
//
//   binary-sensor  { entity, label?, iconOn?, iconOff? }
//                  On/Off display for door / motion / window sensors.
//
//   light-toggle   { entity, label? }
//                  Tap to call light.toggle on the entity.
//
//   line-graph     { entity, hours, label?, yMin?, yMax?, bucketMinutes? }
//                  Line chart from HASS history (REST /api/history).
//
//   clock          { format?, showDate? }      // '24h' | '12h'
//
//   page-tabs      { pages: { id, label }[] }  // navigation between pages
//
// Coordinates: bbox is `{ x, y, w, h }` in pixels. The 60px header bar at the
// top is added automatically — y=0 here is right under the header.
// Widget bodies size themselves to fill their bbox.

const TABS = {
  pages: [
    { id: 'overview', label: 'Overview' },
    { id: 'lights', label: 'Lights' },
  ],
};

export const pages: PageConfig[] = [
  {
    id: 'overview',
    title: 'Overview',
    layout: [
      {
        widget: 'clock',
        bbox: { x: 24, y: 16, w: 500, h: 120 },
        config: { format: '24h', showDate: true },
      },
      { widget: 'page-tabs', bbox: { x: 24, y: 152, w: 1024, h: 64 }, config: TABS },

      // Top sensor row
      {
        widget: 'sensor-value',
        bbox: { x: 24, y: 240, w: 328, h: 180 },
        config: { entity: 'sensor.living_room_temperature', label: 'Living Room', decimals: 1 },
      },
      {
        widget: 'sensor-value',
        bbox: { x: 372, y: 240, w: 328, h: 180 },
        config: { entity: 'sensor.bedroom_temperature', label: 'Bedroom', decimals: 1 },
      },
      {
        widget: 'sensor-value',
        bbox: { x: 720, y: 240, w: 328, h: 180 },
        config: { entity: 'sensor.outdoor_temperature', label: 'Outdoor', decimals: 1 },
      },

      // Secondary sensors
      {
        widget: 'sensor-value',
        bbox: { x: 24, y: 440, w: 328, h: 180 },
        config: { entity: 'sensor.living_room_humidity', label: 'Humidity', decimals: 0 },
      },
      {
        widget: 'binary-sensor',
        bbox: { x: 372, y: 440, w: 328, h: 180 },
        config: { entity: 'binary_sensor.front_door', label: 'Front Door' },
      },
      {
        widget: 'binary-sensor',
        bbox: { x: 720, y: 440, w: 328, h: 180 },
        config: { entity: 'binary_sensor.living_room_motion', label: 'Motion' },
      },

      // 24h trend graph
      {
        widget: 'line-graph',
        bbox: { x: 24, y: 640, w: 1024, h: 360 },
        config: {
          entity: 'sensor.outdoor_temperature',
          label: 'Outdoor temp · 24h',
          hours: 24,
          bucketMinutes: 30,
        },
      },
    ],
  },
  {
    id: 'lights',
    title: 'Lights',
    layout: [
      { widget: 'page-tabs', bbox: { x: 24, y: 16, w: 1024, h: 64 }, config: TABS },

      {
        widget: 'light-toggle',
        bbox: { x: 24, y: 104, w: 504, h: 180 },
        config: { entity: 'light.living_room', label: 'Living Room' },
      },
      {
        widget: 'light-toggle',
        bbox: { x: 544, y: 104, w: 504, h: 180 },
        config: { entity: 'light.kitchen', label: 'Kitchen' },
      },
      {
        widget: 'light-toggle',
        bbox: { x: 24, y: 304, w: 504, h: 180 },
        config: { entity: 'light.bedroom', label: 'Bedroom' },
      },
      {
        widget: 'light-toggle',
        bbox: { x: 544, y: 304, w: 504, h: 180 },
        config: { entity: 'light.office', label: 'Office' },
      },
      {
        widget: 'light-toggle',
        bbox: { x: 24, y: 504, w: 504, h: 180 },
        config: { entity: 'light.hallway', label: 'Hallway' },
      },
      {
        widget: 'light-toggle',
        bbox: { x: 544, y: 504, w: 504, h: 180 },
        config: { entity: 'light.bathroom', label: 'Bathroom' },
      },
    ],
  },
];
