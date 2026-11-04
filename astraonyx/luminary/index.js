// astraonyx/luminary/index.js — Luminary Studyspace & Productivity Suite
const { handleBelajarCommand } = require('../../commands/belajar');
const { handleTaskReminderCommand } = require('../../commands/taskreminder');
const { handlePdfToolkitCommand } = require('../../commands/pdftoolkit');
const { handleReminderCommand } = require('../../commands/reminder');
const { handleTimeCapsuleCommand } = require('../../commands/timecapsule');
const { handleDeepTalkCommand } = require('../../commands/deeptalk');
const { handleWaygroundCommand } = require('../../commands/wayground');

const academyAgent = require('../../lib/academyAgent');
const taskReminderEngine = require('../../lib/taskReminderEngine');
const pdfToolkit = require('../../lib/pdfToolkit');
const timeCapsuleEngine = require('../../lib/timeCapsuleEngine');
const deepTalkEngine = require('../../lib/deepTalkEngine');
const waygroundEngine = require('../../server/waygroundEngine');

const { startTaskReminderScheduler } = require('../../lib/taskReminderScheduler');
const { startReminderScheduler } = require('../../lib/reminderScheduler');
const ecosystemAcademyScheduler = require('../../lib/ecosystemAcademyScheduler');

const LUMINARY_COMMAND_NAMES = new Set([
  'belajar', 'jadwal', 'materi', 'kuis',
  'wayground', 'quiz', 'flashcard',
  'addtask', 'addtugas', 'listtask', 'listtugas', 'tasks', 'task', 'tugas',
  'deltask', 'deltugas', 'deletetask', 'removetask', 'edittask', 'addtimetask', 'setremind',
  'reminder', 'setreminder',
  'topdf', 'img2pdf', 'compresspdf', 'text2pdf',
  'timecapsule', 'kapsulwaktu', 'listcapsule', 'delcapsule',
  'deeptalk', 'kartudeep', 'deepcard',
]);

async function dispatchLuminaryCommand(context) {
  const { command } = context;
  const cleanCmd = String(command || '').toLowerCase().replace(/^[!./#]/, '');

  if (!LUMINARY_COMMAND_NAMES.has(cleanCmd)) {
    return false;
  }

  // 1. Akademi Belajar
  if (['belajar', 'jadwal', 'materi', 'kuis'].includes(cleanCmd)) {
    await handleBelajarCommand(context);
    return true;
  }

  // 2. Tugas & Deadline
  if (['addtask', 'addtugas', 'listtask', 'listtugas', 'tasks', 'task', 'tugas', 'deltask', 'deltugas', 'deletetask', 'removetask', 'edittask', 'addtimetask', 'setremind'].includes(cleanCmd)) {
    await handleTaskReminderCommand(context);
    return true;
  }

  // 3. Reminder Harian
  if (['setreminder', 'reminder'].includes(cleanCmd)) {
    await handleReminderCommand(context);
    return true;
  }

  // 4. PDF & Dokumen Toolkit
  if (['topdf', 'img2pdf', 'compresspdf', 'text2pdf'].includes(cleanCmd)) {
    await handlePdfToolkitCommand(context);
    return true;
  }

  // 5. Time Capsule Digital
  if (['timecapsule', 'kapsulwaktu', 'listcapsule', 'delcapsule'].includes(cleanCmd)) {
    await handleTimeCapsuleCommand(context);
    return true;
  }

  // 6. Deep Talk & Reflection
  if (['deeptalk', 'kartudeep', 'deepcard'].includes(cleanCmd)) {
    await handleDeepTalkCommand(context);
    return true;
  }

  // 7. Wayground (Quizizz) Learning Suite & Interactive Quizzes
  if (['wayground', 'quiz', 'flashcard'].includes(cleanCmd)) {
    await handleWaygroundCommand(context);
    return true;
  }

  return false;
}

module.exports = {
  pillar: 'luminary',
  name: 'Luminary Studyspace & Productivity',
  commandNames: LUMINARY_COMMAND_NAMES,
  dispatch: dispatchLuminaryCommand,
  handlers: {
    handleBelajarCommand,
    handleTaskReminderCommand,
    handlePdfToolkitCommand,
    handleReminderCommand,
    handleTimeCapsuleCommand,
    handleDeepTalkCommand,
    handleWaygroundCommand,
  },
  engines: {
    academyAgent,
    taskReminderEngine,
    pdfToolkit,
    timeCapsuleEngine,
    deepTalkEngine,
    waygroundEngine,
  },
  schedulers: {
    startTaskReminderScheduler,
    startReminderScheduler,
    ecosystemAcademyScheduler,
  },
};
