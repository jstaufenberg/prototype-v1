import type { PatientRecord } from '../types/mockData';

import pt01 from '../mock-data/pt-01-delayed.json';
import pt02 from '../mock-data/pt-02-at-risk.json';
import pt03 from '../mock-data/pt-03-pending.json';
import pt04 from '../mock-data/pt-04-on-track.json';

export const patients: PatientRecord[] = [
  pt01 as PatientRecord,
  pt02 as PatientRecord,
  pt03 as PatientRecord,
  pt04 as PatientRecord
];

export const defaultStateByPatientId: Record<string, string> = Object.fromEntries(
  patients.map((p) => [p.meta.patient_id, 'T0'])
);
